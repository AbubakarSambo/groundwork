import { describe, it, expect } from 'vitest'
import { whatTheRowSays, type RowFacts } from './what-a-sidebar-row-says'

/**
 * WHAT A SIDEBAR ROW SAYS WHEN POINTED AT OR READ ALOUD, as each reader hears it.
 *
 * The examples are the reviewer's, from the running app: the local "Coamana growth, Q3 paying
 * customers" check-in, 12 sessions planned, one thing still open.
 */
const base: RowFacts = {
  label: 'Coamana growth, Q3 paying customers',
  attention: { kind: 'none' },
  round: 2,
  planned: 12,
  roundsDone: 0,
  alignment: { agreed: 0, open: 1 },
  closed: false,
}

describe('what a sidebar row says', () => {
  it('to a participant or lead whose turn it is', () => {
    expect(whatTheRowSays({ ...base, attention: { kind: 'yours', sessionNumber: 2 } }))
      .toBe('Coamana growth, Q3 paying customers. Check-in 2 of 12 is ready for you, and one thing is still open.')
  })

  /* Changed 3 November (F5 part 3): the row says the server's one count sentence whole (api grounds/this-sessions-count.ts), the
     same words Today, the board, the list and Ask say, in place of a count sentence of its own ("2 of 5 people have checked in for session 2 of 12"). */
  it('to an admin watching, when nobody has checked in', () => {
    expect(whatTheRowSays({ ...base, attention: { kind: 'waiting', done: 0, total: 5 }, countSays: 'Nobody has checked in yet.' }))
      .toBe('Coamana growth, Q3 paying customers. Nobody has checked in yet. One thing is still open.')
  })

  it('when some have, it says who is missing, once, in the served sentence', () => {
    expect(whatTheRowSays({ ...base, attention: { kind: 'waiting', done: 2, total: 4 }, alignment: { agreed: 3, open: 2 }, countSays: '2 of 4 have checked in; Peter and Mary haven’t joined yet.' }))
      .toBe('Coamana growth, Q3 paying customers. 2 of 4 have checked in; Peter and Mary haven’t joined yet. 2 things are still open.')
  })

  it('says no count of its own where the reader was served none', () => {
    expect(whatTheRowSays({ ...base, attention: { kind: 'waiting', done: 1, total: 3 }, alignment: null })).toBe('Coamana growth, Q3 paying customers.')
  })

  it('when it is late', () => {
    expect(whatTheRowSays({ ...base, attention: { kind: 'overdue', sessionNumber: 2, daysLate: 9 } }))
      .toBe('Coamana growth, Q3 paying customers. Your check-in 2 of 12 is 9 days past its date, and one thing is still open.')
  })

  it('counts sessions the way the check-in\'s card does, and says so, so the two never disagree', () => {
    // The card beside it reads "0 of 12 sessions done" from roundsDone: sessions EVERYBODY finished.
    expect(whatTheRowSays({ ...base, alignment: null }))
      .toBe('Coamana growth, Q3 paying customers. Nobody has finished a whole check-in yet, out of 12.')
    expect(whatTheRowSays({ ...base, roundsDone: 3, alignment: { agreed: 4, open: 0 } }))
      .toBe('Coamana growth, Q3 paying customers. Everybody has finished 3 of 12 check-ins, and 4 things are agreed and nothing is still open.')
  })

  it('says a closed one has ended, and nothing at all it does not know', () => {
    expect(whatTheRowSays({ ...base, closed: true, alignment: null })).toBe('Coamana growth, Q3 paying customers. This check-in has ended.')
    expect(whatTheRowSays({ ...base, planned: null, roundsDone: undefined, alignment: null })).toBe('Coamana growth, Q3 paying customers.')
  })

  it('is sentences, never pieces joined by full stops', () => {
    const said = whatTheRowSays({ ...base, attention: { kind: 'yours', sessionNumber: 2 } })
    expect(said).not.toMatch(/check-ins done\.|\. \d+ open\./)
    expect(said.split('. ')).toHaveLength(2)
  })
})
