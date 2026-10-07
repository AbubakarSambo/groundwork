import { describe, it, expect } from 'vitest'
import { closingMessageText, endCardHasRecordLines } from './a-closing-message-claims-nothing-it-does-not-keep'

const CLOSING = 'That’s all for today. Below is what I wrote down from your answers. Is anything wrong?'
const SHORTENED = 'That’s all for today. Is anything wrong?'

describe('endCardHasRecordLines', () => {
  it('is false with no end card, an empty list, or lines with nothing said', () => {
    expect(endCardHasRecordLines(null)).toBe(false)
    expect(endCardHasRecordLines(undefined)).toBe(false)
    expect(endCardHasRecordLines({ inYourRecord: [] })).toBe(false)
    expect(endCardHasRecordLines({ inYourRecord: [{ says: '', mark: 'said' } as any] })).toBe(false)
  })

  it('is true once at least one line actually says something', () => {
    expect(endCardHasRecordLines({ inYourRecord: [{ says: 'Green Mart will buy in January', mark: 'said' } as any] })).toBe(true)
  })
})

describe('closingMessageText: screen fault 2, final walk', () => {
  it('drops the record claim when the end card sends no record lines', () => {
    expect(closingMessageText(CLOSING, null)).toBe(SHORTENED)
    expect(closingMessageText(CLOSING, { inYourRecord: [] })).toBe(SHORTENED)
  })

  it('keeps the claim when the end card actually sends record lines', () => {
    const endCard = { inYourRecord: [{ says: 'Green Mart will buy in January', mark: 'said' } as any] }
    expect(closingMessageText(CLOSING, endCard)).toBe(CLOSING)
  })

  it('leaves any other message untouched, whatever the end card says', () => {
    expect(closingMessageText('Did anything else change with your sales today?', null)).toBe('Did anything else change with your sales today?')
  })
})
