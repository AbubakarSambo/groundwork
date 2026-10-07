import { describe, it, expect } from 'vitest'
import { todayGreetingLine } from './the-greeting-line-does-not-claim-what-needs-you-does-not'

describe('todayGreetingLine: screen fault 4, final walk', () => {
  it('drops "You have not checked in yet." when nothing needs the reader', () => {
    expect(todayGreetingLine('You have not checked in yet.', 0)).toBeNull()
  })

  it('keeps the claim once there is at least one thing that needs the reader', () => {
    expect(todayGreetingLine('You have not checked in yet.', 1)).toBe('You have not checked in yet.')
  })

  it('leaves every other line untouched, with or without anything needing the reader', () => {
    expect(todayGreetingLine('In Sales team, Q3, 5 of 6 have checked in for session 38; Omar hasn’t yet.', 2)).toBe('In Sales team, Q3, 5 of 6 have checked in for session 38; Omar hasn’t yet.')
    expect(todayGreetingLine('Your check-in for Sales team, Q3 is open.', 0)).toBe('Your check-in for Sales team, Q3 is open.')
  })

  it('passes null and undefined straight through', () => {
    expect(todayGreetingLine(null, 0)).toBeNull()
    expect(todayGreetingLine(undefined, 0)).toBeNull()
  })

  it('strips the claim even when it sits alongside other true text, leaving the rest', () => {
    expect(todayGreetingLine('You have not checked in yet. Omar has.', 0)).toBe('Omar has.')
  })
})
