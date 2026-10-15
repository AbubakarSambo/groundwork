/**
 * AN AIM TO REACH, OR A LIMIT NOT TO GO OVER (decision 69, 1 October 2026), AND NOW EACH OF THE
 * PROTOTYPE'S FIVE KINDS OF TARGET (decision 75, item 17, 2 October 2026).
 *
 * Hafsah, on the spending limit the board read as an aim reached: "instead of guessing, give each
 * target a direction field, set when the target is made: an aim to reach, or a limit not to go over".
 * The words in the name can suggest it, and the lead confirms it. Then: "All five target kinds from
 * the prototype are built: Up, Lower is better, Rate, Deadline and Zero."
 *
 * THE FIVE KINDS, as the prototype names them and as a person reads them here:
 *   AIM       "Up"               something to reach: a count that should go up to its number.
 *   LIMIT     "Lower is better"  a limit not to go over: at or under its number is within it.
 *   RATE      "Rate"             a share to keep at or above: a percentage over a period, not a count.
 *   DEADLINE  "Deadline"         a date to meet (`GroundObjective.dueOn`): done by then, or not.
 *   ZERO      "Zero"             a count to keep at zero: any at all is a breach.
 * AIM and LIMIT keep the names they were stored under, because they already meant the first two kinds.
 *
 * This file stores nothing.
 * 1. `whatTheWordsSuggest` is the suggestion, from the words of the name (and its number). The same
 *    reading the board falls back on for a limit, so the two never disagree.
 * 2. `whichWayItIsSaid` is the sentence a say-back carries, so a yes to the say-back is a yes to the
 *    kind. Only a kind the lead has read and said yes to is ever written.
 * 3. `theQuestionAboutWhichWay` is the question a screen asks the lead under a target nobody has given
 *    a kind, offering the five in plain words. The lead answers through the board's own update route.
 */
import { aNumberPeopleCanRead } from './an-aim-is-a-sentence-about-somebody';
import { theWordsSayItIsALimit, type TargetDirection } from './a-measure-that-goes-down-is-still-going-well';
import { theDayInWords, aDateOnly } from './the-day-in-words';

export type { TargetDirection };
export const TARGET_DIRECTIONS: readonly TargetDirection[] = ['AIM', 'LIMIT', 'RATE', 'DEADLINE', 'ZERO'];

/** The prototype's own name for each kind, as its template screens print it. */
export const THE_KINDS_NAME: Record<TargetDirection, string> = {
  AIM: 'Up', LIMIT: 'Lower is better', RATE: 'Rate', DEADLINE: 'Deadline', ZERO: 'Zero',
};

/** Each kind in plain words, as a person is asked about it. */
export const THE_KIND_IN_PLAIN_WORDS: Record<TargetDirection, string> = {
  AIM: 'something to reach',
  LIMIT: 'a limit not to go over',
  RATE: 'a share to keep at or above',
  DEADLINE: 'a date to meet',
  ZERO: 'a count to keep at zero',
};

/** The five, in one plain sentence, for a say-back that confirms a target's kind. */
export const THE_FIVE_KINDS_SAID =
  'A number can be something to reach, a limit not to go over, a share to keep at or above, a date to meet, or a count to keep at zero.';

/** A kind from a request or a row, or null for anything else. Null means not set. The prototype's names are taken too. */
export function asADirection(v: unknown): TargetDirection | null {
  const s = typeof v === 'string' ? v.trim().toUpperCase().replace(/[\s-]+/g, '_') : '';
  if (s === 'UP') return 'AIM';
  if (s === 'LOWER_IS_BETTER') return 'LIMIT';
  return (TARGET_DIRECTIONS as readonly string[]).includes(s) ? (s as TargetDirection) : null;
}

/** Whether a kind says nothing more than up or down, the two the board has always read. */
export const isAnAimOrALimit = (d: TargetDirection | null | undefined): d is 'AIM' | 'LIMIT' => d === 'AIM' || d === 'LIMIT';

/* What the words of a name suggest, beyond a limit. Each only ever a suggestion the lead confirms. */
const SAYS_A_SHARE = /%|\b(?:per ?cent|percentage|rate|share of|ratio|proportion)\b/i;
const SAYS_A_DATE = /\b(?:deadline|due date|launch date|finish date|go-live date|by day \d+)\b/i;
const SAYS_ZERO = /\b(?:zero|no (?:more )?(?:incidents?|breaches|errors|complaints)|unexplained|critical (?:gaps?|incidents?))\b/i;

/** What the words of the name, and its number, suggest. A suggestion only: never stored until the lead has said yes to it. */
export function whatTheWordsSuggest(name: string | null | undefined, target?: number | null): TargetDirection {
  const n = name ?? '';
  /* A number of nought, or words that say nothing at all is allowed with no other number, is a count to keep at zero. */
  if (target === 0 || (target == null && SAYS_ZERO.test(n))) return 'ZERO';
  if (SAYS_A_DATE.test(n)) return 'DEADLINE';
  /* A limit is read before a share: "stay under 35% of sales" is a limit on a share, not a share to keep at 35% or more. */
  if (theWordsSayItIsALimit(n)) return 'LIMIT';
  return SAYS_A_SHARE.test(n) ? 'RATE' : 'AIM';
}

/** The name as it is quoted inside a sentence: no full stop of its own, straight quotes. */
function quoted(name: string): string {
  return `"${(name ?? '').trim().replace(/[.\s]+$/, '').replace(/"/g, "'")}"`;
}

/** A share as a person reads it: "90%". */
export const aShare = (n: number): string => `${aNumberPeopleCanRead(n)}%`;

/** The day a deadline is due, "30 October", or null where nobody has said. */
export function theDayItIsDue(dueOn: Date | string | null | undefined, now: Date = new Date()): string | null {
  const d = aDateOnly(dueOn);
  return d ? theDayInWords(d, now) : null;
}

/**
 * The say-back's sentence for one target with a number, one sentence for each kind.
 *   "Pumps sold" is an aim of 40 to reach.
 *   "Spending this quarter" is a limit of 180,000 not to go over.
 *   "Follow-up within 48 hours" is a share to keep at 90% or more.
 *   "Month-end close" is a date to meet, by 5 October.
 *   "Unexplained transactions" is a count to keep at zero, so any at all is a breach.
 */
export function whichWayItIsSaid(name: string, target: number, direction: TargetDirection, dueOn?: Date | string | null, now: Date = new Date()): string {
  switch (direction) {
    case 'LIMIT': return `${quoted(name)} is a limit of ${/%|per ?cent/i.test(name) ? aShare(target) : aNumberPeopleCanRead(target)} not to go over.`;
    case 'RATE': return `${quoted(name)} is a share to keep at ${aShare(target)} or more.`;
    case 'DEADLINE': {
      const day = theDayItIsDue(dueOn, now);
      return day ? `${quoted(name)} is a date to meet, by ${day}.` : `${quoted(name)} is a date to meet, and the date still has to be set.`;
    }
    case 'ZERO': return `${quoted(name)} is a count to keep at zero, so any at all is a breach.`;
    default: return `${quoted(name)} is an aim of ${aNumberPeopleCanRead(target)} to reach.`;
  }
}

/** The few words a list line ends with, in the setup conversation's list of what it took. */
export const AN_AIM_TO_REACH = 'an aim to reach';
export const A_LIMIT_NOT_TO_GO_OVER = 'a limit not to go over';
export function theListsWordsFor(direction: TargetDirection): string {
  switch (direction) {
    case 'LIMIT': return A_LIMIT_NOT_TO_GO_OVER;
    case 'RATE': return 'a share to keep at or above';
    case 'DEADLINE': return 'a date to meet';
    case 'ZERO': return 'a count to keep at zero';
    default: return AN_AIM_TO_REACH;
  }
}

/**
 * The question a screen asks the lead under a target with a number and no kind. It follows the aim's
 * own sentence on the board ("Bisi is aiming for 40 approved facilities."), so it names only the
 * number, and it offers the five kinds in plain words. Null where there is no number, because a target
 * that is only tracked has no way to go.
 */
export function theQuestionAboutWhichWay(target: number | null | undefined): string | null {
  if (target == null || !Number.isFinite(target)) return null;
  return `What kind of number is ${aNumberPeopleCanRead(target)}? It can be something to reach, a limit not to go over, a share to keep at or above, a date to meet, or a count to keep at zero.`;
}
