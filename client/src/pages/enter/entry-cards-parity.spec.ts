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
const ENTRY_COVERS: Record<string, string[]> = {
  'New hire starting': ['NEW_HIRE'],
  'New project': ['NEW_PROJECT'],
  'A new partner, cofounder, or manager': ['NEW_COFOUNDER', 'NEW_MANAGER'],
  'Setting shared goals': ['OKR_ALIGNMENT'],
  'A big decision': ['BOARD_STRATEGY'],
  "Someone's work is off track": ['PIP'],
  'A project is off track': ['DRIFT'],
  'You and someone see it differently': ['REALIGN_TEAM'],
  'New advisor or board member': ['NEW_ADVISOR'],
  'Onboarding several people at once': ['COHORT_ONBOARDING'],
  'Workplan and budget': ['WORKPLAN_BUDGET'],
  'Board and leadership strategy': ['BOARD_STRATEGY'],
  'A regular read on live work': ['PULSE_CHECK'],
  'Many people in the same role': ['COHORT_CHECK'],
  'Raise, promotion, or recognition': ['RECOGNITION'],
  'Contract or renewal': ['CONTRACT_RENEWAL'],
  'A shock just hit': ['ACUTE_SHOCK'],
}

/** The admin picker's cardKeys, read from source so it cannot go stale. */
const adminCardKeys = (() => {
  const src = readFileSync(join(__dirname, '../grounds/CreateGroundPage.tsx'), 'utf8')
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
    expect(labels).toContain('Many people in the same role')
    expect(labels).toContain('Onboarding several people at once')
  })
})
