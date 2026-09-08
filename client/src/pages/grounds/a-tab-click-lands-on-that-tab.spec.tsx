import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { GroundTabRow } from '@/components/gw/GroundTabRow'
import { groundTabs } from './ground-tabs'

/**
 * CLICKING A TAB HAS TO LAND ON THAT TAB.
 *
 * `a-tab-can-be-linked-to.spec.ts` reads the source and checks that every shared key appears in
 * each page's `FROM_TAB_KEY`. It was green while Context was unreachable, because the defect was
 * not a missing entry - it was translating TWICE. The party's view mapped the tab list into its own
 * keys before handing it to the row, and then mapped the row's key AGAIN on the way back. `docs`
 * and `checkin` are not keys of that map in the shared direction, so both fell through to the
 * default. Three of the five spell the same either way, so Report, My record and Setup worked and
 * Context alone sent you back to the conversation. Reported as "her context page doesnt seem to
 * exist".
 *
 * A source read cannot see that, because both halves are individually correct. So this clicks.
 *
 * The row is driven with the keys each view actually gives it, and every click must come back as
 * the key that was clicked - one hop, whoever is looking. A page is then free to translate that key
 * into its own vocabulary once, which is a single expression a reader can check.
 */
const VIEWS = {
  'the lead': groundTabs({ contextEnabled: true, canRunThisCheckIn: true, isAParty: true }),
  'a party': groundTabs({ contextEnabled: true, canRunThisCheckIn: false, isAParty: true }),
} as const

describe('a tab click lands on the tab that was clicked', () => {
  it('found tabs to click, so an empty row cannot pass', () => {
    expect(VIEWS['a party'].map(t => t.key)).toContain('context')
    expect(VIEWS['the lead'].length).toBeGreaterThan(VIEWS['a party'].length)
  })

  for (const [who, tabs] of Object.entries(VIEWS)) {
    for (const t of tabs) {
      it(`${who}: "${t.label}" reports ${t.key}`, async () => {
        const onPick = vi.fn()
        render(<GroundTabRow tabs={tabs} active={'chat' as string} onPick={onPick} />)
        await userEvent.click(screen.getByRole('button', { name: t.label }))
        expect(onPick).toHaveBeenCalledWith(t.key)
      })
    }
  }
})

/**
 * AND THE OTHER HALF OF THE SAME BUG, WHICH THE ROW CANNOT SEE.
 *
 * The row above reports the key it was given. The defect was that the party's page handed it keys
 * from its OWN vocabulary and then read the answer as if it were the shared one. Both halves are
 * correct in isolation; the row test passes either way. So the rule is stated where it can be
 * checked: the list handed to the row is the shared list, unmapped, and the single translation
 * happens on the way back.
 */
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
const PAGES = ['GroundAdminPage.tsx', 'GroundParticipantPage.tsx'] as const

describe('the row is given the shared keys, and translation happens once', () => {
  for (const f of PAGES) {
    const code = strip(readFileSync(join(__dirname, f), 'utf8'))

    it(`${f}: hands the row the shared list rather than a re-keyed copy`, () => {
      const row = code.slice(code.indexOf('<GroundTabRow'), code.indexOf('/>', code.indexOf('<GroundTabRow')))
      expect(row).not.toMatch(/tabs=\{tabs\.map\(/)
      expect(row).toMatch(/tabs=\{(?:tabs|groundTabs\()/)
    })

    it(`${f}: translates the clicked key through its own map, once`, () => {
      const row = code.slice(code.indexOf('<GroundTabRow'), code.indexOf('/>', code.indexOf('<GroundTabRow')))
      expect(row).toMatch(/onPick=\{k =>[\s\S]*FROM_TAB_KEY\[k\]/)
    })
  }
})
