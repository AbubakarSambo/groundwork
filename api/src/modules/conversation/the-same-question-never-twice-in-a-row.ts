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

/*
 * AND NEVER AGAIN ONCE IT HAS BEEN ANSWERED (Hafsah, 19 October, point 3: "It never asks the same question again once it's answered.";
 * messages test after the fixes, finding 2). Kevin Omondi was asked at 14:00 on Wednesday 14 October "That is 46 units toward the 40
 * Grace set for you. You also said you were aiming for another 80 units by October 30th. Which of those stands now?" and answered "The
 * 120 units by Oct 30th is the team target. I've got 46 units towards that." Two and a half minutes and seven turns later he read
 * "Understood. Grace set a target of 40 units for you by October 30th, and you said you were aiming for another 80 units by then.
 * Which of those stands now?" The turn-before check above could not see it: it was asked further back.
 *
 * Every question this check-in asked earlier has been answered, because the person spoke after it. So the reply's question is not put
 * again where it is one asked earlier, in the same words: a question about a named thing by its words alone, any other ("Which of
 * those stands now?") only where what comes before it says again what that earlier turn said. The question, and the sentences that only said that again, are
 * replaced by the plain question this check-in has not asked yet.
 */
const SMALL = new Set(['the', 'and', 'for', 'you', 'your', 'that', 'this', 'with', 'are', 'was', 'were', 'have', 'has', 'had', 'but', 'not', 'also', 'then', 'now', 'there', 'their', 'them', 'they', 'what', 'which', 'those', 'these', 'from', 'into', 'about', 'been', 'will', 'would', 'could', 'should', 'understood', 'okay']);
const contentOf = (t: string) => bones(t).split(' ').filter((w) => w.length >= 3 && !SMALL.has(w));
const saysAgain = (sentence: string, earlier: string): boolean => {
  const words = contentOf(sentence);
  if (words.length < 3) return false;
  const there = new Set(contentOf(earlier));
  return words.filter((w) => there.has(w)).length / words.length >= 0.5;
};

/** The reply, without a question this check-in asked and the person answered earlier. */
export function notAQuestionAlreadyAnswered(reply: string, earlierAiTurns: readonly string[]): string {
  const said = String(reply ?? '').trim();
  const q = theQuestionItAsks(said);
  if (!said || !q || !earlierAiTurns.length) return said;
  const at = said.lastIndexOf(q);
  const before = said.slice(0, at);
  const sentences = (before.match(/[^.!?\n]+[.!?]+\s*|[^.!?\n]+$/g) ?? []).map((s) => s);
  const asked = earlierAiTurns.find((t) => {
    const theirs = (String(t ?? '').match(/[^.!?\n]*\?/g) ?? []).map((x) => bones(x));
    if (!theirs.includes(bones(q))) return false;
    /* A question about a named thing ("When does Savannah Cafe pay the KES 15,000 deposit?") is the same question by its words; a general
       one ("What will you do about that, and by when?") only where what comes before it says the same again. */
    if (/\d|\s[A-Z][a-z]/.test(q.trim().slice(1))) return true;
    return sentences.some((s) => saysAgain(s, t));
  });
  if (!asked) return said;
  const kept = sentences.filter((s) => !saysAgain(s, asked)).join('').trim();
  const instead = aQuestionNotYetAsked(WHAT_ELSE, [...earlierAiTurns]) ?? WHAT_ELSE;
  return `${kept ? `${kept} ` : ''}${instead}${said.slice(at + q.length)}`.replace(/[ \t]{2,}/g, ' ').trim();
}
