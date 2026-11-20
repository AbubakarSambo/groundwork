import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

/**
 * SPACING HAS ONE RHYTHM (docs/spacing-audit-15-nov.md, sections 3 and 5): the rules the layout
 * measure (e2e/spacing-measure.js) checks on a page, checked here in the stylesheet and the parts so
 * a pull request cannot bring the old causes back.
 */
const SRC = join(__dirname, '..', '..', '..')
const read = (p: string) => readFileSync(join(SRC, p), 'utf8')
const ui = read('components/gw/ui/gw-ui.css')
const index = read('index.css')

/** The declarations of every rule whose selector list mentions `sel`. */
const rulesFor = (css: string, sel: RegExp): string[] =>
  [...css.matchAll(/(^|\})\s*([^{}@][^{}]*)\{([^{}]*)\}/g)].filter((m) => sel.test(m[2])).map((m) => `${m[2].trim()} { ${m[3].trim()} }`)

describe('the four spacing tokens', () => {
  it('are defined once, in gw-ui.css', () => {
    for (const t of ['--gw-space-section', '--gw-space-first', '--gw-space-block', '--gw-space-line']) {
      expect(ui.match(new RegExp(`${t}\\s*:`, 'g'))?.length ?? 0, t).toBeGreaterThanOrEqual(1)
      expect(index.includes(`${t}:`), `${t} is not redefined in index.css`).toBe(false)
    }
    expect(ui).toMatch(/--gw-space-first:\s*24px/)
    expect(ui).toMatch(/--gw-space-block:\s*12px/)
    expect(ui).toMatch(/--gw-space-line:\s*4px/)
    expect(ui).toMatch(/--gw-space-section:\s*32px/)
  })
  it('the page stack uses the section token, so it is 24px on a phone', () => {
    expect(ui).toMatch(/\.wrap\.gw-stack > \* \+ \*[^{]*\{\s*margin-top: var\(--gw-space-section\)/)
    expect(ui).toMatch(/\.gwui-auth-card\.gwui-auth-card > \* \+ \* \{ margin-top: var\(--gw-space-block\)/)
  })
})

describe('a line that describes a block belongs to it', () => {
  it('Note, small print, empty-state lines and the updated line all use the one .gw-line class', () => {
    const line = rulesFor(ui, /\.gw-line/).join(' ')
    expect(line).toContain('var(--gw-space-line)')
    for (const f of ['components/gw/ui/NoteEmpty.tsx', 'components/gw/ui/UpdatedLine.tsx']) {
      expect(read(f), f).toContain('gw-line')
    }
    expect(ui).toMatch(/\.gwui-fine\b[^{]*\.gw-line|\.gw-line[^{]*\.gwui-fine\b/)
    expect(ui).toMatch(/\.gwui-empty-line\b[^{]*\.gw-line|\.gw-line[^{]*\.gwui-empty-line\b/)
  })
  it('the updated line has no margin of its own and is not a 44px row', () => {
    for (const sel of [/\.gwui-upd\b(?!-full)/, /\.gwui-upd-plain/]) {
      for (const r of rulesFor(ui, sel)) expect(r, r).not.toMatch(/margin-top:\s*\d/)
    }
    expect(rulesFor(ui, /\.gwui-upd > summary/).join(' ')).not.toMatch(/min-height:\s*44px/)
  })
  it('PageTitle has a meta slot', () => {
    expect(read('components/gw/ui/PageTitle.tsx')).toMatch(/\bmeta\b/)
  })
})

describe('a header and its tab body are one page', () => {
  it('there is no header wrapper and no second padded box for the tab body', () => {
    expect(ui).not.toContain('gwui-ground-header-wrap')
    expect(read('pages/grounds/GroundParticipantPage.tsx')).not.toContain('gwui-ground-header-wrap')
    expect(rulesFor(index, /^\.gw-bd\b/).join(' ')).not.toMatch(/padding/)
    expect(index).not.toMatch(/\.gw-bd\s*\{\s*padding-bottom/)
  })
  it('the gap under the tabs is the one token, defined once', () => {
    expect(ui).not.toContain('--gw-below-tabs: 30px')
    expect(ui).toMatch(/var\(--gw-space-first\)/)
  })
  it('there is one check-in header, not two', () => {
    expect(existsSync(join(SRC, 'components/gw/TheCheckInHeader.tsx'))).toBe(false)
  })
})

describe('the 44px floor is for real tap targets only', () => {
  it('a summary or select that sits inside a line of text is not made 44px tall', () => {
    const floor = rulesFor(ui, /^:where\(button/).join(' ')
    expect(floor).not.toMatch(/\bsummary\b/)
  })
})
