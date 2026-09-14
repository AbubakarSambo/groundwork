import { describe, it, expect } from 'vitest'
import { SITUATION_CARDS, SITUATION_GROUPS } from './EntryChatPage'
import { SCENARIO_KEYS, SCENARIO_LABELS, SCENARIO_GROUPS } from '@/lib/scenario-catalog'

/**
 * THE PICKER HAS TO CALL A SITUATION WHAT THE PRODUCT CALLS IT.
 *
 * `the-public-page-and-the-picker-agree` compares the marketing use-cases page against the catalog,
 * and it does that well - it even lists the retired names by name so the page cannot regress to
 * them. Nothing compared the ENTRY PICKER against anything.
 *
 * So the catalog was renamed, the public page was updated to match, and the picker was left where it
 * was. Twelve of its seventeen labels were the exact strings the other guard lists as RETIRED:
 * "New hire starting", "A shock just hit", "Many people in the same role". Somebody reading
 * "A new manager taking over" on the site arrived and found no such card, because that scenario had
 * been folded into a single "A new partner, cofounder, or manager" card. And PIP - the situation
 * somebody is most likely to arrive having read about - was not offered at all.
 *
 * A guard that watches one of two places is a guard for one of two places.
 */
const labels = SITUATION_CARDS.map((c) => c.label)

/**
 * Situations deliberately offered under a second name, because they are two jobs on one engine.
 *
 * COHORT_CHECK is an ongoing read and onboarding a group. OKR_ALIGNMENT is setting targets and
 * keeping a team moving against them, and setting one goal at the top for other teams to write
 * their own underneath - the cascade, which is detected from what people say rather than declared,
 * so it has no scenario of its own and should not get one just to earn a card.
 */
const EXTRA_NAMES_ALLOWED = ['Onboarding several people at once', 'Connect Goals Across the Team']

describe('the entry picker and the catalog', () => {
  it('found the cards, or this test proves nothing', () => {
    expect(labels.length).toBeGreaterThan(10)
    expect(SCENARIO_KEYS.length).toBeGreaterThan(10)
  })

  it('calls each situation what the product calls it', () => {
    const stale = labels.filter(
      (l) => !(Object.values(SCENARIO_LABELS) as string[]).includes(l) && !EXTRA_NAMES_ALLOWED.includes(l),
    )
    expect(stale).toEqual([])
  })

  /**
   * OPEN_READ is the "describe your own situation" route, which the picker offers as its own
   * affordance rather than as a card in the list.
   */
  it('offers every situation the product supports', () => {
    const missing = SCENARIO_KEYS
      .filter((k) => k !== 'OPEN_READ')
      .filter((k) => !labels.includes(SCENARIO_LABELS[k]))
      .map((k) => `${k} ("${SCENARIO_LABELS[k]}")`)
    expect(missing).toEqual([])
  })

  it('and does not fold two scenarios into one card', () => {
    // The exact regression: one card standing in for NEW_COFOUNDER and NEW_MANAGER.
    expect(labels).not.toContain('A new partner, cofounder, or manager')
    expect(labels).toContain(SCENARIO_LABELS.NEW_COFOUNDER)
    expect(labels).toContain(SCENARIO_LABELS.NEW_MANAGER)
  })

  it('offers the situation people arrive having read about', () => {
    expect(labels).toContain(SCENARIO_LABELS.PIP)
  })
})

/**
 * ONE LIST, NOT TWO IMPLEMENTATIONS OF THE SAME LIST.
 *
 * `/grounds/new` renders from the catalog and could not drift. `/start` kept its own hardcoded
 * labels, its own group keys and its own five headings, so it was the only surface still carrying
 * the retired names, the only one that had folded NEW_COFOUNDER and NEW_MANAGER into one card, and
 * the only one that never offered PIP. Somebody who saw both surfaces had to work out they were the
 * same nineteen situations under different names.
 *
 * These hold the SOURCE, not the strings: a label that is not read from SCENARIO_LABELS is a label
 * that can be edited here and nowhere else, which is how the drift started.
 */
describe('the picker reads the catalog rather than copying it', () => {
  it('takes its group headings from the catalog', () => {
    /*
     * All of them except 'open', and the exception is the point rather than a loosening.
     *
     * 'open' holds one card - describe your own situation - and that card is now the first thing on
     * the picker, above the dropdown, the same as /grounds/new. Leaving the group in the dropdown
     * gave a heading with nothing under it, and because it sorts first it was the DEFAULT: the
     * picker opened on "Not sure yet (0)" showing no cards at all. Caught by looking at the page.
     *
     * Still read FROM the catalogue rather than typed here, which is what this file is for - a
     * heading that is not in the catalogue still fails, and so does a catalogue heading that goes
     * missing from the picker for any other reason.
     */
    const offered = SCENARIO_GROUPS.filter((g) => g.key !== 'open')
    expect(SITUATION_GROUPS.map((g) => g.heading)).toEqual(offered.map((g) => g.heading))
    expect(SITUATION_GROUPS.map((g) => g.heading)).not.toContain('Not sure yet')
  })

  it('and its group keys, so a card cannot sit in a group that does not exist', () => {
    const known = new Set<string>(SCENARIO_GROUPS.map((g) => g.key))
    const stray = SITUATION_CARDS.filter((c) => !known.has(c.group as string)).map((c) => c.label)
    expect(stray).toEqual([])
  })

  it('every card names the scenario it stands for', () => {
    const unkeyed = SITUATION_CARDS.filter((c) => !(c as { scenario?: string }).scenario).map((c) => c.label)
    expect(unkeyed).toEqual([])
  })
})
