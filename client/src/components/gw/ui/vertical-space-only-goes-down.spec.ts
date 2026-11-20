import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'fs'
import { join, relative } from 'path'
import { VERTICAL_SPACE_PER_FILE } from './vertical-space-per-file'

/**
 * VERTICAL SPACE ONLY GOES DOWN (docs/spacing-audit-15-nov.md, section 5), the way
 * one-off-uses-only-go-down.spec.ts keeps one-off classes from growing.
 *
 * Gaps between blocks come from the four tokens in gw-ui.css (--gw-space-section, --gw-space-first,
 * --gw-space-block, --gw-space-line) and from the shared parts (Page, Stack, Section, Note, PageTitle's
 * meta). A page that picks its own number with an inline marginTop, marginBottom, paddingTop or
 * paddingBottom with a number, or with a gwui-mt-*, gwui-mb-*, gwui-pt-* or gwui-pb-* class, is counted here. A file
 * may use fewer than it did, never more. When a file's count falls, lower it in
 * vertical-space-per-file.ts (run: node scripts/count-vertical-space.mjs from client/ prints the table).
 * The back office, platform admin and prompt tools are not counted: customers do not meet them.
 */
const SRC = join(__dirname, '..', '..', '..')
const NOT_COUNTED = [/^pages\/ops\//, /^pages\/admin\//, /^pages\/prompts\//, /^pages\/dev\//, /^components\/gw\/ops\//]
const walk = (d: string): string[] => readdirSync(d).flatMap((n) => {
  const p = join(d, n)
  if (statSync(p).isDirectory()) return n === 'node_modules' ? [] : walk(p)
  return /\.tsx$/.test(n) && !/\.spec\.tsx$/.test(n) ? [p] : []
})
export const countVerticalSpace = (src: string) =>
  (src.match(/\b(marginTop|marginBottom|paddingTop|paddingBottom):(?!\s*['\"`]?var\(--gw-space-)/g)?.length ?? 0) +
  (src.match(/(?<![\w-])gwui-(mt|mb|pt|pb)-\d+(?![\w-])/g)?.length ?? 0)

describe('vertical space only goes down', () => {
  it('no customer-facing file picks its own vertical space more often than it did', () => {
    const rose: string[] = []
    for (const p of walk(SRC)) {
      const r = relative(SRC, p)
      if (NOT_COUNTED.some((x) => x.test(r))) continue
      const n = countVerticalSpace(readFileSync(p, 'utf8'))
      const was = VERTICAL_SPACE_PER_FILE[r] ?? 0
      if (n > was) rose.push(`${r}: ${was} -> ${n}`)
    }
    expect(rose, 'Use the spacing tokens or a shared part instead of a number of your own').toEqual([])
  })
})
