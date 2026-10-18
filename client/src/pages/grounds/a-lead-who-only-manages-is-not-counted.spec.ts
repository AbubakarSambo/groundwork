import { describe, it, expect } from 'vitest'
import { howARowReads } from './how-a-row-reads'

/** check-ins.txt: "Sales team, Q3 / 6 people. Daily, weekdays." - six reps, and Wairimu, who only manages, is not counted (screen match, 16 October). */
describe('the people on a check-in’s row', () => {
  it('counts the people who check in, not a lead who only manages', () => {
    const people = ['a', 'b', 'c', 'd', 'e', 'f'].map((k) => ({ id: `p-${k}`, userId: `u-${k}`, partyType: 'PARTICIPANT', managingOnly: false }))
    const row = howARowReads({
      id: 'g', label: 'Sales team, Q3', initiatorId: 'u-lead', cadence: 'DAILY', workingDays: [1, 2, 3, 4, 5],
      participants: [{ id: 'p-lead', userId: 'u-lead', partyType: 'INITIATOR', managingOnly: true }, ...people],
    } as any, 'u-lead')
    expect(row.about.startsWith('6 people. Daily, weekdays.')).toBe(true)
  })
})
