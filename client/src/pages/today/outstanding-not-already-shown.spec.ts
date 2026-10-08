import { describe, it, expect } from 'vitest'
import { outstandingNotAlreadyShown } from './outstanding-not-already-shown'
import type { Need } from '@/api/today'

const need = (title: string, detail: string | null = null): Need =>
  ({ key: title, kind: 'decide', title, detail, action: { label: 'Decide', to: '/x' }, groundId: 'g', organizationId: 'o' })

describe('the lead’s daily nudge is not said twice on Today', () => {
  it('keeps a sentence that says nothing "What needs you" already says', () => {
    const existing = [need('Decide whether a price range counts as a budget', 'Brian and Miriam both raised it.')]
    const sentences = ['Kofi is waiting on you for the pricing for Q4 since Thursday 8 October.']
    expect(outstandingNotAlreadyShown(existing, sentences)).toEqual(sentences)
  })

  it('drops a sentence already said, in whole or in part, in an existing row’s title or detail', () => {
    const existing = [need('Decide whether a price range counts as a budget', 'Brian and Miriam both raised it this week. It changes how 4 deals are counted.')]
    const sentences = [
      'Decide whether a price range counts as a budget',
      'Kofi is waiting on you for the pricing for Q4 since Thursday 8 October.',
    ]
    expect(outstandingNotAlreadyShown(existing, sentences)).toEqual([
      'Kofi is waiting on you for the pricing for Q4 since Thursday 8 October.',
    ])
  })

  it('keeps everything when there is nothing already on screen', () => {
    expect(outstandingNotAlreadyShown([], ['A sentence.'])).toEqual(['A sentence.'])
  })
})
