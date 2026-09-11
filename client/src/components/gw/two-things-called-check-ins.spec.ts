import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * THE RAIL LISTED CHECK-INS AND THEN OFFERED A LINK CALLED CHECK-INS.
 *
 * "Admin has my check-ins and then where to check in." The top of the rail is a live list of the
 * check-ins somebody is in; the nav item below it said the same word and went to a page of the same
 * thing. The page is not redundant - it holds what the rail does not show - but the name was.
 */
const SHELL = readFileSync(join(__dirname, 'AppShell.tsx'), 'utf8')

describe('two things are not both called check-ins', () => {
  it('the nav item says which check-ins it means', () => {
    expect(SHELL).toContain("label: 'All check-ins'")
  })

  it('and still goes to the list page, which was never the problem', () => {
    const nav = SHELL.slice(SHELL.indexOf("label: 'All check-ins'"), SHELL.indexOf("label: 'All check-ins'") + 120)
    expect(nav).toContain("to: '/grounds'")
  })

  it('nothing else in the rail is called plain "Check-ins"', () => {
    expect(SHELL).not.toMatch(/label: 'Check-ins'/)
  })
})

/**
 * AND THE SESSION-SENSE STRINGS ARE GONE FROM THE SCREENS (fix plan C8). A check-in is the thing; a
 * session is what one person gives inside it. Each string below named a session and said check-in.
 */
describe('one word per object, on the screens', () => {
  const PAGES = join(__dirname, '..', '..', 'pages')
  const read = (rel: string) => readFileSync(join(PAGES, rel), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
  it.each([
    ['chat/ChatPage.tsx', 'Ready to finish this check-in', 'the confirm at the one irreversible moment named the whole engagement'],
    ['chat/ChatPage.tsx', 'Finish check-in ✓', 'same button, same object'],
    ['join/JoinConfirmPage.tsx', 'Starting your check-in…', 'what starts is their session'],
    ['enter/EntryChatPage.tsx', 'Starting your check-in…', 'same, on the entry flow'],
    ['grounds/GroundAdminPage.tsx', 'final check-in', 'the closing round is a final session'],
    ['grounds/GroundAdminPage.tsx', 'aria-label="Check-in cadence"', 'the cadence is of sessions'],
    ['board/BoardPage.tsx', 'Check-ins this phase', 'counted from sessions, says the src'],
    ['report/SessionReportPage.tsx', 'Open a follow-up check-in', 'it navigates to a brand-new check-in, so the label moved to the behaviour'],
    ['join/JoinPage.tsx', 'Join and start my check-in', 'the handler sends an email; the label said otherwise'],
  ])('%s no longer says "%s" - %s', (rel, gone) => {
    expect(read(rel)).not.toContain(gone)
  })
  it('and says the right thing instead', () => {
    expect(read('chat/ChatPage.tsx')).toContain('Ready to finish this session?')
    expect(read('report/SessionReportPage.tsx')).toContain('Start a new check-in')
    expect(read('join/JoinPage.tsx')).toContain('Email me my link')
  })
})
