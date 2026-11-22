import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'
import { looksLikeAnAddress } from './an-address-that-can-receive-mail'

/**
 * ONE TEST FOR AN ADDRESS. Thirty places asked includes('@') in three shapes and "a@" passed at every
 * one. One rule now, and a sweep that fails the next place to grow its own.
 */
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SRC = path.join(__dirname, '..', '..')
const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
function everyTsx(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = path.join(dir, f)
    return statSync(p).isDirectory() ? everyTsx(p) : /\.tsx?$/.test(f) && !/\.spec\./.test(f) && !/testonly/.test(f) ? [p] : []
  })
}

/** Not validation: EntryChatPage filters model-extracted mentions down to the ones that are addresses at all. */
const NOT_VALIDATION = ['pages/enter/EntryChatPage.tsx']

describe('the rule', () => {
  it('refuses what includes("@") let through, and accepts an address', () => {
    for (const bad of ['a@', '@', 'me@ @', 'a@b', '', ' ']) expect(looksLikeAnAddress(bad)).toBe(false)
    for (const good of ['a@b.co', 'ada.lovelace@example.org', ' padded@x.io ']) expect(looksLikeAnAddress(good)).toBe(true)
  })
})

describe('the sweep', () => {
  it('finds includes("@") nowhere in pages/ or components/ except the helper and the one filter', () => {
    const offenders = everyTsx(path.join(SRC, 'pages')).concat(everyTsx(path.join(SRC, 'components')))
      .filter((f) => /includes\('@'\)/.test(strip(readFileSync(f, 'utf8'))))
      .map((f) => path.relative(SRC, f))
      .filter((rel) => !NOT_VALIDATION.includes(rel) && rel !== 'components/gw/an-address-that-can-receive-mail.ts')
    expect(offenders).toEqual([])
  })
  it('and every form that takes an address carries noValidate, so the page\'s own message is the one channel', () => {
    for (const rel of ['pages/auth/AuthPage.tsx', 'pages/join/JoinPage.tsx']) {
      const src = strip(readFileSync(path.join(SRC, rel), 'utf8'))
      const forms = src.match(/<form[^>]*>/g) ?? []
      expect(forms.length).toBeGreaterThan(0)
      for (const f of forms) expect(f).toContain('noValidate')
    }
    expect(strip(readFileSync(path.join(SRC, 'pages/enter/EntryChatPage.tsx'), 'utf8'))).toMatch(/<form noValidate onSubmit=\{\(e\) => \{ e\.preventDefault\(\); handleSave\(\) \}\}>/)
  })
  it('no address test returns in silence any more', () => {
    /* Moved from the dead ReportBody (ReportPage.tsx)'s HiddenContributorsSection to
       HiddenContributorRow on the board - see the comment at the top of ReportPage.tsx. */
    const board = strip(readFileSync(path.join(SRC, 'pages/board/BoardPage.tsx'), 'utf8'))
    expect(board).toMatch(/if \(!looksLikeAnAddress\(email\)\) \{ setEmailError\(NOT_AN_ADDRESS\); return \}/)
    const integrations = strip(readFileSync(path.join(SRC, 'pages/org/IntegrationsPage.tsx'), 'utf8'))
    expect(integrations).toContain("whatFor.trim().length < 20")
  })
})
