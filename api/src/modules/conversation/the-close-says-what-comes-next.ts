/**
 * THE LAST THING THE CHECK-IN SAYS, IN THE PROTOTYPE'S WORDS (task 2.7).
 *
 * The prototype's check-in ends (docs/prototype/screens/B3-the-check-in/check-in-end-card.txt):
 * "That’s all for today. Below is what I wrote down from your answers. Is anything wrong?" and the
 * end card follows. Read live instead: "Your report is ready now. Speak soon." and "Understood. This
 * record shows nothing more on that." The first says a report is ready before the card is even
 * built; neither says the card is coming.
 *
 * The goodbye is written by the model from the `system` prompt (PromptVersion key `system`, which
 * asks for "Your report is ready now. Speak soon."). It is put right here, in code, on the turn that
 * closes, so no stored prompt has to change for it: the claim that the report is ready and the
 * promise of another talk come off, and the prototype's sentences go on the end.
 */

export const THE_CLOSE = 'That’s all for today. Below is what I wrote down from your answers. Is anything wrong?';

/**
 * AND ONLY WHERE THERE IS A CARD BELOW IT.
 *
 * WhatsApp and the developer API show no end card, so "Below is what I wrote down" was false there.
 * Each door ends on "That’s all for today." and the next thing that really happens on it:
 *  - WhatsApp: the check-in closes when the person replies "finish" (whatsapp-for-an-organisation),
 *    and the report is then sent to the same chat.
 *  - The developer API: the customer's system closes the check-in, and the report is written from it.
 */
export type Door = 'web' | 'whatsapp' | 'api';
export const THE_CLOSE_ON: Record<Door, string> = {
  web: THE_CLOSE,
  whatsapp: 'That’s all for today. Reply "finish" to close this check-in, and your report will come here.',
  api: 'That’s all for today. Thank you for your answers. When this check-in is closed, they go into the report.',
};

/**
 * THE SAME THREE CLOSES IN THE PLAINER FORM, FOR A CHECK-IN SET TO "USE SIMPLER WORDS".
 *
 * Short sentences, no contractions, no curly apostrophe, and the same next step on each door. Picked
 * only when the lead has switched the setting on; every check-in that has not switched it reads the
 * sentences above, unchanged.
 */
export const THE_CLOSE_ON_IN_SIMPLER_WORDS: Record<Door, string> = {
  web: 'That is all for today. Below is what I wrote down from what you said. Is anything wrong?',
  whatsapp: 'That is all for today. Write "finish" to end this check-in. Your report will come to this chat.',
  api: 'That is all for today. Thank you for your answers. When this check-in is closed, your answers go into the report.',
};

/** The close for this door, in the plainer form when the check-in is set to use simpler words. */
export function theCloseFor(door: Door, simplerWords?: boolean | null): string {
  return (simplerWords ? THE_CLOSE_ON_IN_SIMPLER_WORDS : THE_CLOSE_ON)[door] ?? THE_CLOSE;
}

const EVERY_CLOSE = [...Object.values(THE_CLOSE_ON), ...Object.values(THE_CLOSE_ON_IN_SIMPLER_WORDS)];

/**
 * EVERY QUESTION SENTENCE THE MODEL ASKED, TAKEN OUT BEFORE THE CLOSE IS ADDED.
 *
 * Caught on run 20 (24-scenario run, 30 September 2026): the model's own closing reply sometimes still
 * asked something - "...what is the current on-time delivery percentage you are seeing from them? It
 * helps to have the starting point for that 98% target." and "What will you do about getting those
 * bank statements, and by when?" - and the close ("Is anything wrong?") was appended on top of it, so
 * the person was asked something they had no way left to answer. A sentence is found the same way
 * `withoutTheSentencesMarked` (a-quote-is-what-they-said.ts) finds one, and only a sentence ending on
 * a question mark is removed; every other sentence, including a thank-you or a restatement of what
 * they said, is kept exactly as written. Nothing here changes a word that stays.
 */
export function withoutQuestionSentences(text: string): string {
  const pieces: string[] = [];
  let at = 0;
  for (const m of text.matchAll(/[.!?]["”’)\]]*(?:\s+|$)|\n+/g)) {
    pieces.push(text.slice(at, m.index! + m[0].length));
    at = m.index! + m[0].length;
  }
  if (at < text.length) pieces.push(text.slice(at));
  return pieces.filter((p) => !/\?["”’)\]]*\s*$/.test(p)).join('');
}

const NOT_BEFORE_THE_CARD = [
  /\b(?:your|the)\s+(?:session\s+)?report\s+is\s+(?:ready|done|finished|complete)(?:\s+now)?\b[^.!?\n]*[.!?]?/gi,
  /\b(?:speak|talk|chat)\s+(?:to you\s+)?(?:soon|again|next time)\b[.!]?/gi,
  /\b(?:see|catch)\s+you\s+(?:soon|again|next time|then)\b[.!]?/gi,
  /\buntil (?:next time|then)\b[.!]?/gi,
  /\bthat(?:’|')?s all for today\b[.!]?/gi,
];

/** The closing turn, ending on the prototype's sentences. Said once, however often it is run. */
export function endingOnTheClose(text: string, door: Door = 'web', simplerWords?: boolean | null): string {
  const close = theCloseFor(door, simplerWords);
  let out = String(text ?? '');
  for (const c of EVERY_CLOSE) if (out.includes(c)) out = out.split(c).join(' ');
  for (const rx of NOT_BEFORE_THE_CARD) out = out.replace(rx, ' ');
  /* The plainer close says "That is all for today." in full, so the model's own, said in full, is taken out too. Only then, so the usual close is exactly as it was. */
  if (simplerWords) out = out.replace(/\bthat is all for today\b[.!]?/gi, ' ');
  out = withoutQuestionSentences(out);
  out = out
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\s+([.,;!?])/g, '$1')
    .replace(/[\s,;]+(?:and|but|so)\s*$/i, '')
    .replace(/^[\s,;.]+|[\s,;]+$/g, '')
    .replace(/,\s*$/, '.')
    .trim();
  return out ? `${out}\n\n${close}` : close;
}

/** Whether a stored turn is the one that closed: it ends on the close of any door. */
export function endsOnTheClose(text: string): boolean {
  const t = String(text ?? '').trim();
  return EVERY_CLOSE.some((c) => t.endsWith(c));
}

/** The closing turn without the line that tells them to write "finish": for when their own words already closed it (WhatsApp). */
export function endingWithoutTheFinishLine(text: string): string {
  let out = String(text ?? '');
  for (const c of [THE_CLOSE_ON.whatsapp, THE_CLOSE_ON_IN_SIMPLER_WORDS.whatsapp]) out = out.split(c).join('');
  return out.trim();
}
