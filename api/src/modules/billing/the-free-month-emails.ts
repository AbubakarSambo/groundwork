import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { PricingService, freePlanApplies } from './pricing.service';
import { BillingService } from './billing.service';
import { dollarsOf, type AMonth } from './what-a-month-costs';
import { whatCoversThem } from '../../common/subscription';
import { whenItWas } from '../../common/a-date-reads-the-same-everywhere';
import { theOrganisationsZone, THE_PRODUCTS_OWN_ZONE, isAZone } from '../../common/the-organisations-own-day';
import { onceAcrossCopies, theHour } from '../prisma/once-across-copies';
import { hasBeenToldOnce, nowToldOnce, isAlreadyHeld } from '../engagement/a-message-sent-once';
import { theirRoutineMessagesToday } from '../engagement/one-routine-message-a-day';

/**
 * THE FREE MONTH'S TWO EMAILS (Hafsah, 15 October 2026).
 *
 *   1. Three days before an organisation's free month ends, counted in the organisation's own day: what it will pay from
 *      then, worked out exactly as Plan and billing works out a month (the plan, each extra seat, WhatsApp for each person
 *      who used it, and the total), and the link to Plan and billing.
 *   2. Once the free month has ended: what happens now, and the same link.
 *
 * To the organisation's admins, by name. Only while `pricing.freeTrial` is on (it goes on at production's release), and
 * only for a free month: the free trial's (`freeTrialStartedAt`) or the month every organisation already here was given
 * (`freeMonthOfReleaseAt`). A free run given by hand is not a free month and is not written about.
 *
 * ONCE. Each admin is sent each email once for each free month (its end day is in the key), remembered in the
 * once-only record (`a-message-sent-once.ts`) only when it went or is held to go. ONE A DAY. Each is that admin's one
 * routine message that day: an admin who has already had one today is not sent it, and is tried again on a later run.
 * The sweep runs every hour and writes only in the organisation's working day (9 in the morning to 6 in the evening).
 */
export const ENDS_SOON = 'sendFreeMonthEndsSoon';
export const ENDED = 'sendFreeMonthEnded';
const DAYS_BEFORE = 3;
/** An ended free month is written about for a week after it ended, and never later: a month that ended long ago is old news. */
const ENDED_FOR_DAYS = 7;
const FIRST_HOUR = 9;
const LAST_HOUR = 18;
const DAY = 24 * 3600 * 1000;

/** The day in this zone, as a number of days, so two days can be subtracted. */
function theLocalDay(at: Date, zone: string): number {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(at);
  const n = (t: string) => Number(p.find((x) => x.type === t)?.value);
  return Date.UTC(n('year'), n('month') - 1, n('day')) / DAY;
}

function theLocalHour(at: Date, zone: string): number {
  return Number(new Intl.DateTimeFormat('en-GB', { timeZone: zone, hour: '2-digit', hourCycle: 'h23' }).format(at));
}

/** How many of the organisation's days are left until its free month ends: 3 on the day three days before. */
export function daysLeftInItsDay(until: Date, now: Date, zone: string): number {
  return theLocalDay(until, zone) - theLocalDay(now, zone);
}

const people = (n: number) => `${n} ${n === 1 ? 'person' : 'people'}`;

/** What a month will cost, in sentences, from the same lines Plan and billing shows. */
export function whatItWillCost(orgName: string, after: { month: AMonth; planLabel: string; people: number }): string[] {
  const m = after.month;
  const out: string[] = [];
  out.push(m.included === null
    ? `${orgName} has ${people(after.people)}. The ${after.planLabel} plan is ${dollarsOf(m.planCents)} a month.`
    : `${orgName} has ${people(after.people)}. The ${after.planLabel} plan is ${dollarsOf(m.planCents)} a month, and it includes ${m.included} seats.`);
  if (m.extraSeats > 0) {
    out.push(`You have ${m.extraSeats} ${m.extraSeats === 1 ? 'seat' : 'seats'} more than that, at ${dollarsOf(m.extraSeatCents)} each, which is ${dollarsOf(m.extraSeatsCents)} a month.`);
  }
  if (m.whatsappOn) {
    out.push(m.whatsappFlatCents !== null
      ? `WhatsApp stays at the price you have paid until now, which is ${dollarsOf(m.whatsappFlatCents)} a month.`
      : `WhatsApp is ${dollarsOf(m.whatsappPersonCents)} a month for each person who uses it. ${m.whatsappPeople === 1 ? '1 person has used it' : `${m.whatsappPeople} people have used it`} this month, which is ${dollarsOf(m.whatsappCents)}.`);
  }
  out.push(`That is ${dollarsOf(m.totalCents)} a month in all.`);
  return out;
}

/**
 * What happens once the free month is over and nobody has chosen a plan, as the gates decide it: an organisation the free
 * plan still applies to moves to it; one it has stopped for (new since the trial's switch went on) is paused until it
 * subscribes. `when` is 'ahead' for the reminder and 'now' once the month has ended.
 */
export function whatHappensWithoutAPlan(
  orgName: string,
  when: 'ahead' | 'now',
  free: { applies: boolean; checkIns: number; people: number },
  seats: number,
): string {
  const ahead = when === 'ahead';
  const tooMany = `${orgName} has ${seats} people, which is more than the free plan covers, so choose a plan for all of them.`;
  if (!free.applies) {
    return ahead
      ? `If you do not choose a plan by then, check-ins at ${orgName} will pause until you do. Nothing is deleted, and every record stays readable.`
      : `Check-ins at ${orgName} are paused until you choose a plan. Nothing is deleted, and every record stays readable.`;
  }
  const lead = ahead ? `If you do not choose a plan by then, ${orgName} moves to the free plan` : `${orgName} is on the free plan now`;
  return seats <= free.people
    ? `${lead}, which keeps ${free.checkIns} check-ins free for teams of ${free.people} or fewer people.`
    : `${lead}, which is for teams of ${free.people} or fewer people. ${tooMany}`;
}

export interface TheWords { subject: string; lines: string[]; linkLabel: string }

export function theReminder(a: { firstName: string | null; orgName: string; endsOn: string; daysLeft: number; cost: string[] | null; withoutAPlan: string }): TheWords {
  const when = a.daysLeft <= 0 ? 'today' : a.daysLeft === 1 ? 'tomorrow' : `in ${a.daysLeft} days`;
  return {
    subject: `Your free month ends on ${a.endsOn}`,
    lines: [
      a.firstName ? `Hello ${a.firstName},` : 'Hello,',
      `Your free month at ${a.orgName} ends on ${a.endsOn}, ${when}.`,
      ...(a.cost ? ['To keep everything running from then, this is what you will pay each month.', ...a.cost] : []),
      `Nothing is charged until you choose a plan. ${a.withoutAPlan}`,
      'You can choose a plan, and see every plan, on Plan and billing.',
    ],
    linkLabel: 'Open Plan and billing',
  };
}

export function theEnding(a: { firstName: string | null; orgName: string; endedOn: string; cost: string[] | null; withoutAPlan: string }): TheWords {
  return {
    subject: `Your free month at ${a.orgName} has ended`,
    lines: [
      a.firstName ? `Hello ${a.firstName},` : 'Hello,',
      `Your free month at ${a.orgName} ended on ${a.endedOn}. Nothing has been charged.`,
      a.withoutAPlan,
      ...(a.cost ? ['This is what you will pay each month when you choose a plan.', ...a.cost] : []),
      'You can choose a plan, and see every plan, on Plan and billing.',
    ],
    linkLabel: 'Open Plan and billing',
  };
}

@Injectable()
export class TheFreeMonthEmails {
  private readonly logger = new Logger(TheFreeMonthEmails.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pricing: PricingService,
    private readonly billing: BillingService,
    private readonly email: EmailService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR, { timeZone: 'UTC' })
  async everyHour(): Promise<void> {
    await onceAcrossCopies(this.prisma, 'free-month-emails', theHour(), () => this.sweep());
  }

  /** One pass. Says how many emails it sent or held, for the tests and the log. */
  async sweep(now: Date = new Date()): Promise<{ endsSoon: number; ended: number }> {
    const done = { endsSoon: 0, ended: 0 };
    const trial = await this.pricing.getFreeTrial().catch(() => null);
    if (!trial?.on) return done;
    const orgs = await this.prisma.organization.findMany({
      where: {
        freeUntil: { gt: new Date(now.getTime() - ENDED_FOR_DAYS * DAY), lt: new Date(now.getTime() + (DAYS_BEFORE + 2) * DAY) },
        freePlan: { not: null },
        OR: [{ freeTrialStartedAt: { not: null } }, { freeMonthOfReleaseAt: { not: null } }],
      },
      select: { id: true, name: true, createdAt: true, freeUntil: true, subscriptionPlan: true, subscriptionStatus: true },
    });
    for (const org of orgs) {
      try {
        const r = await this.forOne(org as any, trial, now);
        if (r === ENDS_SOON) done.endsSoon++;
        if (r === ENDED) done.ended++;
      } catch (err: any) {
        this.logger.warn(`The free-month email for ${org.id} could not be sent: ${err?.message}`);
      }
    }
    return done;
  }

  private async forOne(
    org: { id: string; name: string | null; createdAt: Date; freeUntil: Date; subscriptionPlan: unknown; subscriptionStatus: string | null },
    trial: Awaited<ReturnType<PricingService['getFreeTrial']>>,
    now: Date,
  ): Promise<string | null> {
    /* A team that has subscribed pays as it chose; there is nothing to tell it about the free month. */
    if (whatCoversThem(org as any, now).covers === 'paid') return null;
    const named = await theOrganisationsZone(this.prisma as any, org.id).catch(() => null);
    const zone = isAZone(named) ? named : THE_PRODUCTS_OWN_ZONE;
    const hour = theLocalHour(now, zone);
    if (hour < FIRST_HOUR || hour >= LAST_HOUR) return null;

    const until = new Date(org.freeUntil);
    const ended = until.getTime() <= now.getTime();
    const daysLeft = daysLeftInItsDay(until, now, zone);
    if (!ended && daysLeft > DAYS_BEFORE) return null;
    if (ended && now.getTime() - until.getTime() > ENDED_FOR_DAYS * DAY) return null;
    const kind = ended ? ENDED : ENDS_SOON;

    const orgName = org.name?.trim() || 'your organisation';
    const day = whenItWas(until, 'dayAndMonthLong', zone);
    const after = await this.billing.theMonthAfterTheFreeMonth(org.id).catch(() => null);
    const cost = after ? whatItWillCost(orgName, after) : null;
    const seats = after?.people ?? (await this.billing.seatsTaken(org.id));
    const withoutAPlan = whatHappensWithoutAPlan(
      orgName,
      ended ? 'now' : 'ahead',
      { applies: freePlanApplies(trial, org.createdAt), checkIns: await this.pricing.getFreeGroundLimit(), people: await this.pricing.getFreeMemberLimit() },
      seats,
    );

    const admins = await this.prisma.user.findMany({
      where: { organizationId: org.id, role: UserRole.ADMIN, deletedAt: null },
      select: { id: true, email: true, firstName: true },
    });
    let any = false;
    for (const admin of admins) {
      if (!admin.email) continue;
      const what = `free-month.${kind}.${org.id}.${until.toISOString().slice(0, 10)}.${admin.id}`;
      if (await hasBeenToldOnce(this.prisma, what)) continue;
      if (await isAlreadyHeld(this.prisma, kind, admin.email)) continue;
      /* Their one routine message today has gone already: tried again on a later run, not counted as told. */
      const had = await theirRoutineMessagesToday(this.prisma as any, { email: admin.email }, now);
      if (had.email + had.whatsapp >= 1) continue;
      const firstName = admin.firstName?.trim() || null;
      const words = ended
        ? theEnding({ firstName, orgName, endedOn: day, cost, withoutAPlan })
        : theReminder({ firstName, orgName, endsOn: day, daysLeft, cost, withoutAPlan });
      const went = ended
        ? await this.email.sendFreeMonthEnded(admin.email, words.subject, words.lines, words.linkLabel)
        : await this.email.sendFreeMonthEndsSoon(admin.email, words.subject, words.lines, words.linkLabel);
      await nowToldOnce(this.prisma, what, went, { sender: kind, to: admin.email });
      if (went !== 'suppressed') any = true;
    }
    return any ? kind : null;
  }
}
