/**
 * KEEPING WHAT THE REPORT SAID AT THE END OF EACH ROUND.
 *
 * The live `Report` is one row and every round rewrites it, so at day 90 there is one picture and
 * no way to know what the day-14 one said - or that it ever said anything different. A ninety-day
 * account was being re-derived from transcripts rather than read back from the record.
 *
 * This decides two things and touches nothing: whether a completed round is worth keeping, and
 * whether what arrives is a new round or an amendment to one already kept.
 */

export interface RoundPicture {
  sharedPicture: string;
  agreements: unknown;
  divergences: unknown;
  centralQuestion: string;
}

export interface Kept extends RoundPicture {
  round: number;
  takenAt: Date;
  amendedAt: Date | null;
}

export type Decision =
  | { keep: false; because: string }
  | { keep: true; as: 'new' }
  | { keep: true; as: 'amendment'; note: string };

/**
 * A ROUND WITH NOTHING IN IT IS NOT A ROUND.
 *
 * A synthesis can complete with an empty picture - one party in, the other silent, the model
 * correctly refusing to invent the missing half. Keeping that as the permanent account of a round
 * would put "nothing was established" in somebody's record for a fortnight where the truth is that
 * the round had not finished.
 */
export function decide(now: RoundPicture, kept: Kept | null): Decision {
  if (!now.sharedPicture?.trim()) return { keep: false, because: 'the round produced no picture' };
  if (!kept) return { keep: true, as: 'new' };

  /*
   * NOTHING CHANGED, SO NOTHING IS MARKED. Synthesis runs on every check-in completion, and a
   * round that is re-synthesised without changing must not collect a trail of amendments saying
   * it was touched. "Amended" has to mean something when a reader sees it.
   */
  if (same(now, kept)) return { keep: false, because: 'nothing about this round changed' };

  return { keep: true, as: 'amendment', note: whatChanged(now, kept) };
}

function same(a: RoundPicture, b: RoundPicture): boolean {
  return a.sharedPicture.trim() === b.sharedPicture.trim()
    && a.centralQuestion.trim() === b.centralQuestion.trim()
    && JSON.stringify(a.agreements ?? null) === JSON.stringify(b.agreements ?? null)
    && JSON.stringify(a.divergences ?? null) === JSON.stringify(b.divergences ?? null);
}

/**
 * WHAT CHANGED, IN WORDS A PERSON READS.
 *
 * Named parts rather than a diff. Somebody opening a round they read a fortnight ago wants to know
 * that the account of the disagreement moved - not which characters differ.
 *
 * It never says WHY. The cause is a late correction somebody made in their own check-in, and this
 * has no way to know which, so it says what and leaves the rest alone.
 */
function whatChanged(now: RoundPicture, kept: Kept): string {
  const moved: string[] = [];
  if (now.sharedPicture.trim() !== kept.sharedPicture.trim()) moved.push('the shared picture');
  if (JSON.stringify(now.agreements ?? null) !== JSON.stringify(kept.agreements ?? null)) moved.push('what was agreed');
  if (JSON.stringify(now.divergences ?? null) !== JSON.stringify(kept.divergences ?? null)) moved.push('where what people said differed');
  if (now.centralQuestion.trim() !== kept.centralQuestion.trim()) moved.push('the question it left open');

  const list = moved.length > 1
    ? `${moved.slice(0, -1).join(', ')} and ${moved[moved.length - 1]}`
    : moved[0] ?? 'this round';

  return `Updated after somebody added to or corrected their own check-in. ${moved.length > 1 ? 'The parts that changed were' : 'The part that changed was'} ${list}.`;
}
