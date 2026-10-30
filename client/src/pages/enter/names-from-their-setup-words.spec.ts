import { describe, it, expect } from 'vitest'
import { namesFromTheirSetupWords } from './EntryChatPage'

/* Polish round 1 (26 October): Kevin and Peter joined with no name; Grace had named them in setup. */
describe('the name the lead already used in setup', () => {
  const words = ['We are aiming to sell 120 units by 30 October, 30 for each rep. The team is Kevin Omondi, Mercy Wairimu, Joseph Kariuki and Peter Njoroge.']
  it('goes with each address whose first part is that first name', () => {
    expect(namesFromTheirSetupWords(['kevin@dropaccess.test', 'peter@dropaccess.test - follows up leads'], words)).toEqual({ 'kevin@dropaccess.test': 'Kevin Omondi', 'peter@dropaccess.test': 'Peter Njoroge' })
  })
  it('a name typed on the invite wins, and an address nobody named gets nothing', () => {
    expect(namesFromTheirSetupWords(['kevin@dropaccess.test', 'samuel@dropaccess.test'], words, { 'kevin@dropaccess.test': 'Kev O' })).toEqual({ 'kevin@dropaccess.test': 'Kev O' })
  })
})
