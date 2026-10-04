import { whenItWas } from '@/lib/a-date-reads-the-same-everywhere'

/**
 * "Last updated on Wednesday 23 September at 6pm. The board only changes when something new comes
 * in, such as a check-in, a report, a decision or a number from another system." (board-as-lead.txt,
 * board-as-participant.txt, read-only-view.txt: the same line for every reader.)
 *
 * The time is the server's `lastChangedAt`, the newest thing in the record the board is built from.
 * Opening the board does not move it. Where the record holds no time yet, only the second sentence
 * is said, because it is still true.
 */
export const THE_BOARD_ONLY_CHANGES =
  'The board only changes when something new comes in, such as a check-in, a report, a decision or a number from another system.'

function atTime(d: Date | string): string {
  return whenItWas(d, 'hourOfDay').replace(':00', '').replace(/\s+/g, '').toLowerCase()
}

export function whenTheBoardLastChanged(at: string | null | undefined): string {
  if (!at) return THE_BOARD_ONLY_CHANGES
  return `Last updated on ${whenItWas(at, 'weekdayAndDay')} at ${atTime(at)}. ${THE_BOARD_ONLY_CHANGES}`
}

/**
 * A STALLED CHECK-IN IS OUT OF TIME, AND SAYS SO IN THE PROTOTYPE'S OWN WORDS
 * (join-outoftime.txt: "This check-in reached its end date. It ran until 30 September. Nothing new
 * can be added until Wairimu gives it more time."), under "Last updated" - the same place a reader
 * already looks to find out why nothing on the board is moving.
 *
 * "You" FOR THE LEAD HERSELF, never her own name handed back to her (the same rule `startWith`
 * keeps in TheJudgement.tsx): she reads "until you give it more time", and gets "give" rather than
 * "gives" to agree with it. Everybody else reads her first name, or the generic "the person running
 * this check-in" where the board does not have it.
 *
 * `endsOn` IS SOMETIMES NOT ON RECORD (an open-ended cadence that was stopped by hand rather than
 * run past a date it was given). Nothing is made up to fill that gap: the sentence just leaves the
 * middle clause out rather than naming a date the record does not hold.
 */
export function whenItRanOutOfTime({ endsOn, leadFirstName, isLeadViewer }: {
  endsOn?: string | null
  leadFirstName?: string | null
  isLeadViewer: boolean
}): string {
  const ranUntil = endsOn ? ` It ran until ${whenItWas(endsOn, 'dayAndMonthLong')}.` : ''
  const who = isLeadViewer ? 'you' : (leadFirstName ?? 'the person running this check-in')
  const gives = isLeadViewer ? 'give' : 'gives'
  return `This check-in reached its end date.${ranUntil} Nothing new can be added until ${who} ${gives} it more time.`
}
