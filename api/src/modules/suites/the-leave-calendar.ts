import type { PrismaService } from '../prisma/prisma.service';

/**
 * THE LEAVE CALENDAR AND THE DAYS LEFT: ONE SOURCE (Hafsah, 20 November 2026).
 *
 * "Ask if weekends, public holidays count as leave day ... do they have a multi country office with different holidays ... how does
 * annual leave accrue, when must you take it". Every surface that says how many days a request uses, or how many days are left,
 * reads these two functions: the leave board, the approver's queue, the over-allowance sentence, Ask's "how many days left" and the
 * say-back of a request.
 *
 *   - `leaveDaysUsed` counts the leave days between two days, both counted, by the person's calendar: the working week, whether
 *     the days off in between count, and the confirmed public holidays of their office, or of the organisation when they have none.
 *   - `daysLeftOf` is the balance of one type of leave, from its days a year, how it builds up (all at the start of the leave year,
 *     or month by month), the month the leave year starts, and what is carried over from last year and when that expires.
 *
 * NOTHING CHANGES BY ITSELF. With nothing set, the calendar is Monday to Friday with no holidays, the leave year is the calendar
 * year, everything is given at the start and nothing is carried over: exactly how leave was counted before this.
 */

export type Day = string;

export interface ACalendar {
  /** The weekdays people work, 0 for Sunday to 6 for Saturday. */
  workingWeek: number[];
  /** Whether the days off in between (a weekend) count as leave days. */
  weekendsCount: boolean;
  /** Whether a public holiday inside the leave counts as a leave day. */
  holidaysCount: boolean;
  /** The confirmed public holidays that apply to this person. */
  holidays: Set<Day>;
}

export const MONDAY_TO_FRIDAY = [1, 2, 3, 4, 5];
export const THE_USUAL_CALENDAR: ACalendar = { workingWeek: MONDAY_TO_FRIDAY, weekendsCount: false, holidaysCount: false, holidays: new Set() };

const DAY_MS = 86_400_000;
const at = (d: Date | Day) => (typeof d === 'string' ? new Date(`${d}T00:00:00.000Z`) : d).getTime();
export const dayOf = (t: number | Date) => new Date(t).toISOString().slice(0, 10);

/**
 * The leave days a request uses, from the first day to the last, both counted. A type of leave that counts every day (maternity
 * leave in many policies) counts weekends and holidays whatever the organisation's rule.
 */
export function leaveDaysUsed(cal: ACalendar, from: Date | Day, to: Date | Day, kind?: { everyDay?: boolean } | null): number {
  const every = !!kind?.everyDay;
  let n = 0;
  for (let t = at(from); t <= at(to); t += DAY_MS) {
    if (!every && !cal.weekendsCount && !cal.workingWeek.includes(new Date(t).getUTCDay())) continue;
    if (!every && !cal.holidaysCount && cal.holidays.has(dayOf(t))) continue;
    n++;
  }
  return n;
}

/** The last day of a stretch that uses `days` leave days from `from`, by the calendar: maternity leave of 90 days from 3 March. */
export function theLastDayAfter(cal: ACalendar, from: Day, days: number, kind?: { everyDay?: boolean } | null): Day {
  let t = at(from);
  let counted = 0;
  for (let i = 0; i < 800 && days > 0; i++, t += DAY_MS) {
    counted += leaveDaysUsed(cal, dayOf(t), dayOf(t), kind);
    if (counted >= days) return dayOf(t);
  }
  return dayOf(t);
}

// ------------------------------------------------ the calendars of an organisation ------------------------------------------------

/** What of the leave rules the calendar reads. */
export interface TheCalendarRules {
  workingWeek?: number[];
  weekendsCount?: boolean;
  holidaysCount?: boolean;
}

export interface LeaveCalendars {
  /** The calendar of one person: their office's holidays, or the organisation's own when they have no office. */
  of(userId: string): ACalendar;
  /** The office one person works from, or null. */
  officeOf(userId: string): { id: string; name: string; country: string } | null;
}

export function calendarFrom(rules: TheCalendarRules | null | undefined, holidays: Iterable<Day> = []): ACalendar {
  const week = Array.isArray(rules?.workingWeek) && rules!.workingWeek.length ? rules!.workingWeek : MONDAY_TO_FRIDAY;
  return { workingWeek: week, weekendsCount: !!rules?.weekendsCount, holidaysCount: !!rules?.holidaysCount, holidays: new Set(holidays) };
}

/** Every calendar of the organisation, read once: its offices, who works from each, and its confirmed public holidays. */
export async function readLeaveCalendars(prisma: PrismaService, organizationId: string, rules: TheCalendarRules | null | undefined): Promise<LeaveCalendars> {
  const p = prisma as any;
  const [offices, holidays] = await Promise.all([
    Promise.resolve(p.leaveOffice?.findMany?.({ where: { organizationId }, select: { id: true, name: true, country: true } })).catch(() => null),
    Promise.resolve(p.publicHoliday?.findMany?.({ where: { organizationId, confirmed: true }, select: { officeId: true, on: true } })).catch(() => null),
  ]);
  /* Who works from which office is read only when there are offices. */
  const ties = offices?.length
    ? await Promise.resolve(p.organizationMembership?.findMany?.({ where: { organizationId, officeId: { not: null } }, select: { userId: true, officeId: true } })).catch(() => null)
    : null;
  const byOffice = new Map<string, Day[]>();
  for (const h of (holidays ?? []) as { officeId: string | null; on: Date }[]) {
    const k = h.officeId ?? '';
    byOffice.set(k, [...(byOffice.get(k) ?? []), dayOf(h.on)]);
  }
  const office = new Map(((offices ?? []) as { id: string; name: string; country: string }[]).map((o) => [o.id, o] as const));
  const tie = new Map(((ties ?? []) as { userId: string; officeId: string }[]).filter((t) => office.has(t.officeId)).map((t) => [t.userId, t.officeId] as const));
  const cals = new Map<string, ACalendar>();
  const calOf = (k: string) => {
    if (!cals.has(k)) cals.set(k, calendarFrom(rules, byOffice.get(k) ?? []));
    return cals.get(k)!;
  };
  return {
    of: (userId) => calOf(tie.get(userId) ?? ''),
    officeOf: (userId) => office.get(tie.get(userId) ?? '') ?? null,
  };
}

/** The calendars when nothing is set: Monday to Friday, no holidays, for everybody. */
export const THE_USUAL_CALENDARS: LeaveCalendars = { of: () => THE_USUAL_CALENDAR, officeOf: () => null };

// ------------------------------------------------ the leave year and the days left ------------------------------------------------

/** How the days of one type of leave are given, and what is carried over. */
export interface ABalanceRule {
  /** Days a year, or null for no set number. */
  perYear: number | null;
  /** All at the start of the leave year (the default), or built up at the end of each month. */
  accrual?: 'start' | 'monthly';
  /** The month the leave year starts, 1 for January (the default) to 12. */
  yearStarts?: number;
  /** Days that may be carried into the next leave year: none (the default), up to a number, or all. */
  carryOver?: number | 'all';
  /** Carried-over days must be used by the end of this month of the new leave year, 1 to 12, or they are lost. None: they never expire. */
  carryExpires?: number | null;
  /** Leave left is carried over only from leave years that start on or after this day: the leave year after the rule was set. */
  carryFrom?: Day | null;
}

const ymd = (d: Day) => ({ y: Number(d.slice(0, 4)), m: Number(d.slice(5, 7)), d: Number(d.slice(8, 10)) });
const firstOf = (y: number, m: number) => dayOf(Date.UTC(y, m - 1, 1));
const lastOf = (y: number, m: number) => dayOf(Date.UTC(y, m, 0));

/** The leave year a day falls in, from its first day to its last. */
export function theLeaveYear(on: Day, yearStarts = 1): { from: Day; to: Day } {
  const s = Math.min(12, Math.max(1, Math.round(yearStarts || 1)));
  const { y, m } = ymd(on);
  const startY = m >= s ? y : y - 1;
  const from = firstOf(startY, s);
  return { from, to: dayOf(at(firstOf(startY + 1, s)) - DAY_MS) };
}

/** The day carried-over days expire: the last day of that month, the first time it comes round in the leave year. */
export function theCarryExpiry(year: { from: Day }, month: number): Day {
  const { y, m } = ymd(year.from);
  return lastOf(month >= m ? y : y + 1, month);
}

export interface ATakenStretch { startsOn: Date | Day; endsOn: Date | Day; everyDay?: boolean }

/** Leave days of these stretches that fall between two days, both counted. */
function usedBetween(cal: ACalendar, taken: ATakenStretch[], from: Day, to: Day): number {
  let n = 0;
  for (const r of taken) {
    const a = Math.max(at(r.startsOn), at(from));
    const b = Math.min(at(r.endsOn), at(to));
    if (b >= a) n += leaveDaysUsed(cal, dayOf(a), dayOf(b), { everyDay: r.everyDay });
  }
  return n;
}

/** Days earned in a leave year by a day: all of them at the start, or a twelfth for each month that has ended, to the half day. */
function earnedBy(rule: ABalanceRule, year: { from: Day; to: Day }, asOf: Day): number {
  const perYear = rule.perYear ?? 0;
  if (rule.accrual !== 'monthly' || asOf >= year.to) return perYear;
  const a = ymd(year.from), b = ymd(asOf);
  const months = Math.max(0, (b.y - a.y) * 12 + (b.m - a.m) + (asOf === lastOf(b.y, b.m) ? 1 : 0));
  return Math.min(perYear, Math.floor(((perYear * months) / 12) * 2) / 2);
}

/** Days carried into a leave year from the one before, as far as they are kept on `asOf`. */
function carriedInto(rule: ABalanceRule, cal: ACalendar, taken: ATakenStretch[], year: { from: Day; to: Day }, asOf: Day, depth = 2): number {
  if (!rule.carryOver || depth < 0) return 0;
  const before = theLeaveYear(dayOf(at(year.from) - DAY_MS), rule.yearStarts);
  if (rule.carryFrom && before.from < rule.carryFrom) return 0;
  const leftover = Math.max(0, (rule.perYear ?? 0) + carriedInto(rule, cal, taken, before, before.to, depth - 1) - usedBetween(cal, taken, before.from, before.to));
  const carried = rule.carryOver === 'all' ? leftover : Math.min(rule.carryOver, leftover);
  if (!rule.carryExpires) return carried;
  const expires = theCarryExpiry(year, rule.carryExpires);
  if (asOf <= expires) return carried;
  /* After it expires, only what was used of it by then is kept: leave taken in the year is taken from the carried days first. */
  return Math.min(carried, usedBetween(cal, taken, year.from, expires));
}

/**
 * The days left of one type of leave on a day, after the approved stretches of that type, by the person's calendar. Null when the
 * type has no set number of days a year.
 */
export function daysLeftOf(rule: ABalanceRule, cal: ACalendar, taken: ATakenStretch[], asOf: Day): number | null {
  if (rule.perYear == null) return null;
  const year = theLeaveYear(asOf, rule.yearStarts);
  const left = earnedBy(rule, year, asOf) + carriedInto(rule, cal, taken, year, asOf) - usedBetween(cal, taken, year.from, year.to);
  return Math.max(0, left);
}

/** The days carried over into the leave year of `asOf` and still kept then, for saying it: "including 3 carried over from last year". */
export function daysCarriedOf(rule: ABalanceRule, cal: ACalendar, taken: ATakenStretch[], asOf: Day): number {
  if (rule.perYear == null) return 0;
  return carriedInto(rule, cal, taken, theLeaveYear(asOf, rule.yearStarts), asOf);
}
