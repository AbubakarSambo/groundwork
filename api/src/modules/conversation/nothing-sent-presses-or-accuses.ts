/**
 * NOTHING SENT PRESSES A PERSON OR SAYS THEIR ACCOUNT IS DOUBTFUL, AND NO NAME IS SAID WITH "'S'S" (messages test, fourth run).
 *
 * Muchemi & Co. (test), Brian Otieno's WhatsApp check-in, Tuesday 13 October. Brian said "The reply in Kasarani Foods v. Tumaini
 * Traders was filed today." and "I don't know what part of Wanjiru's feedback was incorporated." He was sent:
 *
 *   "What part of Wanjiru's's feedback did you incorporate?"
 *   "That is unusual. What in the situation makes it difficult to get that information?"
 *   "The critical thing the record needs now is what happened that you cannot explain. For the record, what is preventing you from
 *    finding out how the reply was filed without Wanjiru's feedback being incorporated?"
 *   "That did not happen. Before we finish, what will you do about this, and by when?"
 *
 * The prompt already asks the model to ask and never accuse (Hafsah, 19 October, point 3). This is the check on what is sent, after
 * the model has written its turn, and it reads only the phrasing, never what the person meant:
 *  - a name said with "'s's" is said with one "'s";
 *  - a sentence that calls what the person said unusual, strange, odd or hard to believe, or answers them "That did not happen.", is
 *    cut;
 *  - a sentence about what the person "cannot explain" is cut;
 *  - a question that asks what is preventing them from finding out, knowing or explaining, after they said they do not know, is cut;
 *  - "For the record," at the front of a sentence is left off.
 * What is left stands as the model wrote it. A cut question is never left with nothing to answer: the plain question this check-in
 * has not asked yet goes in its place.
 */
import { intoSentences } from './nothing-invented-reaches-them';
import { aQuestionNotYetAsked, WHAT_ELSE } from './nobody-is-left-looking-at-a-paragraph';
import type { InstructionCut } from './our-instructions-never-reach-them';

/** "Wanjiru's's feedback" is "Wanjiru's feedback". */
export const withOnePossessive = (t: string): string => String(t ?? '').replace(/([A-Za-z])(['’])s['’]s\b/g, '$1$2s');

/* What the person said, called doubtful. */
const THEIR_ACCOUNT_DOUBTED = /^\W*(?:that|this|it)(?:\s+is|'s|’s|\s+was|\s+seems|\s+sounds)\s+(?:(?:very|quite|a bit|rather|really|a little)\s+)?(?:unusual|strange|odd|surprising|suspicious|hard to believe|difficult to believe|not credible|not believable)\b[^?]*[.!]?\s*$/i;
/* "That did not happen." said back to them as a verdict. */
const A_VERDICT = /^\W*(?:that|this|it)\s+(?:did not|didn't|didn’t|never)\s+happen(?:ed)?\W*$/i;
/* What they "cannot explain". */
const CANNOT_EXPLAIN = /\b(?:you|they|he|she)\s+(?:cannot|can't|can’t|could not|couldn't|couldn’t)\s+explain\b/i;
/* "What is preventing you from finding out ...?" */
const A_PRESSING_QUESTION = /\bwhat(?:\s+is|'s|’s)\s+(?:preventing|stopping|keeping)\s+you\s+from\s+(?:finding out|knowing|explaining|getting that information)\b/i;
const FOR_THE_RECORD = /^(\W*)for the record,\s*/i;

export function withoutPressingOrAccusing(reply: string, alreadyAsked: string[] = []): InstructionCut {
  if (!reply) return { text: reply, cut: [] };
  const once = withOnePossessive(reply);
  const sentences = intoSentences(once);
  const cut: string[] = [];
  const kept: string[] = [];
  let changed = false;
  for (const s of sentences) {
    /* What somebody said, in quotation marks, is theirs and never read here. */
    const t = s.replace(/"[^"\n]*"|“[^”]*”/g, ' ').trim();
    if (t && (THEIR_ACCOUNT_DOUBTED.test(t) || A_VERDICT.test(t) || CANNOT_EXPLAIN.test(t) || A_PRESSING_QUESTION.test(t))) { cut.push(s.trim()); continue; }
    const m = FOR_THE_RECORD.exec(s);
    if (m) changed = true;
    kept.push(m ? `${m[1]}${s.slice(m[0].length).charAt(0).toUpperCase()}${s.slice(m[0].length + 1)}` : s);
  }
  if (!cut.length && !changed) return { text: once, cut };
  let text = kept.join('').replace(/[ \t]{2,}/g, ' ').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  if (cut.some((c) => /\?\s*$/.test(c)) && !/\?/.test(text)) text = `${text ? `${text} ` : ''}${aQuestionNotYetAsked(WHAT_ELSE, alreadyAsked) ?? WHAT_ELSE}`;
  return { text: text || (aQuestionNotYetAsked(WHAT_ELSE, alreadyAsked) ?? WHAT_ELSE), cut };
}
