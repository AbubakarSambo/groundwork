/**
 * TWICE A WEEK, AS EACH PAGE SAYS IT (2 November 2026): the check-in's row, its label and the rhythm sentence all read
 * "Twice a week, on Monday and Thursday.", and the count of sessions is two a week. Once a week reads as before.
 */
import { describe, expect, it } from 'vitest'
import { cadenceLabel, timesAWeek } from './cadence'
import { howOften } from '@/pages/grounds/how-a-row-reads'
import { theRhythmInFull } from './the-closing-after-your-first-check-in'
import { plannedSessionsFor } from './sessionCount'

describe('a check-in that meets twice a week', () => {
  it('reads "Twice a week, on Monday and Thursday." on its row, its label and its rhythm', () => {
    expect(howOften({ cadence: 'WEEKLY', cadenceDays: [4, 1], cadenceAnchorDay: 1 } as any)).toBe('Twice a week, on Monday and Thursday.')
    expect(cadenceLabel('WEEKLY', [1, 4])).toBe('Twice a week, on Monday and Thursday')
    expect(theRhythmInFull({ cadence: 'WEEKLY', cadenceDays: [1, 4] })).toBe('Twice a week, on Monday and Thursday.')
  })

  it('holds two sessions a week', () => {
    expect(plannedSessionsFor(28, 'WEEKLY', null, [1, 4])).toBe(8)
  })

  it('once a week reads as before', () => {
    expect(timesAWeek('WEEKLY', [1])).toBeNull()
    expect(howOften({ cadence: 'WEEKLY', cadenceAnchorDay: 1 } as any)).toBe('Weekly, Mondays.')
    expect(cadenceLabel('WEEKLY')).toBe('Every week')
    expect(plannedSessionsFor(28, 'WEEKLY')).toBe(4)
  })
})
