import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'
import { wasItThere } from './TheFiveThingsThatMakeItCheckable'

/**
 * "I NEED SPECIFICITY TO SHOW SOMEHOW."
 *
 * It was showing as a five-segment bar and the word "moderate", three screens down. That is a mark
 * out of a scale nobody can see, and the previous version of exactly that was already removed once:
 * `specificity-belongs-to-the-person.spec.ts` killed "Overall quality label: low" as "a verdict on a
 * person's writing, handed to them with nothing to do about it".
 *
 * The engine never graded anybody. It reads five separate things off a session and stores them per
 * check-in as `specificityDimensions` - delivery, evidence, enablement, coverage, commitment - and
 * no screen had ever shown them. The itemised, honest read existed the whole time and the product
 * was averaging it into one word and printing the word.
 *
 * WHAT MAY NOT COME BACK, and both are guarded here because both have come back once already: a bar
 * out of five, and a grade word standing on its own.
 *
 * THE FACE IS ABOUT THE RECORD, NEVER THE PERSON. That is the line that makes one allowable at all.
 * "What your record can support" is a statement about an artefact and arrives with the five things
 * that would change it; a face on somebody's writing is the verdict that was removed, illustrated.
 */
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const read = (f: string) => readFileSync(path.join(__dirname, f), 'utf8')
const code = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

const SUPPORT = read('WhatYourRecordCanSupport.tsx')
const FIVE = read('TheFiveThingsThatMakeItCheckable.tsx')
const PARTY = read('../../pages/grounds/GroundParticipantPage.tsx')
const LEAD = read('../../pages/grounds/GroundAdminPage.tsx')

describe('the five things', () => {
  it('read the dimensions the engine already stores', () => {
    for (const dim of ['delivery', 'evidence', 'enablement', 'coverage', 'commitment']) {
      expect(FIVE).toContain(`key: '${dim}'`)
    }
  })

  it('and never print the engine\'s own words for them', () => {
    /* "enablement" and "coverage" are field names. What a person recognises is what they did or did
       not say, in the second person, which is what the labels are. */
    const shown = code(FIVE)
    expect(shown).toContain('You said what you needed from others')
    expect(shown).toContain('You covered the hard parts, not just what went well')
  })

  it('collapse four stored levels to met or not', () => {
    /* Nobody needs four grades of their own honesty; they need to know which one to fix. */
    expect(wasItThere('specific')).toBe(true)
    expect(wasItThere('directional')).toBe(true)
    expect(wasItThere('vague')).toBe(false)
    expect(wasItThere('managed')).toBe(false)
    expect(wasItThere(undefined)).toBe(false)
  })

  it('say what is missing rather than how badly', () => {
    expect(code(FIVE)).toContain('No dates, numbers or documents yet')
    expect(code(FIVE)).toContain('worth a sentence in your next session')
  })

  it('and show nothing at all before a session has been read', () => {
    /* Five empty rows would read as five failures. */
    expect(FIVE).toContain('if (!dimensions || Object.keys(dimensions).length === 0) return null')
  })
})

describe('what the record can support', () => {
  it('is a face on the record and a sentence, not a bar', () => {
    expect(code(SUPPORT)).toContain('What your record can support')
    expect(code(SUPPORT)).not.toMatch(/\[1,2,3,4,5\]\.map/)
  })

  it('says the direction without an arrow, naming what it compared against', () => {
    /* a-trajectory-is-not-a-score: "no score, no tier, no arrow". */
    expect(code(SUPPORT)).toContain('more checkable than session ${comparedWith}')
    expect(code(SUPPORT)).not.toMatch(/[↑↓]/)
  })

  it('and refuses a direction under three sessions', () => {
    /* Telling somebody their record is falling off two numbers is a verdict dressed as an
       observation - the server refuses to compute one, and this refuses to show one. */
    expect(SUPPORT).toContain('done.length >= 3')
  })

  it('counts the whole run, not the rows that happen to exist', () => {
    /* It read "Session 1 of 2" under a header saying "Session 2 of 4", because a check-in row only
       exists once a session has been opened. Two counters disagreeing about one run is worse than
       having neither. */
    expect(SUPPORT).toContain('Math.max(totalSessions ?? 0, sessions.length)')
    expect(SUPPORT).toContain('{done.length} of {dots.length} done')
  })

  it('and still says out loud that nobody else sees it', () => {
    expect(SUPPORT).toContain('Only you see this')
  })
})

describe('and both views of a check-in show the same two cards', () => {
  /* the-two-views-are-a-pair: what a tab contains may differ by role; a person being a lead on one
     check-in and a party on another must not have to relearn the page. */
  it('the party view', () => {
    expect(PARTY).toContain('<WhatYourRecordCanSupport')
    expect(PARTY).toContain('<TheFiveThingsThatMakeItCheckable')
  })

  it('and the view that runs the check-in', () => {
    expect(LEAD).toContain('<WhatYourRecordCanSupport')
    expect(LEAD).toContain('<TheFiveThingsThatMakeItCheckable')
  })
})
