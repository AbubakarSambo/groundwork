import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

/**
 * "WHAT NOW?" GIVES YOU SOMETHING TO PRESS.
 *
 * It was three paragraphs under that heading - share the report, act on the areas, open a follow-up -
 * telling somebody to act and handing them nothing to act with. One of them said "use the report
 * link" on a page that IS the link.
 *
 * Two of the three are things this page can simply do, so they are buttons. The third - pick the gap
 * that matters and agree who owns it - is not a button and never could be: it is work between people.
 * It stays as one sentence, and it sits BELOW the controls so the page leads with what it can offer
 * rather than with what it cannot.
 */
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CODE = readFileSync(path.join(__dirname, 'GroundAdminPage.tsx'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '')

const BLOCK = (() => {
  const i = CODE.indexOf('What now?')
  expect(i).toBeGreaterThan(-1)
  return CODE.slice(i, i + 2600)
})()

describe('what now is buttons', () => {
  it('offers the link to the report, from the page that is the report', () => {
    expect(BLOCK).toContain('Copy the link to this report')
    expect(BLOCK).toContain('?tab=report')
  })

  it('and offers the follow-up check-in', () => {
    expect(BLOCK).toContain('Open a follow-up check-in')
    expect(BLOCK).toMatch(/navigate\('\/grounds\/new'\)/)
  })

  /** The prose that told people to do what the buttons now do is gone. */
  it('no longer instructs where it can act', () => {
    expect(BLOCK).not.toContain('Use the report link or a shared doc')
    expect(BLOCK).not.toContain("title: 'Share the report'")
  })

  /**
   * The one thing that is genuinely not a control stays, and stays honest about being work rather
   * than a feature.
   */
  it('keeps the part no button can do', () => {
    expect(BLOCK).toMatch(/The part nobody can do for you/)
  })

  /** A copy that silently fails is worse than no button: the person walks away with nothing. */
  it('says so if the copy fails', () => {
    expect(BLOCK).toMatch(/catch \{[\s\S]{0,120}toast\.error/)
  })
})
