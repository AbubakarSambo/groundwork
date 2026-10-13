import { describe, it, expect } from 'vitest'
import { theDayTheyNamed } from './the-day-they-named'

/** Walk fault 5: the lead typed "every Monday" and the check-in was saved for Sunday. */
describe('the day the lead named for the check-ins', () => {
  it('reads Monday from "every Monday", in her own words, as the picker numbers it', () => {
    expect(theDayTheyNamed(['Sales team, weekly. We check in every Monday.'])).toBe(1)
    expect(theDayTheyNamed(['On Fridays, please.'])).toBe(5)
    expect(theDayTheyNamed(['Weekly on Wednesday'])).toBe(3)
    expect(theDayTheyNamed(['every other Tuesday'])).toBe(2)
  })
  it('takes nothing from a day that is not a schedule, or from two different days', () => {
    expect(theDayTheyNamed(['I spoke to Brian on Monday about the orders.'])).toBeNull()
    expect(theDayTheyNamed(['every Monday', 'actually every Thursday'])).toBeNull()
  })
})
