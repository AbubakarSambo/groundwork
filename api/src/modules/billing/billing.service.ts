import { Injectable, Logger, NotFoundException, ForbiddenException, BadRequestException, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import type Stripe from 'stripe';
import { PrismaService, CronLock } from '../prisma/prisma.service';
import { StripeService } from './stripe.service';
import { PricingService, PLAN_LABELS, WHATSAPP_ADD_ON_KIND, EXTRA_SEAT_KIND, WHATSAPP_PERSON_KIND } from './pricing.service';
import { extraSeatsOn, thisAddsASeat, whatAddingSomebodySays, thisMonth, aCheaperPlan, seatsCost, dollarsOf, type AMonth } from './what-a-month-costs';
import { whenItWas } from '../../common/a-date-reads-the-same-everywhere';
import { aReceiptLine } from '../email/email.service';

function whenItWasForBilling(d: Date): string {
  return whenItWas(d, 'full', 'UTC');
}

export interface WhatAMonthSays {
  people: number;
  plan: SubscriptionPlan | null;
  included: string | null;
  peopleSays: string;
  lines: Array<{ says: string; amount: string }> | null;
  total: { says: string; amount: string } | null;
  free: string | null;
  priceChanges: string;
  cheaper: { plan: SubscriptionPlan; says: string; button: string } | null;
  plansNote: string | null;
  whatsappRate: string | null;
  plans: Array<{ plan: SubscriptionPlan; name: string; price: string; includes: string; extraSeats: string | null; whatsapp: string | null; forYou: string | null; yours: boolean }>;
  forHowMany: string;
  numbers: { whatsappOn: boolean; whatsappUsedIt: number; whatsappFree: boolean; whatsappFlatCents: number | null };
}
import { WhatsAppAddOnService } from './whatsapp-add-on.service';
import { TheFreeTrialService } from './the-free-trial.service';
import { claimTheSlot, theDay, onceAcrossCopies, theHour } from '../prisma/once-across-copies';

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
 * WHAT AN ORGANISATION WITH NO PLAN READS: its free trial has ended, or its team is at or over the trial's size, so it
 * starts on a plan (Hafsah, 27 September; the only free plan is the trial, 22 November 2026).
 */
export const NO_PLAN_TO_OPEN = 'Your organisation has no plan yet. Choose one on Plan and billing to open a check-in.';
export const NO_PLAN_TO_ADD = 'Your organisation has no plan yet. Choose one on Plan and billing to add people.';
/* The prototype's words (upgrade.txt), for anybody in a check-in whose organisation has no plan. */
/** "When Baridi Appliances was set up, it had 20 or more people." Null when nobody was asked. The month is for any size (25 November 2026). */
export function theSizeItStartedWith(org: { name?: string | null; teamSizeSaid?: string | null; teamSizeLine?: number | null }): { said: 'fewer' | 'more'; line: number; says: string } | null {
  const said = org.teamSizeSaid === 'fewer' || org.teamSizeSaid === 'more' ? org.teamSizeSaid : null;
  const line = Number(org.teamSizeLine);
  if (!said || !Number.isInteger(line) || line < 2) return null;
  const who = (org.name ?? '').trim() || 'your organisation';
  const says = said === 'more'
    ? `When ${who} was set up, it had ${line} or more people.`
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
import { theEngagementMoment } from '../engagement/the-engagement-release-moment';
import { theOverThePlan, theOverThePlanSentence, howManyAreOverThePlan } from '../../common/over-the-plan';
import { isSubscribed, isCovered, isPaused, whatCoversThem, ACTIVE, WHAT_COVER_READS, type SubscriptionStatus, type TheGrace } from '../../common/subscription';
import { theGraceInForce, thisOrganisationIsPaused, theNoteAboutPaying } from './the-trial-grace';

/**
 * Billing model (22 November 2026):
 *   The free plan is the free trial: a team under its size, free for its length, once per organisation, every
 *   organisation included. There is no count of free check-ins. After the trial, no new check-in until a plan is
 *   chosen. Nothing is charged per session.
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
    /* The free trial, given here to any organisation that has never had it (ILRI, 22 November 2026). Optional so a test
       that builds billing by hand still runs; then the same service is made from the same two parts. */
    @Optional() private freeTrial?: TheFreeTrialService,
  ) {}

  /**
   * THE FREE PLAN IS THE FREE TRIAL, AND EVERY ORGANISATION GETS IT ONCE (Hafsah, 22 November 2026: "free trial is for teams
   * of 20 and there's nothing like 10 free checkins"). An organisation that has never had the trial, made before it was
   * switched on or not, is given it the first time it needs cover, whatever its size (25 November 2026). Says whether it
   * was given now. Never throws.
   */
  private async theTrialIsGivenNow(organizationId: string): Promise<boolean> {
    const trial = this.freeTrial ?? new TheFreeTrialService(this.prisma, this.pricing);
    const got = await trial.grantIfItApplies(organizationId).catch(() => null);
    return !!got?.granted;
  }

  /**
   * THE ORGANISATION AS COVER READS IT, WITH THE FREE TRIAL GIVEN FIRST IF IT IS OWED. One read for every seat and billing
   * gate, so the page that shows the seats and the gate that refuses an invitation cannot disagree.
   */
  private async theOrgWithItsCover<S extends Record<string, true>>(organizationId: string, extra: S = {} as S) {
    const select = { ...WHAT_COVER_READS, ...extra };
    const read = () => this.prisma.organization.findUnique({ where: { id: organizationId }, select }) as Promise<any>;
    const org = await read();
    if (!org) return null;
    /* The trial is owed only where nothing of its own covers them: not paying and no free run going. Read without the grace, so
       an organisation that cannot pay yet is still given its trial as built. */
    if (whatCoversThem(org, new Date()).covers !== 'free tier' || isPaused(org, await this.theGrace())) return org;
    return (await this.theTrialIsGivenNow(organizationId)) ? ((await read()) ?? org) : org;
  }

  /** The four weeks after a free month, as the setting has them now: what every cover read here is given (common/subscription.ts). */
  private async theGrace(): Promise<TheGrace | null> {
    return theGraceInForce(this.prisma).catch(() => null);
  }

  /**
   * HOW MANY PEOPLE WHAT COVERS THEM HOLDS, the one read for every seat gate and the page that shows it. Null means no limit.
   * Nothing covering them: the person who made it. The free trial: as many people as they like (Hafsah, 25 November 2026;
   * Rhea's pilot was held to the trial plan's seats). Otherwise the plan's own seats, a plan of theirs or a free run we gave.
   */
  private async theSeatCap(org: Parameters<typeof whatCoversThem>[0] & { freeTrialStartedAt?: Date | string | null }): Promise<number | null> {
    const covered = whatCoversThem(org as any, new Date(), await this.theGrace());
    if (covered.covers === 'free tier') return 1;
    if (covered.covers === 'on the house' && org.freeTrialStartedAt) return null;
    return covered.plan ? ((await this.pricing.memberCapFor(covered.plan as any)) ?? null) : null;
  }

  /**
   * EXTRA SEATS (fix list item 6): whether this organisation may go past its plan's included seats, at the plan's
   * extra-seat price. Yes for an organisation on a plan or in its free month, on a plan that sells extra seats, once the
   * new pricing's switch is on (the free trial's, `pricing.freeTrial`, release step 13a). While it is off, the plan's seats
   * are a limit, exactly as before. The free plan always keeps its limit. Null means no extra seats here.
   */
  private async extraSeatsFor(org: { subscriptionPlan: unknown; subscriptionStatus: string | null; freeUntil?: Date | null; freePlan?: unknown; freeTrialStartedAt?: Date | null }): Promise<{ plan: SubscriptionPlan; cap: number; extraSeatCents: number } | null> {
    const covered = whatCoversThem(org as any, new Date(), await this.theGrace());
    if (!covered.plan) return null;
    /* The free trial has no seat limit, so nobody in it is an extra seat (25 November 2026). */
    if (covered.covers === 'on the house' && org.freeTrialStartedAt) return null;
    const trial = typeof (this.pricing as any)?.getFreeTrial === 'function' ? await this.pricing.getFreeTrial().catch(() => null) : null;
    if (!trial?.on) return null;
    const row = await (this.prisma.pricingPlan as any)?.findUnique?.({ where: { plan: covered.plan }, select: { memberCap: true, extraSeatCents: true } }).catch(() => null);
    if (!row || row.memberCap === null || row.memberCap === undefined || row.extraSeatCents === null || row.extraSeatCents === undefined) return null;
    return { plan: covered.plan as SubscriptionPlan, cap: row.memberCap, extraSeatCents: row.extraSeatCents };
  }

  /**
   * WHAT THE NEXT INVITATION DOES TO THE BILL, for every place somebody is invited (fix list item 6): "This adds a seat:
   * +$5 a month" when the next person goes past the plan's included seats. Read by the screen before it sends, so every
   * invite point says the same thing the bill does. Null `says` when it adds nothing to the bill.
   */
  async theNextSeat(organizationId: string, name: string | null = null): Promise<{ addsASeat: boolean; extraSeatCents: number | null; says: string | null; included: number | null; taken: number; line: string; needsAYes: boolean; whatsappLine: string | null }> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { ...WHAT_COVER_READS, createdAt: true, whatsappAddOnOn: true, whatsappFlatAddOnKept: true },
    });
    const taken = await this.seatsTaken(organizationId);
    /* THE COST LINE (Hafsah, 21 November 2026): said from the same prices the bill reads, and a price only when it will be charged. */
    const trial = typeof (this.pricing as any)?.getFreeTrial === 'function' ? await this.pricing.getFreeTrial().catch(() => null) : null;
    const paying = !!org && isSubscribed(org as any);
    const extra = org ? await this.extraSeatsFor(org) : null;
    const included = extra ? extra.cap : await this.seatsIncludedFor(organizationId);
    const plan = extra?.plan ?? (org as any)?.subscriptionPlan ?? null;
    const prices = plan ? await (this.prisma.pricingPlan as any)?.findUnique?.({ where: { plan }, select: { whatsappPersonCents: true } }).catch(() => null) : null;
    const said = whatAddingSomebodySays({
      charged: !!trial?.on && paying,
      whyFree: !trial?.on ? 'free trial' : 'not paying',
      taken,
      included: included ?? null,
      extraSeatCents: extra?.extraSeatCents ?? null,
      name,
      whatsapp: (org as any)?.whatsappAddOnOn && !(org as any)?.whatsappFlatAddOnKept ? { personCents: prices?.whatsappPersonCents ?? null, alreadyCounted: false } : null,
    });
    const adds = !!extra && taken >= extra.cap;
    return {
      addsASeat: adds, extraSeatCents: extra?.extraSeatCents ?? null, says: adds && extra ? thisAddsASeat(extra.extraSeatCents) : null, included: included ?? null, taken,
      line: said.line, needsAYes: said.needsAYes, whatsappLine: said.whatsappLine,
    };
  }


  /**
   * THE EXTRA SEATS' STRIPE LINE FOLLOWS THE PEOPLE. A second line on the subscription, its quantity the number of seats past
   * the plan's included ones; removed at zero. Only for a paying organisation, while the new pricing's switch is on. An
   * organisation that keeps the old flat WhatsApp line moves to WhatsApp per person the moment it adds a seat.
   */
  async syncTheSeatLine(organizationId: string): Promise<'added' | 'changed' | 'removed' | 'unchanged' | 'no key'> {
    if (!this.stripe.isConfigured) return 'no key';
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { ...WHAT_COVER_READS, subscriptionStripeId: true, extraSeatsItemId: true, whatsappFlatAddOnKept: true },
    });
    if (!org) return 'unchanged';
    const paid = isSubscribed(org as any) && !!org.subscriptionStripeId;
    const extra = paid ? await this.extraSeatsFor(org) : null;
    const seats = extra ? extraSeatsOn({ memberCap: extra.cap }, await this.seatsTaken(organizationId)) : 0;
    if (extra && seats > 0) {
      const priceId = await this.pricing.getOrCreateExtraSeatPrice(extra.plan);
      if (org.whatsappFlatAddOnKept) {
        await this.prisma.organization.update({ where: { id: organizationId }, data: { whatsappFlatAddOnKept: false } });
        await this.whatsappAddOn?.syncTheStripeLine(organizationId).catch((err: any) => this.logger.error(`WhatsApp line for ${organizationId} did not move to per person: ${err?.message}`));
      }
      /* A line made at checkout is on the subscription already; it is adopted rather than added twice. */
      let itemId = org.extraSeatsItemId;
      if (!itemId) {
        const sub = await this.stripe.stripe.subscriptions.retrieve(org.subscriptionStripeId as string).catch(() => null);
        itemId = (sub?.items?.data ?? []).find((i: any) => i.price?.metadata?.kind === EXTRA_SEAT_KIND)?.id ?? null;
        if (itemId) await this.prisma.organization.update({ where: { id: organizationId }, data: { extraSeatsItemId: itemId } });
      }
      if (itemId) {
        const item = await this.stripe.stripe.subscriptionItems.retrieve(itemId).catch(() => null);
        if (item) {
          if (item.price?.id === priceId && item.quantity === seats) return 'unchanged';
          await this.stripe.stripe.subscriptionItems.update(itemId, { price: priceId, quantity: seats, proration_behavior: 'create_prorations' });
          this.logger.log(`Extra seats for ${organizationId} set to ${seats}.`);
          return 'changed';
        }
      }
      const item = await this.stripe.stripe.subscriptionItems.create(
        { subscription: org.subscriptionStripeId as string, price: priceId, quantity: seats, proration_behavior: 'create_prorations', metadata: { organizationId, kind: EXTRA_SEAT_KIND } },
        { idempotencyKey: `seats_${organizationId}_${org.subscriptionStripeId}_${priceId}_${seats}` },
      );
      await this.prisma.organization.update({ where: { id: organizationId }, data: { extraSeatsItemId: item.id } });
      this.logger.log(`Extra seats line added to ${organizationId}'s subscription, ${seats}.`);
      return 'added';
    }
    if (org.extraSeatsItemId) {
      if (org.subscriptionStripeId) {
        await this.stripe.stripe.subscriptionItems.del(org.extraSeatsItemId, { proration_behavior: 'create_prorations' }).catch((err: any) => {
          if (err?.code !== 'resource_missing') throw err;
        });
      }
      await this.prisma.organization.update({ where: { id: organizationId }, data: { extraSeatsItemId: null } });
      this.logger.log(`Extra seats line removed from ${organizationId}'s subscription.`);
      return 'removed';
    }
    return 'unchanged';
  }

  /** Somebody may have just taken a seat: the line is brought up to date half a minute later, once their account exists. Never throws. */
  seatsMayHaveChanged(organizationId: string): void {
    const t = setTimeout(() => {
      this.syncTheSeatLine(organizationId).catch((err: any) => this.logger.error(`Extra seats line for ${organizationId} could not be brought up to date: ${err?.message}`));
    }, 30_000);
    (t as any)?.unref?.();
  }

  /** EVERY HOUR, every paying organisation's seat line, so a seat added or freed anywhere reaches the bill. Once across every copy. */
  @Cron('0 15 * * * *', { timeZone: 'UTC' })
  async hourlySeatLines(): Promise<void> {
    await onceAcrossCopies(this.prisma, 'extra-seat-lines', theHour(), async () => {
      const orgs = await this.prisma.organization.findMany({
        where: { OR: [{ subscriptionStripeId: { not: null }, subscriptionStatus: 'active' }, { extraSeatsItemId: { not: null } }] },
        select: { id: true },
      });
      for (const o of orgs) {
        await this.syncTheSeatLine(o.id).catch((err: any) => this.logger.error(`Extra seats line for ${o.id} could not be brought up to date: ${err?.message}`));
      }
    });
  }

  /**
   * Session balance gate. Returns allowed: true when the ground has at least one
   * session remaining, or the org has an active subscription (unlimited sessions).
   */
  async canStartSession(groundId: string): Promise<{ allowed: boolean; reason?: string; sessionsBalance: number }> {
    const ground = await this.prisma.ground.findUnique({
      where: { id: groundId },
      select: { sessionsBalance: true, isFreeGround: true, organizationId: true },
    });

    /* GROUNDWORK IS PAUSED THERE (2 November 2026): four weeks after the free month, with no plan chosen, no check-in opens, free
       or not, until an admin chooses one. What was said is kept. */
    if (ground?.organizationId && (await thisOrganisationIsPaused(this.prisma, ground.organizationId))) {
      return { allowed: false, reason: PAUSED_UNTIL_THEY_SUBSCRIBE, sessionsBalance: 0 };
    }

    // A check-in made free (by an access code, or on the old free plan before 22 November 2026) keeps UNLIMITED
    // sessions, so nothing already running is cut off. -1 signals unlimited to the caller.
    if (ground?.isFreeGround) {
      return { allowed: true, sessionsBalance: -1 };
    }

    // Active subscription = unlimited sessions, no balance check needed.
    if (ground?.organizationId) {
      const org = await this.prisma.organization.findUnique({
        where: { id: ground.organizationId },
        select: {
          /* A free run covers exactly what the plan it was given covers - see whatCoversThem. */
          ...WHAT_COVER_READS,
          createdAt: true,
        },
      });
      if (org && isCovered(org, new Date(), await this.theGrace())) {
        return { allowed: true, sessionsBalance: -1 }; // -1 signals unlimited
      }

      const balance = ground?.sessionsBalance ?? 0;
      if (balance > 0) return { allowed: true, sessionsBalance: balance };

      /* Nothing covers them and the free trial has nothing left to give: no free check-ins, no free extension. */
      if (org && (await this.theTrialIsGivenNow(ground.organizationId))) return { allowed: true, sessionsBalance: -1 };
      return { allowed: false, reason: PAUSED_UNTIL_THEY_SUBSCRIBE, sessionsBalance: 0 };
    }

    const balance = ground?.sessionsBalance ?? 0;
    if (balance > 0) return { allowed: true, sessionsBalance: balance };
    return { allowed: false, reason: PAUSED_UNTIL_THEY_SUBSCRIBE, sessionsBalance: 0 };
  }

  /**
   * Ground creation gate.
   *
   * Resolution order:
   *   1. paused (the four weeks after the free month are over, no plan) → not allowed
   *   2. paying, or inside a free run (the free trial included) → allowed
   *   3. never had the free trial and the team is under its size → the trial is given now, allowed
   *   4. accessCode provided and valid → freeReason='ACCESS_CODE', codeId set
   *   5. legacy active care fee → allowed
   *   6. otherwise → no plan yet (choose one on Plan and billing)
   *
   * There is no count of free check-ins (Hafsah, 22 November 2026). The caller (GroundsService.create) is responsible
   * for persisting the derived fields inside its transaction.
   */
  async canCreateGround(
    organizationId: string,
    accessCode?: string,
  ): Promise<{ allowed: boolean; reason?: string; freeReason?: 'ACCESS_CODE'; codeId?: string; noPlan?: true }> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { ...WHAT_COVER_READS },
    });
    if (!org) return { allowed: false, reason: 'Organization not found' };
    /* Paused (2 November 2026): no new check-in until a plan is chosen, whatever else would have allowed it. */
    const grace = await this.theGrace();
    if (isPaused(org, grace)) return { allowed: false, reason: NO_PLAN_TO_OPEN, noPlan: true };

    /* The trial first, as built (it refuses anybody it does not apply to); then whatever covers them. */
    if (whatCoversThem(org, new Date()).covers === 'free tier' && (await this.theTrialIsGivenNow(organizationId))) return { allowed: true };
    if (isCovered(org, new Date(), grace)) return { allowed: true };

    // Contributor access code supplied.
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

    // Legacy active care fee plan.
    if (org.careFeeStatus === CareFeeStatus.ACTIVE) return { allowed: true };

    return { allowed: false, reason: NO_PLAN_TO_OPEN, noPlan: true };
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

  /**
   * WHO IS WAITING FOR A SEAT (request 197): the people added after the release when the plan is full, and how many. Everyone who had an account at release keeps it.
   * The same answer for the People list, Plan and billing and the refusal of new participation (common/over-the-plan.ts).
   */
  async whoIsOverThePlan(organizationId: string): Promise<{ over: number; held: Set<string>; saying: string | null }> {
    const cap = await this.seatsIncludedFor(organizationId);
    if (cap === null || cap === undefined) return { over: 0, held: new Set(), saying: null };
    /* Fix list item 6: on a plan that can add seats, a person past the included seats is an extra seat, not somebody waiting. */
    const org = await this.prisma.organization.findUnique({ where: { id: organizationId }, select: { ...WHAT_COVER_READS } }).catch(() => null);
    if (org && (await this.extraSeatsFor(org))) return { over: 0, held: new Set(), saying: null };
    const taken = await this.seatsTaken(organizationId);
    if (!howManyAreOverThePlan(taken, cap)) return { over: 0, held: new Set(), saying: null };
    /* Unreadable moment means nobody is held, never a guess: existing people are never held. */
    const since = await theEngagementMoment(this.prisma).catch(() => null);
    const { over, held } = await theOverThePlan(this.prisma, organizationId, seatsIn(organizationId), cap, since);
    return { over, held, saying: theOverThePlanSentence(over) };
  }

  async seatsLeft(organizationId: string): Promise<number | null> {
    const org = await this.theOrgWithItsCover(organizationId);
    if (!org) return null;
    /* Fix list item 6: a plan that can add seats has no limit; each person past it is an extra seat. */
    if (await this.extraSeatsFor(org)) return null;
    /* Whichever covers them today decides the cap: their own plan or the one we gave them. With neither, only the person who created it. */
    const cap = await this.theSeatCap(org);
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
    const org = await this.theOrgWithItsCover(organizationId);
    if (!org) return null;
    return this.theSeatCap(org);
  }

  async canInviteMember(organizationId: string): Promise<{ allowed: boolean; reason?: string; addsASeat?: boolean; says?: string }> {
    const org = await this.theOrgWithItsCover(organizationId);
    if (!org) return { allowed: true };
    const count = await this.seatsTaken(organizationId);
    /* Covered is covered: a free run we gave them buys the seats its plan buys. */
    const covered = whatCoversThem(org, new Date(), await this.theGrace());
    const subscribed = covered.covers !== 'free tier';

    /*
     * NOTHING COVERS THEM: their free trial is over, or their team is at or over its size. Nobody new until a plan is
     * chosen. Nobody already here is affected: this is only asked when somebody new is being invited.
     */
    if (!subscribed) return count >= 1 ? { allowed: false, reason: NO_PLAN_TO_ADD } : { allowed: true };

    const capPlan = (covered.plan ?? org.subscriptionPlan) as SubscriptionPlan;
    const cap = await this.theSeatCap(org);
    if (cap === null) return { allowed: true };
    /*
     * EXTRA SEATS (fix list item 6): past the included seats, the person is an extra seat at the plan's price, not refused.
     * The screen has already said "This adds a seat: +$5 a month" (`theNextSeat`); the Stripe line follows the people.
     */
    if (count >= cap) {
      const extra = await this.extraSeatsFor(org);
      if (extra) {
        this.seatsMayHaveChanged(organizationId);
        return { allowed: true, addsASeat: true, says: thisAddsASeat(extra.extraSeatCents) };
      }
    }
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
      /* The plan that covers them, theirs or the free run's: a free run has no plan of its own, which read "Your undefined plan". */
      this.warnAboutTheMemberCap(organizationId, capPlan, count, cap).catch(() => undefined);
      return { allowed: false, reason: paidSeatLimitMessage(PLAN_LABELS[capPlan], cap) };
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
    if (!ground) throw new NotFoundException('That check-in could not be found, so go back to your check-ins and open it from the list.');
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
    if (!org) throw new NotFoundException('We could not find that organisation, so sign in again and try once more.');

    if (isSubscribed(org)) {
      throw new ForbiddenException('This organisation already has a plan, so change the plan instead of buying a new one.');
    }

    const customerId = await this.stripe.ensureCustomer(org.id, org.email ?? undefined, org.stripeCustomerId);
    if (customerId !== org.stripeCustomerId) {
      await this.prisma.organization.update({ where: { id: org.id }, data: { stripeCustomerId: customerId } });
    }

    // Price lives in the pricing_plans table (Admin -> System -> Pricing), not
    // in code: this looks up (or lazily creates) the matching Stripe Price
    // rather than building one ad hoc on every checkout.
    const priceId = await this.pricing.getOrCreateStripePrice(plan);
    /*
     * EXTRA SEATS AT CHECKOUT (fix list item 6): a team with more people than the plan includes sees the whole price on
     * Stripe's page, the plan and its extra seats as a quantity, rather than a second charge after it. Only once the new
     * pricing's switch is on; otherwise the plan's seats are a limit, as before.
     */
    const lineItems: Array<{ price: string; quantity: number }> = [{ price: priceId, quantity: 1 }];
    const trialSwitch = typeof (this.pricing as any)?.getFreeTrial === 'function' ? await this.pricing.getFreeTrial().catch(() => null) : null;
    if (trialSwitch?.on) {
      const row = await (this.prisma.pricingPlan as any)?.findUnique?.({ where: { plan }, select: { memberCap: true, extraSeatCents: true } }).catch(() => null);
      const extra = row && row.extraSeatCents != null ? extraSeatsOn(row, await this.seatsTaken(organizationId)) : 0;
      if (extra > 0) lineItems.push({ price: await this.pricing.getOrCreateExtraSeatPrice(plan), quantity: extra });
    }
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
      line_items: lineItems,
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
      { idempotencyKey: `sub_${organizationId}_${plan}_${lineItems.map((l) => l.quantity).join('-')}` },
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
    if (!org) throw new NotFoundException('We could not find that organisation, so sign in again and try once more.');
    if (!org.subscriptionStripeId || org.subscriptionStatus !== ACTIVE) {
      throw new ForbiddenException('This organisation has no plan to change yet, so choose a plan first.');
    }
    if (org.subscriptionPlan === newPlan) {
      throw new ForbiddenException(`Already on the ${newPlan} plan.`);
    }

    const newPriceId = await this.pricing.getOrCreateStripePrice(newPlan);
    const sub = await this.stripe.stripe.subscriptions.retrieve(org.subscriptionStripeId);
    /* The plan's own line, never the WhatsApp add-on's, which is a second line on the same subscription. */
    const itemId = sub.items.data.find(
      (i: any) => i.id !== org.whatsappAddOnItemId && i.id !== (org as any).extraSeatsItemId && i.id !== (org as any).whatsappPeopleItemId
        && ![WHATSAPP_ADD_ON_KIND, EXTRA_SEAT_KIND, WHATSAPP_PERSON_KIND].includes(i.price?.metadata?.kind),
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
      /* Fix list item 6: a change of plan ends the old flat WhatsApp price; WhatsApp is per person from now. */
      data: { subscriptionPlan: newPlan, subscriptionPeriodEnd: periodEnd, whatsappFlatAddOnKept: false },
    });

    /* The extra seats follow the new plan's included seats and price. */
    await this.syncTheSeatLine(organizationId).catch((err: any) => this.logger.error(`Extra seats line for ${organizationId} did not follow the plan change: ${err?.message}`));
    /* The WhatsApp line moves to the new plan's price per person. */
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
   *   - caller org has allowCodeCreation (on unless the row says off, 22 November 2026) AND caller is ADMIN
   */
  async generateContributorCode(
    organizationId: string,
    createdByUserId: string,
    sessionsGranted: number,
    note?: string,
    allowCodeCreation = true,
    parentCodeId?: string,
  ): Promise<{ code: string }> {
    // Authorization check
    const [org, callerUser] = await Promise.all([
      this.prisma.organization.findUnique({ where: { id: organizationId }, select: { allowCodeCreation: true } }),
      this.prisma.user.findUnique({ where: { id: createdByUserId }, select: { isPlatformAdmin: true, role: true } }),
    ]);

    const isPlatformAdmin = callerUser?.isPlatformAdmin ?? false;
    /* On unless the row says off (22 November 2026). */
    const orgAllowsCodeCreation = org?.allowCodeCreation !== false;
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
   * THE MONTH, LINE BY LINE, AS PLAN AND BILLING WORKS IT OUT: the plan, the seats past it, and WhatsApp for each person who
   * used it. `paying` works the month out as it will be once nothing is free any more (the free-month emails), with the same
   * plan, people and WhatsApp; otherwise WhatsApp is free while the standing says nothing is charged for it.
   */
  private async theMonthOf(organizationId: string, people: number, plan: SubscriptionPlan | null, opts: { paying?: boolean } = {}) {
    const plans = await this.pricing.plansPrices();
    const wa = this.whatsappAddOn ? await this.whatsappAddOn.standing(organizationId).catch(() => null) : null;
    const row = plan ? plans.find((p) => p.plan === plan) : undefined;
    const whatsappOn = !!wa && (wa.addOnOn || wa.inTheFreeWhatsAppMonth);
    const usedIt = wa?.peopleUsedIt ?? 0;
    const free = !opts.paying && whatsappOn && !wa?.charged;
    /* The old flat WhatsApp price holds only while no seat is added past the plan (fix list item 6). */
    const flatHolds = !!wa?.flatKept && !!row && extraSeatsOn(row, people) === 0;
    const month = row ? thisMonth(row, people, { on: whatsappOn, usedIt, free, flatCents: flatHolds ? wa!.addOnCents : null }) : null;
    return { plans, wa, row, whatsappOn, usedIt, free, flatHolds, month };
  }

  /**
   * WHAT A MONTH WILL COST ONCE THE FREE MONTH ENDS (the free-month emails, 15 October): the free month's own plan, for the
   * people here now, with WhatsApp charged for each person who used it. The same arithmetic as Plan and billing's month.
   * Null when the organisation has no free month's plan, or that plan has no price (Enterprise).
   */
  async theMonthAfterTheFreeMonth(organizationId: string): Promise<{ month: AMonth; planLabel: string; people: number } | null> {
    const org = await this.prisma.organization.findUnique({ where: { id: organizationId }, select: { freePlan: true } });
    const plan = (org?.freePlan as SubscriptionPlan | null) ?? null;
    if (!plan) return null;
    const people = await this.seatsTaken(organizationId);
    const { month } = await this.theMonthOf(organizationId, people, plan, { paying: true });
    return month ? { month, planLabel: PLAN_LABELS[month.plan], people } : null;
  }

  /**
   * PLAN AND BILLING'S MONTH (fix list item 6; the light prototype's s73, word for word). Every sentence is made here, from
   * the plan rows and the record, so the screen draws them as they come.
   */
  private async whatAMonthSays(
    organizationId: string,
    people: number,
    covers: { covers: string; plan: unknown; until: Date | null },
    orgName: string | null | undefined,
    inTheTrial = false,
  ): Promise<WhatAMonthSays> {
    const plan = (covers.plan as SubscriptionPlan | null) ?? null;
    const { plans, wa, row, whatsappOn, usedIt, free, flatHolds, month } = await this.theMonthOf(organizationId, people, plan);
    const selling = plans.filter((p) => p.amountCents !== null);
    const name = orgName?.trim() || 'your organisation';

    let lines: Array<{ says: string; amount: string }> | null = null;
    let total: { says: string; amount: string } | null = null;
    let included: string | null = null;
    if (month && row) {
      const label = PLAN_LABELS[month.plan];
      /* The free trial has no seat limit (25 November 2026), so it is not said as seats. */
      included = inTheTrial
        ? `${label}, free for your first month, for as many people as you like`
        : month.included === null
        ? label
        : `${label}, ${month.included} seats included${month.extraSeats ? `, plus ${month.extraSeats} extra at +${dollarsOf(month.extraSeatCents)} each` : ''}`;
      lines = [{ says: label, amount: dollarsOf(month.planCents) }];
      if (month.extraSeats) {
        lines.push({ says: `${month.extraSeats} extra ${month.extraSeats === 1 ? 'seat' : 'seats'} × ${dollarsOf(month.extraSeatCents)}`, amount: dollarsOf(month.extraSeatsCents) });
      }
      const who = `${month.whatsappPeople} ${month.whatsappPeople === 1 ? 'person' : 'people'} used it`;
      const waSays = !whatsappOn
        ? 'WhatsApp: switched off'
        : month.whatsappFlatCents !== null
          ? 'WhatsApp, at the price you have paid until now'
          : free
            ? (wa?.inTheFreeWhatsAppMonth || wa?.inAFreeRun || covers.covers === 'on the house'
              ? `WhatsApp: ${who}, free during your free month`
              : `WhatsApp: ${who}, not charged at the moment`)
            : `WhatsApp: ${who} × ${dollarsOf(month.whatsappPersonCents)}`;
      lines.push({ says: waSays, amount: dollarsOf(month.whatsappCents) });
      total = { says: 'This month', amount: dollarsOf(covers.covers === 'on the house' ? 0 : month.totalCents) };
    }

    const cheaper = plan && covers.covers === 'paid' ? aCheaperPlan(selling, plan, people) : null;
    const personCents = selling.find((p) => p.whatsappPersonCents !== null)?.whatsappPersonCents ?? null;
    const seatCents = selling.find((p) => p.extraSeatCents !== null)?.extraSeatCents ?? null;
    return {
      people,
      plan,
      included,
      peopleSays: inTheTrial
        ? `Everyone with a Groundwork account at ${name}. During your free month you can add as many people as you like. After it, your plan includes a set number of seats, and each extra seat is +${dollarsOf(seatCents ?? 0)} a month.`
        : `Everyone with a Groundwork account at ${name}. Your plan includes a set number of seats; each extra seat is +${dollarsOf(seatCents ?? 0)} a month. You see the price before an invitation goes.`,
      lines,
      total,
      free: covers.covers === 'on the house' && covers.until ? `Nothing is charged until your free month ends on ${whenItWasForBilling(covers.until)}.` : null,
      priceChanges: 'Your price only changes when you add people, switch WhatsApp on, or move plan.',
      cheaper: cheaper
        ? {
          plan: cheaper.plan,
          says: `Cheaper for ${people} people: ${PLAN_LABELS[cheaper.plan]}${cheaper.extraSeats ? ` with ${cheaper.extraSeats} extra ${cheaper.extraSeats === 1 ? 'seat' : 'seats'}` : ''}, ${dollarsOf(cheaper.cents)} a month instead of ${dollarsOf(cheaper.insteadOf)}.`,
          button: `Switch to ${PLAN_LABELS[cheaper.plan]}`,
        }
        : null,
      plansNote: seatCents !== null ? `Any plan: +${dollarsOf(seatCents)} per extra seat` : null,
      whatsappRate: personCents !== null ? `${dollarsOf(personCents)} per person who uses it, per month, on any plan` : null,
      plans: selling.map((p) => {
        const c = seatsCost(p, people);
        return {
          plan: p.plan,
          name: PLAN_LABELS[p.plan],
          price: `${dollarsOf(p.amountCents as number)}/mo`,
          includes: p.memberCap === null ? 'Unlimited people' : `${p.memberCap} people`,
          extraSeats: p.extraSeatCents !== null ? `+${dollarsOf(p.extraSeatCents)} each` : null,
          whatsapp: p.whatsappPersonCents !== null ? `+${dollarsOf(p.whatsappPersonCents)} a person` : null,
          forYou: c === null ? null : dollarsOf(c),
          yours: covers.covers === 'paid' && p.plan === plan,
        };
      }),
      forHowMany: `For ${people}`,
      numbers: { whatsappOn, whatsappUsedIt: usedIt, whatsappFree: free, whatsappFlatCents: flatHolds ? wa!.addOnCents ?? null : null },
    };
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
    };
    people: { count: number; cap: number | null };
    /** Request 197: the one sentence People says too, when more people have accounts than the plan covers; null otherwise. */
    overThePlanSays: string | null;
    /**
     * Set while an organisation is inside a free run we gave them, so the page can say it plainly:
     * what it covers and the day it ends. Null when they are paying or on the free tier.
     */
    onTheHouse: { plan: SubscriptionPlan; until: Date; freeTrial: boolean } | null;
    /** Admin only: the sentence about the four weeks after the free month, or the pause after them. Null otherwise. */
    afterTheTrial?: string | null;
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
    /** Admin only (fix list item 6): this month, line by line, each plan's cost for this many people, and a cheaper plan when there is one. */
    month?: WhatAMonthSays | null;
  }> {
    const org = await this.theOrgWithItsCover(organizationId, {
      stripeCustomerId: true,
      defaultPaymentMethodId: true,
      subscriptionPeriodEnd: true,
      subscriptionEndsAt: true,
      name: true,
      teamSizeSaid: true,
      teamSizeLine: true,
    });
    if (!org) throw new NotFoundException('We could not find that organisation, so sign in again and try once more.');

    const peopleCount = await this.seatsTaken(organizationId);
    /**
     * THE SAME CAP THE GATE WILL APPLY. Read from the same two sources in the same order, so the
     * number on this page and the number that refuses an invitation cannot be different numbers.
     */
    const grace = await this.theGrace();
    const covers = whatCoversThem(org, new Date(), grace);
    const peopleCap = await this.theSeatCap(org as any);

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
      },
      // `null` cap means unlimited (Enterprise) or no plan at all - the client renders the
      // count without a ceiling rather than inventing one.
      /**
       * `null` means unlimited - the client renders the count without a ceiling rather than
       * inventing one. A free organisation reports its free seat limit, because that IS its cap
       * and showing no ceiling to the only people who have one is how person six got added.
       */
      people: { count: peopleCount, cap: peopleCap },
      overThePlanSays: (await this.whoIsOverThePlan(organizationId).catch(() => null))?.saying ?? null,
      /* Said plainly, with the day it ends, because a free run nobody can see ends as a surprise. */
      onTheHouse: covers.covers === 'on the house' && covers.until && org.freePlan
        /* `freeTrial` says these are the free trial's months (U.19), not a free run we gave by hand. */
        ? { plan: org.freePlan, until: covers.until, freeTrial: !!org.freeTrialStartedAt && !covers.afterItsTrial }
        : null,
      /* The four weeks after the free month, and the pause after them, in the one sentence Today says too. Admin only: a
         team member is told nothing about paying (2 November 2026). */
      afterTheTrial: includeUsage ? await theNoteAboutPaying(this.prisma, organizationId, 'admin').catch(() => null) : null,
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
      month: includeUsage && (await this.pricing.getFreeTrial?.().catch(() => null))?.on ? await this.whatAMonthSays(organizationId, peopleCount, covers, org.name, covers.covers === 'on the house' && !!org.freeTrialStartedAt).catch((err: any) => { this.logger.warn(`Could not work out this month for ${organizationId}: ${err?.message}`); return null; }) : undefined,
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
    if (!org) throw new NotFoundException('We could not find that organisation, so sign in again and try once more.');

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
    const downloadUrl = `${this.config.get<string>('resend.frontendUrl') ?? ''}/settings#your-data`;
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
    if (!org?.stripeCustomerId) throw new NotFoundException('This organisation has no billing set up yet, so choose a plan first.');
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
            await this.syncTheSeatLine(orgId).catch((err: any) => this.logger.error(`Extra seats line for ${orgId} was not brought up to date after checkout: ${err?.message}`));
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
            data: { subscriptionPlan: null, subscriptionStatus: 'cancelled' satisfies SubscriptionStatus, subscriptionStripeId: null, subscriptionPeriodEnd: null, subscriptionEndsAt: null, whatsappAddOnItemId: null, extraSeatsItemId: null, whatsappPeopleItemId: null, whatsappFlatAddOnKept: false },
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
          const label = PLAN_LABELS[paidOrg.subscriptionPlan as SubscriptionPlan] ?? String(paidOrg.subscriptionPlan);
          const lines = ((invoice as any).lines?.data ?? []).filter((l: any) => (l.amount ?? 0) !== 0).map((l: any) => aReceiptLine(l, label));
          await this.email.sendSubscriptionRenewal(paidOrg.email, paidOrg.subscriptionPlan, amountCents, paidOrg.subscriptionPeriodEnd, lines).catch(() => undefined);
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
    if (!code) throw new NotFoundException('That code could not be found, so check it and try again.');
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
    if (!caller?.isPlatformAdmin) throw new ForbiddenException('This part is for Groundwork staff.');

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
