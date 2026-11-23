import { describe, it, expect } from 'vitest'
import { howManyHere } from './EveryoneHere'

/** Run 9: People read "5 people" above six rows, and "4 people, up to 1" after the pause. */
describe('the head count on People agrees with the rows below it', () => {
  /* Reworded (page audit, 24 November 2026, row 15): "with no account yet" said a word People never uses; it says whether they joined. */
  it('names somebody invited who has not joined yet, who holds no seat', () => {
    expect(howManyHere(5, 'STARTER', 10, [], [], [], [], null, ['Ruth']))
      .toBe('5 people, on the Starter plan, which is for up to 10. Ruth is invited and hasn’t joined yet.')
    expect(howManyHere(6, 'STARTER', 10, [], [], [], [], null, ['Neema', 'Zuri']))
      .toBe('6 people, on the Starter plan, which is for up to 10. Neema and Zuri are invited and haven’t joined yet.')
  })
  it('says so when there are more people than the plan covers', () => {
    expect(howManyHere(4, null, 1)).toBe('4 people, on the free plan, which is for up to 1. That is more people than the plan covers.')
  })
  it('leaves the usual sentence alone', () => {
    expect(howManyHere(3, null, 5)).toBe('3 people, on the free plan, which is for up to 5.')
  })
})
