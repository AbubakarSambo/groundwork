import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * THE FEEDBACK FORM OPENS IN THE MIDDLE OF THE SCREEN.
 *
 * "the feedback bottom still opens as a card in the bottom and not the center of the screen, we
 * were meant to have address this." Twice now.
 *
 * The overlay was a phone bottom sheet drawn on every screen: `alignItems: 'flex-end'`, a radius on
 * the top two corners only, and full width. On a laptop that puts the form against the bottom edge,
 * half a screen from the button that opened it and from whatever the person is reacting to.
 *
 * A bottom sheet is still right on a phone - thumb reach, and no middle to speak of - so the shape
 * is a narrow-screen rule rather than the default. This pins both halves: the default is centred,
 * and the sheet only comes back under a max-width query.
 */
const SRC = readFileSync(join(__dirname, 'AppShell.tsx'), 'utf8')
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

/** The overlay's own declaration, so nothing else in a 1,400-line file can satisfy these. */
const OVERLAY = (() => {
  const i = SRC.indexOf("{open && (")
  expect(i).toBeGreaterThan(-1)
  return strip(SRC.slice(i, i + 1800))
})()

describe('the feedback panel opens centred, not wedged against the bottom', () => {
  it('found the overlay, so an empty slice cannot pass these', () => {
    expect(OVERLAY).toContain("position: 'fixed'")
    expect(OVERLAY).toContain('maxWidth: 480')
  })

  it('is centred by default rather than bottom-aligned', () => {
    expect(OVERLAY).toMatch(/alignItems: 'center'/)
    expect(OVERLAY).not.toMatch(/alignItems: 'flex-end'/)
  })

  it('and is a card on all four corners, not a sheet with two', () => {
    expect(OVERLAY).not.toMatch(/borderRadius: '12px 12px 0 0'/)
    expect(OVERLAY).toMatch(/borderRadius: 12\b/)
  })

  /** Centred and touching the edge is the same complaint at a different offset. */
  it('and never touches the edge of the screen', () => {
    expect(OVERLAY).toMatch(/padding: 16/)
  })

  it('but a phone still gets the sheet, because reach is real there', () => {
    const css = strip(SRC.slice(SRC.indexOf('@media (max-width: 640px)')))
    expect(css).toMatch(/\.gw-fb-overlay\s*\{[^}]*align-items: flex-end/)
    expect(css).toMatch(/\.gw-fb-panel\s*\{[^}]*border-radius: 12px 12px 0 0/)
  })
})
