import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { theWordsForPickingASituation } from './whose-situation-is-it'

/**
 * Reported from the screen: "if someone else is setting up, the next step is confusing, not your
 * situation but the situation." Step 1 offers "Someone else sets the context" - they write what it
 * is about, they check in, they see the results - and step 2 then addressed the person clicking as
 * though the situation were theirs.
 *
 * The hundred-journey run never caught it because that harness drives the API and the entry chat.
 * Nothing in it opens the signed-in set-up wizard, so this whole branch was never walked.
 */
const mine = theWordsForPickingASituation(false)
const theirs = theWordsForPickingASituation(true)
const named = theWordsForPickingASituation(true, 'Ada')

describe('when the situation is the reader’s own', () => {
  it('keeps the second person, because it is true', () => {
    expect(mine.intro).toContain('the question you are actually asking')
    expect(mine.openGroupQuestion).toContain('on your behalf')
    expect(mine.describeOwnLabel).toBe('Describe your own situation')
  })
})

describe('when somebody else sets the context', () => {
  it('stops calling it your question', () => {
    expect(theirs.intro).not.toMatch(/question you are actually asking/)
    expect(theirs.intro).toContain('the question being asked')
  })

  it('stops calling it your own situation', () => {
    expect(theirs.describeOwnLabel).toBe('Describe the situation')
  })

  it('and stops saying the guessing would be on your behalf, because it would be on theirs', () => {
    expect(theirs.openGroupQuestion).not.toMatch(/on your behalf/)
    expect(theirs.openGroupQuestion).toMatch(/on their behalf/)
  })

  it('says who writes what it is about, since that is the thing being got wrong', () => {
    expect(theirs.intro).toMatch(/write what it is about/)
  })

  it('uses their name when we have one, and reads as English either way', () => {
    expect(named.intro).toContain('the situation Ada is in')
    expect(named.intro).toContain('Ada still writes what it is about')
    expect(theirs.intro).toContain('the situation they are in')
    expect(theirs.intro).toContain('They still write what it is about')
  })

  it('and never guesses a pronoun for somebody who has not given one', () => {
    /* A name is not a gender. "They" is the only honest third person here. */
    expect(named.intro + named.openGroupQuestion).not.toMatch(/\b(he|she|his|her|him)\b/i)
  })
})

describe('the page uses it', () => {
  const src = readFileSync(join(__dirname, 'CreateGroundPage.tsx'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\/|\{\/\*[\s\S]*?\*\/\}|\/\/[^\n]*/g, '')

  it('for the intro, the open group, and the one card that is about the reader', () => {
    expect(src).toMatch(/\{theWords\.intro\}/)
    expect(src).toMatch(/theWords\.openGroupQuestion/)
    expect(src).toMatch(/theWords\.describeOwnLabel/)
  })

  it('and leaves every named situation alone, because those are facts about the product', () => {
    expect(src).toMatch(/card\.scenario === 'OPEN_READ' \? theWords\.describeOwnLabel : card\.label/)
  })
})
