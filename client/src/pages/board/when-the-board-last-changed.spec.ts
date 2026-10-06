import { describe, it, expect } from 'vitest'
import { whenItRanOutOfTime } from './when-the-board-last-changed'

/**
 * THE STALLED SENTENCE CARRIES THE REAL END DATE WHEN THE RECORD HAS ONE (join-outoftime.txt:
 * "This check-in reached its end date. It ran until 30 September. Nothing new can be added until
 * Wairimu gives it more time."), and leaves that clause out, rather than naming a date that is not
 * there, when the record holds none.
 */
describe('whenItRanOutOfTime', () => {
  it('names the real end date, for a colleague, with the lead’s own name', () => {
    expect(whenItRanOutOfTime({ endsOn: '2026-09-30T11:02:20.500Z', leadFirstName: 'Rukia', isLeadViewer: false }))
      .toBe('This check-in reached its end date. It ran until 30 September. Nothing new can be added until Rukia gives it more time.')
  })

  it('reads "you", never her own name handed back to her, for the lead herself', () => {
    expect(whenItRanOutOfTime({ endsOn: '2026-09-30T11:02:20.500Z', leadFirstName: 'Rukia', isLeadViewer: true }))
      .toBe('This check-in reached its end date. It ran until 30 September. Nothing new can be added until you give it more time.')
  })

  it('leaves the "It ran until" clause out rather than naming a date the record does not hold', () => {
    expect(whenItRanOutOfTime({ endsOn: null, leadFirstName: 'Rukia', isLeadViewer: false }))
      .toBe('This check-in reached its end date. Nothing new can be added until Rukia gives it more time.')
  })

  it('falls back to the generic phrase when even the lead’s name is not on record', () => {
    expect(whenItRanOutOfTime({ endsOn: null, leadFirstName: null, isLeadViewer: false }))
      .toBe('This check-in reached its end date. Nothing new can be added until the person running this check-in gives it more time.')
  })
})
