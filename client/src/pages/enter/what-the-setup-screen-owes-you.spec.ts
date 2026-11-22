import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * FOUR THINGS THE SETUP SCREEN DID TO SOMEBODY IN ONE SITTING.
 *
 * Read in a browser, as the lead, setting up goals for tea shops in Kano.
 */
const PAGE = readFileSync(join(__dirname, 'EntryChatPage.tsx'), 'utf8')

describe('what the setup screen owes you', () => {
  it('says which situation it chose, because it chooses one', () => {
    /* It classified her description, changed the plan to six sessions, put "Pick a different
       situation" on screen, and never said which situation it had picked. */
    /* U.6 review: said in start-chat.txt's words now, "This sounds like", with "It’s something else". */
    /* Changed in F5 (stage 2): said on a card under the first reply. Changed 3 November evening: said in the summary instead, the kind
       and its meaning, with It’s something else (Hafsah: no cards in the conversation). */
    const SUMMARY = readFileSync(join(__dirname, 'FillsInAsYouTalk.tsx'), 'utf8')
    expect(SUMMARY).toContain('{IT_IS_SOMETHING_ELSE}')
    /* 22 November 2026: the kind is read one way everywhere (theKind), the panel and the save alike. */
    expect(PAGE).toContain('meaning={isAnchorDraft() ? null : theKindOfCheckIn(theKind(), onboardingSelections.brief)?.meaning ?? null}')
    expect(PAGE).toContain('scenario: theKind(),')
  })

  it('does not say nobody is named while it is showing their names', () => {
    /* "People: Sahar, Amina" with "Not said yet: who is in it, by name" three lines below it. */
    expect(PAGE).toContain('if (needsPeople && !people.length)')
  })

  it('offers a date for the invites rather than a day nobody set', () => {
    /* "As soon as I save" or "On the day it starts", with no start date set by default, is a
       choice between now and now. U.6: the choice is the prototype's "Now", "Tomorrow" or "On a
       date" in TheSetup, and the old wording moved out of this page with it, so this reads there. */
    const SETUP = readFileSync(join(__dirname, 'TheSetup.tsx'), 'utf8')
    expect(SETUP).toContain("onADate: 'On a date'")
    expect(PAGE).not.toContain('On the day it starts')
    expect(SETUP).toContain('Adding someone sends their invitation when it starts.')
  })

  it('keeps the plan when the check-in starts', () => {
    /* saveSession writes the record rather than merging, so a persist that left these out erased
       the number of sessions somebody had just agreed to. */
    const at = PAGE.indexOf('function persistCheckin')
    const body = PAGE.slice(at, at + 400)
    for (const field of ['sessions', 'cadence', 'cadenceChosen', 'groundName', 'plannedFrom']) {
      expect({ field, kept: body.includes(field) }).toEqual({ field, kept: true })
    }
  })
})

describe('why now is a reason, not the same fact twice', () => {
  it('the card drops a why that is mostly the words already in about', () => {
    /* About: "Setting goals for 40 shops in Kano stocking tea by end of Q4."
       Why now: "setting goals for the next quarter." Two rows, one fact. */
    expect(PAGE).toContain('aReasonRatherThanAnEcho')
    expect(PAGE).toMatch(/mine\.filter\(\(w\) => theirs\.has\(w\)\)\.length \/ mine\.length < 0\.4/)
  })
})
