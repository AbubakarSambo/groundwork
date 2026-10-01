/**
 * AN AIM TO REACH, OR A LIMIT NOT TO GO OVER (decision 69, 1 October 2026).
 *
 * Hafsah, on the spending limit the board read as an aim reached: "instead of guessing, give each
 * target a direction field, set when the target is made: an aim to reach, or a limit not to go over".
 * The words in the name can suggest it, and the lead confirms it.
 *
 * So this file does three small things, and stores nothing.
 *
 * 1. `whatTheWordsSuggest` is the suggestion: a limit where the name says budget, cap, limit, within,
 *    no more than, or under a number, and an aim otherwise. It is the same reading the board falls
 *    back on (a-measure-that-goes-down-is-still-going-well.ts), so the two never disagree.
 * 2. `whichWayItIsSaid` is the sentence a say-back carries, so a yes to the say-back is a yes to the
 *    direction. Only a direction the lead has read and said yes to is ever written.
 * 3. `theQuestionAboutWhichWay` is the sentence a screen shows the lead under a target nobody has set
 *    a direction for. The lead answers it through the board's own update route.
 */
import { aNumberPeopleCanRead } from './an-aim-is-a-sentence-about-somebody';
import { theWordsSayItIsALimit, type TargetDirection } from './a-measure-that-goes-down-is-still-going-well';

export type { TargetDirection };
export const TARGET_DIRECTIONS: readonly TargetDirection[] = ['AIM', 'LIMIT'];

/** A direction from a request or a row, or null for anything else. Null means not set. */
export function asADirection(v: unknown): TargetDirection | null {
  const s = typeof v === 'string' ? v.trim().toUpperCase() : '';
  return s === 'AIM' || s === 'LIMIT' ? s : null;
}

/** What the words of the name suggest. A suggestion only: never stored until the lead has said yes to it. */
export function whatTheWordsSuggest(name: string | null | undefined): TargetDirection {
  return theWordsSayItIsALimit(name) ? 'LIMIT' : 'AIM';
}

/** The name as it is quoted inside a sentence: no full stop of its own, straight quotes. */
function quoted(name: string): string {
  return `"${(name ?? '').trim().replace(/[.\s]+$/, '').replace(/"/g, "'")}"`;
}

/**
 * The say-back's sentence for one target with a number.
 *   "Pumps sold" is an aim of 40 to reach.
 *   "Spending this quarter" is a limit of 180,000 not to go over.
 */
export function whichWayItIsSaid(name: string, target: number, direction: TargetDirection): string {
  return direction === 'LIMIT'
    ? `${quoted(name)} is a limit of ${aNumberPeopleCanRead(target)} not to go over.`
    : `${quoted(name)} is an aim of ${aNumberPeopleCanRead(target)} to reach.`;
}

/** The few words a list line ends with, in the setup conversation's list of what it took. */
export const AN_AIM_TO_REACH = 'an aim to reach';
export const A_LIMIT_NOT_TO_GO_OVER = 'a limit not to go over';
export function theListsWordsFor(direction: TargetDirection): string {
  return direction === 'LIMIT' ? A_LIMIT_NOT_TO_GO_OVER : AN_AIM_TO_REACH;
}

/**
 * The question a screen asks the lead under a target with a number and no direction. It follows the
 * aim's own sentence on the board ("Bisi is aiming for 40 approved facilities."), so it names only the
 * number. Null where there is no number, because a target that is only tracked has no way to go.
 */
export function theQuestionAboutWhichWay(target: number | null | undefined): string | null {
  if (target == null || !Number.isFinite(target)) return null;
  return `Is ${aNumberPeopleCanRead(target)} something to reach, or a limit not to go over?`;
}
