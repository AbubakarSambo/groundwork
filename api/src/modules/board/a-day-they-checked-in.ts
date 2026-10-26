import { CLOSED_BY_THE_CLOCK } from '../../common/closed-by-the-clock';

/**
 * A DAY THEY CHECKED IN, COUNTED FROM WHAT ACTUALLY HAPPENED (polish round 15, Drop Access and Muchemi & Co).
 *
 * Kevin answered on WhatsApp every working day from Monday 12 to Friday 16 October. On Monday evening he pressed the button in his
 * invitation email, which opened Tuesday's session early; nothing more was said in it, and the clock closed it on Tuesday morning. His
 * Tuesday answer came that afternoon and opened the next session. Every surface counted the closed one as a check-in he missed: his
 * board read "Kevin did five of six check-ins ... On Tuesday 13 October, the check-in was not done", the weekly letter "Kevin missed
 * one of six", his own page "In session 2, you did not check in before it closed", and the morning "on time 4 days running". Peter's
 * own page read "4 of 5 check-ins on time" when he had answered on two days, because sessions closed with nothing from him counted as
 * done.
 *
 * One reading, for every surface:
 *   - A check-in is done when they answered in it: any channel, any time, whatever its status. A session closed with nothing from them
 *     was not done.
 *   - A session they answered is on the day of their first answer. One with no answer is on the day it opened, never the day the clock
 *     closed it.
 *   - A session with no answer, on a day they answered another session of the same check-in, is not a missed day: they checked in that
 *     day. That day counts once, as done.
 *   - On time: their first answer came on the day the session opened, on a check-in that opens each working day; on any other, within a
 *     day of it opening.
 */
export interface ASessionAsItHappened {
  id?: string;
  sessionNumber?: number | null;
  status: string;
  availableFrom?: Date | string | null;
  createdAt?: Date | string | null;
  completedAt?: Date | string | null;
  closedReason?: string | null;
  /** How many answers of theirs it holds, where that was read. */
  answers?: number | null;
  /** When they first answered in it, where that was read. */
  firstAnsweredAt?: Date | string | null;
}

const DAY = 86_400_000;
const at = (d: Date | string | null | undefined): Date | null => {
  if (!d) return null;
  const x = new Date(d);
  return Number.isNaN(x.getTime()) ? null : x;
};

/** The day a moment falls on in the zone, as YYYY-MM-DD. */
export const theDayIn = (d: Date | string, zone: string): string =>
  new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(d));

/** They answered in it. Where the answers were not read, a finished session the clock did not close counts as answered. */
export function theyAnsweredIn(s: ASessionAsItHappened): boolean {
  if (typeof s.answers === 'number') return s.answers > 0;
  if (at(s.firstAnsweredAt)) return true;
  return String(s.status ?? '').toUpperCase() === 'COMPLETED' && s.closedReason !== CLOSED_BY_THE_CLOCK;
}

/** When the session opened for them. */
export const whenItOpened = (s: ASessionAsItHappened): Date | null => at(s.availableFrom) ?? at(s.createdAt);

/** When they answered in it: their first answer, else when it was finished. Null when they did not answer. */
export function whenTheyAnswered(s: ASessionAsItHappened): Date | null {
  if (!theyAnsweredIn(s)) return null;
  return at(s.firstAnsweredAt) ?? at(s.completedAt);
}

/** The day this session is counted on: the day of their first answer, or, with no answer, the day it opened. */
export function theDayItCountsOn(s: ASessionAsItHappened, zone: string): string | null {
  const d = whenTheyAnswered(s) ?? whenItOpened(s) ?? at(s.completedAt);
  return d ? theDayIn(d, zone) : null;
}

/** The days they answered a session on. */
export function theDaysTheyCheckedIn(sessions: readonly ASessionAsItHappened[], zone: string): Set<string> {
  const days = new Set<string>();
  for (const s of sessions) {
    const d = whenTheyAnswered(s);
    if (d) days.add(theDayIn(d, zone));
  }
  return days;
}

/** A session with no answer from them, on a day they answered another session of the same check-in: not a missed day. */
export function aQuietSessionOnADayTheyCheckedIn(s: ASessionAsItHappened, all: readonly ASessionAsItHappened[], zone: string): boolean {
  if (theyAnsweredIn(s)) return false;
  const day = theDayItCountsOn(s, zone);
  return !!day && theDaysTheyCheckedIn(all, zone).has(day);
}

/** On time: their first answer came within a day of the session opening. */
export function answeredOnTime(s: ASessionAsItHappened): boolean {
  const answered = whenTheyAnswered(s);
  if (!answered) return false;
  const opened = whenItOpened(s);
  return !opened || answered.getTime() - opened.getTime() <= DAY;
}

/** The first answer of theirs in each session, from their own turns. */
export function theFirstAnswerIn(turns: readonly { checkInId?: string | null; at?: Date | string | null; createdAt?: Date | string | null }[]): Map<string, Date> {
  const first = new Map<string, Date>();
  for (const x of turns) {
    const when = at(x.at ?? x.createdAt);
    if (!x.checkInId || !when) continue;
    const had = first.get(x.checkInId);
    if (!had || when < had) first.set(x.checkInId, when);
  }
  return first;
}

/** One check-in, counted: a session of theirs, or, on a check-in that opens each working day, one working day. */
export interface ACheckInCounted {
  /** The session it was answered in, or the one open that day. */
  checkInId: string | null;
  sessionNumber: number | null;
  /** YYYY-MM-DD, in the zone. */
  day: string | null;
  done: boolean;
  onTime: boolean;
  specific: boolean;
}

export interface ASessionToCount extends ASessionAsItHappened {
  id: string;
  sessionNumber: number;
  /** Its own read says it named the item, what changed and the day. */
  specific?: boolean;
}

const noon = (k: string) => new Date(`${k}T12:00:00Z`);
const nextDay = (k: string) => new Date(noon(k).getTime() + DAY).toISOString().slice(0, 10);

/**
 * THE CHECK-INS THAT WERE DUE, AND WHICH WERE DONE. On a check-in that opens each working day (cadence DAILY) each working day counts
 * once, from the day their first session opened: done where they answered any session that day, and missed where they answered none.
 * Today counts only once they have answered. Any other check-in counts each session that was due (`due`) or that they answered, and
 * a session with no answer on a day they answered another is left out.
 */
export function theCheckInsCounted(
  sessions: readonly ASessionToCount[],
  o: { now: Date; zone: string; daily?: { workingDays?: number[] | null } | null; due: (s: ASessionToCount) => boolean },
): ACheckInCounted[] {
  const { now, zone } = o;
  /* On a daily check-in the day's window is the day it opened: Tuesday's session answered on Wednesday was late. */
  const onTheDayItOpened = (s: ASessionToCount) => {
    const answered = whenTheyAnswered(s);
    const opened = whenItOpened(s);
    return !!answered && (!opened || theDayIn(answered, zone) === theDayIn(opened, zone));
  };
  const read = (s: ASessionToCount): ACheckInCounted => {
    const done = theyAnsweredIn(s);
    return { checkInId: s.id, sessionNumber: s.sessionNumber, day: theDayItCountsOn(s, zone), done, onTime: o.daily ? onTheDayItOpened(s) : answeredOnTime(s), specific: done && !!s.specific };
  };
  const ordered = [...sessions].sort((a, b) => a.sessionNumber - b.sessionNumber);
  if (!o.daily) {
    const answeredOn = theDaysTheyCheckedIn(ordered, zone);
    return ordered.filter((s) => o.due(s) || theyAnsweredIn(s)).map(read).filter((r) => r.done || !r.day || !answeredOn.has(r.day));
  }
  const works = (o.daily.workingDays ?? []).length ? new Set(o.daily.workingDays) : new Set([1, 2, 3, 4, 5]);
  const today = theDayIn(now, zone);
  const opened = ordered.map((s) => whenItOpened(s)).filter((d): d is Date => !!d && d <= now);
  if (!opened.length) return [];
  const first = theDayIn(new Date(Math.min(...opened.map((d) => d.getTime()))), zone);
  const answered = ordered.filter(theyAnsweredIn).map(read);
  const out: ACheckInCounted[] = [];
  for (let k = first, n = 0; k <= today && n < 800; k = nextDay(k), n++) {
    const that = answered.filter((r) => r.day === k);
    if (that.length) {
      out.push({ ...that[0], onTime: that.some((r) => r.onTime), specific: that.some((r) => r.specific) });
      continue;
    }
    if (k === today || !works.has(noon(k).getUTCDay())) continue;
    /* The session that was open that day: the last of theirs opened by its end. */
    const openThen = [...ordered].reverse().find((s) => { const at = whenItOpened(s); return !!at && theDayIn(at, zone) <= k; }) ?? null;
    out.push({ checkInId: openThen?.id ?? null, sessionNumber: openThen?.sessionNumber ?? null, day: k, done: false, onTime: false, specific: false });
  }
  return out;
}
