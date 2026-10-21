import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'fs'
import { join, relative } from 'path'

/**
 * EVERY FIELD A PERSON TYPES IN IS THE KIT'S (browser test, 20 October 2026).
 *
 * PR #392's rule for fields: 48px tall and 16px words. The browser test measured fields on the screens people use that
 * were drawn by hand smaller: the board's "Add a target" and "how many" (36px, 13.5px), the board's ask bar (13.5px),
 * Ask's "About" picker (34px), My work's "against" picker (38px, 12.5px), and, read off the code, the board's invite
 * fields, its poll question, the Feedback email, the context chat, and the two code fields. A field under 16px also makes
 * a phone zoom in when it is tapped.
 *
 * This reads every screen's source for an <input> or <select> drawn with words under 16px. The two back offices
 * (pages/admin, pages/ops) and the prompts page are Groundwork staff's own, and are left to Hafsah's decision.
 */
const SRC = __dirname
const STAFF_ONLY = [/^pages\/admin\//, /^pages\/ops\//, /^pages\/prompts\//, /^pages\/preview\//]

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f)
    if (statSync(p).isDirectory()) return f === 'node_modules' ? [] : files(p)
    return /\.tsx$/.test(f) && !/\.spec\./.test(f) ? [p] : []
  })
}

function tags(source: string): { tag: string; line: number }[] {
  const out: { tag: string; line: number }[] = []
  const re = /<(input|select)\b/g
  let m: RegExpExecArray | null
  while ((m = re.exec(source))) {
    let depth = 0
    let k = m.index + m[0].length
    for (; k < source.length; k++) {
      const c = source[k]
      if (c === '{') depth++
      else if (c === '}') depth--
      else if (c === '>' && depth === 0) break
    }
    out.push({ tag: source.slice(m.index, k + 1), line: source.slice(0, m.index).split('\n').length })
  }
  return out
}

function smallWords(tag: string): number | null {
  if (/type="(checkbox|radio|file|hidden|range|color)"/.test(tag) || /sr-only/.test(tag) || /gwui-input/.test(tag)) return null
  const inline = tag.match(/fontSize:\s*([\d.]+)/)
  if (inline && Number(inline[1]) < 16) return Number(inline[1])
  const cls = tag.match(/gwui-fs-(\d+)(?:-(\d+))?/)
  if (cls) { const n = Number(`${cls[1]}.${cls[2] ?? 0}`); if (n < 16) return n }
  return null
}

describe('every field a person types in is the kit\'s', () => {
  it('no field on a screen people use is drawn with words under 16px', () => {
    const small: string[] = []
    for (const p of files(SRC)) {
      const rel = relative(SRC, p).split('\\').join('/')
      if (STAFF_ONLY.some((r) => r.test(rel))) continue
      for (const t of tags(readFileSync(p, 'utf8'))) {
        const n = smallWords(t.tag)
        if (n !== null) small.push(`${rel}:${t.line} (${n}px)`)
      }
    }
    expect(small).toEqual([])
  })

  it('the shared field is 48px tall with 16px words', () => {
    const css = readFileSync(join(SRC, 'components/gw/ui/gw-ui.css'), 'utf8')
    expect(css).toMatch(/\.gwui-input \{[^}]*min-height: 48px;/)
    expect(css).toMatch(/\.gwui-input \{[^}]*font-size: 16px;/)
  })
})
