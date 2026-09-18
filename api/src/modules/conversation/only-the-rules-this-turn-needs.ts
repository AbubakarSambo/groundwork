/**
 * ONLY THE RULES THIS TURN NEEDS.
 *
 * The engine prompt is one string, sent whole, on every turn of every conversation. Measured on 18
 * September 2026 it was 113,543 characters, and the day's work established two things about it that
 * point the same way.
 *
 * FIRST, ADDING TO IT SUBTRACTS SOMEWHERE ELSE. A rule written into the middle of it behaved like a
 * suggestion and was disobeyed on the next live run. Then a paragraph added at the front of the
 * settled block - telling setup that the aim was the one thing it could not skip - made the
 * conversation monomaniacal: it hammered the aim, never reached why-now at all, and captured FEWER
 * aims than before. You do not get to choose what falls out.
 *
 * SECOND, ALMOST NONE OF IT IS WASTE. The obvious answer was to cut, and the measurement did not
 * support it: exactly repeated lines are 2.4% of the prompt, and what looked like piles of
 * duplicated examples turned out to be ten distinct rules sharing one heading. There is one real
 * exception, the ninety-code pattern library, which was a reference list for a different pass and
 * has been removed. Beyond that, cutting means removing rules that work.
 *
 * SO NOTHING IS REMOVED FROM THE PRODUCT. It is removed from the TURNS WHERE IT CANNOT APPLY.
 *
 * The clearest case is GOAL ALIGNMENT, 13,019 characters - twelve per cent of the whole prompt. Its
 * own first paragraph says it is "the fallback for when there is none", meaning when the situation
 * the lead picked has no prompt of its own. All twenty-two situations have one. It also records the
 * live fault it caused: a lead setting objectives got the fallback's sales opener AND the
 * situation's opening AND the alignment step from both, in one conversation. So it has been riding
 * along on every turn of every conversation, never meant to run, and once demonstrably running.
 *
 * WHAT THIS IS NOT. It is not a guard: it inspects no reply, scores nothing, deletes no sentence
 * anybody wrote. It is the difference between handing somebody a manual and handing them the page.
 */

/** What is true about the turn being built, and nothing else. */
export interface WhatThisTurnIs {
  /**
   * THE FIRST MESSAGE OF A SESSION, WHICH IS A DIFFERENT JOB FROM A TURN.
   *
   * It is written before the person has said anything, so most of the engine - what to do when they
   * are vague, how to probe a claim, how to close, what to acknowledge - is about a conversation
   * that has not started. Measured 18 September 2026: with the whole engine behind it, thirteen of
   * twenty-two lead openers and fifteen of twenty-two participant ones still explained what the
   * check-in was for, in spite of a short instruction at the very end telling them not to. The
   * instruction is read and then outweighed.
   *
   * So the opener is given what a first line needs - the voice, the tone, the words we do not use,
   * the situation's own prompt and everything known about this ground - and not the rest.
   */
  isTheOpener?: boolean;
  /** The situation the lead picked has a prompt of its own. True for all 22 today. */
  hasASituationPack: boolean;
  /** 1 for the first session, higher afterwards. */
  sessionNumber: number;
}

interface Routed {
  /** The heading exactly as it appears between the separator rules. */
  heading: string;
  /** Why this section can be left out, in the words of the section itself where possible. */
  because: string;
  needed: (turn: WhatThisTurnIs) => boolean;
}

/**
 * EVERY ENTRY HERE NEEDS A REASON YOU COULD DEFEND TO SOMEBODY WHO WROTE THE SECTION.
 *
 * The bar is not "this looks situational". It is that the section states its own condition, or that
 * the condition is structural and unarguable. Anything else stays on every turn, because the cost of
 * wrongly dropping a rule is a conversation that quietly loses a behaviour nobody notices for weeks.
 */
/**
 * THE SECTIONS A FIRST LINE HAS NO USE FOR. Each one is about a conversation already underway: what
 * to do with an answer, how to probe it, what to acknowledge, how to close. None of it can apply to
 * a message written before anybody has said anything.
 *
 * WHAT DELIBERATELY STAYS, because an opener is still the product talking: WHO YOU SOUND LIKE, TONE
 * STATES, the vocabulary and the banned words, the survivable-truth principle, and every runtime
 * block - the situation's own prompt, the brief, the people, the aim, what they said last time.
 */
const NOT_FOR_A_FIRST_LINE = [
  'CONVERSATION QUALITY RULES: follow these on every exchange',
  'POSITIVE SIGNAL DETECTION: name these when you see them',
  'LIVE FEEDBACK RULES',
  'QUALITY OF DELIVERY: four questions for every named deliverable',
  'CHECK-IN ENDING: record summary, not feedback summary',
  'ORGANISATIONAL ONTOLOGY: pattern library',
  'INJECTION LAYER: three tiers, use as instructed',
  'CONTRIBUTION TAXONOMY: classify every submission',
  'THE THREE FAILURE ORIGINS: the most important diagnostic',
  'REFUSING TO TAKE PART, AND SUSPICION OF THE TOOL',
];

export const WHAT_CAN_BE_LEFT_OUT: Routed[] = [
  ...NOT_FOR_A_FIRST_LINE.map((heading) => ({
    heading,
    because: 'it is about a conversation already underway, and an opener is written before anybody has spoken',
    needed: (t: WhatThisTurnIs) => !t.isTheOpener,
  })),
  {
    heading: 'GOAL ALIGNMENT: the most important first conversation',
    because:
      'Its own opening says it is the fallback for when the situation has no prompt of its own, and every situation has one.',
    needed: (t) => !t.hasASituationPack,
  },
  {
    heading: 'RETURNING USER OPENING',
    because: 'It is how to open a session for somebody who has been here before. Session one has nobody returning.',
    needed: (t) => t.sessionNumber >= 2,
  },
];

const SEPARATOR = /═{20,}/;

/**
 * Split on the separator rules the prompt already uses, drop the sections this turn cannot need, and
 * put it back together. A heading that is not found changes nothing, so an edit to the prompt can
 * never break this - it can only make it stop saving anything, which a test catches.
 */
export function onlyTheRulesThisTurnNeeds(engineRules: string, turn: WhatThisTurnIs): string {
  if (!engineRules) return engineRules;
  const parts = engineRules.split(SEPARATOR);
  const drop = new Set(
    WHAT_CAN_BE_LEFT_OUT.filter((r) => !r.needed(turn)).map((r) => r.heading),
  );
  if (!drop.size) return engineRules;

  const kept: string[] = [];
  for (let i = 0; i < parts.length; i++) {
    const heading = parts[i].trim().split('\n')[0]?.trim() ?? '';
    /*
     * A section is a heading between two separators, then its body up to the next separator. So a
     * dropped section takes its own heading, the separator that closed it, and its body.
     */
    if (drop.has(heading) && i + 1 < parts.length) {
      i++;
      continue;
    }
    kept.push(parts[i]);
  }
  return kept.join('═══════════════════════════════════════════════════════════');
}

/** What was left out and why, for the log - so a shrinking prompt is never a silent change. */
export function whatWasLeftOut(turn: WhatThisTurnIs): string[] {
  return WHAT_CAN_BE_LEFT_OUT.filter((r) => !r.needed(turn)).map((r) => `${r.heading} (${r.because})`);
}
