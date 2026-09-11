import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

/**
 * THE WHOLE SETUP SURVIVES A RELOAD. The conversation, the situation and the step were persisted; the
 * session count, the cadence and the name lived in a plain zustand store and were not, so after a
 * reload "12 sessions planned" came back as "1 session planned" - the number the person agreed to,
 * replaced. Whole state or none.
 */
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
const page = strip(readFileSync(path.join(__dirname, 'EntryChatPage.tsx'), 'utf8'))

describe('the persisted session', () => {
  it('carries the plan', () => {
    expect(page).toMatch(/saveSession\(\{ scenario, history: h, closed: false, onboardingStep: step, onboardingSelections: sels, sessions, cadence, cadenceChosen, groundName, plannedFrom/)
  })
  it('and the plan is read back on restore, not the store\'s default of one', () => {
    expect(page).toMatch(/if \(typeof saved\.sessions === 'number' && saved\.sessions > 0\) setSessions\(saved\.sessions\)/)
    expect(page).toMatch(/if \(saved\.cadence\) \{ setCadence\(saved\.cadence as typeof cadence\); setCadenceChosen\(!!saved\.cadenceChosen\) \}/)
    expect(page).toMatch(/if \(saved\.groundName\) setGroundName\(saved\.groundName\)/)
  })
  it('the stale link notice on the sign-in page clears with the address', () => {
    const auth = strip(readFileSync(path.join(__dirname, '..', 'auth', 'AuthPage.tsx'), 'utf8'))
    expect(auth).toMatch(/const clearNotices = \(\) => \{ setError\(''\); setPasswordlessNotice\(''\) \}/)
    expect(auth).not.toMatch(/onChange=\{e => \{ set\w+\(e\.target\.value\); setError\(''\) \}\}/)
  })
  it('"You are in." is above the admin/member split, so the admin who just set a password sees it', () => {
    const list = strip(readFileSync(path.join(__dirname, '..', 'grounds', 'GroundsListPage.tsx'), 'utf8'))
    expect(list.indexOf('{justSetUp && (')).toBeLessThan(list.indexOf('{isAdmin ? ('))
  })
})
