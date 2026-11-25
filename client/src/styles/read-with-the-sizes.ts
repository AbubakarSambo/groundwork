import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * A STYLESHEET, READ WITH THE SIX SIZES FILLED IN (page audit, 24 November 2026).
 *
 * Since every font size in the shared stylesheets is read from tokens.css (`font-size: var(--ds-text-secondary)`), a spec that checks
 * a part's size reads the stylesheet through this, so `.tag{font-size:var(--ds-text-secondary)}` is checked as `.tag{font-size:14px}`:
 * the size the computer draws (at its widest; on a phone only the page title changes, to 24px). The tokens stay the one source.
 */
const TOKENS = readFileSync(join(__dirname, 'tokens.css'), 'utf8')
const desktop = TOKENS.slice(0, TOKENS.indexOf('@media'))
const SIZES = new Map([...desktop.matchAll(/(--ds-text-[\w-]+):\s*([0-9.]+px);/g)].map((m) => [m[1], m[2]]))

export function withTheSizes(css: string): string {
  return css.replace(/var\((--ds-text-[\w-]+)\)/g, (whole, name: string) => SIZES.get(name) ?? whole)
}
