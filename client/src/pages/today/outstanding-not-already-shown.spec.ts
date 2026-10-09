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

  /**
   * B-132: THE SAME SPEND REQUEST, TWICE. "What needs you" said "Tendai asked to spend 300,000 on
   * the Mwangi agency, for the quarter." and "Needs you" repeated it as "Tendai's request to spend
   * 300,000 for the Mwangi agency, for the quarter is waiting for you to approve or decline." - the
   * exact pair from the deep page audit. `about` cannot catch this one (the "What needs you" row is
   * keyed by its position in the list, not the request's own id - see the request to the engine), so
   * it is matched by the person, the amount and what the money is for instead.
   */
  describe('B-132: the same spend request, said twice in different words', () => {
    it('drops a spend request’s "is waiting" sentence when the request already has its own row, worded as "asked to spend"', () => {
      const existing = [
        need('Tendai asked to spend 300,000 on the Mwangi agency, for the quarter.', 'It is waiting for you to approve.'),
      ]
      const sentences = ["Tendai's request to spend 300,000 for the Mwangi agency, for the quarter is waiting for you to approve or decline."]
      expect(outstandingNotAlreadyShown(existing, sentences)).toEqual([])
    })

    it('keeps a spend sentence for a request Today does not otherwise show', () => {
      const existing = [need('Decide whether a price range counts as a budget', 'Brian and Miriam both raised it.')]
      const sentences = ["Tendai's request to spend 300,000 for the Mwangi agency, for the quarter is waiting for you to approve or decline."]
      expect(outstandingNotAlreadyShown(existing, sentences)).toEqual(sentences)
    })
  })

  /**
   * REQUEST 205, DONE: `GET /today/outstanding` now serves `about` beside each sentence - an id (or
   * a few, for a summary) instead of needing the sentence's own words to be parsed back apart. This
   * matches by that first, falling back to the wording checks above only for a sentence `about`
   * does not cover.
   */
  describe('matched by id, once the server serves one (request 205)', () => {
    it('drops a wait with the same id as an existing row, worded completely differently', () => {
      const existing = [need('You need to get back to Amani Wekesa, who is waiting on you for the discount limit for the Naivas order.')]
      ;(existing[0] as any).key = 'wait-w-77'
      const sentences = ['Amani has been waiting on you for the discount limit for the Naivas order since Saturday 3 October.']
      const about = [{ kind: 'wait' as const, ids: ['w-77'] }]
      expect(outstandingNotAlreadyShown(existing, sentences, about)).toEqual([])
    })

    it('keeps a sentence whose id is not among the existing rows, even if its words happen to overlap', () => {
      const existing = [need('Something unrelated', undefined as any)]
      ;(existing[0] as any).key = 'wait-w-1'
      const sentences = ['A promise is late.']
      const about = [{ kind: 'promise' as const, ids: ['c-99'] }]
      expect(outstandingNotAlreadyShown(existing, sentences, about)).toEqual(sentences)
    })

    it('drops a leave or spend request by its id, stripping the "leave:"/"spend:" the sentence never carried', () => {
      const existing = [need('Approve the leave')]
      ;(existing[0] as any).key = 'leave-question-leave-55'
      const sentences = ["Kito's leave from Thursday 22 October to Monday 26 October is waiting for you to approve or decline."]
      const about = [{ kind: 'requests' as const, ids: ['leave:leave-55'] }]
      expect(outstandingNotAlreadyShown(existing, sentences, about)).toEqual([])
    })

    it('drops a summary sentence only once every id it carries already has a row', () => {
      const existing = [need('Approve the leave'), need('Approve the spend')]
      ;(existing[0] as any).key = 'leave-question-leave-1'
      ;(existing[1] as any).key = 'spend-question-spend-2'
      const sentences = ['Two requests are waiting for you to approve or decline.']
      const incomplete = [{ kind: 'requests' as const, ids: ['leave:leave-1', 'spend:spend-2', 'leave:leave-3'] }]
      expect(outstandingNotAlreadyShown(existing, sentences, incomplete)).toEqual(sentences)
      const complete = [{ kind: 'requests' as const, ids: ['leave:leave-1', 'spend:spend-2'] }]
      expect(outstandingNotAlreadyShown(existing, sentences, complete)).toEqual([])
    })

    it('a "quiet" entry is matched by the check-in itself, not by any id', () => {
      const existing = [need('Nudge the quiet check-in')]
      existing[0].groundId = 'g-quiet'
      const sentences = ['Nobody has said anything in "Night rota" for two weeks.']
      const about = [{ kind: 'quiet' as const, ids: [], groundId: 'g-quiet' }]
      expect(outstandingNotAlreadyShown(existing, sentences, about)).toEqual([])
      expect(outstandingNotAlreadyShown([], sentences, about)).toEqual(sentences)
    })

    it('falls back to the wording check for a row an older server sends no entry for', () => {
      const existing = [need('Decide whether a price range counts as a budget', 'Brian and Miriam both raised it.')]
      const sentences = [
        'Decide whether a price range counts as a budget',
        'Kofi is waiting on you for the pricing for Q4 since Thursday 8 October.',
      ]
      const about = [undefined, undefined]
      expect(outstandingNotAlreadyShown(existing, sentences, about)).toEqual([sentences[1]])
    })
  })
})
