import { describe, it, expect } from 'vitest'
import { theScheduleTheySaid } from './the-schedule-they-said'

/* Walked on 13 October: "Daily, weekdays only, until 30 December" reached the summary as "Any day"
   and an end in January. The summary is filled in from what the lead said, and only from that. */
const TODAY = new Date(2026, 9, 13)

describe('the schedule the lead said, in her own words', () => {
  it('reads weekdays only and the last day from the walked sentence', () => {
    expect(theScheduleTheySaid(['Esther and Kwesi. Daily, weekdays only, until 30 December. Call it Sales team, Q4.'], TODAY))
      .toEqual({ workingDays: [1, 2, 3, 4, 5], endsOn: '2026-12-30', cadence: 'DAILY', name: 'Sales team, Q4' })
  })

  it('reads the other ways people say no weekends', () => {
    for (const said of ['No weekends please', 'Monday to Friday', 'skip weekends', 'only on weekdays']) {
      expect({ said, days: theScheduleTheySaid([said], TODAY).workingDays }).toEqual({ said, days: [1, 2, 3, 4, 5] })
    }
  })

  it('takes nothing about the days when nobody said, or when they said weekends too', () => {
    expect(theScheduleTheySaid(['Every day, the team works Saturdays as well.'], TODAY).workingDays).toBeUndefined()
    expect(theScheduleTheySaid(['Weekdays and weekends'], TODAY).workingDays).toBeUndefined()
  })

  it('reads an end said either way round, and a date already past is next year', () => {
    expect(theScheduleTheySaid(['Run it until December 30th'], TODAY).endsOn).toBe('2026-12-30')
    expect(theScheduleTheySaid(['from 1 July to 30 September'], TODAY).endsOn).toBe('2027-09-30')
    expect(theScheduleTheySaid(['ending 31 March 2027'], TODAY).endsOn).toBe('2027-03-31')
  })

  it('two different ends are not one answer', () => {
    expect(theScheduleTheySaid(['until 30 November', 'actually until 15 December'], TODAY).endsOn).toBeUndefined()
  })

  it('reads "until I end it" as no end date', () => {
    expect(theScheduleTheySaid(['Weekly, and it runs until I end it.'], TODAY)).toEqual({ runsUntilEnded: true, cadence: 'WEEKLY' })
  })

  it('a date said in passing is not an end', () => {
    expect(theScheduleTheySaid(['We met on 30 December last year and talked to 3 shops.'], TODAY).endsOn).toBeUndefined()
  })
  /* Setup page review, 13 October: Tendai's sentence left the card at "0 of 4 set". */
  it('reads the rhythm, the name and "with no end" from what Tendai said', () => {
    expect(theScheduleTheySaid(['Weekly, on Thursdays, with no end. Call it New accounts.'], TODAY))
      .toEqual({ runsUntilEnded: true, cadence: 'WEEKLY', name: 'New accounts' })
    expect(theScheduleTheySaid(['every two weeks please'], TODAY).cadence).toBe('FORTNIGHTLY')
    expect(theScheduleTheySaid(['weekly at first', 'actually daily'], TODAY).cadence).toBe('DAILY')
    expect(theScheduleTheySaid(['We sell to a shop called Tamu.'], TODAY).name).toBeUndefined()
  })
})
