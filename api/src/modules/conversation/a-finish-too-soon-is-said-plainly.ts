import { WANTS_OUT } from './close-readiness';
import { intoSentences } from './nothing-invented-reaches-them';

/**
 * "FINISH" BEFORE THERE ARE ENOUGH ANSWERS IS ANSWERED PLAINLY (reviewer, 14 October).
 *
 * Grace typed "finish" after two answers and read '"Finish" is an outcome. What would have to exist ...'. The model took
 * her word for an answer. When it is too soon to close, the product says so in one plain sentence, and the model's own
 * question stays under it; any sentence that treats "finish" as something she said about the work comes off.
 */
const SMALL = ['no', 'one', 'two', 'three', 'four', 'five'];

export function youCanFinishAfter(more: number): string {
  const n = Math.max(1, more);
  return n === 1 ? 'You can finish after one more answer.' : `You can finish after ${SMALL[n] ?? n} more answers.`;
}

const TREATS_FINISH_AS_AN_ANSWER = /["“'‘]\s*finish(?:ed)?\s*[.!]?\s*["”'’]|^\s*finish(?:ed)?\s+(?:is|means|sounds)\b/i;

export function aFinishTooSoon(reply: string, more: number): string {
  const kept = intoSentences(reply ?? '').filter((s) => !TREATS_FINISH_AS_AN_ANSWER.test(s)).join('').trim();
  return `${youCanFinishAfter(more)}${kept ? ` ${kept}` : ''}`;
}

/**
 * LEAVING BEFORE THREE ANSWERS (reviewer, 14 October): the check-in closes on what they said, in one plain sentence, and
 * nothing more is asked. A daily check-in can take more later the same day; any other says the next check-in.
 */
export const WHAT_YOU_SAID_IS_KEPT = (cadence: string | null | undefined): string =>
  cadence === 'DAILY'
    ? 'Thanks. I have what you said so far, and you can add more later today.'
    : 'Thanks. I have what you said so far, and you can add more in your next check-in.';

/** Leaving with nothing on record yet: nothing is closed, and nothing is asked. */
export const NOTHING_KEPT_YET_COME_BACK = 'Thanks. That is not quite enough to keep this check-in yet, so it stays open, and you can add more whenever you are ready.';

/** Nothing at all was said: every message is only the leaving words, or a few characters ("I am done", "ok"). */
export function nothingRealWasSaid(theirTurns: string[]): boolean {
  const g = new RegExp(WANTS_OUT.source, WANTS_OUT.flags.includes('g') ? WANTS_OUT.flags : `${WANTS_OUT.flags}g`);
  return theirTurns.every((t) => (t ?? '').replace(g, ' ').replace(/[^\p{L}\p{N}]+/gu, ' ').trim().length < 12);
}
