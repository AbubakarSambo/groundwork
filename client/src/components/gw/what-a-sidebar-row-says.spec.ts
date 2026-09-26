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
      .toBe('Coamana growth, Q3 paying customers. Session 2 of 12 is ready for you, and one thing is still open.')
  })

  it('to an admin watching, when nobody has checked in', () => {
    expect(whatTheRowSays({ ...base, attention: { kind: 'waiting', done: 0, total: 5 } }))
      .toBe('Coamana growth, Q3 paying customers. Nobody has checked in yet for session 2 of 12, and one thing is still open.')
  })

  it('when some have', () => {
    expect(whatTheRowSays({ ...base, attention: { kind: 'waiting', done: 2, total: 5 }, alignment: { agreed: 3, open: 2 } }))
      .toBe('Coamana growth, Q3 paying customers. 2 of 5 people have checked in for session 2 of 12, and 2 things are still open.')
  })

  it('when it is late', () => {
    expect(whatTheRowSays({ ...base, attention: { kind: 'overdue', sessionNumber: 2, daysLate: 9 } }))
      .toBe('Coamana growth, Q3 paying customers. Your session 2 of 12 is 9 days past its date, and one thing is still open.')
  })

  it('counts sessions the way the check-in\'s card does, and says so, so the two never disagree', () => {
    // The card beside it reads "0 of 12 sessions done" from roundsDone: sessions EVERYBODY finished.
    expect(whatTheRowSays({ ...base, alignment: null }))
      .toBe('Coamana growth, Q3 paying customers. Nobody has finished a whole session yet, out of 12.')
    expect(whatTheRowSays({ ...base, roundsDone: 3, alignment: { agreed: 4, open: 0 } }))
      .toBe('Coamana growth, Q3 paying customers. Everybody has finished 3 of 12 sessions, and 4 things are agreed and nothing is still open.')
  })

  it('says a closed one has ended, and nothing at all it does not know', () => {
    expect(whatTheRowSays({ ...base, closed: true, alignment: null })).toBe('Coamana growth, Q3 paying customers. This check-in has ended.')
    expect(whatTheRowSays({ ...base, planned: null, roundsDone: undefined, alignment: null })).toBe('Coamana growth, Q3 paying customers.')
  })

  it('is sentences, never pieces joined by full stops', () => {
    const said = whatTheRowSays({ ...base, attention: { kind: 'yours', sessionNumber: 2 } })
    expect(said).not.toMatch(/sessions done\.|\. \d+ open\./)
    expect(said.split('. ')).toHaveLength(2)
  })
})
