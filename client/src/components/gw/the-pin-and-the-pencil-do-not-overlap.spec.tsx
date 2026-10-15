import { describe, it, expect } from 'vitest'
import { render, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { readFileSync } from 'fs'
import { join } from 'path'
import { AppShell } from './AppShell'
import { useAuthStore } from '@/stores/auth'

/**
 * A TAP ON THE PIN LANDS ON THE PIN.
 *
 * The reviewer found that a lead or admin could not pin: the rename pencil's tap area (an ::after
 * reaching 15px to its left) covered the pin, so document.elementFromPoint at the middle of the pin
 * returned the rename button, and a tap opened the rename box. `.click()` on the pin element passed
 * all along, because it never asks what is under a finger.
 *
 * jsdom does no layout, so this lays the row out from the real stylesheet: each button's width, the
 * gap between them, and any pseudo-element that widens a button past its own box. It then asks, as
 * elementFromPoint would, which button owns the middle of each one. The same check was made in the
 * running app with elementFromPoint; see the commit.
 */
const CSS = readFileSync(join(__dirname, '../../index.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/** Every declaration that applies to `cls` on a rail row, later rules winning, as the browser does. */
function declsFor(cls: 'gw-pin' | 'gw-rename'): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [, sel, body] of CSS.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
    const sels = sel.split(',').map(s => s.trim())
    if (!sels.some(s => s === `.${cls}` || s === `.gw-rail-row .${cls}`)) continue
    for (const d of body.split(';')) {
      const [k, ...v] = d.split(':')
      if (k && v.length) out[k.trim()] = v.join(':').trim()
    }
  }
  return out
}

/** How far a pseudo-element stretches a button past its left and right edges, in px. */
function reach(cls: string): { left: number; right: number } {
  let left = 0, right = 0
  for (const [, body] of CSS.matchAll(new RegExp(`\\.${cls}::(?:after|before)\\s*\\{([^}]*)\\}`, 'g'))) {
    const inset = body.match(/inset:\s*(-?\d+)px(?:\s+(-?\d+)px)?/)
    if (inset) { const h = Number(inset[2] ?? inset[1]); left = Math.max(left, -h); right = Math.max(right, -h) }
  }
  return { left, right }
}

const px = (v: string | undefined) => Number((v ?? '0').replace('px', '')) || 0

describe('the pin and the rename pencil on a sidebar row', () => {
  it('sit side by side, pin first, as the row is drawn for a lead', () => {
    useAuthStore.setState({ user: { id: 'u-lead', firstName: 'Hafsah', lastName: 'Jumare', role: 'MEMBER', organizationName: 'Coamana' }, token: 't', isAuthenticated: true } as any)
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } })
    /* B-202 (review round 3): AppShell now waits for the same ['my-waiting'] read RequireOrgSetup
    already makes before it mounts the sidebar at all - without this cached answer the real
    authApi.myWaiting (not mocked in this file) would be asked for real. */
    qc.setQueryData(['my-waiting'], { waiting: false })
    qc.setQueryData(['grounds'], [{ id: 'g1', label: 'Coamana growth, Q3', status: 'AWAITING_PARTIES', initiatorId: 'u-lead', participants: [], checkIns: [] }])
    qc.setQueryData(['my-organizations'], [])
    const { container } = render(
      <QueryClientProvider client={qc}><MemoryRouter><AppShell><div /></AppShell></MemoryRouter></QueryClientProvider>,
    )
    const rail = container.querySelector('.gw-sidebar-desktop') as HTMLElement
    const pin = within(rail).getByRole('button', { name: 'Pin Coamana growth, Q3 to the top' })
    const pencil = within(rail).getByRole('button', { name: 'Rename Coamana growth, Q3' })
    expect(pin.nextElementSibling).toBe(pencil)
    // Together, in the row's own group of buttons, which sits over the right of the row.
    expect(pin.parentElement).toHaveClass('gw-row-acts')
    expect(pin.parentElement!.parentElement).toHaveClass('gw-rail-row')
  })

  it('and the middle of each is its own, not the other\'s', () => {
    const pinD = declsFor('gw-pin'), penD = declsFor('gw-rename')
    const rowGap = px(CSS.match(/\.gw-rail-row \{[^}]*gap:\s*(\d+px|0)/)?.[1])
    const pinW = px(pinD.width), penW = px(penD.width)
    expect(pinW).toBeGreaterThanOrEqual(32)
    expect(penW).toBeGreaterThanOrEqual(32)

    // Lay the row out: the pin from 0, the pencil after the gap.
    const pinBox = { from: 0 - reach('gw-pin').left, to: pinW + reach('gw-pin').right }
    const penStart = pinW + rowGap
    const penBox = { from: penStart - reach('gw-rename').left, to: penStart + penW + reach('gw-rename').right }
    const pinMiddle = pinW / 2
    const penMiddle = penStart + penW / 2

    // The later sibling is painted on top, so the pencil wins wherever the two boxes overlap.
    const ownerAt = (x: number) => (x >= penBox.from && x <= penBox.to ? 'pencil' : x >= pinBox.from && x <= pinBox.to ? 'pin' : 'nothing')
    expect(ownerAt(pinMiddle)).toBe('pin')
    expect(ownerAt(penMiddle)).toBe('pencil')
    // And no part of the pin's own box is covered.
    expect(penBox.from).toBeGreaterThanOrEqual(pinW)
  })

  it('both are the full height of the row, so a thumb does not have to be exact', () => {
    expect(px(declsFor('gw-pin').height)).toBe(36)
    expect(px(declsFor('gw-rename').height)).toBe(36)
  })

  it('and until the row is pointed at or focused they take no width from the name', () => {
    /*
     * Found in the final review at 1440px: two 32px buttons always in the row, plus "Your turn",
     * left the name about 57px, so "Coamana growth, Q3 paying customers" broke mid-word.
     */
    const acts = CSS.match(/\.gw-row-acts \{([^}]*)\}/)![1]
    expect(acts).toMatch(/position: absolute/)
    expect(acts).toMatch(/opacity: 0/)
    expect(acts).toMatch(/pointer-events: none/)
    expect(CSS).toMatch(/\.gw-rail-row:hover \.gw-row-acts, \.gw-rail-row:focus-within \.gw-row-acts \{ opacity: 1; pointer-events: auto; \}/)
  })

  it('on a touch screen, with no hover, they are in the row and can be tapped', () => {
    expect(CSS).toMatch(/@media \(hover: none\) \{\s*\.gw-row-acts \{ position: static; opacity: 1; pointer-events: auto;/)
  })

  it('the name keeps room for whole words, and breaks only between them', () => {
    const nm = CSS.match(/\.gw-ci-nm \{([^}]*)\}/)![1]
    expect(nm).toMatch(/min-width: 110px/)
    expect(nm).toMatch(/word-break: normal/)
    expect(nm).not.toMatch(/overflow-wrap: anywhere/)
    // When the name and the badge do not fit side by side, the badge goes under the name.
    expect(CSS).toMatch(/\.gw-ci-row \{[^}]*flex-wrap: wrap/)
  })

  it('while they show, the badge hides completely, and a row without one keeps room so no word is covered', () => {
    /*
     * Found in the final review, hovering at 1440px: the buttons covered the end of the row, so
     * Hafsah's "Your turn" showed only "Y" and Sahar's name read "Coamana growth, Q3 p".
     */
    expect(CSS).toMatch(/\.gw-rail-row:hover \.gw-rail-bdg, \.gw-rail-row:focus-within \.gw-rail-bdg \{ visibility: hidden; \}/)
    // visibility, not display: the badge keeps its space, so the row does not jump on hover.
    expect(CSS).not.toMatch(/\.gw-rail-row:hover \.gw-rail-bdg[^{]*\{[^}]*display: none/)
    // A row with no badge keeps its buttons' room all the time, so the name wraps the same on hover.
    expect(CSS).toMatch(/@media \(hover: hover\) \{\s*\.gw-ci-row\.keeps-room \{ padding-right: calc\(var\(--gw-acts-w, 64px\) \+ 8px\); \}/)
  })

  it('as drawn: a lead\'s own row with no badge keeps 64px for the pin and pencil; a row saying "Your turn" does not need to', () => {
    /*
     * UPDATED FOR DECISION 119, H10 (8 October 2026). This used to make "Coamana growth" a check-in
     * u-sahar merely administered (initiatorId: 'u-lead'), to show an admin's row keeping room for
     * both buttons. H10 means an admin who does not run a check-in is no longer shown the pencil at
     * all while its lead is still here (see who-may-rename-a-check-in.ts), so that row would now
     * reserve only 32px, not the 64px this test is about. Made u-sahar the lead of her own row
     * instead - the layout question (two 32px buttons reserve 64px together) is unchanged by H10;
     * only who gets to see both is.
     */
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } })
    /* B-202 (review round 3): AppShell now waits for the same ['my-waiting'] read RequireOrgSetup
    already makes before it mounts the sidebar at all - without this cached answer the real
    authApi.myWaiting (not mocked in this file) would be asked for real. */
    qc.setQueryData(['my-waiting'], { waiting: false })
    qc.setQueryData(['grounds'], [
      { id: 'g1', label: 'Coamana growth, Q3 paying customers', status: 'AWAITING_PARTIES', initiatorId: 'u-sahar', participants: [], checkIns: [] },
      { id: 'g2', label: 'Leadership, Q3', status: 'AWAITING_PARTIES', initiatorId: 'u-x', participants: [{ id: 'p', userId: 'u-sahar' }], checkIns: [{ participantId: 'p', sessionNumber: 1, status: 'IN_PROGRESS' }] },
    ])
    qc.setQueryData(['my-organizations'], [])
    useAuthStore.setState({ user: { id: 'u-sahar', firstName: 'Sahar', lastName: 'Ali', role: 'ADMIN', organizationName: 'Coamana' }, token: 't', isAuthenticated: true } as any)
    const { container } = render(<QueryClientProvider client={qc}><MemoryRouter><AppShell><div /></AppShell></MemoryRouter></QueryClientProvider>)
    const rows = [...container.querySelectorAll('.gw-sidebar-desktop a.gw-ci-row')] as HTMLElement[]
    const byName = (n: string) => rows.find(r => r.textContent?.startsWith(n))!
    const plain = byName('Coamana growth')
    expect(plain).toHaveClass('keeps-room')
    expect(plain.style.getPropertyValue('--gw-acts-w')).toBe('64px')
    const withBadge = byName('Leadership, Q3')
    expect(withBadge).toHaveTextContent('Your turn')
    expect(withBadge).not.toHaveClass('keeps-room')
  })

  it('on a touch screen, where the buttons sit in the row, the badge stays', () => {
    const touch = CSS.slice(CSS.indexOf('@media (hover: none) {\n  .gw-row-acts'))
    expect(touch).toMatch(/\.gw-rail-bdg \{ visibility: visible; \}/)
  })
})
