import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { theWordsOfALine } from './BoardPage'

/**
 * Seen on 29 September as Juma, an admin who reads "Sales team, Q3": once the server left out the
 * words of a line that named a file he may not open (request 46), "Who owns what" still drew the
 * line's label, "This is progress they reported.", with nothing above it.
 */
describe('a line under "Who owns what" with no words is not drawn', () => {
  it('reads a line with no words, or only the engine tag, as empty', () => {
    expect(theWordsOfALine('')).toBe('')
    expect(theWordsOfALine('   ')).toBe('')
    expect(theWordsOfALine(null)).toBe('')
    expect(theWordsOfALine('[VERIFIABILITY:HIGH] ')).toBe('')
    expect(theWordsOfALine('[VERIFIABILITY:HIGH] Four shops for me')).toBe('Four shops for me')
  })

  it('draws only the lines that have words, and says nobody has said anything when none have', () => {
    const src = readFileSync(join(__dirname, 'BoardPage.tsx'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ')
    expect(src).toContain('const said = p.items.filter((it) => theWordsOfALine(it.text))')
    expect(src).toContain('said.length === 0 ?')
    /* U.10 (d): the row's own `i` (only ever used for the old borderTop-first-row ternary) is
       gone now that ternary is a CSS class (`gwui-inner-row`, :first-child) - the invariant this
       guards is still "maps over `said`, never the raw `p.items`". */
    expect(src).toContain(') : said.map((it) => (')
    expect(src).not.toContain(') : p.items.map((it) => (')
  })
})
