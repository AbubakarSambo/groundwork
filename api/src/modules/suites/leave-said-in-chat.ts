import type { PrismaService } from '../prisma/prisma.service';
import { whenItWas } from '../../common/a-date-reads-the-same-everywhere';
import { workingDays, type Day } from './the-leave-board.service';
import { whoApprovesFor } from './who-approves';
import { readWorkflow, whoInWords } from './the-approval-steps';
import { theStepsFor, whoDecidesNow } from './who-may-decide';
import { theThresholdCrossed } from './the-spending-rules';
import { theirRosterEntries, theirRosterEntry } from './a-roster-entry-and-its-sign-in';
import { hereSince, inASentence, moreThanWorkingDays, readLeaveRules, theKindOf, theKindSaid, theRulesThatApply, type LeaveRules } from './the-leave-rules';

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
/** The days, and the kind of leave when the admin has set kinds (build step 8). */
export interface LeaveAsked extends LeaveDates { kind?: string | null }

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
  /* A month or a weekday is a WORD: "decided" holds "dec", and "What leave have I asked for, and what was decided?" was read as a request for leave in December. */
  return new RegExp(`\\b(?:${WEEKDAYS.join('|')}|${MONTHS.join('|')}|${MONTHS.map((m) => m.slice(0, 3)).join('|')}|sept)\\b|\\d{4}-\\d{2}-\\d{2}|tomorrow|next week|\\bthe\\s+\\d{1,2}(?:st|nd|rd|th)\\b`, 'i').test(t);
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

/**
 * HOW LONG, WHEN A WEEK OR MORE IS SAID (found in the 4 October review): "a week off from 19 October"
 * was read as the one day, 19 October. Whole weeks only; any other length is not read, so it is asked.
 */
const WORDS: Record<string, number> = { a: 1, one: 1, '1': 1, two: 2, '2': 2, three: 3, '3': 3, four: 4, '4': 4 };
function weeksSaid(t: string): number | null {
  const m = /\b(a|one|two|three|four|[1-4])\s+(?:whole\s+)?weeks?\b(?!\s+(?:from\s+now|ago))/.exec(t);
  return m ? WORDS[m[1]] : null;
}
const endOf = (start: Date, weeks: number | null) => (weeks ? new Date(start.getTime() + (weeks * 7 - 1) * DAY_MS) : start);

/** "the 23rd": the next time that day of the month comes round, never one already gone. */
function theNextDayNumbered(day: number, today: Date): Date | null {
  if (day < 1 || day > 31) return null;
  const t = midnight(today);
  for (let m = 0; m < 13; m++) {
    const d = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + m, day));
    if (d.getUTCDate() === day && d >= t) return d;
  }
  return null;
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
    return out(d, d && endOf(d, weeksSaid(t)));
  }
  /* The 23rd, with no month said. */
  const numbered = /\bthe\s+(\d{1,2})(?:st|nd|rd|th)\b/.exec(t);
  if (numbered) {
    const d = theNextDayNumbered(+numbered[1], today);
    return out(d, d && endOf(d, weeksSaid(t)));
  }

  /* Next Thursday and Friday, this Monday to Wednesday, Thursday. */
  const wd = new RegExp(`\\b(?:(next|this)\\s+)?${WEEKDAY_RE}(?:\\s*(and|to|until|till|through|-)\\s*(?:(?:next|this)\\s+)?${WEEKDAY_RE})?`).exec(t);
  if (wd) {
    const how = wd[1] === 'next' ? 'next' : 'this';
    const first = weekdayFrom(wd[2], how, today);
    if (!wd[4]) return out(first, endOf(first, weeksSaid(t)));
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
  mine(reader: { userId: string; organizationId: string }, today?: Date): Promise<{ daysLeft: number | null; kinds?: { key: string; daysLeft: number | null }[] }>;
  ask(organizationId: string, userId: string, input: { startsOn: Day; endsOn: Day; proposalId?: string; kind?: string }): Promise<unknown>;
}

const firstName = (p: { givenName?: string | null; displayName?: string | null } | null | undefined) =>
  (p?.givenName?.trim() || p?.displayName?.trim().split(/\s+/)[0] || '') || null;

/**
 * Whom the person asks (the one answer in who-approves.ts: their line manager, or an admin) and their
 * team, for the say-back. `days` is the request's working days, so leave by length is read.
 */
async function whoApproves(prisma: PrismaService, organizationId: string, userId: string, days?: number) {
  const me = await theirRosterEntry(prisma, organizationId, userId, { department: true, managerExternalId: true });
  const who = await whoApprovesFor(prisma, { organizationId, personUserId: userId, managerExternalId: me?.managerExternalId ?? null, ...(days != null ? { days } : {}) });
  return { name: who.kind === 'admin' ? null : who.firstName, team: me?.department?.trim() || null, managerExternalId: me?.managerExternalId ?? null };
}

/**
 * LEAVE BY LENGTH (the-leave-rules.ts). When the request is longer than a threshold whose steps are more
 * than one, the say-back names who approves after the first person, as spending does over a threshold:
 * "This is more than ten working days, so Wairimu approves it first, and then Joseph, who heads Sales."
 * Null when no threshold is crossed, or its steps are one.
 */
async function longerLeaveSaid(prisma: PrismaService, organizationId: string, userId: string, rules: LeaveRules, days: number, first: string | null, managerExternalId: string | null): Promise<string | null> {
  const crossed = theThresholdCrossed(rules, days);
  if (!crossed || crossed.steps.length < 2) return null;
  const workflow = await readWorkflow(prisma, organizationId, 'leave');
  const steps = theStepsFor('leave', { workflow, rules }, days);
  const then: string[] = [];
  for (let step = 1; step < steps.length; step++) {
    const later = await whoDecidesNow(prisma, steps, { organizationId, requesterUserId: userId, managerExternalId }, { step });
    then.push(await whoInWords(prisma, later.who, later.team, userId));
  }
  return `This is ${moreThanWorkingDays(crossed.above)}, so ${first ?? 'an admin'} approves it first, and then ${then.join(', and then ')}.`;
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
 *
 * THE LEAVE RULES (decision 85, build step 8). When the admin has set kinds of leave, the kind is read
 * from what the person said ("sick leave tomorrow"), or else the first kind, and the days left are of
 * that kind. Each rule that applies is said before the question, which then asks whether to send it
 * anyway: "Annual leave needs two weeks’ notice, and this starts in five days. Shall I still send it to
 * Wairimu?" A rule never stops the request. With no rules set, the say-back is exactly what it was.
 * `said` is the person's own message, read only for the kind of leave.
 */
export async function sayBackLeave(
  prisma: PrismaService,
  leave: LeaveLike | undefined,
  reader: { userId: string; organizationId: string },
  dates: LeaveDates,
  today: Date = new Date(),
  said?: string,
): Promise<{ ok: true; say: string; kind?: string } | { ok: false; say: string }> {
  const suite = await prisma.organizationSuite.findUnique({
    where: { organizationId_suite: { organizationId: reader.organizationId, suite: 'leave' } },
    select: { isOn: true },
  });
  if (!suite?.isOn || !leave) return { ok: false, say: LEAVE_SUITE_OFF };
  const mine = await leave.mine(reader, today).catch(() => null);
  if (!mine) return { ok: false, say: LEAVE_SUITE_OFF };

  const n = workingDays(new Date(`${dates.startsOn}T00:00:00.000Z`), new Date(`${dates.endsOn}T00:00:00.000Z`));
  const { name, team, managerExternalId } = await whoApproves(prisma, reader.organizationId, reader.userId, n);
  const off = await alsoOff(prisma, reader.organizationId, reader.userId, team, dates);
  const rules: LeaveRules = await readLeaveRules(prisma, reader.organizationId).catch(() => ({}));
  const longer = await longerLeaveSaid(prisma, reader.organizationId, reader.userId, rules, n, name, managerExternalId).catch(() => null);
  const kind = theKindSaid(said, rules);
  const daysLeft = kind ? (mine.kinds?.find((k) => k.key === kind.key)?.daysLeft ?? null) : mine.daysLeft;

  const left = daysLeft == null ? null : `You have ${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} of ${kind ? inASentence(kind) : 'leave'} left this year`;
  const others = !team ? null
    : off.length === 0 ? `nobody else in ${team} is off then`
    : off.length === 1 ? `${off[0]} is also off then`
    : `${off.slice(0, -1).join(', ')} and ${off[off.length - 1]} are also off then`;
  const middle = left && others ? `${left}, and ${others}.` : left ? `${left}.` : others ? `${others[0].toUpperCase()}${others.slice(1)}.` : '';
  const applies = theRulesThatApply(rules, {
    kind, startsOn: dates.startsOn, endsOn: dates.endsOn, days: n, askedOn: today.toISOString().slice(0, 10),
    hereSince: (rules as any).eligibleAfterDays ? await hereSince(prisma, reader.organizationId, reader.userId).catch(() => null) : null,
  }, { you: true });
  const ask = applies.length ? `Shall I still send it to ${name ?? 'an admin'}?` : `Shall I send it to ${name ?? 'an admin'} to approve?`;
  return {
    ok: true,
    say: `You asked for ${kind ? inASentence(kind) : 'leave'} ${theDaysAsRead(dates)}, which is ${days(n)}. ${middle ? `${middle} ` : ''}${applies.length ? `${applies.join(' ')} ` : ''}${longer ? `${longer} ` : ''}${ask}`,
    ...(kind ? { kind: kind.key } : {}),
  };
}

/**
 * After the yes: sent through the leave suite, and nowhere else. `saidBack` is the parked say-back the
 * person said yes to, kept as a reference in the record of who did what (decision 85, build step 5).
 */
export async function sendLeave(
  leave: LeaveLike | undefined,
  prisma: PrismaService,
  reader: { userId: string; organizationId: string },
  dates: LeaveAsked,
  saidBack?: { proposalId: string },
): Promise<string> {
  if (!leave) return LEAVE_SUITE_OFF;
  const asked: { startsOn: Day; endsOn: Day; proposalId?: string; kind?: string } = { startsOn: dates.startsOn, endsOn: dates.endsOn };
  if (saidBack?.proposalId) asked.proposalId = saidBack.proposalId;
  if (dates.kind) asked.kind = dates.kind;
  try {
    await leave.ask(reader.organizationId, reader.userId, asked);
  } catch (err: any) {
    return typeof err?.message === 'string' && err.message ? `I could not send it. ${err.message}` : 'I could not send it.';
  }
  const n = workingDays(new Date(`${dates.startsOn}T00:00:00.000Z`), new Date(`${dates.endsOn}T00:00:00.000Z`));
  const { name } = await whoApproves(prisma, reader.organizationId, reader.userId, n);
  const kind = dates.kind ? theKindOf(dates.kind, await readLeaveRules(prisma, reader.organizationId).catch(() => ({}))) : null;
  const what = kind ? `request for ${inASentence(kind)}` : 'leave request';
  return `I have sent your ${what} ${theDaysAsRead(dates)} to ${name ?? 'an admin'}. It is not approved until they decide, and you will see it under your leave.`;
}
