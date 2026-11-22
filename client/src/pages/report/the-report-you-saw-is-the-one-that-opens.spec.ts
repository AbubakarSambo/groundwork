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

/* Batch 2, group 5: the report page and the whole-report page are gone. A person's own report is drawn in My work (Hafsah, 4
   November, item 55), so the rules below are read where it lives now. The shared half is the session's own page (RoundReportPage). */
const PAGE = read('..', 'grounds', 'MyWorkPage.tsx')
const ENTRY = read('..', 'enter', 'EntryChatPage.tsx')
const PARTY = read('..', '..', 'components', 'gw', 'SharedReportForAParty.tsx')
const CHAT = read('..', 'chat', 'ChatPage.tsx')

describe('the report that opens is the report they read', () => {
  /* Changed 22 November 2026: setup no longer draws a report (Hafsah: never inside setup); the first report is the server's, read on
     the check-in with the same component. */
  it('is one component, and setup no longer draws a copy of its own', () => {
    expect(ENTRY).not.toContain('<TheReportYouSawAtTheEnd')
  })

  it('and the page that opens one later draws the same component, where one was stored', () => {
    /*
     * TWO COMPONENTS, AND THE CONDITION IS WHICH DOOR THE SITTING CAME THROUGH.
     *
     * Only the entry chat stores a report, and that object IS what the person read. So when there
     * is one, the page draws it in the shape they read it - this rule outranks the template,
     * because re-rendering it in a new shape is a different page about the same facts, which is the
     * complaint this file exists for.
     *
     * When there is none - the other 485 of 495 sittings - there is no exact thing to be faithful
     * to, only rows, and those are drawn in the rebuilt template. That is surface 02 finally
     * matching what the other eight were built against.
     *
     * They cannot be one component: the entry chat's report is made BEFORE the check-in is
     * committed, so there is no ground and no sitting to fetch. Two moments, not two opinions.
     */
    expect(PAGE).toContain('<TheReportYouSawAtTheEnd')
    expect(PAGE).toContain('<TheCheckInYouJustFinished')
    expect(PAGE).toMatch(/session\??\.report\s*\n?\s*\?/)
  })

  it('draws your own report and never a second shared one beside it', () => {
    /* Changed in batch 2: the whole-report page put the shared report under your own, the layers Hafsah asked to remove. */
    expect(PAGE).not.toContain('<SessionReportCard')
    expect(PAGE).not.toContain('<TheSessionsReport')
    expect(PAGE).toContain('heading="Your report"')
  })

  it('can be corrected from the page that shows it', () => {
    expect(read('..', '..', 'components', 'gw', 'TheCheckInYouJustFinished.tsx')).toContain('startSelfCorrection')
    expect(PAGE).toContain('<InferenceReviewPanel')
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
    expect(PARTY).toContain('whereYourReportLives(')
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

  it('and the end of a signed-in session says where it is, in Groundwork’s last line in the chat, rather than opening a page or a pop-up', () => {
    /* Changed in batch 2 (item 54): "Open my report" was a button on the end page; the end is now "Done. Your report is in My work." */
    expect(CHAT).toContain('Your report is ready in')
    expect(CHAT).not.toContain('DoneYourReportIsInMyWork')
    expect(CHAT).not.toContain('Open my report')
  })
})
