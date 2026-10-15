import { describe, it, expect } from 'vitest'
import { whoSeesThisDifferently } from './BoardPage'

/**
 * U.10 RE-REVIEW ITEM C: "You see this differently." under every difference, whoever was reading
 * it, said nothing about who the two sides actually were. The fix reads `positions[].who` exactly
 * as the server already resolved it (the one peers-are-named rule, `peers-are-named.ts`, applied by
 * `named()` in board.service.ts) - never re-deriving who may see whom - and writes the sentence.
 */
describe('whoSeesThisDifferently', () => {
  it('names both sides when the reader is neither of them', () => {
    expect(whoSeesThisDifferently(
      [{ who: 'Rukia Otieno' }, { who: 'Amani Wekesa' }], 'Wairimu Kamau',
    )).toBe('Rukia Otieno and Amani Wekesa see this differently.')
  })

  it('says "You", first, when the reader is one of the two sides', () => {
    expect(whoSeesThisDifferently(
      [{ who: 'Rukia Otieno' }, { who: 'Amani Wekesa' }], 'Amani Wekesa',
    )).toBe('You and Rukia Otieno see this differently.')
  })

  /*
   * HAFSAH'S ADDITION: IN AN EVALUATION CHECK-IN, COLLEAGUES ARE NEVER NAMED TO THE PERSON BEING
   * REVIEWED. The server's own simplification never disambiguates two different hidden people
   * beyond "A colleague" (board.service.ts), so the moment either side is masked - which is exactly
   * what happens on an evaluation check-in read by the person it is about - this falls back to the
   * generic sentence rather than risk naming the same "A colleague" for two different people.
   */
  it('says "People see this differently." when either side is not named (hidden peers, as on an evaluation check-in read by the person being reviewed)', () => {
    expect(whoSeesThisDifferently(
      [{ who: 'A colleague' }, { who: 'A colleague' }], null,
    )).toBe('People see this differently.')
    expect(whoSeesThisDifferently(
      [{ who: 'Daniel Kiptoo' }, { who: 'A colleague' }], 'Daniel Kiptoo',
    )).toBe('People see this differently.')
  })

  it('falls back plainly with fewer than two named sides', () => {
    expect(whoSeesThisDifferently([{ who: 'Rukia Otieno' }], null)).toBe('This is seen differently.')
    expect(whoSeesThisDifferently(undefined, null)).toBe('This is seen differently.')
    expect(whoSeesThisDifferently([], null)).toBe('This is seen differently.')
  })

  /* U.10 re-review: the server has already turned the reader's own side into "You". Read live as
     Amani: "Rukia Otieno and You see this differently." */
  it('treats the served "You" as the reader, first and in the right case', () => {
    expect(whoSeesThisDifferently([{ who: 'Rukia Otieno' }, { who: 'You' }], 'Amani Wekesa')).toBe('You and Rukia Otieno see this differently.')
    expect(whoSeesThisDifferently([{ who: 'You' }, { who: 'Rukia Otieno' }], null)).toBe('You and Rukia Otieno see this differently.')
  })
})
