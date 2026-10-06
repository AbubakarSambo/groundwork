import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * THE FEEDBACK SHEET SITS ON THE SCREEN, FROM EDGE TO EDGE ON A PHONE.
 *
 * Measured at 375px: the sheet ran from -20 to 355 and its "Cancel" was cut off. The cause was not in
 * the panel's own code: an old `.gw-fb-panel` rule in index.css, left from an earlier feedback widget
 * with the same class name, still said `position: fixed; bottom: 80px; right: 20px`. The inline
 * `width: 100%` beat its 320px, but nothing undid `right: 20px`, so a full-width sheet was pinned 20px
 * from the right. On a computer the same rule held the panel in the bottom-right corner instead of
 * the middle of its overlay.
 *
 * Today's panel is placed by its overlay alone: centred on a computer, a bottom sheet on a phone. So
 * nothing may give the panel a position of its own.
 */
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '')
const CSS = strip(readFileSync(join(__dirname, '../../index.css'), 'utf8'))
const SHELL = readFileSync(join(__dirname, 'AppShell.tsx'), 'utf8')
const POSITIONING = /(^|;|\s)(position|left|right|top|bottom|inset|transform|margin(-left|-right)?)\s*:/

/** Every declaration block whose selector names the panel. */
function panelRules(css: string): string[] {
  return [...css.matchAll(/([^{}]+)\{([^}]*)\}/g)]
    .filter(([, sel]) => /\.gw-fb-panel\b/.test(sel))
    .map(([, sel, body]) => `${sel.trim()} { ${body.trim()} }`)
}

describe('the feedback sheet sits on the screen', () => {
  it('no rule in the stylesheet positions the panel', () => {
    expect(panelRules(CSS).filter(r => POSITIONING.test(r.slice(r.indexOf('{'))))).toEqual([])
  })

  it('nor does the phone rule, which only turns it into a bottom sheet', () => {
    const phone = SHELL.slice(SHELL.indexOf('@media (max-width: 640px)'), SHELL.indexOf('@media (min-width: 641px)'))
    const rules = panelRules(phone)
    expect(rules.length).toBeGreaterThan(0)
    expect(rules.filter(r => POSITIONING.test(r.slice(r.indexOf('{'))))).toEqual([])
    // The overlay it sits in has no padding on a phone, so a width: 100% panel meets both edges.
    expect(phone).toMatch(/\.gw-fb-overlay\s*\{[^}]*padding: 0 !important/)
  })

  it('and the panel itself is as wide as its overlay allows, and no wider', () => {
    const panel = SHELL.match(/className="gw-fb-panel" style=\{\{([^}]*)\}\}/)![1]
    expect(panel).toMatch(/width: '100%'/)
    expect(panel).toMatch(/maxWidth: 480/)
    expect(panel).not.toMatch(/position:|right:|left:/)
  })
})
