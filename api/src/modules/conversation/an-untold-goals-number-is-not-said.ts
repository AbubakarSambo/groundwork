/**
 * DECISION 56, ITEM 2, SECOND LAYER. `describeObjective` in prompt-library.ts already gives the
 * model only the area of an untold goal - no number, no date, no target - and tells it never to say
 * a goal has been set. That is the structural half. This is the instruction's own check: a reply is
 * screened for the number the lead has not shared yet, or for saying the lead has set anything at
 * all, and if it slipped through, the model is asked again once - the same shape as every other
 * reply guard in conversation.service.ts (see, for example, isAVerdictAboutSomebodyElse).
 *
 * ONLY THE GOALS STILL NOT TOLD ON THIS CHECK-IN, never a goal that has been told, so a plain "your
 * target of 40" about a goal the person already knows about is never touched.
 */

export interface AnUntoldGoal {
  /** The full sentence as the lead wrote it - never shown to the model, only checked against here. */
  text: string;
  /** The number itself, where the row carries one (PersonObjective.target). */
  target?: string | null;
}

/** Every run of digits in a string, three or more so a session count ("session 2") is not a false hit. */
function numbersIn(text: string): string[] {
  return [...(text ?? '').matchAll(/\d[\d,]*(?:\.\d+)?/g)].map((m) => m[0].replace(/,/g, ''));
}

const SAYS_A_GOAL_EXISTS =
  /\b(?:your|their|his|her)\s+(?:lead|manager)\s+(?:has\s+)?(?:set|given|assigned)\s+(?:you\s+|them\s+|him\s+|her\s+)?(?:a\s+)?(?:goal|target|objective|expectation|number)\b/i;
const SAYS_A_TARGET_EXISTS =
  /\b(?:you(?:'ve| have)|they(?:'ve| have)|there(?:'s| is))\s+(?:got\s+)?a\s+(?:goal|target|objective)\s+(?:of|to|for|set)\b/i;

/**
 * True when the reply gives away the number a still-untold goal is measured by, or states outright
 * that a goal, target or expectation has been set for this work. The area itself (the words with the
 * number and date taken out) is fine to mention - that is what the model was given to ask about.
 */
export function saysWhatAnUntoldGoalWithholds(reply: string, untold: AnUntoldGoal[]): boolean {
  const said = (reply ?? '').trim();
  if (!said || !untold.length) return false;
  if (SAYS_A_GOAL_EXISTS.test(said) || SAYS_A_TARGET_EXISTS.test(said)) return true;
  const saidNumbers = new Set(numbersIn(said));
  if (!saidNumbers.size) return false;
  for (const o of untold) {
    if (o.target && saidNumbers.has(String(o.target).replace(/,/g, ''))) return true;
    for (const n of numbersIn(o.text)) if (n.length >= 2 && saidNumbers.has(n)) return true;
  }
  return false;
}

/** The instruction sent back when the first reply withheld nothing. */
export const IT_NAMED_THE_UNTOLD_NUMBER =
  'Your last reply stated a number, a target, or that a goal has been set, about work the person '
  + 'has not been told a goal exists for yet. Their lead has not told them - only the lead can. '
  + 'Write it again: ask about the work itself, in plain terms, and say nothing about a number, a '
  + 'target, a deadline connected to one, or that anything has been set for them.';
