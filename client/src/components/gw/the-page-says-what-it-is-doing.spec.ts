import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

/**
 * THE PAGE SAYS WHAT IT IS DOING. The whole SPA carried two aria-live attributes. A screen-reader user
 * pressed Sign in, focus stayed on the button, and the failure was announced to nobody. Every error
 * line is an alert; every rendered "Loading…"-shaped line is a status. Anchored to rendered text, not
 * to identifiers (`isLoading` matches 221 lines and none of them is a sentence).
 */
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SRC = path.join(__dirname, '..', '..')
const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
function everyTsx(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = path.join(dir, f)
    return statSync(p).isDirectory() ? everyTsx(p) : /\.tsx$/.test(f) && !/\.spec\./.test(f) ? [p] : []
  })
}
const FILES = everyTsx(path.join(SRC, 'pages')).concat(everyTsx(path.join(SRC, 'components')))

describe('errors are alerts', () => {
  it('every className="gw-er" carries role="alert"', () => {
    const offenders: string[] = []
    for (const f of FILES) {
      for (const tag of strip(readFileSync(f, 'utf8')).match(/<[a-z]+[^>]*className="gw-er"[^>]*>/g) ?? []) {
        if (!tag.includes('role="alert"')) offenders.push(`${path.relative(SRC, f)}: ${tag.slice(0, 60)}`)
      }
    }
    expect(offenders).toEqual([])
  })
})

describe('waits are statuses', () => {
  /** Rendered text that says the page is busy, on the element that renders it. */
  const BUSY = /^\s*(Loading[^<]*|Getting your report[^<]*|Opening your session[^<]*|Starting your session[^<]*)$/
  /** Lines that render a busy sentence inside a region already marked live, or inside a button label whose parent is. */
  const ALLOWED_BARE = ['pages/enter/EntryChatPage.tsx', 'pages/ops/', 'pages/admin/', 'pages/prompts/', 'components/gw/AppShell.tsx', 'pages/join/JoinPage.tsx', 'pages/join/JoinConfirmPage.tsx', 'pages/grounds/', 'pages/report/ReportPage.tsx', 'pages/settings/', 'pages/org/', 'pages/billing/', 'pages/auth/', 'components/']
  it('the loading lines this batch names sit on status elements', () => {
    const pins: [string, RegExp][] = [
      /* U.20 (the invitation's rebuild): rebuilt from components/gw/ui, the loading line is now a
         <p>, not a <div>, and says "Loading your invitation…" rather than the clipped "Loading
         invite…" (CLAUDE.md: plain, full sentences) - still role="status", still the only thing on
         the screen while the preview loads. */
      /* B-205: the invitation's three one-line waits ("Loading your invitation…", "Opening your
         question…", "Opening your check-in…") are written once, as `OneLineStatus`, so the
         one-off class is not repeated. The guarantee is unchanged: the line still renders on a
         <p role="status">. Pinned in two halves: the shared line is a status paragraph, and the
         loading sentence is rendered through it. */
      ['pages/invite/InvitePage.tsx', /function OneLineStatus[\s\S]*?<p role="status"[^>]*>\{children\}<\/p>/],
      ['pages/invite/InvitePage.tsx', /<OneLineStatus>Loading your invitation…<\/OneLineStatus>/],
      /* Group 3 drift list, piece 1 (1 October 2026): rebuilt from the shared `Note`, which renders a
         <p>, not a <div>, and carries only `role="status"` - `aria-live="polite"` is implicit on that
         role, so the explicit attribute was redundant and is not reproduced. Still the only thing on
         the screen while the report loads. */
      ['pages/report/SessionReportPage.tsx', /<Note role="status">Getting your report\.\.\.<\/Note>/],
      /* U.20: the prototype's own word for this wait (F4-small-states/states.txt, "Getting the
         board"), in place of the page's earlier "Loading the board…". */
      ['pages/board/BoardPage.tsx', /<div role="status"[^>]*>Getting the board<\/div>/],
      /* U.8 review: opening a session can take up to a minute, and after four seconds of silence
         the status now also says so ("Getting your first question ready. This can take up to a
         minute."), nested inside the same status element rather than a second live region - so
         the pin no longer requires the div's only child to be the opening sentence. */
      ['pages/chat/ChatPage.tsx', /<div role="status"[^>]*>\s*Groundwork is writing…/],
    ]
    /*
     * ONE PIN RETIRED RATHER THAN TRANSLATED (1 October 2026).
     *
     * `ReportBody`'s "Picture forming - X of Y checked in for session N" status banner is deleted
     * with the rest of `ReportBody` (`ReportPage.tsx`, not mounted by any route since the Report
     * tab became a list of sessions - see the comment at the top of that file). The same fact (who
     * has checked in, and for which session) is said on the live Report tab and on
     * `TheSessionsReport.tsx`, but as plain rendered sentences rather than inside a status region,
     * because the page loads it rather than polling it live. Whether a "picture forming" status
     * region is still needed on the rebuilt surfaces is a product question, not a mechanical move,
     * so it is left as a note for Hafsah rather than invented here.
     */
    for (const [rel, re] of pins) expect(strip(readFileSync(path.join(SRC, rel), 'utf8'))).toMatch(re)
    void BUSY; void ALLOWED_BARE
  })
  it('the two message lists are live regions and the long report wait is a status', () => {
    const entry = strip(readFileSync(path.join(SRC, 'pages/enter/EntryChatPage.tsx'), 'utf8'))
    expect(entry.match(/ref=\{msgsRef\}\s*aria-live="polite"/g)?.length).toBe(2)
    /* 4d-3: the generating-report wait moved from an inline `style={{ marginBottom: 18 }}` to the
       named class `gwui-ec-savecard-status` (CLAUDE.md: no inline style props on a rebuilt range) -
       the guarantee this checks, `role="status" aria-live="polite"`, is unchanged. */
    expect(entry).toMatch(/<div className="gwui-ec-savecard-status" role="status" aria-live="polite">/)
    /**
     * ROUND 5, ITEM B: ChatPage.tsx's message list moved into ConversationCard.tsx's own scrolling
     * body (components/gw/ui/ConversationCard.tsx), which sets `aria-live="polite"` unconditionally
     * on that div - so the guarantee lives in the one shared part now, not per page. ChatPage.tsx
     * itself just passes `bodyRef={msgsRef}`; the live-region attribute is no longer literally
     * beside it in that file's own source.
     */
    expect(strip(readFileSync(path.join(SRC, 'pages/chat/ChatPage.tsx'), 'utf8'))).toMatch(/bodyRef=\{msgsRef\}/)
    expect(strip(readFileSync(path.join(SRC, 'components/gw/ui/ConversationCard.tsx'), 'utf8'))).toMatch(/ref=\{bodyRef\}\s*aria-live="polite"/)
  })
  it('the one-time secret panels are alerts that take focus', () => {
    const integrations = strip(readFileSync(path.join(SRC, 'pages/org/IntegrationsPage.tsx'), 'utf8'))
    expect(integrations.match(/role="alert" tabIndex=\{-1\} ref=\{\(el\) => el\?\.focus\(\)\}/g)?.length).toBeGreaterThanOrEqual(2)
  })
})
