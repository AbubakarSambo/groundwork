/**
 * B-141: AN AIM TYPED IN LOWER CASE STILL READS AS A SENTENCE. "forty more shops in Nairobi order
 * every week by 15 December" is exactly what somebody typed, read back on three separate surfaces -
 * People and setup and My work's "What doing well looks like" (`BaselinePanel.tsx`), and My work's,
 * the report's and the board's own "What success looks like" (`WhatSuccessLooksLike.tsx`, one
 * component shared by all three, so fixing it here fixes it everywhere the stated aim is read back).
 *
 * Only the first letter is touched - the rest of what the lead typed is never rewritten (decision
 * 18: a person's own words stay exactly as said).
 */
export function withSentenceCase(text: string | null | undefined): string {
  if (!text) return text ?? ''
  const first = text.charAt(0)
  const upper = first.toUpperCase()
  return upper === first ? text : upper + text.slice(1)
}
