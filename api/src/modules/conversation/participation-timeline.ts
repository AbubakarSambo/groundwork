/**
 * WHICH SESSIONS COUNT FOR A PERSON, AND WHICH ARE NOT THEIRS TO ANSWER FOR.
 *
 * Detection reads a pattern over three periods. That rule is fair only while
 * every period was one the person was actually present and able to answer for.
 * The moment a real roster meets it, the naive version does something unkind:
 *
 *   a joiner is read as "behind" for weeks that happened before they arrived
 *   somebody on parental leave accrues "went quiet" for a legally protected absence
 *   a departed person keeps being coached, and keeps being read
 *
 * None of those are edge cases. People join, leave and take leave constantly,
 * and the engine has to know the difference between "said nothing" and "was not
 * there".
 *
 * The three states are genuinely different and are handled differently:
 *
 *   JOINED       fresh. Their clock starts when they arrived, not when the
 *                ground did, and the blank before them is not theirs.
 *   ON LEAVE     paused. The clock stops and resumes; the periods do not count
 *                and are never read as anything at all.
 *   LEFT         frozen. What they said stands, nothing new is read about them,
 *                and no coaching fires at somebody who has gone.
 *
 * Pure functions on purpose. This is the arithmetic every guardrail depends on,
 * and it should be checkable without a database, a clock, or a model.
 */

export interface LeavePeriod {
  /** When the leave began. */
  from: Date;
  /** When it ended, or null if they are still away. */
  to: Date | null;
}

export interface Participation {
  /** When this person joined the ground. Null means they were there from the start. */
  joinedAt?: Date | null;
  /** When they left, were removed, or were let go. Null means still here. */
  leftAt?: Date | null;
  /**
   * Authorized absences. The engine holds ONLY the dates.
   *
   * It must never store, infer or surface the REASON. Medical, parental,
   * bereavement, sabbatical: none of that is the engine's business, all of it is
   * a liability, and "on leave" is the entire fact it needs.
   */
  leaves?: LeavePeriod[];
}

export interface SessionMark {
  sessionNumber: number;
  /** When this session was open to them. */
  at: Date;
}

const within = (at: Date, from: Date, to: Date | null) =>
  at.getTime() >= from.getTime() && (to === null || at.getTime() <= to.getTime());

/** Was this person away, with authorization, when this session came round? */
export function onLeaveAt(at: Date, p: Participation): boolean {
  return (p.leaves ?? []).some((l) => within(at, l.from, l.to));
}

/** Had they joined yet? */
export function hadJoinedBy(at: Date, p: Participation): boolean {
  return !p.joinedAt || at.getTime() >= p.joinedAt.getTime();
}

/** Were they still here? */
export function wasStillHereAt(at: Date, p: Participation): boolean {
  return !p.leftAt || at.getTime() < p.leftAt.getTime();
}

/**
 * The sessions a person can fairly be read on.
 *
 * Everything else in detection counts THESE, never the raw list. A period they
 * were not present for is not a period they were quiet in.
 */
export function countableSessions(sessions: SessionMark[], p: Participation): SessionMark[] {
  return sessions.filter(
    (s) => hadJoinedBy(s.at, p) && wasStillHereAt(s.at, p) && !onLeaveAt(s.at, p),
  );
}

/**
 * Has a pattern had its three periods, counting only periods that were theirs?
 *
 * The clock PAUSES rather than running through leave. Somebody two periods into
 * a pattern who takes a month off does not come back with it confirmed because
 * time passed while they were away. That would be a read manufactured by the
 * calendar.
 */
export function patternClockReached(
  sessions: SessionMark[],
  p: Participation,
  required = 3,
): boolean {
  return countableSessions(sessions, p).length >= required;
}

/**
 * May the engine speak to this person at all right now?
 *
 * A coaching nudge landing during somebody's medical or parental leave is the
 * tone-deaf thing that ends trust in a product permanently, and a coaching
 * prompt firing at somebody who has left the company is both absurd and a leak.
 * Silence in both cases is correct.
 */
export function mayCoach(now: Date, p: Participation): boolean {
  return wasStillHereAt(now, p) && !onLeaveAt(now, p);
}

/**
 * May the engine produce a NEW read about this person right now?
 *
 * Stricter than mayCoach in one direction and looser in none. After somebody
 * leaves, their record stands as history but nothing new is concluded about
 * them: they are no longer there to add their own voice or correct a reading,
 * and a person who cannot answer back should not be being assessed.
 */
export function mayFormNewRead(now: Date, p: Participation): boolean {
  return wasStillHereAt(now, p) && !onLeaveAt(now, p);
}

/**
 * Work of theirs showing up in someone else's account: is it explainable by the
 * roster rather than by them dropping it?
 *
 * When somebody leaves or goes on leave, their work gets picked up. That is
 * cover, not the absorber over-reaching and not the absent person dropping
 * anything. The encroachment signal has to know a transition happened or it will
 * read an ordinary handover as a failure by whoever was away.
 */
export function absorptionIsExplained(at: Date, p: Participation): boolean {
  return onLeaveAt(at, p) || !wasStillHereAt(at, p);
}

/**
 * Where a joiner's baseline sits.
 *
 * Their first countable session, not the ground's first. Returning null means
 * they have no countable session yet, which is a reason to hold off reading
 * them at all rather than a reason to read them as empty.
 */
export function baselineSession(sessions: SessionMark[], p: Participation): number | null {
  const mine = countableSessions(sessions, p);
  return mine.length ? Math.min(...mine.map((s) => s.sessionNumber)) : null;
}
