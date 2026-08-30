import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

/**
 * A COLOUR THAT DOES NOT EXIST RENDERS AS NOTHING, AND NOTHING IS INVISIBLE.
 *
 * `var(--gw-accent)` was used on two pages and defined nowhere. CSS does not complain: the property
 * simply does not apply. So a button with `background: var(--gw-accent)` and white text was white
 * on white - the primary action on the page, invisible, in a build that typechecked and passed
 * every test.
 *
 * Found in a screenshot of the running page. Nothing else could have found it, which is exactly why
 * it is worth a guard rather than more care.
 */
const SRC = join(__dirname)

function everyFile(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) { everyFile(full, out); continue }
    if (/\.(tsx?|css)$/.test(name) && !/\.spec\./.test(name)) out.push(full)
  }
  return out
}

/* Everything `:root` and its friends declare. The source of truth, not a list kept here. */
function tokensDefined(): Set<string> {
  const css = readFileSync(join(SRC, 'index.css'), 'utf8')
  return new Set((css.match(/--gw-[a-z0-9-]+(?=\s*:)/gi) ?? []).map(s => s.trim()))
}

describe('every colour a page asks for is one this product has', () => {
  it('finds no reference to a token that was never defined', () => {
    const defined = tokensDefined()
    expect(defined.size).toBeGreaterThan(10)

    const missing: string[] = []
    for (const file of everyFile(SRC)) {
      /*
       * COMMENTS STRIPPED FIRST. Without this it flagged the note explaining the bug it was written
       * to catch - prose about a token is not a page rendering one, and a guard that cannot tell
       * the difference makes documenting a fix impossible.
       */
      const text = readFileSync(file, 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, ' ')
        .replace(/(^|[^:])\/\/.*$/gm, '$1')
      /*
       * A var() that carries its own fallback is fine - `var(--gw-sidebar-w, 240px)` is set from
       * JavaScript at runtime and renders correctly before it is. Only a bare one can render as
       * nothing, and that is what this is looking for.
       */
      for (const m of text.matchAll(/var\((--gw-[a-z0-9-]+)\s*([,)])/gi)) {
        if (m[2] === ',') continue
        if (!defined.has(m[1])) missing.push(`${file.replace(SRC, '')} → ${m[1]}`)
      }
    }
    expect(missing).toEqual([])
  })
})
