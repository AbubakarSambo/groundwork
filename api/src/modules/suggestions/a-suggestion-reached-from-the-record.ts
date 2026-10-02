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
 * THE MANAGER READS THE COUNT BEHIND IT (decision 86, which reverses decision 53's "a plain line with
 * no count"). The person still reads it first (`factsForThem`, and the lead's timing in
 * a-suggestion-told-like-a-signal.ts). `why` and `whatWouldChangeIt`, which the lead reads, now say
 * how many of the commitments made in this check-in were kept, and the line Groundwork looks for, as
 * the prototype's suggestion does ("In the last 4 weeks, Daniel kept 11 of his 20 commitments.").
 * Only this check-in is counted, so it never says anything of the person's load across check-ins.
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
 * HOW MANY SOMEBODY KEPT, SAID ABOUT THEM BY NAME, FOR THE PERSON WHO RUNS THE CHECK-IN OR WRITES THE
 * REVIEW (decision 86). Numbers up to ten are words, as the person's own count is (your-board.ts,
 * `keptLatelySays`), and larger ones are figures. `where` says which commitments were counted, so
 * the sentence never reads as the person's load across check-ins.
 */
export function keptOfSaidAbout(name: string, kept: number, of: number, where: string): string {
  const n = (x: number) => (of <= 10 ? TENS[x] : String(x));
  if (of === 1) return kept === 1 ? `${name} kept the one commitment ${where}` : `${name} did not keep the one commitment ${where}`;
  if (of === 2 && kept === 2) return `${name} kept both of the commitments ${where}`;
  if (of === 2 && kept === 0) return `${name} did not keep either of the two commitments ${where}`;
  if (kept === 0) return `${name} kept none of the ${n(of)} commitments ${where}`;
  if (kept === of) return `${name} kept all ${n(of)} of the commitments ${where}`;
  return `${name} kept ${n(kept)} of the ${n(of)} commitments ${where}`;
}

/**
 * WHAT THE LEAD READS (decision 86): what happened, by name, with the count behind it, over the same
 * four weeks the person's own count covers, and only in this check-in.
 */
function whyForTheLead(name: string, kept: number, of: number, theLine: string): string {
  const weeks = of <= 10 ? 'four' : '4';
  const share = of ? Math.round((kept / of) * 100) : 0;
  return `In the last ${weeks} weeks, ${keptOfSaidAbout(name, kept, of, 'made in this check-in')}. That is ${share}%. When fewer than ${theLine} are kept, Groundwork suggests extra support.`;
}

function whatWouldChangeItForTheLead(name: string, theLine: string): string {
  return `If ${name} keeps at least ${theLine} of the commitments made in this check-in over the next four weeks.`;
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
    why: whyForTheLead(name, kl.kept, kl.of, theLine),
    whatWouldChangeIt: whatWouldChangeItForTheLead(name, theLine),
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
