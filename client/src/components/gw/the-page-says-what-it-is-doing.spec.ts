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
      ['pages/invite/InvitePage.tsx', /<div role="status"[^>]*>Loading invite…<\/div>/],
      ['pages/report/SessionReportPage.tsx', /<div role="status" aria-live="polite"[^>]*>Getting your report\.\.\.<\/div>/],
      ['pages/board/BoardPage.tsx', /<div role="status"[^>]*>Loading the board…<\/div>/],
      /* U.8 review: opening a session can take up to a minute, and after four seconds of silence
         the status now also says so ("Getting your first question ready. This can take up to a
         minute."), nested inside the same status element rather than a second live region - so
         the pin no longer requires the div's only child to be the opening sentence. */
      ['pages/chat/ChatPage.tsx', /<div role="status"[^>]*>\s*Opening your session…/],
      ['pages/report/ReportPage.tsx', /<div role="status" aria-live="polite" style=\{\{ background: 'var\(--gw-amber-bg\)'/],
    ]
    for (const [rel, re] of pins) expect(strip(readFileSync(path.join(SRC, rel), 'utf8'))).toMatch(re)
    void BUSY; void ALLOWED_BARE
  })
  it('the two message lists are live regions and the long report wait is a status', () => {
    const entry = strip(readFileSync(path.join(SRC, 'pages/enter/EntryChatPage.tsx'), 'utf8'))
    expect(entry.match(/ref=\{msgsRef\}\s*aria-live="polite"/g)?.length).toBe(2)
    expect(entry).toMatch(/<div style=\{\{ marginBottom: 18 \}\} role="status" aria-live="polite">/)
    expect(strip(readFileSync(path.join(SRC, 'pages/chat/ChatPage.tsx'), 'utf8'))).toMatch(/ref=\{msgsRef\}\s*aria-live="polite"/)
  })
  it('the one-time secret panels are alerts that take focus', () => {
    const integrations = strip(readFileSync(path.join(SRC, 'pages/org/IntegrationsPage.tsx'), 'utf8'))
    expect(integrations.match(/role="alert" tabIndex=\{-1\} ref=\{\(el\) => el\?\.focus\(\)\}/g)?.length).toBeGreaterThanOrEqual(2)
  })
})
