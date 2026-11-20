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
/* NAV_ITEMS moved out of AppShell.tsx into nav-items.tsx (group 1 rebuild), so a rebuilt page
   (MorePage.tsx) can read `navItemsFor` without pulling in the rest of AppShell's own rendering -
   see the-rebuilt-pages-use-only-the-new-parts.spec.ts. Behaviour is unchanged; only where the nav
   item list itself is written moved, so this reads it there now. */
const SHELL = readFileSync(join(__dirname, 'nav-items.tsx'), 'utf8')

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
    ['join/JoinConfirmPage.tsx', 'Starting your check-in…', 'what starts is their check-in'],
    ['enter/EntryChatPage.tsx', 'Starting your check-in…', 'same, on the entry flow'],
    ['grounds/GroundAdminPage.tsx', 'final check-in', 'the closing round is a final check-in'],
    ['grounds/GroundAdminPage.tsx', 'aria-label="Check-in cadence"', 'the cadence is of check-ins'],
    ['board/BoardPage.tsx', 'Check-ins this phase', 'counted from check-ins, says the src'],
    ['join/JoinPage.tsx', 'Join and start my check-in', 'the handler sends an email; the label said otherwise'],
  ])('%s no longer says "%s" - %s', (rel, gone) => {
    expect(read(rel)).not.toContain(gone)
  })
  it('and says the right thing instead', () => {
    /* Since U.8 the confirm panel is the prototype's end card (check-in-end-card.txt), and the one
       press that finishes says "That’s right, finish". */
    expect(read('chat/ChatPage.tsx')).toContain('<TheEndCard')
    expect(readFileSync(join(__dirname, 'checkin', 'TheEndCard.tsx'), 'utf8')).toContain('That’s right, finish')
    /*
     * RELEASE WALKTHROUGH A, FIX 4: "START A NEW CHECK-IN" IS GONE FROM THIS PAGE, NOT RENAMED.
     * This assertion used to pin the button's wording; the button itself opened `/grounds/new`, a
     * brand-new, unrelated check-in, which most readers of their own report (a participant, almost
     * always) have no way to start at all - and which neither of the prototype's own report screens
     * (own-report.txt, one-session.txt) offers at the foot of a report. It is removed, not reworded,
     * so there is no wording left here to pin.
     */
    expect(read('grounds/MyWorkPage.tsx')).not.toContain('Start a new check-in')
    expect(read('join/JoinPage.tsx')).toContain('Email me my link')
  })
})
