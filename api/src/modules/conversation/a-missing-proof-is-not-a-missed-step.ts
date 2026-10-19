import { intoSentences } from './nothing-invented-reaches-them';
import { aQuestionNotYetAsked } from './nobody-is-left-looking-at-a-paragraph';
import { WHAT_IS_ASKED_WHEN_NOTHING_IS_LEFT } from './a-record-claim-nobody-holds';

/**
 * A MISSING PROOF IS NOT A MISSED STEP, AND WAITING IS NOT MOCKED (messages test, third run, item 11).
 *
 * Muchemi & Co (test), Brian on WhatsApp, Wednesday 14 October. He was asked "Did you let her know?" and said "Yes, I did." Asked what
 * shows it, he said "I don't have that information." He was then told "You said you let Njeri know, but you don't have anything that
 * shows Njeri was informed. That gap has a name and it is worth a conversation: what was the step that was missed?" Nothing said a
 * step was missed: a thing said and not written down is still a thing said. Later, waiting on the court, he was told "Your primary task
 * today is to wait."
 *
 * Checked in code on what is sent, never by scripting the turn:
 *  - "That gap has a name", or a question about the step that was missed, straight after a sentence that says only that nothing shows
 *    it, is cut. A real difference, between two things people said, is not touched.
 *  - A sentence that tells somebody their task is to wait is cut.
 * Where nothing is left to ask, one plain question is asked that was not asked before.
 */
const NOTHING_SHOWS_IT = /\b(?:don't|do not|doesn't|does not|didn't|did not|haven't|have not|hasn't|has not)\s+(?:have\s+)?(?:anything|any\s+\w+)?\s*(?:that\s+)?(?:shows?|proves?|confirms?|backs?)\b|\bnothing\s+(?:that\s+)?(?:shows?|proves?|confirms?|backs?|written)\b|\bno\s+(?:proof|evidence|record|confirmation)\b/i;
const THE_GAP_HAS_A_NAME = /\b(?:that|this|the)\s+gap\s+has\s+a\s+name\b|\bthe\s+step\s+that\s+was\s+missed\b|\bwhat\s+(?:step|was\s+the\s+step)\s+(?:was\s+)?missed\b/i;
const YOUR_TASK_IS_TO_WAIT = /\byour\s+(?:primary\s+|main\s+|only\s+|real\s+)?(?:task|job|work)\s+(?:today\s+|now\s+)?is\s+(?:just\s+)?to\s+wait\b/i;

export function withoutAMissedStepNobodySaid(text: string, earlierAiTurns: string[] = []): { text: string; cut: string[] } {
  const sentences = intoSentences(text);
  const out: string[] = [];
  const cut: string[] = [];
  for (const s of sentences) {
    const before = out.length ? out[out.length - 1] : '';
    if (YOUR_TASK_IS_TO_WAIT.test(s) || (THE_GAP_HAS_A_NAME.test(s) && (NOTHING_SHOWS_IT.test(before) || NOTHING_SHOWS_IT.test(s)))) {
      cut.push(s.trim());
      continue;
    }
    out.push(s);
  }
  if (!cut.length) return { text, cut };
  const kept = out.join('').trim();
  const asks = /\?/.test(kept);
  const ask = aQuestionNotYetAsked(WHAT_IS_ASKED_WHEN_NOTHING_IS_LEFT, earlierAiTurns) ?? WHAT_IS_ASKED_WHEN_NOTHING_IS_LEFT;
  return { text: asks ? kept : `${kept}${kept ? ' ' : ''}${ask}`.trim(), cut };
}
