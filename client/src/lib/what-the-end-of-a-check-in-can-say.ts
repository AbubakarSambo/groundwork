import { whenItWas } from './a-date-reads-the-same-everywhere'

/**
 * WHAT THE END OF A CHECK-IN CAN SAY, FROM WHAT THE RECORD HOLDS (B3).
 *
 * The end card and the Done page say two things the screens can work out without the engine: when
 * the next check-in opens, and whether the lead also answers a check-in ("Wairimu also answers a
 * check-in. The report puts the answers side by side."). Each is said only when it is true for this
 * check-in, and says nothing otherwise.
 */

/** "4pm", "4:30pm": the prototype's way of writing a time. */
function aTime(d: Date): string {
  return whenItWas(d, 'hourOfDay').replace(/\s/g, '').replace(':00', '').toLowerCase()
}

/**
 * When the next check-in opens, in one sentence: "Your next check-in opens tomorrow at 4pm."
 * (check-in-end-card.txt). Null when nothing is known yet, for example before the next one exists.
 */
export function whenTheNextOneOpens(
  checkIns: { id: string; sessionNumber: number; status: string; availableFrom?: string | null }[] | null | undefined,
  thisCheckInId: string | null | undefined,
  now: Date = new Date(),
): string | null {
  if (!checkIns) return null
  const later = checkIns
    .filter(c => c.id !== thisCheckInId && c.status !== 'COMPLETED' && c.status !== 'DECLINED')
    .sort((a, b) => a.sessionNumber - b.sessionNumber)
  const next = later[0]
  if (!next) return null
  const opens = next.availableFrom ? new Date(next.availableFrom) : null
  if (!opens || Number.isNaN(opens.getTime()) || opens.getTime() <= now.getTime()) {
    return 'Your next check-in is open now.'
  }
  const day = (d: Date) => whenItWas(d, 'day')
  const tomorrow = new Date(now.getTime() + 86_400_000)
  if (day(opens) === day(now)) return `Your next check-in opens today at ${aTime(opens)}.`
  if (day(opens) === day(tomorrow)) return `Your next check-in opens tomorrow at ${aTime(opens)}.`
  return `Your next check-in opens on ${whenItWas(opens, 'weekdayAndDay')} at ${aTime(opens)}.`
}

/**
 * The lead's first name, when the lead also answers this check-in and the reader is someone else.
 * "Wairimu also answers a check-in" is only true then: a lead who only manages does not answer, and
 * the lead reading their own end card is not told about themselves.
 */
export function whoElseAnswers(
  ground: { participants?: { partyType?: string; userId?: string | null; managingOnly?: boolean | null; user?: { firstName?: string | null } | null }[] } | null | undefined,
  myUserId: string | null | undefined,
): string | null {
  const lead = (ground?.participants ?? []).find(p => p.partyType === 'INITIATOR')
  if (!lead || !lead.userId || lead.userId === myUserId) return null
  if (lead.managingOnly) return null
  const name = lead.user?.firstName?.trim()
  return name || null
}

/** How many people answer this check-in, the reader included, as far as the reader may see. */
export function howManyAnswer(
  ground: { participants?: { managingOnly?: boolean | null }[] } | null | undefined,
): number {
  return (ground?.participants ?? []).filter(p => !p.managingOnly).length
}
