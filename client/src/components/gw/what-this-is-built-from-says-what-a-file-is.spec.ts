import { describe, it, expect } from 'vitest'
import { asFileIsKindSentence } from './TheSessionsReport'

/**
 * U.9 RE-REVIEW: "<FILE> · <KIND>" BECOMES "<FILE> IS <KIND>." UNDER "WHAT THIS IS BUILT FROM".
 *
 * `sessionReport()`'s own `evidence[].text` (reports.service.ts, around line 2928) sends a
 * document's filename and its kind already joined with a middle dot - "Note from Tuskys
 * Kilimani.txt · a typed document", "chandarana-quote.png · a photo" - drawn under "What this is
 * built from" as if it were a quote. Engine request 61 asks for a sentence or two fields instead;
 * until then, `asFileIsKindSentence` turns the join into a sentence before it is drawn, touching
 * only a line shaped exactly "<one piece> · <one piece>".
 */
describe('a document under "What this is built from" reads as a sentence, not a dot join', () => {
  it('turns the real "typed document" shape into a sentence', () => {
    expect(asFileIsKindSentence('Note from Tuskys Kilimani.txt · a typed document'))
      .toBe('Note from Tuskys Kilimani.txt is a typed document.')
  })

  it('turns the real "photo" shape into a sentence', () => {
    expect(asFileIsKindSentence('chandarana-quote.png · a photo'))
      .toBe('chandarana-quote.png is a photo.')
  })

  it('leaves a bare filename alone, when the server sends no kind for it', () => {
    expect(asFileIsKindSentence('team-plan.txt')).toBe('team-plan.txt')
  })

  it('leaves an ordinary quote alone, since it is not shaped "<one piece> · <one piece>"', () => {
    const quote = 'We agreed the discount cannot go past 10%, and that is final.'
    expect(asFileIsKindSentence(quote)).toBe(quote)
  })
})
