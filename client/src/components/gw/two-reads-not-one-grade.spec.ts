import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * SPECIFICITY AND CONFIDENCE ARE TWO DIFFERENT READS, AND MY RECORD SHOWED THEM AS ONE SHAPE.
 *
 * Her distinction: "Confidence is about the history and the read possible, and specificity is
 * about how well you have given information in each session."
 *
 * The page had them as two matching cards - a row of coloured bars each, no dates, no scale - so
 * neither said which session it was about or what it was a read OF. And it had TWO lists of the
 * same sessions a few inches apart: one with dates and status, one with dates and a way into each
 * session's report. "My record page seems to be doing too much."
 *
 * So: specificity is per session and sits on the session, in words. Confidence stays as one read
 * across the history and says so. The sessions list is one list, the one you can act from.
 */
const read = (...p: string[]) => readFileSync(join(__dirname, ...p), 'utf8')
const RECORD = read('MyRecord.tsx')
const PRIVATE = read('MyPrivateReport.tsx')

describe('my record', () => {
  it('lists the sessions once, not twice', () => {
    expect(RECORD).not.toContain('<Sec title="Sessions on record" />')
    expect(PRIVATE).toContain('Your session reports')
  })

  it('puts how checkable a session was on that session', () => {
    expect(PRIVATE).toContain('specificityBySession')
    expect(PRIVATE).toContain('specific enough to check')
    expect(PRIVATE).toContain('little in it that can be checked')
  })

  it('says nothing rather than guessing for a session that has not been read', () => {
    expect(PRIVATE).toMatch(/if \(score == null\) return ''/)
  })

  it('and drops the bars, which were a mark out of a scale nobody could see', () => {
    expect(RECORD).not.toContain('Specificity across sessions')
    expect(RECORD).not.toMatch(/specificity\.scores\.map/)
  })

  it('keeps the part that IS about the run, and the part somebody can act on', () => {
    expect(RECORD).toContain('How your answers are going')
    expect(RECORD).toContain('across the sessions so far')
    expect(RECORD).toContain('What would make the next one land harder')
  })

  it('and confidence says which of the two reads it is', () => {
    expect(RECORD).toContain('What your record can support')
    expect(RECORD).toContain('the whole history, not this session')
  })
})
