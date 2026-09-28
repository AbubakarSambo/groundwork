import { describe, it, expect } from 'vitest'
import { withoutTheColonOpening } from './SessionReportPage'

/**
 * U.9 RE-REVIEW: "WHAT YOU SHARED: YOU ARE AIMING FOR…" IS A LABEL, NOT A SENTENCE.
 *
 * Walked live on Amani's own report: the stored private summary opens with the exact phrase
 * "What you shared:", which is the engine's own prompt (conversation.service.ts,
 * out of this workspace's reach - see engine request 60). Until that lands, SessionReportPage
 * turns the stored opening into a sentence of its own before drawing it.
 */
describe('the private summary reads as a sentence, not a label with a colon', () => {
  it('turns the stored "What you shared:" opening into its own sentence', () => {
    expect(withoutTheColonOpening('What you shared: You are aiming for six shops by December.'))
      .toBe('Here is what you shared. You are aiming for six shops by December.')
  })

  it('leaves a summary alone when it does not open that way', () => {
    expect(withoutTheColonOpening('You are aiming for six shops by December.'))
      .toBe('You are aiming for six shops by December.')
  })

  it('does not touch the phrase if it appears mid-sentence rather than as the opening', () => {
    expect(withoutTheColonOpening('Rukia said, "What you shared: this matters."'))
      .toBe('Rukia said, "What you shared: this matters."')
  })
})
