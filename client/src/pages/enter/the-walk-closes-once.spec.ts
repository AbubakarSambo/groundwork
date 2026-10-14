import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { theReplyAlreadySaidGoodbye, fallbackGroundName, effectiveFallbackGroundName } from './EntryChatPage'

/**
 * NIGHT QUALITY RUN 1, THE LEAD'S WALK. Esther's setup chat ended "... You will send this to Collins,
 * Hassan, Jared, and Amina this Friday. Your report is ready now. Speak soon." and the card under it
 * then said "This session has reached a natural close. Would you like to end and see your report?"
 * The chat closed twice. Now the card says nothing more and only offers "End and see your report".
 */
describe('the setup chat closes once', () => {
  it("knows Esther's last reply already said goodbye", () => {
    expect(theReplyAlreadySaidGoodbye('You will send this to Collins, Hassan, Jared, and Amina this Friday. Your report is ready now. Speak soon.')).toBe(true)
  })

  it('and a reply that has not still gets the question', () => {
    expect(theReplyAlreadySaidGoodbye('You will send this to Collins, Hassan, Jared, and Amina this Friday.')).toBe(false)
  })

  it('the close question is only shown when the reply has not said goodbye', () => {
    const src = readFileSync(join(__dirname, 'EntryChatPage.tsx'), 'utf8').replace(/\s+/g, ' ')
    expect(src).toMatch(/\{!theReplyAlreadySaidGoodbye\([^)]*\)[^}]*\) && \( <Callout tone="info"> This session has reached a natural close\./)
    expect(src).toContain("'End and see your report' : 'End session'")
  })
})

describe('the check-in gets a plain name from what Esther described', () => {
  const esther = 'I run a field sales team of four selling solar home kits across Nyanza. I want a weekly check-in so I can see who sold what, with proof, and what is getting in their way.'

  it('is "Weekly sales check-in", never "A check-in at Lakeshore Solar"', () => {
    expect(effectiveFallbackGroundName(undefined, [], esther, 'Lakeshore Solar', undefined)).toBe('Weekly sales check-in')
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

  it('is "Weekly operations check-in", never the situation label, with the situation known', () => {
    expect(effectiveFallbackGroundName('NEW_PROJECT', [], naomi, undefined, undefined)).toBe('Weekly operations check-in')
    expect(fallbackGroundName('NEW_PROJECT', undefined, naomi)).toBe('Weekly operations check-in')
  })

  it('the placeholder "A check-in at Ridge Bakery" goes once she describes it', () => {
    expect(effectiveFallbackGroundName(undefined, [], '', 'Ridge Bakery', undefined)).toBe('A check-in at Ridge Bakery')
    expect(effectiveFallbackGroundName(undefined, [], naomi, 'Ridge Bakery', undefined)).toBe('Weekly operations check-in')
  })
})
