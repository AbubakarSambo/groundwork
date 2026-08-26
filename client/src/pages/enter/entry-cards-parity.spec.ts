import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { SITUATION_CARDS, SITUATION_GROUPS } from './EntryChatPage'

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
const ENTRY_COVERS: Record<string, string[]> = {
  'A new hire starting': ['NEW_HIRE'],
  'A new project starting': ['NEW_PROJECT'],
  'A new co-founder or partner': ['NEW_COFOUNDER'],
  'A new manager taking over': ['NEW_MANAGER'],
  'Setting shared goals': ['OKR_ALIGNMENT'],
  /**
   * WAS 'BOARD_STRATEGY', WHICH IS THE CARD BELOW THIS ONE.
   *
   * Two entry cards were documented as standing in for the same admin card, which is how
   * CRISIS_ALIGNMENT read as covered while having no card on either surface. The card's own copy
   * says what it is - "a group making a real choice, each person's honest read before you commit" -
   * and that is CRISIS_ALIGNMENT. BOARD_STRATEGY is the standing read on direction, and it is
   * covered by 'Board and leadership strategy'.
   */
  'A big decision': ['CRISIS_ALIGNMENT'],
  "Someone's work is off track": ['PIP'],
  'A project is off track': ['DRIFT'],
  'People see it differently': ['REALIGN_TEAM'],
  'A new advisor or board member': ['NEW_ADVISOR'],
  'Onboarding several people at once': ['COHORT_ONBOARDING'],
  'A workplan and budget': ['WORKPLAN_BUDGET'],
  'Board or leadership strategy': ['BOARD_STRATEGY'],
  'A regular read on live work': ['PULSE_CHECK'],
  /**
   * The one-off read. It had no card on either surface, because until now it had no scenario: the
   * recurring card carried the label and the recurring interview behind it, so somebody wanting a
   * single temperature read opened that and abandoned it after one session.
   */
  'A pulse check': ['SNAPSHOT'],
  'Several people in the same role': ['COHORT_CHECK'],
  'A raise, promotion, or recognition': ['RECOGNITION'],
  'A contract or renewal': ['CONTRACT_RENEWAL'],
  'Something serious just happened': ['ACUTE_SHOCK'],
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
    expect(labels).toContain('Several people in the same role')
    expect(labels).toContain('Onboarding several people at once')
  })
})
