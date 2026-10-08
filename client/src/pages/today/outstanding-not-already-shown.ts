import type { Need } from '@/api/today'

/**
 * THE LEAD'S DAILY NUDGE, ON TODAY (decision 120). `GET /today/outstanding`'s `needsYou` repeats, in
 * full sentences, what is waiting for the lead to approve, a decision she owes, and her own overdue
 * commitments - some of which "What needs you" (`GET /today`) may already say, in its own words, as
 * one of its own rows. A sentence that already appears, in whole or in part, in an existing row's
 * title or detail is left out here, so nothing is said twice on the same page.
 */
export function outstandingNotAlreadyShown(existingNeeds: Need[], sentences: string[]): string[] {
  const alreadyOnScreen = existingNeeds.flatMap((n) => [n.title, n.detail ?? ''].filter(Boolean))
  return sentences.filter((sentence) => !alreadyOnScreen.some((text) => text.includes(sentence) || sentence.includes(text)))
}
