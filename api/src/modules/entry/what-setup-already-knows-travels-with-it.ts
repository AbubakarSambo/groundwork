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
 * The four that setup exists to get. Anything else is welcome and none of it is chased.
 *
 * `decision` is on this list because of the run above: it is the one that quietly never gets asked,
 * and the one the summary card then has no row for.
 */
const WHAT_SETUP_IS_FOR: (keyof WhatSetupHasSoFar)[] = ['initial', 'whoInvolved', 'decision', 'goals'];

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
    lines.push(
      '',
      `STILL MISSING: ${missing.join('; ')}.`,
      'One of those is the next question, unless they have just raised something that matters more.',
      'AND SETUP IS NOT FINISHED WHILE ANY OF THEM IS MISSING. Do not wrap up, do not say you have',
      'what you need, and do not hand them to the next screen. Read live on the first day this block',
      'existed: knowing what was missing made the conversation shorter rather than more complete - it',
      'closed after four turns having never asked what they wanted out of it.',
      '',
      /*
       * THIS HELD A PARAGRAPH ABOUT THE AIM AND IT MADE THE CONVERSATION MONOMANIACAL.
       *
       * Measured 18 September 2026 across all 22 situations: told loudly that the aim was the one
       * thing it could not skip, setup hammered the aim, never reached why-now at all, and captured
       * FEWER aims than before - what-makes-now-the-right-time went from ten out of twenty-two to
       * zero, and the aim stayed at zero. Adding weight to an overweight prompt takes something out
       * somewhere else, and you do not get to choose where.
       *
       * The aim is still in the gate, where it belongs and costs nothing to say. The prompt has to
       * lose weight before it can be told one more thing.
       */
      'None of them is optional and none of them is more important than the others.',
    );
  } else {
    lines.push('', 'NOTHING IS MISSING. Setup has what it needs - stop asking and wrap it up.');
  }

  return lines.join('\n');
}
