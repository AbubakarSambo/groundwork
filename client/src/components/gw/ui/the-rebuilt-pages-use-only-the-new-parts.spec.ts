import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { REBUILT_PAGES } from './rebuilt-pages'

/**
 * A REBUILT PAGE USES ONLY THE NEW PARTS (design-audit.md section 4, step 3: "the guard test").
 *
 * `REBUILT_PAGES` (./rebuilt-pages.ts) starts empty and grows one entry at a time, as each screen
 * is rebuilt from `components/gw/ui`. From the moment a page is listed, this spec fails the build
 * if that file imports one of kit.tsx's old parts (`Zone`, `Sec`, `Card`, `Row`, `Pill`, `Stat`,
 * `btn`, `btnGhost`, `miniBtn`) or writes one of the old CSS classes (`gw-btn`, `gw-input`,
 * `gw-ttl`, `gw-pill`, `gw-prow`, `gw-er`, `gw-sub-t`, `gw-sec`, `gw-card`, `gw-label`, `cg-*`)
 * again.
 *
 * THE OLD PARTS ALSO HIDE ONE IMPORT AWAY (Hafsah's first review, U.20 sixth round): `InvitePage`
 * passed every check above while `LinkProblem` - a component it imports and renders directly -
 * still drew a 40px `gw-btn` and a 13px `gw-note`. A page can be clean and still show old parts if
 * something it renders is not. So this now also reads, one level deep, every local component a
 * listed page imports from `@/components/gw/...`, and fails the same way if THAT file uses an old
 * part - which is what caught `LinkProblem` and is what keeps a future import like it from hiding
 * again.
 *
 * NO INLINE SIZE, COLOUR OR SPACING EITHER. The same review found `fontSize: 21`, four
 * `marginBottom`s, a footer's `paddingTop`/`borderTop` and a `display: grid, gap: 14` written
 * straight into `InvitePage.tsx` and `InvitationExpired.tsx` - technically not an old class, but
 * exactly the thing `rebuilt-pages.ts`'s own comment already asked for ("no inline styles for
 * size, colour or spacing"), just never checked. This now fails on `style={{ }}` that sets
 * `fontSize`, `color`, any `margin*`/`padding*`/`border*`, or `gap`/`rowGap`/`columnGap`, on a
 * listed page. `textAlign` is not one of these - it is alignment, not size, colour or spacing.
 *
 * COMMENTS ARE STRIPPED FIRST. A source file that only MENTIONS an old name inside a comment - "do
 * not use gw-btn here" - must not trip this, and a source file that uses the old name for real must
 * not hide behind a comment that happens to contain the new one. See
 * api/src/a-guard-that-a-comment-satisfies-is-not-a-guard.spec.ts for why this matters: a guard
 * that reads comments as code is a guard a stray sentence can satisfy.
 */
const SRC_ROOT = join(__dirname, '..', '..', '..') // client/src

const OLD_KIT_NAMES = ['Zone', 'Sec', 'Card', 'Row', 'Pill', 'Stat', 'btn', 'btnGhost', 'miniBtn']
const OLD_CSS_CLASSES = ['gw-btn', 'gw-input', 'gw-ttl', 'gw-pill', 'gw-prow', 'gw-er', 'gw-sub-t', 'gw-sec', 'gw-card', 'gw-label']
/** `fontSize`, `color`, any `margin*`/`padding*`/`border*`, `gap`/`rowGap`/`columnGap` - never `textAlign`. */
const BANNED_STYLE_PROPS = /^(fontSize|color|margin\w*|padding\w*|border(Top|Bottom|Left|Right)?|gap|rowGap|columnGap)$/

export function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ')
}

/** Imports from a path ending in `/kit` (kit.tsx), wherever it is written: './kit', '../gw/kit', '@/components/gw/kit'. */
export function namesImportedFromKit(stripped: string): string[] {
  const found: string[] = []
  const re = /import\s*\{([^}]*)\}\s*from\s*['"][^'"]*\/kit['"]/g
  let m: RegExpExecArray | null
  while ((m = re.exec(stripped))) {
    for (const raw of m[1].split(',')) {
      const name = raw.trim().split(/\s+as\s+/)[0].trim()
      if (name) found.push(name)
    }
  }
  return found
}

export function oldClassesUsed(stripped: string): string[] {
  const found = OLD_CSS_CLASSES.filter(c => stripped.includes(c))
  if (/\bcg-[\w-]+/.test(stripped)) found.push('cg-*')
  return found
}

/**
 * Local components a page imports from `@/components/gw/...` (never `.../gw/ui`, which is the new
 * kit itself), resolved to a file under `client/src`. One level - what the page itself imports,
 * not what THAT file goes on to import.
 */
export function gwComponentImportPaths(stripped: string): string[] {
  const found: string[] = []
  const re = /from\s*['"]@\/components\/gw\/([^'"]+)['"]/g
  let m: RegExpExecArray | null
  while ((m = re.exec(stripped))) {
    const rel = m[1]
    if (rel === 'ui' || rel.startsWith('ui/') || rel.startsWith('ui.')) continue
    found.push(`components/gw/${rel}`)
  }
  return found
}

function readGwComponent(relNoExt: string): string | null {
  for (const ext of ['.tsx', '.ts']) {
    try {
      return readFileSync(join(SRC_ROOT, `${relNoExt}${ext}`), 'utf8')
    } catch { /* try the next extension */ }
  }
  return null
}

/** Every prop name inside every `style={{ ... }}` in the source, whether or not it is banned. */
export function inlineStylePropNames(stripped: string): string[] {
  const found: string[] = []
  const re = /style=\{\{([^}]*)\}\}/g
  let m: RegExpExecArray | null
  while ((m = re.exec(stripped))) {
    for (const name of m[1].match(/[A-Za-z]+(?=\s*:)/g) ?? []) found.push(name)
  }
  return found
}

export function bannedInlineStyleProps(stripped: string): string[] {
  return inlineStylePropNames(stripped).filter(p => BANNED_STYLE_PROPS.test(p))
}

describe('a rebuilt page never falls back to the old parts', () => {
  /*
   * WAS: "the rebuilt-pages list starts empty, and this task adds no page to it" - true of the
   * task that built this guard and nothing else. The invitation task (design-audit.md section 3)
   * is the first screen rebuilt from these parts, so the list now names it; this spec's job is to
   * keep proving that every listed page stays off the old parts, not to keep the list at zero.
   */
  it('names the pages rebuilt so far', () => {
    expect(REBUILT_PAGES).toEqual([
      'pages/invite/InvitePage.tsx',
      'pages/invite/InvitationExpired.tsx',
      'pages/join/WaitingForAnAdminPage.tsx',
      'pages/grounds/OutOfTime.tsx',
      'pages/org/OrgMembersPage.tsx',
      'pages/org/WaitingToBeLetIn.tsx',
      'pages/org/EveryoneHere.tsx',
      'pages/org/InvitePeople.tsx',
      'pages/org/WhoCanJoin.tsx',
      'pages/org/TheInviteLink.tsx',
      'pages/org/WhoCanOpenACheckIn.tsx',
      'pages/org/OnePersonPage.tsx',
      'pages/grounds/CheckInPeopleAndSetup.tsx',
    ])
  })

  it('every listed page imports none of the old kit parts, and writes none of the old classes', () => {
    const offenders: string[] = []
    for (const relPath of REBUILT_PAGES) {
      const full = join(SRC_ROOT, relPath)
      const stripped = stripComments(readFileSync(full, 'utf8'))

      const badImports = namesImportedFromKit(stripped).filter(n => OLD_KIT_NAMES.includes(n))
      if (badImports.length > 0) {
        offenders.push(`${relPath}: imports old kit part(s) ${badImports.join(', ')}`)
      }

      const badClasses = oldClassesUsed(stripped)
      if (badClasses.length > 0) {
        offenders.push(`${relPath}: uses old class(es) ${badClasses.join(', ')}`)
      }
    }
    expect(offenders).toEqual([])
  })

  it('nothing a listed page imports from components/gw uses an old part either, one level deep', () => {
    const offenders: string[] = []
    for (const relPath of REBUILT_PAGES) {
      const stripped = stripComments(readFileSync(join(SRC_ROOT, relPath), 'utf8'))
      for (const importedRel of gwComponentImportPaths(stripped)) {
        const src = readGwComponent(importedRel)
        if (src === null) continue // an import that does not resolve to a file is not this guard's problem
        const importedStripped = stripComments(src)

        const badImports = namesImportedFromKit(importedStripped).filter(n => OLD_KIT_NAMES.includes(n))
        if (badImports.length > 0) {
          offenders.push(`${relPath} imports ${importedRel}, which imports old kit part(s) ${badImports.join(', ')}`)
        }
        const badClasses = oldClassesUsed(importedStripped)
        if (badClasses.length > 0) {
          offenders.push(`${relPath} imports ${importedRel}, which uses old class(es) ${badClasses.join(', ')}`)
        }
      }
    }
    expect(offenders).toEqual([])
  })

  it('no listed page sets font size, colour, margin, padding or gap with an inline style', () => {
    const offenders: string[] = []
    for (const relPath of REBUILT_PAGES) {
      const stripped = stripComments(readFileSync(join(SRC_ROOT, relPath), 'utf8'))
      const bad = bannedInlineStyleProps(stripped)
      if (bad.length > 0) offenders.push(`${relPath}: inline style(s) ${[...new Set(bad)].join(', ')}`)
    }
    expect(offenders).toEqual([])
  })
})

describe('the detection itself catches a real offender, not only an empty list', () => {
  it('catches an old part imported from kit.tsx, however it is written', () => {
    expect(namesImportedFromKit("import { Card, Row } from '@/components/gw/kit'"))
      .toEqual(expect.arrayContaining(['Card', 'Row']))
    expect(namesImportedFromKit("import { Button, Tag } from '@/components/gw/kit'"))
      .toEqual(['Button', 'Tag'])
  })

  it('does not flag a comment that only mentions the old names', () => {
    const stripped = stripComments('/* do not use Card or gw-btn here */\nexport const x = 1')
    expect(namesImportedFromKit(stripped)).toEqual([])
    expect(oldClassesUsed(stripped)).toEqual([])
  })

  it('catches an old CSS class name written into the source, including the cg-* wildcard', () => {
    expect(oldClassesUsed('<button className="gw-btn">Go</button>')).toContain('gw-btn')
    expect(oldClassesUsed('<div className="cg-panel">')).toContain('cg-*')
  })

  it('does not confuse the new gwui- classes with the old gw- ones', () => {
    expect(oldClassesUsed('<button className="gwui-btn gwui-btn-primary">Go</button>')).toEqual([])
  })

  it('catches the newly-added old classes too', () => {
    expect(oldClassesUsed('<div className="gw-er">')).toContain('gw-er')
    expect(oldClassesUsed('<p className="gw-sub-t">')).toContain('gw-sub-t')
    expect(oldClassesUsed('<label className="gw-label">')).toContain('gw-label')
  })

  it('finds a component a page imports from components/gw, one level, never from gw/ui', () => {
    expect(gwComponentImportPaths("import { LinkProblem } from '@/components/gw/LinkProblem'"))
      .toEqual(['components/gw/LinkProblem'])
    expect(gwComponentImportPaths("import { Button } from '@/components/gw/ui'")).toEqual([])
    expect(gwComponentImportPaths("import { Page } from '@/components/gw/ui/Page'")).toEqual([])
  })

  it('finds an inline style property, and knows which ones are banned', () => {
    expect(inlineStylePropNames('<h2 style={{ fontSize: 21, marginBottom: 3 }}>')).toEqual(['fontSize', 'marginBottom'])
    expect(bannedInlineStyleProps('<div style={{ textAlign: \'center\' }}>')).toEqual([])
    expect(bannedInlineStyleProps('<div style={{ paddingTop: 14, borderTop: \'1px solid red\' }}>'))
      .toEqual(['paddingTop', 'borderTop'])
    expect(bannedInlineStyleProps('<div style={{ display: \'grid\', gap: 14 }}>')).toEqual(['gap'])
  })
})
