import type { PrismaService } from '../prisma/prisma.service';
import { whenItWas } from '../../common/a-date-reads-the-same-everywhere';
import { workingDays, type Day } from './the-leave-board.service';
import { whoApprovesFor } from './who-approves';
import { theirRosterEntries, theirRosterEntry } from './a-roster-entry-and-its-sign-in';

/**
 * LEAVE DATES SAID IN CHAT GO TO THE LEAVE SUITE, NEVER TO THE RECORD (week 20, request 21).
 *
 * "I need next Thursday and Friday off", said in the setup conversation or to Ask Groundwork, is a
 * request for time off. It is said back with the exact days, the days left and who else is off, and
 * it is sent to the person who approves it only after a yes. Nothing about it is kept as context, in
 * a check-in's record, in a report or as organisation memory, and no reason is asked for or kept.
 * While the leave suite is off it says so plainly and keeps nothing.
 *
 * THE DAYS ARE READ BY RULES, NOT BY A MODEL, because a day nobody asked for is the worst way to be
 * wrong here (audit A2). Anything that is not certain is not guessed: "Monday and Wednesday" could
 * mean Tuesday as well, and is not read at all, so it is asked again.
 */

export const LEAVE_SUITE_OFF = 'Leave requests are not switched on in your organisation, so I have not sent or kept these dates. An admin can switch them on under Suites.';
export const LEAVE_NOT_SENT = 'I have not sent it. Nothing was kept.';
export const LEAVE_NOTHING_WAITING = 'There is no leave request waiting to be sent. Tell me the days again and I will ask.';
/** Leave was asked for, but the days could not be read without guessing. Nothing is sent or kept. */
export const LEAVE_WHICH_DAYS = 'I could not tell exactly which days you mean, so I have not sent anything. Tell me the first day and the last day, for example "from next Monday to next Wednesday", and I will ask again.';

/**
 * WHETHER THE WORDS PLAINLY ASK FOR TIME OFF, so days that cannot be read are asked for again rather
 * than answered with a shrug (found live, 1 October 2026, item 6: "I need Monday and Wednesday off
 * next week" was answered "I cannot answer that one yet"). Narrower than `soundsLikeLeave`: "off"
 * counts only where it ends the request or comes before a day, so "I am off to Kisumu" is not one.
 */
export function plainlyAsksForLeave(message: string): boolean {
  const t = (message ?? '').trim();
  if (!soundsLikeLeave(t)) return false;
  return /\b(?:leave|holiday|vacation|days? off|time off|off work)\b|\boff\b(?=\s+(?:next|this|on|from|until|till)\b|\s*[.!?]?\s*$)/i.test(t);
}

export interface LeaveDates { startsOn: Day; endsOn: Day }

const DAY_MS = 86_400_000;
const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const MONTH_RE = `(${MONTHS.join('|')}|${MONTHS.map((m) => m.slice(0, 3)).join('|')})`;
const WEEKDAY_RE = `(${WEEKDAYS.join('|')})`;

const iso = (d: Date) => d.toISOString().slice(0, 10);
const midnight = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
const monthNo = (m: string) => MONTHS.findIndex((x) => x === m || x.slice(0, 3) === m.slice(0, 3));

/** A sentence about time off, in the first person. Somebody else's leave, said by the lead, is not this. */
const ASKS_FOR_TIME_OFF = /\b(?:days? off|time off|off work|annual leave|leave|holiday|vacation|out of (?:the )?office|away|(?<!sign[- ])(?<!kick[- ])off)\b/i;
const FIRST_PERSON = /\b(?:i|i'm|i am|i'll|i will|i'd|i would|i need|i want|my)\b/i;

export function soundsLikeLeave(message: string): boolean {
  const t = (message ?? '').trim();
  if (!ASKS_FOR_TIME_OFF.test(t) || !FIRST_PERSON.test(t)) return false;
  /* "Off" alone is too common ("kick off", "sign off"): it needs a day, a date or "next week" beside it. */
  return new RegExp(`${WEEKDAY_RE}|${MONTH_RE}|\\d{4}-\\d{2}-\\d{2}|tomorrow|next week`, 'i').test(t);
}

function dateOn(day: number, month: number, today: Date, year?: number): Date | null {
  if (day < 1 || day > 31 || month < 0) return null;
  let y = year ?? today.getUTCFullYear();
  let d = new Date(Date.UTC(y, month, day));
  if (d.getUTCMonth() !== month) return null;
  /* No year said: the next time that date comes round, never one already gone. */
  if (!year && d < midnight(today)) { y += 1; d = new Date(Date.UTC(y, month, day)); }
  return d;
}

/** The Monday of the week after this one. */
function mondayOfNextWeek(today: Date): Date {
  const t = midnight(today);
  const back = (t.getUTCDay() + 6) % 7;
  return new Date(t.getTime() + (7 - back) * DAY_MS);
}

function weekdayFrom(name: string, how: 'next' | 'this', today: Date): Date {
  const want = WEEKDAYS.indexOf(name);
  if (how === 'next') {
    const monday = mondayOfNextWeek(today);
    return new Date(monday.getTime() + ((want + 6) % 7) * DAY_MS);
  }
  const t = midnight(today);
  const ahead = ((want - t.getUTCDay() + 7) % 7) || 7;
  return new Date(t.getTime() + ahead * DAY_MS);
}

/** The days a message asks for, or null when they cannot be read without guessing. */
export function readLeaveDates(message: string, today: Date = new Date()): LeaveDates | null {
  const t = (message ?? '').toLowerCase().replace(/[,]/g, ' ').replace(/\s+/g, ' ');
  if (!soundsLikeLeave(t)) return null;
  const out = (a: Date | null, b: Date | null): LeaveDates | null =>
    a && b && b >= a ? { startsOn: iso(a), endsOn: iso(b) } : null;

  /*
   * TODAY, NEVER DROPPED (found live, 1 October 2026, item 6). "I need leave today and tomorrow" was
   * read as tomorrow alone, because nothing read "today", and the person was asked to send one day
   * when they had asked for two. Today with tomorrow, or with a weekday after it, is read; today with
   * anything else is not read at all, so it is asked again rather than half read. (Today on its own
   * never gets here: a message is read as leave only when it also names a day, a date or a week.)
   */
  if (/\btoday\b/.test(t)) {
    const now = midnight(today);
    if (new RegExp(`\\b(?:from\\s+)?today\\s*(?:and|to|until|till|through|-)\\s*tomorrow\\b`).test(t)) return out(now, new Date(now.getTime() + DAY_MS));
    const until = new RegExp(`\\b(?:from\\s+)?today\\s*(?:to|until|till|through|-)\\s*(?:(next|this)\\s+)?${WEEKDAY_RE}\\b`).exec(t);
    if (until) return out(now, until[1] === 'next' ? weekdayFrom(until[2], 'next', today) : weekdayFrom(until[2], 'this', today));
    return null;
  }

  /* 2026-10-08 to 2026-10-09, or one day. */
  const isos = [...t.matchAll(/\b(\d{4})-(\d{2})-(\d{2})\b/g)].map((m) => new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])));
  if (isos.length === 1) return out(isos[0], isos[0]);
  if (isos.length === 2) return out(isos[0], isos[1]);
  if (isos.length > 2) return null;

  /* 12 to 16 October, 12 October to 16 October, 12th - 16th october 2026. */
  const dayFirst = new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?(?:\\s+${MONTH_RE})?\\s*(?:-|to|until|till|through)\\s*(\\d{1,2})(?:st|nd|rd|th)?\\s+${MONTH_RE}(?:\\s+(\\d{4}))?`).exec(t);
  if (dayFirst) {
    const m2 = monthNo(dayFirst[4]);
    const m1 = dayFirst[2] ? monthNo(dayFirst[2]) : m2;
    const year = dayFirst[5] ? +dayFirst[5] : undefined;
    return out(dateOn(+dayFirst[1], m1, today, year), dateOn(+dayFirst[3], m2, today, year));
  }
  /* October 12 to 16, October 12 to October 16. */
  const monthFirst = new RegExp(`\\b${MONTH_RE}\\s+(\\d{1,2})(?:st|nd|rd|th)?\\s*(?:-|to|until|till|through)\\s*(?:${MONTH_RE}\\s+)?(\\d{1,2})(?:st|nd|rd|th)?(?:\\s+(\\d{4}))?`).exec(t);
  if (monthFirst) {
    const m1 = monthNo(monthFirst[1]);
    const m2 = monthFirst[3] ? monthNo(monthFirst[3]) : m1;
    const year = monthFirst[5] ? +monthFirst[5] : undefined;
    return out(dateOn(+monthFirst[2], m1, today, year), dateOn(+monthFirst[4], m2, today, year));
  }
  /* One day: 12 October, October 12. */
  const one = new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+${MONTH_RE}(?:\\s+(\\d{4}))?|\\b${MONTH_RE}\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:\\s+(\\d{4}))?`).exec(t);
  if (one) {
    const day = +(one[1] ?? one[5]);
    const month = monthNo(one[2] ?? one[4]);
    const year = one[3] ?? one[6];
    const d = dateOn(day, month, today, year ? +year : undefined);
    return out(d, d);
  }

  /* Next Thursday and Friday, this Monday to Wednesday, Thursday. */
  const wd = new RegExp(`\\b(?:(next|this)\\s+)?${WEEKDAY_RE}(?:\\s*(and|to|until|till|through|-)\\s*(?:(?:next|this)\\s+)?${WEEKDAY_RE})?`).exec(t);
  if (wd) {
    const how = wd[1] === 'next' ? 'next' : 'this';
    const first = weekdayFrom(wd[2], how, today);
    if (!wd[4]) return out(first, first);
    const want = WEEKDAYS.indexOf(wd[4]);
    const ahead = (want - first.getUTCDay() + 7) % 7;
    const second = new Date(first.getTime() + ahead * DAY_MS);
    /* "Monday and Wednesday" may or may not mean Tuesday: two days that are not side by side are not read. */
    if (wd[3] === 'and' && ahead !== 1) return null;
    return out(first, second);
  }
  if (/\btomorrow\b/.test(t)) { const d = new Date(midnight(today).getTime() + DAY_MS); return out(d, d); }
  if (/\bnext week\b/.test(t)) { const m = mondayOfNextWeek(today); return out(m, new Date(m.getTime() + 4 * DAY_MS)); }
  return null;
}

const days = (n: number) => `${n} working ${n === 1 ? 'day' : 'days'}`;
const longDay = (d: Day) => whenItWas(new Date(`${d}T00:00:00.000Z`), 'weekdayAndDay', 'UTC');

/** The exact days as a person reads them: "on Friday 9 October", "from Thursday 8 October to Friday 9 October". */
export function theDaysAsRead(d: LeaveDates): string {
  return d.startsOn === d.endsOn ? `on ${longDay(d.startsOn)}` : `from ${longDay(d.startsOn)} to ${longDay(d.endsOn)}`;
}

interface LeaveLike {
  mine(reader: { userId: string; organizationId: string }, today?: Date): Promise<{ daysLeft: number | null }>;
  ask(organizationId: string, userId: string, input: { startsOn: Day; endsOn: Day }): Promise<unknown>;
}

const firstName = (p: { givenName?: string | null; displayName?: string | null } | null | undefined) =>
  (p?.givenName?.trim() || p?.displayName?.trim().split(/\s+/)[0] || '') || null;

/** Whom the person asks (the one answer in who-approves.ts: their line manager, or an admin) and their team, for the say-back. */
async function whoApproves(prisma: PrismaService, organizationId: string, userId: string) {
  const me = await theirRosterEntry(prisma, organizationId, userId, { department: true, managerExternalId: true });
  const who = await whoApprovesFor(prisma, { organizationId, personUserId: userId, managerExternalId: me?.managerExternalId ?? null });
  return { name: who.kind === 'manager' ? who.firstName : null, team: me?.department?.trim() || null };
}

/** Who else in the person's team is off on any of those days, by first name. */
async function alsoOff(prisma: PrismaService, organizationId: string, userId: string, team: string | null, d: LeaveDates): Promise<string[]> {
  if (!team) return [];
  const rows = await prisma.leaveRequest.findMany({
    where: {
      organizationId, status: 'approved', userId: { not: userId },
      startsOn: { lte: new Date(`${d.endsOn}T00:00:00.000Z`) }, endsOn: { gte: new Date(`${d.startsOn}T00:00:00.000Z`) },
    },
    select: { userId: true },
  });
  if (!rows.length) return [];
  const people = [...(await theirRosterEntries(prisma, organizationId, rows.map((r) => r.userId), { givenName: true, displayName: true }, { department: team })).values()];
  return [...new Set(people.map((p) => firstName(p)).filter((n): n is string => !!n))];
}

/**
 * The say-back, or the plain refusal when the suite is off (then nothing is offered and nothing is kept).
 */
export async function sayBackLeave(
  prisma: PrismaService,
  leave: LeaveLike | undefined,
  reader: { userId: string; organizationId: string },
  dates: LeaveDates,
  today: Date = new Date(),
): Promise<{ ok: true; say: string } | { ok: false; say: string }> {
  const suite = await prisma.organizationSuite.findUnique({
    where: { organizationId_suite: { organizationId: reader.organizationId, suite: 'leave' } },
    select: { isOn: true },
  });
  if (!suite?.isOn || !leave) return { ok: false, say: LEAVE_SUITE_OFF };
  const mine = await leave.mine(reader, today).catch(() => null);
  if (!mine) return { ok: false, say: LEAVE_SUITE_OFF };

  const n = workingDays(new Date(`${dates.startsOn}T00:00:00.000Z`), new Date(`${dates.endsOn}T00:00:00.000Z`));
  const { name, team } = await whoApproves(prisma, reader.organizationId, reader.userId);
  const off = await alsoOff(prisma, reader.organizationId, reader.userId, team, dates);

  const left = mine.daysLeft == null ? null : `You have ${mine.daysLeft} ${mine.daysLeft === 1 ? 'day' : 'days'} of leave left this year`;
  const others = !team ? null
    : off.length === 0 ? `nobody else in ${team} is off then`
    : off.length === 1 ? `${off[0]} is also off then`
    : `${off.slice(0, -1).join(', ')} and ${off[off.length - 1]} are also off then`;
  const middle = left && others ? `${left}, and ${others}.` : left ? `${left}.` : others ? `${others[0].toUpperCase()}${others.slice(1)}.` : '';
  return {
    ok: true,
    say: `You asked for leave ${theDaysAsRead(dates)}, which is ${days(n)}. ${middle ? `${middle} ` : ''}Shall I send it to ${name ?? 'an admin'} to approve?`,
  };
}

/** After the yes: sent through the leave suite, and nowhere else. */
export async function sendLeave(
  leave: LeaveLike | undefined,
  prisma: PrismaService,
  reader: { userId: string; organizationId: string },
  dates: LeaveDates,
): Promise<string> {
  if (!leave) return LEAVE_SUITE_OFF;
  try {
    await leave.ask(reader.organizationId, reader.userId, dates);
  } catch (err: any) {
    return typeof err?.message === 'string' && err.message ? `I could not send it. ${err.message}` : 'I could not send it.';
  }
  const { name } = await whoApproves(prisma, reader.organizationId, reader.userId);
  return `I have sent your leave request ${theDaysAsRead(dates)} to ${name ?? 'an admin'}. It is not approved until they decide, and you will see it under your leave.`;
}
