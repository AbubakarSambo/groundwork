import { describe, it, expect } from 'vitest'
import { whatMatches, NOTHING_MATCHED, alsoTyped, WORDS_PEOPLE_TYPE } from './finding-your-situation'
import { SCENARIOS } from '@/pages/grounds/CreateGroundPage'

const CARDS = alsoTyped(SCENARIOS)
const keys = (q: string) => (whatMatches(CARDS, q) ?? []).map(c => c.cardKey)

describe('finding your situation by typing it', () => {
  it('an empty search is not a search - it means show the whole list', () => {
    expect(whatMatches(CARDS, '')).toBeNull()
    expect(whatMatches(CARDS, '   ')).toBeNull()
    expect(whatMatches(CARDS, '?!')).toBeNull()
  })

  it('finding nothing is an empty list, which is not the same as not searching', () => {
    expect(whatMatches(CARDS, 'zzzqqq')).toEqual([])
    expect(NOTHING_MATCHED).toContain('Clear the search')
  })

  it('matches a whole word as a prefix, so plurals and endings are found', () => {
    /* Somebody types "deadline"; the card says "deadlines". */
    expect(keys('onboard').length).toBeGreaterThan(0)
  })

  it('does not match a word merely containing the typed letters', () => {
    /* Prefix, not substring: "off" must not reach "office" or "coffee" if they appear. */
    const off = whatMatches([
      { cardKey: 'A', label: 'Work is off track', desc: '', tag: '' },
      { cardKey: 'B', label: 'The office move', desc: '', tag: '' },
    ], 'off')
    expect(off?.map(c => c.cardKey)).toEqual(['A', 'B'])
    const track = whatMatches([
      { cardKey: 'A', label: 'Work is off track', desc: '', tag: '' },
      { cardKey: 'B', label: 'Backtrack', desc: '', tag: '' },
    ], 'track')
    expect(track?.map(c => c.cardKey)).toEqual(['A'])
  })

  it('every word must hit, because typing more words is narrowing', () => {
    const cards = [
      { cardKey: 'A', label: 'A new hire starting', desc: '', tag: '' },
      { cardKey: 'B', label: 'A new project starting', desc: '', tag: '' },
    ]
    expect(whatMatches(cards, 'new')?.map(c => c.cardKey)).toEqual(['A', 'B'])
    expect(whatMatches(cards, 'new hire')?.map(c => c.cardKey)).toEqual(['A'])
  })

  it('a hit in the name outranks a hit in the prose', () => {
    const cards = [
      { cardKey: 'PROSE', label: 'Something else', desc: 'this mentions a handover in passing', tag: '' },
      { cardKey: 'NAME', label: 'A role changing hands handover', desc: '', tag: '' },
    ]
    expect(whatMatches(cards, 'handover')?.[0].cardKey).toBe('NAME')
  })

  it("and a hit in an example outranks prose too - examples are how people recognise themselves", () => {
    const cards = [
      { cardKey: 'PROSE', label: 'X', desc: 'deadlines get mentioned here', tag: '' },
      { cardKey: 'EXAMPLE', label: 'Y', desc: '', tag: '', examples: ['e.g. they keep missing deadlines'] },
    ]
    expect(whatMatches(cards, 'deadlines')?.[0].cardKey).toBe('EXAMPLE')
  })

  it('ties keep catalogue order rather than shuffling between keystrokes', () => {
    const cards = [
      { cardKey: 'FIRST', label: 'A new thing', desc: '', tag: '' },
      { cardKey: 'SECOND', label: 'A new thing', desc: '', tag: '' },
    ]
    expect(whatMatches(cards, 'new')?.map(c => c.cardKey)).toEqual(['FIRST', 'SECOND'])
  })

  it('is case-insensitive and ignores punctuation somebody types', () => {
    expect(keys('New Hire')).toEqual(keys('new hire'))
    expect(keys("co-founder")).toEqual(keys('co founder'))
  })

  it('real phrases people would type reach a real card', () => {
    /* Not asserting WHICH card - that is a judgement about the catalogue, not about matching.
       Asserting that the search is not dead on ordinary English. */
    for (const typed of [
      'new hire', 'handover', 'handing over', 'project', 'goals', 'client', 'cofounder',
      'conflict', 'crisis', 'promoted', 'okr', 'underperforming', 'contractor', 'resigned',
    ]) {
      expect(keys(typed).length, `"${typed}" found nothing`).toBeGreaterThan(0)
    }
  })

  it('the ordinary word lands on the situation it is a word FOR', () => {
    expect(keys('handover')).toContain('ROLE_HANDOVER')
    expect(keys('conflict')).toContain('REALIGN_TEAM')
    expect(keys('crisis')).toContain('ACUTE_SHOCK')
    expect(keys('underperforming')).toContain('PIP')
    expect(keys('okr')).toContain('OKR_ALIGNMENT')
    expect(keys('promoted')).toContain('RECOGNITION')
  })

  it('a word with no situation behind it finds nothing rather than the nearest card', () => {
    /* The point of the whole thing: a wrong card sets the objective and the questions the
       team is then asked. Finding nothing costs a sentence. */
    for (const noCard of ['vendor', 'audit', 'burnout', 'morale']) {
      expect(keys(noCard), `"${noCard}" reached a card it has no business reaching`).toEqual([])
    }
  })

  it('every extra word is attached to a card that exists', () => {
    const real = new Set(SCENARIOS.map(c => c.cardKey))
    for (const key of Object.keys(WORDS_PEOPLE_TYPE)) expect(real.has(key), key).toBe(true)
  })
})
