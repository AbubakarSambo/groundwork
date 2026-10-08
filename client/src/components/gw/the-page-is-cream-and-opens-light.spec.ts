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
  /*
   * ROUND 2, ITEM H: `--gw-paper-2` TAKEN OUT OF THIS LIST.
   *
   * `--gw-paper-2` used to be a distinct fill, darker than the page - the very thing that made it
   * the wrong colour for a page or band background everywhere else it was used (see "the darker
   * cream is the enterprise panel's alone" below). It is the page colour itself now, by design, so
   * it no longer belongs in this list.
   */
  it.each(['--gw-bg', '--gw-slate'])('%s, a fill, is warm and still darker than the page', (t) => {
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
    /*
     * THE FLOOR ONLY EVER SHRINKS, AS A PAGE MOVES ONTO THE SHARED PART.
     *
     * GroundParticipantPage.tsx carried five of its own `background: 'var(--gw-page)'` inline
     * styles (the loading, error, gone and "not in this check-in" states, plus its own full-page
     * wrapper) - one file in this count, however many times it repeated the string. Group 3, piece
     * 5, part 9 moved every one of them onto the shared `gwui-page-shell` class (the same part
     * GroundAdminPage.tsx's own equivalent states already use), so this file no longer matches the
     * search at all and the floor drops by the one file it was. This still proves the search finds
     * real pages, not nothing: 14 files still paint themselves with the page colour inline.
     *
     * U.20: `NotFoundPage.tsx` moved its own one onto the shared `Page narrow` component too (the
     * small-states rebuild, F4-small-states), so the floor drops again, by that one file, to 13.
     *
     * DECISION 109, TASK 1: `StopMailPage.tsx`'s own hand-rolled cream wrapper (`<div style=
     * {{ minHeight: '100vh', ..., background: 'var(--gw-page)' }}>`) is gone too, replaced by
     * `AuthCard`, the same shared card its sibling `StopRemindersPage.tsx` already draws from. The
     * floor drops again, by that one file, to 12.
     *
     * B-047: `Arrival.tsx` itself (its own `background: 'var(--gw-page)'` full-page wrapper) is
     * deleted - its last caller, `JoinConfirmPage.tsx`, moved onto `Page narrow` + `Mark`
     * (`components/gw/ui`), the shared part this count is steadily moving every page onto. The
     * floor drops again, by that one file, to 11.
     */
    const onThePage = files.filter(f => /background: 'var\(--gw-page\)'/.test(readFileSync(f, 'utf8')))
    expect(onThePage.length).toBeGreaterThan(11)
  })
})

/**
 * ROUND 2, ITEM H: THE DARKER BEIGE IN PLACE OF THE PROTOTYPE'S CREAM.
 *
 * `--gw-paper-2` (#FAF5EA) was used as a full-page or sticky-band background in about 28 files -
 * a loading screen, a paywall, the participant's check-in page, and others - each rendering a
 * visibly darker cream than the prototype's #FDFBF6. Fixed at the one source (`--gw-paper-2` is
 * now #FDFBF6, the same as `--gw-page`) rather than in each file, so this guards the fix at both
 * ends: the token itself, and that nothing new picks the prototype's real #FAF5EA (now `--gw-band`)
 * for a page or band, since that would silently reintroduce the same bug with a different name.
 */
describe('the darker cream #FAF5EA is nowhere in the product', () => {
  /** The prototype uses #FAF5EA (--band) only on its marketing pages; in the product its
      Enterprise panel is --chat (#F7F1E5, our --gw-bg), docs/prototype/source/s16.js. */
  it('no file in the product uses #FAF5EA or a band token for it', () => {
    const offenders = files.filter(f => /#FAF5EA|--gw-band/i.test(strip(readFileSync(f, 'utf8')))).map(f => f.replace(SRC, ''))
    expect(offenders).toEqual([])
  })

  it('the Enterprise panel on /pricing is the prototype\'s chat cream, --gw-bg', () => {
    const pricing = strip(readFileSync(join(SRC, 'pages/billing/PricingPage.tsx'), 'utf8'))
    expect(pricing).toMatch(/Enterprise/)
    expect(pricing).toMatch(/background: 'var\(--gw-bg\)', border: '1\.5px solid var\(--gw-border\)'/)
  })

  it('no colour setting in index.css is #FAF5EA (a second name for it slipped past once, --gw-slate)', () => {
    const css = strip(readFileSync(join(SRC, 'index.css'), 'utf8'))
    expect(css).not.toMatch(/#FAF5EA/i)
  })

  it('index.css defines --gw-page and --gw-paper-2 as the same colour', () => {
    expect(hex('--gw-page')).toBe('#FDFBF6')
    expect(hex('--gw-paper-2')).toBe('#FDFBF6')
  })
})
