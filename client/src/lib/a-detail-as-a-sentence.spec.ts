import { describe, it, expect } from 'vitest'
import { theDetailsAsSentences } from './a-detail-as-a-sentence'

/* The five sentences the boards review quoted, as the lead reads them (boards pass 4, defect 4), and the details a deal carries. */
describe('a deal\'s details are plain sentences, never a field name glued to a value', () => {
  it('reads the five sentences the review quoted', () => {
    expect(theDetailsAsSentences([['Units', '6']])).toEqual(['It is for 6 units.'])
    expect(theDetailsAsSentences([['Units', '40']])).toEqual(['It is for 40 units.'])
    expect(theDetailsAsSentences([['Next step', 'send the quote'], ['Next step by', 'Friday']])).toEqual(['The next step is send the quote, by Friday.'])
    expect(theDetailsAsSentences([['Quoted', 'KES 30,000']])).toEqual(['The quote was KES 30,000.'])
    expect(theDetailsAsSentences([['Need', '5 units']])).toEqual(['The customer needs 5 units.'])
  })
  it('says a next-step day with no next step, and a value that already has its word', () => {
    expect(theDetailsAsSentences([['Next step by', 'Friday']])).toEqual(['The next step is due by Friday.'])
    expect(theDetailsAsSentences([['Units', '6 units']])).toEqual(['It is for 6 units.'])
  })
  it('keeps the other labels as before, and says a plural label with "are"', () => {
    expect(theDetailsAsSentences([['Amount', 'KES 45,000']])).toEqual(['The amount is KES 45,000.'])
    expect(theDetailsAsSentences([['Parties', 'Kamau and Apex']])).toEqual(['The parties are Kamau and Apex.'])
  })
  it('says nothing for a detail with nothing in it', () => {
    expect(theDetailsAsSentences([['Contact', '  ']])).toEqual([])
  })
  it('no sentence has a colon, an arrow or a doubled full stop', () => {
    const all = theDetailsAsSentences([['Units', '6'], ['Value', 'KES 30,000.'], ['Price each', 'KES 5,000'], ['Contact', 'Rose'], ['Buying date', '2026-10-30'], ['Budget stated', 'KES 15,000'], ['Decision maker', 'the owner'], ['Quote accepted', 'yes']])
    for (const s of all) expect(s).not.toMatch(/:|→|\.\./)
  })
})
