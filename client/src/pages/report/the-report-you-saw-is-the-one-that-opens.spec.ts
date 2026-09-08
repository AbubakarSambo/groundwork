import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * "I WANT THE EXACT SAME FORMING REPORT TO BE OPENABLE OR SEEN."
 *
 * Two separate reasons it was not. The report object was overwritten on the server (guarded in
 * `the-report-you-read-is-kept.spec.ts`), and the SCREEN that renders it existed once, written
 * into the entry chat page - so even holding the data, nothing else could draw it. Clicking a
 * finished session went to `/checkin/:id`, which is the transcript with a shorter, different
 * summary underneath: "it sends me back to the chat and the report looks nothing like what I got
 * at the end."
 *
 * So: one component, two callers, and the session links point at the report rather than the chat.
 */
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
const read = (...p: string[]) => strip(readFileSync(join(__dirname, ...p), 'utf8'))

const PAGE = read('SessionReportPage.tsx')
const ENTRY = read('..', 'enter', 'EntryChatPage.tsx')
const PARTY = read('..', '..', 'components', 'gw', 'SharedReportForAParty.tsx')
const CHAT = read('..', 'chat', 'ChatPage.tsx')

describe('the report that opens is the report they read', () => {
  it('is one component, and the end of the entry session draws it', () => {
    expect(ENTRY).toContain('<TheReportYouSawAtTheEnd')
  })

  it('and the page that opens one later draws the same component', () => {
    expect(PAGE).toContain('<TheReportYouSawAtTheEnd')
  })

  it('falls back to the card a signed-in session actually ended on, rather than an apology', () => {
    /* Only the entry flow builds the full report. A session run inside the app ends on
       SessionReportCard, so that is what "the report you saw" means for that person. */
    expect(PAGE).toContain('<SessionReportCard')
  })

  it('can be corrected from the page that shows it', () => {
    expect(PAGE).toContain('startSelfCorrection')
  })

  it('is where a finished session links, from every list of sessions', () => {
    /*
     * THE LIST HAS MOVED TWICE AND THE PROMISE HAS NOT MOVED AT ALL.
     *
     * It was on the Report tab and on My record, byte-for-byte the same rows. I removed one copy,
     * and removed the wrong one: "your sessions on the report page should go to reports." A
     * session's report is a report. My record links across to it rather than holding a second copy.
     *
     * What this file protects is that a finished session opens the REPORT and not the transcript.
     * That holds for every list there is, which is the assertion - the count and the location never
     * were.
     */
    const LIST = read('..', '..', 'components', 'gw', 'TheReportIsAListOfSessions.tsx')
    const MINE = read('..', '..', 'components', 'gw', 'WhatYouAreCarryingForward.tsx')
    expect(LIST).toContain('/report`)')
    expect(PARTY).toContain('/report`)')
    for (const src of [PARTY, LIST, MINE]) {
      expect(src).not.toMatch(/navigate\(`\/checkin\/\$\{(ci|r)\.id\}`\)/)
    }
  })

  it('and My record does not keep a second copy of it', () => {
    /* The duplicate came back once already by being convenient. Two identical lists two tabs apart,
       with nothing on either screen saying they are the same, is what "the participant seems to be
       looking at too many reports" partly was. */
    /* And no line pointing at it either: the Report tab is in the tab bar, and a page that ends by
       naming its neighbours has run out of things to say about itself. */
    const MINE = read('..', '..', 'components', 'gw', 'MyRecord.tsx')
    expect(MINE).not.toMatch(/mySessions\.map\(/)
    expect(MINE).not.toContain('are on Report')
  })

  it('and the end of a signed-in session offers it directly', () => {
    expect(CHAT).toContain('/report`)')
    expect(CHAT).toContain('Open my report')
  })
})
