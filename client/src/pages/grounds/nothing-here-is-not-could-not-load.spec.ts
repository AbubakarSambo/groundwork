import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * "NOTHING HERE YET" AND "WE COULD NOT LOAD THIS" ARE DIFFERENT SENTENCES.
 *
 * The list query destructured `data = []` and nothing else, so a failed fetch fell into the same
 * branch as a genuinely empty account and rendered the first-run state: "Your first check-in is one
 * tap away." Shown to somebody who may have ten. A person whose connection dropped was told their
 * work does not exist - the worst available reading of a blank list, and the one they are least able
 * to check for themselves.
 *
 * HOW THIS WAS FOUND, AND THE CORRECTION IT CARRIES. The audit originally reported a blank white
 * page on API failure. That was wrong: the test blocked `**​/api/**`, which in this repo also matches
 * the client's own source modules at `src/api/*.ts`, so it was breaking the app's JavaScript rather
 * than its API. Repeated against `**​/api/v1/**` the shell renders perfectly - and this, the
 * misleading empty state, is what is actually wrong.
 *
 * Comments stripped: this file names the strings it protects.
 */
const SRC = readFileSync(join(__dirname, 'GroundsListPage.tsx'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/^\s*\/\/.*$/gm, '')

describe('nothing here is not could not load', () => {
  it('the list query reads its own failure', () => {
    expect(SRC).toMatch(/const \{[^}]*isError[^}]*\} = useQuery/)
  })

  it('the first-run empty state is hidden when the fetch failed', () => {
    /* The defect: this condition used to be `!isLoading && grounds.length === 0` alone. */
    expect(SRC).toContain('!isLoading && !isError && grounds.length === 0')
  })

  it('and the onboarding block is not on the list at all any more, but on Today, reading its own facts', () => {
    /* U.5: it moved to Today. It never read the list: its ticks come from GET /users/rollout, so a
       list that failed to load cannot make it claim an empty account. */
    expect(SRC).not.toContain('<AdminFirstRun />')
    const today = readFileSync(join(__dirname, '..', 'today', 'TodayPage.tsx'), 'utf8')
    expect(today).toContain('<AdminFirstRun />')
    const card = readFileSync(join(__dirname, 'an-admin-lands-on-a-check-in-list.tsx'), 'utf8')
    expect(card).toContain("apiClient.get('/users/rollout')")
  })

  it('a failure says so, and says the record is safe', () => {
    const i = SRC.indexOf('We could not load your check-ins')
    expect(i).toBeGreaterThan(-1)
    const block = SRC.slice(i, i + 400)
    expect(block).toContain('not a lost record')
  })

  it('and offers the one thing that helps', () => {
    expect(SRC).toContain('Try again')
    expect(SRC).toMatch(/onClick=\{\(\) => refetch\(\)\}/)
  })
})
