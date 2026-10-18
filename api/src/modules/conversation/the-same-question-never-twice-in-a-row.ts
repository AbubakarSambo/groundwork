import { insteadOfAFiller } from './the-same-sentence-five-times';
import { aQuestionNotYetAsked, WHAT_ELSE } from './nobody-is-left-looking-at-a-paragraph';

/**
 * THE SAME QUESTION NEVER GOES OUT TWICE IN A ROW (Drop Access run 1, items 26, 27 and 28).
 *
 * Joseph read "Grace expects 40 units sold by October 30, and you said your goal is 10 units from Mama Pima. Which one is it
 * now?" five times in a row on day 9, and Mercy read "Regarding Tuskys Westgate, you said signed orders and proof of payment for
 * the 40 units would tell me they were sold ... Which is the goal now?" three times in a row on day 8, each time after she had
 * answered it. A guard further up already replaces a reply that is the previous one word for word, but other steps run after it
 * and can put the same question back. So this is read last, on the text that is saved: where the reply, or the question it asks,
 * is the one the person was asked on the turn before, it does not go out again. The question is never rewritten by a model here:
 * what replaces it is the plain question this check-in has not asked yet, the same one every other fallback uses.
 *
 * NOT A NEW CONVERSATION RULE. It does not decide what to ask; it only stops the one turn the person has just answered being put
 * to them again, word for word.
 */
const bones = (t: string) => String(t ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const AN_ACKNOWLEDGEMENT = /^\s*(?:understood|okay|ok|got it|noted|right|thank you|thanks|that is down|i see)[.,!]?\s*/i;
const core = (t: string) => bones(String(t ?? '').replace(AN_ACKNOWLEDGEMENT, ''));

/** The last question a turn asks, as written. */
export function theQuestionItAsks(text: string): string | null {
  const qs = String(text ?? '').match(/[^.!?\n]*\?/g) ?? [];
  const q = qs.length ? qs[qs.length - 1].trim() : '';
  return q || null;
}

/** The reply, or the reply with its question replaced, so it is never the question asked on the turn before. */
export function notTheSameQuestionTwiceInARow(reply: string, earlierAiTurns: readonly string[]): string {
  const said = String(reply ?? '').trim();
  const last = earlierAiTurns.length ? String(earlierAiTurns[earlierAiTurns.length - 1] ?? '') : '';
  if (!said || !last.trim()) return said;
  const earlier = [...earlierAiTurns];
  if (core(said) === core(last)) {
    /* And not the same "Understood." it opened with last time. */
    const first = insteadOfAFiller(earlier.length + 1, earlier);
    const opened = (t: string) => bones(t).split(' ')[0];
    return opened(first) === opened(last) ? insteadOfAFiller(earlier.length + 2, earlier) : first;
  }
  const q = theQuestionItAsks(said);
  const before = theQuestionItAsks(last);
  if (!q || !before || bones(q) !== bones(before)) return said;
  const instead = aQuestionNotYetAsked(WHAT_ELSE, earlier) ?? WHAT_ELSE;
  const at = said.lastIndexOf(q);
  const rest = `${said.slice(0, at)}${instead}${said.slice(at + q.length)}`.replace(/[ \t]{2,}/g, ' ').trim();
  return rest;
}
