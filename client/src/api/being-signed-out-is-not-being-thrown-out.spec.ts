/**
 * BEING SIGNED OUT IS NOT BEING THROWN OUT.
 *
 * A 401 sent the tab to `/`, and `/` bounces a signed-out visitor to the marketing site. So a
 * token expiring in the middle of a check-in took somebody off the product entirely, onto a page
 * selling it, with nothing saying why and no way back to the conversation they were in.
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'node:fs'
import * as path from 'node:path'

const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
const client = strip(fs.readFileSync(path.join(__dirname, 'client.ts'), 'utf8'))
const authPage = strip(fs.readFileSync(path.join(__dirname, '..', 'pages', 'auth', 'AuthPage.tsx'), 'utf8'))

describe('where a 401 sends somebody', () => {
  it('does not send them to the root, which leaves the product', () => {
    expect(client).not.toMatch(/window\.location\.href = '\/'/)
  })

  it('sends them to sign-in, and says why', () => {
    expect(client).toContain("'/auth?why=session-expired'")
  })

  it('says nothing about expiring to somebody who never had a sign-in on this address (a first visit)', () => {
    expect(client).toContain('const hadASession = !!error.config?.headers?.Authorization')
    expect(client).toContain("(hadASession ? '/auth?why=session-expired' : '/auth')")
  })

  it('carries where they were, in the parameter the sign-in page already reads', () => {
    expect(client).toContain('next=${encodeURIComponent(wasAt)}')
    expect(authPage).toMatch(/searchParams\.get\('next'\)/)
  })

  it('does not replace "You\'re signed out" with a timed-out sign-in', () => {
    /* Found in the running app: opening /signout with a session that had already lapsed let a
       request still in flight come back 401, and the tab went to "you were signed out because you
       had been away" instead of staying on the page that had just signed them out. */
    expect(client).toContain("const onAuthPage = ['/auth', '/signout'].some(p => window.location.pathname.startsWith(p))")
  })

  it('does not build a next that points back at sign-in, which would loop', () => {
    expect(client).toContain("wasAt.startsWith('/auth')")
  })

  it('still clears the session first — a stale token in the store is worse than none', () => {
    const at401 = client.indexOf('401')
    const block = client.slice(at401, at401 + 900)
    expect(block.indexOf('logout()')).toBeGreaterThan(-1)
    expect(block.indexOf('logout()')).toBeLessThan(block.indexOf('window.location.href'))
  })
})

describe('and the sign-in page says what happened', () => {
  it('reads the reason and has a sentence for it', () => {
    expect(authPage).toContain("searchParams.get('why') === 'session-expired'")
    expect(authPage).toMatch(/You were signed out because you had been away a while/)
  })

  it('does not show it on top of a real error, which would be two explanations', () => {
    expect(authPage).toContain('{sessionExpired && !error && (')
  })
})

describe('and one event gets one explanation', () => {
  const grounds = strip(fs.readFileSync(path.join(__dirname, 'grounds.ts'), 'utf8'))
  const reports = strip(fs.readFileSync(path.join(__dirname, 'reports.ts'), 'utf8'))

  it('the ground read suppresses both toasts, because the page says it itself', () => {
    const at = grounds.indexOf('get: (id: string) =>')
    const block = grounds.slice(at, at + 260)
    expect(block).toContain('skipNotFoundToast: true')
    expect(block).toContain('skipForbiddenToast: true')
  })

  it('and so does the report read', () => {
    const at = reports.indexOf('/report`')
    const block = reports.slice(Math.max(0, at - 200), at + 200)
    expect(block).toContain('skipNotFoundToast: true')
    expect(block).toContain('skipForbiddenToast: true')
  })
})
