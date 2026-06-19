import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import type Stripe from 'stripe';
import { PrismaService, CronLock } from '../prisma/prisma.service';
import { StripeService } from './stripe.service';
import { EmailService } from '../email/email.service';
import { CareFeeStatus, GroundStatus, BillingEventType, BillingEventStatus, UserRole, UsageEventType } from '@prisma/client';
import { UsageService } from '../usage/usage.service';

const PARTICIPANT_PERIOD_DAYS = 30;
const dayMs = 24 * 60 * 60 * 1000;

/**
 * Billing model:
 *   - Care fee:        $25/mo per org. Recurring subscription.
 *   - Participant fee: $25/unique participant/month across all ACTIVE grounds.
 *                      Deduplicated by email — a person in N grounds pays once.
 *
 * Sessions 1–2 are free. Paywall fires after both parties complete session 2:
 * ground moves to REPORT_READY, admin is nudged, report held until payment.
 */
@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private prisma: PrismaService,
    private stripe: StripeService,
    private config: ConfigService,
    private email: EmailService,
    private usage: UsageService,
  ) {}

  /** The gate: an org is billing-ready once its care fee is active. */
  async isBillingReady(organizationId: string): Promise<boolean> {
    const BILLING_ENABLED = process.env.BILLING_ENABLED !== 'false';
    if (!BILLING_ENABLED) return true;
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { careFeeStatus: true, stripeCustomerId: true },
    });
    return !!org && org.careFeeStatus === CareFeeStatus.ACTIVE && !!org.stripeCustomerId;
  }

  /**
   * Session-number-aware billing gate.
   * Sessions 1–2 are always free. Session 3+ requires billing-ready status.
   */
  async checkSessionGate(orgId: string, sessionNumber: number): Promise<{ allowed: boolean; reason?: string }> {
    if (sessionNumber <= 2) return { allowed: true };
    const ready = await this.isBillingReady(orgId);
    if (ready) return { allowed: true };
    return {
      allowed: false,
      reason: 'Your workspace needs to be activated before session 3. Your admin will receive a prompt.',
    };
  }

  /**
   * Send a payment request email to the org admin after session 2 completes.
   * Report is held in REPORT_READY state until payment is confirmed.
   */
  async requestPaymentAfterSession2(orgId: string, groundId: string): Promise<void> {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { name: true, users: { where: { role: UserRole.ADMIN }, take: 1, select: { email: true } } },
    });
    if (!org) return;
    const admin = org.users[0];
    if (!admin) {
      this.logger.warn(`requestPaymentForSession2: no ADMIN user found for org ${orgId}`);
      return;
    }
    await this.email.sendPaymentRequestEmail(admin.email, org.name, groundId);
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

  /** Count unique participant emails across all ACTIVE grounds for an org. */
  async getUniqueActiveParticipantCount(orgId: string): Promise<number> {
    const grounds = await this.prisma.ground.findMany({
      where: { organizationId: orgId, status: GroundStatus.ACTIVE },
      include: { participants: { select: { user: { select: { email: true } } } } },
    });
    const emails = new Set<string>();
    for (const g of grounds) {
      for (const p of g.participants) {
        if (p.user?.email) emails.add(p.user.email.toLowerCase());
      }
    }
    return emails.size;
  }

  /**
   * Charge the participant fee for one org for a [periodStart, periodEnd) window.
   * One event per org per period (groundId = null). Idempotent. (GW-04.)
   */
  async chargeParticipantFeeForPeriod(orgId: string, stripeCustomerId: string, periodStart: Date, periodEnd: Date) {
    const participantCount = await this.getUniqueActiveParticipantCount(orgId);
    if (participantCount === 0) return;

    const already = await this.prisma.billingEvent.findFirst({
      where: { organizationId: orgId, groundId: null, type: BillingEventType.PARTICIPANT_FEE, periodStart, periodEnd },
    });
    if (already) return;

    const unit = this.config.get<number>('stripe.scenarioFeeCents') || 2500;
    const year = periodStart.getUTCFullYear();
    const month = periodStart.getUTCMonth() + 1;
    const idempotencyKey = `participant-${orgId}-${year}-${month}`;
    await this.stripe.chargeParticipantFee(stripeCustomerId, participantCount, idempotencyKey);
    await this.prisma.billingEvent.create({
      data: {
        organizationId: orgId,
        groundId: null,
        type: BillingEventType.PARTICIPANT_FEE,
        amountCents: unit * participantCount,
        currency: 'USD',
        periodStart,
        periodEnd,
        status: BillingEventStatus.PENDING,
      },
    });
  }

  /**
   * Charge the first participant fee when a ground is activated. Rolling 30-day
   * period anchored to activation — avoids the calendar double-charge (GW-04).
   */
  async chargeParticipantFeeOnActivation(orgId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { stripeCustomerId: true },
    });
    if (!org?.stripeCustomerId) return;
    const start = new Date();
    const end = new Date(start.getTime() + PARTICIPANT_PERIOD_DAYS * dayMs);
    await this.chargeParticipantFeeForPeriod(orgId, org.stripeCustomerId, start, end);
  }

  /**
   * Daily: charge the next participant-fee period for every org with ACTIVE
   * grounds. One event per org per period, deduplicated by email across grounds.
   * Skips orgs that are PAST_DUE. Advisory-locked (GW-60).
   */
  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async chargeParticipantFees() {
    await this.prisma.withAdvisoryLock(CronLock.SCENARIO_FEES, async () => {
      const now = new Date();
      const orgsWithActiveGrounds = await this.prisma.organization.findMany({
        where: { grounds: { some: { status: GroundStatus.ACTIVE } } },
        select: { id: true, stripeCustomerId: true, careFeeStatus: true },
      });

      let charged = 0;
      let skippedPastDue = 0;
      for (const org of orgsWithActiveGrounds) {
        if (org.careFeeStatus !== CareFeeStatus.ACTIVE || !org.stripeCustomerId) {
          skippedPastDue++;
          continue;
        }
        const last = await this.prisma.billingEvent.findFirst({
          where: { organizationId: org.id, groundId: null, type: BillingEventType.PARTICIPANT_FEE },
          orderBy: { periodEnd: 'desc' },
          select: { periodEnd: true },
        });
        const nextStart = last?.periodEnd ?? now;
        if (nextStart > now) continue;
        const nextEnd = new Date(nextStart.getTime() + PARTICIPANT_PERIOD_DAYS * dayMs);
        try {
          await this.chargeParticipantFeeForPeriod(org.id, org.stripeCustomerId, nextStart, nextEnd);
          charged++;
        } catch (err: any) {
          this.logger.error(`Participant fee failed for org ${org.id}: ${err.message}`);
        }
      }
      this.logger.log(`Participant fee run: ${orgsWithActiveGrounds.length} orgs, ${charged} charged, ${skippedPastDue} skipped.`);
    });
  }

  /**
   * Billing status for an org: care-fee state, active participant count, active
   * grounds list, and next charge estimate. (GW-status)
   */
  async getStatus(organizationId: string): Promise<{
    careFeeActive: boolean;
    careFeeMonthlyCost: number;
    participantFeeMonthlyCost: number;
    activeGrounds: Array<{ groundId: string; label: string; startedAt: Date | null }>;
    activeParticipantCount: number;
    estimatedNextCharge: number | null;
    nextBillingDate: string | null;
    card?: { brand: string; last4: string } | null;
  }> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { careFeeStatus: true, stripeCustomerId: true, defaultPaymentMethodId: true },
    });
    if (!org) throw new NotFoundException('Organization not found');

    const activeGrounds = await this.prisma.ground.findMany({
      where: { organizationId, status: GroundStatus.ACTIVE },
      select: { id: true, label: true, billingActivatedAt: true },
    });

    const CARE_FEE = this.config.get<number>('stripe.careFeeCents') ?? 2500;
    const PARTICIPANT_FEE = this.config.get<number>('stripe.scenarioFeeCents') ?? 2500;
    const careFeeActive = org.careFeeStatus === CareFeeStatus.ACTIVE;
    const activeParticipantCount = await this.getUniqueActiveParticipantCount(organizationId);

    const groundsOut = activeGrounds.map((g) => ({
      groundId: g.id,
      label: g.label,
      startedAt: g.billingActivatedAt,
    }));

    const estimatedNextCharge = careFeeActive
      ? Math.round((CARE_FEE + activeParticipantCount * PARTICIPANT_FEE) / 100)
      : null;

    const now = new Date();
    const nextBilling = careFeeActive
      ? new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString().slice(0, 10)
      : null;

    let card: { brand: string; last4: string } | null = null;
    if (org.stripeCustomerId && org.defaultPaymentMethodId) {
      try {
        const pm = await this.stripe.stripe.paymentMethods.retrieve(org.defaultPaymentMethodId);
        if (pm.card) card = { brand: pm.card.brand, last4: pm.card.last4 };
      } catch {
        // non-fatal
      }
    }

    return {
      careFeeActive,
      careFeeMonthlyCost: Math.round(CARE_FEE / 100),
      participantFeeMonthlyCost: Math.round(PARTICIPANT_FEE / 100),
      activeGrounds: groundsOut,
      activeParticipantCount,
      estimatedNextCharge,
      nextBillingDate: nextBilling,
      card,
    };
  }

  /**
   * Full subscription cancellation. Cancels the Stripe subscription immediately,
   * marks the org as CANCELLED, sends a record-portability notice, and returns.
   * Does NOT delete any Ground, RecordEntry, or User records. (GW-cancel)
   */
  async cancelSubscription(organizationId: string): Promise<{ cancelled: boolean }> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { careFeeSubscriptionId: true, email: true, name: true },
    });
    if (!org) throw new NotFoundException('Organization not found');

    if (org.careFeeSubscriptionId) {
      await this.stripe.stripe.subscriptions.cancel(org.careFeeSubscriptionId);
    }

    await this.prisma.organization.update({
      where: { id: organizationId },
      data: { careFeeStatus: CareFeeStatus.CANCELLED },
    });

    // Send a record-portability notice to every non-deleted org user so each
    // person knows their record is retained and can be exported. The org.email
    // field is the workspace email but individual users are the record holders.
    const downloadUrl = `${this.config.get<string>('resend.frontendUrl') ?? ''}/users/me/export`;
    const orgUsers = await this.prisma.user.findMany({
      where: { organizationId, deletedAt: null },
      select: { id: true, email: true, firstName: true },
    });

    for (const user of orgUsers) {
      await this.email
        .sendRecordPortabilityNotice(user.email, user.firstName, downloadUrl)
        .catch((err: any) =>
          this.logger.warn(`Record portability notice failed for user ${user.id} (org ${organizationId}): ${err.message}`),
        );
    }

    this.logger.log(`Subscription cancelled for org ${organizationId}; portability notices sent to ${orgUsers.length} user(s).`);
    return { cancelled: true };
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
        this.usage.emit(UsageEventType.BILLING_ACTIVATED, { organizationId }).catch(() => undefined);
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

        const gracePeriodUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // +7 days
        const failedOrg = await this.prisma.organization.findFirst({
          where: { stripeCustomerId: customerId },
          select: { id: true, name: true, email: true },
        });
        await this.prisma.organization.updateMany({
          where: { stripeCustomerId: customerId },
          data: { careFeeStatus: CareFeeStatus.PAST_DUE, gracePeriodUntil },
        });
        if (failedOrg?.email) {
          await this.email
            .sendPaymentFailed(failedOrg.email, failedOrg.name)
            .catch((err: any) =>
              this.logger.warn(`Payment-failed email failed for org ${failedOrg.id}: ${err.message}`),
            );
        }
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

  /** Validate a contributor code and, if valid, mark the org as billing-active without Stripe. */
  async applyContributorCode(organizationId: string, code: string): Promise<{ ok: boolean; message: string }> {
    const raw = this.config.get<string>('CONTRIBUTOR_CODES') ?? process.env.CONTRIBUTOR_CODES ?? '';
    const valid = raw.split(',').map(s => s.trim()).filter(Boolean);
    if (!valid.includes(code.trim())) {
      return { ok: false, message: 'Code not recognised.' };
    }
    await this.prisma.organization.update({
      where: { id: organizationId },
      data: { careFeeStatus: CareFeeStatus.ACTIVE },
    });
    const admin = await this.prisma.user.findFirst({ where: { organizationId, role: UserRole.ADMIN }, select: { id: true } });
    if (admin) {
      await this.usage.emit(UsageEventType.BILLING_ACTIVATED, { organizationId, userId: admin.id });
    }
    this.logger.log(`Contributor code applied for org ${organizationId}`);
    return { ok: true, message: 'Access granted. Continue without payment.' };
  }
}
