import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, it, expect } from 'vitest'

/**
 * THE GROUND THAT WENT MISSING AFTER SIGN-IN. W14-11, and it was on the list as R1.
 *
 * The entry flow builds a whole ground before anybody has an account, so the finished thing lives in
 * the browser until a sign-in completes. Two sign-ins, two different keys, and the Google one had
 * both halves of the bug:
 *
 *   1. It deleted its key BEFORE attempting the commit. A failed request took the setup with it -
 *      the ground was not lost on the server, it was deleted in the browser by the code meant to be
 *      saving it, with no copy anywhere.
 *   2. It read `gw_entry_pending_commit`, a snapshot taken the moment they clicked Google.
 *      `EntryChatPage` keeps `gw_commit_payload` in sync as they keep editing and never touches the
 *      snapshot, so anybody who added a person after clicking Google lost that person.
 */
const GOOGLE = readFileSync(join(__dirname, 'GoogleCallbackPage.tsx'), 'utf8')
const MAGIC = readFileSync(join(__dirname, 'MagicVerifyPage.tsx'), 'utf8')
const SHARED = readFileSync(join(__dirname, 'entry-handover.ts'), 'utf8')
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

describe('nothing is cleared before the ground exists', () => {
  it('the Google path no longer removes its key ahead of the commit', () => {
    const code = strip(GOOGLE)
    expect(code).not.toMatch(/removeItem\('gw_entry_pending_commit'\)/)
    // The clear is after the awaited commit, in the success branch only.
    const body = code.slice(code.indexOf('const pending ='), code.indexOf('catch {'))
    expect(body.indexOf('entryApi.commit')).toBeLessThan(body.indexOf('clearEntryHandover()'))
  })

  it('and the failure branch leaves everything where it was', () => {
    const code = strip(GOOGLE)
    const fail = code.slice(code.indexOf('} catch {'), code.indexOf("navigate('/start'") + 40)
    expect(fail).not.toMatch(/removeItem|clearEntryHandover/)
  })

  it('and says so, rather than dropping them on /start with no explanation', () => {
    expect(GOOGLE).toMatch(/your ground did not save\. Everything you wrote is still here/)
  })
})

describe('both sign-ins read the same thing', () => {
  it('the Google path uses the shared loader, not its own snapshot', () => {
    expect(strip(GOOGLE)).toMatch(/loadEntryHandover\(\)/)
    expect(strip(GOOGLE)).not.toMatch(/JSON\.parse\(pending\)/)
  })

  it('so does the magic link path', () => {
    expect(strip(MAGIC)).toMatch(/loadEntryHandover\(\)/)
    expect(strip(MAGIC)).not.toMatch(/function loadCommitPayload/)
  })

  it('and the loader prefers the key that is kept in sync', () => {
    /**
     * THE ORDER IS THE FIX. `gw_commit_payload` is updated as the person keeps editing;
     * `gw_entry_pending_commit` is frozen at the moment they clicked Google. Reading the frozen one
     * first would keep losing every change made after that click.
     */
    const body = SHARED.slice(SHARED.indexOf('export function loadEntryHandover'))
    expect(body.indexOf('COMMIT_KEY')).toBeLessThan(body.indexOf('GOOGLE_KEY'))
  })

  it('and clears every copy once, so no key is left behind to be replayed', () => {
    for (const k of ['COMMIT_KEY', 'SESSION_KEY', 'GOOGLE_KEY', 'gw_draft_token']) {
      expect(SHARED.slice(SHARED.indexOf('clearEntryHandover'))).toContain(k)
    }
  })
})
