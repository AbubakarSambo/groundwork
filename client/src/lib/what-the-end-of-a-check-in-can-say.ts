import { whenItWas } from './a-date-reads-the-same-everywhere'
import { firstWordOfAName } from './the-first-word-of-a-name'

/**
 * WHAT THE END OF A CHECK-IN CAN SAY, FROM WHAT THE RECORD HOLDS (B3).
 *
 * The end card and the Done page say two things the screens can work out without the engine: when
 * the next check-in opens, and whether the lead also answers a check-in ("Wairimu also answers a
 * check-in. The report puts the answers side by side."). Each is said only when it is true for this
 * check-in, and says nothing otherwise.
 */

/** "4pm", "4:30pm": the prototype's way of writing a time. In the organisation's zone when the server gives one. */
function aTime(d: Date, zone?: string): string {
  return whenItWas(d, 'hourOfDay', zone).replace(/\s/g, '').replace(':00', '').toLowerCase()
}

/**
 * WHAT THE SERVER SAYS ABOUT THE NEXT ONE (sales-first.md, section 5): when it would open by the schedule,
 * before its row exists, and the organisation's zone, so "tomorrow at 8am" reads as the schedule set it
 * wherever the reader is. Both from GET /grounds/:id/my-checkin-status.
 */
export interface WhatTheScheduleSays { nextOpensAt?: string | null; zone?: string | null }

type ACheckInRow = { id: string; sessionNumber: number; status: string; availableFrom?: string | null }

/**
 * THE NEXT CHECK-IN, ONCE (Hafsah, 30 October 2026, first-experience round 1). A clinic lead read "No check-in open right now"
 * as the header and "Your next check-in is open now." under it, on one card, because the header was fixed words and the sentence
 * was worked out here. This is the one owner of the next check-in: whether it is open now (and which row, so there is a door to
 * it), and the one sentence about when it opens. The card's header, its sentence, the Done page's sentence and its link all read
 * this, so none of them can say something the others do not.
 *
 *  - `openId`: the next check-in's id when it is open now, else null.
 *  - `says`: "Your next check-in is open now.", "Your next check-in opens tomorrow at 4pm." (check-in-end-card.txt), or null when
 *    nothing is known yet, for example before the next one exists.
 */
export function theNextOne(
  checkIns: ACheckInRow[] | null | undefined,
  thisCheckInId: string | null | undefined,
  now: Date = new Date(),
  schedule?: WhatTheScheduleSays | null,
): { openId: string | null; says: string | null } {
  const nothing = { openId: null, says: null }
  if (!checkIns) return nothing
  const zone = schedule?.zone ?? undefined
  const later = checkIns
    .filter(c => c.id !== thisCheckInId && c.status !== 'COMPLETED' && c.status !== 'DECLINED')
    .sort((a, b) => a.sessionNumber - b.sessionNumber)
  /* No row for the next one yet (it is written when this one finishes): the schedule's own time, when the server has one. */
  const next: (Partial<ACheckInRow> & { status: string }) | null = later[0] ?? (schedule?.nextOpensAt ? { status: 'NOT_STARTED', availableFrom: schedule.nextOpensAt } : null)
  if (!next) return nothing
  const openNow = { openId: next.id ?? null, says: 'Your next check-in is open now.' }
  /* AN IN_PROGRESS SESSION IS OPEN, WHATEVER ITS availableFrom SAYS: that date gates a session that has not started. */
  if (next.status === 'IN_PROGRESS') return openNow
  /* A ROW WITH NO availableFrom IS NOT YET SCHEDULED, NOT ALREADY OPEN (U.8 review): nothing is known yet, so nothing is said. */
  if (!next.availableFrom) return nothing
  const opens = new Date(next.availableFrom)
  if (Number.isNaN(opens.getTime()) || opens.getTime() <= now.getTime()) return openNow
  const day = (d: Date) => whenItWas(d, 'day', zone)
  const tomorrow = new Date(now.getTime() + 86_400_000)
  const says = day(opens) === day(now)
    ? `Your next check-in opens today at ${aTime(opens, zone)}.`
    : day(opens) === day(tomorrow)
      ? `Your next check-in opens tomorrow at ${aTime(opens, zone)}.`
      : `Your next check-in opens on ${whenItWas(opens, 'weekdayAndDay', zone)} at ${aTime(opens, zone)}.`
  return { openId: null, says }
}

/** When the next check-in opens, in one sentence, from `theNextOne`. */
export function whenTheNextOneOpens(
  checkIns: ACheckInRow[] | null | undefined,
  thisCheckInId: string | null | undefined,
  now: Date = new Date(),
  schedule?: WhatTheScheduleSays | null,
): string | null {
  return theNextOne(checkIns, thisCheckInId, now, schedule).says
}

/** The id to link to when the next check-in is open now, from `theNextOne`, so the sentence and the link never disagree. */
export function theNextOpenCheckInId(
  checkIns: ACheckInRow[] | null | undefined,
  thisCheckInId: string | null | undefined,
  now: Date = new Date(),
): string | null {
  return theNextOne(checkIns, thisCheckInId, now).openId
}

/**
 * The lead's first name, when the lead also answers this check-in and the reader is someone else.
 * "Wairimu also answers a check-in" is only true then: a lead who only manages does not answer, and
 * the lead reading their own end card is not told about themselves.
 *
 * READS `ground.leadFirstName`/`leadAnswersToo`, NOT `ground.participants` (U.8 fourth review). The
 * lead's own row is filtered out of `participants` for a participant on a check-in that hides
 * everyone else - correctly, that is the peer rule doing its job - which meant this fell back to
 * null on exactly the check-ins where somebody most needed to be told who reads their words. The
 * server now sends her first name, and whether she answers too, straight on the ground, unaffected
 * by who else the peer rule is hiding. See the note on `leadFirstName` in `grounds.service.ts`.
 */
export function whoElseAnswers(
  ground: { leadFirstName?: string | null; leadAnswersToo?: boolean; viewerIsInitiator?: boolean } | null | undefined,
): string | null {
  if (!ground || ground.viewerIsInitiator || !ground.leadAnswersToo) return null
  /* Signup asks for "Your name" in one field and stores it whole (AuthPage.tsx, auth.service.ts),
     so a lead who typed "Wairimu Kamau" has that whole string in `firstName`. The prototype's own
     line says only the first name ("Wairimu also answers a check-in"), never the surname too. */
  return firstWordOfAName(ground.leadFirstName)
}

/**
 * The lead's first name, for "Rukia knows who is here" (the peers-hidden sentence on the topic
 * card) - true whenever there is a lead, whether or not she also answers a check-in herself.
 * Different question from `whoElseAnswers` above, and answered from the same field.
 */
export function whoRunsThis(
  ground: { leadFirstName?: string | null } | null | undefined,
): string | null {
  return firstWordOfAName(ground?.leadFirstName)
}

/*
 * `howManyAnswer` used to live here: `(ground.participants ?? []).filter(p => !p.managingOnly).length`,
 * used only to decide `aTeamReport = howManyAnswer(ground) > 1` on the Done page. Removed (U.8 fifth
 * review): `ground.participants` is reduced to the reader's own row alone on a check-in that hides
 * peers, so this always read as a check-in of one there, whatever the true size of the team, and the
 * Done page dropped "Two reports come from this" and the team's report card. The server now sends
 * `ground.aTeamReportComes`, a plain yes/no read off the raw participants before that filter runs -
 * use that instead of counting `participants` for this question.
 */
