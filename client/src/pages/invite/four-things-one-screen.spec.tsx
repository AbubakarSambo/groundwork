import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * THE FIRST THING A PARTICIPANT EVER SEES. (G28, and G27's ordering rule)
 *
 * They get a link in an email from somebody who did not explain it, and decide in
 * about four seconds whether this is a thing that helps them or a thing being
 * done to them. Get that wrong and either they do not turn up, or they turn up
 * and write the defensive version - which is worse, because it looks like an
 * account and is not one.
 *
 * PURPOSE BEFORE PERFORMANCE is the ordering rule, and it is not decoration. Why
 * YOU comes before what it takes, which comes before what you get. Somebody who
 * understands why they matter writes a different check-in from somebody complying
 * with a request, and the order is the whole of the difference.
 *
 * Asserted against the source rather than a render, because what is being held is
 * the ORDER of three blocks and the absence of a fourth thing - neither of which
 * a DOM query distinguishes from any other page of text.
 */
const SRC = readFileSync(join(__dirname, 'InvitePage.tsx'), 'utf8')

describe('the three questions, in the order somebody has them', () => {
  it('says why you, first', () => {
    expect(SRC).toMatch(/<b>Why you\.<\/b>/)
  })

  it('then what it takes', () => {
    expect(SRC).toMatch(/<b>What it takes\.<\/b>/)
  })

  it('then what you get back', () => {
    expect(SRC).toMatch(/<b>What you get back\.<\/b>/)
  })

  it('and PURPOSE comes before EFFORT, which is the rule not the layout', () => {
    // THE REGRESSION. Lead with "ten minutes" and the whole thing reads as a
    // task to be got through. Lead with why they matter and it reads as being
    // asked for something only they have.
    const why = SRC.indexOf('<b>Why you.</b>')
    const takes = SRC.indexOf('<b>What it takes.</b>')
    const get = SRC.indexOf('<b>What you get back.</b>')
    expect(why).toBeGreaterThan(-1)
    expect(why).toBeLessThan(takes)
    expect(takes).toBeLessThan(get)
  })
})

describe('what it promises them', () => {
  it('the same report the person running it gets, at the same moment', () => {
    expect(SRC).toMatch(/at the same moment/)
  })

  it('and their own private note', () => {
    // The half that makes it worth their ten minutes rather than only worth the
    // lead's. It exists, it is theirs, and nobody else reads it.
    expect(SRC).toMatch(/private note meant only for you/)
  })

  it('without claiming the report is identical for everybody', () => {
    // The claim that was false on the marketing page for weeks. Names are
    // substituted at the read, so "the same report" is about timing and source,
    // not about every word matching.
    expect(SRC).not.toMatch(/exactly what .* sees/i)
    expect(SRC).not.toMatch(/identical/i)
  })
})

describe('and it still says the thing that was already right', () => {
  it('you are in this, not reporting on somebody else', () => {
    // Kept, and kept ABOVE the new block: an invitation to describe work
    // involving another person reads as being asked to give evidence about them
    // unless something says otherwise.
    expect(SRC).toMatch(/This is not a\s*\n?\s*form about somebody else/)
  })
})
