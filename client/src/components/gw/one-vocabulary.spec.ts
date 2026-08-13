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


describe('no colour is shared between pages without a name', () => {
  /**
   * THE TAIL I HAD DISMISSED. I called the 309 remaining literals "real one-offs, not drift" without
   * looking at them. They were three pale greens, three dark ambers, two dark reds, two pale blues,
   * four pale amber borders and two pale red borders - each family one intent with several
   * accidental values, because a colour typed from memory lands a few points off every time.
   *
   * The rule that survives: a colour on more than one page is a decision, and a decision needs a
   * name. A colour on one page is that page's accent and can stay a literal.
   */
  const rgb = (h: string) => {
    const x = h.replace('#', '')
    return [0, 2, 4].map(i => parseInt(x.slice(i, i + 2), 16))
  }

  it('every hex left in the pages appears in exactly one file', () => {
    const seen = new Map<string, string[]>()
    for (const f of files) {
      const body = strip(readFileSync(f, 'utf8'))
      for (const h of new Set((body.match(/#[0-9A-Fa-f]{6}/g) ?? []).map(x => x.toUpperCase()))) {
        seen.set(h, [...(seen.get(h) ?? []), f.replace(SRC, '')])
      }
    }
    const shared = [...seen.entries()].filter(([, fs]) => fs.length > 1).map(([h, fs]) => `${h} in ${fs.length}`)
    expect(shared).toEqual([])
  })

  it('and the soft tokens exist, because inventing a fifth pale amber is what they prevent', () => {
    const TOKENS = readFileSync(join(SRC, 'index.css'), 'utf8')
    for (const t of ['--gw-green-b-soft', '--gw-green-t-soft', '--gw-danger', '--gw-sub-d', '--gw-amber-b-soft', '--gw-red-b-soft', '--gw-green-live']) {
      expect(TOKENS).toContain(t)
    }
  })

  it('and no token sits within a hair of another token of a different hue', () => {
    /**
     * THE MISTAKE THE FIRST PASS MADE, kept out by a test rather than by my remembering.
     *
     * Collapsing by RGB distance alone mapped a pale blue onto --gw-green-bg and a pale green onto
     * --gw-blue-bg: the values are six points apart and the meanings are opposite. Hue has to be a
     * hard constraint, so this asserts the token set itself never puts two different hues close
     * enough for that swap to look reasonable to the next person doing it by eye.
     */
    const TOKENS = readFileSync(join(SRC, 'index.css'), 'utf8')
    const defs = [...TOKENS.matchAll(/(--gw-[a-z0-9-]+):\s*(#[0-9A-Fa-f]{6})/g)].map(m => [m[1], m[2].toUpperCase()] as const)
    const collisions: string[] = []
    for (const [na, va] of defs) {
      for (const [nb, vb] of defs) {
        if (na >= nb) continue
        const [ra, ga, ba] = rgb(va), [rb, gb, bb] = rgb(vb)
        const close = Math.max(Math.abs(ra - rb), Math.abs(ga - gb), Math.abs(ba - bb)) <= 4
        // Same value under two names is fine only where one is deliberately an alias.
        if (close && va !== vb) collisions.push(`${na} ${va} vs ${nb} ${vb}`)
      }
    }
    expect(collisions).toEqual([])
  })
})

describe('the pages are built from the kit, not from inline styles', () => {
  /**
   * STAGE 5. Four of twenty-eight pages imported the kit and the rest hand-rolled everything, which
   * is why the board reads better than the product it is part of: it is the only page whose hierarchy
   * is consistent by construction rather than by whoever was typing.
   *
   * This is a deliberate pass over the two pages a paying admin meets, not a sweep. Both changes were
   * checked at the rendered page on a throwaway account signed up through the real flow.
   */
  it('Settings\' panels are Cards rather than six copies of one', () => {
    const S = strip(readFileSync(join(SRC, 'pages/settings/SettingsPage.tsx'), 'utf8'))
    expect(S).toMatch(/import \{ Sec, Card \} from '@\/components\/gw\/kit'/)
    // The exact panel that was written out six times.
    expect(S).not.toMatch(/background: 'white', border: '0\.5px solid var\(--gw-border\)', borderRadius: 10/)
  })

  it('and the panel holding one block says so', () => {
    /**
     * The WhatsApp panel was written as a row container and filled with a single block, so its
     * content sat flush against the card edge while every other panel was inset. Pre-existing, and
     * invisible until the panels came onto one component. Measured after: all six inset at 33px.
     */
    const S = strip(readFileSync(join(SRC, 'pages/settings/SettingsPage.tsx'), 'utf8'))
    const whatsapp = S.slice(S.indexOf('<Sec title="WhatsApp" />'), S.indexOf('<Sec title="WhatsApp" />') + 200)
    expect(whatsapp).toMatch(/<Card pad="block">/)
  })

  it('Card has the one-block case, so a panel is never padded for rows it does not have', () => {
    const KIT = strip(readFileSync(join(SRC, 'components/gw/kit.tsx'), 'utf8'))
    expect(KIT).toMatch(/pad\?: boolean \| 'block'/)
    expect(KIT).toMatch(/pad === 'block' \? '14px 16px'/)
  })

  it('Billing answers "what is the state of this" with the board\'s Stat row', () => {
    const B = strip(readFileSync(join(SRC, 'pages/billing/BillingPage.tsx'), 'utf8'))
    expect(B).toMatch(/import \{ Stat, Pill \} from '@\/components\/gw\/kit'/)
    for (const label of ['label="Plan"', 'label="People"']) expect(B).toContain(label)
  })

  it('and says each of those facts once', () => {
    /**
     * The tiles at first sat above a card repeating all three - plan, price, seat count - so a page
     * about a decision on money stated the same facts twice within one screen. The card is the
     * state and the two things you can do about it.
     */
    const B = strip(readFileSync(join(SRC, 'pages/billing/BillingPage.tsx'), 'utf8'))
    const card = B.slice(B.indexOf('Current plan'), B.indexOf('Pause subscription'))
    expect(card).not.toMatch(/PLAN_PRICES\[/)
    expect(card).not.toMatch(/people\.count/)
  })
})
