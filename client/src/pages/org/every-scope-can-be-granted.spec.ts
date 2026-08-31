import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * A POWER THAT IS BUILT, DESCRIBED NOWHERE, AND CANNOT BE TURNED ON.
 *
 * The API has eleven scopes. The page offered three. So a customer could not grant the right to
 * send their handbook, open a check-in from their own system, read a handover brief, or ask a
 * question from their own app - all built, all reachable by anybody who knew the string to type,
 * and none of them turn-on-able by the person whose organisation it is.
 *
 * Asked as "is what we have built not complete, or is how we communicate not complete" - and this
 * is the sharpest answer available: both, in the same place.
 */
const PAGE = readFileSync(join(__dirname, 'IntegrationsPage.tsx'), 'utf8')
const SCOPES_TS = readFileSync(
  join(__dirname, '../../../../api/src/modules/public-api/scopes.ts'),
  'utf8',
)

/** The API's list, read from the source of truth rather than restated here. */
function apiScopes(): string[] {
  const block = SCOPES_TS.slice(SCOPES_TS.indexOf('export const SCOPES = ['))
  const arr = block.slice(0, block.indexOf('] as const'))
  return [...arr.matchAll(/'([a-z]+:[a-z]+)'/g)].map(m => m[1])
}

/** What the page lets somebody tick. */
function offeredScopes(): string[] {
  const block = PAGE.slice(PAGE.indexOf('const SCOPES:'))
  const arr = block.slice(0, block.indexOf('\n]'))
  return [...arr.matchAll(/key: '([a-z]+:[a-z]+)'/g)].map(m => m[1])
}

describe('every scope can be granted', () => {
  it('reads both real lists, so this cannot pass by finding nothing', () => {
    expect(apiScopes().length).toBeGreaterThan(8)
    expect(offeredScopes().length).toBeGreaterThan(8)
  })

  it('offers every scope the API accepts', () => {
    const missing = apiScopes().filter(s => !offeredScopes().includes(s))
    expect(missing, [
      'The API accepts these and the page gives nobody a way to turn them on.',
      'A capability that only somebody reading the source can grant is not a capability the',
      'customer has - add it to SCOPES in IntegrationsPage with what it actually lets through.',
    ].join('\n')).toEqual([])
  })

  it('offers nothing the API would refuse', () => {
    /* The other direction: a checkbox that issues a credential the API rejects as an unknown scope. */
    const invented = offeredScopes().filter(s => !apiScopes().includes(s))
    expect(invented).toEqual([])
  })

  it('says what each one lets through, not just its name', () => {
    /* The person choosing is usually not the engineer. The string stays for the one who is. */
    const block = PAGE.slice(PAGE.indexOf('const SCOPES:'))
    /* Tolerant of escaped apostrophes - two of these descriptions contain one, and a naive
       [^']+ stops dead at the backslash and silently matches fewer entries than exist. */
    const quoted = String.raw`'((?:[^'\\]|\\.)*)'`
    const re = new RegExp(`label: ${quoted}[\\s\\S]{0,60}?sub: ${quoted}`, 'g')
    const entries = [...block.slice(0, block.indexOf('\n]')).matchAll(re)]
    expect(entries.length).toBe(offeredScopes().length)
    for (const [, label, sub] of entries) {
      expect(label.length).toBeGreaterThan(3)
      expect(sub.length).toBeGreaterThan(15)
      /* A description that just restates the scope name explains nothing. */
      expect(sub.toLowerCase()).not.toMatch(/^[a-z]+:[a-z]+$/)
    }
  })
})
