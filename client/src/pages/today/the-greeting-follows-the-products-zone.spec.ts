import { describe, it, expect } from 'vitest'
import { partOfTheDay } from './when-it-comes'

describe('the greeting on Today', () => {
  it('says Morning at 10:00 in Lagos, whatever zone the browser is in', () => {
    expect(partOfTheDay(new Date('2026-11-16T10:00:00+01:00'))).toBe('Morning')
    expect(partOfTheDay(new Date('2026-11-16T14:00:00+01:00'))).toBe('Afternoon')
    expect(partOfTheDay(new Date('2026-11-16T19:00:00+01:00'))).toBe('Evening')
  })
})
