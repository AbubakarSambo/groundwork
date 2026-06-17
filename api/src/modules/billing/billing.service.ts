import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import type Stripe from 'stripe';
import { PrismaService, CronLock } from '../prisma/prisma.service';
import { StripeService } from './stripe.service';
import { EmailService } from '../email/email.service';
import { CareFeeStatus, GroundStatus, BillingEventType, BillingEventStatus, UserRole } from '@prisma/client';

const PARTICIPANT_PERIOD_DAYS = 30;
const dayMs = 24 * 60 * 60 * 1000;

/**
 * Billing model:
 *   - Platform fee:     $25/mo per account. Recurring subscription.
 *   - Participant fee:  $25/unique participant/month. Participants in multiple
 *                       active Grounds are billed once, not once per Ground.
 *                       Ground leads and the org account itself are never charged
 *                       as participants.
 *
 * Session rule:
 *   Sessions 1–2 per participant per Ground are free.
 *   After both parties complete session 2 the report is locked (REPORT_READY)
 *   and the admin is nudged to add a payment method. The report is released
 *   only after payment. Session 3+ also requires billing-ready status.
 */
@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private prisma: PrismaService,
    private stripe: StripeService,
    private config: ConfigService,
    private email: EmailService,
  ) {}

  /** The gate: an org is billing-ready once its care fee is active (or contributor bypass is set). */
  async isBillingReady(organizationId: string): Promise<boolean> {
    const BILLING_ENABLED = process.env.BILLING_ENABLED !== 'false';
    if (!BILLING_ENABLED) return true;
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { careFeeStatus: true, stripeCustomerId: true, contributorBypass: true },
    });
    if (!org) return false;
    if (org.contributorBypass) return true;
    return org.careFeeStatus === CareFeeStatus.ACTIVE && !!org.stripeCustomerId;
  }

  /** Apply a contributor code to bypass payment for platform reviewers. */
  async applyContributorCode(organizationId: string, code: string): Promise<{ applied: boolean }> {
    const VALID_CODES = (process.env.CONTRIBUTOR_CODES ?? 'GWCONTRIB2026').split(',').map(c => c.trim());
    if (!VALID_CODES.includes(code)) {
      return { applied: false };
    }
    await this.prisma.organization.update({
      where: { id: organizationId },
      data: { contributorBypass: true },
    });
    return { applied: true };
  }

  /**
   * Session gate. Sessions 1–2 are free per participant per Ground.
   * Session 3 and beyond require a billing-ready account.
   */
  async checkSessionGate(orgId: string, sessionNumber: number): Promise<{ allowed: boolean; reason?: string }> {
    if (sessionNumber <= 2) return { allowed: true };
    const ready = await this.isBillingReady(orgId);
    if (ready) return { allowed: true };
    return {
      allowed: false,
      reason: 'Sessions 1–2 are free. Activate billing to continue. Your admin will receive a prompt.',
    };
  }

  /**
   * Nudge the org admin after both parties complete session 2.
   * The report is locked until payment is confirmed.
   */
  async requestPaymentAfterSession2(orgId: string, groundId: string): Promise<void> {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { name: true, users: { where: { role: UserRole.ADMIN }, take: 1, select: { email: true } } },
    });
    if (!org) return;
    const admin = org.users[0];
    if (!admin) {
      this.logger.warn(`requestPaymentAfterSession2: no ADMIN user found for org ${orgId}`);
      return;
    }
    await this.email.sendPaymentRequestEmail(admin.email, org.name, groundId);
  }

  /**
   * Create a hosted Checkout session to set up the platform fee. Returns the URL the
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
   * Charge the participant fee for one org for a specific period.
   * Counts unique active participants across ALL active grounds in the org —
   * a participant in multiple grounds is billed once.
   * Idempotent: skips if a PARTICIPANT_FEE event already exists for this org + period.
   */
  async chargeParticipantFeeForPeriod(
    orgId: string,
    stripeCustomerId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<void> {
    const already = await this.prisma.billingEvent.findFirst({
      where: { organizationId: orgId, type: BillingEventType.PARTICIPANT_FEE, periodStart, periodEnd },
    });
    if (already) return;

    const activeParticipants = await this.getUniqueActiveParticipantCount(orgId);
    if (activeParticipants === 0) return;

    const unit = this.config.get<number>('stripe.scenarioFeeCents') || 2500;
    const year = periodStart.getUTCFullYear();
    const month = periodStart.getUTCMonth() + 1;
    const idempotencyKey = `participant-fee-${orgId}-${year}-${month}`;

    await this.stripe.chargeParticipantFee(stripeCustomerId, activeParticipants, idempotencyKey);
    await this.prisma.billingEvent.create({
      data: {
        organizationId: orgId,
        groundId: null,
        type: BillingEventType.PARTICIPANT_FEE,
        amountCents: unit * activeParticipants,
        currency: 'USD',
        periodStart,
        periodEnd,
        status: BillingEventStatus.PENDING,
      },
    });
  }

  /**
   * Count unique active participants across all ACTIVE grounds in an org.
   * Deduplication is by email (always present and unique per person).
   */
  private async getUniqueActiveParticipantCount(orgId: string): Promise<number> {
    const activeGrounds = await this.prisma.ground.findMany({
      where: { organizationId: orgId, status: GroundStatus.ACTIVE },
      select: { participants: { select: { email: true } } },
    });
    const emails = new Set<string>();
    for (const g of activeGrounds) {
      for (const p of g.participants) {
        emails.add(p.email.toLowerCase());
      }
    }
    return emails.size;
  }

  /**
   * Charge the first participant fee at the moment a ground is activated.
   * Period is a rolling 30-day window from activation.
   */
  async chargeParticipantFeeOnActivation(orgId: string): Promise<void> {
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
   * Daily: charge the next participant-fee period for every org with at least one
   * ACTIVE ground whose last-charged period has elapsed.
   * One event per org per period — participants are deduplicated across grounds.
   * Orgs with PAST_DUE or CANCELLED care fee are skipped.
   */
  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async chargeParticipantFees() {
    await this.prisma.withAdvisoryLock(CronLock.SCENARIO_FEES, async () => {
      const now = new Date();

      // Find orgs with at least one ACTIVE ground and a Stripe customer.
      const orgsWithActiveGrounds = await this.prisma.organization.findMany({
        where: {
          grounds: { some: { status: GroundStatus.ACTIVE } },
          stripeCustomerId: { not: null },
        },
        select: {
          id: true,
          stripeCustomerId: true,
          careFeeStatus: true,
        },
      });

      let charged = 0;
      let skipped = 0;

      for (const org of orgsWithActiveGrounds) {
        if (org.careFeeStatus !== CareFeeStatus.ACTIVE) { skipped++; continue; }
        if (!org.stripeCustomerId) { skipped++; continue; }

        const last = await this.prisma.billingEvent.findFirst({
          where: { organizationId: org.id, type: BillingEventType.PARTICIPANT_FEE },
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

      this.logger.log(`Participant fee run: ${orgsWithActiveGrounds.length} orgs checked, ${charged} charged, ${skipped} skipped.`);
    });
  }

  /**
   * Billing status for an org: platform fee state, active grounds, unique active
   * participant count, and estimated next charge.
   */
  async getStatus(organizationId: string): Promise<{
    careFeeActive: boolean;
    careFeeMonthlyCost: number;
    participantFeeMonthlyCost: number;
    activeGrounds: Array<{ groundId: string; label: string; startedAt: Date | null }>;
    activeParticipantCount: number;
    estimatedNextCharge: number;
    nextBillingDate: string;
  }> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { careFeeStatus: true, contributorBypass: true },
    });
    if (!org) throw new NotFoundException('Organization not found');

    const activeGroundRecords = await this.prisma.ground.findMany({
      where: { organizationId, status: GroundStatus.ACTIVE },
      select: { id: true, label: true, billingActivatedAt: true },
    });

    const PLATFORM_FEE = 25;
    const PARTICIPANT_FEE = 25;
    const careFeeActive = org.contributorBypass || org.careFeeStatus === CareFeeStatus.ACTIVE;
    const activeParticipantCount = await this.getUniqueActiveParticipantCount(organizationId);

    const activeGrounds = activeGroundRecords.map((g) => ({
      groundId: g.id,
      label: g.label,
      startedAt: g.billingActivatedAt,
    }));

    const estimatedNextCharge =
      (careFeeActive ? PLATFORM_FEE : 0) + activeParticipantCount * PARTICIPANT_FEE;

    const now = new Date();
    const nextBilling = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

    return {
      careFeeActive,
      careFeeMonthlyCost: PLATFORM_FEE,
      participantFeeMonthlyCost: PARTICIPANT_FEE,
      activeGrounds,
      activeParticipantCount,
      estimatedNextCharge,
      nextBillingDate: nextBilling.toISOString().slice(0, 10),
    };
  }

  /**
   * Full subscription cancellation. Cancels the Stripe subscription immediately,
   * marks the org as CANCELLED, sends a record-portability notice.
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

    const downloadUrl = `${this.config.get<string>('resend.frontendUrl') ?? ''}/users/me/export`;
    const orgUsers = await this.prisma.user.findMany({
      where: { organizationId, deletedAt: null },
      select: { id: true, email: true, firstName: true },
    });

    for (const user of orgUsers) {
      await this.email
        .sendRecordPortabilityNotice(user.email, user.firstName, downloadUrl)
        .catch((err: any) =>
          this.logger.warn(`Record portability notice failed for user ${user.id}: ${err.message}`),
        );
    }

    this.logger.log(`Subscription cancelled for org ${organizationId}; portability notices sent to ${orgUsers.length} user(s).`);
    return { cancelled: true };
  }

  /**
   * Cancel the platform fee subscription at period end.
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
    this.logger.log(`Platform fee cancellation scheduled for org ${organizationId} (effective ${periodEnd?.toISOString() ?? 'period end'})`);
    return { cancelled: true, effectiveAt: periodEnd };
  }

  /** A Stripe Customer Portal session. */
  async createBillingPortalSession(organizationId: string): Promise<{ portalUrl: string }> {
    const org = await this.prisma.organization.findUnique({ where: { id: organizationId }, select: { stripeCustomerId: true } });
    if (!org?.stripeCustomerId) throw new NotFoundException('No billing account set up for this organization');
    const base = this.config.get<string>('stripe.callbackUrl') || 'http://localhost:5173/billing/callback';
    const portalUrl = await this.stripe.createBillingPortalSession(org.stripeCustomerId, base);
    return { portalUrl };
  }

  /** Handle Stripe webhook events — keeps platform fee status in sync. */
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
        this.logger.log(`Platform fee active for org ${organizationId}`);
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

        const gracePeriodUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
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
