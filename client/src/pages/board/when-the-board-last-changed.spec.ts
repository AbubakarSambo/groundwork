import { describe, it, expect } from 'vitest'
import { whenItRanOutOfTime, whenTheBoardLastChangedInShort, whenTheBoardLastChanged } from './when-the-board-last-changed'

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

/** "Updated Wed 23 Sep, 6pm ⓘ" (the light prototype, s71): the short form, the same everywhere. */
describe('whenTheBoardLastChangedInShort', () => {
  it('reads "Wed 23 Sep" and the hour, never "Sept"', () => {
    expect(whenTheBoardLastChangedInShort('2026-09-23T15:00:00.000Z')).toMatch(/^Wed 23 Sep, \d{1,2}(am|pm)$/)
  })
  it('says nothing short where the record holds no time, so the full sentence is said instead', () => {
    expect(whenTheBoardLastChangedInShort(null)).toBeNull()
  })
})

/* Changed in batch 2, group 6 (Hafsah, 4 November, issue 40): the status line stays and its explanation goes, for everybody. */
describe('the line on the board', () => {
  it('says the day and the time, and nothing about how the board works, switch or no switch', () => {
    for (const direct of [true, false]) {
      const said = whenTheBoardLastChanged('2026-10-20T05:00:00.000Z', direct)
      expect(said).toMatch(/^Last updated on Tuesday 20 October at \d{1,2}(am|pm)\.$/)
      expect(said).not.toContain('The board only changes')
    }
  })
  it('says nothing where the record holds no time', () => {
    expect(whenTheBoardLastChanged(null, true)).toBe('')
    expect(whenTheBoardLastChanged(null)).toBe('')
  })
})
