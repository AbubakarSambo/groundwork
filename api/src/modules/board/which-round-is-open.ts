/**
 * THE ROUND THAT IS OPEN IS THE ONE SOMEBODY HAS STARTED.
 *
 * Check-in rows for the next round are written ahead of time, so the newest row that exists is
 * usually next week's. Reading "the current round" off the highest session number produced two
 * separate wrong answers on the same board in one morning:
 *
 *   - Every person read as "has not answered", on the morning a round opened, about a round nobody
 *     was late for. A page of red that meant nothing.
 *   - A target set today was stamped against next week, so the board said "still to be asked" about
 *     people who could have been asked about it in the round that was actually running - and would
 *     go on saying it for a week.
 *
 * Two places had worked it out separately and both got it the same way wrong, which is the argument
 * for it being one function rather than a comment in each.
 *
 * NOT_STARTED is the only status that means untouched: in progress, completed and declined are all
 * somebody having met the round.
 */
export interface Round {
  sessionNumber: number;
  status: string;
}

export function whichRoundIsOpen(rows: Round[]): number {
  if (!rows.length) return 0;
  const started = rows.filter((r) => r.status !== 'NOT_STARTED').map((r) => r.sessionNumber);
  /* Nothing started anywhere: the run has not begun, and the first round is the one about to open. */
  if (!started.length) return Math.min(...rows.map((r) => r.sessionNumber));
  return Math.max(...started);
}
