import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

/**
 * SEVEN FIELDS ON THE SET-UP WIZARD WERE COMPLETELY UNSTYLED, AND NOTHING FAILED.
 *
 * Reported from the screen: "it is not clear that there's an input field at the bottom." Measured
 * in the running app, the three fields under "Someone else sets the context" had
 * `border: 0px`, a transparent background, `display: inline-block` and a width of 146px - so they
 * sat side by side on one line and looked exactly like three pieces of grey placeholder text.
 *
 * The cause: `className="gw-in"`. The class is `gw-input`. `gw-in` matches no rule anywhere, so
 * every one of those inputs rendered with browser defaults inside a page that removes them. A
 * typo'd class name is silent - it type-checks, it renders, it just does nothing - and the seventh
 * was a textarea that wanted `gw-ta`. After the fix the same three fields measure 478 x 38 with a
 * 1px border and a filled background, stacked.
 *
 * So the check is not about these seven: it is that no TSX anywhere names a gw- class that no
 * stylesheet defines.
 */
const CLIENT = join(__dirname, '../..')
/* UPDATED 24 October: the kit's stylesheet and the two in styles/ (the prototype's, and the product's small one) are stylesheets too. */
const CSS = ['index.css', 'components/gw/ui/gw-ui.css', 'styles/prototype.css', 'styles/product.css'].map(f => readFileSync(join(CLIENT, f), 'utf8')).join('\n')

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e)
    if (statSync(p).isDirectory()) walk(p, out)
    else if (/\.tsx$/.test(e) && !/\.spec\.tsx$/.test(e)) out.push(p)
  }
  return out
}

/** Classes defined in a <style> block inside a component rather than in index.css. */
const INLINE_STYLE_BLOCKS = walk(CLIENT)
  .map(f => readFileSync(f, 'utf8'))
  .join('\n')

const defined = (cls: string) =>
  new RegExp(`\\.${cls}\\b`).test(CSS) || new RegExp(`\\.${cls}\\b`).test(INLINE_STYLE_BLOCKS)

describe('every gw- class a component asks for', () => {
  const used = new Map<string, string>()
  for (const file of walk(CLIENT)) {
    const src = readFileSync(file, 'utf8')
    for (const m of src.matchAll(/className="([^"{}]*)"/g)) {
      for (const cls of m[1].split(/\s+/).filter(c => c.startsWith('gw-'))) {
        if (!used.has(cls)) used.set(cls, file.replace(CLIENT, ''))
      }
    }
  }

  it('found some to check, or this test proves nothing', () => {
    expect(used.size).toBeGreaterThan(10)
  })

  it('is defined in a stylesheet', () => {
    const missing = [...used.entries()]
      .filter(([cls]) => !defined(cls))
      .map(([cls, file]) => `${cls} (${file})`)
    expect(missing).toEqual([])
  })
})
