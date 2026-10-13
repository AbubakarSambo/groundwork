import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Tabs } from './Tabs'

/**
 * TABS, AGAINST THE PROTOTYPE'S OWN SHAPE (app.css: `.tabs`, `.tab`, `.tab.on`).
 *
 * GROUP 3 REVIEW, BATCH B: at 375px the row scrolls sideways, and a reader can open a page with a
 * later tab already chosen - the chosen tab then sits past the right edge, unseen. The chosen tab
 * is scrolled into view as soon as the page opens.
 *
 * B-203 (review round 2): the row used to call `element.scrollIntoView` on the chosen tab, which
 * (a) can stop wherever the browser's own `inline: 'nearest'`/`'start'` happens to land, mid-word
 * through whichever tab sits at the edge, and (b) clamps short of a tab's own start altogether when
 * the chosen tab sits near the end of the row and there is not enough content left to scroll into.
 * These tests used to assert only that SOME scroll call fired - true of the old, still-buggy
 * version too, which is exactly how the mid-word cut (read live on Riverbank's "Okr alignment" at
 * 390px) shipped past them. Rewritten to assert what the row actually lands on: `scrollTo({ left,
 * behavior })` on the ROW itself, with `left` worked out by hand - the chosen tab's own offset,
 * clamped to the row's real maximum scroll, then rounded down to the nearest tab's own start - so
 * whatever tab ends up at the left edge, it is always a whole one.
 */
/**
 * `offsetLeft`/`scrollWidth`/`clientWidth`/`getBoundingClientRect` are all zero in jsdom's bare
 * layout; given here instead, the same way a real narrow row's measurements would come out.
 *
 * B-203 (review round 3): STUBS `getBoundingClientRect` TOO, NOT ONLY `offsetLeft`. The row's own
 * fix now measures each tab against the ROW's edge with `getBoundingClientRect` rather than
 * `offsetLeft` - `offsetLeft` is an element's distance from its nearest POSITIONED ancestor, which
 * on the real page is further out than the row and picks up the page's own 18px side gutter, which
 * is exactly the bug read live on Riverbank's "Okr alignment" at 390px (the module doc above). A
 * helper that stubbed only `offsetLeft` would hide that same bug again - the very thing that let it
 * ship past these tests once already - so `PAGE_GUTTER` is folded into both the row's and every
 * tab's own `getBoundingClientRect().left` here, the same way a real page's outer padding does, and
 * the arithmetic below (which subtracts the row's own left) must land on the same numbers either
 * way - proving the fix cancels the gutter out rather than merely not using it in this test.
 */
const PAGE_GUTTER = 18
function layOutRow(row: HTMLElement, tabs: HTMLElement[], widths: number[], rowWidth: number) {
  let left = 0
  const rect = (x: number, w: number) => ({ left: x, right: x + w, top: 0, bottom: 0, width: w, height: 0, x, y: 0, toJSON() { return this } })
  tabs.forEach((el, i) => {
    const tabLeft = left
    Object.defineProperty(el, 'offsetLeft', { configurable: true, value: tabLeft })
    el.getBoundingClientRect = () => rect(PAGE_GUTTER + tabLeft, widths[i])
    left += widths[i]
  })
  Object.defineProperty(row, 'scrollWidth', { configurable: true, value: left })
  Object.defineProperty(row, 'clientWidth', { configurable: true, value: rowWidth })
  row.getBoundingClientRect = () => rect(PAGE_GUTTER, rowWidth)
}

const FIVE = [
  { key: 'board', label: 'Board', to: '/a' },
  { key: 'checkin', label: 'Check-in', to: '/b' },
  { key: 'context', label: 'Context and resources', to: '/c' },
  { key: 'mywork', label: 'My work', to: '/d' },
  { key: 'people', label: 'People and setup', to: '/e' },
]
// Roughly how wide each label actually draws, in the same order as FIVE.
const FIVE_WIDTHS = [70, 90, 180, 90, 150]

describe('Tabs', () => {
  it('scrolls the row (not the window) when the chosen tab is first drawn', () => {
    const scrollTo = vi.fn()
    Element.prototype.scrollTo = scrollTo
    render(
      <MemoryRouter>
        <Tabs label="Check-in" active="people" items={FIVE} />
      </MemoryRouter>
    )
    const row = screen.getByRole('tablist')
    const tabs = FIVE.map(i => screen.getByRole('tab', { name: i.label }))
    layOutRow(row, tabs, FIVE_WIDTHS, 390)

    expect(scrollTo).toHaveBeenCalled()
    const activeTab = screen.getByRole('tab', { name: 'People and setup' })
    expect(activeTab.getAttribute('aria-selected')).toBe('true')
  })

  it('and scrolls it again when the choice changes', () => {
    const scrollTo = vi.fn()
    Element.prototype.scrollTo = scrollTo
    const items = [
      { key: 'board', label: 'Board', to: '/a' },
      { key: 'checkin', label: 'Check-in', to: '/b' },
    ]
    const { rerender } = render(
      <MemoryRouter>
        <Tabs label="Check-in" active="board" items={items} />
      </MemoryRouter>
    )
    const calls = scrollTo.mock.calls.length
    rerender(
      <MemoryRouter>
        <Tabs label="Check-in" active="checkin" items={items} />
      </MemoryRouter>
    )
    expect(scrollTo.mock.calls.length).toBeGreaterThan(calls)
  })

  it('only the chosen tab gets the visible underline, same as before', () => {
    render(
      <MemoryRouter>
        <Tabs
          label="Check-in"
          active="checkin"
          items={[
            { key: 'board', label: 'Board', to: '/a' },
            { key: 'checkin', label: 'Check-in', to: '/b' },
          ]}
        />
      </MemoryRouter>
    )
    expect(screen.getByRole('tab', { name: 'Board' }).className).not.toContain('gwui-tab-on')
    expect(screen.getByRole('tab', { name: 'Check-in' }).className).toContain('gwui-tab-on')
  })

  describe('B-203: the row always lands on a whole tab, never mid-word', () => {
    /*
     * The layout (offsetLeft/scrollWidth/clientWidth) only exists on the real DOM nodes once they
     * are mounted, and the row's own effect runs on mount using whatever layout jsdom gives it
     * (all zeros) - before this test ever gets a chance to set the numbers that matter. So each
     * test lays the row out after that first mount, then forces the effect to run a second time
     * (a fresh `items` array reference, same content, is one of the effect's own dependencies) and
     * reads the LAST scroll it asked for - the one computed from the real numbers.
     */
    it('lands exactly on the chosen tab\'s own start when the row has room to scroll that far', () => {
      const scrollTo = vi.fn()
      Element.prototype.scrollTo = scrollTo
      const { rerender } = render(<MemoryRouter><Tabs label="Check-in" active="mywork" items={FIVE} /></MemoryRouter>)
      const row = screen.getByRole('tablist')
      const tabs = FIVE.map(i => screen.getByRole('tab', { name: i.label }))
      // Plenty of room: scrollWidth (580) against a narrow 120px viewport leaves a maximum scroll
      // of 460 - comfortably past "My work"'s own start (340), so nothing clamps it short.
      layOutRow(row, tabs, FIVE_WIDTHS, 120)
      rerender(<MemoryRouter><Tabs label="Check-in" active="mywork" items={[...FIVE]} /></MemoryRouter>)

      const call = scrollTo.mock.calls[scrollTo.mock.calls.length - 1][0]
      expect(call.left).toBe(340) // "My work"'s own offsetLeft: 70 (Board) + 90 (Check-in) + 180 (Context and resources)
    })

    it('rounds DOWN to the nearest whole tab when the chosen tab is too close to the end to reach its own start', () => {
      const scrollTo = vi.fn()
      Element.prototype.scrollTo = scrollTo
      const { rerender } = render(<MemoryRouter><Tabs label="Check-in" active="mywork" items={FIVE} /></MemoryRouter>)
      const row = screen.getByRole('tablist')
      const tabs = FIVE.map(i => screen.getByRole('tab', { name: i.label }))
      // Pia, 390px: the row's total width (580) minus the viewport (390) leaves a maximum scroll of
      // 190 - short of "My work"'s own 340. The old `inline: 'start'` clamped right there, landing
      // mid-way through "Context and resources" (offsetLeft 160, 180 wide: 160..340 straddles 190).
      // The fix must round DOWN to "context"'s own start (160), not stop at the clamped 190.
      layOutRow(row, tabs, FIVE_WIDTHS, 390)
      rerender(<MemoryRouter><Tabs label="Check-in" active="mywork" items={[...FIVE]} /></MemoryRouter>)

      const call = scrollTo.mock.calls[scrollTo.mock.calls.length - 1][0]
      expect(call.left).toBe(160) // "Context and resources"'s own offsetLeft: 70+90
      // Never a value that lands strictly inside a tab (e.g. the naive clamp of 190).
      expect(call.left).not.toBe(190)
    })
  })
})
