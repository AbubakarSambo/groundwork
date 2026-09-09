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
    expect(whatToCallIt('thin', false).note).toMatch(/Another session/)
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

describe('and the card no longer decides this itself', () => {
  const SRC = fs
    .readFileSync(path.join(__dirname, 'SessionReportCard.tsx'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/^\s*\/\/.*$/gm, '')

  it('has no inline coverage ternary ending in Mixed', () => {
    expect(SRC).not.toMatch(/coverage === 'moderate' \? 'Emerging' : 'Mixed'/)
  })

  it('both views ask the same function', () => {
    expect((SRC.match(/whatToCallIt\(engagement\?\.coverage, closed\)/g) ?? []).length).toBe(2)
  })

  it('and a thin record shows neither a count of agreements nor the alignment ladder', () => {
    /* "1 agreed" reads as a finding drawn from a conversation; here it is one sentence somebody
       typed. And the ladder places the round on a scale from unresolved to aligned, which this
       round is not on yet. */
    /*
     * AND THEN THE LADDER WENT ENTIRELY, WHICH IS THIS RULE CARRIED THE REST OF THE WAY.
     *
     * It was hidden under a thin record because a round with one sentence in it is not on a scale
     * from unresolved to aligned. Neither is a round with ten - where it lands depends on whether
     * somebody else has answered, so it was never progress the reader could make. It is the last of
     * the marks-on-an-invisible-scale that came off My record, and it was the worst of them: a
     * five-rung ladder with a person standing on the second rung, on their own session's report.
     *
     * The word survives. "Emerging" is one word from the synthesis's own enum and it is still shown.
     */
    const at = SRC.indexOf('called.note ?')
    expect(at).toBeGreaterThan(-1)
    expect(SRC.slice(at, at + 900)).toContain('called.note')
    expect(SRC).not.toContain('<AlignmentLadder')
    expect(SRC).not.toContain('LADDER_INDEX')
  })
})
