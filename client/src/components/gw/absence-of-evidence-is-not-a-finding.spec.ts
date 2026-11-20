/**
 * The report card picked its status word from `engagement.coverage`, and anything that was not
 * strong or moderate — which means THIN — rendered as "Mixed".
 *
 * "Mixed" is a statement about the CONTENT: these accounts do not agree. A thin record is a
 * statement about the EVIDENCE: barely anybody said anything. Rendering the second as the first
 * converts an absence into a finding, which is the one thing a record like this must never do —
 * somebody reads "Mixed" and concludes their team disagrees, when two people wrote a sentence each.
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { whatToCallIt } from './absence-of-evidence-is-not-a-finding'

describe('absence of evidence is not a finding', () => {
  it('never calls a thin record Mixed', () => {
    expect(whatToCallIt('thin', false).status).not.toBe('Mixed')
    expect(whatToCallIt(undefined, false).status).not.toBe('Mixed')
  })

  it('says what is true instead: there is too little to say', () => {
    const out = whatToCallIt('thin', false)
    expect(out.status).toBe('Too little to say')
    expect(out.aboutTheEvidence).toBe(true)
  })

  it('and tells the reader it is not a disagreement', () => {
    /* The whole point. Without this sentence the new word is just a different puzzle. */
    expect(whatToCallIt('thin', false).note).toMatch(/not a finding that people disagree/)
    expect(whatToCallIt('thin', false).note).toMatch(/Another check-in/)
  })

  it('leaves a real reading alone', () => {
    expect(whatToCallIt('strong', false)).toEqual({ status: 'Clear', aboutTheEvidence: false })
    expect(whatToCallIt('moderate', false)).toEqual({ status: 'Emerging', aboutTheEvidence: false })
  })

  it('and a closed round is a decision that outranks the measure', () => {
    for (const c of ['strong', 'moderate', 'thin', undefined] as const) {
      expect(whatToCallIt(c, true).status).toBe('Aligned')
      expect(whatToCallIt(c, true).aboutTheEvidence).toBe(false)
    }
  })

  it('marks only the evidence case, so a caller can render it differently', () => {
    expect(whatToCallIt('strong', false).aboutTheEvidence).toBe(false)
    expect(whatToCallIt('thin', false).aboutTheEvidence).toBe(true)
  })
})

/**
 * AND NO SIGNED-IN SURFACE SHOWS THE WORD AT ALL NOW, WHICH IS THIS RULE'S LAST STEP.
 *
 * The history, in three moves. A thin sitting rendered as "Mixed" - a word about whether people
 * agree - when barely anything had been said, so `whatToCallIt` was written to refuse a status the
 * evidence could not carry. Then the five-rung ladder went, because where somebody lands on it
 * depends on whether a colleague has answered, so it was never progress they could make. Now the
 * card itself is A - what one person said this time - and a status is a statement about the SHARED
 * picture, which is a different report on a different surface.
 *
 * SO NOTHING CALLS `whatToCallIt`, AND THE FILE STAYS. The word still reaches somebody at the end
 * of the entry chat, on a surface that is deliberately frozen: the first thing a stranger ever
 * sees is not where to take a risk. The day that surface is rebuilt, the rule is here, with the
 * corpus finding behind it, rather than having to be learned again from a support thread.
 */
describe('nothing on a signed-in close renders a status word', () => {
  const CARD = fs
    .readFileSync(path.join(__dirname, 'TheCheckInYouJustFinished.tsx'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/^\s*\/\/.*$/gm, '')

  it('has no ladder, no status heading and no coverage ternary', () => {
    expect(CARD).not.toContain('<AlignmentLadder')
    expect(CARD).not.toContain('LADDER_INDEX')
    expect(CARD).not.toMatch(/Alignment status/i)
    expect(CARD).not.toMatch(/coverage === 'moderate' \? 'Emerging' : 'Mixed'/)
  })

  it('and asks the rule for nothing, because it shows nothing the rule governs', () => {
    expect(CARD).not.toContain('whatToCallIt(')
  })
})
