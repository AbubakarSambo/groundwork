/**
 * A VAGUE PROMISE IS ASKED ONCE WHAT IT IS (Hafsah's answer on reviews, 25 October 2026).
 *
 * Joseph's review quoted "I'll get it to him" and "I'll follow up on that" as what he committed to, and nobody reading it could
 * tell what "it" or "that" was. Rewording his words afterwards would put words in his mouth. So the check-in asks, once, while he
 * is there: "When you say “I'll get it to him”, what is “it”?" His answer is kept beside the promise in his own words, and the
 * promise itself is never reworded.
 *
 * The model decides whether to ask: where what "it" is is already clear from what they just said or what was just asked, it does
 * not. The product only notices the shape, gives the exact question, and keeps the answer.
 */

/** The answer to the question, marked on the person's turn so the record can find it. */
export const SAID_WHAT_IT_IS = 'said-what-it-is';

const A_PROMISE = /\b(?:i['’]ll|i will|i['’]m going to|i am going to|i shall|we['’]ll|we will|i can)\b/i;
/* The thing promised is only a pronoun: "get it to him", "follow up on that", "send them over". */
const ONLY_A_PRONOUN = /\b(?:get|send|give|bring|take|do|finish|sort|fix|handle|share|deliver|chase|check|pass|forward|sign|raise|submit|file|update|follow up on|look into|look at|work on|deal with)\s+(?:it|that|this|them)\b(?!\s+(?:report|quote|invoice|order|deal|document|file|form|list|payment|proposal|contract|note))/i;
const sentences = (t: string) => String(t ?? '').split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);

/** The sentence of theirs that promises something named only by a pronoun, and that pronoun; else null. */
export function theVaguePromiseIn(said: string): { promise: string; pronoun: string } | null {
  for (const s of sentences(said)) {
    if (!A_PROMISE.test(s)) continue;
    const m = ONLY_A_PRONOUN.exec(s);
    if (m) return { promise: s.replace(/[.!]+$/, ''), pronoun: (m[0].match(/\b(it|that|this|them)\b/i)?.[1] ?? 'it').toLowerCase() };
  }
  return null;
}

/** The exact question, so the answer can be found again. */
export const theQuestionWhatItIs = (v: { promise: string; pronoun: string }) => `When you say “${v.promise}”, what is “${v.pronoun}”?`;

/** Whether a reply of Groundwork's asked what a pronoun in their promise is. */
export function askedWhatItIs(reply: string): boolean {
  return /\bwhat (?:is|are) [“"'‘]?(?:it|that|this|them)[”"'’]?\s*\?/i.test(String(reply ?? ''));
}

/** For the model, this turn only. Null where it was already asked in this check-in. */
export function askWhatItIs(said: string, repliesInThisCheckIn: string[]): string | null {
  if (repliesInThisCheckIn.some(askedWhatItIs)) return null;
  const v = theVaguePromiseIn(said);
  if (!v) return null;
  return [
    `THEIR PROMISE NAMES ITS THING ONLY AS "${v.pronoun}": "${v.promise}".`,
    `Unless what "${v.pronoun}" is is already clear from what they just said or what you just asked, ask exactly this, as your one question this turn: ${theQuestionWhatItIs(v)}`,
    'Ask it once. Do not guess what it is, and do not say their promise back in other words.',
  ].join(' ');
}

/**
 * The answer kept beside a promise: the turn marked as saying what it is, after the turn that made this promise. Their words as
 * typed, never reworded. Null where nothing was asked or the promise is not the one asked about.
 */
export function whatTheySaidItIs(action: string, turns: { content: string | null; stage?: string | null }[]): string | null {
  const squash = (s: string) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const a = squash(action);
  if (!a) return null;
  for (let i = 1; i < turns.length; i++) {
    if (turns[i].stage !== SAID_WHAT_IT_IS) continue;
    const v = theVaguePromiseIn(turns[i - 1].content ?? '');
    if (!v) continue;
    const p = squash(v.promise);
    if (!(p.includes(a) || a.includes(p))) continue;
    const answer = String(turns[i].content ?? '').trim();
    return answer ? answer.slice(0, 300) : null;
  }
  return null;
}

/** How a reader is told what it was, in a full sentence, keeping both sets of their words as they were said. */
export function whatItWasSaid(firstName: string | null, pronoun: string, answer: string | null | undefined): string | null {
  const a = String(answer ?? '').trim().replace(/[.!]+$/, '');
  if (!a) return null;
  return `Asked what “${pronoun}” was, ${firstName ?? 'they'} said, “${a}.”`;
}
