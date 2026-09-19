import { describe, it, expect } from 'vitest'
import { aFreeRunLine, worthAsking } from './what-is-waiting-for-this-address'

describe('what is waiting for this address', () => {
  it('says how long and on what, and when it starts', () => {
    expect(aFreeRunLine(3, 'GROWTH')).toBe('Your first 3 months are on us, on the growth plan. It starts when you open your link.')
  })

  it('and reads right for one month', () => {
    expect(aFreeRunLine(1, 'SMALL_TEAM')).toContain('Your first month is on us')
  })

  /* Nothing waiting is the ordinary case, and it must say nothing at all rather than "0 months". */
  it('says nothing when there is nothing', () => {
    expect(aFreeRunLine(0, null)).toBeNull()
  })

  it('and only asks once the address looks like one', () => {
    expect(worthAsking('sam@work.com')).toBe(true)
    expect(worthAsking('sam@')).toBe(false)
    expect(worthAsking('')).toBe(false)
  })
})
