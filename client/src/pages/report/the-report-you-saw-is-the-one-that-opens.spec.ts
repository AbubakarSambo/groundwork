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
const ADMIN = read('..', 'grounds', 'GroundAdminPage.tsx')
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

  it('is where a finished session links, on both report views', () => {
    expect(PARTY).toContain('/report`)')
    expect(ADMIN).toContain('${ci.id}/report`)')
    for (const src of [PARTY, ADMIN]) {
      expect(src).not.toMatch(/navigate\(`\/checkin\/\$\{ci\.id\}`\)/)
    }
  })

  it('and the end of a signed-in session offers it directly', () => {
    expect(CHAT).toContain('/report`)')
    expect(CHAT).toContain('Open my report')
  })
})
