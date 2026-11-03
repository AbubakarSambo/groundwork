/**
 * WHETHER A CHECK-IN HAS ANYTHING IN IT TO KEEP. The only bar on a close: no count of answers, no floor and no hold (Hafsah, 2 November
 * 2026: no question limits and no forced close). The turn floors that lived here (five answers before Groundwork could close, three before
 * a person's finish was honoured, three for a team update) are gone; a person may finish at any point once anything is said, and the
 * model closes when it has what it needs.
 */

/**
 * WHETHER THERE IS ALMOST NOTHING HERE YET, READ ONE WAY BY BOTH ENDS OF THE CLOSE (request 47).
 *
 * The server's completion refuses an empty record: under 50 characters in all (20 for a
 * correction), or fewer than two answers of twelve characters or more (one for a correction). The
 * engine's close did not ask, so a person who said "please finish" after three short answers read
 * "Your report is ready now. Speak soon." and was then refused. Both ends read this now, so the
 * closing words are never written for a record the server will not write.
 */
export function almostNothingHereYet(personTurns: string[], isSelfCorrection: boolean): boolean {
  const lengths = personTurns.map((t) => (t ?? '').trim().length);
  const total = lengths.reduce((a, b) => a + b, 0);
  const real = lengths.filter((n) => n >= 12).length;
  return total < (isSelfCorrection ? 20 : 50) || real < (isSelfCorrection ? 1 : 2);
}
