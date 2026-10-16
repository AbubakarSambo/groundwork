import { BadRequestException, Injectable, Logger, NotFoundException, Optional } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SubscriptionPlan, UserRole } from '@prisma/client';
import { theNewBillingPartsAreShown } from '../admin/what-is-hidden-at-release';
import { PrismaService } from '../prisma/prisma.service';
import { onceAcrossCopies, theDay, theHour } from '../prisma/once-across-copies';
import { EmailService } from '../email/email.service';
import { PricingService, PLAN_LABELS, freePlanApplies, WHATSAPP_ADD_ON_KIND, WHATSAPP_PERSON_KIND } from './pricing.service';
import { whatsappPeopleCharged } from './what-a-month-costs';
import { seatsIn } from '../../common/seats';
import { StripeService } from './stripe.service';
import { whatCoversThem, isSubscribed } from '../../common/subscription';
import { whenItWas } from '../../common/a-date-reads-the-same-everywhere';

/**
 * WHATSAPP IS A PAID ADD-ON (decision 78, 2 October 2026).
 *
 * WHAT IT COSTS (fix list item 6, 15 October 2026). $4 a month for each person who used it that month, on any plan, never
 * more than the seats, read from `pricing_plans.whatsappPersonCents` and edited at Admin, System, Pricing. Never in code.
 * The old flat price (`whatsappAddOnCents`, about 80% of the plan) is kept only by an organisation that was paying it when
 * the new pricing came in (`whatsappFlatAddOnKept`), until it adds a seat, switches WhatsApp off and on, or moves plan.
 *
 * WHO TURNS IT ON. An admin of the organisation, on Plan and billing (PATCH /billing/whatsapp).
 *
 * WHEN IT IS CHARGED. Only once the free trial's switch (`pricing.freeTrial`) is on, which it is not
 * until Hafsah switches it on. Then: nothing during a free trial or a free run, nothing on the free
 * plan, and once the trial has ended and the organisation pays for a plan, a second monthly line on
 * its Stripe subscription. While the switch is off, nothing about billing changes and WhatsApp goes
 * exactly as it does today.
 *
 * WHEN A MESSAGE IS NOT SENT. Once the switch is on, an organisation that pays without the add-on, or
 * whose trial ended without a plan, has its WhatsApp messages held, and the person reads why in the
 * app. Organisations still on the free plan (made before the switch) keep WhatsApp as today.
 *
 * THE LIMIT. Every organisation has its plan's monthly limit (`whatsappMonthlyLimit`), counted per
 * calendar month (UTC). At the limit nothing more goes by WhatsApp that month, check-ins carry on in
 * the app, the person reads why, and the organisation's admins are told once.
 *
 * The platform switch and the credentials still gate everything, in WhatsAppService, as before.
 */

export const WHATSAPP_NOT_TURNED_ON = 'Your organisation has not turned on WhatsApp, so this check-in stays in the app.';
export const WHATSAPP_REMINDERS_ARE_OFF = 'Your organisation has not turned on WhatsApp, so Groundwork does not send you reminders or summaries on WhatsApp.';
export const WHATSAPP_NOT_ON_A_PAID_PLAN = 'Your organisation is not on a paid plan at the moment, so this check-in stays in the app.';

export type WhyHeld = 'not turned on' | 'not on a paid plan' | 'at the limit';

/** The calendar month a message counts towards, in UTC, as "2026-10". */
export function monthOf(now: Date): string {
  return now.toISOString().slice(0, 7);
}

/** The first day of the next calendar month, in UTC: when WhatsApp starts again after the limit. */
export function theNextMonthStarts(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
}

/** "1 November 2026", by the UTC calendar the monthly count keeps. */
export function aDay(d: Date): string {
  return whenItWas(d, 'full', 'UTC');
}

/** "October", by the UTC calendar the monthly count keeps. */
function aMonthName(d: Date): string {
  return whenItWas(d, 'month', 'UTC');
}

/** "$72", or "$12.50" when there are cents. */
export function dollars(cents: number): string {
  const whole = cents % 100 === 0;
  return (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: whole ? 0 : 2 });
}

function aNumber(n: number): string {
  return n.toLocaleString('en-US');
}

/** What a person reads when a message to them was not sent by WhatsApp. */
export function whatThePersonReads(why: WhyHeld, now: Date): string {
  if (why === 'not turned on') return WHATSAPP_NOT_TURNED_ON;
  if (why === 'not on a paid plan') return WHATSAPP_NOT_ON_A_PAID_PLAN;
  return `Your organisation has used all its WhatsApp messages for this month, so this check-in stays in the app. WhatsApp starts again on ${aDay(theNextMonthStarts(now))}.`;
}

/** What the organisation's admins are told, once, when the month's limit is reached. */
export function whatTheAdminIsToldAtTheLimit(limit: number, now: Date): string {
  return `Your organisation has used all ${aNumber(limit)} of its WhatsApp messages for ${aMonthName(now)}. Nothing more is sent by WhatsApp until ${aDay(theNextMonthStarts(now))}. Check-ins carry on in the app, so nobody misses one.`;
}

export interface WhatsAppStanding {
  /** Whether decision 78's rules apply yet: only once the free trial's switch is on. */
  switchOn: boolean;
  /** The plan whose add-on price and limit apply to this organisation now, or null if none does. */
  plan: SubscriptionPlan | null;
  /** True while the organisation is in its free trial (or another free run we gave it). */
  inAFreeRun: boolean;
  freeTrial: { months: number; endsOn: Date } | null;
  /** True while the organisation is on the free plan. */
  onTheFreePlan: boolean;
  /** WhatsApp's own free month, which every organisation gets, and when it ends. */
  whatsappFreeUntil: Date | null;
  inTheFreeWhatsAppMonth: boolean;
  addOnOn: boolean;
  addOnCents: number | null;
  limit: number | null;
  month: string;
  sent: number;
  /** Whether the add-on should be a line on the organisation's Stripe subscription now. */
  charged: boolean;
  /**
   * FIX LIST ITEM 6: WhatsApp per person. `flatKept` is an organisation still on the old flat line (it keeps it until it adds
   * a seat, switches WhatsApp off and on, or changes plan). Otherwise WhatsApp costs `personCents` for each person who used
   * it this month (`peopleUsedIt`, counted from `since`), never more than the seats (`peopleCharged`).
   */
  flatKept: boolean;
  personCents: number | null;
  peopleUsedIt: number;
  peopleCharged: number;
  seats: number;
  since: Date;
  /** Whether a WhatsApp message for this organisation may go now. */
  sending: boolean;
  heldBecause: WhyHeld | null;
}

const ORG_FIELDS = {
  id: true, createdAt: true, subscriptionPlan: true, subscriptionStatus: true, subscriptionStripeId: true, subscriptionPeriodEnd: true,
  freeUntil: true, freePlan: true, freeTrialStartedAt: true, whatsappAddOnOn: true, whatsappAddOnItemId: true, whatsappFreeUntil: true,
  whatsappPeopleItemId: true, whatsappFlatAddOnKept: true,
} as const;

/**
 * WHEN THIS MONTH STARTED, FOR WHATSAPP PER PERSON. A paying organisation's month is its billing month, from one month before
 * its next payment, so the people counted are the people its next bill charges for. Anybody else's is the calendar month (UTC).
 */
export function theMonthStarted(org: { subscriptionPlan?: unknown; subscriptionStatus?: string | null; subscriptionPeriodEnd?: Date | string | null }, now: Date = new Date()): Date {
  const calendar = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  if (!isSubscribed({ subscriptionPlan: org.subscriptionPlan, subscriptionStatus: org.subscriptionStatus }) || !org.subscriptionPeriodEnd) return calendar;
  const end = new Date(org.subscriptionPeriodEnd);
  if (Number.isNaN(end.getTime()) || end.getTime() <= now.getTime()) return calendar;
  const start = new Date(end);
  start.setUTCMonth(start.getUTCMonth() - 1);
  return start.getTime() <= now.getTime() ? start : calendar;
}

/** A number written the several ways a phone can be ("+254 700…", "254700…") counts as one person. */
export function onePersonsNumber(phone: string): string {
  return String(phone ?? '').replace(/\D/g, '');
}

/** Whether this organisation is in its free WhatsApp month (Hafsah, 13 October 2026, evening). */
export function inItsFreeWhatsAppMonth(org: { whatsappFreeUntil?: Date | string | null } | null | undefined, now: Date = new Date()): boolean {
  return !!org?.whatsappFreeUntil && new Date(org.whatsappFreeUntil).getTime() > now.getTime();
}

@Injectable()
export class WhatsAppAddOnService {
  private readonly logger = new Logger(WhatsAppAddOnService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pricing: PricingService,
    private readonly stripe: StripeService,
    @Optional() private readonly mailer?: EmailService,
  ) {}

  /** Where this organisation stands with WhatsApp now. Throws only for an organisation that does not exist. */
  async standing(organizationId: string, now: Date = new Date()): Promise<WhatsAppStanding> {
    const org = await this.prisma.organization.findUnique({ where: { id: organizationId }, select: ORG_FIELDS });
    if (!org) throw new NotFoundException('We could not find that organisation, so sign in again and try once more.');
    const [trial, plans, use] = await Promise.all([
      this.pricing.getFreeTrial(),
      this.prisma.pricingPlan.findMany(),
      this.prisma.whatsAppMonthlyUse.findUnique({ where: { organizationId_month: { organizationId, month: monthOf(now) } } }),
    ]);
    const cover = whatCoversThem(org, now);
    const inAFreeRun = !!org.freeUntil && new Date(org.freeUntil).getTime() > now.getTime() && !!org.freePlan;
    const switchOn = trial.on;
    const onTheFreePlan = cover.covers === 'free tier' && freePlanApplies(trial, org.createdAt);

    /* The plan that applies: what they pay for, else the free run's plan, else the plan the free plan's size fits. */
    let plan: SubscriptionPlan | null = null;
    if (inAFreeRun) plan = org.freePlan as SubscriptionPlan;
    else if (cover.covers === 'paid') plan = org.subscriptionPlan as SubscriptionPlan;
    else {
      const freeSize = await this.pricing.getFreeMemberLimit();
      const fits = plans
        .filter((p) => p.amountCents !== null && (p.memberCap === null || p.memberCap >= freeSize))
        .sort((a, b) => (a.amountCents as number) - (b.amountCents as number));
      plan = fits[0]?.plan ?? null;
    }
    const row = plan ? plans.find((p) => p.plan === plan) : undefined;
    const addOnCents = row?.whatsappAddOnCents ?? null;
    const limit = row?.whatsappMonthlyLimit ?? null;
    const sent = use?.sent ?? 0;
    const since = theMonthStarted(org, now);
    const [peopleUsedIt, seats] = await Promise.all([this.peopleWhoUsedIt(organizationId, since), this.seatsHere(organizationId)]);
    /* The old flat price holds only while no seat is added past the plan (fix list item 6); a seat added ends it. */
    const flatKept = !!org.whatsappFlatAddOnKept && (row?.memberCap == null || seats <= row.memberCap);
    const personCents = row?.whatsappPersonCents ?? null;

    /* The free WhatsApp month: on for everybody, nothing charged, whether or not it was added to the subscription. A
     * paying organisation that adds it during the month is charged from the night the month ends (the nightly sweep). */
    const freeMonth = inItsFreeWhatsAppMonth(org, now);
    const charged = switchOn && org.whatsappAddOnOn && cover.covers === 'paid' && !!org.subscriptionStripeId && !inAFreeRun && !freeMonth
      && (flatKept ? addOnCents !== null : personCents !== null);
    let heldBecause: WhyHeld | null = null;
    if (switchOn && !inAFreeRun && !onTheFreePlan && !freeMonth) {
      if (!org.whatsappAddOnOn) heldBecause = 'not turned on';
      else if (cover.covers !== 'paid') heldBecause = 'not on a paid plan';
    }
    if (!heldBecause && limit !== null && sent >= limit) heldBecause = 'at the limit';

    return {
      switchOn,
      plan,
      inAFreeRun,
      freeTrial: inAFreeRun && org.freeTrialStartedAt ? { months: trial.months, endsOn: new Date(org.freeUntil as Date) } : null,
      onTheFreePlan,
      whatsappFreeUntil: org.whatsappFreeUntil ? new Date(org.whatsappFreeUntil) : null,
      inTheFreeWhatsAppMonth: freeMonth,
      addOnOn: org.whatsappAddOnOn,
      addOnCents,
      limit,
      month: monthOf(now),
      sent,
      charged,
      flatKept,
      personCents,
      peopleUsedIt,
      peopleCharged: whatsappPeopleCharged(peopleUsedIt, seats),
      seats,
      since,
      sending: heldBecause === null,
      heldBecause,
    };
  }

  /**
   * HOW MANY PEOPLE USED WHATSAPP THIS MONTH (fix list item 6: "anyone who checked in or got messages on WhatsApp"). Read
   * from the record of every message that went (`whatsapp_sends`): each different number sent to since the month started,
   * the free "WhatsApp is held" notice left out. A check-in on WhatsApp is always answered on WhatsApp, so checking in
   * counts too. Never throws: an unreadable record counts nobody.
   */
  async peopleWhoUsedIt(organizationId: string, since: Date): Promise<number> {
    try {
      const rows: Array<{ phone: string }> = await (this.prisma.whatsAppSend as any).findMany({
        where: { organizationId, sentAt: { gte: since }, OR: [{ kind: null }, { kind: { not: 'held-told' } }] },
        select: { phone: true },
        distinct: ['phone'],
      });
      return new Set((rows ?? []).map((r) => onePersonsNumber(r.phone)).filter(Boolean)).size;
    } catch (err: any) {
      this.logger.warn(`Could not count the people on WhatsApp for ${organizationId}: ${err?.message}`);
      return 0;
    }
  }

  private async seatsHere(organizationId: string): Promise<number> {
    try {
      return await this.prisma.user.count({ where: seatsIn(organizationId) });
    } catch {
      return 0;
    }
  }

  /**
   * WHETHER A WHATSAPP MESSAGE FOR THIS ORGANISATION MAY GO. Never throws: if the answer cannot be
   * read, the message goes as it does today, and the failure is logged.
   */
  async mayWeSend(organizationId: string, now: Date = new Date()): Promise<{ send: true } | { send: false; why: WhyHeld; saying: string }> {
    try {
      const s = await this.standing(organizationId, now);
      if (s.sending) return { send: true };
      return { send: false, why: s.heldBecause as WhyHeld, saying: whatThePersonReads(s.heldBecause as WhyHeld, now) };
    } catch (err: any) {
      this.logger.warn(`Could not read WhatsApp standing for ${organizationId}, so the message goes as today: ${err?.message}`);
      return { send: true };
    }
  }

  /** One message went. Counted towards this calendar month. Never throws. */
  async countSent(organizationId: string, now: Date = new Date()): Promise<void> {
    const month = monthOf(now);
    await this.prisma.whatsAppMonthlyUse
      .upsert({
        where: { organizationId_month: { organizationId, month } },
        create: { organizationId, month, sent: 1 },
        update: { sent: { increment: 1 } },
      })
      .catch((err: any) => this.logger.warn(`Could not count a WhatsApp message for ${organizationId}: ${err?.message}`));
  }

  /** One message was held. At the limit, the organisation's admins are told, once a month. Never throws. */
  async countHeld(organizationId: string, why: WhyHeld, now: Date = new Date()): Promise<void> {
    const month = monthOf(now);
    try {
      await this.prisma.whatsAppMonthlyUse.upsert({
        where: { organizationId_month: { organizationId, month } },
        create: { organizationId, month, held: 1 },
        update: { held: { increment: 1 } },
      });
      if (why !== 'at the limit') return;
      /* Claimed first, so two messages held at once cannot tell them twice. */
      const claimed = await this.prisma.whatsAppMonthlyUse.updateMany({
        where: { organizationId, month, adminToldAt: null },
        data: { adminToldAt: now },
      });
      if (!claimed.count) return;
      const s = await this.standing(organizationId, now);
      await this.tellTheAdmins(organizationId, whatTheAdminIsToldAtTheLimit(s.limit ?? s.sent, now));
    } catch (err: any) {
      this.logger.warn(`Could not record a held WhatsApp message for ${organizationId}: ${err?.message}`);
    }
  }

  private async tellTheAdmins(organizationId: string, what: string): Promise<void> {
    if (!this.mailer) return;
    const admins = await this.prisma.user.findMany({
      where: { organizationId, role: UserRole.ADMIN, deletedAt: null },
      select: { email: true, firstName: true },
    });
    for (const a of admins) {
      await this.mailer.sendBillingChangeNotification(a.email, a.firstName ?? 'there', what).catch(() => undefined);
    }
  }

  /**
   * AN ADMIN OF THE ORGANISATION TURNS THE ADD-ON ON OR OFF. The Stripe line follows at once when it
   * should be charged now, and otherwise when the trial ends (the nightly sweep below).
   */
  async turn(organizationId: string, on: boolean, now: Date = new Date()): Promise<WhatsAppStanding> {
    if (typeof on !== 'boolean') throw new BadRequestException('Say whether WhatsApp should be on or off.');
    const before = await this.standing(organizationId, now);
    if (on && before.plan && before.personCents === null && before.addOnCents === null) {
      throw new BadRequestException(`WhatsApp is not sold by itself on ${PLAN_LABELS[before.plan]}. Contact us to arrange it.`);
    }
    /* Fix list item 6: switching WhatsApp on (or off) ends the old flat price; from now it is per person. */
    await this.prisma.organization.update({ where: { id: organizationId }, data: { whatsappAddOnOn: on, whatsappAddOnChangedAt: now, ...(on !== before.addOnOn ? { whatsappFlatAddOnKept: false } : {}) } });
    await this.syncTheStripeLine(organizationId, now);
    return this.standing(organizationId, now);
  }

  /**
   * THE STRIPE LINE FOLLOWS THE STANDING. Adds the add-on as a second item on the organisation's
   * subscription when it should be charged, moves it to the right plan's price when the plan
   * changed, and removes it when it should not be charged. Does nothing without a Stripe key.
   */
  async syncTheStripeLine(organizationId: string, now: Date = new Date()): Promise<'added' | 'moved' | 'removed' | 'unchanged' | 'no key'> {
    if (!this.stripe.isConfigured) return 'no key';
    const org = await this.prisma.organization.findUnique({ where: { id: organizationId }, select: ORG_FIELDS });
    if (!org) return 'unchanged';
    const s = await this.standing(organizationId, now);
    const flatId = org.whatsappAddOnItemId;
    const peopleId = org.whatsappPeopleItemId;
    let outcome: 'added' | 'moved' | 'removed' | 'unchanged' = 'unchanged';

    /* THE OLD FLAT LINE, only for an organisation that keeps it. */
    if (s.charged && s.flatKept && s.plan && org.subscriptionStripeId) {
      const priceId = await this.pricing.getOrCreateWhatsAppAddOnPrice(s.plan);
      if (flatId) {
        const item = await this.stripe.stripe.subscriptionItems.retrieve(flatId);
        if (item.price?.id !== priceId) {
          await this.stripe.stripe.subscriptionItems.update(flatId, { price: priceId, proration_behavior: 'create_prorations' });
          this.logger.log(`WhatsApp add-on for ${organizationId} moved to the ${s.plan} price.`);
          outcome = 'moved';
        }
      } else {
        const item = await this.stripe.stripe.subscriptionItems.create(
          { subscription: org.subscriptionStripeId, price: priceId, quantity: 1, proration_behavior: 'create_prorations', metadata: { organizationId, kind: WHATSAPP_ADD_ON_KIND } },
          { idempotencyKey: `wa_${organizationId}_${org.subscriptionStripeId}_${priceId}` },
        );
        await this.prisma.organization.update({ where: { id: organizationId }, data: { whatsappAddOnItemId: item.id } });
        this.logger.log(`WhatsApp add-on added to ${organizationId}'s subscription.`);
        outcome = 'added';
      }
    } else if (flatId) {
      if (org.subscriptionStripeId) {
        await this.stripe.stripe.subscriptionItems.del(flatId, { proration_behavior: 'create_prorations' }).catch((err: any) => {
          /* Already gone on Stripe's side is the same as removed. Anything else is thrown. */
          if (err?.code !== 'resource_missing') throw err;
        });
      }
      await this.prisma.organization.update({ where: { id: organizationId }, data: { whatsappAddOnItemId: null } });
      this.logger.log(`WhatsApp add-on removed from ${organizationId}'s subscription.`);
      outcome = 'removed';
    }

    /* WHATSAPP PER PERSON (fix list item 6): a metered line, told the number of people who used it this month, never more than the seats. */
    if (s.charged && !s.flatKept && s.plan && org.subscriptionStripeId) {
      const priceId = await this.pricing.getOrCreateWhatsAppPersonPrice(s.plan);
      let itemId = peopleId;
      if (itemId) {
        const item = await this.stripe.stripe.subscriptionItems.retrieve(itemId).catch(() => null);
        if (!item) itemId = null;
        else if (item.price?.id !== priceId) {
          /* A metered line cannot change its price with usage on it, so the old one goes and a new one comes. */
          await this.stripe.stripe.subscriptionItems.del(itemId, { proration_behavior: 'none', clear_usage: true } as any).catch((err: any) => {
            if (err?.code !== 'resource_missing') throw err;
          });
          itemId = null;
        }
      }
      if (!itemId) {
        const item = await this.stripe.stripe.subscriptionItems.create(
          { subscription: org.subscriptionStripeId, price: priceId, metadata: { organizationId, kind: WHATSAPP_PERSON_KIND } } as any,
          { idempotencyKey: `wap_${organizationId}_${org.subscriptionStripeId}_${priceId}` },
        );
        itemId = item.id;
        await this.prisma.organization.update({ where: { id: organizationId }, data: { whatsappPeopleItemId: itemId } });
        this.logger.log(`WhatsApp per person added to ${organizationId}'s subscription.`);
        if (outcome === 'unchanged') outcome = 'added';
      }
      await this.reportThePeople(itemId as string, s.peopleCharged, now);
      return outcome;
    }
    if (peopleId) {
      if (org.subscriptionStripeId) {
        /* Switched off: this month's WhatsApp people are not charged, as Plan and billing says ("switched off, $0"). */
        await this.stripe.stripe.subscriptionItems.del(peopleId, { proration_behavior: 'none', clear_usage: true } as any).catch((err: any) => {
          if (err?.code !== 'resource_missing') throw err;
        });
      }
      await this.prisma.organization.update({ where: { id: organizationId }, data: { whatsappPeopleItemId: null } });
      this.logger.log(`WhatsApp per person removed from ${organizationId}'s subscription.`);
      return 'removed';
    }
    return outcome;
  }

  /** Tells Stripe this month's count of people, replacing the last count (`last_during_period`). */
  private async reportThePeople(itemId: string, people: number, now: Date): Promise<void> {
    await (this.stripe.stripe.subscriptionItems as any).createUsageRecord(
      itemId,
      { quantity: people, timestamp: Math.floor(now.getTime() / 1000), action: 'set' },
    );
  }

  /**
   * EVERY HOUR, THE NUMBER OF PEOPLE ON WHATSAPP REACHES STRIPE, so a bill at the end of a month counts everybody who used it.
   * Once across every copy of the API.
   */
  @Cron('0 40 * * * *', { timeZone: 'UTC' })
  async hourly(): Promise<void> {
    await onceAcrossCopies(this.prisma, 'whatsapp-people-count', theHour(), async () => {
      const orgs = await this.prisma.organization.findMany({ where: { whatsappPeopleItemId: { not: null } }, select: { id: true } });
      for (const o of orgs) {
        await this.syncTheStripeLine(o.id).catch((err: any) => this.logger.error(`WhatsApp people for ${o.id} did not reach Stripe: ${err?.message}`));
      }
    });
  }

  /**
   * EVERY NIGHT, THE LINES THAT SHOULD HAVE CHANGED. A trial ends at a time nobody presses anything,
   * so this is what starts the add-on's charge once it has ended. Once across every copy of the API.
   */
  @Cron(CronExpression.EVERY_DAY_AT_1AM, { timeZone: 'UTC' })
  async nightly(): Promise<void> {
    await onceAcrossCopies(this.prisma, 'whatsapp-add-on-lines', theDay(), () => this.syncEveryLine());
  }

  async syncEveryLine(now: Date = new Date()): Promise<void> {
    const orgs = await this.prisma.organization.findMany({
      where: { OR: [{ whatsappAddOnOn: true, subscriptionStripeId: { not: null } }, { whatsappAddOnItemId: { not: null } }, { whatsappPeopleItemId: { not: null } }] },
      select: { id: true },
    });
    for (const o of orgs) {
      await this.syncTheStripeLine(o.id, now).catch((err: any) => this.logger.error(`WhatsApp add-on line for ${o.id} could not be brought up to date: ${err?.message}`));
    }
  }

  /**
   * WHAT PLAN AND BILLING SAYS ABOUT WHATSAPP, AS EACH READER MAY READ IT.
   *
   * An admin of the organisation reads all of it: the price on their plan, on or off, the trial,
   * this month's use against the limit, and what happens at the limit. Anybody else in it, a lead, a
   * member or a guest, reads only whether their check-ins go by WhatsApp, and why not.
   */
  async whatTheyRead(organizationId: string, isAdmin: boolean, now: Date = new Date()) {
    const s = await this.standing(organizationId, now);
    /* This read is about the organisation, not one check-in: when WhatsApp is not turned on it says the one sentence the other readers of the page say (B-007), not "this check-in stays in the app". */
    const personSays = s.heldBecause === 'not turned on' ? WHATSAPP_REMINDERS_ARE_OFF : s.heldBecause ? whatThePersonReads(s.heldBecause, now) : null;
    /* The price, the trial, the use and the limit are hidden at release (docs/deploy.md): an admin reads what everybody reads. */
    /*
     * A LEAD OR A PERSON IN A CHECK-IN READS WHY NOT, ON THEIR OWN READ (screens gap, 5 October). With the add-on off and
     * nothing held, they were served `sending: true` and nothing to say, while the three new WhatsApp messages (the
     * morning reminder, the reminder before a session and the lead's daily summary) go only where WhatsApp is turned on.
     * So they read that, plainly, and whether it is on.
     */
    const offSays = !s.addOnOn && !s.inTheFreeWhatsAppMonth ? WHATSAPP_REMINDERS_ARE_OFF : null;
    /*
     * THE WHATSAPP PART IS SHOWN TO AN ADMIN (Hafsah, 13 October 2026, evening: "This screen is meant to be there."). It
     * was hidden with the other new billing parts at release, and nobody could turn WhatsApp on from any screen. The
     * rest of those parts stay as the release setting says.
     */
    if (!isAdmin) return { sending: s.sending, says: personSays ?? offSays };
    void theNewBillingPartsAreShown;

    const label = s.plan ? PLAN_LABELS[s.plan] : null;
    const says: Record<string, string | null> = {
      onOrOff: s.addOnOn
        ? 'WhatsApp is on for your organisation.'
        : s.inTheFreeWhatsAppMonth
          ? 'WhatsApp is on for your organisation during its free month.'
          : 'WhatsApp is off for your organisation, so check-ins stay in the app.',
      /* The free month, in a sentence, with what keeps WhatsApp on after it. */
      freeMonth: s.inTheFreeWhatsAppMonth && s.whatsappFreeUntil
        ? (s.addOnOn
          ? `WhatsApp is free until ${aDay(s.whatsappFreeUntil)}. After that it is paid as part of your subscription.`
          : `WhatsApp is free until ${aDay(s.whatsappFreeUntil)}. To keep it after that, add it to your subscription with the switch above.`)
        : null,
      /* An organisation on the free plan has no plan to name: the plan its size fits only sets its monthly limit
         (release blocker, 5 October: the page read "on your Starter plan" to a free organisation). */
      /* Fix list item 6: the light prototype's own words, "$4 per person who uses it, per month, on any plan". The old flat
         price is said only to an organisation that keeps it. */
      price: s.onTheFreePlan
        ? null
        : s.flatKept && s.plan && s.addOnCents !== null
          ? `WhatsApp costs ${dollars(s.addOnCents)} a month on your ${label} plan, the price you have paid until now. It moves to ${s.personCents != null ? dollars(s.personCents) : 'a price'} per person who uses it if you add a seat, switch WhatsApp off and on, or move plan.`
          : s.plan && s.personCents != null
            ? `${dollars(s.personCents)} per person who uses it, per month, on any plan.`
            : s.plan ? `WhatsApp is not sold by itself on your ${label} plan. Contact us to arrange it.` : null,
      /* s73's WhatsApp card, word for word. */
      whoIsCharged: s.flatKept ? null : 'Charged only for people who use it',
      whoIsChargedMore: s.flatKept ? null : 'Anyone who checks in or gets messages on WhatsApp in a month. Never more than your number of people. Free during your free month.',
      people: s.addOnOn || s.inTheFreeWhatsAppMonth
        ? `${aNumber(s.peopleUsedIt)} ${s.peopleUsedIt === 1 ? 'person has' : 'people have'} used WhatsApp this month.`
        : null,
      charge: !s.switchOn
        ? 'Nothing is charged for WhatsApp at the moment.'
        : s.onTheFreePlan
          ? 'Nothing is charged for WhatsApp while you are on the free plan.'
          : s.inAFreeRun && s.freeTrial
            /* No date here: the plan line on the same page already says when it ends, and two calendars (the screen's and the server's UTC) gave two different days (clean-install run, 6 October). */
            ? `Your free trial lasts ${s.freeTrial.months} ${s.freeTrial.months === 1 ? 'month' : 'months'}. Nothing is charged for WhatsApp until it ends.`
            : s.inAFreeRun
              ? 'Nothing is charged for WhatsApp while your free months last.'
              : s.inTheFreeWhatsAppMonth && s.whatsappFreeUntil
                ? `Nothing is charged for WhatsApp until its free month ends on ${aDay(s.whatsappFreeUntil)}.`
              : s.charged
                ? (s.flatKept ? 'WhatsApp is added to your monthly bill as a second line.' : 'You pay only for people who use it, never more than your seats.')
                : s.addOnOn
                  ? 'WhatsApp is charged each month once you are on a paid plan.'
                  : 'If you switch WhatsApp on, you pay only for people who use it, never more than your seats.',
      use: s.limit !== null
        ? `Your organisation has sent ${aNumber(s.sent)} of its ${aNumber(s.limit)} WhatsApp messages this month.`
        : `Your organisation has sent ${aNumber(s.sent)} WhatsApp messages this month.`,
      atTheLimit: s.limit !== null
        ? `If your organisation sends all ${aNumber(s.limit)} messages in a month, nothing more is sent by WhatsApp until the next month begins. Check-ins carry on in the app, and you are told once.`
        : null,
      reachedTheLimit: s.heldBecause === 'at the limit' && s.limit !== null ? whatTheAdminIsToldAtTheLimit(s.limit, now) : null,
      held: personSays,
    };
    return {
      on: s.addOnOn,
      /* WHETHER WHATSAPP IS ON FOR THE ORGANISATION, ONE FACT FOR EVERY PAGE (local test of staging, 15 October). `on` is the
         add-on switch alone, so in the free month Connections read it and said "Your organisation has not turned on WhatsApp"
         while this page said "WhatsApp is on for your organisation during its free month". This is the fact `onOrOff` says. */
      onForTheOrganisation: s.addOnOn || s.inTheFreeWhatsAppMonth,
      /* Never a plan's name or price for an organisation on the free plan; its limit is in `use`. */
      plan: s.onTheFreePlan ? null : s.plan,
      price: s.onTheFreePlan ? null : s.flatKept ? (s.addOnCents === null ? null : { amountCents: s.addOnCents, currency: 'USD' }) : (s.personCents == null ? null : { amountCents: s.personCents, currency: 'USD', perPerson: true }),
      people: { usedIt: s.peopleUsedIt, charged: s.peopleCharged, seats: s.seats },
      flatKept: s.flatKept,
      charged: s.charged,
      freeTrial: s.freeTrial,
      freeUntil: s.inTheFreeWhatsAppMonth ? s.whatsappFreeUntil : null,
      onTheFreePlan: s.onTheFreePlan,
      use: { month: s.month, sent: s.sent, limit: s.limit, startsAgainOn: theNextMonthStarts(now) },
      sending: s.sending,
      heldBecause: s.heldBecause,
      says,
    };
  }
}
