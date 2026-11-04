import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, it, expect } from 'vitest'
import { groundTabs } from './ground-tabs'

/**
 * "LOOK AT THE CONTEXT TAB" HAS TO BE A LINK YOU CAN SEND.
 *
 * The admin page read `?tab=` using its OWN internal names - `docs` for Context, `checkins` for
 * Sessions, and `overview` for a tab that no longer exists - so `?tab=context` and `?tab=record`,
 * the names printed in the tab row and the only ones anybody could guess, both fell through to the
 * check-in. The participant page did not read the parameter at all, so the same link behaved
 * differently depending on who followed it. Neither page wrote the tab back to the URL, so no tab
 * could be linked to even by copying the address bar.
 *
 * Both pages now speak the shared keys from `ground-tabs.ts` and keep the URL in step.
 */
const ADMIN = readFileSync(join(__dirname, 'GroundAdminPage.tsx'), 'utf8')
const PARTY = readFileSync(join(__dirname, 'GroundParticipantPage.tsx'), 'utf8')
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

/* Each view offers a different list now - `sessions` is the lead's, `record` is a party's - so each
   is checked against the keys IT can be sent, not against every key that exists. A page failing to
   map a key it never shows is not a broken link. */
const KEYS_FOR = {
  'the lead': groundTabs({ canRunThisCheckIn: true, isAParty: false }).map(t => t.key),
  'a party': groundTabs({ canRunThisCheckIn: false, isAParty: true }).map(t => t.key),
} as const

describe('every tab in the row can be linked to', () => {
  it('found the keys each view offers, so an empty list cannot pass', () => {
    expect(KEYS_FOR['the lead']).toContain('context')
    expect(KEYS_FOR['the lead']).toContain('sessions')
    expect(KEYS_FOR['a party']).toContain('context')
    expect(KEYS_FOR['a party']).toContain('record')
  })

  for (const [name, src] of [['the lead', ADMIN], ['a party', PARTY]] as const) {
    describe(name, () => {
      const code = strip(src)

      it('reads ?tab= at all', () => {
        expect(code).toMatch(/searchParams\.get\('tab'\)/)
      })

      it('maps every shared key, so none falls through to the default', () => {
        const map = code.slice(code.indexOf('FROM_TAB_KEY: Record'), code.indexOf('}', code.indexOf('FROM_TAB_KEY: Record')))
        const missing = KEYS_FOR[name].filter((k) => !map.includes(`${k}:`))
        expect(missing).toEqual([])
      })

      it('writes the tab back, so the address bar is a link worth copying', () => {
        expect(code).toMatch(/setSearchParams\(/)
        expect(code).toMatch(/next\.set\('tab', key\)/)
      })

      /** Tabs are not history: twenty back-presses to leave a check-in is its own bug. */
      it('replaces rather than pushes', () => {
        expect(code).toMatch(/setSearchParams\(next, \{ replace: true \}\)/)
      })
    })
  }
})
