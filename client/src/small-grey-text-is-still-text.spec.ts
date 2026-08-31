import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * THE LEAST READABLE COLOUR WAS ON THE SMALLEST TEXT.
 *
 * `--gw-muted` carries the 10 and 11px material: section labels, "no report yet", the metadata row
 * under a check-in title, the counts on the dashboard. It was #9B9590, which measures 2.51 against
 * --gw-bg, 2.67 against --gw-paper-2, 2.84 against --gw-paper and 2.96 against white - against the
 * 4.5 that normal-sized text needs.
 *
 * WHAT THE AUDIT SAID, AND WHY IT WAS WRONG. It called this a change across 867 token usages needing
 * a survey of which sit on which ground. Measuring first made it one line: the token fails on every
 * ground it is used on, so there is nothing to survey, and `--gw-sub` - flagged in the same breath -
 * already passes at 4.87 and is left alone.
 *
 * Checked before changing it that `--gw-muted` is never painted on a dark surface: zero of its
 * instances sit on one, because the rail carries its own colours. Nothing is made worse.
 *
 * Disabled controls keep it and that is deliberate: inactive components are outside SC 1.4.3, and
 * darkening them would make a dead button look live.
 */
const CSS = readFileSync(join(__dirname, 'index.css'), 'utf8')

const lum = (hex: string) => {
  const h = hex.replace('#', '')
  const [r, g, b] = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16) / 255)
  const f = (v: number) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}
const ratio = (a: string, b: string) => {
  const [x, y] = [lum(a), lum(b)]
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
}
const token = (name: string) => {
  const m = CSS.match(new RegExp(`--${name}:\\s*(#[0-9A-Fa-f]{6})`))
  expect(m, `token --${name} not found`).toBeTruthy()
  return m![1]
}

describe('small grey text is still text', () => {
  /* Every light surface the product paints text on. */
  const grounds = () => [token('gw-bg'), token('gw-paper'), token('gw-paper-2'), '#FFFFFF']

  it('finds the tokens, so a rename cannot silently pass this', () => {
    expect(token('gw-muted')).toMatch(/^#[0-9A-Fa-f]{6}$/)
    expect(grounds()).toHaveLength(4)
  })

  it('--gw-muted clears 4.5 on every ground it is used on', () => {
    for (const bg of grounds()) {
      expect(ratio(token('gw-muted'), bg), `muted on ${bg}`).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('--gw-sub does too, which is why it was not touched', () => {
    for (const bg of grounds()) {
      expect(ratio(token('gw-sub'), bg), `sub on ${bg}`).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('and --gw-text, the darkest, comfortably', () => {
    for (const bg of grounds()) expect(ratio(token('gw-text'), bg)).toBeGreaterThanOrEqual(7)
  })
})
