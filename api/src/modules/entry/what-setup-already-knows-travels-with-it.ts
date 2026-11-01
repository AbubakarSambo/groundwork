/**
 * WHAT SETUP ALREADY KNOWS TRAVELS WITH IT.
 *
 * Setup ran every turn from the raw transcript and nothing else. The structured read of the
 * conversation - about, people, aim, why now, cadence - was extracted on every turn, sent to the
 * screen for the summary card, and then thrown away. The next turn started cold and re-derived the
 * whole situation from a transcript that had grown by two lines.
 *
 * WHAT THAT COST, WATCHED LIVE ON A PAYMENTS SDK MIGRATION, 17 September 2026:
 *  - "Tunde leads backend, Chika owns QA, and the platform team does the merchant rollout" came
 *    back as two people. The platform team was dropped without a word.
 *  - The why-now question was never asked at all, and setup finished with that field empty.
 *  - The planned session count moved 12, then 10, then 6 while the person answered questions about
 *    something else entirely.
 * None of those are wording faults. They are what happens when the middle of a conversation has to
 * be re-read from scratch every time somebody speaks.
 *
 * SO THE READ TRAVELS. The client already holds the last extraction - it is what the summary card
 * renders - and sends it back with the next message. The prompt then opens with what is settled and
 * what is still missing, which are the two things the model was working them out for.
 *
 * WHY THE PREVIOUS TURN'S READ AND NOT THIS ONE'S. The reply and the extraction are deliberately
 * started at the same moment, because in sequence they doubled the length of a turn. Waiting for
 * this turn's extraction to write the block would undo that. The previous turn's read is already
 * computed, costs nothing, and is behind by exactly one message - which the transcript underneath
 * it supplies.
 *
 * IT IS NOT A GUARD. Nothing here inspects a reply or deletes one. It is context going in.
 */

/** The structured read of a setup conversation, as the extraction produces it. */
export interface WhatSetupHasSoFar {
  mode?: string;
  /** They said in words that there is no target. See a-check-in-with-no-aim-has-nothing-to-read-against. */
  noAimAndTheySaidSo?: boolean;
  initial?: string;
  whoInvolved?: string;
  peopleNamed?: string[];
  decision?: string;
  goals?: string[];
  brief?: string;
  cadence?: string;
  timelineDays?: number;
  /** They said it runs until they end it (request 37). */
  runsUntilEnded?: boolean;
  yourRole?: string;
}

/** Field name to the words the prompt uses for it, in the order a person would give them. */
const WHAT_EACH_ONE_IS: { key: keyof WhatSetupHasSoFar; said: string }[] = [
  { key: 'initial', said: 'What this is about' },
  { key: 'yourRole', said: 'Their own part in it' },
  { key: 'whoInvolved', said: 'Who else is in it' },
  { key: 'peopleNamed', said: 'The people named so far' },
  { key: 'decision', said: 'What makes now the right time' },
  { key: 'goals', said: 'What they want out of it' },
  { key: 'cadence', said: 'How often they check in' },
  { key: 'timelineDays', said: 'How long it runs, in days' },
  { key: 'runsUntilEnded', said: 'It runs until they end it, with no set length' },
  { key: 'brief', said: 'What they want the questions to focus on' },
];

/**
 * What setup exists to get. Anything else is welcome and none of it is chased.
 *
 * WHY NOW IS NOT ON THIS LIST ANY MORE (first experience, round 2, 31 October 2026, e36ba61be). It was taken out of the gate and out
 * of what setup never got, and left here, so this block still told the model every turn that it was missing whenever the reading of
 * the conversation took the answer for a restatement: round 5's clinic answered "Things get lost and people wait too long. That is
 * why." and was asked again. Setup's own instructions ask it once; its answer is kept when given.
 */
const WHAT_SETUP_IS_FOR: (keyof WhatSetupHasSoFar)[] = ['initial', 'whoInvolved', 'goals'];

function itIsThere(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'string') return value.trim().length > 0;
  return true;
}

function asWords(value: unknown): string {
  return Array.isArray(value) ? value.join(', ') : String(value);
}

/**
 * The block that goes above the transcript, or an empty string on the first turn when there is
 * nothing settled yet and a heading saying so would be noise.
 */
export function whatIsSettledAndWhatIsNot(soFar?: WhatSetupHasSoFar | null): string {
  if (!soFar) return '';
  const settled = WHAT_EACH_ONE_IS.filter((f) => itIsThere(soFar[f.key]));
  if (!settled.length) return '';

  const missing = WHAT_SETUP_IS_FOR.filter((k) => !itIsThere(soFar[k]))
    .map((k) => WHAT_EACH_ONE_IS.find((f) => f.key === k)!.said);

  const lines = [
    'ALREADY SETTLED, FROM WHAT THEY HAVE TYPED. Do not ask for any of it again. Build the next',
    'question on it, and say the specific thing rather than the category.',
    '',
    ...settled.map((f) => `- ${f.said}: ${asWords(soFar[f.key])}`),
  ];

  if (soFar.noAimAndTheySaidSo) {
    lines.push('- They have said there is no target to work to, and that is recorded. Do not ask for one again.');
  }

  if (missing.length) {
    /*
     * NOT READ YET IS NOT THE SAME AS NOT ANSWERED (round 5, 1 November 2026). This said "STILL MISSING", "setup is not finished while
     * any of them is missing" and "none of them is optional", and the list is a reading of the conversation that runs a turn behind and
     * keeps only what it is sure of. So whatever the reading missed was asked again, however plainly it had been said: the mobile cinema
     * lead was asked what she does after "I'm in charge of planning", and who everyone was after listing them; the clinic was asked what
     * would tell her it worked, six times. The model reads the conversation itself and decides; this only says what the reading has not
     * found yet.
     */
    lines.push(
      '',
      `NOT READ FROM THEIR WORDS YET: ${missing.join('; ')}.`,
      'Read the conversation before you ask for any of these. If they have already answered one, in any',
      'words, or said they do not know, or said it does not apply, it is answered: build on what they said',
      'and do not ask it again in other words. Ask for one only when nothing they have said answers it.',
    );
  } else {
    lines.push('', 'NOTHING IS MISSING. Setup has what it needs - stop asking and wrap it up.');
  }

  return lines.join('\n');
}
