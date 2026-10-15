import { describe, it, expect } from 'vitest'
import { anOldAskAnswerReadsProperly } from './an-old-ask-answer-reads-properly'

/**
 * B-016: old Ask answers came back reading "...What can you help me with?.", a question mark run
 * straight into a full stop, left over once the live buttons are flattened into one sentence for
 * history (AskTurn.says has no structured choices to restore the real buttons from).
 */
describe('an old Ask answer reads properly', () => {
  it('drops the full stop a question mark already ends on', () => {
    expect(anOldAskAnswerReadsProperly('What can you help me with?.')).toBe('What can you help me with?')
  })

  it('drops the full stop an exclamation mark already ends on', () => {
    expect(anOldAskAnswerReadsProperly('Nice one!.')).toBe('Nice one!')
  })

  it('collapses a run of full stops into one', () => {
    expect(anOldAskAnswerReadsProperly('I cannot answer that one yet..')).toBe('I cannot answer that one yet.')
  })

  it('leaves an ordinary sentence untouched', () => {
    expect(anOldAskAnswerReadsProperly('I cannot answer that one yet. Here is what I can do with "Yes".')).toBe('I cannot answer that one yet. Here is what I can do with "Yes".')
  })
})
