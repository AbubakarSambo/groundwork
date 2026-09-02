import { describe, it, expect } from 'vitest'
import { splitOutWhatWasWorkedOut } from './which-of-this-was-worked-out'

describe('which of this was worked out', () => {
  const BODY = 'Both accounts describe twelve dormant accounts. The process is likely to yield four renewals. Everyone agrees the delay was nine days.'

  it('marks the sentence the model concluded, and leaves the rest alone', () => {
    const out = splitOutWhatWasWorkedOut(BODY, [{ id: 'i1', text: 'The process is likely to yield four renewals.' }])
    expect(out.filter(p => p.workedOut).map(p => p.text)).toEqual(['The process is likely to yield four renewals.'])
    expect(out.map(p => p.text).join('')).toBe(BODY)
  })

  it('keeps every character, so nothing is dropped from a report', () => {
    /* The join above is the real assertion: a marker that silently eats text is a worse bug. */
    const out = splitOutWhatWasWorkedOut(BODY, [{ id: 'i1', text: 'twelve dormant accounts' }])
    expect(out.map(p => p.text).join('')).toBe(BODY)
  })

  it('marks nothing when the claim does not appear verbatim', () => {
    /* Rather than guess. Marking the wrong sentence says somebody's own words were invented. */
    const out = splitOutWhatWasWorkedOut(BODY, [{ id: 'i1', text: 'a paraphrase that is not in the body' }])
    expect(out).toEqual([{ text: BODY, workedOut: false }])
  })

  it('handles an empty list, which is most reports today', () => {
    expect(splitOutWhatWasWorkedOut(BODY, [])).toEqual([{ text: BODY, workedOut: false }])
    expect(splitOutWhatWasWorkedOut(BODY, null)).toEqual([{ text: BODY, workedOut: false }])
  })

  it('and an empty report', () => {
    expect(splitOutWhatWasWorkedOut('', [{ id: 'i1', text: 'x' }])).toEqual([])
  })

  it('when one claim contains another, the longer one wins rather than both firing', () => {
    const out = splitOutWhatWasWorkedOut(BODY, [
      { id: 'short', text: 'four renewals' },
      { id: 'long', text: 'The process is likely to yield four renewals.' },
    ])
    expect(out.filter(p => p.workedOut).length).toBe(1)
    expect(out.find(p => p.workedOut)!.inferenceId).toBe('long')
    expect(out.map(p => p.text).join('')).toBe(BODY)
  })
})
