import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'fs'
import { join } from 'path'

/**
 * SESSIONS ARE NOT SOLD.
 *
 * Ten free grounds per org, each with unlimited sessions and reports; a
 * subscription lifts the ten-ground cap. Nothing is charged per session.
 * `canStartSession` has enforced that for a while - free grounds "are never
 * metered or paywalled".
 *
 * The UI did not get the message. A "$5 per session" model that had been
 * dropped was still quoted in four places, and the worst of them told a
 * brand-new person "additional sessions are $5 each" at the moment they were
 * deciding whether to begin - for a ground that is free and uncapped. Two more
 * offered to sell people "insights" that were never locked, one of them to a
 * participant, about their own record.
 *
 * A sweep of the whole client, rather than the files that happened to be
 * wrong, because the failure mode was copy surviving a model change in places
 * nobody thought to look.
 */
function sourceFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) sourceFiles(full, acc)
    else if (/\.(ts|tsx)$/.test(entry) && !/\.spec\./.test(entry)) acc.push(full)
  }
  return acc
}

const FILES = sourceFiles(join(__dirname, '..'))

/**
 * Source minus comments, so the explanations in the code (which necessarily
 * quote the old price to say it is gone) do not trip these checks. Block
 * comments are stripped whole - filtering by line prefix misses the middle
 * lines of a multi-line JSX comment, which is exactly where a sentence like
 * "additional sessions are $5 each" ends up when you are explaining why you
 * deleted it.
 */
function code(path: string): string {
  return readFileSync(path, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter(l => !l.trim().startsWith('//'))
    .join('\n')
}

describe('no surface quotes a per-session price', () => {
  it('nowhere offers to sell a session', () => {
    const offenders = FILES.filter(f => /Buy a session|Buy sessions|sessions? × \$|\$5 each/i.test(code(f)))
    expect(offenders.map(f => f.split('/src/')[1] ?? f)).toEqual([])
  })

  it('nowhere sells "insights", which are not locked', () => {
    const offenders = FILES.filter(f => /Unlock insights|Unlock full insights/i.test(code(f)))
    expect(offenders.map(f => f.split('/src/')[1] ?? f)).toEqual([])
  })

  it('tells a new person the truth about what their first ground costs', () => {
    const entry = code(join(__dirname, 'enter/EntryChatPage.tsx'))
    expect(entry).not.toMatch(/\$5/)
    expect(entry).toMatch(/needs an account, and it is free/)
  })

  it('keeps access-code redemption, which grants access and costs nothing', () => {
    const payment = readFileSync(join(__dirname, 'billing/PaymentPage.tsx'), 'utf8')
    expect(payment).toMatch(/[Aa]ccess code/)
  })
})
