/**
 * A CONCLUSION NOBODY DREW IS NEVER SENT, AND NOR IS AN ACCUSATION (Hafsah, 19 October, point 3: "the check-in never states as fact
 * something nobody said, and never accuses anyone (for example 'That it was filed today tells me it was not reviewed by Wanjiru')").
 *
 * Muchemi & Co. (test), Brian Otieno's WhatsApp check-in, Tuesday 13 October. Brian said "The reply in Kasarani Foods v. Tumaini
 * Traders was filed today." and read back:
 *
 *   "Understood. That it was filed today tells me it was not reviewed by Wanjiru. What made it impossible to get Wanjiru's review
 *    before filing?"
 *
 * Nobody had said the reply was not reviewed. The check-in then asked three times why. The prompt already asks the model to ask rather
 * than conclude; this is the structural answer, as the earlier guard on our own instructions is (our-instructions-never-reach-them):
 * every reply is saved through one step, and that step cuts
 *  - a sentence that draws a conclusion of its own ("X tells me", "that means", "which suggests", "so ... was not") that something did
 *    not happen, or happened without somebody, where nothing the person said, here or before, says it; and
 *  - a question that takes such a thing as given ("What made it impossible to ...", "Why didn't ...", "Why was it not ...") where nothing
 *    the person said says it.
 * What they did say stands, word for word: had Brian said "Wanjiru did not review it", both would go out. Never left empty: where nothing
 * is left, the plain question this check-in has not asked yet.
 */
import { intoSentences } from './nothing-invented-reaches-them';
import { aQuestionNotYetAsked, WHAT_ELSE } from './nobody-is-left-looking-at-a-paragraph';
import type { InstructionCut } from './our-instructions-never-reach-them';

/* "tells me", "that means", "which suggests", "this shows", "so it was not". */
const A_CONCLUSION_OF_OURS = /\b(?:tells me|tell me|tells us|suggests|implies|indicates|means(?: that)?|shows(?: that)?|so (?:it|this|that|he|she|they|you)\b[^.?!]*\b(?:was|were|is|are|did|has|had)\b)/i;
/* That something did not happen, or not with somebody. */
const A_NEGATIVE = /\b(?:not|never|no one|nobody|without|n't)\b|n't\b/i;
/* A question that takes a failure as given. */
const A_LOADED_QUESTION = /^\W*(?:what made it impossible|what stopped (?:you|him|her|them)|what kept (?:you|him|her|them) from|why (?:didn't|did not|wasn't|was not|weren't|were not|hasn't|has not|haven't|have not|couldn't|could not|isn't|is not|aren't|are not|don't|do not|doesn't|does not)\b|why (?:did|was|were|has|have|could|is|are|do|does) (?:\S+ ){1,4}(?:not|never)\b)/i;

const STOP = new Set(['that', 'this', 'with', 'from', 'have', 'been', 'were', 'what', 'when', 'tells', 'tell', 'made', 'impossible', 'before', 'after', 'today', 'there', 'their', 'them', 'they', 'your', 'about', 'would', 'could', 'should', 'which', 'means', 'shows', 'suggests', 'implies', 'indicates', 'stopped', 'kept', 'from', 'didn', 'wasn', 'weren', 'hasn', 'haven', 'couldn', 'isn', 'aren', 'doesn', 'never', 'without', 'nobody', 'get', 'got', 'does', 'did', 'was', 'not']);
const stem = (w: string) => w.replace(/'s$/, '').replace(/(?:ing|ed|es|s)$/, '');
const keyWords = (t: string) => [...new Set((String(t ?? '').toLowerCase().replace(/[‘’]/g, "'").match(/[a-z][a-z']+/g) ?? [])
  .map((w) => w.replace(/'s$/, '')).filter((w) => w.length >= 4 && !STOP.has(w)).map(stem))];

/** Whether something the person said, in one sentence, says this negative thing: its words, with a "not" of its own. */
function theySaidIt(claim: string, sayable: readonly string[]): boolean {
  const keys = keyWords(claim);
  if (!keys.length) return true;
  return sayable.some((t) => intoSentences(String(t ?? '')).some((s) => {
    if (!A_NEGATIVE.test(s.replace(/[‘’]/g, "'"))) return false;
    const said = new Set(keyWords(s));
    return keys.filter((k) => said.has(k)).length >= Math.min(keys.length, 2);
  }));
}

export function withoutAConclusionNobodyDrew(reply: string, sayable: readonly string[], alreadyAsked: string[] = []): InstructionCut {
  if (!reply) return { text: reply, cut: [] };
  const sentences = intoSentences(reply);
  const cutHere = sentences.map((s) => {
    /* What somebody said, in quotation marks, is theirs and never read here. */
    const t = s.replace(/"[^"\n]*"|“[^”]*”/g, ' ').replace(/[‘’]/g, "'").trim();
    if (!t) return false;
    if (/\?\s*$/.test(t)) return A_LOADED_QUESTION.test(t) && !theySaidIt(t, sayable);
    const m = A_CONCLUSION_OF_OURS.exec(t);
    if (!m) return false;
    const after = t.slice(m.index);
    return A_NEGATIVE.test(after) && !theySaidIt(after, sayable);
  });
  if (!cutHere.some(Boolean)) return { text: reply, cut: [] };
  const cut: string[] = [];
  const kept: string[] = [];
  sentences.forEach((s, i) => (cutHere[i] ? cut.push(s.trim()) : kept.push(s)));
  let text = kept.join('').replace(/[ \t]{2,}/g, ' ').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  /* A cut question leaves the turn with nothing to answer: the plain question this check-in has not asked yet. */
  if (cut.some((c) => /\?\s*$/.test(c)) && !/\?/.test(text)) text = `${text ? `${text} ` : ''}${aQuestionNotYetAsked(WHAT_ELSE, alreadyAsked) ?? WHAT_ELSE}`;
  return { text: text || (aQuestionNotYetAsked(WHAT_ELSE, alreadyAsked) ?? WHAT_ELSE), cut };
}
