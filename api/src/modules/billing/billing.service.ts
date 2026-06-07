import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import type Stripe from 'stripe';
import { PrismaService } from '../prisma/prisma.service';
import { StripeService } from './stripe.service';
import { CareFeeStatus, GroundStatus, BillingEventType, BillingEventStatus, Ground } from '@prisma/client';

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
    if (process.env.NODE_ENV !== 'production') return true;
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
  async createCareFeeCheckout(organizationId: string): Promise<{ checkoutUrl: string }> {
    const org = await this.prisma.organization.findUnique({ where: { id: organizationId } });
    if (!org) throw new NotFoundException('Organization not found');

    const customerId = await this.stripe.ensureCustomer(org.id, org.email ?? undefined, org.stripeCustomerId);
    if (customerId !== org.stripeCustomerId) {
      await this.prisma.organization.update({ where: { id: org.id }, data: { stripeCustomerId: customerId } });
    }

    const base = this.config.get<string>('stripe.callbackUrl') || 'http://localhost:5173/billing/callback';
    const checkoutUrl = await this.stripe.createCareFeeCheckout({
      customerId,
      organizationId: org.id,
      successUrl: `${base}?status=success`,
      cancelUrl: `${base}?status=cancelled`,
    });
    return { checkoutUrl };
  }

  /**
   * Charge the scenario fee for one ground for the current month. Idempotent:
   * skips if a SCENARIO_FEE event already exists for this ground + period.
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

  /** Charge the first scenario fee at activation (current calendar month). */
  async chargeScenarioFeeOnActivation(groundId: string) {
    const ground = await this.prisma.ground.findUnique({
      where: { id: groundId },
      include: { organization: { select: { stripeCustomerId: true } }, participants: { select: { id: true } } },
    });
    if (!ground) return;
    const { start, end } = this.currentPeriod();
    await this.chargeScenarioFeeForPeriod(ground as any, start, end);
  }

  /** Monthly: charge $50/person for every ACTIVE ground. */
  @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT)
  async chargeScenarioFees() {
    const activeGrounds = await this.prisma.ground.findMany({
      where: { status: GroundStatus.ACTIVE },
      include: { organization: { select: { stripeCustomerId: true } }, participants: { select: { id: true } } },
    });

    this.logger.log(`Scenario fee run: ${activeGrounds.length} active ground(s).`);
    const { start, end } = this.currentPeriod();
    for (const ground of activeGrounds) {
      try {
        await this.chargeScenarioFeeForPeriod(ground as any, start, end);
      } catch (err: any) {
        this.logger.error(`Scenario fee failed for ground ${ground.id}: ${err.message}`);
      }
    }
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
        // Best-effort: mark this org's pending scenario-fee events as paid.
        const org = await this.prisma.organization.findFirst({ where: { stripeCustomerId: customerId }, select: { id: true } });
        if (org) {
          await this.prisma.billingEvent.updateMany({
            where: { organizationId: org.id, status: BillingEventStatus.PENDING },
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

  private currentPeriod(): { start: Date; end: Date } {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { start, end };
  }
}
