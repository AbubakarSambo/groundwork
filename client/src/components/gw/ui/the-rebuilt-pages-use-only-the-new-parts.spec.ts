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
 * `gw-ttl`, `gw-pill`, `gw-prow`, `cg-*`) again.
 *
 * COMMENTS ARE STRIPPED FIRST. A source file that only MENTIONS an old name inside a comment - "do
 * not use gw-btn here" - must not trip this, and a source file that uses the old name for real must
 * not hide behind a comment that happens to contain the new one. See
 * api/src/a-guard-that-a-comment-satisfies-is-not-a-guard.spec.ts for why this matters: a guard
 * that reads comments as code is a guard a stray sentence can satisfy.
 */
const SRC_ROOT = join(__dirname, '..', '..', '..') // client/src

const OLD_KIT_NAMES = ['Zone', 'Sec', 'Card', 'Row', 'Pill', 'Stat', 'btn', 'btnGhost', 'miniBtn']
const OLD_CSS_CLASSES = ['gw-btn', 'gw-input', 'gw-ttl', 'gw-pill', 'gw-prow']

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
})
