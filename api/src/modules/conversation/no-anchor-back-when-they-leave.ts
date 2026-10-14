import { intoSentences } from './nothing-invented-reaches-them';

/**
 * NO "ONE THING BEFORE YOU GO" WHEN THE CHECK-IN IS CLOSING (reviewer, 14 October).
 *
 * The human-first rule lets the model name one thing from the record as a gentle way back when somebody cannot work
 * now: "Understood. One thing before you go - [thing]. Even a one-liner on where that stands keeps the record current."
 * That is right while the conversation stays open. When the person said they are leaving and the product closes the
 * check-in, there is no reply to give: Kevin read his own "Kilele Hotel, 40 units, paid today." handed back as a
 * request, and David read a line about what somebody else had said. On a close, those sentences come off; the
 * acknowledgement and the close stay.
 */
const ANCHOR_BACK = /^\s*(?:one (?:more |last )?thing before (?:you go|we close|you leave)\b|even a (?:one-liner|quick (?:line|word|note))\b|a one-liner on\b)/i;

export function withoutTheAnchorBack(reply: string): string {
  const sentences = intoSentences(reply ?? '');
  const kept = sentences.filter((s) => !ANCHOR_BACK.test(s));
  if (kept.length === sentences.length) return reply;
  const text = kept.join('').replace(/[ \t]{2,}/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  return text || 'Understood.';
}
