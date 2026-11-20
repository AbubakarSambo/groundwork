import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * HAFSAH'S QUALITY PASS OF 18 OCTOBER, SECTION 8: THE DESIGN AGAINST THE PROTOTYPE'S OWN CSS (docs/prototype/Groundwork___prototype.html:
 * .btn, .btn.sec, .btn.quiet, .tag, .t-title). Each rule is read from the stylesheet the page loads, comments taken out.
 */
const read = (...p: string[]) => readFileSync(join(__dirname, ...p), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
const BOARD = read('pictured-board.css')
const WEEK = read('..', '..', 'report', 'weekly-report.css')
const UI = read('..', '..', '..', 'components', 'gw', 'ui', 'gw-ui.css')
const INDEX = read('..', '..', '..', 'index.css')
const PROTO = read('..', '..', '..', 'styles', 'prototype.css')
const PRODUCT = read('..', '..', '..', 'styles', 'product.css')
const rule = (css: string, selector: string) => {
  const at = css.indexOf(`${selector} {`)
  return at < 0 ? '' : css.slice(at, css.indexOf('}', at) + 1)
}

describe('the design of the quality pass', () => {
  it('D-2: "Every session" is the prototype’s .btn.sec (an inset rule, no border), and "Something here isn’t right" is 44px tall', () => {
    expect(rule(BOARD, '.pb-wide-btn')).toMatch(/border: 0;/)
    expect(rule(BOARD, '.pb-wide-btn')).toMatch(/box-shadow: inset 0 0 0 1px var\(--rule2-crisp\)/)
    /* 24 October: "Something here isn't right" is the prototype's own .btn.quiet now (one stylesheet, the prototype's). */
    expect(PROTO).toMatch(/\.btn\{min-height:44px/)
    expect(BOARD).not.toMatch(/\.pb-decides button \{/)
  })

  it('D-4: no shadow on a button or a card; the feedback button and a check-in card keep none, nor does the saved-card box', () => {
    for (const sel of ['.gw-feedback-btn', '.gw-fb-btn', '.gw-fb-btn:hover', '.gw-ground-card:hover']) expect(rule(INDEX, sel)).not.toMatch(/box-shadow|transform/)
    expect(rule(UI, '.gwui-ec-savecard-confirm-box')).not.toMatch(/box-shadow/)
  })

  it('D-5, D-6: names and figures in the name face at weight 500, with lining figures, never the serif nobody defined', () => {
    expect(BOARD + WEEK).not.toMatch(/--gw-serif/)
    /* 24 October: your own report's title is the prototype's .t-title and its story .gw-story (styles/product.css). */
    expect(PROTO).toMatch(/\.t-title\{color:var\(--ink\);font-family:var\(--name\)[^}]*font-weight:500/)
    for (const [css, sel] of [[PRODUCT, '.gw-story'], [BOARD, '.pb-fills-in h2'], [WEEK, '.wr-tile b']] as const) {
      expect(rule(css, sel)).toMatch(/font-family: var\(--(gw-font-)?name\)/)
      if (sel !== '.gw-story') expect(rule(css, sel)).toMatch(/font-weight: 500/)
    }
    expect(rule(BOARD, '.pb-answer')).toMatch(/font-variant-numeric: lining-nums/)
    expect(rule(WEEK, '.wr-tile b')).toMatch(/font-variant-numeric: lining-nums/)
    expect(rule(PRODUCT, '.t-title, .t-greet')).toMatch(/font-variant-numeric: lining-nums/)
  })

  it('D-7: a stage and where a thing comes from are the prototype’s .tag', () => {
    expect(rule(BOARD, '.pb-step')).toMatch(/min-height: 26px; padding: 0 8px; border-radius: 999px; font-size: 14px; font-weight: 700/)
    /* 24 October: where a thing to do next week comes from is the prototype's own .tag.plain. */
    expect(PROTO).toMatch(/\.tag\{[^}]*min-height:26px/)
  })

  it('D-8: the gap heading wraps in balanced lines', () => {
    expect(rule(BOARD, '.pb-gap-h')).toMatch(/text-wrap: balance/)
  })
})

