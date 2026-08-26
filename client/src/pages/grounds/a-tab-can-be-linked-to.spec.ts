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

const KEYS = groundTabs({ contextEnabled: true }).map((t) => t.key)

describe('every tab in the row can be linked to', () => {
  it('found the shared keys', () => {
    expect(KEYS).toContain('context')
    expect(KEYS).toContain('record')
  })

  for (const [name, src] of [['the lead', ADMIN], ['a party', PARTY]] as const) {
    describe(name, () => {
      const code = strip(src)

      it('reads ?tab= at all', () => {
        expect(code).toMatch(/searchParams\.get\('tab'\)/)
      })

      it('maps every shared key, so none falls through to the default', () => {
        const map = code.slice(code.indexOf('FROM_TAB_KEY: Record'), code.indexOf('}', code.indexOf('FROM_TAB_KEY: Record')))
        const missing = KEYS.filter((k) => !map.includes(`${k}:`))
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
