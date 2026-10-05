/**
 * THE JUDGEMENT IS THE LEAD'S, AND NATHAN READ HIS OWN.
 *
 * Run live on 25 September 2026, the performance-plan scenario. The participant asked for his own
 * report and the product handed him this, word for word:
 *
 *   "The initiator is about to put Nathan on a formal plan for not hitting a target Nathan does not
 *    know exists."
 *
 * and, under what to do:
 *
 *   "Close your two open actions: to 'make myself available to help' and to 'put Nathan on a formal
 *    plan'."
 *
 * Sixteen of the twenty-four scenarios did it, and in every one of the sixteen the participant's
 * copy was character-for-character the lead's. Not a near miss, not a summary: the same object.
 *
 * WHY IT HAPPENED, WHICH MATTERS MORE THAN THAT IT DID. Nothing decided to send it. `asItWasShared`
 * spreads the stored report row, and `theJudgement` is a column on that row - so the leak is the
 * default and every field added to that table from now on leaks too, until somebody remembers. The
 * board did the same thing one level up, gated on `isInitiator || releasedAt`, so a participant got
 * it the moment the round closed.
 *
 * SO THIS IS A LIST OF WHAT A PARTICIPANT MAY NOT HAVE, APPLIED AT THE READ, and the two callers
 * both use it. A denylist rather than an allowlist for one reason: the shared picture is the
 * product. Everybody reads `sharedPicture`, `agreements` and `centralQuestion` - that is what a
 * check-in is for and the site says so. What nobody but the lead may read is the layer written
 * ABOUT people rather than FROM them.
 *
 * `findings` is the exception that proves it: it is a real per-person array, so it is narrowed
 * rather than dropped. A person keeps their own row and loses everybody else's.
 */

/**
 * Written for the lead, about the people. None of it may reach a participant.
 *
 * Each one is here because of what it holds, not because of where it came from:
 *
 *   theJudgement      the gap, what to do, and who to start with. A verdict on the room.
 *   theTable          the engine's own working (see the-table-is-for-the-engine, which now takes
 *                     it away from every reader including the lead - it stays on this list because
 *                     a denylist that forgets a field the moment it is handled elsewhere is how
 *                     the field comes back).
 *   divergences       the lead's reading of where accounts disagree, naming the sides.
 *   leadershipGaps    what the lead is not doing. Theirs to read about themselves.
 *   networkPicture    who is load-bearing across the whole check-in.
 *   inferences        what the engine concluded that nobody said.
 *   arcSignals        the shape of somebody's delivery record over time.
 *   direction         the STORED column, spread from the row and narrowed for nobody.
 *
 * `theDirection` is deliberately NOT on this list, and the difference is worth stating because an
 * earlier draft of this file got it wrong and dropped it. The stored `direction` column is the raw
 * read; `theDirection` is that column put through `presentTheDirection(stored, viewerLabel)` and
 * re-added per reader, further down the same assembly. On a discovery session the lead's copy and a
 * participant's copy are already different objects. It is the room's own account of what it named,
 * which is the shared picture in another shape - so taking it away would have left a participant
 * with a blank discovery report to protect them from their own words.
 */
export const NOT_A_PARTICIPANT_READ = [
  'theJudgement',
  'theTable',
  'divergences',
  'leadershipGaps',
  'networkPicture',
  'inferences',
  'arcSignals',
  'arcAdvisories',
  'direction',
] as const;

/**
 * ONLY THIS PERSON'S OWN FINDING.
 *
 * `findings` is one row per party, each holding that party's account in prose. A participant keeps
 * the row that is about them and loses the rest. Rows with no `participantId` are dropped rather
 * than kept: a row that cannot say whose it is cannot be shown to somebody who is not its subject.
 */
export function onlyTheirOwnFinding(findings: unknown, viewerParticipantId: string | null): unknown {
  if (!Array.isArray(findings)) return findings;
  if (!viewerParticipantId) return [];
  return findings.filter((f: any) => f && typeof f === 'object' && f.participantId === viewerParticipantId);
}

/**
 * WHAT A PARTICIPANT MAY READ, from whatever the report read has assembled.
 *
 * Returns a new object. Deliberately does not mutate: the same assembled report is handed to the
 * board and to the report in one request in at least one path, and a shared object that one caller
 * has emptied is a bug nobody finds for a month.
 *
 * A lead gets the whole thing back untouched - this is not the place the lead's own reads are
 * decided, and adding a second opinion about that here is how two files come to disagree.
 */
export function whatAParticipantMayRead<T extends Record<string, any>>(
  report: T,
  viewer: { isLead: boolean; participantId: string | null },
): T {
  if (viewer.isLead) return report;
  if (!report || typeof report !== 'object') return report;

  const out: Record<string, any> = { ...report };
  for (const key of NOT_A_PARTICIPANT_READ) {
    if (key in out) delete out[key];
  }
  if ('findings' in out) out.findings = onlyTheirOwnFinding(out.findings, viewer.participantId);
  return out as T;
}

/**
 * The same rule for the board, which reaches for two of these fields by name rather than spreading
 * a row. Kept beside the list so the board cannot drift from the report: a field added above is
 * gone from both the moment it is added, and neither caller has to be edited.
 */
import { aJudgementThatReadsRight } from './the-judgement-reads-right';

export function theBoardsJudgementFor(
  report: { theJudgement?: unknown; theTable?: unknown } | null | undefined,
  /* `theReaderIsTheOnlyPerson` for a check-in of one (request 136 item 7): see the-judgement-reads-right. */
  viewer: { isLead: boolean; theReaderIsTheOnlyPerson?: boolean },
): { theJudgement: unknown; theTable: unknown } {
  if (!viewer.isLead) return { theJudgement: null, theTable: null };
  /*
   * AND THE TABLE IS NULL FOR THE LEAD TOO, WHICH IS THE PART THAT CHANGED.
   *
   * This used to hand the lead `report.theTable` - the engine's counting sheet - and the lead is
   * the reader nothing else protects. It is slot names, dotted counts, "1 people", lower-case
   * sentences, and a standing on how each person's answers were rated, which a lead may never see
   * at all. 400 machine-table words on the lead's board across the twenty-four scenarios, and 400
   * more on their report.
   *
   * The key stays, and stays null, rather than being dropped: the board's response has always had
   * this field and the client reads it by name. What is gone is anything ever being in it. See
   * the-table-is-for-the-engine, which is also where the report's own read strips it, so a board
   * built from an already-stripped row and this line agree.
   */
  return { theJudgement: aJudgementThatReadsRight(report?.theJudgement ?? null, { theReaderIsTheOnlyPerson: viewer.theReaderIsTheOnlyPerson }), theTable: null };
}
