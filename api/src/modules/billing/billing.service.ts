import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type Stripe from 'stripe';
import { PrismaService, CronLock } from '../prisma/prisma.service';
import { StripeService } from './stripe.service';
import { EmailService } from '../email/email.service';
import { CareFeeStatus, GroundStatus, BillingEventType, BillingEventStatus, UserRole, UsageEventType, SubscriptionPlan } from '@prisma/client';
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
   * session remaining, or the org has an active subscription (unlimited sessions).
   */
  async canStartSession(groundId: string): Promise<{ allowed: boolean; reason?: string; sessionsBalance: number; freeExtensionAvailable?: boolean }> {
    const ground = await this.prisma.ground.findUnique({
      where: { id: groundId },
      select: { sessionsBalance: true, isFreeGround: true, organizationId: true },
    });

    // Active subscription = unlimited sessions, no balance check needed.
    if (ground?.organizationId) {
      const org = await this.prisma.organization.findUnique({
        where: { id: ground.organizationId },
        select: { subscriptionPlan: true, subscriptionStatus: true, freeSessionsUsed: true, freeExtensionUsed: true },
      });
      if (org?.subscriptionPlan && org.subscriptionStatus === 'active') {
        return { allowed: true, sessionsBalance: -1 }; // -1 signals unlimited
      }

      const balance = ground?.sessionsBalance ?? 0;
      if (balance > 0) return { allowed: true, sessionsBalance: balance };

      // Abuse prevention: free grounds are limited to 3 free sessions per org.
      if (ground?.isFreeGround && (org?.freeSessionsUsed ?? 0) >= 3) {
        return {
          allowed: false,
          reason: 'Your account has used 3 free sessions. Add a session for $5 to continue.',
          sessionsBalance: 0,
          freeExtensionAvailable: !(org?.freeExtensionUsed ?? false),
        };
      }

      return {
        allowed: false,
        reason: 'No sessions remaining. Add a session for $5 to continue.',
        sessionsBalance: 0,
        freeExtensionAvailable: !(org?.freeExtensionUsed ?? false),
      };
    }

    const balance = ground?.sessionsBalance ?? 0;
    if (balance > 0) return { allowed: true, sessionsBalance: balance };
    return { allowed: false, reason: 'No sessions remaining. Add a session for $5 to continue.', sessionsBalance: 0 };
  }

  /** Free ground limit for organizations without a subscription. */
  static readonly FREE_GROUND_LIMIT = 10;

  /**
   * Ground creation gate.
   *
   * Resolution order:
   *   1. org has active subscription or legacy care fee → allowed (unlimited)
   *   2. accessCode provided and valid → freeReason='ACCESS_CODE', codeId set
   *   3. org ground count < FREE_GROUND_LIMIT → freeReason='FREE_TIER'
   *   4. otherwise → not allowed (upgrade required)
   *
   * The caller (GroundsService.create) is responsible for persisting the derived
   * fields inside its transaction.
   */
  async canCreateGround(
    organizationId: string,
    accessCode?: string,
  ): Promise<{ allowed: boolean; reason?: string; freeReason?: 'FREE_TIER' | 'ACCESS_CODE'; codeId?: string; groundsUsed?: number }> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { subscriptionPlan: true, subscriptionStatus: true, careFeeStatus: true },
    });
    if (!org) return { allowed: false, reason: 'Organization not found' };

    // 1. Org has an active subscription - unlimited grounds.
    if (org.subscriptionPlan && org.subscriptionStatus === 'active') {
      return { allowed: true };
    }

    // 1b. Org is on legacy active care fee plan.
    if (org.careFeeStatus === CareFeeStatus.ACTIVE) {
      return { allowed: true };
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

    // 3. Free tier: up to FREE_GROUND_LIMIT grounds per org.
    const groundCount = await this.prisma.ground.count({ where: { organizationId } });
    if (groundCount < BillingService.FREE_GROUND_LIMIT) {
      return { allowed: true, freeReason: 'FREE_TIER', groundsUsed: groundCount };
    }

    // 4. Free limit reached, no active subscription.
    return {
      allowed: false,
      reason: `Your free plan includes ${BillingService.FREE_GROUND_LIMIT} Grounds. Subscribe to create unlimited Grounds.`,
      groundsUsed: groundCount,
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

  /** Member cap limits per subscription plan. */
  private readonly PLAN_MEMBER_CAPS: Record<SubscriptionPlan, number | null> = {
    [SubscriptionPlan.STARTER]: 5,
    [SubscriptionPlan.SMALL_TEAM]: 20,
    [SubscriptionPlan.GROWTH]: 100,
    [SubscriptionPlan.BUSINESS]: 250,
    [SubscriptionPlan.SCALE]: 1000,
    [SubscriptionPlan.ENTERPRISE]: null, // unlimited
  };

  /** Returns allowed: false if the org is at its plan member cap. */
  async canInviteMember(organizationId: string): Promise<{ allowed: boolean; reason?: string }> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { subscriptionPlan: true, subscriptionStatus: true, _count: { select: { users: true } } },
    });
    if (!org?.subscriptionPlan || org.subscriptionStatus !== 'active') return { allowed: true };
    const cap = this.PLAN_MEMBER_CAPS[org.subscriptionPlan];
    if (cap === null) return { allowed: true };
    if ((org._count.users ?? 0) >= cap) {
      return {
        allowed: false,
        reason: `Your ${org.subscriptionPlan.replace('_', ' ').toLowerCase()} plan supports up to ${cap} members. Upgrade your organization to add more.`,
      };
    }
    return { allowed: true };
  }

  /** Grants one free session extension to a ground if the org has not used it yet. Idempotent. */
  async claimFreeExtension(organizationId: string, groundId: string): Promise<void> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { freeExtensionUsed: true },
    });
    if (!org) throw new NotFoundException('Organization not found');
    if (org.freeExtensionUsed) throw new ForbiddenException('Free session extension has already been used for this organization.');

    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.organization.update({ where: { id: organizationId }, data: { freeExtensionUsed: true } }),
      this.prisma.ground.update({ where: { id: groundId }, data: { sessionsBalance: { increment: 1 } } }),
      this.prisma.billingEvent.create({
        data: {
          organizationId,
          groundId,
          type: BillingEventType.FREE_EXTENSION,
          amountCents: 0,
          currency: 'USD',
          status: BillingEventStatus.PAID,
          periodStart: now,
          periodEnd: now,
          stripeInvoiceId: `free_ext_${organizationId}`,
        },
      }),
    ]);
    this.logger.log(`Free extension claimed for org ${organizationId} on ground ${groundId}`);
  }

  /** Monthly prices in cents per subscription plan. */
  private readonly PLAN_PRICES_CENTS: Partial<Record<SubscriptionPlan, number>> = {
    [SubscriptionPlan.STARTER]: 2500,
    [SubscriptionPlan.SMALL_TEAM]: 5000,
    [SubscriptionPlan.GROWTH]: 10000,
    [SubscriptionPlan.BUSINESS]: 20000,
    [SubscriptionPlan.SCALE]: 40000,
  };

  private readonly PLAN_LABELS: Record<SubscriptionPlan, string> = {
    [SubscriptionPlan.STARTER]: 'Starter (up to 5 people)',
    [SubscriptionPlan.SMALL_TEAM]: 'Small Team (up to 20 people)',
    [SubscriptionPlan.GROWTH]: 'Growth (up to 100 people)',
    [SubscriptionPlan.BUSINESS]: 'Business (up to 250 people)',
    [SubscriptionPlan.SCALE]: 'Scale (up to 1,000 people)',
    [SubscriptionPlan.ENTERPRISE]: 'Enterprise',
  };

  /** Create a Stripe recurring checkout session for an org subscription plan. */
  async createSubscription(organizationId: string, plan: SubscriptionPlan): Promise<{ checkoutUrl: string }> {
    if (plan === SubscriptionPlan.ENTERPRISE) {
      throw new ForbiddenException('Enterprise plans require contacting the support team.');
    }
    const org = await this.prisma.organization.findUnique({ where: { id: organizationId } });
    if (!org) throw new NotFoundException('Organization not found');

    const customerId = await this.stripe.ensureCustomer(org.id, org.email ?? undefined, org.stripeCustomerId);
    if (customerId !== org.stripeCustomerId) {
      await this.prisma.organization.update({ where: { id: org.id }, data: { stripeCustomerId: customerId } });
    }

    const amountCents = this.PLAN_PRICES_CENTS[plan]!;
    const base = this.config.get<string>('stripe.callbackUrl') || 'http://localhost:5173/billing/callback';
    const session = await this.stripe.stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: amountCents,
            recurring: { interval: 'month' },
            product_data: { name: `Groundwork ${this.PLAN_LABELS[plan]}` },
          },
          quantity: 1,
        },
      ],
      metadata: { organizationId, plan, type: 'subscription' },
      success_url: `${base}?status=success&type=subscription&plan=${plan}`,
      cancel_url: `${base}?status=cancelled`,
    });

    return { checkoutUrl: session.url! };
  }

  /** Cancel the org's active subscription immediately. */
  async cancelSubscription(organizationId: string): Promise<void> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { subscriptionStripeId: true },
    });
    if (!org?.subscriptionStripeId) throw new NotFoundException('No active subscription found.');

    await this.stripe.stripe.subscriptions.cancel(org.subscriptionStripeId);
    await this.prisma.organization.update({
      where: { id: organizationId },
      data: { subscriptionPlan: null, subscriptionStatus: 'cancelled', subscriptionStripeId: null, subscriptionPeriodEnd: null },
    });
    this.logger.log(`Subscription cancelled for org ${organizationId}`);
  }

  /** Pause the org's subscription via Stripe pause collection. */
  async pauseSubscription(organizationId: string): Promise<void> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { subscriptionStripeId: true },
    });
    if (!org?.subscriptionStripeId) throw new NotFoundException('No active subscription found.');

    await this.stripe.stripe.subscriptions.update(org.subscriptionStripeId, {
      pause_collection: { behavior: 'mark_uncollectible' },
    });
    await this.prisma.organization.update({ where: { id: organizationId }, data: { subscriptionStatus: 'paused' } });
    this.logger.log(`Subscription paused for org ${organizationId}`);
  }

  /** Resume a paused subscription. */
  async resumeSubscription(organizationId: string): Promise<void> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { subscriptionStripeId: true },
    });
    if (!org?.subscriptionStripeId) throw new NotFoundException('No active subscription found.');

    await this.stripe.stripe.subscriptions.update(org.subscriptionStripeId, { pause_collection: '' as any });
    await this.prisma.organization.update({ where: { id: organizationId }, data: { subscriptionStatus: 'active' } });
    this.logger.log(`Subscription resumed for org ${organizationId}`);
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

  async sendContributorCodeToEmail(
    organizationId: string,
    userId: string,
    email: string,
    sessionsGranted: number,
    note?: string,
  ): Promise<{ code: string; email: string }> {
    const result = await this.generateContributorCode(
      organizationId,
      userId,
      sessionsGranted,
      note ?? `sent-to:${email}`,
    );
    await this.email.sendContributorCode(email, result.code, sessionsGranted);
    return { code: result.code, email };
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

  /** With per-session billing there is no subscription prerequisite - billing is always ready. */
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
  async cancelAccount(organizationId: string): Promise<{ cancelled: boolean }> {
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
   * A Stripe Customer Portal session - self-serve surface for updating the card
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
              this.logger.warn(`Duplicate webhook for ${stripeInvoiceId} - skipping`);
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

        // New org subscription checkout.
        if (session.metadata?.type === 'subscription') {
          const { organizationId: orgId, plan } = session.metadata ?? {};
          const subId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;
          if (orgId && plan && subId) {
            const sub = await this.stripe.stripe.subscriptions.retrieve(subId);
            const periodEnd = sub.current_period_end ? new Date(sub.current_period_end * 1000) : null;
            await this.prisma.organization.update({
              where: { id: orgId },
              data: {
                subscriptionPlan: plan as SubscriptionPlan,
                subscriptionStatus: 'active',
                subscriptionStripeId: subId,
                subscriptionPeriodEnd: periodEnd,
              },
            });
            const orgData = await this.prisma.organization.findUnique({ where: { id: orgId }, select: { email: true } });
            if (orgData?.email && periodEnd) {
              await this.email.sendSubscriptionConfirmed(orgData.email, plan, periodEnd).catch(() => undefined);
            }
            this.logger.log(`Org subscription activated: org ${orgId} plan ${plan}`);
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

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        const orgId = sub.metadata?.organizationId;
        if (!orgId) break;
        // Update new subscription plan fields if present.
        if (sub.metadata?.plan) {
          const periodEnd = sub.current_period_end ? new Date(sub.current_period_end * 1000) : null;
          await this.prisma.organization.update({
            where: { id: orgId },
            data: {
              subscriptionStatus: sub.status,
              subscriptionPeriodEnd: periodEnd,
            },
          });
        } else {
          await this.prisma.organization.update({
            where: { id: orgId },
            data: { careFeeStatus: this.mapSubscriptionStatus(sub.status) },
          });
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const orgId = sub.metadata?.organizationId;
        if (!orgId) break;
        if (sub.metadata?.plan) {
          const orgData = await this.prisma.organization.findUnique({ where: { id: orgId }, select: { email: true, subscriptionPlan: true } });
          await this.prisma.organization.update({
            where: { id: orgId },
            data: { subscriptionPlan: null, subscriptionStatus: 'cancelled', subscriptionStripeId: null, subscriptionPeriodEnd: null },
          });
          if (orgData?.email && orgData.subscriptionPlan) {
            await this.email.sendSubscriptionCancelled(orgData.email, orgData.subscriptionPlan).catch(() => undefined);
          }
        } else {
          await this.prisma.organization.update({
            where: { id: orgId },
            data: { careFeeStatus: this.mapSubscriptionStatus(sub.status) },
          });
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
        if (!customerId) break;
        const paidOrg = await this.prisma.organization.findFirst({
          where: { stripeCustomerId: customerId },
          select: { id: true, email: true, subscriptionPlan: true, subscriptionPeriodEnd: true },
        });
        if (paidOrg?.email && paidOrg.subscriptionPlan) {
          const amountCents = invoice.amount_paid ?? 0;
          await this.email.sendSubscriptionRenewal(paidOrg.email, paidOrg.subscriptionPlan, amountCents, paidOrg.subscriptionPeriodEnd).catch(() => undefined);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
        if (!customerId) break;

        const gracePeriodUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        const failedOrg = await this.prisma.organization.findFirst({
          where: { stripeCustomerId: customerId },
          select: { id: true, name: true, email: true, subscriptionPlan: true },
        });
        if (failedOrg?.subscriptionPlan) {
          // New subscription payment failed.
          await this.prisma.organization.update({
            where: { id: failedOrg.id },
            data: { subscriptionStatus: 'past_due' },
          });
          const portalUrl = `${this.config.get<string>('resend.frontendUrl') ?? ''}/billing`;
          if (failedOrg.email) {
            await this.email.sendSubscriptionPaymentFailed(failedOrg.email, failedOrg.subscriptionPlan, portalUrl).catch(() => undefined);
          }
        } else {
          // Legacy care fee payment failed.
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
   * Platform admin: get stats across all orgs - all codes, all redemptions, usage by freeReason.
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

    const [subscribedOrgsCount, sessionBalanceAgg] = await Promise.all([
      this.prisma.organization.count({
        where: { subscriptionStatus: 'active' },
      }),
      this.prisma.ground.aggregate({
        _sum: { sessionsBalance: true },
      }),
    ]);

    const now = new Date();
    return {
      totalCodes: codes.length,
      totalRedemptions: allRedemptions.length,
      usageByFreeReason,
      totalSubscribedOrgs: subscribedOrgsCount,
      totalSessionsBalance: sessionBalanceAgg._sum.sessionsBalance ?? 0,
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
