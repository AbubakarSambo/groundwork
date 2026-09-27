import { describe, it, expect } from 'vitest'
import { plainWordsByPerson, oneWithNoName, atTheStart } from './a-colleague'
import { peopleLabels, participantLabel, personLabel, firstNameOrLabel } from './utils'
// The engine's own words, read from the server code, so the two cannot drift apart. Not shipped:
// only this spec loads it.
import { plainWordsByPerson as theEnginesWords } from '../../../api/src/modules/reports/party-labels'

/**
 * THE SCREENS SAY WHAT THE ENGINE SAYS ABOUT SOMEBODY WITH NO NAME. Request 36, 27 September 2026.
 *
 * Hafsah: "Fix it the simple way: the label never uses the lead's description; with no name, use a
 * plain neutral label." The engine's words are "a colleague" for one, "one colleague", "another
 * colleague", "a third colleague" for several, and "the lead" / "your lead". This runs the client's
 * copy and the engine's own function on the same people and checks they give the same words.
 */
const when = (d: number) => new Date(Date.UTC(2026, 8, d)).toISOString()
const person = (id: string, d: number, extra: Record<string, unknown> = {}) =>
  ({ id, partyType: 'PARTICIPANT', createdAt: when(d), user: null, nameGiven: null, email: null, ...extra })

const CASES: { what: string; people: any[] }[] = [
  { what: 'one person with no name', people: [person('lead', 1, { partyType: 'INITIATOR', user: { firstName: 'Grace' } }), person('a', 2)] },
  { what: 'two people with no name', people: [person('lead', 1, { partyType: 'INITIATOR', user: { firstName: 'Grace' } }), person('a', 2), person('b', 3)] },
  {
    what: 'four people with no name, given out of order, one named between them',
    people: [person('d', 9), person('lead', 1, { partyType: 'INITIATOR', user: { firstName: 'Grace' } }), person('b', 4), person('n', 3, { nameGiven: 'Tunde' }), person('a', 2), person('c', 5)],
  },
  { what: 'a lead with no name', people: [person('lead', 1, { partyType: 'INITIATOR' }), person('a', 2, { user: { firstName: 'Amina' } })] },
  { what: 'fourteen people with no name', people: Array.from({ length: 14 }, (_, i) => person(`p${i}`, i + 2)) },
]

describe('the client and the engine call a person with no name the same thing', () => {
  for (const c of CASES) {
    it(c.what, () => {
      const engine = theEnginesWords(c.people as any)
      const client = plainWordsByPerson(c.people, { named: (p: any) => !!(p.user?.firstName || p.nameGiven) })
      expect(Object.fromEntries(client)).toEqual(Object.fromEntries(engine))
    })
  }
})

describe('and the screens read them in sentences', () => {
  const lead = person('lead', 1, { partyType: 'INITIATOR', user: { firstName: 'Grace', lastName: 'Obi' } })

  it('one person with no name is "a colleague"; a lead with no name is "the lead", or "your lead" to someone in it', () => {
    expect(participantLabel(person('a', 2))).toBe('a colleague')
    expect(participantLabel(person('l', 1, { partyType: 'INITIATOR' }))).toBe('the lead')
    expect(oneWithNoName({ partyType: 'INITIATOR' }, true)).toBe('your lead')
  })

  it('several are "one colleague", "another colleague", "a third colleague", and you are never counted', () => {
    const me = person('me', 2)
    const labels = peopleLabels([lead, me, person('a', 3), person('b', 4), person('c', 5)], { readerId: 'me', readerIsInIt: true })
    expect(labels.get('lead')).toBe('Grace Obi')
    expect(labels.get('a')).toBe('one colleague')
    expect(labels.get('b')).toBe('another colleague')
    expect(labels.get('c')).toBe('a third colleague')
  })

  it('a capital only at the start of a line', () => {
    expect(atTheStart('another colleague')).toBe('Another colleague')
  })

  it('a first-name slot never takes "a" out of "a colleague"', () => {
    expect(firstNameOrLabel(person('a', 2))).toBe('a colleague')
    expect(firstNameOrLabel(lead)).toBe('Grace')
  })

  it('the lead’s own view still uses the address they typed before plain words', () => {
    expect(personLabel(person('a', 2, { email: 'david.okafor@harvestline.test' }))).toBe('David Okafor')
  })
})
