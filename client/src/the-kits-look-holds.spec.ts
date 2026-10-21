import { readFileSync, readdirSync, statSync } from 'fs'
import { join, relative } from 'path'
import { describe, it, expect } from 'vitest'

/**
 * THE KIT'S LOOK HOLDS ON EVERY SCREEN (Hafsah, 20 October: "make every screen look like the kit").
 *
 * Her rules, from the kit and the prototype's app.css:
 * - Literata for headings, Atkinson Hyperlegible for what a person reads, lining figures.
 * - Cream and navy, never grey.
 * - A button has no border, 8px corners, is at least 44px tall and bold. Primary is flat navy with
 *   white words; secondary is the surface colour with a 1.5px hairline drawn inside it.
 * - No drop shadow anywhere except on something that sits above the page: a pop-up window, a menu,
 *   a toast, the sheet that slides in.
 *
 * Each rule is checked where it can drift: in the one token file, and in every source file a screen
 * is built from, so a new page that hand-draws its own button, shadow or grey is caught here.
 */
const SRC = __dirname
const files: string[] = []
const walk = (dir: string) => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p)
    else if (/\.(tsx?|css)$/.test(name) && !name.includes('.spec.') && !name.includes('.test.')) files.push(p)
  }
}
walk(SRC)
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
const source = (p: string) => strip(readFileSync(p, 'utf8'))
const rel = (p: string) => relative(SRC, p)
const TOKENS = readFileSync(join(SRC, 'index.css'), 'utf8')
const UI_CSS = readFileSync(join(SRC, 'components/gw/ui/gw-ui.css'), 'utf8')

describe('the two typefaces and lining figures', () => {
  it('the page reads in Atkinson Hyperlegible, headings in Literata, each with a safe fallback', () => {
    expect(TOKENS).toMatch(/--gw-font-ui:\s*'Atkinson Hyperlegible',[^;]*sans-serif;/)
    expect(TOKENS).toMatch(/--gw-font-name:\s*'Literata',[^;]*serif;/)
    expect(TOKENS).toMatch(/body \{[^}]*font-family: var\(--gw-font-ui\);/)
  })

  it('both are loaded before the stylesheet that uses them', () => {
    const MAIN = readFileSync(join(SRC, 'main.tsx'), 'utf8')
    expect(MAIN).toMatch(/@fontsource\/atkinson-hyperlegible\/400\.css/)
    expect(MAIN).toMatch(/@fontsource\/atkinson-hyperlegible\/700\.css/)
    expect(MAIN).toMatch(/@fontsource\/literata\/500\.css/)
  })

  it('numbers are lining figures everywhere, and line up in a table', () => {
    expect(TOKENS).toMatch(/body \{[^}]*font-variant-numeric: lining-nums;/)
    expect(TOKENS).toMatch(/table \{ font-variant-numeric: lining-nums tabular-nums; \}/)
  })

  it('a control takes the page typeface, not the browser default', () => {
    expect(TOKENS).toMatch(/button, input, select, textarea \{ font-family: inherit; \}/)
  })
})

describe('a button is the kit button', () => {
  it('the shared button: no border, 8px corners, 44px, bold', () => {
    const rule = UI_CSS.match(/\.gwui-btn \{([^}]*)\}/)![1]
    expect(rule).toMatch(/border: 0;/)
    expect(rule).toMatch(/border-radius: 8px;/)
    expect(rule).toMatch(/min-height: 44px;/)
    expect(rule).toMatch(/font-weight: 700;/)
  })

  it('primary is flat navy with white words; secondary is the surface with a 1.5px hairline inside', () => {
    expect(UI_CSS).toMatch(/\.gwui-btn-primary \{ background: var\(--gw-navy\); color: #fff; \}/)
    expect(UI_CSS).toMatch(/\.gwui-btn-secondary \{ background: var\(--gw-card\);[^}]*box-shadow: inset 0 0 0 1\.5px var\(--gw-rule-2\); \}/)
  })

  it('the older button classes have the same shape, so a page still using one looks the same', () => {
    for (const cls of ['gw-btn', 'gw-btn-sec', 'gw-send-btn', 'gw-back', 'gw-b']) {
      const rule = TOKENS.match(new RegExp(`\\.${cls} \\{([^}]*)\\}`))![1]
      expect(rule, cls).toMatch(/border: 0;/)
      expect(rule, cls).toMatch(/border-radius: (8px|var\(--gw-radius-btn\));/)
      expect(rule, cls).toMatch(/min-height: 44px;/)
      expect(rule, cls).toMatch(/font-weight: 700;/)
    }
  })

  it('a small button is 44px on a phone too', () => {
    const at = UI_CSS.indexOf('  .gwui-btn-small { min-height: 44px; }')
    expect(at).toBeGreaterThan(-1)
    // inside the phone rule, not a second desktop size
    expect(UI_CSS.lastIndexOf('@media (max-width: 640px)', at)).toBeGreaterThan(UI_CSS.lastIndexOf('}\n}', at))
  })

  /*
   * NO HAND-MADE FILLED BUTTON. A <button>, <Link> or <a> whose own inline style paints it navy (or
   * dark, green or red) is a primary button somebody drew by hand, at their own size and corners.
   * It uses the shared classes instead. The exceptions are not buttons in the kit's sense: an on/off
   * switch with a knob, a round icon-only send button, the composer's own send, and the floating
   * launcher on the page that pictures a customer's site.
   */
  const ALLOWED: Record<string, number> = {
    'pages/admin/AdminPage.tsx': 7, // on/off switches
    'components/gw/ui/Composer.tsx': 1, // the composer's own send, drawn to the kit already
    'pages/join/AnswerFirstPage.tsx': 1, // the round icon send beside the answer box
    'pages/ops/TheAssistantAsACustomerSeesIt.tsx': 1, // the launcher on the pictured customer site
    'components/gw/SharedReportForAParty.tsx': 1, // the board's own dark card, a way in rather than a button (the-board-reads-on-a-dark-ground.ts)
  }
  const openingTags = (s: string, name: string): string[] => {
    const out: string[] = []
    const re = new RegExp(`<${name}\\b`, 'g')
    let m: RegExpExecArray | null
    while ((m = re.exec(s))) {
      let i = m.index + m[0].length
      let depth = 0
      let q: string | null = null
      for (; i < s.length; i++) {
        const ch = s[i]
        if (q) { if (ch === '\\') { i++; continue } if (ch === q) q = null; continue }
        if (ch === '"' || ch === "'" || ch === '`') q = ch
        else if (ch === '{') depth++
        else if (ch === '}') depth--
        else if (ch === '>' && depth === 0) break
      }
      out.push(s.slice(m.index, i + 1))
    }
    return out
  }
  it('no page draws its own filled button', () => {
    const found: Record<string, number> = {}
    for (const f of files.filter(f => f.endsWith('.tsx'))) {
      const code = source(f)
      for (const name of ['button', 'Link', 'a']) {
        for (const tag of openingTags(code, name)) {
          if (/background:\s*[^,}\n]*var\(--gw-(navy|navy-d|dark|green-t|danger|red-t)\)/.test(tag)) found[rel(f)] = (found[rel(f)] ?? 0) + 1
        }
      }
    }
    expect(found).toEqual(ALLOWED)
  })
})

describe('no drop shadow except on a pop-up', () => {
  /** A shadow that is not a drop shadow: none, the hairline, an inside line, or a ring with no blur or offset (a focus ring, the mark's ring). */
  const harmless = (value: string) =>
    value.split(/,(?![^(]*\))/).every((part) => {
      const p = part.trim()
      return p === 'none' || p === '' || /^var\(--gw-hairline\)$/.test(p) || /^inset\b/.test(p) || /^0 0 0 [\d.]+px\b/.test(p)
    })
  /** Where a pop-up shadow is allowed: the four named tokens, used only on something above the page. */
  const POP = /^var\(--gw-shadow-(menu|modal|toast|sheet)\)$/
  const POP_PLACES: Record<string, number> = {
    'index.css': 2, // the rail's menu, Jump to
    'components/gw/ui/gw-ui.css': 5, // the toast, the boards menu, a check-in's menu, the save card, a small menu
    'components/gw/AppShell.tsx': 2, // the feedback window, the Ask sheet
    'components/gw/HelpModal.tsx': 1,
    'components/gw/ui/Composer.tsx': 1, // the + menu above the composer
    'pages/admin/AdminDashboardPage.tsx': 1, // the confirm window
    'pages/ops/TheAssistantAsACustomerSeesIt.tsx': 1, // the assistant's panel, open over the page
  }

  it('every shadow in the product is harmless or a named pop-up shadow, and pop-up shadows are only on pop-ups', () => {
    const drop: string[] = []
    const pop: Record<string, number> = {}
    for (const f of files) {
      const code = source(f)
      const values: string[] = []
      if (f.endsWith('.css')) {
        for (const m of code.matchAll(/box-shadow:\s*([^;}]+)/g)) values.push(m[1].replace(/\s*!important\s*$/, '').trim())
      } else {
        for (const m of code.matchAll(/boxShadow:\s*([^,}\n]*(?:\?[^:]*:[^,}\n]*)?)/g)) {
          for (const lit of m[1].matchAll(/'([^']*)'|"([^"]*)"|`([^`]*)`/g)) values.push((lit[1] ?? lit[2] ?? lit[3]).trim())
        }
      }
      for (const v of values) {
        if (/^var\(--gw-shadow-/.test(v)) {
          if (!POP.test(v)) drop.push(`${rel(f)}: ${v}`)
          else pop[rel(f)] = (pop[rel(f)] ?? 0) + 1
        } else if (!harmless(v) && !/\$\{/.test(v)) drop.push(`${rel(f)}: ${v}`)
      }
    }
    expect(drop).toEqual([])
    expect(pop).toEqual(POP_PLACES)
  })

  it('no shadow utility class and no filter shadow', () => {
    const found: string[] = []
    for (const f of files) {
      const code = source(f)
      if (/drop-shadow|dropShadow|text-shadow|textShadow/.test(code)) found.push(rel(f))
      if (f.endsWith('.tsx')) {
        for (const m of code.matchAll(/className=(?:"([^"]*)"|\{`([^`]*)`\})/g)) {
          if (/(^|\s)shadow(-(sm|md|lg|xl|2xl|inner))?(\s|$)/.test(m[1] ?? m[2] ?? '')) found.push(rel(f))
        }
      }
    }
    expect(found).toEqual([])
  })
})

describe('cream and navy, never grey', () => {
  /*
   * The greys the product used to carry, cool and warm: the old muted and sub text (#9B9590,
   * #6B6560), plain greys (#666 and its family), Tailwind's slate and grey text colours, the grey
   * page (#EDECEA) and lines (#E2E0DB, #D8D5CF), and two cool fills (#EEF0F4, #F1F2F5).
   */
  const GREYS = ['#9B9590', '#6B6560', '#666666', '#666', '#777', '#888', '#999', '#aaa', '#bbb', '#ccc', '#555', '#64748B', '#94A3B8',
    '#6B7280', '#9CA3AF', '#4B5563', '#374151', '#F1F5F9', '#E2E0DB', '#EDECEA', '#F5F3EF', '#D8D5CF', '#EEF0F4', '#F1F2F5', '#4A4540', '#E8E5DE']
  it('no screen paints a grey', () => {
    const found: string[] = []
    for (const f of files) {
      const code = source(f).toUpperCase()
      for (const g of GREYS) if (new RegExp(`${g.toUpperCase()}(?![0-9A-F])`).test(code)) found.push(`${rel(f)} ${g}`)
    }
    expect(found).toEqual([])
  })

  it('and no Tailwind grey text or fill', () => {
    const found: string[] = []
    for (const f of files.filter(f => f.endsWith('.tsx'))) {
      if (/\b(text|bg|border)-(gray|grey|slate|zinc|neutral|stone)-\d{2,3}\b/.test(source(f))) found.push(rel(f))
    }
    expect(found).toEqual([])
  })

  it('the secondary and faint text are the kit\'s warm browns, and Tailwind reads the same tokens', () => {
    expect(TOKENS).toMatch(/--gw-sub: #4E4236;/)
    expect(TOKENS).toMatch(/--gw-page: #FDFBF6;/)
    expect(TOKENS).toMatch(/--gw-navy: #0C447C;/)
    expect(TOKENS).toMatch(/@theme inline \{[^}]*--color-secondary-foreground: var\(--gw-text\);/)
  })
})
