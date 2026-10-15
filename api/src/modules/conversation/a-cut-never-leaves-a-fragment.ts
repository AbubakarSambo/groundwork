/**
 * NO GUARD'S CUT EVER LEAVES A FRAGMENT TO SEND.
 *
 * Twice in two days a guard cut a reply and what was left was sent as the whole turn:
 *
 *   run-7, crisis     "Speak soon."        the promise guard cut the sentence in front of it
 *   fix7-2, project   "Before we close,"   the homework budget cut the question that followed it
 *
 * Each guard was right about what it cut and none of them looked at what it left. So this looks,
 * once, for all of them. A cut that leaves fewer than five words and no question, or that ends on a
 * lead-in ("Before we close,", "One more thing:"), is a fragment, and a fragment is never sent.
 *
 * WHAT HAPPENS INSTEAD depends on why the guard cut.
 *   A cut for length or budget (homework, a question asked again) took out something true. The
 *   text as it was before the cut is sent instead: one question over budget is a smaller fault
 *   than a turn that stops mid-sentence.
 *   A cut for something untrue (a promise or a number nobody gave) cannot be undone, because the
 *   text before it is the invention. On the closing turn the plain close is sent; otherwise the
 *   cut stands, as it always has.
 * And on the closing turn, if even the text before the cut is a fragment, the plain close is sent.
 */

/*
 * THE PLAIN CLOSE, sent where a closing turn has nothing usable left. It is the prototype's own
 * wording from the done screen ("Your check-in is saved."), it claims nothing about a report or
 * another conversation, so the report-promise guard that runs after it leaves it alone, and it is
 * true: every turn is stored as it is written. Written for the run-7 close (38223cfe) and moved
 * here so every cut can reach it.
 */
export const A_CLOSE_THAT_CLAIMS_NOTHING = 'Thank you. Your check-in is saved.';

/** A turn that ends on its own introduction. */
const A_LEAD_IN = /[,:;–—-]\s*$/;
const ONLY_A_LEAD_IN = /^(?:before we (?:close|finish|go|wrap up|end)|one (?:more|last) thing|finally|lastly|also|and|so|then|just one more)[\s.,:;!]*$/i;

export function isAFragment(text: string): boolean {
  const t = (text ?? '').trim();
  if (!t) return true;
  if (A_LEAD_IN.test(t) || ONLY_A_LEAD_IN.test(t)) return true;
  const words = t.split(/\s+/).filter(Boolean).length;
  return words < 5 && !t.includes('?');
}

/** True where a guard's cut turned a reply into a fragment. Each cut is used only when this is false. */
export function aCutThatLeavesAFragment(before: string, after: string): boolean {
  return (after ?? '') !== (before ?? '') && isAFragment(after);
}

/**
 * What to send after a cut. `mayRestore` is false where the cut took out something untrue, so the
 * text before it must never go back.
 */
export function afterTheCut(before: string, after: string, opts: { closing: boolean; mayRestore: boolean }): string {
  if (!aCutThatLeavesAFragment(before, after)) return after;
  if (opts.mayRestore && !isAFragment(before)) return before;
  if (opts.closing) return A_CLOSE_THAT_CLAIMS_NOTHING;
  return opts.mayRestore ? before : (after.trim() ? after : before);
}
