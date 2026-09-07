import { describe, it, expect } from 'vitest'
import { SITUATION_CARDS } from './EntryChatPage'
import { SCENARIO_FACTS, SCENARIO_LABELS, SCENARIO_GROUPS } from '@/lib/scenario-catalog'

/**
 * THE SAME SITUATION MUST SIT IN THE SAME PLACE AT BOTH DOORS.
 *
 * Her words: "the entry chat and the in platform scenario picker look different." The situations
 * offered were already guarded - entry-cards-parity.spec.ts stops one list gaining a card the other
 * has not - but nothing checked WHERE each card was filed, and one of them had drifted:
 * "Someone's work is off track" was under "Something is off" here and under "A decision about one
 * person" in the catalogue that the signed-in picker reads.
 *
 * That is worse than it sounds. Both pickers are a dropdown of groups now, so the group is not a
 * heading somebody skims past - it is the only way to reach the card at all. A situation filed
 * differently at each door is a situation you can find once and then fail to find again, and you
 * would blame yourself rather than the product.
 *
 * WHY THE CATALOGUE WINS RATHER THAN THIS LIST: it is the one both surfaces can read, and the
 * public use-cases page reads it too. A guard that names one of the two as right is the only kind
 * that can be acted on when it goes red.
 */
const keyFor = (label: string) =>
  (Object.keys(SCENARIO_LABELS) as (keyof typeof SCENARIO_LABELS)[]).find(
    (k) => SCENARIO_LABELS[k] === label,
  )

/**
 * The one card that is deliberately offered under a name of its own: COHORT_CHECK appears twice,
 * as an ongoing read and as onboarding a group. It has no catalogue label to compare against, which
 * is exactly why it is named here rather than skipped by a rule that would also skip a typo.
 */
const OFFERED_UNDER_ITS_OWN_NAME = ['Onboarding several people at once']

describe('one list of situations, not two', () => {
  it('found both lists, or this proves nothing', () => {
    expect(SITUATION_CARDS.length).toBeGreaterThan(10)
    expect(Object.keys(SCENARIO_FACTS).length).toBeGreaterThan(10)
  })

  it('files every situation in the group the catalogue files it in', () => {
    const disagreements = SITUATION_CARDS.filter((c) => {
      if (OFFERED_UNDER_ITS_OWN_NAME.includes(c.label)) return false
      const key = keyFor(c.label)
      if (!key) return false
      return SCENARIO_FACTS[key].group !== c.group
    }).map((c) => `${c.label}: entry says "${c.group}"`)
    expect(disagreements).toEqual([])
  })

  it('and only into groups that exist, so a typo cannot hide a card from the dropdown', () => {
    /* A group key nothing renders is a card nobody can reach - it would fail no other test here. */
    const known = new Set(SCENARIO_GROUPS.map((g) => g.key as string))
    expect(SITUATION_CARDS.filter((c) => !known.has(c.group)).map((c) => c.label)).toEqual([])
  })
})
