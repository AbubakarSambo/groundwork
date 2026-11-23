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
  /*
   * "THE REPORT'S SECTION HEADING DELEGATES RATHER THAN RE-IMPLEMENTING" RETIRED WITH ReportBody.
   *
   * `SecH` was `ReportBody`'s own wrapper around `Section`, inside `ReportPage.tsx`. `ReportBody`
   * is deleted (see the comment at the top of `ReportPage.tsx` for where each of its sections
   * went); the file left behind is a three-line redirect with no heading markup of its own, so
   * there is nothing here to re-implement the kit's heading, and nothing for this assertion to
   * protect. The rule itself - one shared heading component, not a bespoke one per page - is
   * still enforced below, on settings, and by `the-rebuilt-pages-use-only-the-new-parts.spec.ts`
   * for every page on that list.
   */
  it('settings uses it too, rather than a sixth copy of the same label', () => {
    /*
     * UPDATED, GROUP 1 REBUILD: SettingsPage.tsx no longer imports kit.tsx's `Sec` at all - it is
     * rebuilt from components/gw/ui (the-rebuilt-pages-use-only-the-new-parts.spec.ts enforces
     * that directly, and more strictly than this check ever did). Its heading is `Section`, the
     * shared part `Sec` itself was lifted out to become; this checks the same guarantee the old
     * assertion did - one shared heading component, not a bespoke label - in the vocabulary the
     * page now actually uses.
     */
    const S = strip(readFileSync(join(SRC, 'pages/settings/SettingsPage.tsx'), 'utf8'))
    /*
     * UPDATED FOR B-221: "Your data" now also carries `id="your-data"` and `headingRef=...`, so the
     * "yours to keep" email's `/settings#your-data` link can scroll straight to it and focus its
     * heading. Still the one shared `Section` component, which is the rule this test protects -
     * loosened to allow those two props rather than pinned to the exact prop list.
     */
    expect(S).toMatch(/<Section heading="Your data" id="your-data" headingRef=\{yourDataHeadingRef\}>/)
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
    /*
     * UPDATED, GROUP 1 REBUILD: the page is rebuilt from components/gw/ui, so the shared panel is
     * now `Panel` (gw-ui.css's `.gwui-panel`), not kit.tsx's `Card` - the same guarantee (one panel
     * component, not six hand-rolled ones), in the vocabulary the page now uses. The exact old
     * literal panel style this test used to look for cannot recur either way:
     * the-rebuilt-pages-use-only-the-new-parts.spec.ts refuses any inline background/border/radius
     * on this page at all, which is the stronger version of the same check.
     */
    const S = strip(readFileSync(join(SRC, 'pages/settings/SettingsPage.tsx'), 'utf8'))
    expect(S).toMatch(/Panel/)
    expect(S).not.toMatch(/background: 'white', border: '0\.5px solid var\(--gw-border\)', borderRadius: 10/)
  })

  it('and "You" is one FieldRows, not several one-off panels', () => {
    /**
     * UPDATED, GROUP 1 REBUILD: the WhatsApp field sits inside "You"'s single `FieldRows` list,
     * rather than a separate `Card pad="block"` of its own - so every row in that list is inset the
     * same way by construction, not by each caller remembering to ask for it.
     *
     * CHANGED AGAIN (Hafsah, 30 September, the setting row, item 2): this used to also require a
     * `<Panel pad={false}>` wrapping that `FieldRows` - which was itself the defect this task fixed.
     * `srow` (docs/prototype/source/s5.js) has no side padding and sits flat on the page, under the
     * section heading, never inside a white box - see FieldRow.tsx's own updated comment. "You" no
     * longer wraps its `FieldRows` in a `Panel`, so this test no longer looks for one.
     */
    const S = strip(readFileSync(join(SRC, 'pages/settings/SettingsPage.tsx'), 'utf8'))
    const you = S.slice(S.indexOf('<Section heading="You">'), S.indexOf('<Section heading="What we send you">'))
    expect(you).toMatch(/<FieldRows>/)
    expect(you).not.toMatch(/<Panel/)
  })

  it('Card has the one-block case, so a panel is never padded for rows it does not have', () => {
    const KIT = strip(readFileSync(join(SRC, 'components/gw/kit.tsx'), 'utf8'))
    expect(KIT).toMatch(/pad\?: boolean \| 'block'/)
    expect(KIT).toMatch(/pad === 'block' \? '14px 16px'/)
  })

  /*
   * U.19: Plan and billing now answers "what is the state of this" the way the prototype's page does
   * (settings-billing.txt): a "Your plan" list of rows, each a full sentence, rather than the board's
   * Stat tiles. What these two checks were for is kept: the state is said in one place, and once.
   */
  it('Billing answers "what is the state of this" in the prototype\'s rows', () => {
    /*
     * UPDATED, GROUP 1 REBUILD: the rows are the shared `FieldRow` now (components/gw/ui), whose
     * own label column renders each fact's name - `<b>Plan</b>` was kit.tsx's own row markup,
     * which this page no longer writes at all. The guarantee is the same: one row, one label, one
     * sentence, each said once.
     */
    const B = strip(readFileSync(join(SRC, 'pages/billing/BillingPage.tsx'), 'utf8'))
    for (const label of ['label="Plan"', 'label="Next payment"', 'label="Everyone counts"']) expect(B).toContain(label)
  })

  it('and says each of those facts once', () => {
    const B = strip(readFileSync(join(SRC, 'pages/billing/BillingPage.tsx'), 'utf8'))
    expect(B.match(/thePlanLine\(/g) ?? []).toHaveLength(1)
    /* UPDATED, GROUP 1 REBUILD: "Stopping" is `<Section heading="Stopping">` now, not an `id`
       attribute of its own - the same slice, found the new way. */
    const stopping = B.slice(B.indexOf('heading="Stopping"'), B.indexOf('role="dialog"'))
    expect(stopping).not.toMatch(/PLAN_PRICES\[/)
    expect(stopping).not.toMatch(/people\.count/)
  })
})

describe('the same solo report reads the same to everybody', () => {
  /**
   * STAGE 5, SECOND PASS. A participant's private report is shown in two places: to the person whose
   * it is, and to the lead once that person shares it. Both walked the report object themselves -
   * camelCase key to heading, array to list, string to line - written out twice, with two sets of
   * numbers:
   *
   *   participant page   label .1em rgba(255,255,255,.45), body 13px, indent 16
   *   lead page          label .08em rgba(255,255,255,.35), body 12px, indent 14
   *
   * The same record read differently depending on who was looking at it, which is the one thing a
   * shared record must never do. Not a visible bug yet - the kind that becomes one the next time one
   * copy is edited and the other is not.
   */
  const PARTICIPANT = strip(readFileSync(join(SRC, 'pages/grounds/GroundParticipantPage.tsx'), 'utf8'))
  /* The report a person shared with the lead is opened under their row on People and setup now (page audit, 24 November 2026, row 8). */
  const LEAD = strip(readFileSync(join(SRC, 'pages/grounds/PeopleAndSetupAsPictured.tsx'), 'utf8'))
  const CARRY_FORWARD = strip(readFileSync(join(SRC, 'components/gw/WhatYouAreCarryingForward.tsx'), 'utf8'))

  it('both pages render it through one component', () => {
    /* The party view reaches it through `WhatYouAreCarryingForward` now - the solo report and the whole
       sharing decision moved there together so the page that runs a check-in can show a lead their
       own. What this protects is unchanged: ONE component renders a solo report, so it cannot read
       two ways. Asserted wherever it is rendered from. */
    /* NAMED, NOT FILTERED. My first rewrite collected whichever files happened to render it and
       asserted the list was non-empty - which passes while one of them quietly stops. Each route to
       a solo report is named here, so losing any one of them fails. */
    /* Moved again, to the top of My record: "summary should be the item at the very top" - it is
       the one block saying what the record holds, and it was fourth, under three cards assessing
       it. Renamed with it, so the route is named here rather than filtered for. */
    for (const src of [LEAD, CARRY_FORWARD]) {
      expect(src).toMatch(/import \{ SoloReportBody \}/)
      expect(src).toMatch(/<SoloReportBody report=/)
    }
    /*
     * REVIEW ROUND 3, "YOUR WORK" REBUILD: THE PARTY VIEW REACHES IT THROUGH `YourWork` NOW
     * (components/gw/checkin/YourWork.tsx), which is the one place that renders
     * `WhatYouAreCarryingForward` on My work/My record for both pages.
     */
    expect(PARTICIPANT).toMatch(/<YourWork/)
    const YOUR_WORK = strip(readFileSync(join(SRC, 'components/gw/checkin/YourWork.tsx'), 'utf8'))
    expect(YOUR_WORK).toMatch(/<WhatYouAreCarryingForward/)
  })

  it('and neither walks the report itself any more', () => {
    // The exact line both copies shared. If it comes back, so do the two renderings.
    for (const page of [PARTICIPANT, LEAD]) {
      expect(page).not.toMatch(/key\.replace\(\/\(\[A-Z\]\)\/g, ' \$1'\)/)
    }
  })

  it('the lead\'s copy is a size down, and says so rather than hard-coding it again', () => {
    // It sits nested inside a participant row, so the size difference is real - it just belongs to
    // the component now, as a named case.
    expect(LEAD).toMatch(/<SoloReportBody report=\{p\.sharedSoloReport as Record<string, unknown>\} dense on="light" \/>/)
  })
})

describe('one uppercase label, including on a dark ground', () => {
  it('Sec has the dark case, because three whites existed without it', () => {
    /**
     * The check-in pages held ten variants of this one label - 10px and 11px, .08em and .1em, and five
     * colours, three of them near-identical whites for a label inside a dark panel. The kit had no
     * answer for a label on a dark ground, so each panel invented its own. A component with no case
     * for something real is how the ninth copy gets written.
     */
    const KIT = strip(readFileSync(join(SRC, 'components/gw/kit.tsx'), 'utf8'))
    expect(KIT).toMatch(/on\?: 'light' \| 'dark'/)
    expect(KIT).toMatch(/dark \? 'rgba\(255,255,255,\.45\)' : 'var\(--gw-sub\)'/)
  })

  it('and the entry chat\'s report preview shares the report\'s headings', () => {
    /**
     * Five more copies of the `.09em` label lived in the preview of the report - the screen whose
     * whole job is to promise what the real report will look like. They are the same component now.
     */
    /* The preview became its own component, so that the report somebody read at the end of a
       session is the same screen when they open it again later. The headings then moved on again,
       from the kit to the chrome the signed-in close is drawn in, so the two reports a person
       reads a week apart are numbered and labelled the same way. The rule is unchanged and only
       the one place it lives has: the headings are not written here. */
    const ENTRY = strip(readFileSync(join(SRC, 'components/gw/TheReportYouSawAtTheEnd.tsx'), 'utf8'))
    expect(ENTRY).toMatch(/from '\.\/the-shape-every-close-is-drawn-in'/)
    expect(ENTRY).not.toMatch(/textTransform: 'uppercase'[\s\S]{0,80}letterSpacing/)
    expect(ENTRY).not.toMatch(/letterSpacing: '\.09em'/)
  })
})
