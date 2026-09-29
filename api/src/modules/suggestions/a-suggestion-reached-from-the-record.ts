import type { ASuggestionFromTheEngine } from './suggestions.service';
import { thresholdFor, type SuggestionThresholds } from './thresholds';

/**
 * REACHING A SUGGESTION FROM THE RECORD (week 10 of docs/weekly-plan.md; decision 6).
 *
 * What goes in, for one person: kept and missed commitments (keptLately, grounds/your-board.ts,
 * already built for their own board, decision 24 / week 9), patterns that have reached whoever
 * runs the check-in (decision 39 - only those already past the person's turn), blockers said in
 * the check-in, and the person's own words. Never a rating (decision 38), never a label (decision
 * 11): nothing here reads `specificity`, `confidence`, `severity` or any internal pattern code.
 *
 * NO THRESHOLD, NO SUGGESTION (decision 33, decision 53's "the more private way"). `thresholdFor`
 * returns null when nothing is set for a verdict, and that is read here as "this verdict is not
 * reached today" - not as "use some default", which would reach a suggestion nobody asked for.
 *
 * DECISION 53: THE MANAGER GETS NO COUNT. `factsForThem` and `whatWouldChangeItForThem` are for the
 * person alone (decision 24: "the count stays the person's alone") and may say how many were kept.
 * `headline`, `why`, `whatWouldChangeIt`, `ifYouAgree` and `otherChoices` are what the lead reads
 * (a-suggestion-told-like-a-signal.ts, forTheLead), and never carry a number: no "11 of 20", no
 * percentage, nothing a manager could read as a count behind the suggestion.
 *
 * Only "support" is reached today, from commitments kept, which is the one number the record
 * already holds cleanly (keptLately). Reward, plan and exit read the same record differently and
 * are not reached yet; a threshold set for them today does nothing until that reading is built,
 * which is honest, not a bug: nothing is reached from a verdict this file does not yet know how to
 * read, whatever threshold is set for it.
 */

export interface CommitmentsSettledRecently {
  kept: number;
  /** How many were settled (kept or not done) in the window. */
  of: number;
}

export interface TheRecordForOnePerson {
  aboutParticipantId: string;
  /** The name this person is called in the engine's stored text (their party label, e.g. "Tobi X"). */
  aboutLabel: string;
  /**
   * What the person's own board would already tell them (grounds/your-board.ts, `keptLately`, week
   * 9): kept over settled, in the window a threshold is read against. Fetching and computing that
   * count stays your-board.ts's job alone (kept-in-the-last-four-weeks-is-yours-alone.spec.ts) -
   * this file only reads the two numbers it is handed.
   */
  commitmentsSettledRecently: CommitmentsSettledRecently | null;
  /** The person's own words, closest to what is behind it - shown to the lead only once they have answered. */
  ownWords: string | null;
}

const roundedShare = (kept: number, of: number): number => (of ? Math.round((kept / of) * 100) : 0);

/**
 * "Below what Groundwork looks for" said plainly, without the fraction that made it true - the
 * count stays the person's alone (decision 24), so the lead never reads how far under the mark it
 * was, only that it was under it.
 */
function whyForTheLead(): string {
  return 'Commitments have been kept less often than Groundwork looks for, over several check-ins.';
}

function whatWouldChangeItForTheLead(): string {
  return 'Keeping more of what is agreed, over the next few check-ins.';
}

/**
 * The one suggestion this file knows how to reach from the record, or null. `groundId` is the
 * check-in the record was read from; the engine calls `SuggestionsService.record` with what comes
 * back, which is itself the only door a suggestion is ever written through.
 */
export function aSuggestionFromTheRecord(
  groundId: string,
  record: TheRecordForOnePerson,
  thresholds: SuggestionThresholds,
): ASuggestionFromTheEngine | null {
  const threshold = thresholdFor(thresholds, 'support');
  if (!threshold) return null;

  const kl = record.commitmentsSettledRecently;
  if (!kl || kl.of < threshold.overPeriods) return null;
  const share = kl.of ? kl.kept / kl.of : 1;
  if (share >= threshold.keptBelow) return null;

  const name = record.aboutLabel;
  return {
    groundId,
    aboutParticipantId: record.aboutParticipantId,
    verdict: 'support',
    headline: `Groundwork suggests extra support for ${name}`,
    why: whyForTheLead(),
    whatWouldChangeIt: whatWouldChangeItForTheLead(),
    theirOwnAnswer: record.ownWords,
    ifYouAgree: `Extra support agreed with ${name} for the next few check-ins.`,
    otherChoices: ['Keep things as they are', 'Talk it through with ' + name + ' before deciding'],
    factsForThem: `In the last few check-ins, you kept ${kl.kept} of ${kl.of} commitments. That is ${roundedShare(kl.kept, kl.of)} in 100. When fewer are kept than Groundwork looks for, Groundwork suggests extra support to your lead.`,
    whatWouldChangeItForThem: 'Keeping more of what you agree to, over the next few check-ins.',
  };
}
