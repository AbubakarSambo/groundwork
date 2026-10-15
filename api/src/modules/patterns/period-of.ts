/**
 * WHAT COUNTS AS A PERIOD. ONE FUNCTION, USED EVERYWHERE THE THREE-PERIOD RULE COUNTS.
 *
 * Decision 57, item 1 (30 September 2026): "A period is at least a week. For a weekly (or slower)
 * check-in, each session is a period. For a daily check-in (cadence DAILY, or several sessions
 * within one week), each calendar week is a period."
 *
 * Before this, every counter in the product - `patterns.service.ts`'s `periodsObserved` and
 * `seenInSessions`, the coaching step's "two sessions", the "how often" sentence - treated a
 * session as a period unconditionally. On a WEEKLY or slower ground that is exactly right: one
 * session a week is one period a week. On a DAILY ground it is wrong by a factor of about seven -
 * three sessions is three days, not three weeks of a behaviour recurring, and calling it "three
 * periods" overstates how settled a pattern is.
 *
 * `periodOf` is the one place that decides. A WEEKLY-or-slower ground's period is its session
 * number, unchanged. A DAILY ground's period is the calendar week its session falls in, so several
 * sessions in the same week collapse into the one period the rule means.
 *
 * `when` is the session's own date (its `completedAt`, `startedAt`, or `createdAt` - whichever the
 * caller has to hand). Without one there is nothing to compute a calendar week from, so the session
 * number stands in, which is the same answer this whole codebase gave before this file existed. It
 * never throws and never returns something smaller than session 1.
 */

export interface SessionForPeriod {
  sessionNumber: number;
  when?: Date | string | null;
}

export interface GroundForPeriod {
  cadence?: string | null;
}

/** The one cadence a session is more frequent than a period. Every other cadence is weekly or slower. */
const PERIOD_IS_NARROWER_THAN_A_SESSION = new Set(['DAILY']);

/**
 * ISO-ish week number, stable within the server's own clock (dates are already stored in UTC
 * everywhere they matter to this rule). Combined with the year so weeks never collide across a
 * ground that runs past December: week 1 of 2027 is a bigger number than week 52 of 2026.
 */
function calendarWeekNumber(when: Date): number {
  const d = new Date(Date.UTC(when.getUTCFullYear(), when.getUTCMonth(), when.getUTCDate()));
  // Move to the Thursday of this week (ISO 8601: weeks belong to the year holding their Thursday).
  const dayNum = (d.getUTCDay() + 6) % 7; // Mon=0..Sun=6
  d.setUTCDate(d.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const firstDayNum = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNum + 3);
  const week = 1 + Math.round((d.getTime() - firstThursday.getTime()) / (7 * 24 * 60 * 60 * 1000));
  return d.getUTCFullYear() * 100 + week;
}

/**
 * The period a session belongs to, honestly. For a weekly-or-slower ground this is the session
 * number, exactly as every caller already used it. For a daily ground it is the calendar week, so
 * several sessions in one week are the one period the three-period rule means.
 */
export function periodOf(session: SessionForPeriod, ground: GroundForPeriod | null | undefined): number {
  const isDaily = PERIOD_IS_NARROWER_THAN_A_SESSION.has(String(ground?.cadence ?? ''));
  if (!isDaily || !session.when) return session.sessionNumber;
  const d = new Date(session.when);
  if (Number.isNaN(d.getTime())) return session.sessionNumber;
  return calendarWeekNumber(d);
}

/**
 * HOW MANY PERIODS THE RECORD REALLY HOLDS, as decision 57 counts them: the distinct periods among the
 * sessions that were answered (a setup conversation is not one). One session is one period, whatever
 * anybody claimed, and several sessions in one week of a daily check-in are the one period.
 */
export function periodsTheRecordHolds(
  answeredSessions: { sessionNumber: number; when?: Date | string | null }[],
  ground: GroundForPeriod | null | undefined,
): number {
  return new Set(answeredSessions.map((s) => periodOf(s, ground))).size;
}

/**
 * A COUNT OF PERIODS THAT CAN ONLY BE TRUE. The synthesis model reports how many periods a pattern was
 * "visible across", and that is a claim: it read 2 after a single session (request 79). The count is never
 * more than the periods the record holds, and never below one for something that was seen at all.
 */
export function aTruePeriodCount(claimed: unknown, periodsHeld: number): number {
  const said = Math.floor(Number(claimed));
  if (!Number.isFinite(said) || said < 1) return Math.min(1, Math.max(0, periodsHeld));
  return Math.min(said, Math.max(0, periodsHeld));
}
