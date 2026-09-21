import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { SITUATION_CARDS, SITUATION_GROUPS } from './EntryChatPage'
import { SCENARIO_LABELS } from '@/lib/scenario-catalog'

/**
 * THE TWO PICKERS MUST OFFER THE SAME SITUATIONS.
 *
 * There are two: `/grounds/new` for someone signed in (CreateGroundPage), and
 * `/start` for a first-time visitor (this file). They are hand-maintained in
 * separate files, and they drifted - eighteen cards against eight. Ten
 * situations, including BOTH cohort cards, were reachable only after signing
 * up, which is exactly backwards: the person with no account is the one with no
 * other way in.
 *
 * A first-time visitor now sees the same set. This test is the thing that stops
 * the next card being added to one file only.
 *
 * The two lists cannot be compared field-by-field, because they route
 * differently on purpose: `/grounds/new` sends a scenario KEY, `/start` sends a
 * SENTENCE the model classifies. So parity is asserted on the situations
 * offered, via the mapping below.
 */

/**
 * Which admin-picker card each entry card stands in for. Several entry cards
 * deliberately cover more than one - a first-time visitor should not have to
 * know whether their situation is filed as NEW_COFOUNDER or NEW_MANAGER.
 */
/*
 * KEYED BY THE CATALOG'S NAMES. These were the picker's old labels, which had drifted from the
 * catalog while the public page kept up - so this map documented a set of cards that no longer
 * existed under those names, and the comment above about NEW_COFOUNDER and NEW_MANAGER not needing
 * to be distinguished is no longer true: they are two cards now, because they are two scenarios
 * with different cadences and different questions.
 */
/*
 * DERIVED FROM THE CATALOGUE, NOT COPIED FROM IT.
 *
 * This map used to spell the labels out, and it was a THIRD copy of them - the catalogue, the two
 * pickers, and this. Renaming every card broke it, which is the test doing its job; hand-editing
 * the strings back would have left the same trap set for the next rename. Keyed by the catalogue
 * now, so the only way to break it is to add a card nobody mapped, which is the thing it exists to
 * catch.
 *
 * The pairs that are not one to one stay written out, because they are decisions rather than
 * lookups: two goal cards on one scenario, and the two cohort cards.
 */
const L = SCENARIO_LABELS
const ENTRY_COVERS: Record<string, string[]> = {
  [L.NEW_HIRE]: ['NEW_HIRE'],
  /* One card, one scenario. Its whole pitch is one of everything. */
  [L.TEAM_UPDATES]: ['TEAM_UPDATES'],
  /* And the one that asks a room what they know rather than how their work is going. */
  [L.DISCOVERY]: ['DISCOVERY'],
  [L.CONTRACT_REVIEW]: ['CONTRACT_REVIEW'],
  [L.IMPLEMENTATION_TRACKING]: ['IMPLEMENTATION_TRACKING'],
  [L.NEW_PROJECT]: ['NEW_PROJECT'],
  [L.NEW_COFOUNDER]: ['NEW_COFOUNDER'],
  [L.NEW_MANAGER]: ['NEW_MANAGER'],
  /* Two cards, one scenario: setting targets and keeping a team moving against them, and one goal
     at the top with other teams writing their own underneath. The map is keyed by label because a
     label is a job and a scenario is an engine, and they were never one to one. */
  [L.OKR_ALIGNMENT]: ['OKR_ALIGNMENT'],
  /* Its own card in the signed-in picker now, so it stands in for that one rather than for the
     scenario the two goal cards share. */
  'Connect Goals Across the Team': ['OKR_CASCADE'],
  /**
   * WAS 'BOARD_STRATEGY', WHICH IS THE CARD BELOW THIS ONE.
   *
   * Two entry cards were documented as standing in for the same admin card, which is how
   * CRISIS_ALIGNMENT read as covered while having no card on either surface. The card's own copy
   * says what it is - a group making a real choice, each person's honest read before you commit -
   * and that is CRISIS_ALIGNMENT. BOARD_STRATEGY is the standing read on direction.
   */
  [L.CRISIS_ALIGNMENT]: ['CRISIS_ALIGNMENT'],
  [L.PIP]: ['PIP'],
  [L.DRIFT]: ['DRIFT'],
  [L.REALIGN_TEAM]: ['REALIGN_TEAM'],
  [L.NEW_ADVISOR]: ['NEW_ADVISOR'],
  'Onboarding several people at once': ['COHORT_ONBOARDING'],
  [L.WORKPLAN_BUDGET]: ['WORKPLAN_BUDGET'],
  [L.BOARD_STRATEGY]: ['BOARD_STRATEGY'],
  [L.PULSE_CHECK]: ['PULSE_CHECK'],
  /**
   * The one-off read. It had no card on either surface, because until now it had no scenario: the
   * recurring card carried the label and the recurring interview behind it, so somebody wanting a
   * single temperature read opened that and abandoned it after one session.
   */
  [L.SNAPSHOT]: ['SNAPSHOT'],
  [L.COHORT_CHECK]: ['COHORT_CHECK'],
  [L.RECOGNITION]: ['RECOGNITION'],
  [L.CONTRACT_RENEWAL]: ['CONTRACT_RENEWAL'],
  [L.ACUTE_SHOCK]: ['ACUTE_SHOCK'],
  [L.ROLE_HANDOVER]: ['ROLE_HANDOVER'],
}

/** The admin picker's cardKeys, read from source so it cannot go stale. */
const adminCardKeys = (() => {
  const src = readFileSync(join(__dirname, '../grounds/CreateGroundPage.tsx'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
  return [...src.matchAll(/cardKey:\s*'([A-Z_]+)'/g)].map(m => m[1])
})()

describe('what a signed-out visitor is offered', () => {
  it('covers every situation the signed-in picker offers', () => {
    const covered = new Set(Object.values(ENTRY_COVERS).flat())
    // DESCRIBE_OWN is the freeform card; /start has its own ("My situation is
    // different"), which lives in the render rather than in SITUATION_CARDS.
    const missing = adminCardKeys.filter(k => k !== 'DESCRIBE_OWN' && !covered.has(k))
    expect(missing).toEqual([])
  })

  it('has an entry card for each mapping, so the map cannot rot', () => {
    const labels = new Set(SITUATION_CARDS.map(c => c.label))
    const orphans = Object.keys(ENTRY_COVERS).filter(l => !labels.has(l))
    expect(orphans).toEqual([])
  })

  it('maps every entry card, so a new one cannot be added unmapped', () => {
    const unmapped = SITUATION_CARDS.map(c => c.label).filter(l => !(l in ENTRY_COVERS))
    expect(unmapped).toEqual([])
  })

  it('puts every card in a group that is actually rendered', () => {
    const rendered = new Set(SITUATION_GROUPS.map(g => g.key))
    const homeless = SITUATION_CARDS.filter(c => !rendered.has(c.group)).map(c => c.label)
    expect(homeless).toEqual([])
  })

  it('reaches the cohort situations, which used to need an account', () => {
    const labels = SITUATION_CARDS.map(c => c.label)
    /* From the catalogue, so a rename cannot make this quietly assert a card nobody offers. */
    expect(labels).toContain(SCENARIO_LABELS.COHORT_CHECK)
    expect(labels).toContain('Onboarding several people at once')
  })
})
