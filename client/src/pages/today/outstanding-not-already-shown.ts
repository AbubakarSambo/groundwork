import type { Need } from '@/api/today'

/**
 * THE LEAD'S DAILY NUDGE, ON TODAY (decision 120). `GET /today/outstanding`'s `needsYou` repeats, in
 * full sentences, what is waiting for the lead to approve, a decision she owes, and her own overdue
 * commitments - some of which "What needs you" (`GET /today`) may already say, in its own words, as
 * one of its own rows. A sentence that already appears, in whole or in part, in an existing row's
 * title or detail is left out here, so nothing is said twice on the same page.
 *
 * B-073: a whole-sentence match was never going to catch these, because the two sides are built by
 * different sentences for the same fact, never the same words:
 *   - "Amani is waiting on you for the discount limit for the Naivas order since Saturday 3 October."
 *     (outstanding) beside "You need to get back to Amani Wekesa, who is waiting on you for the
 *     discount limit for the Naivas order." (the board's own row, read on Today) - same wait, said
 *     with and without its date, from a different person's side of the sentence.
 *   - "Amani's leave from Thursday 22 October to Monday 26 October is waiting for you to approve or
 *     decline." beside "Amani asked for leave from Thursday 22 October to Monday 26 October." - same
 *     request, "is waiting" against "asked for".
 *   - "Two requests are waiting for you to approve or decline." beside the two requests themselves,
 *     each its own row - a count with nothing of its own to match, dropped only once Today already
 *     lists that many rows waiting for the reader's approval.
 *
 * `GET /today/outstanding` serves nothing to match these by except the sentences themselves (no id,
 * no kind: see the request to the engine in docs/requests-to-engine.md), so this matches on what each
 * sentence is actually about - the wait itself, or the person and the dates of the request - rather
 * than on its exact words. Never the other way round: a sentence that does not fit one of these shapes
 * is left exactly as the old whole-sentence check already left it, so nothing Today does not otherwise
 * show is ever dropped.
 */

const WORD_TO_NUMBER: Record<string, number> = {
  no: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
}

const flatten = (n: Need) => [n.title, n.detail ?? ''].filter(Boolean)
const normalise = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim()

/**
 * THE SAME WAIT, WITH OR WITHOUT ITS DATE. "waiting on you for the discount limit for the Naivas
 * order" is the part both sentences carry; only the outstanding sentence adds "since Saturday 3
 * October", and only the board's own row adds who is asking Wairimu to get back to them.
 */
function waitingOnYouFor(sentence: string): string | null {
  const m = /waiting on you for (.+?)(?:\s+since\b.*)?[.!?]?$/i.exec(sentence.trim())
  return m ? normalise(`waiting on you for ${m[1]}`) : null
}

/**
 * THE SAME LEAVE REQUEST, "is waiting" against "asked for". Both sides carry the person's name and
 * the leave's own dates, in the same words (`leaveInWords`), even though nothing else of the two
 * sentences matches.
 */
function leaveRequestKey(sentence: string): { name: string; dates: string } | null {
  const m = /^([A-Z][A-Za-z]+)['’]s (leave (?:from .+? to .+?|on .+?)) is waiting for (?:you|them|him|her) to approve or decline\.?$/i.exec(sentence.trim())
  return m ? { name: m[1].toLowerCase(), dates: normalise(m[2]) } : null
}

/**
 * "Two requests are waiting for you to approve or decline." has no person and no subject of its own
 * to match on - only a count. Safe to drop only once Today already lists at least that many rows each
 * waiting for the reader to approve or decline it (`waitingForYouToApprove`'s own "It is waiting for
 * you to approve." on each row).
 */
function approvalSummaryCount(sentence: string): number | null {
  const m = /^(\S+) requests? (?:is|are) waiting for you to approve or decline\.?$/i.exec(sentence.trim())
  if (!m) return null
  const n = WORD_TO_NUMBER[m[1].toLowerCase()]
  return n !== undefined ? n : (Number.isFinite(Number(m[1])) ? Number(m[1]) : null)
}

export function outstandingNotAlreadyShown(existingNeeds: Need[], sentences: string[]): string[] {
  const alreadyOnScreen = existingNeeds.flatMap(flatten)
  const normalisedAlready = alreadyOnScreen.map(normalise)
  const approvalRowCount = alreadyOnScreen.filter((t) => /waiting for (?:you|them|him|her) to approve/i.test(t)).length

  return sentences.filter((sentence) => {
    if (alreadyOnScreen.some((text) => text.includes(sentence) || sentence.includes(text))) return false

    const wait = waitingOnYouFor(sentence)
    if (wait && normalisedAlready.some((text) => text.includes(wait))) return false

    const leave = leaveRequestKey(sentence)
    if (leave && normalisedAlready.some((text) => text.includes(leave.name) && text.includes(leave.dates))) return false

    const count = approvalSummaryCount(sentence)
    if (count !== null && approvalRowCount >= count) return false

    return true
  })
}
