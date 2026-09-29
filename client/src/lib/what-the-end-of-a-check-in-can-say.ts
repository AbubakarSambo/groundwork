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
  /*
   * A ROW WITH NO availableFrom IS NOT YET SCHEDULED, NOT ALREADY OPEN (U.8 review). The next
   * session's row can exist before it has a date - lead-path-dates.spec.ts locks `availableFrom`
   * as `null` in exactly that case - and this read `null` the same as "the date has passed",
   * claiming "Your next check-in is open now." on a check-in that was not open, and might not be
   * for weeks. Nothing is known yet, so nothing is said, same as when there is no next row at all.
   */
  /*
   * AN IN_PROGRESS SESSION IS OPEN, WHATEVER ITS availableFrom SAYS - the same rule
   * `myOpenOpensLater` uses on the ground pages (see GroundAdminPage.tsx/GroundParticipantPage.tsx):
   * that date gates a session that has not started, not one already running. Without this, a lead
   * whose next session had already been opened (for example by starting it early, or a clock
   * skew) was told it "opens on Sunday" while it sat there, started, waiting for her.
   */
  if (next.status === 'IN_PROGRESS') return 'Your next check-in is open now.'
  if (!next.availableFrom) return null
  const opens = new Date(next.availableFrom)
  if (Number.isNaN(opens.getTime()) || opens.getTime() <= now.getTime()) {
    return 'Your next check-in is open now.'
  }
  const day = (d: Date) => whenItWas(d, 'day')
  const tomorrow = new Date(now.getTime() + 86_400_000)
  if (day(opens) === day(now)) return `Your next check-in opens today at ${aTime(opens)}.`
  if (day(opens) === day(tomorrow)) return `Your next check-in opens tomorrow at ${aTime(opens)}.`
  return `Your next check-in opens on ${whenItWas(opens, 'weekdayAndDay')} at ${aTime(opens)}.`
}

/**
 * THE ID TO LINK TO, WHEN whenTheNextOneOpens SAYS IT IS ALREADY OPEN.
 *
 * `whenTheNextOneOpens` only has words to give; a reader told "Your next check-in is open now."
 * with nowhere to click on it is being told about a door with no handle. Same rule, so the two
 * can never disagree about whether there is a next check-in to open.
 */
export function theNextOpenCheckInId(
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
  if (next.status === 'IN_PROGRESS') return next.id
  if (!next.availableFrom) return null
  const opens = new Date(next.availableFrom)
  if (!Number.isNaN(opens.getTime()) && opens.getTime() <= now.getTime()) return next.id
  return null
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
