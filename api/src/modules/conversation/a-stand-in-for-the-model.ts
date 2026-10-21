/**
 * A STAND-IN FOR THE MODEL, FOR A LOCAL BROWSER TEST ONLY (browser test, 20 October 2026).
 *
 * A browser test on a computer with no model key still has to walk through a web check-in and Ask. With
 * GROUNDWORK_MODEL_STAND_IN=fixed-questions set, and only then, the model seam (AnthropicService) calls no model
 * at all: a conversation turn is answered with one of a few fixed plain questions, chosen by how many times the
 * person has written; a request for structured output (extract) answers "nothing found", exactly as a model that
 * found nothing would; a file is not read.
 *
 * It can never run in production: with NODE_ENV=production and the variable set, the API refuses to start. Any
 * value other than "fixed-questions" also refuses to start, so a typo cannot quietly turn the real model off.
 * Unset, nothing here changes anything.
 */
import type { ChatTurn } from './anthropic.service';

export const MODEL_STAND_IN_ENV = 'GROUNDWORK_MODEL_STAND_IN';

/** The fixed plain questions, in the order a person meets them. The last one ends the turn politely. */
export const THE_STAND_IN_QUESTIONS = [
  'What did you get done since your last check-in?',
  'What is in your way, if anything?',
  'What will you do next, and by when?',
  'Thank you. That is everything for this check-in.',
] as const;

/** What a file read says while the stand-in is on: the file was kept, and it was not read. */
export const THE_STAND_IN_READ_NO_FILE = 'This file was kept but not read, because the model stand-in for a local test is on.';

/**
 * Whether the stand-in is on. Throws (so the API refuses to start) when it is asked for in production, or asked
 * for by a value it does not know.
 */
export function theModelStandInIsOn(env: NodeJS.ProcessEnv = process.env): boolean {
  const asked = env[MODEL_STAND_IN_ENV];
  if (asked === undefined || asked === '') return false;
  if (env.NODE_ENV === 'production') {
    throw new Error(`Refusing to start: ${MODEL_STAND_IN_ENV} is set and NODE_ENV is production. The model stand-in is for a local test only.`);
  }
  if (asked !== 'fixed-questions') {
    throw new Error(`Refusing to start: ${MODEL_STAND_IN_ENV} is "${asked}". The only value it takes is "fixed-questions"; leave it unset to use the model.`);
  }
  return true;
}

/** The stand-in's reply to a conversation: the next fixed question, by how many times the person has written. */
export function theStandInReply(history: ChatTurn[]): string {
  const written = history.filter((t) => t.role === 'user').length;
  return THE_STAND_IN_QUESTIONS[Math.min(Math.max(written - 1, 0), THE_STAND_IN_QUESTIONS.length - 1)];
}
