import { SCENARIO_FACTS, type ScenarioKey } from './scenario-catalog'

/**
 * HOW LONG THIS ONE RUNS, AND HOW OFTEN, SAID ONCE.
 *
 * Every situation card carried a hand-written `timelineHint` - "typically 90 days", "typically two
 * weeks" - beside a `SCENARIO_SETUP` row that already held the real length and cadence. Two copies
 * of one fact, and they had drifted on six of the twenty-three:
 *
 *   a contract renewal    said "two weeks"     and runs 60 days, checking in every two weeks
 *   a big decision        said "one check-in"  and runs 60 days
 *   a new advisor         said "90 days"       and runs a year, monthly
 *   strategy              said "two check-ins" and runs 90 days, monthly
 *   a recognition         said "one check-in"  and runs 30 days
 *   a cohort read         said "ongoing"       and runs 30 days
 *
 * The contract one is the one that got noticed, and it is the clearest: two weeks is the CADENCE.
 * Printed as a length it says you are a fortnight from signing, which is a different situation
 * entirely and not the one the card is for.
 *
 * So it is derived. The hint cannot disagree with the setup any more, because there is nothing left
 * to disagree with it.
 *
 * SAYS BOTH, BECAUSE BOTH ARE THE ANSWER. "How long does this take" and "how often will people be
 * asked" are the two questions somebody has at a picker, and either alone invites the wrong guess:
 * a length with no cadence sounds like one long wait, and a cadence with no length sounds like
 * forever.
 */
export function howLongThisOneRuns(scenario: ScenarioKey | string): string | null {
  const facts = (SCENARIO_FACTS as Record<string, { cadence: string; timelineDays: number; ongoing?: boolean } | undefined>)[scenario]
  if (!facts) return null

  /* The one-off. Nothing to hedge and no cadence to name: it happens once and it is done. */
  if (facts.cadence === 'One time' || facts.timelineDays <= 1) return 'One check-in, no follow-up'

  /*
   * AND THE ONES THAT DO NOT FINISH SAY SO, which the catalogue already knew.
   *
   * `ongoing` is on the row with its own reason beside it: a regular read on live work is stopped
   * when somebody stops wanting it, and printing a length there "answered a question nobody asked
   * with a number that read as a cap" - reported by a person who wanted to watch a sales team for a
   * year and read 30 days as being told he could not.
   */
  if (facts.ongoing) return `${facts.cadence}, for as long as you want it`

  return `${aLengthAnybodyWouldSay(facts.timelineDays)}, ${facts.cadence.toLowerCase()}`
}

/** 90 is "about three months", not "90 days". Nobody plans in days past a fortnight. */
function aLengthAnybodyWouldSay(days: number): string {
  if (days >= 330) return 'About a year'
  if (days >= 60) return `About ${Math.round(days / 30)} months`
  if (days >= 25) return 'About a month'
  if (days >= 12) return 'About two weeks'
  return `About ${days} days`
}
