import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * PILOTS, 13 OCTOBER 2026, E1. Today with Ask open at 1280 kept its 340px side column beside the main one and left the main
 * one about 190px, so names wrapped letter by letter. Checked in the browser at 1440 (one column of 688px), 1280 (one column
 * of 528px) and 375 (Ask is its own page, no sideways scroll). This pins the rule that does it.
 */
describe('the page makes room for Ask', () => {
  const css = readFileSync(join(__dirname, 'gw-ui.css'), 'utf8')
  it('with Ask open, the side column goes under the main one up to 1500px wide', () => {
    expect(css).toMatch(/@media \(max-width: 1500px\) \{\s*body\.gwui-ask-open \.gwui-side \{ grid-template-columns: minmax\(0, 1fr\); \}\s*\}/)
  })
  it('and the page still keeps 400px clear for the panel', () => {
    expect(css).toContain('body.gwui-ask-open .gw-main-content { padding-right: 400px; }')
  })
})
