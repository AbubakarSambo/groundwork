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
/* 24 October (Hafsah: "one stylesheet, the prototype's"): styles/prototype.css is the prototype's stylesheet copied verbatim, the
   source every look here is checked against, so it is not scanned as product code (its own marketing-site colours, dev bar and
   pop-up shadows are the prototype's). What the product changes on top of it is in styles/product.css, which is scanned. */
const PROTO_CSS = join(SRC, 'styles/prototype.css')
const PROTO = readFileSync(PROTO_CSS, 'utf8')
files.splice(files.indexOf(PROTO_CSS), 1)
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
    /* 24 October: the shared button is the prototype's own .btn. */
    const rule = PROTO.match(/\.btn\{([^}]*)\}/)![1]
    expect(rule).toMatch(/border:0;/)
    expect(rule).toMatch(/border-radius:8px;/)
    expect(rule).toMatch(/min-height:44px;/)
    expect(rule).toMatch(/font-weight:700;/)
  })

  it('primary is flat navy with white words; secondary is the surface with a 1.5px hairline inside', () => {
    expect(PROTO).toMatch(/\.btn\.pri\{background:var\(--navy\);color:#fff\}/)
    expect(PROTO).toMatch(/\.btn\.sec\{background:var\(--surface\);[^}]*box-shadow:inset 0 0 0 1px var\(--rule2-crisp\)\}/)
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
    /* 24 October: the prototype's small button is 36 then 40px; the product keeps its 44px tap floor on it at every width. */
    const PRODUCT = readFileSync(join(SRC, 'styles/product.css'), 'utf8')
    expect(PRODUCT).toMatch(/\.btn\.sm, \.chip, \.seg button, \.views a \{ min-height: 44px; \}/)
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
    'styles/product.css': 1, // the + menu above the composer
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

/*
 * EVERYTHING YOU CAN TAP IS AT LEAST 44px TALL (Hafsah, 21 October): buttons, links in lists, chips and switches. Links inside a
 * sentence are the only exception. The browser test measured the sidebar's icons and Feedback at 34px, the chips at 40px, the
 * switches at 28px and the session tags you can tap at 26px.
 *
 * Three checks. The floor itself is in the kit's stylesheet, gw-ui.css. No class drawn on something you can tap (a button, a link, a folding summary,
 * a picker, or anything with a click or a control's role) declares a height under 44px, unless it keeps its small drawn shape and
 * takes a 44px tap target around it. And no such element is given a height under 44px in its own inline style.
 */
describe('everything you can tap is at least 44px tall', () => {
  const TAPPABLE_TAG = /<(button|a|Link|NavLink|summary|select|div|span|li|label|tr|td)\b((?:[^>=]|=>|=)*)>/g
  const ACTS = /\bonClick=|role="(button|switch|tab|link|checkbox|radio)"/
  const classesIn = (tag: string): string[] => {
    const out: string[] = []
    const at = tag.indexOf('className=')
    if (at === -1) return out
    let v = ''
    const rest = tag.slice(at + 'className='.length)
    if (rest[0] === '"') v = rest.slice(1, rest.indexOf('"', 1))
    else if (rest[0] === '{') {
      let depth = 0
      let i = 0
      for (; i < rest.length; i++) { if (rest[i] === '{') depth++; else if (rest[i] === '}') { depth--; if (depth === 0) break } }
      const inner = rest.slice(1, i)
      for (const m of inner.matchAll(/'([^']*)'|"([^"]*)"|`([^`]*)`/g)) v += ' ' + (m[1] ?? m[2] ?? m[3] ?? '').replace(/\$\{[^}]*\}/g, ' ')
    }
    for (const m of v.matchAll(/[A-Za-z][\w-]*/g)) out.push(m[0])
    return out
  }
  const tappable: { file: string; tag: string; classes: string[] }[] = []
  for (const f of files.filter((x) => x.endsWith('.tsx'))) {
    const code = source(f)
    for (const m of code.matchAll(TAPPABLE_TAG)) {
      const el = m[1]
      if (['div', 'span', 'li', 'label', 'tr', 'td'].includes(el) && !ACTS.test(m[0])) continue
      tappable.push({ file: rel(f), tag: m[0], classes: classesIn(m[0]) })
    }
  }
  const tappableClasses = new Set(tappable.flatMap((t) => t.classes))
  const cssRules: { file: string; selector: string; body: string }[] = []
  for (const f of files.filter((x) => x.endsWith('.css'))) {
    for (const m of source(f).matchAll(/([^{}]+)\{([^{}]*)\}/g)) cssRules.push({ file: rel(f), selector: m[1].trim(), body: m[2] })
  }
  const lastPart = (sel: string) => sel.trim().split(/[\s>+~]+/).pop() ?? ''
  const classesOf = (part: string) => [...part.matchAll(/\.([A-Za-z][\w-]*)/g)].map((m) => m[1])
  /** The classes that keep a small drawn shape and take a 44px tap target around it instead. */
  const tapTargets = new Set<string>()
  for (const r of cssRules) {
    if (!/height:\s*max\(100%,\s*44px\)/.test(r.body)) continue
    for (const part of r.selector.split(',')) if (/::after|::before/.test(part)) classesOf(lastPart(part).replace(/::(after|before)$/, '')).forEach((c) => tapTargets.add(c))
  }

  it('the floor: every button, folding summary, picker and control by role is at least 44px tall, at no weight', () => {
    expect(UI_CSS).toMatch(/:where\(button, summary, select, \[role="button"\], \[role="switch"\], \[role="tab"\]\):not\(\.gwui-in-a-sentence\) \{ min-height: 44px; \}/)
  })

  it('a switch, a tag you can tap and a coloured initial keep their shape and take a 44px tap target', () => {
    /* 24 October: the old gw-switch is gone (no page drew it); a tag is the prototype's .tag now. */
    for (const c of ['gwui-toggle', 'tag', 'gw-rl-ini', 'gwui-tap-target']) expect(tapTargets.has(c), c).toBe(true)
  })

  it('no class drawn on something you can tap declares a height under 44px', () => {
    const under: string[] = []
    for (const r of cssRules) {
      for (const h of r.body.matchAll(/(?<![-\w])(min-height|height)\s*:\s*(\d+(?:\.\d+)?)px/g)) {
        if (Number(h[2]) >= 44 || Number(h[2]) === 0) continue
        for (const part of r.selector.split(',')) {
          if (/::?(before|after)|::-webkit|\bthead\b|sr-only|\binput\b|textarea/.test(part)) continue
          const last = lastPart(part)
          const cs = classesOf(last)
          const anElement = /^(summary|button|select)\b/.test(last)
          if (cs.some((c) => tapTargets.has(c))) continue
          if (anElement || cs.some((c) => tappableClasses.has(c))) under.push(`${r.file}: ${part.trim()} { ${h[0]} }`)
        }
      }
    }
    expect(under).toEqual([])
  })

  it('no button, link or control is given a height under 44px in its own style, unless it takes the tap target', () => {
    const under: string[] = []
    for (const t of tappable) {
      if (t.classes.some((c) => tapTargets.has(c))) continue
      for (const h of t.tag.matchAll(/\b(minHeight|height)\s*:\s*(\d+(?:\.\d+)?)\b/g)) {
        if (Number(h[2]) > 0 && Number(h[2]) < 44) under.push(`${t.file}: ${h[0]}`)
      }
    }
    expect(under).toEqual([])
  })

  it('the controls the browser test measured are 44px: the sidebar icons, the chips, a small button and the menus', () => {
    const rule = (css: string, sel: string) => css.match(new RegExp(`${sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} \\{([^}]*)\\}`))![1]
    expect(rule(TOKENS, '.gw-rl-ic, .gw-rl-top .gw-tap44')).toMatch(/width: 44px; height: 44px;/)
    expect(rule(UI_CSS, '.gwui-choice')).toMatch(/min-height: 44px;/)
    expect(rule(TOKENS, '.gw-rl-nav')).toMatch(/min-height: 44px;/)
    expect(rule(UI_CSS, '.gwui-tap-44')).toMatch(/min-height: 44px;/)
    expect(rule(UI_CSS, '.gwui-icon-btn')).toMatch(/width: 44px; height: 44px;/)
    /* Feedback is a <button> sized by its padding, so the floor holds it: it never opts out. */
    expect(source(join(SRC, 'components/gw/AppShell.tsx'))).toMatch(/'gw-feedback-btn'/)
    expect(source(join(SRC, 'components/gw/AppShell.tsx'))).not.toMatch(/gw-feedback-btn[^'"]*gwui-in-a-sentence/)
  })
})
