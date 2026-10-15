import type { Need } from '@/api/today'

/**
 * REQUEST 205, DONE: `GET /today/outstanding` now serves `about` beside each of `needsYou`,
 * `overdueOnYourTeam` and `risks` - one entry per sentence, in the same order, shaped
 * `{ kind, ids, groundId? }`. This is the same fact every function below was already reading out of
 * the words themselves (a wait's own id, a leave or spend request's id, a promise's id, the check-in
 * a "nothing yet" line is about), served plainly instead of needing to be parsed back out of a
 * sentence built in different words on each side. Matching on it is the primary rule now; the
 * wording-based functions below stay only as the fallback for a sentence `about` does not cover
 * (an older server, or a row with no entry for it).
 */
export type OutstandingAboutKind = 'requests' | 'wait' | 'decision' | 'promise' | 'plan-decision' | 'target' | 'quiet' | 'missed'
export interface OutstandingAbout {
  kind: OutstandingAboutKind
  /** One id per thing the sentence is about: a wait, a leave/spend/hours request, a commitment, a
      target, or (for `quiet`) the check-in itself. A summary sentence ("Two requests are waiting
      ...") carries every id it is summarising. */
  ids: string[]
  groundId?: string
}

/**
 * THE RAW ID A `Need`'S OWN `key` IS BUILT FROM. An id like `leave:<id>` or `hours:<person>|<week>`
 * carries a prefix or a second field that a `Need`'s key never repeats verbatim - only the id (or
 * the person) itself does - so this tries the id as given, with its "kind:" prefix stripped, and
 * with anything after "|" dropped too, and matches if any of those is part of the key.
 */
function bareIdsOf(id: string): string[] {
  const noPrefix = id.includes(':') ? id.slice(id.indexOf(':') + 1) : id
  const noWeek = noPrefix.split('|')[0]
  return Array.from(new Set([id, noPrefix, noWeek].filter(Boolean)))
}

/** Whether every id (or, for `quiet`, the check-in itself) this sentence is about already has a row
    of its own among `existingNeeds` - the id-based version of everything below. */
function alreadyShownByAbout(entry: OutstandingAbout, existingNeeds: Need[]): boolean {
  if (entry.kind === 'quiet') {
    return !!entry.groundId && existingNeeds.some((n) => n.groundId === entry.groundId)
  }
  if (!entry.ids.length) return false
  return entry.ids.every((id) => bareIdsOf(id).some((bare) => existingNeeds.some((n) => n.key.includes(bare))))
}

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
 * B-132: THE SAME SPEND REQUEST, "asked to spend" against "'s request to spend ... is waiting". Like
 * `leaveRequestKey` above, matched by the person and what the sentence is actually about rather than
 * its exact words, because the two sides are never worded the same: "What needs you" (`GET /today`)
 * says "Tendai asked to spend 300,000 on the Mwangi agency, for the quarter.", and the lead's daily
 * nudge (`GET /today/outstanding`) says "Tendai's request to spend 300,000 for the Mwangi agency, for
 * the quarter is waiting for you to approve or decline." - the same amount and the same "what" (both
 * built from `whatTheMoneyIsFor`), with "for" where the other sentence says "on".
 *
 * `about` (request 205) cannot be used for this one: the row in "What needs you" is keyed
 * `approve-spend-<i>`, a position in the list rather than the request's own id, so an id can never
 * match it (see the request to the engine in docs/requests-to-engine.md). This wording match is the
 * only way left to catch it.
 */
function spendRequestKey(sentence: string): { name: string; amount: string; what: string } | null {
  const m = /^([A-Z][A-Za-z]+)['’]s request to spend ([A-Z]{0,4}\s?[\d.,]+) for (.+?) is waiting for (?:you|them|him|her) to approve or decline\.?$/i.exec(sentence.trim())
  return m ? { name: m[1].toLowerCase(), amount: normalise(m[2]), what: normalise(m[3]) } : null
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

export function outstandingNotAlreadyShown(existingNeeds: Need[], sentences: string[], about?: (OutstandingAbout | null | undefined)[]): string[] {
  const alreadyOnScreen = existingNeeds.flatMap(flatten)
  const normalisedAlready = alreadyOnScreen.map(normalise)
  const approvalRowCount = alreadyOnScreen.filter((t) => /waiting for (?:you|them|him|her) to approve/i.test(t)).length

  return sentences.filter((sentence, i) => {
    const entry = about?.[i]
    /*
     * B-191: AN `about` ENTRY THAT SAYS "NOT FOUND" NO LONGER SKIPS THE WORDING CHECKS BELOW.
     *
     * This used to stop here once `about` had an entry at all: "found by id, keep; not found by id,
     * keep" - on the reasoning (request 205) that the wording checks were only a fallback for a
     * server that sent no `about`. That held as long as every row `about` could point at carried the
     * matching id on its own key. It broke for leave: `GET /today/outstanding` now sends
     * `{ kind: 'requests', ids: ['leave:<uuid>'] }` for "Chidi's leave ... is waiting for you to
     * approve or decline.", but "What needs you" (`GET /today`) keys its own leave row
     * `approve-leave-0` - a position, not the request's id (the same shape `spendRequestKey`'s own
     * comment already describes for spend) - so `alreadyShownByAbout` could never find it, and
     * Chidi's leave (and Amani's, the same shape) was said twice on the same page.
     *
     * The id match still runs first and is still trusted on its own when it DOES find a row - it is
     * the more precise test and nothing here should make it less certain. Only when it comes back
     * "not shown" does this now fall through to the same wording checks a sentence with no `about`
     * at all already relies on, so a row `about`'s ids cannot reach is still caught by what it says.
     */
    if (entry && alreadyShownByAbout(entry, existingNeeds)) return false

    if (alreadyOnScreen.some((text) => text.includes(sentence) || sentence.includes(text))) return false

    const wait = waitingOnYouFor(sentence)
    if (wait && normalisedAlready.some((text) => text.includes(wait))) return false

    const leave = leaveRequestKey(sentence)
    if (leave && normalisedAlready.some((text) => text.includes(leave.name) && text.includes(leave.dates))) return false

    const spend = spendRequestKey(sentence)
    if (spend && normalisedAlready.some((text) => text.includes(spend.name) && text.includes(spend.amount) && text.includes(spend.what))) return false

    const count = approvalSummaryCount(sentence)
    if (count !== null && approvalRowCount >= count) return false

    return true
  })
}
