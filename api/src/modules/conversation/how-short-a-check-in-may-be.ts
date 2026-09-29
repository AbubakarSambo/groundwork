/**
 * HOW SHORT A CHECK-IN MAY BE BEFORE IT IS ALLOWED TO CLOSE.
 *
 * Read on a live run, 11 September: a participant's session offered to finish after three answers.
 * The product tells people a check-in takes about ten minutes; three answers is about three, and the
 * session that closed there was scored vague on all five of its dimensions. A record that thin is
 * the one that most needed another question, and the close-readiness module already says so in its
 * own words: the thinnest records get the tidiest endings.
 *
 * The engine's close is the model's judgement about whether it is "genuinely wrapping up", and the
 * only number under it was three - which existed to stop a DEADLOCK rather than to say what a
 * check-in is worth. It is doing two jobs and it is set for the other one.
 *
 * WHAT THIS DOES NOT DO. It does not trap anybody. Somebody who says they are finished is let out on
 * that sentence, at any point, by `askedToFinish`. Somebody who says plainly there is nothing this
 * time is let out on that. And a close that has been held back once is honoured whatever the record
 * looks like, so the most this can ever cost is one more question.
 *
 * ONE NUMBER, IN ONE PLACE, and that is the point of the file. It was written out twice - once
 * where the engine decides to offer the close and once where the server accepts it - and the two
 * halves disagreeing is a deadlock: the screen offers to finish, the input disables, and the server
 * refuses for being a turn short, with no way left to add one. That has happened here before.
 */

/** A full check-in. Raised from three on 11 September; see above. */
export const A_CHECK_IN_IS_NOT_DONE_IN = 5;

/**
 * A CORRECTION IS A DIFFERENT OBJECT and keeps its floor of one.
 *
 * Somebody reopening a released report to say "that is not what I said" has one thing to add. Asking
 * them for five answers to record one correction would be the product arguing with them.
 */
export const A_CORRECTION_IS_NOT_DONE_IN = 1;

/**
 * A TEAM UPDATE IS SHORTER AGAIN. Hafsah, 22 September 2026, on an update she had just given: "at
 * the end of the update session I just got 'a few more exchanges are needed' as a pop, so I couldn't
 * end the session." An update is the lead's one question, answered - the open link promises "about
 * two minutes" - and five answers to it is the product arguing with somebody who has said their
 * piece. Three: the question, what it needs, and the one thing the product asks back.
 */
export const AN_UPDATE_IS_NOT_DONE_IN = 3;

export function theFloorFor(isSelfCorrection: boolean, scenario?: string | null): number {
  if (isSelfCorrection) return A_CORRECTION_IS_NOT_DONE_IN;
  return scenario === 'TEAM_UPDATES' ? AN_UPDATE_IS_NOT_DONE_IN : A_CHECK_IN_IS_NOT_DONE_IN;
}


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
