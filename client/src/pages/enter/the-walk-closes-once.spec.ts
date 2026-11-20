import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fallbackGroundName, effectiveFallbackGroundName } from './EntryChatPage'

/* The setup chat closes once (night quality run 1): the card that asked "This session has reached a natural close..." under a reply
   that had already said goodbye is gone with every other card (Hafsah, 3 November evening), so the goodbye check it needed and its
   three tests are deleted; End session is in the header and the reply's own words close it. */
describe('the setup chat closes once', () => {
  it('has no natural-close card left to ask a second time', () => {
    const src = readFileSync(join(__dirname, 'EntryChatPage.tsx'), 'utf8')
    expect(src).not.toMatch(/>\s*This session has reached a natural close/)
  })
})

describe('the check-in gets a plain name from what Esther described', () => {
  const esther = 'I run a field sales team of four selling solar home kits across Nyanza. I want a weekly check-in so I can see who sold what, with proof, and what is getting in their way.'

  /* Changed 7 November 2026 (staging check S18): the name says what it is about, never how often ("Weekly" was read on a weekday check-in). */
  it('is "Sales updates", never "A check-in at Lakeshore Solar"', () => {
    expect(effectiveFallbackGroundName(undefined, [], esther, 'Lakeshore Solar')).toBe('Sales updates')
  })

  it('never carries her own sentence', () => {
    const name = fallbackGroundName(undefined, 'Lakeshore Solar', "Daniel isn't hitting his targets this week")
    expect(name).not.toContain('Daniel')
    expect(name).toBe('A check-in at Lakeshore Solar')
  })
})

/*
 * NIGHT QUALITY RUN 2, NAOMI'S WALK. The setup chat had settled on a new project, and her check-in stayed
 * "Get a new project off to a good start", the situation's own label, on every page: the name from what
 * she described was only tried after the label, so on the path the run took it was never reached.
 */
describe('the check-in gets a plain name from what Naomi described, on the path the run took', () => {
  const naomi = 'I run Ridge Bakery in Eldoret with seven staff: two bakers, three counter staff and two delivery riders. I want a weekly check-in to see what is going wrong with late orders and wasted bread, and who is carrying what.'

  it('is "Operations updates", never the situation label, with the situation known', () => {
    expect(effectiveFallbackGroundName('NEW_PROJECT', [], naomi, undefined)).toBe('Operations updates')
    expect(fallbackGroundName('NEW_PROJECT', undefined, naomi)).toBe('Operations updates')
  })

  it('the placeholder "A check-in at Ridge Bakery" goes once she describes it', () => {
    expect(effectiveFallbackGroundName(undefined, [], '', 'Ridge Bakery')).toBe('A check-in at Ridge Bakery')
    expect(effectiveFallbackGroundName(undefined, [], naomi, 'Ridge Bakery')).toBe('Operations updates')
  })
})
