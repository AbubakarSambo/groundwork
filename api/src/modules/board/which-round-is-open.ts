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

/**
 * THE ROUND A COUNT IN A MESSAGE IS ABOUT. The board's open round, so a message agrees with Today and the
 * board (B-019: one check-in was counted four ways in one morning). Where that round is finished and a newer
 * one has been written ahead and is already available, it is the newer one, because there is something
 * to ask people about and nothing left to count in the finished one.
 */
export function theRoundACountIsAbout(rows: Round[]): number {
  const open = whichRoundIsOpen(rows);
  const finished = rows.filter((r) => r.sessionNumber === open).every((r) => r.status === 'COMPLETED' || r.status === 'DECLINED');
  const newest = rows.length ? Math.max(...rows.map((r) => r.sessionNumber)) : 0;
  return finished && newest > open ? newest : open;
}

/**
 * THE TEAM'S ROUND, NEVER THE LEAD'S OWN EXTRA ONE (journey test, 12 October 2026; the same rule as the
 * client's rail-attention.ts). After their first check-in the lead checks in when they choose (decision
 * 133), so a "Check in yourself" session of theirs can run ahead of the team. The open round is read from
 * the rows of the people a round waits on; only where nobody else has a row is it read from the lead's.
 */
export function theTeamsOpenRound(
  rows: (Round & { participantId?: string | null })[],
  people: { id: string; partyType?: string | null; managingOnly?: boolean | null }[],
): number {
  const choosesWhen = new Set((people ?? []).filter((p) => p.partyType === 'INITIATOR' || p.managingOnly === true).map((p) => p.id));
  const theTeams = (rows ?? []).filter((r) => !r.participantId || !choosesWhen.has(r.participantId));
  return whichRoundIsOpen(theTeams.length ? theTeams : rows ?? []);
}
