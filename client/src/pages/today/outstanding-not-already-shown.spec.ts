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

  /**
   * B-073: the exact sentences from the bug log, which an exact whole-sentence match never caught,
   * because the outstanding sentence and Today's own row are never worded the same way for the same
   * fact. Reproduced here with Wairimu's and Baraka's exact rows and sentences.
   */
  describe('B-073: the same wait or request, said twice in different words', () => {
    it('drops "waiting on you for X" when the board’s own row already says Wairimu needs to get back to them for it', () => {
      const existing = [
        need(
          'You need to get back to Amani Wekesa, who is waiting on you for the discount limit for the Naivas order.',
          'It was first said on 3 October. Nobody has said what has been tried. No time has been given for it.',
        ),
      ]
      const sentences = ['Amani is waiting on you for the discount limit for the Naivas order since Saturday 3 October.']
      expect(outstandingNotAlreadyShown(existing, sentences)).toEqual([])
    })

    it('drops a leave request’s "is waiting" sentence when the request already has its own row, worded as "asked for"', () => {
      const existing = [
        need('Amani asked for leave from Thursday 22 October to Monday 26 October.', 'It is waiting for you to approve.'),
      ]
      const sentences = ["Amani's leave from Thursday 22 October to Monday 26 October is waiting for you to approve or decline."]
      expect(outstandingNotAlreadyShown(existing, sentences)).toEqual([])
    })

    it('drops Baraka’s "Two requests are waiting" summary once Today already lists both of them as their own rows', () => {
      const existing = [
        need('Kito asked for leave from Thursday 22 October to Monday 26 October.', 'It is waiting for you to approve.'),
        need('Tobi asked to spend KES 40,000 on fuel for the delivery vans.', 'It is waiting for you to approve.'),
      ]
      const sentences = ['Two requests are waiting for you to approve or decline.']
      expect(outstandingNotAlreadyShown(existing, sentences)).toEqual([])
    })

    it('keeps the summary when Today does not already list that many rows waiting for approval', () => {
      const existing = [need('Kito asked for leave from Thursday 22 October to Monday 26 October.', 'It is waiting for you to approve.')]
      const sentences = ['Two requests are waiting for you to approve or decline.']
      expect(outstandingNotAlreadyShown(existing, sentences)).toEqual(sentences)
    })

    it('never drops a wait or a request Today does not otherwise show', () => {
      const existing = [need('Decide whether a price range counts as a budget', 'Brian and Miriam both raised it.')]
      const sentences = [
        'Kofi is waiting on you for the pricing for Q4 since Thursday 8 October.',
        "Zawadi's leave on Monday 12 October is waiting for you to approve or decline.",
        'Three requests are waiting for you to approve or decline.',
      ]
      expect(outstandingNotAlreadyShown(existing, sentences)).toEqual(sentences)
    })
  })
})
