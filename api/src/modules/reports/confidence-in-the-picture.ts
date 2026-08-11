/**
 * CONFIDENCE IN THE PICTURE, NOT A MARK ON THE PERSON. (G30, and the answer to G9)
 *
 * Same measurement, pointed at the right object.
 *
 *   "Low specificity"                    reads as a judgement of somebody
 *   "we are not confident this part of   is the same fact without the verdict
 *    the picture is complete"
 *
 * The measurement was never wrong. What was wrong is that it was attached to a
 * person, so a thin week became a property of the human being who had it. The
 * fix is not a softer word for the same thing - it is changing what the sentence
 * is ABOUT. A record can be thin. A person cannot be thin.
 *
 * WHY THIS MATTERS MORE THAN IT SOUNDS. Everything else in the report is careful
 * about this - gaps are about the work, divergences are about accounts, the
 * contribution read refuses to state a position. The specificity number was the
 * one place a verdict on a person survived, and it survived because it looks like
 * arithmetic and arithmetic feels neutral.
 *
 * G31 LIVES HERE TOO, because it is the same idea from the other end. A claim
 * resting on one account in session 4 with nothing else supporting it is not the
 * same as one three people described independently, and showing that difference
 * at the point of the claim is what stops a report being over-read. It is also
 * the honest basis for G10's "what nobody has evidence for".
 */

export type ConfidenceBand = 'well covered' | 'partly covered' | 'thin' | 'nothing yet';

export interface PictureConfidence {
  band: ConfidenceBand;
  /** What the reader should do with it. Never what the person should do. */
  line: string;
}

/**
 * The confidence read for one part of the picture.
 *
 * @param scoredSessions how many sessions have been scored at all
 * @param meanLevel the mean of the scored dimension levels, 0-3
 */
export function confidenceInThePicture(scoredSessions: number, meanLevel: number): PictureConfidence {
  if (scoredSessions === 0) {
    return {
      band: 'nothing yet',
      // Not "no data". Nobody has been asked, which is a fact about the ground.
      line: 'Nothing has been scored here yet, so this part of the picture has not been built rather than being empty.',
    };
  }
  if (meanLevel >= 2) {
    return {
      band: 'well covered',
      line: 'This part of the picture is well covered: most of what is described here could be checked against something.',
    };
  }
  if (meanLevel >= 1) {
    return {
      band: 'partly covered',
      line: 'Part of this picture rests on things that could be checked and part does not. Read the specifics, not the summary.',
    };
  }
  return {
    band: 'thin',
    // The sentence that used to say "low specificity" about a person.
    line: 'We are not confident this part of the picture is complete. What is here is general rather than checkable, so it is a weak basis for a decision about anybody.',
  };
}

/**
 * G31. What a claim rests on, said at the claim.
 *
 * The three cases a reader needs told apart, and the reason the middle one
 * exists: "one account, unsupported" and "one account, and nobody disagreed" look
 * identical in a report and mean very different things on a ground where the
 * others simply never covered that ground.
 */
export interface Provenance {
  /** How many separate accounts said it. */
  accounts: number;
  /** Whether anything else in the record supports it. */
  supported: boolean;
  /** Whether anybody's account contradicts it. */
  contradicted: boolean;
  /** Where it was first said, so a reader can go and look. */
  firstSeenSession?: number;
}

export function provenanceLine(p: Provenance): string {
  const where = p.firstSeenSession ? ` (session ${p.firstSeenSession})` : '';

  if (p.contradicted) {
    return `Described differently by more than one person${where}. This is a difference between accounts, not a settled fact.`;
  }
  if (p.accounts >= 2) {
    return `Described independently by ${p.accounts} people${where}.`;
  }
  if (p.supported) {
    return `One account${where}, with something else in the record supporting it.`;
  }
  return `One account${where}, and nothing else in the record touches it. Nobody has disagreed, and nobody has confirmed it either.`;
}

/**
 * May a claim be read as settled?
 *
 * The point of G31 in one call. A single unsupported account is a real thing
 * somebody said and worth reading; it is not a fact the ground has established,
 * and a report that presents the two identically is asking to be over-read.
 */
export function isSettled(p: Provenance): boolean {
  if (p.contradicted) return false;
  return p.accounts >= 2 || (p.accounts >= 1 && p.supported);
}

/**
 * G32. Somebody contradicting THEMSELVES between sessions.
 *
 * Divergence between people exists. A person saying one thing in session 3 and
 * the opposite in session 9 does not surface at all, and on a long ground it is
 * at least as informative - it is usually the moment something changed that
 * nobody announced.
 *
 * NOT A GOTCHA, and the wording carries the whole difference. People are allowed
 * to change their minds; most changes of mind are somebody learning something.
 * What is worth surfacing is that it happened and that nobody said so, because
 * the unstated version leaves everybody else working from the old one.
 */
export interface SelfContradiction {
  earlier: { text: string; session: number };
  later: { text: string; session: number };
}

export function selfContradictionLine(c: SelfContradiction): string {
  return `In session ${c.earlier.session} this was described one way and in session ${c.later.session} another. Changing your mind is not a problem; the question is whether anybody else knows it changed.`;
}

/**
 * G33. The report is the current best reading, and says so.
 *
 * One sentence, and it belongs on every report rather than in a footer. A record
 * that presents itself as final invites people to argue with it instead of
 * adding to it, which is the opposite of what it is for.
 */
export const CURRENT_BEST_READING =
  'This is the picture as it stands, from what has been said so far. It is not a verdict, and the next session can change any part of it.';
