import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'fs'
import { join, relative } from 'path'
import { THE_STYLE_TAGS_THERE_WERE } from './the-style-tags-there-were-on-1-october'

/**
 * NO NEW <style> TAG, AND NO NEW CLASS IN THE OLD ONES (1 October 2026). See
 * the-style-tags-there-were-on-1-october.ts.
 */
const SRC = join(__dirname, '..', '..', '..')
function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n)
    if (statSync(p).isDirectory()) return n === 'node_modules' ? [] : walk(p)
    return /\.tsx$/.test(n) && !/\.spec\.tsx$/.test(n) ? [p] : []
  })
}
const classesIn = (src: string) => {
  const out = new Set<string>()
  for (const m of src.matchAll(/`([^`]*)`/g)) {
    const t = m[1]
    if (t.includes('{') && t.includes(':')) for (const c of t.matchAll(/\.([a-zA-Z_][\w-]*)(?=[^{};`]*\{)/g)) out.add(c[1])
  }
  return [...out].sort()
}

describe('no new style tag', () => {
  const files = walk(SRC).filter((p) => /<style[\s>]/.test(readFileSync(p, 'utf8')))
  it('only the files that had one on 1 October draw their own <style>', () => {
    const rel = files.map((p) => relative(SRC, p)).sort()
    expect(rel.filter((r) => !(r in THE_STYLE_TAGS_THERE_WERE)), 'Put this in gw-ui.css as a written-up shared part').toEqual([])
  })
  it('and those files add no new class to it', () => {
    const added: string[] = []
    for (const p of files) {
      const r = relative(SRC, p)
      const known = THE_STYLE_TAGS_THERE_WERE[r] ?? []
      for (const c of classesIn(readFileSync(p, 'utf8'))) if (!known.includes(c)) added.push(`${r}: .${c}`)
    }
    expect(added).toEqual([])
  })
})
