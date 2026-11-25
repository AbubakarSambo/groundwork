import { describe, it, expect } from 'vitest'
import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { SRC, TOKENS, BLOCKS, countEveryFile, countOwnStyle } from './a-page-sets-no-spacing-size-or-colour-of-its-own'
import { OWN_SPACING_SIZE_AND_COLOUR_PER_FILE as FROZEN } from './own-spacing-size-and-colour-per-file'

/**
 * RULE 12: A PAGE SETS NO SPACING, SIZE OR COLOUR OF ITS OWN (Hafsah, 23 November 2026).
 *
 * The values live in styles/tokens.css and the building blocks read them. Today's pages still set
 * their own in many places, so the count each file had on 23 November is frozen in
 * own-spacing-size-and-colour-per-file.ts. A file may go down, never up, and a file not on that list
 * may set none. As each journey is rebuilt, its files go down to nothing and leave the list.
 *
 * To lower the list after a journey is rebuilt, from client/:
 *   GW_FREEZE_RULE_12=1 npx vitest run src/a-page-sets-no-spacing-size-or-colour-of-its-own.spec.ts
 * It writes the counts as they are now; it refuses to write any count that went up.
 */
const now = countEveryFile()
const sum = (m: Record<string, number>) => Object.values(m).reduce((a, b) => a + b, 0)

describe('rule 12: a page sets no spacing, size or colour of its own', () => {
  it('no file sets more of its own than it did, and no new file sets any', () => {
    const rose = Object.entries(now)
      .filter(([f, c]) => c.total > (FROZEN[f] ?? 0))
      .map(([f, c]) => `${f}: ${FROZEN[f] ?? 0} -> ${c.total}`)
    const totalNow = sum(Object.fromEntries(Object.entries(now).map(([f, c]) => [f, c.total])))
    const styles = Object.values(now).reduce((a, c) => a + c.styles, 0)
    process.stdout.write(
      `Rule 12 today: ${totalNow} values set outside the tokens (frozen at ${sum(FROZEN)}), ` +
      `in ${Object.keys(now).filter((f) => now[f].total > 0).length} files, ` +
      `including ${styles} inline styles that set their own spacing, size or colour.\n`,
    )
    /* The first freeze, with an empty list, writes today's counts; after that only counts that did not rise. */
    if (process.env.GW_FREEZE_RULE_12 === '1' && (rose.length === 0 || Object.keys(FROZEN).length === 0)) {
      const lines = Object.entries(now)
        .filter(([, c]) => c.total > 0)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([f, c]) => `  '${f}': ${c.total},`)
      const head = readFileSync(join(SRC, 'own-spacing-size-and-colour-per-file.ts'), 'utf8').split('export const')[0]
      writeFileSync(join(SRC, 'own-spacing-size-and-colour-per-file.ts'), `${head}export const OWN_SPACING_SIZE_AND_COLOUR_PER_FILE: Record<string, number> = {\n${lines.join('\n')}\n}\n`)
    }
    expect(rose, 'Use the building blocks in components/gw/ui and the tokens in styles/tokens.css instead').toEqual([])
  })

  it('the building blocks\' stylesheet holds no value of its own: every colour, size and space is a token', () => {
    expect(now[BLOCKS]?.total ?? 0).toBe(0)
    const blocks = readFileSync(join(SRC, BLOCKS), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
    const tokens = readFileSync(join(SRC, TOKENS), 'utf8')
    /* The one width a media query has to write out is the token's own. */
    const phone = tokens.match(/--ds-phone:\s*(\d+px)/)?.[1]
    expect(phone).toBe('860px')
    for (const m of blocks.matchAll(/@media[^{]*\{/g)) expect(m[0]).toContain(`max-width: ${phone}`)
    /* Every variable it reads is defined in the tokens. */
    const defined = new Set([...tokens.matchAll(/(--ds-[\w-]+)\s*:/g)].map((m) => m[1]))
    const read = [...blocks.matchAll(/var\((--[\w-]+)\)/g)].map((m) => m[1])
    expect(read.filter((v) => !defined.has(v))).toEqual([])
  })

  it('the tokens hold the twelve rules\' values: three spaces, six sizes, the grid, the button', () => {
    const tokens = readFileSync(join(SRC, TOKENS), 'utf8')
    for (const [name, value] of [
      ['--ds-space-8', '8px'], ['--ds-space-16', '16px'], ['--ds-space-32', '32px'],
      ['--ds-text-title', '30px'], ['--ds-text-section', '21px'], ['--ds-text-card', '18px'],
      ['--ds-text-body', '16px'], ['--ds-text-secondary', '14px'], ['--ds-text-meta', '12px'], ['--ds-text-big', '38px'],
      ['--ds-page-top', '32px'], ['--ds-page-side', '48px'],
      ['--ds-content', '1150px'], ['--ds-rail', '232px'], ['--ds-phone', '860px'],
      ['--ds-tap', '44px'], ['--ds-corner', '8px'],
    ]) expect(tokens, name).toMatch(new RegExp(`${name}:\\s*${value};`))
    /* On a phone: a 24px title, 20px above and 16px at the sides. */
    const phone = tokens.slice(tokens.indexOf('@media'))
    expect(phone).toMatch(/--ds-text-title:\s*24px;/)
    expect(phone).toMatch(/--ds-page-top:\s*20px;/)
    expect(phone).toMatch(/--ds-page-side:\s*16px;/)
    /* Never dark. */
    expect(tokens).not.toMatch(/prefers-color-scheme/)
  })

  it('counts what a page sets inline, and what it writes as a hex colour or a pixel value', () => {
    expect(countOwnStyle('x.tsx', `<div style={{ marginTop: 12, color: 'red', display: 'flex' }} />`)).toMatchObject({ styles: 1, properties: 2, values: 0 })
    expect(countOwnStyle('x.tsx', `<div style={{ display: 'grid' }} className="a" />`).total).toBe(0)
    expect(countOwnStyle('x.tsx', `const c = '#1A1916'; const w = '14px'`).values).toBe(2)
    expect(countOwnStyle('x.tsx', `/* 14px and #fff in a comment */ // 12px`).total).toBe(0)
    expect(countOwnStyle('x.css', `@media (max-width: 860px) { .a { gap: var(--ds-space-8); } }`).total).toBe(0)
    expect(countOwnStyle('x.css', `.a { padding: 18px; color: #fff; }`).values).toBe(2)
    expect(countOwnStyle('x.tsx', `<a href="#main">Skip</a>`).total).toBe(0)
  })
})
