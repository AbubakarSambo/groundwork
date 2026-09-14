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

/**
 * A ROUND THAT SOMEBODY HAS STARTED AND NOT EVERYBODY HAS FINISHED IS THE OPEN ONE.
 *
 * There were two answers to this in the same file. This one took the newest round anybody had
 * touched; the board's own copy took the lowest round anybody had not finished, which is next
 * week's untouched row the moment this week closes. Read live on a forty-person convening where all
 * forty had answered: thirty-six blockers on the record and the board saying "Blockers: None".
 *
 * Both halves were right about something and neither was right on its own. A round only counts once
 * somebody has opened it, which is this function's rule. And when a person is added mid-run their
 * session one is genuinely open again while others are on session two, which is the board's. So:
 * the lowest STARTED round somebody has still not finished, and where every started round is done,
 * the newest one.
 */
export function whichRoundIsOpen(rows: Round[]): number {
  if (!rows.length) return 0;
  const started = rows.filter((r) => r.status !== 'NOT_STARTED');
  /* Nothing started anywhere: the run has not begun, and the first round is the one about to open. */
  if (!started.length) return Math.min(...rows.map((r) => r.sessionNumber));
  const numbers = [...new Set(started.map((r) => r.sessionNumber))];
  /* A round where somebody is still in progress or has not been asked yet. COMPLETED and DECLINED
     are both somebody having met the round; NOT_STARTED inside a started round is a person still
     to answer, which is what keeps that round open. */
  const stillGoing = numbers.filter((n) => rows.some((r) => r.sessionNumber === n && r.status !== 'COMPLETED' && r.status !== 'DECLINED'));
  return stillGoing.length ? Math.min(...stillGoing) : Math.max(...numbers);
}
