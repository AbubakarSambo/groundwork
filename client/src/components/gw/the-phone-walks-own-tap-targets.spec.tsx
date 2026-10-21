import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { CheckInRow } from './ui'
import { TheCheckInHeader } from './TheCheckInHeader'

/**
 * SCREEN FAULT 10: TAP TARGETS UNDER 40px ON A PHONE, FOUND ON THE WALK.
 *
 * Each of these drew correctly but could not be reliably tapped with a finger at 375-390px: the
 * check-ins list's own title link (25px), the report header's breadcrumb (16px) and its tabs
 * (32px), and People's "Open" link (34x22). Each now carries the shared 40px floor - `.gwui-tap-44`
 * where the call site can take a class, or the same technique added to the shared class itself
 * (`.gwui-open-link`, `.gwui-ci-tab`) where every caller already uses it unchanged. jsdom does not
 * lay out real pixels, so these are checked as class membership plus the CSS rule that gives that
 * class its floor, the same way an-icon-is-not-a-target.spec.ts already does for this file's other
 * tap-target fixes.
 */
const GW_UI_CSS = readFileSync(join(__dirname, 'ui/gw-ui.css'), 'utf8')
const INDEX_CSS = readFileSync(join(__dirname, '../../index.css'), 'utf8')

function mount(node: React.ReactNode) {
  return render(<MemoryRouter>{node}</MemoryRouter>)
}

describe('the check-ins list row title', () => {
  it('carries the 40px tap class', () => {
    mount(
      <table><tbody>
        <CheckInRow to="/grounds/g1" name="Sales team, Q3" forWhat="OKRs" stands="Session 1" />
      </tbody></table>,
    )
    expect(screen.getByRole('link', { name: 'Sales team, Q3' }).className).toContain('gwui-tap-44')
  })
})

describe('the check-in header', () => {
  it('gives the breadcrumb and the tabs the same 40px floor on a phone', () => {
    mount(
      <TheCheckInHeader
        id="g1" title="Sales team, Q3" canRunThisCheckIn isAParty active="chat"
      />,
    )
    expect(screen.getByRole('link', { name: 'Check-ins' }).className).toContain('gwui-tap-44')
  })

  /* 44px at every width since 21 October: Hafsah's 44px rule covers links and tabs, not only buttons. */
  it('.gwui-ci-tab carries a 44px floor in index.css', () => {
    const rule = INDEX_CSS.slice(INDEX_CSS.indexOf('.gwui-ci-tab {'))
    expect(rule.slice(0, 700)).toContain('min-height: 44px')
  })
})

describe('People\'s "Open" link (.gwui-open-link)', () => {
  it('carries a 44px floor in gw-ui.css (21 October: links in lists are held to 44px too)', () => {
    const rule = GW_UI_CSS.slice(GW_UI_CSS.indexOf('.gwui-open-link {'))
    expect(rule.slice(0, 900)).toContain('min-height: 44px')
  })
})

describe('the suites toggle and the feedback trigger (already fixed, proven here so nobody re-breaks them)', () => {
  /* Since 21 October the switch answers 44px tall at every width, through the shared tap target in index.css. */
  it('the toggle answers 44px tall, past its own visible pill', () => {
    expect(INDEX_CSS).toMatch(/\.gwui-toggle::after,[^{]*\{\s*content: ''; position: absolute; left: 0; right: 0; top: 50%; height: max\(100%, 44px\);/)
  })

  it('the page reserves room at the foot so the feedback trigger never covers the last line', () => {
    const shell = readFileSync(join(__dirname, 'AppShell.tsx'), 'utf8')
    expect(shell).toMatch(/padding-bottom:\s*calc\(180px/)
  })
})
