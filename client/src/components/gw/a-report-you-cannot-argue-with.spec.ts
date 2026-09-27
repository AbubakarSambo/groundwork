import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * "I ALSO SEE NOWHERE TO CORRECT THE REPORT."
 *
 * There was nowhere on this card, which is the one place a person actually reads it: immediately
 * after finishing a session, while what it got wrong is still fresh.
 *
 * THE MACHINERY ALREADY EXISTED AND WAS ON THE WRONG SCREENS. `startSelfCorrection` opens a fresh
 * session in correction mode against a prior one, and it was wired into the report PAGE and the
 * ground chat - both of which somebody reaches later, if at all. The entry chat has its own "what
 * did we get wrong?" for exactly this reason, and the signed-in path had nothing.
 *
 * A report you cannot argue with is a report you stop trusting, and this product's whole input is
 * people being candid with it.
 */
const CARD = readFileSync(join(__dirname, 'TheCheckInYouJustFinished.tsx'), 'utf8')
  /* A guard a comment satisfies is not a guard, and the note beside this control says all of it. */
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')

describe('a report you cannot argue with', () => {
  it('offers the correction where the report is read', () => {
    /* U.9: the prototype's words, "Something here isn’t right" (own-report.txt). */
    expect(CARD).toContain('Something here isn’t right')
    expect(CARD).toMatch(/reportsApi\.startSelfCorrection\(groundId, sessionNumber\)/)
  })

  it('through the same call the other two screens make, not a second way of correcting', () => {
    /* Two mechanisms for changing what is on somebody's record is one more than can be reasoned
       about, and the existing one already writes the change alongside the original. */
    expect(CARD).toMatch(/navigate\(`\/checkin\/\$\{res\.checkInId\}`\)/)
  })

  it('and says what pressing it does, since "correct" could mean overwrite', () => {
    expect(CARD).toMatch(/Nothing is overwritten/)
    expect(CARD).toMatch(/shown alongside the original/)
  })

  it('but never on a closed check-in', () => {
    /* The resolution record is the end of the argument. A control that exists to be refused is
       worse than no control. */
    expect(CARD).toMatch(/\{!closed && \(/)
  })
})
