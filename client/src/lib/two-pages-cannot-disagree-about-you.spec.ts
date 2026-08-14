import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { whichSessionAreWeOn, hasDoneThisSession } from './which-session-are-we-on'

/**
 * THE TWO PAGES SAID OPPOSITE THINGS ABOUT THE SAME PERSON.
 *
 * Found in a page-by-page audit, not by reading code: on one ground, at one moment, signed in as one
 * person, `/grounds/:id` showed "You - waiting, Pat - waiting" and `/grounds/:id/p` showed "You -
 * checked in, Pat Party - checked in". Both were reading the same completed check-ins.
 *
 * "Waiting" is the word for somebody who has not done a thing they could have done. The lead's page
 * was the one saying it, about a person who had written their account twice. On this product that is
 * not a cosmetic slip.
 */
const CASE = [
  { sessionNumber: 1, status: 'COMPLETED' },
  { sessionNumber: 2, status: 'COMPLETED' },
]

describe('the number they disagreed about', () => {
  it('with nothing open, it is the last session actually completed', () => {
    expect(whichSessionAreWeOn(null, [1, 2])).toBe(2)
  })

  it('an open check-in wins, because that is the session being answered now', () => {
    expect(whichSessionAreWeOn(3, [1, 2])).toBe(3)
  })

  it('and a fresh ground is on session one, not session zero', () => {
    expect(whichSessionAreWeOn(null, [])).toBe(1)
  })

  it('the total is never the answer - that is the plan, not the position', () => {
    /**
     * The exact old bug: the lead's page fell back to `plannedSessions` (6), filtered for a
     * completed check-in at `>= 6`, found none, and printed "waiting" about somebody who had
     * checked in twice. Nothing here can return 6 from this input.
     */
    expect(whichSessionAreWeOn(null, [1, 2])).not.toBe(6)
  })
})

describe('and therefore what both pages now say', () => {
  it('somebody with two completed sessions has done their part', () => {
    expect(hasDoneThisSession(CASE, whichSessionAreWeOn(null, [1, 2]))).toBe(true)
  })

  it('and once session 3 opens, they have not done that one yet', () => {
    expect(hasDoneThisSession(CASE, whichSessionAreWeOn(3, [1, 2]))).toBe(false)
  })

  it('being ahead is never reported as being behind', () => {
    expect(hasDoneThisSession([{ sessionNumber: 4, status: 'COMPLETED' }], 3)).toBe(true)
  })

  it('an abandoned check-in is not a completed one', () => {
    expect(hasDoneThisSession([{ sessionNumber: 3, status: 'IN_PROGRESS' }], 3)).toBe(false)
  })
})

describe('neither page keeps its own copy of the rule', () => {
  const read = (p: string) =>
    readFileSync(join(__dirname, '..', p), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '')

  for (const page of ['pages/grounds/GroundAdminPage.tsx', 'pages/grounds/GroundParticipantPage.tsx']) {
    it(`${page} asks the shared helper`, () => {
      const src = read(page)
      expect(src).toMatch(/whichSessionAreWeOn\(/)
      expect(src).toMatch(/hasDoneThisSession\(/)
      /**
       * The specific thing that must not come back. `plannedSessions` as the fallback for "which
       * session are we on" is what made a six-session ground read "waiting" forever.
       */
      expect(src).not.toMatch(/sessionNumber\s*\?\?\s*plannedSessions/)
    })
  }
})
