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

const NOT_BEFORE_THE_CARD = [
  /\b(?:your|the)\s+(?:session\s+)?report\s+is\s+(?:ready|done|finished|complete)(?:\s+now)?\b[^.!?\n]*[.!?]?/gi,
  /\b(?:speak|talk|chat)\s+(?:to you\s+)?(?:soon|again|next time)\b[.!]?/gi,
  /\b(?:see|catch)\s+you\s+(?:soon|again|next time|then)\b[.!]?/gi,
  /\buntil (?:next time|then)\b[.!]?/gi,
  /\bthat(?:’|')?s all for today\b[.!]?/gi,
];

/** The closing turn, ending on the prototype's sentences. Said once, however often it is run. */
export function endingOnTheClose(text: string): string {
  let out = String(text ?? '');
  if (out.includes(THE_CLOSE)) out = out.split(THE_CLOSE).join(' ');
  for (const rx of NOT_BEFORE_THE_CARD) out = out.replace(rx, ' ');
  out = out
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\s+([.,;!?])/g, '$1')
    .replace(/[\s,;]+(?:and|but|so)\s*$/i, '')
    .replace(/^[\s,;.]+|[\s,;]+$/g, '')
    .replace(/,\s*$/, '.')
    .trim();
  return out ? `${out}\n\n${THE_CLOSE}` : THE_CLOSE;
}

/** Whether a stored turn is the one that closed: it ends on the prototype's sentences. */
export function endsOnTheClose(text: string): boolean {
  return String(text ?? '').trim().endsWith(THE_CLOSE);
}
