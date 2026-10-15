import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'fs'
import { join, relative } from 'path'
import { ONE_OFF_STYLE_CLASSES_LEFT } from './one-off-style-classes'
import { ONE_OFF_USES_PER_FILE } from './one-off-uses-per-file'

/**
 * NO FILE USES A ONE-OFF STYLE CLASS MORE THAN IT DID (2 October 2026). Hafsah's decision: one-off
 * classes are replaced with the proper shared parts, never reused. See one-off-uses-per-file.ts.
 */
const SRC = join(__dirname, '..', '..', '..')
const walk = (d: string): string[] => readdirSync(d).flatMap((n) => {
  const p = join(d, n)
  if (statSync(p).isDirectory()) return n === 'node_modules' ? [] : walk(p)
  return /\.tsx$/.test(n) && !/\.spec\.tsx$/.test(n) ? [p] : []
})
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const count = (src: string) => ONE_OFF_STYLE_CLASSES_LEFT.reduce((n, c) => n + (src.match(new RegExp(`(?<![\\w-])${esc(c)}(?![\\w-])`, 'g'))?.length ?? 0), 0)

describe('one-off uses only go down', () => {
  it('no file uses a one-off style class more often than it did', () => {
    const rose: string[] = []
    for (const p of walk(SRC)) {
      const r = relative(SRC, p)
      const n = count(readFileSync(p, 'utf8'))
      const was = ONE_OFF_USES_PER_FILE[r] ?? 0
      if (n > was) rose.push(`${r}: ${was} -> ${n}`)
    }
    expect(rose, 'Use a shared part instead of a one-off class').toEqual([])
  })
})
