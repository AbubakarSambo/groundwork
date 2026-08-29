/**
 * WHEN A HANDOFF STOPS BEING NORMAL AND STARTS BEING A PROBLEM.
 *
 * There is no correct number here and pretending otherwise would be the mistake. Waiting three days
 * on a colleague is ordinary work; waiting three weeks usually means nobody knows it is happening.
 * So the threshold is set where the second reading is more likely than the first, and it is a
 * named constant in a leaf file rather than a literal buried in a sweep, because it is the kind of
 * number a customer will eventually want to move.
 */
export const ESCALATE_AFTER_DAYS = 14;

/**
 * Fires ONCE per handoff, and the guarantee is a stamped column rather than this function.
 *
 * A sweep that re-sent every night for as long as the handoff stayed open would teach the receiving
 * team to filter the channel within a week, and the alert they filtered would be the one that
 * mattered. The stamp is also why this cannot be "escalate everything older than the threshold" on
 * every pass: the query has to exclude what it has already sent.
 */
export function shouldEscalate(waitingDays: number, escalatedAt: Date | null): boolean {
  if (escalatedAt) return false;
  return waitingDays >= ESCALATE_AFTER_DAYS;
}
