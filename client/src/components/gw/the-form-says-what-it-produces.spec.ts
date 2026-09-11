import { describe, it, expect } from 'vitest'
import { whenTheCheckInsLand, sayTheDate, whatIsSetAndWhatIsNot, theNextDayTheyWork, WEEKDAYS } from './when-the-check-ins-land'

// 13 Sep 2026 is a Sunday.
const sunday = () => new Date(2026, 8, 13)

describe('the form says what it produces', () => {
  it('starts a weekdays-only run on the Monday, not the Sunday', () => {
    const [first] = whenTheCheckInsLand({ cadence: 'DAILY', anchorDay: null, startsAt: sunday(), workingDays: WEEKDAYS })
    expect(sayTheDate(first)).toBe('Monday 14 Sep')
  })

  it('skips the weekend on a daily run', () => {
    const dates = whenTheCheckInsLand({ cadence: 'DAILY', anchorDay: null, startsAt: sunday(), workingDays: WEEKDAYS, howMany: 6 })
    expect(dates.map(sayTheDate)).toEqual([
      'Monday 14 Sep', 'Tuesday 15 Sep', 'Wednesday 16 Sep', 'Thursday 17 Sep', 'Friday 18 Sep', 'Monday 21 Sep',
    ])
  })

  it('lands on the weekend when nobody said otherwise', () => {
    const dates = whenTheCheckInsLand({ cadence: 'DAILY', anchorDay: null, startsAt: sunday(), workingDays: [], howMany: 3 })
    expect(dates.map(sayTheDate)).toEqual(['Sunday 13 Sep', 'Monday 14 Sep', 'Tuesday 15 Sep'])
  })

  it('holds a weekly anchor', () => {
    const dates = whenTheCheckInsLand({ cadence: 'WEEKLY', anchorDay: 1, startsAt: new Date(2026, 8, 14), workingDays: [], howMany: 3 })
    expect(dates.map(sayTheDate)).toEqual(['Monday 14 Sep', 'Monday 21 Sep', 'Monday 28 Sep'])
  })

  it('does not invent a series for a one-off or a triggered run', () => {
    expect(whenTheCheckInsLand({ cadence: 'ONE_TIME', anchorDay: null, startsAt: sunday(), workingDays: [] })).toHaveLength(1)
    expect(whenTheCheckInsLand({ cadence: 'SEQUENTIAL', anchorDay: null, startsAt: sunday(), workingDays: [] })).toHaveLength(1)
  })

  it('rolls forward and never back', () => {
    expect(theNextDayTheyWork(new Date(2026, 8, 19), WEEKDAYS).getDate()).toBe(21)
  })

  it('names what is not set without telling anybody off', () => {
    const s = whatIsSetAndWhatIsNot({ name: '', cadenceChosen: false, startsAt: null, workingDays: [], peopleAdded: 0 })
    expect(s).toContain('Still to set')
    expect(s).toContain('easier to change now than later')
    expect(s).not.toMatch(/must|required|you need to/i)
  })

  it('says plainly when everything is set', () => {
    const s = whatIsSetAndWhatIsNot({ name: 'Support response', cadenceChosen: true, startsAt: sunday(), workingDays: WEEKDAYS, peopleAdded: 3 })
    expect(s).toContain('3 people')
    expect(s).toContain('only open on the days you picked')
  })
})
