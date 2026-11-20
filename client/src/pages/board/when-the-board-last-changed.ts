import { whenItWas } from '@/lib/a-date-reads-the-same-everywhere'

function atTime(d: Date | string): string {
  return whenItWas(d, 'hourOfDay').replace(':00', '').replace(/\s+/g, '').toLowerCase()
}

/**
 * "Wed 23 Sep, 6pm" (the light prototype, s71: "Updated Wed 23 Sep, 6pm ⓘ"), from the same
 * `lastChangedAt` as the full sentence, which stays one tap away behind the ⓘ. Null where the
 * record holds no time, so the full sentence is said as it is.
 */
export function whenTheBoardLastChangedInShort(at: string | null | undefined): string | null {
  if (!at) return null
  /* Built from its parts, so it reads "Sep" everywhere: some systems shorten September to "Sept". */
  const weekday = whenItWas(at, 'shortWeekday').replace(/[.,]/g, '').slice(0, 3)
  const month = whenItWas(at, 'month').slice(0, 3)
  return `${weekday} ${whenItWas(at, 'dayOfMonth')} ${month}, ${atTime(at)}`
}

/**
 * With the direct morning on (lib/the-direct-morning.tsx), the day and the time alone: "Last updated on Tuesday 20 October at 8am."
 * No explanation of how the board works, and nothing at all where the record holds no time.
 */
/* The status line only (Hafsah, 4 November, issue 40): "Last updated on Wednesday 4 November at 9:33am." The explanation that
   followed it ("The board only changes when something new comes in…") is gone for everybody, whatever the switch. */
export function whenTheBoardLastChanged(at: string | null | undefined, _direct = false): string {
  if (!at) return ''
  return `Last updated on ${whenItWas(at, 'weekdayAndDay')} at ${atTime(at)}.`
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
