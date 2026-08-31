import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'

/**
 * ONE CLIENT METHOD PER ROUTE. W-UX-C.
 *
 * This replaces the #21 guard, which locked TWO identical functions to one share-card route rather
 * than removing one of them. That is the pattern this whole pass keeps turning up - two places that
 * must agree, each defensible on its own, a test holding them level instead of a fix.
 *
 * The rule now: if two methods in one api file call the same URL with the same verb, one of them is
 * redundant. Nothing here is exempt, because the moment something is, the pair drifts.
 */
const DIR = __dirname

/**
 * TWO METHODS ON ONE ROUTE ARE ALLOWED ONLY WITH A REASON WRITTEN DOWN.
 *
 * The first version of this guard banned it outright and found three pairs. Only one was a defect
 * (`setPricing` was `setPlanLimits` with one field, so the price and the seat cap of the same row
 * were written by two different functions). The other two are legitimate and are named here, so a
 * FOURTH pair appearing is a failure rather than noise:
 *
 *  - PATCH /auth/me carries `updateProfile`, `setEmailNotifications` and `setPhoneNumber`. One
 *    endpoint, three intents, each named at the call site. A single `update(anything)` would be
 *    worse, not better.
 *  - POST /entry/chat is ONE function with an overload, so it is counted twice by a regex and is a
 *    single method in fact.
 *
 * Anything not on this list is the `getCodeShareCard` shape: the same call, twice, kept in step by a
 * test instead of being fixed.
 */
const JUSTIFIED = ['PATCH /auth/me', 'POST /entry/chat']

describe('no route is called by two methods', () => {
  for (const file of readdirSync(DIR).filter(f => f.endsWith('.ts') && !f.includes('.spec.'))) {
    it(`${file} calls each route once`, () => {
      const src = readFileSync(join(DIR, file), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
      const seen = new Map<string, number>()
      for (const m of src.matchAll(/apiClient\.(get|post|patch|put|delete)<[^>]*>?\(\s*[`'"]([^`'"]+)[`'"]/g)) {
        const key = `${m[1].toUpperCase()} ${m[2]}`
        seen.set(key, (seen.get(key) ?? 0) + 1)
      }
      const doubled = [...seen.entries()].filter(([, n]) => n > 1).map(([k]) => k)
      expect(doubled.filter(k => !JUSTIFIED.includes(k))).toEqual([])
    })
  }
})
