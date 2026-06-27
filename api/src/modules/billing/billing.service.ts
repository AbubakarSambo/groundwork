import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type Stripe from 'stripe';
import { PrismaService, CronLock } from '../prisma/prisma.service';
import { StripeService } from './stripe.service';
import { EmailService } from '../email/email.service';
import { CareFeeStatus, GroundStatus, BillingEventType, BillingEventStatus, UserRole, UsageEventType } from '@prisma/client';
import { UsageService } from '../usage/usage.service';
import * as crypto from 'crypto';

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
   * Ground creation gate.
   *
   * Resolution order:
   *   1. org.firstGroundUsed === false  → freeReason='FIRST_GROUND' (one-time per org)
   *   2. accessCode provided and valid  → freeReason='ACCESS_CODE', codeId set
   *   3. org has paid for this ground   → allowed, no freeReason (payment flow handled externally)
   *   4. otherwise                      → not allowed
   *
   * The caller (GroundsService.create) is responsible for persisting the derived
   * fields inside its transaction.
   */
  async canCreateGround(
    organizationId: string,
    accessCode?: string,
  ): Promise<{ allowed: boolean; reason?: string; freeReason?: 'FIRST_GROUND' | 'ACCESS_CODE'; codeId?: string }> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { firstGroundUsed: true, careFeeStatus: true },
    });
    if (!org) return { allowed: false, reason: 'Organization not found' };

    // 1. First ground for this org — always free.
    if (!org.firstGroundUsed) {
      return { allowed: true, freeReason: 'FIRST_GROUND' };
    }

    // 2. Contributor access code supplied.
    if (accessCode?.trim()) {
      const now = new Date();
      const code = await this.prisma.contributorCode.findFirst({
        where: {
          code: accessCode.trim(),
          isActive: true,
          expiresAt: { gt: now },
        },
        select: { id: true, sessionsGranted: true, sessionsUsed: true },
      });
      if (!code) {
        return { allowed: false, reason: 'Access code is invalid or has expired' };
      }
      if (code.sessionsUsed >= code.sessionsGranted) {
        return { allowed: false, reason: 'Access code has already been fully redeemed' };
      }
      return { allowed: true, freeReason: 'ACCESS_CODE', codeId: code.id };
    }

    // 3. Org is on an active paid plan — allow ground creation (session balance
    //    will have been topped up via Stripe; the ground's isFreeGround=false).
    if (org.careFeeStatus === CareFeeStatus.ACTIVE) {
      return { allowed: true };
    }

    // 4. No free entitlement and no active subscription.
    return {
      allowed: false,
      reason: 'Your first ground is free. To create additional grounds, purchase a session or use a contributor code.',
    };
  }

  /**
   * Create a Stripe Checkout session to purchase one or more additional check-in
   * sessions ($5 each, one-time). On webhook confirmation the ground sessionsBalance
   * is incremented by quantity and a SESSION_FEE BillingEvent is recorded.
   */
  async purchaseSession(organizationId: string, groundId: string, quantity = 1): Promise<{ checkoutUrl: string }> {
    const org = await this.prisma.organization.findUnique({ where: { id: organizationId } });
    if (!org) throw new NotFoundException('Organization not found');

    const customerId = await this.stripe.ensureCustomer(org.id, org.email ?? undefined, org.stripeCustomerId);
    if (customerId !== org.stripeCustomerId) {
      await this.prisma.organization.update({ where: { id: org.id }, data: { stripeCustomerId: customerId } });
    }

    const qty = Math.max(1, Math.min(20, quantity));
    const base = this.config.get<string>('stripe.callbackUrl') || 'http://localhost:5173/billing/callback';
    const session = await this.stripe.stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: 500,
            product_data: { name: qty === 1 ? 'Check-in session' : `Check-in sessions (×${qty})` },
          },
          quantity: qty,
        },
      ],
      metadata: { organizationId, groundId, type: 'session_fee', quantity: String(qty) },
      success_url: `${base}?status=success&groundId=${groundId}&type=session_fee`,
      cancel_url: `${base}?status=cancelled`,
    });

    return { checkoutUrl: session.url! };
  }

  /**
   * Generate a random 8-character uppercase alphanumeric contributor code and
   * persist it to the ContributorCode table.
   *
   * Only allowed if:
   *   - caller isPlatformAdmin, OR
   *   - caller org has allowCodeCreation=true AND caller is ADMIN
   */
  async generateContributorCode(
    organizationId: string,
    createdByUserId: string,
    sessionsGranted: number,
    note?: string,
    allowCodeCreation = false,
    parentCodeId?: string,
  ): Promise<{ code: string }> {
    // Authorization check
    const [org, callerUser] = await Promise.all([
      this.prisma.organization.findUnique({ where: { id: organizationId }, select: { allowCodeCreation: true } }),
      this.prisma.user.findUnique({ where: { id: createdByUserId }, select: { isPlatformAdmin: true, role: true } }),
    ]);

    const isPlatformAdmin = callerUser?.isPlatformAdmin ?? false;
    const orgAllowsCodeCreation = org?.allowCodeCreation ?? false;
    const callerIsAdmin = callerUser?.role === UserRole.ADMIN;

    if (!isPlatformAdmin && !(orgAllowsCodeCreation && callerIsAdmin)) {
      throw new ForbiddenException('Not authorised to generate contributor codes.');
    }

    const code = crypto.randomBytes(6).toString('base64url').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8).padEnd(8, '0');
    const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

    await this.prisma.contributorCode.create({
      data: {
        organizationId,
        createdByUserId,
        code,
        sessionsGranted,
        note,
        allowCodeCreation,
        parentCodeId: parentCodeId ?? null,
        expiresAt,
      },
    });
    this.logger.log(`Contributor code generated for org ${organizationId}: ${code}`);
    return { code };
  }

  /**
   * Redeem a contributor code against a ground. Increments the ground's
   * sessionsBalance, marks the code as fully used, and records a redemption row.
   * If code.allowCodeCreation and redeemedBy is ADMIN → set org.allowCodeCreation=true.
   */
  async redeemContributorCode(
    code: string,
    groundId: string,
    callerOrganizationId?: string,
    redeemedByUserId?: string,
  ): Promise<{ ok: boolean; message: string; sessionsAdded?: number }> {
    if (callerOrganizationId) {
      const ground = await this.prisma.ground.findFirst({ where: { id: groundId, organizationId: callerOrganizationId } });
      if (!ground) return { ok: false, message: 'Ground not found or does not belong to your organization.' };
    }

    const record = await this.prisma.contributorCode.findUnique({ where: { code } });
    if (!record) return { ok: false, message: 'Code not valid or already used.' };

    const now = new Date();
    if (!record.isActive) return { ok: false, message: 'Code not valid or already used.' };
    if (record.expiresAt && record.expiresAt < now) return { ok: false, message: 'Code not valid or already used.' };
    if (record.sessionsUsed >= record.sessionsGranted) return { ok: false, message: 'Code not valid or already used.' };

    const sessionsToAdd = record.sessionsGranted - record.sessionsUsed;

    // Check if we should grant allowCodeCreation to the redeeming org.
    let grantCodeCreation = false;
    if (record.allowCodeCreation && redeemedByUserId && callerOrganizationId) {
      const redeemer = await this.prisma.user.findUnique({ where: { id: redeemedByUserId }, select: { role: true } });
      if (redeemer?.role === UserRole.ADMIN) {
        grantCodeCreation = true;
      }
    }

    const ops: any[] = [
      this.prisma.ground.update({
        where: { id: groundId },
        data: { sessionsBalance: { increment: sessionsToAdd } },
      }),
      this.prisma.contributorCode.update({
        where: { id: record.id },
        data: { sessionsUsed: record.sessionsGranted },
      }),
      this.prisma.contributorCodeRedemption.create({
        data: { codeId: record.id, groundId, redeemedByUserId: redeemedByUserId ?? null },
      }),
    ];

    if (grantCodeCreation && callerOrganizationId) {
      ops.push(
        this.prisma.organization.update({
          where: { id: callerOrganizationId },
          data: { allowCodeCreation: true },
        }),
      );
    }

    await this.prisma.$transaction(ops);

    this.logger.log(`Contributor code ${code} redeemed for ground ${groundId}: +${sessionsToAdd} session(s)`);
    return { ok: true, message: `${sessionsToAdd} session(s) added.`, sessionsAdded: sessionsToAdd };
  }

  /** With per-session billing there is no subscription prerequisite — billing is always ready. */
  async isBillingReady(_organizationId: string): Promise<boolean> {
    return true;
  }

  /**
   * Billing status: active grounds with session balances and saved card details.
   */
  async getStatus(organizationId: string): Promise<{
    activeGrounds: Array<{ groundId: string; label: string; startedAt: Date | null; sessionsBalance: number }>;
    card?: { brand: string; last4: string } | null;
  }> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { stripeCustomerId: true, defaultPaymentMethodId: true },
    });
    if (!org) throw new NotFoundException('Organization not found');

    const activeGrounds = await this.prisma.ground.findMany({
      where: { organizationId, status: GroundStatus.ACTIVE },
      select: { id: true, label: true, billingActivatedAt: true, sessionsBalance: true },
    });

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
      activeGrounds: activeGrounds.map((g) => ({
        groundId: g.id,
        label: g.label,
        startedAt: g.billingActivatedAt,
        sessionsBalance: g.sessionsBalance,
      })),
      card,
    };
  }

  /**
   * Account cancellation. Marks the org as CANCELLED and sends a record-portability
   * notice to every user so each person knows their record is retained.
   */
  async cancelSubscription(organizationId: string): Promise<{ cancelled: boolean }> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { careFeeSubscriptionId: true, email: true, name: true },
    });
    if (!org) throw new NotFoundException('Organization not found');

    if (org.careFeeSubscriptionId) {
      await this.stripe.stripe.subscriptions.cancel(org.careFeeSubscriptionId).catch(() => null);
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
          this.logger.warn(`Record portability notice failed for user ${user.id} (org ${organizationId}): ${err.message}`),
        );
    }

    this.logger.log(`Account cancelled for org ${organizationId}; portability notices sent to ${orgUsers.length} user(s).`);
    return { cancelled: true };
  }

  /**
   * A Stripe Customer Portal session — self-serve surface for updating the card
   * and viewing payment history.
   */
  async createBillingPortalSession(organizationId: string): Promise<{ portalUrl: string }> {
    const org = await this.prisma.organization.findUnique({ where: { id: organizationId }, select: { stripeCustomerId: true } });
    if (!org?.stripeCustomerId) throw new NotFoundException('No billing account set up for this organization');
    const base = this.config.get<string>('stripe.callbackUrl') || 'http://localhost:5173/billing/callback';
    const portalUrl = await this.stripe.createBillingPortalSession(org.stripeCustomerId, base);
    return { portalUrl };
  }

  /** Handle Stripe webhook events. */
  async handleStripeEvent(event: Stripe.Event) {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;

        if (session.metadata?.type === 'session_fee') {
          const { organizationId, groundId } = session.metadata ?? {};
          const qty = parseInt(session.metadata?.quantity ?? '1', 10) || 1;
          const stripeInvoiceId = (session.payment_intent as string | null) ?? event.id;
          if (organizationId && groundId) {
            // Idempotency guard: skip if we've already processed this payment intent.
            const existing = await this.prisma.billingEvent.findFirst({ where: { stripeInvoiceId } });
            if (existing) {
              this.logger.warn(`Duplicate webhook for ${stripeInvoiceId} — skipping`);
              break;
            }
            const now = new Date();
            await this.prisma.$transaction([
              this.prisma.ground.update({
                where: { id: groundId },
                data: { sessionsBalance: { increment: qty } },
              }),
              this.prisma.billingEvent.create({
                data: {
                  organizationId,
                  groundId,
                  type: BillingEventType.SESSION_FEE,
                  amountCents: 500 * qty,
                  currency: 'USD',
                  status: BillingEventStatus.PAID,
                  periodStart: now,
                  periodEnd: now,
                  stripeInvoiceId,
                },
              }),
            ]);
            this.logger.log(`Session fee paid: ${qty} session(s) added to ground ${groundId} (org ${organizationId})`);
          }
          break;
        }

        // Handle any legacy subscription checkout completions.
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
        this.logger.log(`Legacy subscription activated for org ${organizationId}`);
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
      include: { redemptions: { select: { groundId: true, redeemedAt: true, redeemedByUserId: true, freeReason: true } } },
    });
  }

  /**
   * Get stats for all contributor codes belonging to an organization (admin view).
   */
  async getCodeStats(organizationId: string) {
    const codes = await this.prisma.contributorCode.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      include: {
        redemptions: {
          select: { groundId: true, freeReason: true, redeemedAt: true, redeemedByUserId: true },
        },
      },
    });

    const now = new Date();
    return codes.map((c) => ({
      id: c.id,
      code: c.code,
      allowCodeCreation: c.allowCodeCreation,
      isActive: c.isActive,
      expiresAt: c.expiresAt,
      sessionsGranted: c.sessionsGranted,
      sessionsUsed: c.sessionsUsed,
      createdAt: c.createdAt,
      redemptions: c.redemptions,
      daysUntilExpiry: c.expiresAt ? Math.max(0, Math.ceil((c.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))) : null,
    }));
  }

  /**
   * Disable a contributor code. Validates that the caller's org owns the code.
   */
  async disableCode(codeId: string, callerOrgId: string): Promise<{ ok: boolean }> {
    const code = await this.prisma.contributorCode.findUnique({ where: { id: codeId } });
    if (!code) throw new NotFoundException('Code not found');
    if (code.organizationId !== callerOrgId) throw new ForbiddenException('Not authorised to disable this code.');
    await this.prisma.contributorCode.update({ where: { id: codeId }, data: { isActive: false } });
    this.logger.log(`Contributor code ${codeId} disabled by org ${callerOrgId}`);
    return { ok: true };
  }

  /**
   * Platform admin: get stats across all orgs — all codes, all redemptions, usage by freeReason.
   */
  async getPlatformAdminStats(callerUserId: string) {
    const caller = await this.prisma.user.findUnique({ where: { id: callerUserId }, select: { isPlatformAdmin: true } });
    if (!caller?.isPlatformAdmin) throw new ForbiddenException('Platform admin access required.');

    const codes = await this.prisma.contributorCode.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        redemptions: {
          select: { groundId: true, freeReason: true, redeemedAt: true, redeemedByUserId: true },
        },
        organization: { select: { id: true, name: true, slug: true } },
      },
    });

    const allRedemptions = codes.flatMap((c) => c.redemptions);
    const usageByFreeReason: Record<string, number> = {};
    for (const r of allRedemptions) {
      const key = r.freeReason ?? 'unknown';
      usageByFreeReason[key] = (usageByFreeReason[key] ?? 0) + 1;
    }

    const now = new Date();
    return {
      totalCodes: codes.length,
      totalRedemptions: allRedemptions.length,
      usageByFreeReason,
      codes: codes.map((c) => ({
        id: c.id,
        code: c.code,
        organizationId: c.organizationId,
        organization: c.organization,
        allowCodeCreation: c.allowCodeCreation,
        isActive: c.isActive,
        expiresAt: c.expiresAt,
        sessionsGranted: c.sessionsGranted,
        sessionsUsed: c.sessionsUsed,
        createdAt: c.createdAt,
        daysUntilExpiry: c.expiresAt ? Math.max(0, Math.ceil((c.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))) : null,
        redemptions: c.redemptions,
      })),
    };
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
