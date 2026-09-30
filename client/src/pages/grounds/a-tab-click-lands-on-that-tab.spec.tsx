import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { MemoryRouter } from 'react-router-dom'
import { Tabs } from '@/components/gw/ui/Tabs'

/**
 * CLICKING A TAB HAS TO LAND ON THAT TAB - NOW POINTED AT THE REBUILT PARTS.
 *
 * This used to click `<GroundTabRow>`, driven by `groundTabs()`'s own six-or-seven-entry list.
 * The check-in rebuild (docs/tasks-ui.md) folds that list to the prototype's five - Board,
 * Check-in, Context, My work, People and setup - drawn by `components/gw/ui/CheckInHeader.tsx`,
 * itself built from `components/gw/ui/Tabs.tsx`. `GroundTabRow.tsx` is deleted with this change
 * (nothing imports it once this spec stops); `groundTabs()` and its own test suite are untouched,
 * because neither page's tab ROW reads it any more - see the "ONE MOVE LIST" comments in
 * GroundAdminPage.tsx and GroundParticipantPage.tsx for where each of the old seven/six tabs went.
 *
 * The rule this spec protects is the same one as before: a click reports the key that was clicked,
 * one hop, whoever is looking - `Tabs` (the part both pages now render the row with) is exercised
 * directly, the same way `GroundTabRow` used to be.
 */
const THE_FIVE = [
  { key: 'board', label: 'Board' },
  { key: 'checkin', label: 'Check-in' },
  /* Renamed to "Context and resources" (docs/tasks-ui.md, "one chat, Ask Groundwork, for
     everything"), so the Resources panel it now carries has a name that says so. */
  { key: 'context', label: 'Context and resources' },
  { key: 'mywork', label: 'My work' },
  { key: 'people', label: 'People and setup' },
]

describe('a tab click lands on the tab that was clicked', () => {
  it('found tabs to click, so an empty row cannot pass', () => {
    expect(THE_FIVE.length).toBe(5)
  })

  for (const t of THE_FIVE.filter((x) => x.key !== 'board')) {
    it(`"${t.label}" reports ${t.key}`, async () => {
      const onChange = vi.fn()
      render(
        <MemoryRouter>
          <Tabs active="checkin" items={THE_FIVE} onChange={onChange} />
        </MemoryRouter>,
      )
      await userEvent.click(screen.getByRole('tab', { name: t.label }))
      expect(onChange).toHaveBeenCalledWith(t.key)
    })
  }

  it('"Board" is a real link, not a click that is reported back - it is a different route', () => {
    render(
      <MemoryRouter>
        <Tabs active="checkin" items={THE_FIVE.map((t) => (t.key === 'board' ? { ...t, to: '/grounds/1/board' } : t))} />
      </MemoryRouter>,
    )
    expect(screen.getByRole('tab', { name: 'Board' }).getAttribute('href')).toBe('/grounds/1/board')
  })
})

/**
 * AND THE OTHER HALF: EACH PAGE HANDS THE HEADER THE SAME FIVE, IN THE SAME ORDER, AND
 * TRANSLATES A CLICK BACK THROUGH ITS OWN MAP ONCE.
 *
 * The source read cannot see a click land - the row test above does that - but it can see that
 * neither page quietly drops one of the five, reorders them, or resurrects a sixth.
 */
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
const PAGES = ['GroundAdminPage.tsx', 'GroundParticipantPage.tsx'] as const

describe('both pages hand the header the same five tabs, in the prototype order', () => {
  for (const f of PAGES) {
    const code = strip(readFileSync(join(__dirname, f), 'utf8'))

    it(`${f}: renders <CheckInHeader>, not the old <TheCheckInHeader>`, () => {
      expect(code).toMatch(/<CheckInHeader/)
      expect(code).not.toMatch(/<TheCheckInHeader/)
    })

    it(`${f}: the five keys appear in the prototype's order`, () => {
      const start = code.indexOf('<CheckInHeader')
      const header = code.slice(start, code.indexOf('/>', start))
      const keys = ["'board'", "'checkin'", "'context'", "'mywork'", "'people'"]
      let cursor = -1
      for (const k of keys) {
        const at = header.indexOf(k, cursor + 1)
        expect(at, `${k} missing or out of order in ${f}`).toBeGreaterThan(cursor)
        cursor = at
      }
    })

    it(`${f}: translates the clicked key through onSelectTab, once`, () => {
      expect(code).toMatch(/onSelectTab=\{[\s\S]*goTab\(/)
    })
  }
})
