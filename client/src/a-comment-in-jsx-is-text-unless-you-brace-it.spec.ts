import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

/**
 * A COMMENT AT JSX-CHILD POSITION IS NOT A COMMENT. IT IS A PARAGRAPH ON THE PAGE.
 *
 * Shipped and photographed: five lines explaining why the lead-capture panel had been removed
 * appeared underneath the conversation on the entry chat, in front of anybody who opened it. The
 * code said `/* ... *\/` where `{/* ... *\/}` was needed, and inside JSX children that is a string
 * literal, not a comment.
 *
 * NOTHING ELSE CATCHES IT. TypeScript is happy - it is valid JSX text. The linter is happy. Every
 * unit test is happy, because none of them render that branch. It is visible only to a person
 * looking at the running page, which is how it was found.
 *
 * WHAT THIS LOOKS FOR: a block comment whose neighbours are JSX. A line before it that closes an
 * element or an expression, and a line after it that opens one. That is the shape of the mistake and
 * it does not match a comment sitting in ordinary code, above a function, or inside a props object.
 */
function everyTsxUnder(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) everyTsxUnder(full, found)
    else if (entry.endsWith('.tsx') && !entry.includes('.spec.')) found.push(full)
  }
  return found
}

/** A line that closes a JSX element or an embedded expression. */
const CLOSES_JSX = /(\)\}|\/>|<\/[A-Za-z][\w.]*>|^\s*>)\s*$/
/** A line that opens one. */
const OPENS_JSX = /^\s*(\{|<[A-Za-z])/

describe('a comment in JSX is text unless you brace it', () => {
  const files = everyTsxUnder(join(__dirname, 'pages')).concat(everyTsxUnder(join(__dirname, 'components')))

  it('found the components, or this proves nothing', () => {
    expect(files.length).toBeGreaterThan(20)
  })

  it('never leaves a bare block comment between two pieces of JSX', () => {
    const rendered: string[] = []

    for (const file of files) {
      const lines = readFileSync(file, 'utf8').split('\n')
      for (let i = 0; i < lines.length; i++) {
        if (!/^\s*\/\*/.test(lines[i])) continue
        /* Braced already - `{/*` - which is the correct form and the common one. */
        if (/^\s*\{\s*\/\*/.test(lines[i])) continue

        /* Walk back to the last line with anything on it. */
        let before = i - 1
        while (before >= 0 && lines[before].trim() === '') before--
        if (before < 0 || !CLOSES_JSX.test(lines[before])) continue

        /* And forward past the rest of the comment to the next line with anything on it. */
        let after = i
        while (after < lines.length && !lines[after].includes('*/')) after++
        after++
        while (after < lines.length && lines[after].trim() === '') after++
        if (after >= lines.length || !OPENS_JSX.test(lines[after])) continue

        rendered.push(`${file.split('/src/')[1]}:${i + 1}  ${lines[i].trim().slice(0, 60)}`)
      }
    }

    expect(rendered).toEqual([])
  })
})
