/**
 * HOW CLOSE THIS CHECK-IN IS TO RUNNING OUT OF TIME, AND SAYING SO BEFORE IT DOES.
 *
 * Hafsah, 23 September 2026: "have a risk of stalling show, don't just stall."
 *
 * Until today the product had one thing to say about a deadline and it said it afterwards: a 3am
 * sweep wrote the check-in off and emailed everybody that it was over. The date was on the page in
 * a quiet line and nothing anywhere said what happened when it arrived, so the first anybody heard
 * of it was the obituary. A customer's account of it - "i let a few check-ins wait" - is the most
 * ordinary thing that can happen to a busy person.
 *
 * So the risk is a state the screens can show, with the same number of days the notice email uses,
 * and it appears while there is still something to do about it.
 */

/**
 * The same seven days the server warns on - `DAYS_OF_NOTICE` in grounds.cron.
 *
 * Written twice, once each side, like the working-days helpers beside it: the page cannot ask the
 * cron and the cron cannot ask the page. Seven, because what is being asked for is not a click - it
 * is deciding whether the people who have not answered still will, and possibly chasing them.
 */
export const DAYS_OF_NOTICE = 7

export type HowLongIsLeft =
  /* Plenty of time, or no fixed length at all. Nothing to say. */
  | { state: 'fine' }
  /* Inside the notice window. Somebody can still act, and this is the moment they can. */
  | { state: 'soon'; daysLeft: number }
  /* The time is up. It either has stalled or is about to tonight. */
  | { state: 'out'; daysLeft: number }

export interface HasADeadline {
  /** Days from today to the end, as the server computes it. Null where it has no fixed length. */
  daysLeft?: number | null
  status?: string | null
}

export function whenItRunsOut(g: HasADeadline | null | undefined): HowLongIsLeft {
  /* Already stopped is its own banner - see itRanOutOfTime - and this must not speak over it. */
  if (!g || g.status === 'STALLED') return { state: 'fine' }
  const left = g.daysLeft
  if (left === null || left === undefined) return { state: 'fine' }
  if (left <= 0) return { state: 'out', daysLeft: left }
  if (left <= DAYS_OF_NOTICE) return { state: 'soon', daysLeft: left }
  return { state: 'fine' }
}

/**
 * WHAT IT SAYS, AND IT SAYS WHAT HAPPENS RATHER THAN JUST THE NUMBER.
 *
 * "Runs out in 5 days" is a fact nobody can act on without knowing what running out costs them.
 * The consequence is the whole point of showing this early, so it is in the sentence.
 */
export function sayHowLongIsLeft(it: HowLongIsLeft, stillOut: number): string {
  if (it.state === 'fine') return ''
  const who = stillOut > 0
    ? ` ${stillOut} ${stillOut === 1 ? 'person has' : 'people have'} not answered yet.`
    : ''
  if (it.state === 'out') {
    return `The time given to this check-in is up.${who} Nobody can add to it after tonight unless you give it more time.`
  }
  const days = it.daysLeft === 1 ? 'tomorrow' : `in ${it.daysLeft} days`
  return `This check-in runs out ${days}.${who} After that nobody can add to it until somebody gives it more time.`
}
