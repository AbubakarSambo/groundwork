import { describe, it, expect } from 'vitest'
import { howManyHere } from './EveryoneHere'

/** Run 9: People read "5 people" above six rows, and "4 people, up to 1" after the pause. */
describe('the head count on People agrees with the rows below it', () => {
  /* "Account" is a banned word (page audit, 24 November, row 15): somebody invited who has not joined yet is said so. */
  it('names somebody invited who has not joined yet, who holds no seat', () => {
    expect(howManyHere(5, 'STARTER', 10, [], [], [], [], null, ['Ruth']))
      .toBe('5 people, on the Starter plan, which is for up to 10. Ruth is invited and hasn’t joined yet.')
    expect(howManyHere(5, 'STARTER', 10, [], [], [], [], null, ['Neema Kamau', 'Neema Wanjiru']))
      .toBe('5 people, on the Starter plan, which is for up to 10. Neema Kamau and Neema Wanjiru are invited and haven’t joined yet.')
  })
  it('says so when there are more people than the plan covers', () => {
    expect(howManyHere(4, null, 1)).toBe('4 people, with no plan chosen yet, which covers up to 1. That is more people than the plan covers.')
  })
  it('leaves the usual sentence alone', () => {
    expect(howManyHere(3, null, 5)).toBe('3 people, with no plan chosen yet, which covers up to 5.')
  })
})
