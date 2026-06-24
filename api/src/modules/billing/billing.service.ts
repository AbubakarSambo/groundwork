import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import type Stripe from 'stripe';
import { PrismaService, CronLock } from '../prisma/prisma.service';
import { StripeService } from './stripe.service';
import { EmailService } from '../email/email.service';
import { CareFeeStatus, GroundStatus, BillingEventType, BillingEventStatus, UserRole, UsageEventType } from '@prisma/client';
import { UsageService } from '../usage/usage.service';
import * as crypto from 'crypto';

const PARTICIPANT_PERIOD_DAYS = 30;
const dayMs = 24 * 60 * 60 * 1000;

/**
 * Billing model:
 *   Per-session billing. First session on each ground is free (sessionsBalance starts at 1).
 *   Each additional session costs $5, purchased via Stripe one-time checkout.
 *   Free tier capped at 3 free grounds per org (freeSessionsUsed counter).
 *   Contributor codes allow admins to grant sessions to other grounds.
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

  /**
   * Session balance gate. Returns allowed: true when the ground has at least one
   * session remaining, or allowed: false with a human-readable reason.
   */
  async canStartSession(groundId: string): Promise<{ allowed: boolean; reason?: string; sessionsBalance: number }> {
    const ground = await this.prisma.ground.findUnique({
      where: { id: groundId },
      select: { sessionsBalance: true, isFreeGround: true, organizationId: true },
    });

    // Abuse prevention: free grounds are limited to 3 free sessions per org.
    if (ground?.isFreeGround) {
      const org = await this.prisma.organization.findUnique({
        where: { id: ground.organizationId },
        select: { freeSessionsUsed: true },
      });
      if ((org?.freeSessionsUsed ?? 0) >= 3) {
        return {
          allowed: false,
          reason: 'Your account has used 3 free sessions. Add a session for $5 to continue.',
          sessionsBalance: 0,
        };
      }
    }

    const balance = ground?.sessionsBalance ?? 0;
    if (balance > 0) return { allowed: true, sessionsBalance: balance };
    return {
      allowed: false,
      reason: 'No sessions remaining. Add a session for $5 to continue.',
      sessionsBalance: 0,
    };
  }

  /**
   * Create a Stripe Checkout session to purchase one additional check-in session
   * ($5 one-time). On webhook confirmation the ground sessionsBalance is
   * incremented by 1 and a SESSION_FEE BillingEvent is recorded.
   */
  async purchaseSession(organizationId: string, groundId: string): Promise<{ checkoutUrl: string }> {
    const org = await this.prisma.organization.findUnique({ where: { id: organizationId } });
    if (!org) throw new NotFoundException('Organization not found');

    const customerId = await this.stripe.ensureCustomer(org.id, org.email ?? undefined, org.stripeCustomerId);
    if (customerId !== org.stripeCustomerId) {
      await this.prisma.organization.update({ where: { id: org.id }, data: { stripeCustomerId: customerId } });
    }

    const base = this.config.get<string>('stripe.callbackUrl') || 'http://localhost:5173/billing/callback';
    const session = await this.stripe.stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: 500,
            product_data: { name: 'Check-in session' },
          },
          quantity: 1,
        },
      ],
      metadata: { organizationId, groundId, type: 'session_fee' },
      success_url: `${base}?status=success&groundId=${groundId}&type=session_fee`,
      cancel_url: `${base}?status=cancelled`,
    });

    return { checkoutUrl: session.url! };
  }

  /**
   * Generate a random 8-character uppercase alphanumeric contributor code and
   * persist it to the ContributorCode table.
   */
  async generateContributorCode(
    organizationId: string,
    createdByUserId: string,
    sessionsGranted: number,
    note?: string,
  ): Promise<{ code: string }> {
    const code = crypto.randomBytes(6).toString('base64url').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8).padEnd(8, '0');
    await this.prisma.contributorCode.create({
      data: { organizationId, createdByUserId, code, sessionsGranted, note },
    });
    this.logger.log(`Contributor code generated for org ${organizationId}: ${code}`);
    return { code };
  }

  /**
   * Redeem a contributor code against a ground. Increments the ground's
   * sessionsBalance, marks the code as fully used, and records a redemption row.
   */
  async redeemContributorCode(
    code: string,
    groundId: string,
  ): Promise<{ ok: boolean; message: string; sessionsAdded?: number }> {
    const record = await this.prisma.contributorCode.findUnique({ where: { code } });
    if (!record) return { ok: false, message: 'Code not valid or already used.' };

    const now = new Date();
    if (record.expiresAt && record.expiresAt < now) return { ok: false, message: 'Code not valid or already used.' };
    if (record.sessionsUsed >= record.sessionsGranted) return { ok: false, message: 'Code not valid or already used.' };

    const sessionsToAdd = record.sessionsGranted - record.sessionsUsed;

    await this.prisma.$transaction([
      this.prisma.ground.update({
        where: { id: groundId },
        data: { sessionsBalance: { increment: sessionsToAdd } },
      }),
      this.prisma.contributorCode.update({
        where: { id: record.id },
        data: { sessionsUsed: record.sessionsGranted },
      }),
      this.prisma.contributorCodeRedemption.create({
        data: { codeId: record.id, groundId },
      }),
    ]);

    this.logger.log(`Contributor code ${code} redeemed for ground ${groundId}: +${sessionsToAdd} session(s)`);
    return { ok: true, message: `${sessionsToAdd} session(s) added.`, sessionsAdded: sessionsToAdd };
  }

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
    activeGrounds: Array<{ groundId: string; label: string; startedAt: Date | null; sessionsBalance: number }>;
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
      select: { id: true, label: true, billingActivatedAt: true, sessionsBalance: true },
    });

    const CARE_FEE = this.config.get<number>('stripe.careFeeCents') ?? 2500;
    const PARTICIPANT_FEE = this.config.get<number>('stripe.scenarioFeeCents') ?? 2500;
    const careFeeActive = org.careFeeStatus === CareFeeStatus.ACTIVE;
    const activeParticipantCount = await this.getUniqueActiveParticipantCount(organizationId);

    const groundsOut = activeGrounds.map((g) => ({
      groundId: g.id,
      label: g.label,
      startedAt: g.billingActivatedAt,
      sessionsBalance: g.sessionsBalance,
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

        // Session fee: one-time $5 purchase for a single check-in session.
        if (session.metadata?.type === 'session_fee') {
          const { organizationId, groundId } = session.metadata ?? {};
          if (organizationId && groundId) {
            await this.prisma.ground.update({
              where: { id: groundId },
              data: { sessionsBalance: { increment: 1 } },
            });
            const now = new Date();
            await this.prisma.billingEvent.create({
              data: {
                organizationId,
                groundId,
                type: BillingEventType.SESSION_FEE,
                amountCents: 500,
                currency: 'USD',
                status: BillingEventStatus.PAID,
                periodStart: now,
                periodEnd: now,
                stripeInvoiceId: (session.payment_intent as string | null) ?? null,
              },
            });
            this.logger.log(`Session fee paid for ground ${groundId} (org ${organizationId})`);
          }
          break;
        }

        // Care fee: subscription checkout.
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

  /** List all contributor codes for an organization. */
  async listContributorCodes(organizationId: string) {
    return this.prisma.contributorCode.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      include: { redemptions: { select: { groundId: true, redeemedAt: true } } },
    });
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
