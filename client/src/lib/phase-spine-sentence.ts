import { whenItWas } from '@/lib/a-date-reads-the-same-everywhere'

/**
 * "Daily on weekdays, from 4pm. Session 38 of 65. Runs until 30 September." is the prototype's
 * header sentence. There is no field yet for the cadence's words ("Daily on weekdays, from 4pm."),
 * so that part is left out rather than guessed; the rest is built from what the board does send.
 *
 * `endsAt` is the check-in's own scheduled end, not a target's deadline - a team's number can carry
 * its own "by 20 December" while the check-in itself runs to a different date, and this sentence is
 * about the check-in.
 *
 * WAS: `${dshort(startsAt)} to ${dshort(endsAt)}`, which printed " - to 13 Dec ·" the moment
 * `startsAt` was null, because `dshort` stands a bare " - " in for a missing date rather than
 * dropping it. A full sentence cannot leave a blank where a word should be, so this builds only the
 * parts that have data.
 *
 * U.10: MOVED OUT OF BoardPage.tsx SO TheCheckInHeader.tsx CAN BUILD THE SAME SENTENCE, without a
 * shared `components/gw` component reaching back into a `pages/board` file to get it.
 */
export function phaseSpineSentence(
  phaseSpine: { startsAt: string | null; endsAt: string | null; currentSession: number } | null | undefined,
  planned: number | null,
): string | null {
  if (!phaseSpine) return null
  const parts: string[] = []
  if (phaseSpine.currentSession) {
    parts.push(planned ? `Check-in ${phaseSpine.currentSession} of ${planned}.` : `Check-in ${phaseSpine.currentSession}.`)
  }
  if (phaseSpine.endsAt) parts.push(`Runs until ${whenItWas(phaseSpine.endsAt, 'dayAndMonthLong')}.`)
  return parts.length ? parts.join(' ') : null
}
