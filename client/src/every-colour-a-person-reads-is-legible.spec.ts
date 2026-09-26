import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * EVERY COLOUR SOMEBODY READS TEXT IN CLEARS 4.5:1 AGAINST THE GROUND IT SITS ON.
 *
 * WCAG AA for normal text. Two tokens did not: `--gw-clay` failed on every background in the
 * product (3.52 on the main one), and `--gw-green-t-soft` failed on that same background at 4.30.
 * Clay is also the background of the "Retry" button with white text on it, which was 4.16 - so the
 * same token was failing in both directions at once.
 *
 * THIS COMPUTES THE RATIO RATHER THAN PINNING THE HEX. A spec asserting `--gw-clay: #9F5447` would
 * pass forever and protect nothing: it would go red when somebody adjusted the shade by a point,
 * and stay green if they added a thirteenth token that failed. This reads the stylesheet, works out
 * the contrast, and fails on whichever token is actually unreadable - including ones not yet
 * written.
 */
const CSS = readFileSync(join(__dirname, 'index.css'), 'utf8')

/**
 * The grounds text actually sits on in this product, read from the stylesheet rather than typed
 * here. They were typed here, which meant that when the page moved from grey to cream this test went
 * on measuring every colour against a grey page nobody could see any more. `--gw-page` is the page
 * itself; `--gw-bg` is now the tinted fill inside cards.
 */
const GROUNDS = {
  card: '#FFFFFF',
  page: tokenValue('--gw-page'),
  bg: tokenValue('--gw-bg'),
  paper: tokenValue('--gw-paper'),
  slate: tokenValue('--gw-slate'),
}

/** Tokens used as a text colour somewhere. Add to this when a new one is. */
const TEXT_TOKENS = [
  '--gw-sub', '--gw-muted', '--gw-text', '--gw-ink', '--gw-navy', '--gw-green-t',
  '--gw-amber-t', '--gw-red-t', '--gw-clay', '--gw-danger', '--gw-sub-d', '--gw-green-t-soft',
]

function tokenValue(name: string): string {
  const m = CSS.match(new RegExp(`${name}:\\s*(#[0-9A-Fa-f]{6})`))
  if (!m) throw new Error(`${name} is not defined as a hex in index.css`)
  return m[1]
}

function relativeLuminance(hex: string): number {
  const h = hex.replace('#', '')
  const channels = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16) / 255)
  const [r, g, b] = channels.map(c => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrast(a: string, b: string): number {
  const [la, lb] = [relativeLuminance(a), relativeLuminance(b)]
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

describe('every colour a person reads is legible', () => {
  it('reads the real stylesheet, so an empty file cannot pass', () => {
    expect(CSS.length).toBeGreaterThan(2000)
    expect(TEXT_TOKENS.every(t => CSS.includes(t))).toBe(true)
  })

  it('every text token clears 4.5:1 on every background it can sit on', () => {
    const failures: string[] = []
    for (const token of TEXT_TOKENS) {
      const value = tokenValue(token)
      for (const [ground, groundHex] of Object.entries(GROUNDS)) {
        const ratio = contrast(value, groundHex)
        if (ratio < 4.5) failures.push(`${token} (${value}) on ${ground}: ${ratio.toFixed(2)}`)
      }
    }
    expect(failures).toEqual([])
  })

  it('and the tinted panels are legible against their own backgrounds', () => {
    const panels: [string, string][] = [
      ['--gw-green-t', '--gw-green-bg'],
      ['--gw-amber-t', '--gw-amber-bg'],
      ['--gw-red-t', '--gw-red-bg'],
      ['--gw-blue-t', '--gw-blue-bg'],
      ['--gw-clay', '--gw-clay-bg'],
    ]
    const failures: string[] = []
    for (const [text, bg] of panels) {
      const ratio = contrast(tokenValue(text), tokenValue(bg))
      if (ratio < 4.5) failures.push(`${text} on ${bg}: ${ratio.toFixed(2)}`)
    }
    expect(failures).toEqual([])
  })

  it('white text on clay clears it too, because clay is a button as well as a colour', () => {
    // The Retry button in the entry chat is white on clay. The same token was failing as text AND
    // as a background, which is the case a one-directional check would have missed.
    expect(contrast('#FFFFFF', tokenValue('--gw-clay'))).toBeGreaterThanOrEqual(4.5)
  })
})
