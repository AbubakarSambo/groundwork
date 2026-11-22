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

type ARow = Round & { participantId?: string | null; isSetup?: boolean | null; availableFrom?: Date | string | null; createdAt?: Date | string | null };
const when = (d: Date | string | null | undefined): number | null => (d ? new Date(d).getTime() : null);

/**
 * EVERY ROW IN THE TEAM'S NUMBERING (release test, 21 November 2026). A person's sessions are numbered from their own first one, so
 * somebody added in week 3 does their session 1 while the team does session 3. Every count read the raw numbers, so Olu's first session
 * held session 1 open again: Today, the check-ins list and Ask said "6 of 7 have checked in" about session 1, which the team had finished
 * weeks before, while three people had not checked in for this week's; the participant's board said "None of the 12 check-ins is done
 * yet", and the lead's board read "Juma has checked in" from his session 1.
 *
 * The check-in runs on its own rhythm, the same for the whole team (decision 135), so a session is the team's session it opened in. A
 * person whose first row was written while the team was already on session k has their rows moved on by k - 1: Olu's session 1 counts
 * as session 3, his session 2 as session 4. Everybody who was there from the start keeps their numbers. The rows a person sees and
 * answers keep their own numbers (their first session is still their first); only counting reads this. Running it twice changes nothing.
 */
export function inTheTeamsNumbering<T extends ARow>(rows: T[]): T[] {
  const sessions = (rows ?? []).filter((r) => !r.isSetup && r.participantId);
  const firstOf = new Map<string, T>();
  for (const r of sessions) {
    const f = firstOf.get(r.participantId!);
    if (!f || r.sessionNumber < f.sessionNumber) firstOf.set(r.participantId!, r);
  }
  const shift = new Map<string, number>();
  for (const [who, first] of firstOf) {
    const written = when(first.createdAt);
    if (written == null) continue;
    /* The team's session when their first row was written: the newest session anybody else had open by then. */
    const opened = sessions.filter((r) => r.participantId !== who && (when(r.availableFrom) ?? when(r.createdAt) ?? Infinity) <= written).map((r) => r.sessionNumber);
    const theTeams = opened.length ? Math.max(...opened) : first.sessionNumber;
    if (theTeams > first.sessionNumber) shift.set(who, theTeams - first.sessionNumber);
  }
  if (!shift.size) return rows ?? [];
  return (rows ?? []).map((r) => (!r.isSetup && r.participantId && shift.has(r.participantId) ? { ...r, sessionNumber: r.sessionNumber + shift.get(r.participantId)! } : r));
}

/**
 * THE TEAM'S SESSION IS THE LATEST ONE THAT HAS BEGUN (Hafsah, 22 November 2026: "Should a session count as over once the next one has
 * started, even if some people missed it?" "Yes, move it on").
 *
 * This held the team at the lowest round somebody had not finished, so two people who never answered session 2 kept the board on
 * "Check-in 2 of 12" after three check-ins, Today counted session 2 while the board's own lines counted session 4, and the weekly letter
 * disagreed with both. A session has begun once somebody has started it or its day to open has come (`now`); a row written ahead for next
 * week has not. The latest begun is the team's session, and every earlier one is over: whoever did not answer it missed it
 * (missed-check-ins.ts reads every session before this one as closed). Before anything has begun, the first is the one about to open.
 * Read in the team's numbering, so somebody added late never pulls it back.
 */
export function whichRoundIsOpen(given: (Round & { availableFrom?: Date | string | null })[], now?: Date): number {
  if (!given.length) return 0;
  const rows = inTheTeamsNumbering(given as ARow[]);
  const begun = rows.filter((r) => r.status !== 'NOT_STARTED' || (!!now && when(r.availableFrom) != null && when(r.availableFrom)! <= now.getTime()));
  return begun.length ? Math.max(...begun.map((r) => r.sessionNumber)) : Math.min(...rows.map((r) => r.sessionNumber));
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
  now?: Date,
): number {
  const choosesWhen = new Set((people ?? []).filter((p) => p.partyType === 'INITIATOR' || p.managingOnly === true).map((p) => p.id));
  const theTeams = (rows ?? []).filter((r) => !r.participantId || !choosesWhen.has(r.participantId));
  return whichRoundIsOpen(theTeams.length ? theTeams : rows ?? [], now);
}
