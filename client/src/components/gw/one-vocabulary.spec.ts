import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'
import { describe, it, expect } from 'vitest'

/**
 * ONE PALETTE AND ONE HEADING, IN THE APP AS WELL AS THE SITE. W14-8.
 *
 * The marketing site turned out to be using the product's colours as 538 unnamed literals. The app
 * was doing the same thing to itself: 1240 hex literals, and the commonest ones were exactly the
 * tokens sitting in `index.css` a few files away. #E2E0DB 138 times, #0C447C 118, #9B9590 107.
 *
 * There was no second design language anywhere. There was one language nobody had written down, so
 * it drifted in the two places drift is invisible: an off-white two shades off, and a component
 * re-implemented slightly worse than the one that already existed.
 *
 * The report is the case that mattered. It hand-rolled its own uppercase section heading - 10.5px,
 * muted, a plain div with no heading semantics - while the kit's `Sec`, lifted out of BoardPage
 * because the board is the best-written page in the product, was 12.5px, sub, and a real `<h2>`.
 * Two components for one job, the worse one on the document this whole system exists to produce.
 */
const SRC = join(__dirname, '../..')
const files: string[] = []
const walk = (dir: string) => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p)
    else if (/\.tsx?$/.test(name) && !name.includes('.spec.')) files.push(p)
  }
}
walk(SRC)
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

describe('the palette is named', () => {
  const TOKENS = readFileSync(join(SRC, 'index.css'), 'utf8')

  it('index.css carries the tokens the pages reference', () => {
    for (const t of ['--gw-text', '--gw-navy', '--gw-sub', '--gw-muted', '--gw-border', '--gw-paper', '--gw-paper-2']) {
      expect(TOKENS).toContain(t)
    }
  })

  it('and the same two off-whites as the marketing site, by the same names', () => {
    /**
     * The app and the site can now be read against each other, which was the point. If these two
     * drift apart again the product and its landing page stop being the same product.
     */
    const site = readFileSync(join(SRC, '../../marketing/src/styles/global.css'), 'utf8')
    for (const t of ['--gw-paper:', '--gw-paper-2:']) {
      expect(site).toContain(t)
      expect(TOKENS).toContain(t)
    }
  })

  /** The colours that were the same value as a token, typed out instead. */
  const RETIRED = ['#E2E0DB', '#0C447C', '#9B9590', '#6B6560', '#1A1916', '#F5F3EF', '#EDECEA']

  it('no page writes a token\'s value as a literal', () => {
    const offenders: string[] = []
    for (const f of files) {
      const code = strip(readFileSync(f, 'utf8')).toUpperCase()
      for (const hex of RETIRED) if (code.includes(hex)) offenders.push(`${f.replace(SRC, '')} ${hex}`)
    }
    expect(offenders).toEqual([])
  })

  it('and no var() carries a hex fallback', () => {
    /**
     * `var(--gw-green-bg, #E8F8F5)` is a second opinion about a colour that already has one, and the
     * fallback is what you get on the day somebody renames the token - silently, in one place.
     */
    const offenders: string[] = []
    for (const f of files) {
      if (/var\(--gw-[a-z0-9-]+,\s*#[0-9A-Fa-f]{6}\)/.test(strip(readFileSync(f, 'utf8')))) offenders.push(f.replace(SRC, ''))
    }
    expect(offenders).toEqual([])
  })
})

describe('the heading comes from the kit', () => {
  const REPORT = strip(readFileSync(join(SRC, 'pages/report/ReportPage.tsx'), 'utf8'))

  it('the report\'s section heading delegates rather than re-implementing', () => {
    expect(REPORT).toMatch(/import \{ Sec \} from '@\/components\/gw\/kit'/)
    expect(REPORT).toMatch(/return <Sec title=\{String\(children\)\} \/>/)
  })

  it('and no longer carries its own values for it', () => {
    // The exact numbers that made the report's headings a slightly worse copy of the board's.
    expect(REPORT).not.toMatch(/letterSpacing: '\.09em'/)
  })

  it('settings uses it too, rather than a sixth copy of the same label', () => {
    const S = strip(readFileSync(join(SRC, 'pages/settings/SettingsPage.tsx'), 'utf8'))
    expect(S).toMatch(/<Sec title="Your data" \/>/)
    expect(S).not.toMatch(/letterSpacing: '\.06em'/)
  })
})
