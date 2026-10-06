import { Injectable, Logger, NotFoundException, ForbiddenException, BadRequestException, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import type Stripe from 'stripe';
import { PrismaService, CronLock } from '../prisma/prisma.service';
import { StripeService } from './stripe.service';
import { PricingService, PLAN_LABELS, DEFAULT_FREE_GROUND_LIMIT, freePlanApplies, WHATSAPP_ADD_ON_KIND } from './pricing.service';
import { WhatsAppAddOnService } from './whatsapp-add-on.service';
import { claimTheSlot, theDay } from '../prisma/once-across-copies';

/**
 * WHAT SOMEBODY READS WHEN THEY RUN OUT OF SEATS.
 *
 * Written here, once, because the gate and the per-check-in cap both refuse for the same reason
 * and a person who hits one and then the other should not be told two different things.
 *
 * "5 people" reads as "5 people I can invite" to almost everybody, and it is not: the account
 * creator holds one of the five. So the number is always said with who it counts, and the message
 * says what a subscription gives rather than what the reader did wrong.
 */
export function freeSeatLimitMessage(limit: number): string {
  return `The free plan covers ${limit} people, including you, so you can invite ${limit - 1} others. Subscribe to add more people.`;
}

/**
 * WHAT A NEW ORGANISATION WITH NO PLAN READS, once the free trial's switch is on and the free plan has
 * stopped for new organisations (Hafsah, 27 September). Never read while the switch is off.
 */
export const NO_PLAN_TO_OPEN = 'Your organisation has no plan yet. Choose one on Plan and billing to open a check-in.';
export const NO_PLAN_TO_ADD = 'Your organisation has no plan yet. Choose one on Plan and billing to add people.';
/* The prototype's words (upgrade.txt), for anybody in a check-in whose organisation has no plan. */
/** "When Baridi Appliances was set up, it had 20 or more people, so it began on a plan." Null when nobody was asked. */
export function theSizeItStartedWith(org: { name?: string | null; teamSizeSaid?: string | null; teamSizeLine?: number | null }): { said: 'fewer' | 'more'; line: number; says: string } | null {
  const said = org.teamSizeSaid === 'fewer' || org.teamSizeSaid === 'more' ? org.teamSizeSaid : null;
  const line = Number(org.teamSizeLine);
  if (!said || !Number.isInteger(line) || line < 2) return null;
  const who = (org.name ?? '').trim() || 'your organisation';
  const says = said === 'more'
    ? `When ${who} was set up, it had ${line} or more people, so it began on a plan.`
    : `When ${who} was set up, it had fewer than ${line} people.`;
  return { said, line, says };
}

/* "Remind them" (upgrade.txt, "Anyone else, once it has paused"): what the person reads back. */
export const THE_ADMINS_ARE_REMINDED = 'We have reminded your admins that you are waiting. You can remind them again tomorrow.';
export const REMINDED_TODAY_ALREADY = 'You already reminded your admins today. You can remind them again tomorrow.';
export const NOTHING_IS_PAUSED = 'This check-in is not paused, so there is nobody to remind.';
export const NO_ADMIN_TO_REMIND = 'Your organisation has no admin to remind yet. Tell the person who runs this check-in.';

export const PAUSED_UNTIL_THEY_SUBSCRIBE = 'This check-in is paused until your team subscribes. Only an admin can do that, and your answers so far are kept.';

export function paidSeatLimitMessage(planLabel: string, cap: number): string {
  return `Your ${planLabel} plan covers ${cap} people, including you. Move to a larger plan to add more.`;
}
import { EmailService } from '../email/email.service';
import { CareFeeStatus, GroundStatus, BillingEventType, BillingEventStatus, UserRole, UsageEventType, SubscriptionPlan } from '@prisma/client';
import { UsageService } from '../usage/usage.service';
import * as crypto from 'crypto';
import { seatsIn } from '../../common/seats';
import { isSubscribed, isCovered, whatCoversThem, ACTIVE, type SubscriptionStatus } from '../../common/subscription';

/**
 * Billing model:
 *   TEN free grounds per org, each with UNLIMITED sessions and reports. A
 *   subscription lifts the ten-ground cap. Nothing is charged per session.
 *   Contributor codes let an admin grant access without payment.
 *
 * This comment used to describe per-session billing at $5 and a three-ground
 * free tier - a model that was dropped. canStartSession below has been the
 * truth for a while (free grounds "are never metered or paywalled"), but the
 * old description survived up here, and the UI kept quoting the old price at
 * people. If you are changing this, change the comment WITH the code: the
 * stale version was read as fact by the next person through, which is how a
 * new user came to be told "additional sessions are $5 each" for a ground that
 * costs nothing.
 *
 * purchaseSession() and the $5 line item are retained but unreferenced by any
 * user-facing surface. They remain only because live Stripe records and
 * webhooks may still point at them; do not treat their presence as evidence
 * that sessions are sold.
 */
@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private prisma: PrismaService,
    private stripe: StripeService,
    private pricing: PricingService,
    private config: ConfigService,
    private email: EmailService,
    private usage: UsageService,
    /* WhatsApp, the paid add-on (decision 78): its Stripe line follows the plan. Optional so a test
       that builds billing by hand without it still runs; Nest always provides it. */
    @Optional() private whatsappAddOn?: WhatsAppAddOnService,
  ) {}

  /**
   * WHETHER THE FREE PLAN APPLIES TO THIS ORGANISATION. Always yes while the free trial's switch is
   * off, so nothing about today's billing changes; once it is on, only for an organisation that was
   * already here (see `freePlanApplies`). Read defensively: a pricing read that fails means "yes",
   * never a team cut off.
   */
  private async theFreePlanAppliesTo(org: { createdAt?: Date | null } | null | undefined): Promise<boolean> {
    const trial = typeof (this.pricing as any)?.getFreeTrial === 'function'
      ? await this.pricing.getFreeTrial().catch(() => null)
      : null;
    return freePlanApplies(trial, org?.createdAt ?? null);
  }

  /** The seat limit of somebody with no cover: the free plan's, or only the person who created it. */
  private async theUncoveredSeatLimit(org: { createdAt?: Date | null } | null | undefined): Promise<number> {
    return (await this.theFreePlanAppliesTo(org)) ? this.pricing.getFreeMemberLimit() : 1;
  }

  /**
   * Session balance gate. Returns allowed: true when the ground has at least one
   * session remaining, or the org has an active subscription (unlimited sessions).
   */
  async canStartSession(groundId: string): Promise<{ allowed: boolean; reason?: string; sessionsBalance: number; freeExtensionAvailable?: boolean }> {
    const ground = await this.prisma.ground.findUnique({
      where: { id: groundId },
      select: { sessionsBalance: true, isFreeGround: true, organizationId: true },
    });

    // Free-tier grounds (the 10 free Grounds per org) have UNLIMITED sessions -
    // this is the advertised model ("unlimited sessions and reports on every
    // Ground"). They are never metered or paywalled; -1 signals unlimited to the
    // caller so it skips the decrement/metering block entirely. The 10-ground cap
    // (canCreateGround) is the only free-tier limit.
    if (ground?.isFreeGround) {
      return { allowed: true, sessionsBalance: -1 };
    }

    // Active subscription = unlimited sessions, no balance check needed.
    if (ground?.organizationId) {
      const org = await this.prisma.organization.findUnique({
        where: { id: ground.organizationId },
        select: {
          subscriptionPlan: true, subscriptionStatus: true, freeSessionsUsed: true, freeExtensionUsed: true,
          /* A free run covers exactly what the plan it was given covers - see whatCoversThem. */
          freeUntil: true, freePlan: true,
          createdAt: true,
        },
      });
      if (org && isCovered(org)) {
        return { allowed: true, sessionsBalance: -1 }; // -1 signals unlimited
      }

      const balance = ground?.sessionsBalance ?? 0;
      if (balance > 0) return { allowed: true, sessionsBalance: balance };

      /* Once the free plan has stopped for this organisation, there is nothing free left to offer. */
      if (org && !(await this.theFreePlanAppliesTo(org))) {
        return { allowed: false, reason: PAUSED_UNTIL_THEY_SUBSCRIBE, sessionsBalance: 0, freeExtensionAvailable: false };
      }

      return {
        allowed: false,
        // Sessions are not sold, so "add a session for $5" was a dead end
        // pointing at a button that no longer exists. Say what is true, and say
        // the reassuring half out loud: the person who hits this wall is
        // usually a participant who never chose to pay and never chose to
        // cancel, and their record is safe.
        reason: 'This check-in is beyond your ten free ones. Resubscribe to continue checking in - the report and board stay available either way.',
        sessionsBalance: 0,
        freeExtensionAvailable: !(org?.freeExtensionUsed ?? false),
      };
    }

    const balance = ground?.sessionsBalance ?? 0;
    if (balance > 0) return { allowed: true, sessionsBalance: balance };
    return { allowed: false, reason: 'This check-in is beyond your ten free ones. Resubscribe to continue checking in - the report and board stay available either way.', sessionsBalance: 0 };
  }

  /** Free ground limit for organizations without a subscription. */
  static readonly FREE_GROUND_LIMIT = DEFAULT_FREE_GROUND_LIMIT;

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
  ): Promise<{ allowed: boolean; reason?: string; freeReason?: 'FREE_TIER' | 'ACCESS_CODE'; codeId?: string; groundsUsed?: number; noPlan?: true; sessionsToStart?: number }> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { subscriptionPlan: true, subscriptionStatus: true, careFeeStatus: true, freeUntil: true, freePlan: true, createdAt: true },
    });
    if (!org) return { allowed: false, reason: 'Organization not found' };

    /*
     * THE FREE FIRST SESSION GOES WITH THE FREE PLAN. A check-in opened under cover starts with one
     * session in hand, which is the session it may still run after the cover ends. Once the free
     * trial's switch is on, an organisation the free plan no longer applies to starts with none.
     */
    const freePlan = await this.theFreePlanAppliesTo(org);
    const noFreeSession = freePlan ? {} : { sessionsToStart: 0 };

    // 1. Paying, or inside a free run we gave them: unlimited grounds either way.
    if (isCovered(org)) {
      return { allowed: true, ...noFreeSession };
    }

    // 1b. Org is on legacy active care fee plan. Deliberately does NOT return
    // here: returning early meant a care-fee org's FIRST ground came back
    // allowed-but-not-free, so it was metered on sessions while a brand new org
    // doing the same thing got a free ground. Paying a care fee should never
    // buy you less than paying nothing, so fall through to the free-tier check
    // and only treat the care fee as the reason if the free tier is used up.
    const careFeeCovers = org.careFeeStatus === CareFeeStatus.ACTIVE;

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

    // 3a. No free plan for this organisation (the free trial's switch is on, and it is new): pay first.
    if (!freePlan) {
      if (careFeeCovers) return { allowed: true, ...noFreeSession };
      return { allowed: false, reason: NO_PLAN_TO_OPEN, noPlan: true };
    }

    // 3. Free tier: up to the limit a platform admin has set, defaulting to what we shipped.
    /*
     * AN ALLOWANCE, NOT A LIFETIME TALLY. This counted every check-in the organisation had ever made,
     * so an organisation that opened forty while subscribed and then cancelled had used "all ten of
     * its free check-ins" without ever having had one. The pricing page - frozen - says "up to 10
     * check-ins for free", and a check-in opened on a subscription was not a free one: it is stamped
     * isFreeGround=false at creation for exactly this reason. So the count is of free check-ins.
     */
    const freeGroundLimit = await this.pricing.getFreeGroundLimit();
    const groundCount = await this.prisma.ground.count({ where: { organizationId, isFreeGround: true } });
    if (groundCount < freeGroundLimit) {
      return { allowed: true, freeReason: 'FREE_TIER', groundsUsed: groundCount };
    }

    // 4. Free limit used up. A care-fee org may still create, just not free.
    if (careFeeCovers) return { allowed: true };

    // 5. Free limit reached, no active subscription and no care fee.
    return {
      allowed: false,
      /*
       * "Grounds" IS OUR WORD FOR IT, NOT THEIRS.
       *
       * This sentence is rendered verbatim by the client, under a heading that reads "You have used
       * all 10 of your free check-ins". One screen, two names for one object, at the exact moment
       * somebody is being asked for money. The schema calls it a Ground; nothing a person reads
       * should.
       */
      reason: `Your free plan includes ${freeGroundLimit} check-ins. Subscribe to open more.`,
      groundsUsed: groundCount,
    };
  }


  /**
   * The seat caps used to be a hardcoded map here, with a second copy on the client and a third
   * inside the plan labels. They now live in `pricing_plans.memberCap`, beside the prices, and
   * are read through `pricing.memberCapFor`. Nothing in this file states a cap.
   */

  /**
   * The two messages a billing change owes somebody, wired where the change happens.
   *
   * Both existed as tested methods on the email service with no caller at all, which
   * meant every billing transition in this product was silent: a code redeemed and
   * nothing said it worked, a subscription cancelled and nothing said what stays
   * available. Found by the dead-method rule rather than by anybody noticing, which
   * is its own comment on how visible the gap was.
   */
  private async confirmTheCareFee(organizationId: string): Promise<void> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { name: true, users: { where: { role: UserRole.ADMIN, deletedAt: null }, select: { email: true, firstName: true } } },
    });
    if (!org) return;
    for (const u of org.users) {
      await this.email.sendCareFeeConfirmation(u.email, u.firstName ?? 'there', org.name).catch(() => undefined);
    }
  }

  private async tellThemBillingChanged(organizationId: string, what: string): Promise<void> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { users: { where: { role: UserRole.ADMIN, deletedAt: null }, select: { email: true, firstName: true } } },
    });
    if (!org) return;
    for (const u of org.users) {
      await this.email.sendBillingChangeNotification(u.email, u.firstName ?? 'there', what).catch(() => undefined);
    }
  }

  /** Returns allowed: false if the org is at its plan member cap. */
  /**
   * HOW MANY MORE PEOPLE THIS ORGANISATION MAY ADD. Null when there is no cap.
   *
   * `canInviteMember` answers "may I add one more" and that is the wrong question for somebody
   * pasting a list: they need to know before they send, not one refusal at a time. Same two
   * sources, same order, so the number shown on the paste screen and the number that refuses an
   * invitation cannot disagree - which is the failure this whole path exists to avoid.
   */
  /**
   * HOW MANY SEATS ARE TAKEN, counted one way for the gate, the billing page and the People page:
   * see `seatsIn` in common/seats.ts. Guests do not hold a seat.
   */
  async seatsTaken(organizationId: string): Promise<number> {
    return this.prisma.user.count({ where: seatsIn(organizationId) });
  }

  async seatsLeft(organizationId: string): Promise<number | null> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        subscriptionPlan: true, subscriptionStatus: true, freeUntil: true, freePlan: true, createdAt: true,
      },
    });
    if (!org) return null;
    /* Whichever covers them today decides the cap: their own plan, the one we gave them, or free. */
    const covered = whatCoversThem(org);
    const cap = covered.plan
      ? await this.pricing.memberCapFor(covered.plan as any)
      : await this.theUncoveredSeatLimit(org);
    if (cap === null || cap === undefined) return null;
    /* Never negative: an organisation already over its cap has no room, not room owed back. */
    return Math.max(0, cap - (await this.seatsTaken(organizationId)));
  }

  /**
   * WHAT THE PLAN COVERS, as a number, for anything that has to SAY it rather than just obey it.
   *
   * `seatsLeft` answers "is there room" and is the right read for a gate. Telling somebody their
   * plan covers five people needs the five, and working it back out from what is left plus what is
   * taken is the kind of arithmetic that drifts. Same two sources, same order, one answer.
   */
  async seatsIncludedFor(organizationId: string): Promise<number | null> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { subscriptionPlan: true, subscriptionStatus: true, freeUntil: true, freePlan: true, createdAt: true },
    });
    if (!org) return null;
    const covered = whatCoversThem(org);
    const cap = covered.plan
      ? await this.pricing.memberCapFor(covered.plan as any)
      : await this.theUncoveredSeatLimit(org);
    return cap ?? null;
  }

  async canInviteMember(organizationId: string): Promise<{ allowed: boolean; reason?: string }> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        subscriptionPlan: true, subscriptionStatus: true, freeUntil: true, freePlan: true, createdAt: true,
      },
    });
    if (!org) return { allowed: true };
    const count = await this.seatsTaken(organizationId);
    /* Covered is covered: a free run we gave them buys the seats its plan buys. */
    const covered = whatCoversThem(org);
    const subscribed = covered.covers !== 'free tier';

    /**
     * THE FREE TIER HAS A SEAT LIMIT NOW, ENFORCED HERE RATHER THAN IN A SECOND GATE.
     *
     * This method returned `{ allowed: true }` on its first line for any organisation without an
     * active subscription, so free accounts were exempt from seat caps entirely and person number
     * six was simply added. The free limit lives with the free ground limit, is read the same way,
     * and refuses in the same shape - server side, with a reason, touching nothing that exists.
     *
     * Nobody already on the account is affected: this is only ever asked when somebody new is
     * being invited, so an organisation over the limit keeps every member it has and is only
     * stopped from adding more.
     */
    if (!subscribed) {
      /* The same limit the billing page reports: the free plan's, or, once the free plan has stopped
         for this organisation, nobody but the person who created it until it pays. */
      const freeLimit = await this.theUncoveredSeatLimit(org);
      if (count >= freeLimit) {
        const free = await this.theFreePlanAppliesTo(org);
        return { allowed: false, reason: free ? freeSeatLimitMessage(freeLimit) : NO_PLAN_TO_ADD };
      }
      return { allowed: true };
    }

    const cap = await this.pricing.memberCapFor(org.subscriptionPlan!);
    if (cap === null) return { allowed: true };
    if (count >= cap) {
      /**
       * THE WARNING FIRES WHERE THE CAP IS ACTUALLY HIT, not on a schedule.
       *
       * sendMemberCapWarning existed and nothing called it, so an organisation at
       * its member cap was refused an invitation on screen and told nothing
       * afterwards - the person who tried is often not the person who can upgrade.
       *
       * This is a read-path check called on every invite, so the email is fired
       * only ON the refusal, which is already the exceptional case, and only to
       * admins. Somebody hammering the invite button twice gets two emails; that is
       * better than the silence it replaces, and a one-shot marker would need a
       * schema field for a message nobody has ever received.
       */
      this.warnAboutTheMemberCap(organizationId, org.subscriptionPlan!, count, cap).catch(() => undefined);
      return { allowed: false, reason: paidSeatLimitMessage(PLAN_LABELS[org.subscriptionPlan!], cap) };
    }
    return { allowed: true };
  }

  /** Tells the people who can actually upgrade. Best-effort, never blocking. */
  private async warnAboutTheMemberCap(
    organizationId: string,
    plan: SubscriptionPlan,
    count: number,
    cap: number,
  ): Promise<void> {
    const admins = await this.prisma.user.findMany({
      where: { organizationId, role: UserRole.ADMIN, deletedAt: null },
      select: { email: true },
    });
    for (const a of admins) {
      await this.email.sendMemberCapWarning(a.email, plan, count, cap).catch(() => undefined);
    }
  }

  /** Grants one free session extension to a ground if the org has not used it yet. Idempotent. */
  async claimFreeExtension(organizationId: string, groundId: string): Promise<void> {
    /* The ground id came straight off the body and went straight into the update, so an organisation's
       one free extension could be spent onto any ground in the database. Resolved inside the caller's
       organisation first, exactly as purchaseSession does two methods up. */
    const ground = await this.prisma.ground.findFirst({ where: { id: groundId, organizationId }, select: { id: true, isFreeGround: true } });
    if (!ground) throw new NotFoundException('Check-in not found');
    /* A free check-in has unlimited sessions - the same guard purchaseSession carries. Without it the
       organisation's one extension was spent on a check-in that never needed it, the person was told
       "Free session added", and the flag never resets. */
    if (ground.isFreeGround) throw new ForbiddenException('This check-in has unlimited free sessions - nothing to extend.');
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { freeExtensionUsed: true, createdAt: true },
    });
    if (!org) throw new NotFoundException('Organization not found');
    /* The free extension is part of the free plan: none for an organisation it no longer applies to. */
    if (!(await this.theFreePlanAppliesTo(org))) throw new ForbiddenException(NO_PLAN_TO_OPEN);
    if (org.freeExtensionUsed) throw new ForbiddenException('Your organisation has already used its one free extension. This does not reset; subscribing is the way to keep going.');

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

    /**
     * SIX NOTIFICATION EMAILS EXISTED, WERE TESTED, AND NOTHING EVER SENT THEM.
     * Found by the dead-method rule; this is the first of them wired.
     *
     * No guard needed here: freeExtensionUsed flips inside the same transaction and
     * a second claim throws above, so this path runs exactly once per organisation.
     */
    try {
      const [ground, admins] = await Promise.all([
        this.prisma.ground.findUnique({ where: { id: groundId }, select: { label: true } }),
        this.prisma.user.findMany({
          where: { organizationId, role: UserRole.ADMIN, deletedAt: null },
          select: { email: true },
        }),
      ]);
      const url = `${this.config.get<string>('resend.frontendUrl') ?? ''}/grounds/${groundId}`;
      for (const a of admins) {
        await this.email.sendFreeExtensionClaimed(a.email, ground?.label ?? 'your ground', url);
      }
    } catch (err) {
      // A notification must never undo a granted extension.
      this.logger.warn(`Free extension granted but the email did not send: ${(err as Error)?.message}`);
    }
  }

  /**
   * ONE WAY TO GIVE A SESSION BACK. There was no refund, reversal or credit anywhere in this file,
   * which made every consumption defect permanent from the customer's side: "I was charged and got
   * nothing" had no answer a support person could give. This is that answer. Platform admin only -
   * an organisation's own admin crediting their own check-in would be the free-extension hole with
   * no cap - and every credit is a ledger row with the reason in it.
   */
  async creditSession(groundId: string, reason: string, byUserId: string): Promise<{ groundId: string; sessionsBalance: number }> {
    if (!reason?.trim()) throw new BadRequestException('Say why the session is being credited; it goes on the ledger.');
    const ground = await this.prisma.ground.findUnique({ where: { id: groundId }, select: { id: true, organizationId: true } });
    if (!ground) throw new NotFoundException('Check-in not found');
    const now = new Date();
    const [credited] = await this.prisma.$transaction([
      this.prisma.ground.update({ where: { id: groundId }, data: { sessionsBalance: { increment: 1 } }, select: { sessionsBalance: true } }),
      this.prisma.billingEvent.create({
        data: {
          organizationId: ground.organizationId,
          groundId,
          type: BillingEventType.CREDIT,
          amountCents: 0,
          currency: 'USD',
          status: BillingEventStatus.PAID,
          periodStart: now,
          periodEnd: now,
          /* The column is unique; a credit has no Stripe invoice, so the row carries who and when instead. */
          stripeInvoiceId: `credit_${groundId}_${now.getTime()}_${byUserId.slice(0, 8)}`,
        },
      }),
    ]);
    this.logger.warn(`Session credited to ground ${groundId} by ${byUserId}: ${reason.trim()}`);
    return { groundId, sessionsBalance: credited.sessionsBalance };
  }

  /**
   * WRITE A CHARGE ONCE, AND LET THE DATABASE DECIDE THAT.
   *
   * Stripe retries webhooks by design and can deliver one event more than once, concurrently. The old
   * dedupe read `billingEvent.findFirst({ stripeInvoiceId })` and skipped if found - a check-then-act
   * race - and nothing stood behind it, because the column had no unique constraint. So the loser of
   * that race was not rejected, it was recorded: the balance credited twice and the charge logged
   * twice for one payment.
   *
   * `stripe_invoice_id` is now uniquely indexed, so the SECOND insert fails and that failure IS the
   * idempotency signal. P2002 is Prisma's unique-violation code. Anything else is rethrown rather
   * than swallowed, because a silently dropped charge record is the fault this change exists to fix.
   */
  private async recordInvoiceOnce(data: {
    organizationId: string;
    type: BillingEventType;
    amountCents: number;
    currency: string;
    stripeInvoiceId: string | null;
    periodStart: Date;
    periodEnd: Date;
    groundId?: string | null;
  }): Promise<'written' | 'duplicate'> {
    try {
      await this.prisma.billingEvent.create({ data: { ...data, status: BillingEventStatus.PAID } });
      return 'written';
    } catch (err: any) {
      if (err?.code === 'P2002') {
        this.logger.log(`Duplicate delivery for invoice ${data.stripeInvoiceId} - already recorded, nothing written`);
        return 'duplicate';
      }
      throw err;
    }
  }

  /** Create a Stripe recurring checkout session for an org subscription plan. */
  async createSubscription(organizationId: string, plan: SubscriptionPlan): Promise<{ checkoutUrl: string }> {
    if (plan === SubscriptionPlan.ENTERPRISE) {
      throw new ForbiddenException('Enterprise plans require contacting the support team.');
    }
    const org = await this.prisma.organization.findUnique({ where: { id: organizationId } });
    if (!org) throw new NotFoundException('Organization not found');

    if (isSubscribed(org)) {
      throw new ForbiddenException('Organization already has an active subscription - use the plan-change endpoint to switch plans.');
    }

    const customerId = await this.stripe.ensureCustomer(org.id, org.email ?? undefined, org.stripeCustomerId);
    if (customerId !== org.stripeCustomerId) {
      await this.prisma.organization.update({ where: { id: org.id }, data: { stripeCustomerId: customerId } });
    }

    // Price lives in the pricing_plans table (Admin -> System -> Pricing), not
    // in code: this looks up (or lazily creates) the matching Stripe Price
    // rather than building one ad hoc on every checkout.
    const priceId = await this.pricing.getOrCreateStripePrice(plan);
    const base = this.config.get<string>('stripe.callbackUrl') || 'http://localhost:5173/billing/callback';
    const session = await this.stripe.stripe.checkout.sessions.create(
      {
      customer: customerId,
      mode: 'subscription',
      /*
       * QUANTITY 1, ON PURPOSE. Plans are flat-rate per tier; the member cap on the billing page is
       * an in-app limit on how many people an organisation may add, not a seat count Stripe is
       * charged for, and it is deliberately not transmitted. Platform admins occupy a seat like
       * anybody else (SEAT_WHERE has no isPlatformAdmin exclusion). Recorded here because the
       * billing page's number reads as "what we are charged" to anyone who does not know this;
       * confirmed as the intended model in the fix plan (B12, P3-022) pending the owner's word.
       */
      line_items: [{ price: priceId, quantity: 1 }],
      // subscription_data.metadata (not just the session-level metadata below)
      // so the resulting Subscription object itself carries organizationId/plan -
      // customer.subscription.updated/deleted webhooks fire on the subscription,
      // not the checkout session, and read metadata off sub, not session.
      subscription_data: { metadata: { organizationId, plan } },
      metadata: { organizationId, plan, type: 'subscription' },
      success_url: `${base}?status=success&type=subscription&plan=${plan}`,
      cancel_url: `${base}?status=cancelled`,
      },
      /* Two tabs, one payment. Stripe replays the same session for the same key within a day, so a
         second press cannot create a second subscription that overwrites the first and orphans it. */
      { idempotencyKey: `sub_${organizationId}_${plan}` },
    );

    return { checkoutUrl: session.url! };
  }

  /**
   * Change an already-subscribed org to a different plan. Stripe prorates the
   * difference automatically (create_prorations) - the customer is charged or
   * credited for the remainder of the current period rather than paying twice
   * or waiting for the next cycle to see the new plan.
   */
  async changeSubscriptionPlan(organizationId: string, newPlan: SubscriptionPlan): Promise<{ plan: SubscriptionPlan; periodEnd: Date | null }> {
    if (newPlan === SubscriptionPlan.ENTERPRISE) {
      throw new ForbiddenException('Enterprise plans require contacting the support team.');
    }
    const org = await this.prisma.organization.findUnique({ where: { id: organizationId } });
    if (!org) throw new NotFoundException('Organization not found');
    if (!org.subscriptionStripeId || org.subscriptionStatus !== ACTIVE) {
      throw new ForbiddenException('No active subscription to change - subscribe first.');
    }
    if (org.subscriptionPlan === newPlan) {
      throw new ForbiddenException(`Already on the ${newPlan} plan.`);
    }

    const newPriceId = await this.pricing.getOrCreateStripePrice(newPlan);
    const sub = await this.stripe.stripe.subscriptions.retrieve(org.subscriptionStripeId);
    /* The plan's own line, never the WhatsApp add-on's, which is a second line on the same subscription. */
    const itemId = sub.items.data.find(
      (i: any) => i.id !== org.whatsappAddOnItemId && i.price?.metadata?.kind !== WHATSAPP_ADD_ON_KIND,
    )?.id;
    if (!itemId) throw new NotFoundException('Subscription has no billable item.');

    const updated = await this.stripe.stripe.subscriptions.update(org.subscriptionStripeId, {
      items: [{ id: itemId, price: newPriceId }],
      proration_behavior: 'create_prorations',
      metadata: { organizationId, plan: newPlan },
    });

    const periodEnd = updated.current_period_end ? new Date(updated.current_period_end * 1000) : null;
    await this.prisma.organization.update({
      where: { id: organizationId },
      data: { subscriptionPlan: newPlan, subscriptionPeriodEnd: periodEnd },
    });

    /* The WhatsApp add-on's line moves to the new plan's add-on price. */
    await this.whatsappAddOn?.syncTheStripeLine(organizationId).catch((err: any) => this.logger.error(`WhatsApp add-on line for ${organizationId} did not follow the plan change: ${err?.message}`));
    await this.tellThemBillingChanged(organizationId, `Your plan changed to ${PLAN_LABELS[newPlan]}.`).catch(() => undefined);
    this.logger.log(`Org ${organizationId} subscription changed to plan ${newPlan}`);
    return { plan: newPlan, periodEnd };
  }

  /**
   * CANCELLING RUNS TO THE END OF WHAT WAS PAID FOR.
   *
   * This called `subscriptions.cancel()`, which ends the subscription at that moment with no
   * proration, then nulled the plan, the status, the Stripe id and the period end. A customer who
   * cancelled on the second day of a paid month lost the twenty-eight days they had already paid
   * for; nothing refunded them and nothing told them. With payment live, that is money taken and not
   * returned. Decided by the product owner: cancelling means the subscription ends at the end of the
   * paid period, and somebody who wants to stop paying sooner pauses instead (which is built, below).
   *
   * So this schedules the cancellation with Stripe and writes WHEN access stops. Everything else is
   * left as it is: the plan, the Stripe id, the period end, and the status - which stays `active`,
   * because `isSubscribed` reads `active` alone and fails toward the free tier on anything else. A
   * fifth status ("cancelling") would have unsubscribed the customer the moment they asked to leave
   * later. The webhook that already handles the subscription's deletion writes `cancelled` on the
   * day, so the local record follows Stripe rather than predicting it.
   */
  async cancelSubscription(organizationId: string): Promise<{ endsAt: Date | null }> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { subscriptionStripeId: true, subscriptionPeriodEnd: true },
    });
    if (!org?.subscriptionStripeId) throw new NotFoundException('No active subscription found.');

    const scheduled = await this.stripe.cancelSubscriptionAtPeriodEnd(org.subscriptionStripeId);
    const endsAt = scheduled.current_period_end ? new Date(scheduled.current_period_end * 1000) : org.subscriptionPeriodEnd ?? null;
    await this.prisma.organization.update({ where: { id: organizationId }, data: { subscriptionEndsAt: endsAt } });
    this.logger.log(`Subscription for org ${organizationId} ends at ${endsAt?.toISOString() ?? 'the period end'}`);
    return { endsAt };
  }

  /**
   * A scheduled cancellation is undone before the date. Stripe supports it and the subscription is
   * still there; the screen that says "ending on the 30th" offers this beside it.
   */
  async keepSubscription(organizationId: string): Promise<void> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { subscriptionStripeId: true, subscriptionEndsAt: true },
    });
    if (!org?.subscriptionStripeId) throw new NotFoundException('No active subscription found.');
    if (!org.subscriptionEndsAt) throw new BadRequestException('This subscription is not ending. There is nothing to keep.');

    await this.stripe.stripe.subscriptions.update(org.subscriptionStripeId, { cancel_at_period_end: false });
    await this.prisma.organization.update({ where: { id: organizationId }, data: { subscriptionEndsAt: null } });
    this.logger.log(`Subscription for org ${organizationId} kept; the scheduled cancellation is undone`);
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
    await this.prisma.organization.update({ where: { id: organizationId }, data: { subscriptionStatus: 'paused' satisfies SubscriptionStatus } });
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
    await this.prisma.organization.update({ where: { id: organizationId }, data: { subscriptionStatus: 'active' satisfies SubscriptionStatus } });
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
      if (!ground) return { ok: false, message: 'That check-in is not in your organisation.' };
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
  async getStatus(organizationId: string, includeUsage = true): Promise<{
    /**
     * THE SUBSCRIPTION BELONGS TO THE ORGANISATION, AND THIS ENDPOINT DID NOT SAY SO. W14-6.
     *
     * It returned active grounds and a card, so `BillingPage` had nowhere to read the plan from
     * and took it off `grounds[0].org` - the first ground in the list. An organisation that has
     * closed its grounds therefore had NO first ground, so a paying customer saw "Free · No
     * subscription" and lost Pause, Resume and Cancel entirely. They could not manage the thing
     * they were being charged for.
     *
     * The seat count is here for the same reason: every plan is priced by people ("Up to 20
     * people") and nothing in the product said how many the organisation had, so the number that
     * decides an upgrade was the one number nobody could see. W14-7.
     */
    subscription: {
      plan: SubscriptionPlan | null;
      status: string | null;
      periodEnd: Date | null;
      endsAt: Date | null;
      freeExtensionUsed: boolean;
    };
    people: { count: number; cap: number | null };
    /**
     * True when nothing covers the organisation and the free plan applies to it. False when it has no
     * plan and the free plan has stopped for it (the free trial's switch is on and it is new).
     */
    onTheFreePlan: boolean;
    /**
     * Set while an organisation is inside a free run we gave them, so the page can say it plainly:
     * what it covers and the day it ends. Null when they are paying or on the free tier.
     */
    onTheHouse: { plan: SubscriptionPlan; until: Date; freeTrial: boolean } | null;
    /** Counts only. See the comment where these are assembled. */
    /** Admin only. Absent for anybody else - see the controller. */
    usage?: { checkIns: number; reportsReleased: number; peopleTakingPart: number };
    activeGrounds: Array<{ groundId: string; label: string; startedAt: Date | null; sessionsBalance: number }>;
    card?: { brand: string; last4: string } | null;
    /** Admin only: the subscription payments recorded from Stripe, newest first, for "Invoices". */
    invoices?: Array<{ paidOn: Date; amountCents: number; currency: string }>;
    /**
     * Admin only: what was said about the team's size when the organisation was made (settings-billing.txt, "Baridi
     * started with 27, so it began on a plan"). Only the answer is kept, never a count, so the sentence says the answer.
     * Null when nobody was asked.
     */
    startedWith?: { said: 'fewer' | 'more'; line: number; says: string } | null;
  }> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        stripeCustomerId: true,
        defaultPaymentMethodId: true,
        subscriptionPlan: true,
        subscriptionStatus: true,
        subscriptionPeriodEnd: true,
        subscriptionEndsAt: true,
        freeExtensionUsed: true,
        freeUntil: true,
        freePlan: true,
        freeTrialStartedAt: true,
        createdAt: true,
        name: true,
        teamSizeSaid: true,
        teamSizeLine: true,
      },
    });
    if (!org) throw new NotFoundException('Organization not found');

    const peopleCount = await this.seatsTaken(organizationId);
    /**
     * THE SAME CAP THE GATE WILL APPLY. Read from the same two sources in the same order, so the
     * number on this page and the number that refuses an invitation cannot be different numbers.
     */
    const covers = whatCoversThem(org);
    const onTheFreePlan = !covers.plan && (await this.theFreePlanAppliesTo(org));
    const peopleCap =
      covers.plan
        ? await this.pricing.memberCapFor(covers.plan as any)
        : await this.theUncoveredSeatLimit(org);

    /* Three counts, in parallel with each other and cheap - all indexed by organisation. */
    const [everyGround, reportsOut, tookPart] = await Promise.all([
      this.prisma.ground.count({ where: { organizationId } }),
      this.prisma.report.count({ where: { ground: { organizationId }, releasedAt: { not: null } } }),
      this.prisma.groundParticipant.findMany({
        where: { ground: { organizationId }, checkIns: { some: { status: 'COMPLETED' } } },
        select: { userId: true },
        distinct: ['userId'],
      }),
    ]);
    const usage = {
      checkIns: everyGround,
      reports: reportsOut,
      /* Distinct people, so somebody in four check-ins counts once. */
      participating: new Set(tookPart.map((t) => t.userId).filter(Boolean)).size,
    };

    const activeGrounds = await this.prisma.ground.findMany({
      where: { organizationId, status: GroundStatus.ACTIVE },
      select: { id: true, label: true, billingActivatedAt: true, sessionsBalance: true },
    });

    /*
     * INVOICES (U.19), from what the webhook already records once per paid Stripe invoice. Read only
     * for an admin. Optional-chained like the other models a test double may not carry.
     */
    const invoices = includeUsage
      ? await (this.prisma.billingEvent?.findMany?.({
        where: { organizationId, type: BillingEventType.SUBSCRIPTION_FEE, status: BillingEventStatus.PAID },
        orderBy: { periodStart: 'desc' },
        take: 12,
        select: { periodStart: true, amountCents: true, currency: true },
      }) ?? Promise.resolve([])).catch(() => [])
      : [];

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
      subscription: {
        plan: org.subscriptionPlan ?? null,
        status: org.subscriptionStatus ?? null,
        periodEnd: org.subscriptionPeriodEnd ?? null,
        /* Non-null means a cancellation is scheduled: access runs to this date and then stops. */
        endsAt: org.subscriptionEndsAt ?? null,
        freeExtensionUsed: org.freeExtensionUsed,
      },
      // `null` cap means unlimited (Enterprise) or no plan at all - the client renders the
      // count without a ceiling rather than inventing one.
      /**
       * `null` means unlimited - the client renders the count without a ceiling rather than
       * inventing one. A free organisation reports its free seat limit, because that IS its cap
       * and showing no ceiling to the only people who have one is how person six got added.
       */
      people: { count: peopleCount, cap: peopleCap },
      onTheFreePlan,
      /* Said plainly, with the day it ends, because a free run nobody can see ends as a surprise. */
      onTheHouse: covers.covers === 'on the house' && covers.until && org.freePlan
        /* `freeTrial` says these are the free trial's months (U.19), not a free run we gave by hand. */
        ? { plan: org.freePlan, until: covers.until, freeTrial: !!org.freeTrialStartedAt }
        : null,
      /*
       * WHAT THIS ACCOUNT HAS ACTUALLY DONE, which is what makes a renewal defensible.
       *
       * An admin asked to pay for 160 seats needs to be able to say what was got for it, and the
       * page could only say what the plan costs. Counts only - no names, no labels - because this
       * is an argument about volume, and anything more is a second copy of pages that already
       * exist and are governed properly.
       *
       * Check-ins EVER rather than this month: these run for a quarter at a time, so a calendar
       * month is a window that would report zero for a healthy account most of the time.
       */
      /* Omitted rather than zeroed for a non-admin: a zero is a claim, and this is a refusal. */
      usage: includeUsage ? {
        checkIns: usage.checkIns,
        /* Rounds where everybody finished and a report went out. The thing they are buying. */
        reportsReleased: usage.reports,
        /* People who have actually taken part, as against people who have an account. */
        peopleTakingPart: usage.participating,
      } : undefined,
      activeGrounds: activeGrounds.map((g) => ({
        groundId: g.id,
        label: g.label,
        startedAt: g.billingActivatedAt,
        sessionsBalance: g.sessionsBalance,
      })),
      card,
      invoices: includeUsage
        ? (invoices ?? []).map((i: any) => ({ paidOn: i.periodStart, amountCents: i.amountCents, currency: i.currency }))
        : undefined,
      startedWith: includeUsage ? theSizeItStartedWith(org as any) : undefined,
    };
  }

  /**
   * "REMIND THEM" (upgrade.txt): somebody whose check-in is paused until the team subscribes asks Groundwork to remind
   * the organisation's admins. At most once a day for each person, counted by the UTC day, and only while that check-in
   * is really paused. The admins get the same email the refusal itself sends them (sendPaymentRequestEmail). Never says
   * it reminded anybody it did not.
   */
  async remindTheAdmins(organizationId: string, userId: string, groundId: string, now: Date = new Date()): Promise<{ reminded: boolean; says: string }> {
    const ground = await this.prisma.ground.findUnique({ where: { id: groundId }, select: { organizationId: true, organization: { select: { name: true } } } });
    if (!ground || ground.organizationId !== organizationId) throw new NotFoundException('That check-in is not in your organisation.');
    const gate = await this.canStartSession(groundId);
    if (gate.allowed) return { reminded: false, says: NOTHING_IS_PAUSED };
    const admins = await this.prisma.user.findMany({ where: { organizationId, role: UserRole.ADMIN, deletedAt: null }, select: { email: true } });
    if (!admins.length) return { reminded: false, says: NO_ADMIN_TO_REMIND };
    if (!(await claimTheSlot(this.prisma, `remind-the-admins.${userId}`, theDay(now)))) return { reminded: false, says: REMINDED_TODAY_ALREADY };
    for (const a of admins) {
      await this.email.sendPaymentRequestEmail(a.email, ground.organization?.name ?? 'your organisation', groundId).catch(() => undefined);
    }
    return { reminded: true, says: THE_ADMINS_ARE_REMINDED };
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
    // sendBillingChangeNotification existed and nothing called it. A cancellation is
    // the change people most need in writing, and it was the one change that arrived
    // as silence.
    await this.tellThemBillingChanged(organizationId, 'Your subscription has been cancelled. Your reports and boards stay available; new check-ins are paused.')
      .catch(() => undefined);

    /* /settings is where "what we hold about you" and its download live. /users/me/export was the API
       path, which the client has no route for, so the widest broadcast in the product opened the
       not-found page. */
    const downloadUrl = `${this.config.get<string>('resend.frontendUrl') ?? ''}/settings`;
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
  /**
   * AN EVENT WE COULD NOT HANDLE IS KEPT, NOT LOST.
   *
   * Called by the webhook when handleStripeEvent throws. The event and the error are written down,
   * Stripe is answered 200 so it stops retrying a deterministic failure for ever, and the retry below
   * works from this record. An event already kept just counts another attempt.
   */
  async recordStripeEventFailure(event: Stripe.Event, err: unknown): Promise<void> {
    const error = String((err as any)?.message ?? err).slice(0, 2000);
    this.logger.error(`Stripe event ${event.id} (${event.type}) could not be handled and is kept for retry: ${error}`);
    await this.prisma.stripeEventFailure.upsert({
      where: { eventId: event.id },
      create: { eventId: event.id, eventType: event.type, error, payload: event as any },
      update: { error, attempts: { increment: 1 }, lastTriedAt: new Date() },
    });
  }

  /** The kept failures a platform admin can see. Unresolved first, newest first. */
  async stripeEventFailures() {
    return this.prisma.stripeEventFailure.findMany({
      where: { resolvedAt: null },
      orderBy: { lastTriedAt: 'desc' },
      take: 100,
      select: { id: true, eventId: true, eventType: true, error: true, attempts: true, lastTriedAt: true, createdAt: true },
    });
  }

  /** Six tries over six hours, then it stays on the list for a person. */
  static readonly STRIPE_RETRY_ATTEMPTS = 6;

  @Cron('15 * * * *', { timeZone: 'UTC' })
  async retryStripeEventsWeCouldNotHandle(): Promise<void> {
    const due = await this.prisma.stripeEventFailure.findMany({
      where: { resolvedAt: null, attempts: { lt: BillingService.STRIPE_RETRY_ATTEMPTS } },
      orderBy: { lastTriedAt: 'asc' },
      take: 50,
    });
    for (const f of due) {
      try {
        await this.handleStripeEvent(f.payload as unknown as Stripe.Event);
        await this.prisma.stripeEventFailure.update({ where: { id: f.id }, data: { resolvedAt: new Date() } });
        this.logger.log(`Stripe event ${f.eventId} (${f.eventType}) handled on retry ${f.attempts + 1}`);
      } catch (err: any) {
        await this.prisma.stripeEventFailure.update({
          where: { id: f.id },
          data: { attempts: { increment: 1 }, lastTriedAt: new Date(), error: String(err?.message ?? err).slice(0, 2000) },
        });
      }
    }
  }

  async handleStripeEvent(event: Stripe.Event) {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;

        /*
         * THE WRITER OF THIS METADATA IS GONE. purchaseSession wrote { type: 'session_fee', organizationId,
         * groundId, quantity } onto a Checkout session; the route returns 410 now and the method is
         * deleted. This branch stays because Stripe redelivers old events, and a historical payment that
         * was processed must still be recognised as processed rather than becoming a 500.
         */
        if (session.metadata?.type === 'session_fee') {
          const { organizationId, groundId } = session.metadata ?? {};
          const qty = parseInt(session.metadata?.quantity ?? '1', 10) || 1;
          const stripeInvoiceId = (session.payment_intent as string | null) ?? event.id;
          if (organizationId && groundId) {
            /*
             * THE CONSTRAINT DECIDES, NOT A PRIOR READ. This checked findFirst then wrote, against a
             * column that is uniquely indexed for exactly this race (see the schema comment on
             * stripe_invoice_id). Two concurrent deliveries both found nothing, both wrote, and the
             * loser's P2002 came out of the webhook as a 500 - so Stripe retried a payment that had
             * been processed, for ever. The same shape recordInvoiceOnce already uses: the credit and
             * the row are one transaction, and a unique violation on the row IS the duplicate signal.
             */
            const now = new Date();
            try {
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
            } catch (err: any) {
              if (err?.code !== 'P2002') throw err;
              this.logger.log(`Duplicate delivery for ${stripeInvoiceId} - already credited, nothing written`);
            }
          }
          break;
        }

        // New org subscription checkout.
        if (session.metadata?.type === 'subscription') {
          const { organizationId: orgId, plan } = session.metadata ?? {};
          const subId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;
          if (orgId && plan && subId) {
            /* Activate from what the session carries - the plan in its metadata and the subscription
               id on the session itself - and only ENRICH from Stripe. A retrieve that threw used to
               leave the customer paid and inactive, with nothing to try again. */
            const periodEnd = await this.stripe.stripe.subscriptions
              .retrieve(subId)
              .then((sub) => (sub.current_period_end ? new Date(sub.current_period_end * 1000) : null))
              .catch((err: any) => { this.logger.warn(`Could not read subscription ${subId} after checkout: ${err?.message}`); return null; });
            await this.prisma.organization.update({
              where: { id: orgId },
              data: {
                subscriptionPlan: plan as SubscriptionPlan,
                subscriptionStatus: 'active' satisfies SubscriptionStatus,
                subscriptionStripeId: subId,
                subscriptionPeriodEnd: periodEnd,
              },
            });
            const orgData = await this.prisma.organization.findUnique({ where: { id: orgId }, select: { email: true } });
            if (orgData?.email && periodEnd) {
              await this.email.sendSubscriptionConfirmed(orgData.email, plan, periodEnd).catch(() => undefined);
            }
            this.logger.log(`Org subscription activated: org ${orgId} plan ${plan}`);
            /* An organisation that turned WhatsApp on gets its add-on line now, if its trial is over. */
            await this.whatsappAddOn?.syncTheStripeLine(orgId).catch((err: any) => this.logger.error(`WhatsApp add-on line for ${orgId} was not added after checkout: ${err?.message}`));
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
        await this.confirmTheCareFee(organizationId).catch(() => undefined);
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
              /* A cancellation scheduled or undone on Stripe's side (the portal) is mirrored here too. */
              subscriptionEndsAt: sub.cancel_at_period_end && periodEnd ? periodEnd : null,
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
            /* The add-on's line ended with the subscription it was on. */
            data: { subscriptionPlan: null, subscriptionStatus: 'cancelled' satisfies SubscriptionStatus, subscriptionStripeId: null, subscriptionPeriodEnd: null, subscriptionEndsAt: null, whatsappAddOnItemId: null },
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
          select: { id: true, email: true, subscriptionPlan: true, subscriptionPeriodEnd: true, subscriptionStripeId: true },
        });
        /*
         * A SECOND CHANCE TO ACTIVATE, NOT ONLY AN EMAIL. If the checkout event was lost or failed,
         * the organisation has a plan on record and money taken and no subscription id - and this
         * event, which arrives on every payment, was writing a ledger row and mailing a receipt to a
         * customer the product still treated as unpaid.
         */
        const invoiceSubId = typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id;
        if (paidOrg && paidOrg.subscriptionPlan && !paidOrg.subscriptionStripeId && invoiceSubId) {
          await this.prisma.organization.update({
            where: { id: paidOrg.id },
            data: {
              subscriptionStripeId: invoiceSubId,
              subscriptionStatus: 'active' satisfies SubscriptionStatus,
              subscriptionPeriodEnd: invoice.period_end ? new Date(invoice.period_end * 1000) : paidOrg.subscriptionPeriodEnd,
            },
          });
          this.logger.warn(`Org ${paidOrg.id} activated from a paid invoice: the checkout event never landed`);
        } else if (paidOrg && !paidOrg.subscriptionPlan && invoiceSubId) {
          this.logger.error(`Org ${paidOrg.id} paid invoice ${invoice.id} for subscription ${invoiceSubId} and has no plan on record`);
        }
        if (paidOrg?.email && paidOrg.subscriptionPlan) {
          const amountCents = invoice.amount_paid ?? 0;
          await this.email.sendSubscriptionRenewal(paidOrg.email, paidOrg.subscriptionPlan, amountCents, paidOrg.subscriptionPeriodEnd).catch(() => undefined);
        }

        /**
         * AND WRITE IT DOWN, WHICH NOTHING DID.
         *
         * `BillingEventType` declares SUBSCRIPTION_FEE and nothing ever wrote it. Only FREE_EXTENSION
         * and SESSION_FEE were recorded - and per-session selling was withdrawn from every screen - so
         * the ledger held a row type for a product no longer sold and no row at all for subscriptions,
         * which is the entire revenue model. An organisation querying a charge could not be shown
         * their own history.
         *
         * Deliberately OUTSIDE the email branch: the record must not depend on the org having an
         * email address or a readable plan.
         */
        if (paidOrg && (invoice.amount_paid ?? 0) > 0) {
          await this.recordInvoiceOnce({
            organizationId: paidOrg.id,
            type: BillingEventType.SUBSCRIPTION_FEE,
            amountCents: invoice.amount_paid ?? 0,
            currency: (invoice.currency ?? 'usd').toUpperCase(),
            stripeInvoiceId: invoice.id ?? null,
            periodStart: invoice.period_start ? new Date(invoice.period_start * 1000) : new Date(),
            periodEnd: invoice.period_end ? new Date(invoice.period_end * 1000) : new Date(),
          });
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
            data: { subscriptionStatus: 'past_due' satisfies SubscriptionStatus },
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
        where: { subscriptionStatus: 'active' satisfies SubscriptionStatus },
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
    // sendCareFeeConfirmation existed and nothing called it: somebody redeemed a
    // code, the product changed state, and no message said it had worked.
    await this.confirmTheCareFee(organizationId).catch(() => undefined);
    const admin = await this.prisma.user.findFirst({ where: { organizationId, role: UserRole.ADMIN }, select: { id: true } });
    if (admin) {
      await this.usage.emit(UsageEventType.BILLING_ACTIVATED, { organizationId, userId: admin.id });
    }
    this.logger.log(`Contributor code applied for org ${organizationId}`);
    return { ok: true, message: 'Access granted. Continue without payment.' };
  }
}
