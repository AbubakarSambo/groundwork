import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

/**
 * "IT DIDN'T POINT ME TO THE SETUP. IT ALSO DIDN'T TELL ME HOW I SHOULD SET MY SESSIONS CADENCE."
 *
 * Reported by a lead who had just finished their first session. The end screen offered the people
 * named in the conversation and stopped there - one question asked, and nothing else.
 *
 * Meanwhile the check-in was running fortnightly, which nobody had chosen. `Ground.cadence` cannot
 * be empty; it defaults to FORTNIGHTLY. A separate column, `cadenceStated`, has recorded the
 * difference between a chosen fortnightly and a defaulted one since it was added - and the ground
 * payload every screen reads did not carry it, so no screen could ask the question the column was
 * answering.
 *
 * The second half is the same shape. The board says the person running the check-in "has said what
 * success looks like in their own check-in... but has not set it as the standard, so nothing is
 * being read against it. They can state it on the Setup tab." The board knows. The screen where
 * somebody would act on it never said the word Setup.
 *
 * WHY THE END OF A SESSION. It is the only moment where somebody has just spent ten minutes on this
 * work and has not yet been handed a dashboard. Every other route to these two answers requires
 * already knowing that a Setup tab exists and that something on it is unset.
 */
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
const read = (...p: string[]) => strip(readFileSync(path.join(__dirname, ...p), 'utf8'))

const BLOCK = read('WhatThisCheckInStillNeeds.tsx')
const END = read('TheReportYouSawAtTheEnd.tsx')
const ENTRY = read('../../pages/enter/EntryChatPage.tsx')
const SESSION = read('../../pages/report/SessionReportPage.tsx')
const SERVICE = read('../../../../api/src/modules/grounds/grounds.service.ts')

describe('what the check-in still needs', () => {
  it('disappears entirely when nothing is missing', () => {
    /* A block that shows for everybody becomes furniture, and telling somebody who chose a weekly
       cadence that they have not chosen one is worse than saying nothing.
     *
     * THE RULE HELD AND THE QUESTION WAS TOO NARROW. Gated on the cadence alone, and the opening
     * conversation always picks one, so on any check-in born through the door this block never
     * rendered at all - including for the start date and the timeline, which it never asked about
     * and which are unset on every one of them. It counts what is missing now, and still vanishes
     * at zero, which was always the point. */
    expect(BLOCK).toContain('if (!missing) return null')
    expect(BLOCK).toContain('const missing = [cadenceUnset, standardUnset, startDateUnset && !alreadyStarted, timelineUnset, alreadyStarted && !!nextOpens]')
  })

  it('and asks about the start date and how long it runs, not only how often', () => {
    /* "Meeting cadence at the end of the report does not show up and does not have start dates." */
    expect(BLOCK).toContain('When does this start?')
    expect(BLOCK).toContain('How long does it run?')
    /* Both send you to the one control that already exists rather than growing a second one here. */
    expect(BLOCK).toContain('Set a start date on People and setup')
  })

  it('says the rhythm is a default rather than a decision', () => {
    expect(BLOCK).toContain('Nobody has set this, so it is every two weeks by default')
  })

  it('and gets the name of the People and setup tab onto a screen that never said it', () => {
    expect(BLOCK).toContain('Set it on People and setup')
  })

  it('and is a slot on the end screen, not markup inside it', () => {
    /* What is missing differs by caller and only the caller can answer it - the same reason
       renderAdd is a slot. On the entry path there is no Setup tab yet to link to. */
    expect(END).toContain('stillNeeded?: ReactNode')
    expect(END).toContain('{stillNeeded}')
  })
})

describe('and the flag it runs on', () => {
  it('reaches the client, which is what stopped this being asked', () => {
    expect(SERVICE).toContain('cadenceChosen: (ground as any).cadenceStated ?? false')
  })

  /* U.6 review: on the entry path the unchosen rhythm is now said once, in the setup (TheSetup's
     "Not set yet. This will run every 2 weeks unless you pick one."), rather than again in this
     block on the report. Same flag, one place. */
  it('is used on the entry path, where the page already tracked it and acted on nothing', () => {
    expect(ENTRY).toContain('cadenceChosen={cadenceChosen}')
    const SETUP = read('..', '..', 'pages', 'enter', 'TheSetup.tsx')
    expect(SETUP).toContain('{!p.cadenceChosen && ')
  })

  it('and on a check-in that already exists', () => {
    expect(SESSION).toContain("(ground as any).cadenceChosen === false")
  })

  it('offered only to whoever runs the check-in', () => {
    /* A party can change neither. Naming a setting somebody has no access to is worse than
       silence. */
    expect(SESSION).toContain('amTheInitiator')
    expect(SESSION).toMatch(/partyType === 'INITIATOR'/)
  })
})
