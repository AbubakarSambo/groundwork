import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'
import { describe, it, expect } from 'vitest'

/**
 * A1, LOOK AND LAYOUT: THE PAGE A PERSON SEES BEHIND EVERYTHING.
 *
 * The design system (docs/prototype/screens/A1-look-and-layout/design-system.jpg) puts every page
 * on "Paper", a cream so light it is nearly white, with "Rule" lines in the same warm family:
 * "cream and white, no grey". The product's page was a warm grey, #EDECEA, and its lines were grey.
 *
 * It also says the app "opens in light mode". Nothing said so, so a phone set to dark mode could
 * paint the form controls and scrollbars dark under a page whose colours are all light ones.
 *
 * These read the real stylesheet, the real index.html and every page, because the page colour is
 * decided in all three.
 */
const SRC = join(__dirname, '../..')
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
const CSS = strip(readFileSync(join(SRC, 'index.css'), 'utf8'))
const HTML = readFileSync(join(SRC, '../index.html'), 'utf8')

const hex = (name: string) => {
  const m = CSS.match(new RegExp(`${name}:\\s*(#[0-9A-Fa-f]{6})`))
  if (!m) throw new Error(`${name} is not defined as a hex in index.css`)
  return m[1].toUpperCase()
}
const rgb = (h: string) => [0, 2, 4].map(i => parseInt(h.replace('#', '').slice(i, i + 2), 16))
/** Warm, not grey: red above green above blue, by a margin a person can see. */
const isWarm = (h: string) => {
  const [r, g, b] = rgb(h)
  return r >= g && g >= b && r - b >= 6
}
const lightness = (h: string) => rgb(h).reduce((a, c) => a + c, 0) / 3

const files: string[] = []
const walk = (dir: string) => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p)
    else if (/\.tsx$/.test(name) && !name.includes('.spec.')) files.push(p)
  }
}
walk(SRC)

describe('the app opens in light mode', () => {
  it('the stylesheet says so on the root', () => {
    const root = CSS.slice(CSS.indexOf(':root {'), CSS.indexOf('}', CSS.indexOf(':root {')))
    expect(root).toMatch(/color-scheme:\s*light;/)
  })

  it('and so does the page itself, before any stylesheet has loaded', () => {
    expect(HTML).toMatch(/<meta name="color-scheme" content="light"/)
  })

  it('and nothing turns it dark because the phone is set to dark', () => {
    // A dark theme for someone who chooses it is its own piece of work. Following the phone's
    // setting by default is exactly what "opens in light mode" rules out.
    expect(CSS).not.toMatch(/prefers-color-scheme:\s*dark/)
  })
})

describe('the page is cream, not grey', () => {
  it('the body sits on the page colour', () => {
    const body = CSS.slice(CSS.indexOf('\nbody {'), CSS.indexOf('}', CSS.indexOf('\nbody {')))
    expect(body).toMatch(/background:\s*var\(--gw-page\);/)
  })

  it('the page colour is a warm near-white, lighter than the fill that sits inside cards', () => {
    const page = hex('--gw-page')
    expect(isWarm(page)).toBe(true)
    expect(lightness(page)).toBeGreaterThan(245)
    // The fill inside a white card has to stay visibly darker than the page, or it disappears.
    expect(lightness(page)).toBeGreaterThan(lightness(hex('--gw-bg')))
  })

  it('the lines between things are warm too', () => {
    expect(isWarm(hex('--gw-border'))).toBe(true)
    expect(hex('--gw-line')).toBe(hex('--gw-border'))
  })

  it('and no rule in the stylesheet still types the old grey line', () => {
    const rules = CSS.split('\n').filter(l => !/^\s*--/.test(l))
    expect(rules.filter(l => /#E2E0DB/i.test(l))).toEqual([])
  })
})

describe('the fills inside cards and the secondary text are cream and brown, not grey', () => {
  it.each(['--gw-bg', '--gw-paper-2', '--gw-slate'])('%s, a fill, is warm and still darker than the page', (t) => {
    expect(isWarm(hex(t))).toBe(true)
    expect(lightness(hex(t))).toBeLessThan(lightness(hex('--gw-page')))
  })

  it.each(['--gw-sub', '--gw-muted', '--gw-rule-2'])('%s is warm', (t) => {
    expect(isWarm(hex(t))).toBe(true)
  })

  it('secondary text is the design system\'s "Muted", and the fainter text stays the darker of the two it could be', () => {
    // The prototype's Muted, copied exactly because it reads at 9.7:1.
    expect(hex('--gw-sub')).toBe('#4E4236')
    // Fainter text must stay lighter than secondary text, or the two stop meaning different things.
    expect(lightness(hex('--gw-muted'))).toBeGreaterThan(lightness(hex('--gw-sub')))
  })

  it('and no rule in the stylesheet still types one of the old greys', () => {
    const rules = CSS.split('\n').filter(l => !/^\s*--/.test(l))
    const OLD = ['#EDECEA', '#F5F3EF', '#9B9590', '#6B6560', '#D8D5CF']
    expect(rules.filter(l => OLD.some(h => l.toUpperCase().includes(h)))).toEqual([])
  })
})

describe('every page is painted with the page colour, not the card fill', () => {
  /**
   * `--gw-bg` used to be the page as well as the fill inside cards. A full-page wrapper still
   * painting itself with it would show a grey page in the middle of a cream app, which is exactly
   * the patchwork this change is here to remove.
   */
  it('no full-page wrapper paints itself with --gw-bg', () => {
    const offenders: string[] = []
    for (const f of files) {
      const lines = strip(readFileSync(f, 'utf8')).split('\n')
      lines.forEach((l, i) => {
        if (/minHeight: '100d?vh'|height: 'calc\(100dvh/.test(l) && /background: 'var\(--gw-bg\)'/.test(l)) {
          offenders.push(`${f.replace(SRC, '')}:${i + 1}`)
        }
      })
    }
    expect(offenders).toEqual([])
  })

  it('and the search above is finding real pages, so it cannot pass on nothing', () => {
    const onThePage = files.filter(f => /background: 'var\(--gw-page\)'/.test(readFileSync(f, 'utf8')))
    expect(onThePage.length).toBeGreaterThan(15)
  })
})
