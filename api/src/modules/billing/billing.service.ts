import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import type Stripe from 'stripe';
import { PrismaService, CronLock } from '../prisma/prisma.service';
import { StripeService } from './stripe.service';
import { CareFeeStatus, GroundStatus, BillingEventType, BillingEventStatus, Ground } from '@prisma/client';

const SCENARIO_PERIOD_DAYS = 30;
const dayMs = 24 * 60 * 60 * 1000;

/**
 * Billing model (Part 1 — clinic/nurse):
 *   - Care fee:     $20/mo per org. Recurring subscription. The commitment device.
 *   - Scenario fee: $50/person/month while a ground is ACTIVE. Usage-billed.
 *
 * Session 1 is free. The paywall sits between REPORT_READY and ACTIVE: the org
 * must have an active care-fee subscription (card on file) before a ground can
 * be activated. Scenario fees ride on the care-fee subscription's invoice.
 */
@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private prisma: PrismaService,
    private stripe: StripeService,
    private config: ConfigService,
  ) {}

  /** The gate: an org is billing-ready once its care fee is active. */
  async isBillingReady(organizationId: string): Promise<boolean> {
    if (process.env.BILLING_ENABLED !== 'true') return true;
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { careFeeStatus: true, stripeCustomerId: true },
    });
    return !!org && org.careFeeStatus === CareFeeStatus.ACTIVE && !!org.stripeCustomerId;
  }

  /**
   * Create a hosted Checkout session to set up the care fee. Returns the URL the
   * admin is redirected to. Completion is confirmed via webhook.
   */
  async createCareFeeCheckout(organizationId: string, groundId?: string): Promise<{ checkoutUrl: string }> {
    const org = await this.prisma.organization.findUnique({ where: { id: organizationId } });
    if (!org) throw new NotFoundException('Organization not found');

    const customerId = await this.stripe.ensureCustomer(org.id, org.email ?? undefined, org.stripeCustomerId);
    if (customerId !== org.stripeCustomerId) {
      await this.prisma.organization.update({ where: { id: org.id }, data: { stripeCustomerId: customerId } });
    }

    const base = this.config.get<string>('stripe.callbackUrl') || 'http://localhost:5173/billing/callback';
    const successUrl = groundId
      ? `${base}?status=success&groundId=${groundId}`
      : `${base}?status=success`;
    const checkoutUrl = await this.stripe.createCareFeeCheckout({
      customerId,
      organizationId: org.id,
      successUrl,
      cancelUrl: `${base}?status=cancelled`,
    });
    return { checkoutUrl };
  }

  /**
   * Charge the scenario fee for one ground for a specific [periodStart,
   * periodEnd) window. Idempotent: skips if a SCENARIO_FEE event already exists
   * for this ground + period. (GW-04.)
   */
  async chargeScenarioFeeForPeriod(ground: Ground & { organization: { stripeCustomerId: string | null }; participants: { id: string }[] }, periodStart: Date, periodEnd: Date) {
    const personMonths = ground.participants.length;
    if (!ground.organization.stripeCustomerId || personMonths === 0) return;

    const already = await this.prisma.billingEvent.findFirst({
      where: { groundId: ground.id, type: BillingEventType.SCENARIO_FEE, periodStart, periodEnd },
    });
    if (already) return;

    const unit = this.config.get<number>('stripe.scenarioFeeCents') || 5000;
    await this.stripe.chargeScenarioFee(ground.organization.stripeCustomerId, personMonths, ground.label);
    await this.prisma.billingEvent.create({
      data: {
        organizationId: ground.organizationId,
        groundId: ground.id,
        type: BillingEventType.SCENARIO_FEE,
        amountCents: unit * personMonths,
        currency: 'USD',
        periodStart,
        periodEnd,
        status: BillingEventStatus.PENDING,
      },
    });
  }

  /**
   * Charge the first scenario fee at activation. The period is a rolling 30-day
   * window anchored to the activation moment — NOT a calendar month. This is the
   * fix for the double-charge window (GW-04): with calendar months, a ground
   * activated on the 28th was charged a full month, then charged again days
   * later on the 1st. Anchoring to activation means each charge covers a full
   * 30 days the ground was actually active.
   */
  async chargeScenarioFeeOnActivation(groundId: string) {
    const ground = await this.prisma.ground.findUnique({
      where: { id: groundId },
      include: { organization: { select: { stripeCustomerId: true } }, participants: { select: { id: true } } },
    });
    if (!ground) return;
    const start = ground.billingActivatedAt ?? new Date();
    const end = new Date(start.getTime() + SCENARIO_PERIOD_DAYS * dayMs);
    await this.chargeScenarioFeeForPeriod(ground as any, start, end);
  }

  /**
   * Daily: charge the next scenario-fee period for every ACTIVE ground whose
   * current period has elapsed. Periods roll forward from the last charged
   * period's end, so there is no calendar-boundary double-charge. Grounds whose
   * org is PAST_DUE or CANCELLED are skipped — we do not keep charging an org
   * that has failed payment. (GW-04.) Advisory-locked so only one replica runs
   * it (GW-60).
   */
  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async chargeScenarioFees() {
    await this.prisma.withAdvisoryLock(CronLock.SCENARIO_FEES, async () => {
      const now = new Date();
      const activeGrounds = await this.prisma.ground.findMany({
        where: { status: GroundStatus.ACTIVE },
        include: {
          organization: { select: { stripeCustomerId: true, careFeeStatus: true } },
          participants: { select: { id: true } },
        },
      });

      let charged = 0;
      let skippedPastDue = 0;
      for (const ground of activeGrounds) {
        // Do not keep charging an org that is behind on its care fee.
        if (ground.organization.careFeeStatus !== CareFeeStatus.ACTIVE) {
          skippedPastDue++;
          continue;
        }
        // Find the last period we charged for this ground; charge the next one
        // only once its end has passed.
        const last = await this.prisma.billingEvent.findFirst({
          where: { groundId: ground.id, type: BillingEventType.SCENARIO_FEE },
          orderBy: { periodEnd: 'desc' },
          select: { periodEnd: true },
        });
        const nextStart = last?.periodEnd ?? ground.billingActivatedAt ?? now;
        if (nextStart > now) continue; // current period still running
        const nextEnd = new Date(nextStart.getTime() + SCENARIO_PERIOD_DAYS * dayMs);
        try {
          await this.chargeScenarioFeeForPeriod(ground as any, nextStart, nextEnd);
          charged++;
        } catch (err: any) {
          this.logger.error(`Scenario fee failed for ground ${ground.id}: ${err.message}`);
        }
      }
      this.logger.log(`Scenario fee run: ${activeGrounds.length} active, ${charged} charged, ${skippedPastDue} skipped (care fee not active).`);
    });
  }

  /**
   * Cancel the care fee subscription (self-serve). Cancels at period end, so the
   * org keeps access through the period it has already paid for, and active
   * grounds keep running until then. Status is synced by the subscription
   * webhook. (GW-09.)
   */
  async cancelCareFee(organizationId: string): Promise<{ cancelled: boolean; effectiveAt: Date | null }> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { careFeeSubscriptionId: true },
    });
    if (!org) throw new NotFoundException('Organization not found');
    if (!org.careFeeSubscriptionId) {
      await this.prisma.organization.update({ where: { id: organizationId }, data: { careFeeStatus: CareFeeStatus.CANCELLED } });
      return { cancelled: true, effectiveAt: null };
    }
    const sub = await this.stripe.cancelSubscriptionAtPeriodEnd(org.careFeeSubscriptionId);
    const periodEnd = sub.current_period_end ? new Date(sub.current_period_end * 1000) : null;
    this.logger.log(`Care fee cancellation scheduled for org ${organizationId} (effective ${periodEnd?.toISOString() ?? 'period end'})`);
    return { cancelled: true, effectiveAt: periodEnd };
  }

  /**
   * A Stripe Customer Portal session — the robust self-serve surface for
   * updating the card, viewing invoices, and cancelling. (GW-09.)
   */
  async createBillingPortalSession(organizationId: string): Promise<{ portalUrl: string }> {
    const org = await this.prisma.organization.findUnique({ where: { id: organizationId }, select: { stripeCustomerId: true } });
    if (!org?.stripeCustomerId) throw new NotFoundException('No billing account set up for this organization');
    const base = this.config.get<string>('stripe.callbackUrl') || 'http://localhost:5173/billing/callback';
    const portalUrl = await this.stripe.createBillingPortalSession(org.stripeCustomerId, base);
    return { portalUrl };
  }

  /** Handle Stripe webhook events — keeps care-fee status in sync. */
  async handleStripeEvent(event: Stripe.Event) {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const organizationId = session.client_reference_id;
        const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;
        if (!organizationId || !subscriptionId) break;

        const defaultPaymentMethodId = await this.stripe.getSubscriptionDefaultPaymentMethod(subscriptionId).catch(() => null);
        await this.prisma.organization.update({
          where: { id: organizationId },
          data: {
            careFeeStatus: CareFeeStatus.ACTIVE,
            careFeeSubscriptionId: subscriptionId,
            defaultPaymentMethodId: defaultPaymentMethodId ?? undefined,
            stripeCustomerId: typeof session.customer === 'string' ? session.customer : session.customer?.id,
          },
        });
        this.logger.log(`Care fee active for org ${organizationId}`);
        break;
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const organizationId = sub.metadata?.organizationId;
        if (!organizationId) break;
        await this.prisma.organization.update({
          where: { id: organizationId },
          data: { careFeeStatus: this.mapSubscriptionStatus(sub.status) },
        });
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
        if (!customerId) break;
        await this.prisma.organization.updateMany({
          where: { stripeCustomerId: customerId },
          data: { careFeeStatus: CareFeeStatus.PAST_DUE },
        });
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
        if (!customerId) break;
        const org = await this.prisma.organization.findFirst({ where: { stripeCustomerId: customerId }, select: { id: true } });
        if (org) {
          // Reconcile only the events this invoice actually covers: pending
          // scenario-fee events whose period had already started by the time the
          // invoice was created. A period charged AFTER this invoice finalised
          // belongs to a later invoice and must stay PENDING. (GW-04.)
          const invoiceCreated = invoice.created ? new Date(invoice.created * 1000) : new Date();
          await this.prisma.billingEvent.updateMany({
            where: {
              organizationId: org.id,
              status: BillingEventStatus.PENDING,
              periodStart: { lte: invoiceCreated },
            },
            data: { status: BillingEventStatus.PAID, stripeInvoiceId: invoice.id },
          });
        }
        break;
      }

      default:
        break;
    }
  }

  private mapSubscriptionStatus(status: Stripe.Subscription.Status): CareFeeStatus {
    switch (status) {
      case 'active':
      case 'trialing':
        return CareFeeStatus.ACTIVE;
      case 'past_due':
      case 'unpaid':
        return CareFeeStatus.PAST_DUE;
      default:
        return CareFeeStatus.CANCELLED;
    }
  }
}
