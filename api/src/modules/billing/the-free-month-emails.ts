import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { PricingService } from './pricing.service';
import { BillingService } from './billing.service';
import { dollarsOf, type AMonth } from './what-a-month-costs';
import { whereTheTrialStands, WHAT_COVER_READS, type TheGrace } from '../../common/subscription';
import { theGraceInForce, theGraceSetting, filledIn, theTimeLeft, TOLD_ABOUT_PAYING, type TheGraceWords, type TrialGraceSetting } from './the-trial-grace';
import { whenItWas } from '../../common/a-date-reads-the-same-everywhere';
import { theOrganisationsZone, THE_PRODUCTS_OWN_ZONE, isAZone } from '../../common/the-organisations-own-day';
import { onceAcrossCopies, theHour } from '../prisma/once-across-copies';
import { hasBeenToldOnce, nowToldOnce, isAlreadyHeld } from '../engagement/a-message-sent-once';
import { theirRoutineMessagesToday } from '../engagement/one-routine-message-a-day';

/**
 * THE FREE MONTH'S EMAILS, AND THE FOUR WEEKS AFTER IT (Hafsah, 15 October and 2 November 2026).
 *
 *   1. Three days before an organisation's free month ends, counted in the organisation's own day: what it will pay from
 *      then, worked out exactly as Plan and billing works out a month (the plan, each extra seat, WhatsApp for each person
 *      who used it, and the total), and the link to Plan and billing. To its admins, and the admin's one routine message that day.
 *   2. Once the free month has ended, the four weeks (`pricing.trialGrace`, see the-trial-grace.ts): everything keeps working,
 *      and the admins and leads are told how long is left and how to pay. One email a week, at the start of each week, and
 *      one a day in the last week, counting down ("Groundwork pauses in 5 days") to the last day. Then Groundwork pauses, and
 *      nothing more is sent about it. Team members are told nothing.
 *
 * Only while `pricing.freeTrial` is on (it goes on at production's release), and only for a free month: the free trial's
 * (`freeTrialStartedAt`) or the month every organisation already here was given (`freeMonthOfReleaseAt`). A free run given by
 * hand is not a free month and is not written about. Where the organisation stands is `whereTheTrialStands`, the same answer
 * every gate and door reads.
 *
 * ONCE. Each person is sent each email once (the week, or the day, is in the key), remembered in the once-only record
 * (`a-message-sent-once.ts`) only when it went or is held to go. The sweep runs every hour and writes only in the
 * organisation's working day (from the setting's hour, 9 by default, to 6 in the evening).
 */
export const ENDS_SOON = 'sendFreeMonthEndsSoon';
export const PAUSES_SOON = 'sendGroundworkPausesSoon';
const DAYS_BEFORE = 3;
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

/** What happens once the free month is over and nobody has chosen a plan: the four weeks, then the pause. */
export function whatHappensWithoutAPlan(orgName: string, weeks: number): string {
  return `If you do not choose a plan by then, everything at ${orgName} keeps working for ${theTimeLeft(weeks * 7)} after that, and then Groundwork pauses until you do. Nothing is deleted.`;
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

/**
 * THE FOUR WEEKS' EMAIL, from the setting's words. `daysLeft` is counted in the organisation's own days to the day it pauses.
 * A week's email before the last days, a day's email in them, and the last day's on the day before the pause.
 */
export function thePausesSoonEmail(a: {
  firstName: string | null; orgName: string; endedOn: string; pausesOn: string; daysLeft: number; dailyForTheLastDays: number;
  isAdmin: boolean; adminNames: string | null; words: TheGraceWords;
}): TheWords {
  const w = a.words;
  const blanks = { organisation: a.orgName, endDay: a.endedOn, pauseDay: a.pausesOn, days: a.daysLeft, timeLeft: theTimeLeft(a.daysLeft), admins: a.adminNames || `An admin at ${a.orgName}` };
  const last = a.daysLeft <= 1;
  const daily = a.daysLeft <= a.dailyForTheLastDays;
  const subject = last ? w.lastDaySubject : daily ? w.daySubject : w.weekSubject;
  const opening = last ? w.lastDayOpening : daily ? w.dayOpening : w.weekOpening;
  return {
    subject: filledIn(subject, blanks),
    lines: [
      a.firstName ? `Hello ${a.firstName},` : 'Hello,',
      filledIn(opening, blanks),
      filledIn(w.whilePaused, blanks),
      filledIn(a.isAdmin ? w.howToPayAdmin : w.howToPayLead, blanks),
    ],
    linkLabel: filledIn(w.linkLabel, blanks),
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

  /** One pass. Says how many organisations were written to, for the tests and the log. */
  async sweep(now: Date = new Date()): Promise<{ endsSoon: number; pausesSoon: number }> {
    const done = { endsSoon: 0, pausesSoon: 0 };
    const trial = await this.pricing.getFreeTrial().catch(() => null);
    if (!trial?.on) return done;
    const [grace, setting] = await Promise.all([theGraceInForce(this.prisma), theGraceSetting(this.prisma)]);
    /* Nothing can be paid for yet (23 November 2026): no email asks anybody to choose a plan or warns of a pause. */
    if (grace?.payingIsPossible === false) return done;
    /* Every organisation whose free month ends within the next few days or ended within its four weeks. The four weeks may have
       started later than the month's end (`notBefore`), so then every ended month is read and the arithmetic decides. */
    const weeksAgo = new Date(now.getTime() - (setting.weeks * 7 + 1) * DAY);
    const stillInTheirWeeks = grace?.notBefore && now.getTime() < grace.notBefore.getTime() + setting.weeks * 7 * DAY;
    const orgs = await this.prisma.organization.findMany({
      where: {
        freeUntil: { ...(stillInTheirWeeks ? {} : { gt: weeksAgo }), lt: new Date(now.getTime() + (DAYS_BEFORE + 2) * DAY) },
        freePlan: { not: null },
        OR: [{ freeTrialStartedAt: { not: null } }, { freeMonthOfReleaseAt: { not: null } }],
      },
      select: { id: true, name: true, createdAt: true, ...WHAT_COVER_READS },
    });
    for (const org of orgs) {
      try {
        const r = await this.forOne(org as any, grace, setting, now);
        if (r === ENDS_SOON) done.endsSoon++;
        if (r === PAUSES_SOON) done.pausesSoon++;
      } catch (err: any) {
        this.logger.warn(`The free-month email for ${org.id} could not be sent: ${err?.message}`);
      }
    }
    return done;
  }

  private async forOne(org: any, grace: TheGrace | null, setting: TrialGraceSetting, now: Date): Promise<string | null> {
    const where = whereTheTrialStands(org, grace, now);
    if (where.stands !== 'in its trial' && where.stands !== 'after its trial') return null;
    const named = await theOrganisationsZone(this.prisma as any, org.id).catch(() => null);
    const zone = isAZone(named) ? named : THE_PRODUCTS_OWN_ZONE;
    const hour = theLocalHour(now, zone);
    if (hour < setting.fromHour || hour >= LAST_HOUR) return null;
    const orgName = org.name?.trim() || 'your organisation';
    return where.stands === 'in its trial'
      ? this.theMonthEndsSoon(org, orgName, zone, setting, now)
      : this.groundworkPausesSoon(org, orgName, zone, setting, where.trialEnded!, where.pausesAt!, now);
  }

  /** Three days before the free month ends: what it will cost, to the admins. The admin's one routine message that day. */
  private async theMonthEndsSoon(org: any, orgName: string, zone: string, setting: TrialGraceSetting, now: Date): Promise<string | null> {
    const until = new Date(org.freeUntil);
    const daysLeft = daysLeftInItsDay(until, now, zone);
    if (daysLeft > DAYS_BEFORE) return null;
    const day = whenItWas(until, 'dayAndMonthLong', zone);
    const after = await this.billing.theMonthAfterTheFreeMonth(org.id).catch(() => null);
    const cost = after ? whatItWillCost(orgName, after) : null;
    const withoutAPlan = whatHappensWithoutAPlan(orgName, setting.weeks);

    const admins = await this.prisma.user.findMany({
      where: { organizationId: org.id, role: UserRole.ADMIN, deletedAt: null },
      select: { id: true, email: true, firstName: true },
    });
    let any = false;
    for (const admin of admins) {
      const what = `free-month.${ENDS_SOON}.${org.id}.${until.toISOString().slice(0, 10)}.${admin.id}`;
      if (await hasBeenToldOnce(this.prisma, what)) continue;
      if (await isAlreadyHeld(this.prisma, ENDS_SOON, admin.email)) continue;
      /* Their one routine message today has gone already: tried again on a later run, not counted as told. */
      const had = await theirRoutineMessagesToday(this.prisma as any, { email: admin.email }, now);
      if (had.email + had.whatsapp >= 1) continue;
      const words = theReminder({ firstName: admin.firstName?.trim() || null, orgName, endsOn: day, daysLeft, cost, withoutAPlan });
      const went = await this.email.sendFreeMonthEndsSoon(admin.email, words.subject, words.lines, words.linkLabel);
      await nowToldOnce(this.prisma, what, went, { sender: ENDS_SOON, to: admin.email });
      if (went !== 'suppressed') any = true;
    }
    return any ? ENDS_SOON : null;
  }

  /**
   * THE FOUR WEEKS: one email at the start of each week before the last days, then one a day, to the admins and the leads. A week's
   * email missed on its first day (out of hours, or the sweep did not run) goes on the next run that week; a day's email goes that
   * day or not at all, so the number of days it says is always true.
   */
  private async groundworkPausesSoon(org: any, orgName: string, zone: string, setting: TrialGraceSetting, endedAt: Date, pausesAt: Date, now: Date): Promise<string | null> {
    const daysLeft = daysLeftInItsDay(pausesAt, now, zone);
    if (daysLeft <= 0) return null;
    const startedAt = new Date(pausesAt.getTime() - setting.weeks * 7 * DAY);
    const which = daysLeft <= setting.dailyForTheLastDays
      ? `day-${daysLeft}`
      : `week-${Math.floor(daysLeftInItsDay(now, startedAt, zone) / 7) + 1}`;
    const pausesOn = whenItWas(pausesAt, 'dayAndMonthLong', zone);
    const endedOn = whenItWas(endedAt, 'dayAndMonthLong', zone);

    const people = await this.prisma.user.findMany({
      where: TOLD_ABOUT_PAYING(org.id),
      select: { id: true, email: true, firstName: true, lastName: true, role: true },
    });
    const adminNames = theNamesOf(people.filter((p: any) => p.role === UserRole.ADMIN));
    let any = false;
    for (const person of people) {
      const what = `trial-grace.${org.id}.${pausesAt.toISOString().slice(0, 10)}.${which}.${person.id}`;
      if (await hasBeenToldOnce(this.prisma, what)) continue;
      const words = thePausesSoonEmail({
        firstName: person.firstName?.trim() || null, orgName, endedOn, pausesOn, daysLeft, dailyForTheLastDays: setting.dailyForTheLastDays,
        isAdmin: person.role === UserRole.ADMIN, adminNames, words: setting.words,
      });
      const went = await this.email.sendGroundworkPausesSoon(person.email, words.subject, words.lines, words.linkLabel);
      await nowToldOnce(this.prisma, what, went, { sender: PAUSES_SOON, to: person.email });
      if (went !== 'suppressed') any = true;
    }
    return any ? PAUSES_SOON : null;
  }
}

/** "Grace Achieng", "Grace Achieng and Otieno", "Grace, Otieno and Wanjiru". Null when nobody has a name. */
function theNamesOf(people: { firstName?: string | null; lastName?: string | null }[]): string | null {
  const names = people.map((p) => [p.firstName, p.lastName].filter((x) => x && x.trim()).join(' ').trim()).filter(Boolean);
  if (!names.length) return null;
  return names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}
