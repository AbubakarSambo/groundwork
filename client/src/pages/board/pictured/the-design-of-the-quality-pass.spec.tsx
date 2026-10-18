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
const rule = (css: string, selector: string) => {
  const at = css.indexOf(`${selector} {`)
  return at < 0 ? '' : css.slice(at, css.indexOf('}', at) + 1)
}

describe('the design of the quality pass', () => {
  it('D-2: "Every session" is the prototype’s .btn.sec (an inset rule, no border), and "Something here isn’t right" is 44px tall', () => {
    expect(rule(BOARD, '.pb-wide-btn')).toMatch(/border: 0;/)
    expect(rule(BOARD, '.pb-wide-btn')).toMatch(/box-shadow: inset 0 0 0 1\.5px var\(--gw-rule-2\)/)
    expect(rule(BOARD, '.pb-own-wrong')).toMatch(/min-height: 44px/)
    expect(BOARD).not.toMatch(/\.pb-decides button \{/)
  })

  it('D-4: no shadow on a button or a card; the feedback button and a check-in card keep none, nor does the saved-card box', () => {
    for (const sel of ['.gw-feedback-btn', '.gw-fb-btn', '.gw-fb-btn:hover', '.gw-ground-card:hover']) expect(rule(INDEX, sel)).not.toMatch(/box-shadow|transform/)
    expect(rule(UI, '.gwui-ec-savecard-confirm-box')).not.toMatch(/box-shadow/)
  })

  it('D-5, D-6: names and figures in the name face at weight 500, with lining figures, never the serif nobody defined', () => {
    expect(BOARD + WEEK).not.toMatch(/--gw-serif/)
    for (const [css, sel] of [[BOARD, '.pb-own-title'], [BOARD, '.pb-own-story'], [BOARD, '.pb-fills-in h2'], [WEEK, '.wr-tile b']] as const) {
      expect(rule(css, sel)).toMatch(/font-family: var\(--gw-font-name\)/)
      expect(rule(css, sel)).toMatch(/font-weight: 500/)
    }
    expect(rule(BOARD, '.pb-answer')).toMatch(/font-variant-numeric: lining-nums/)
    expect(rule(WEEK, '.wr-tile b')).toMatch(/font-variant-numeric: lining-nums/)
    expect(rule(UI, '.gwui-pt-title')).toMatch(/font-variant-numeric: lining-nums/)
  })

  it('D-7: a stage and where a thing comes from are the prototype’s .tag', () => {
    expect(rule(BOARD, '.pb-step')).toMatch(/min-height: 26px; padding: 0 10px; border-radius: 13px; font-size: 13\.5px; font-weight: 700/)
    expect(rule(WEEK, '.wr-row .wr-from')).toMatch(/min-height: 26px/)
  })

  it('D-8: the gap heading wraps in balanced lines', () => {
    expect(rule(BOARD, '.pb-gap-h')).toMatch(/text-wrap: balance/)
  })
})

