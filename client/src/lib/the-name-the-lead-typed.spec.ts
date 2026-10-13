import { describe, it, expect } from 'vitest'
import { nameWithoutGuessing, participantLabel, peopleLabels } from './utils'

/**
 * THE NAME THE LEAD TYPED, AS SHE TYPED IT (journey test, 12 October 2026). Lena added "pia alpha",
 * "ben beta" and "cara gamma". The admin's approval screen read "Somebody invited by email" and the
 * board "A third colleague". Each screen reads the name given before any placeholder, and never
 * re-cases it: lower case stays lower case, because it is the lead's own words.
 */
const pia = { id: 'p1', partyType: 'PARTICIPANT', email: 'pia@brightloom.test', nameGiven: 'pia alpha', user: { firstName: '', lastName: '' } }
const ben = { id: 'p2', partyType: 'PARTICIPANT', email: null, nameGiven: 'ben beta', user: null }
const cara = { id: 'p3', partyType: 'PARTICIPANT', email: null, nameGiven: 'cara gamma', user: null }

describe('the typed name', () => {
  it('heads the row on the admin\'s Who\'s in it, as typed', () => {
    expect(nameWithoutGuessing(pia).name).toBe('pia alpha')
    expect(nameWithoutGuessing(ben).name).toBe('ben beta')
  })
  it('is the name on the board, never "a third colleague"', () => {
    const labels = peopleLabels([pia, ben, cara])
    expect([...labels.values()]).toEqual(['pia alpha', 'ben beta', 'cara gamma'])
    expect(participantLabel(cara)).toBe('cara gamma')
  })
})
