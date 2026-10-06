/**
 * TWO QUESTIONS JOINED BY "AND" ARE STILL TWO QUESTIONS.
 *
 * Read in the 1 October review, and the existing net counts question marks:
 *
 *   "What day did they commit to sending them, and what is your plan if they miss that date?"
 *   "What is your personal target within that 40, and does the team know what their individual targets are yet?"
 *   "Who arranged that call, or how did that meeting come about?"
 *   "Are there no escalations and are the health reports consistently positive?"
 *
 * One question mark each, so a-turn-asks-one-thing, which counts them, saw one question and let them
 * through. The person answers the last thing asked, so the first is lost, and the turn reads as a list
 * (standard point 4: one question at a time).
 *
 * THE REPAIR keeps the FIRST question, whole, and nothing is reworded: the sentence is cut where the
 * second question begins and closed with its question mark. A choice between two things ("Is it the
 * price or the volume?") is one question and is never touched, and neither is anything the lead
 * confirmed word for word.
 */

import { intoSentences } from './nothing-invented-reaches-them';

const AN_INTERROGATIVE = '(?:what|how|who|whom|whose|when|where|which|why|do|does|did|is|are|was|were|will|would|can|could|have|has|had|should|shall)';

/** A question opens with a question word or an auxiliary; a statement that happens to end in ? does not. */
const OPENS_AS_A_QUESTION = new RegExp(`^\\s*(?:and\\s+|but\\s+|so\\s+)?${AN_INTERROGATIVE}\\b`, 'i');

/**
 * Where the second question begins: ", and what…", ", or how did…", " and does the team…", " and are the…".
 * "or" counts only after a comma and in front of a question word, because "price or volume" is a choice.
 */
const THE_SECOND_BEGINS = new RegExp(`(?:,\\s*(?:and|or)\\s+(?=(?:what|how|who|whom|whose|when|where|which|why|do|does|did|is|are|was|were|will|would|can|could|have|has|had|should)\\b)|\\s+and\\s+(?=(?:what|how|who|whom|whose|when|where|which|why|does|did|are|were|will|would|could|should)\\b))`, 'i');

export type OneQuestion = { text: string; cut: string[] };

export function aQuestionAsksOneThing(sentence: string): { text: string; cut: string | null } {
  const s = sentence.trimEnd();
  const space = sentence.slice(s.length);
  if (!/\?["”']?$/.test(s) || !OPENS_AS_A_QUESTION.test(s)) return { text: sentence, cut: null };
  /* Never inside quoted words: they are somebody's own. */
  if (/["“”]/.test(s)) return { text: sentence, cut: null };
  const m = THE_SECOND_BEGINS.exec(s);
  if (!m || m.index < 12) return { text: sentence, cut: null };
  const first = s.slice(0, m.index).replace(/[,\s]+$/, '');
  const rest = s.slice(m.index + m[0].length);
  /* The second half has to be a question of its own, with a subject and a verb after the question word. */
  if (rest.split(/\s+/).length < 4) return { text: sentence, cut: null };
  return { text: `${first}?${space}`, cut: rest };
}

/** The reply with every such sentence cut to its first question. `mustAsk` are the lead's confirmed words, never edited. */
export function withOneQuestionPerSentence(reply: string, mustAsk: string[] = []): OneQuestion {
  const cut: string[] = [];
  const out = intoSentences(reply).map((s) => {
    if (mustAsk.some((q) => q && s.includes(q.trim()))) return s;
    const r = aQuestionAsksOneThing(s);
    if (r.cut) cut.push(r.cut);
    return r.text;
  });
  return { text: out.join(''), cut };
}
