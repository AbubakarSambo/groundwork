import type { ASuggestionFromTheEngine } from './suggestions.service';
import { thresholdFor, type SuggestionThresholds } from './thresholds';
import { theCountSaidToThePerson } from '../grounds/your-board';

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
  /** The label of whoever runs the check-in, so the person is told who Groundwork suggests it to. */
  leadLabel?: string | null;
  /**
   * What the person's own board would already tell them (grounds/your-board.ts, `keptLately`, week
   * 9): kept over settled, in the window a threshold is read against. Fetching and computing that
   * count stays your-board.ts's job alone (kept-in-the-last-four-weeks-is-yours-alone.spec.ts) -
   * this file only reads the two numbers it is handed.
   */
  commitmentsSettledRecently: CommitmentsSettledRecently | null;
  /**
   * The person's own words, where the engine has words that answer for what is behind it. The
   * listener passes none today: the lead reads the person's side, their answer to the suggestion
   * itself (suggestions.listener.ts says why the last thing they typed is not used).
   */
  ownWords: string | null;
}

/**
 * A SHARE, SAID AS PEOPLE SAY IT: "half", "six in ten" (the prototype's "When fewer than 6 in 10 are
 * kept", said in words so a sentence never mixes words and figures), or "45 in 100" for anything
 * that is not a tenth.
 */
const TENS = ['none', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
export function aShareInWords(fraction: number): string {
  if (fraction === 0.5) return 'half';
  const tenths = Math.round(fraction * 10);
  if (Math.abs(fraction * 10 - tenths) < 1e-9) return `${TENS[tenths]} in ten`;
  return `${Math.round(fraction * 100)} in 100`;
}

/**
 * WHAT THE LEAD READS, WITH NO COUNT BEHIND IT (decision 53, decision 60.2). It says what happened,
 * by name, over the same four weeks the person's own count covers, and that it is in this check-in,
 * so it is never read as the person's load across check-ins. No number at all, not even the four of
 * "four weeks", so nothing the lead reads can be taken for a count.
 */
function whyForTheLead(name: string): string {
  return `In the last four weeks, ${name} has kept fewer of the commitments made in this check-in than Groundwork looks for.`;
}

function whatWouldChangeItForTheLead(name: string): string {
  return `If ${name} keeps more of the commitments made in this check-in over the next four weeks.`;
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
  const toWhom = record.leadLabel?.trim() || 'the person who runs this check-in';
  const theLine = aShareInWords(threshold.keptBelow);
  /* The person's count, in the prototype's words ("In the last 4 weeks, you kept 11 of your 20
     commitments."), said of this check-in, since that is what it counts. */
  const theirCount = theCountSaidToThePerson(kl.kept, kl.of).replace(/\.$/, ' in this check-in.');
  return {
    groundId,
    aboutParticipantId: record.aboutParticipantId,
    verdict: 'support',
    headline: `Groundwork suggests extra support for ${name}`,
    why: whyForTheLead(name),
    whatWouldChangeIt: whatWouldChangeItForTheLead(name),
    theirOwnAnswer: record.ownWords,
    ifYouAgree: `Extra support for ${name} over the next four weeks, agreed with ${name}.`,
    otherChoices: ['Keep things as they are', `Talk it through with ${name} before deciding`],
    factsForThem: `${theirCount} When fewer than ${theLine} are kept, Groundwork suggests extra help to ${toWhom}.`,
    whatWouldChangeItForThem: `Keeping at least ${theLine} of your commitments in this check-in over the next four weeks.`,
  };
}

/**
 * WHETHER THE PERSON IS BACK AT OR ABOVE THE LINE (decision 75, item 24, on decision 61's threshold). True when
 * at least as many commitments are settled as the threshold needs and the share kept is at or above its line;
 * false when they are settled and still below it; null when there is too little to tell, or no threshold, in
 * which case nothing about a suggestion already reached is changed.
 */
export function backAtTheLine(record: Pick<TheRecordForOnePerson, 'commitmentsSettledRecently'>, thresholds: SuggestionThresholds): boolean | null {
  const threshold = thresholdFor(thresholds, 'support');
  const kl = record.commitmentsSettledRecently;
  if (!threshold || !kl || kl.of < threshold.overPeriods || kl.of <= 0) return null;
  return kl.kept / kl.of >= threshold.keptBelow;
}
