/* KNOWN FAILURE (Release 1, pull request 1, 18 October 2026): this test fails on origin/staging (cbc1927ed) too, run the
   same way, so this pull request does not cause it: it reads docs/the-parts-against-the-prototype.md, which staging does not have. Left in place, not changed, so it is fixed in its own change. */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { THE_CLASSES_THERE_WERE } from './the-classes-there-were-on-1-october'
import { THE_OLD_STYLESHEETS_CLASSES } from './the-old-stylesheets-classes-on-1-october'

/**
 * NO NEW CLASS WITHOUT A SHARED PART (1 October 2026). See the-classes-there-were-on-1-october.ts.
 * A class gw-ui.css did not have on 1 October must be written up, by its own name, in the parts
 * table, where each shared part names the prototype value it follows. Copying an old page's values
 * into a new page-only class fails here.
 */
const css = readFileSync(join(__dirname, 'gw-ui.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
const defined = [...new Set([...css.matchAll(/\.(gwui-[a-z0-9-]+)/g)].map((m) => m[1]))].sort()
const partsTable = readFileSync(join(__dirname, '..', '..', '..', '..', '..', 'docs', 'the-parts-against-the-prototype.md'), 'utf8')

describe('no new class without a shared part', () => {
  it('every class gw-ui.css defines was there on 1 October, or is a shared part written up in the parts table', () => {
    const unexplained = defined.filter((c) => !THE_CLASSES_THERE_WERE.includes(c) && !partsTable.includes(c))
    expect(unexplained, 'Build this from a shared part, or write the new part up in docs/the-parts-against-the-prototype.md').toEqual([])
  })
  it('and the frozen list holds no class gw-ui.css no longer defines, so it keeps getting shorter', () => {
    const gone = THE_CLASSES_THERE_WERE.filter((c) => !defined.includes(c))
    expect(gone, 'Take these names off the frozen list').toEqual([])
  })
  it('and the old stylesheet, index.css, gets no new class at all: a new part goes in gw-ui.css', () => {
    const old = readFileSync(join(__dirname, '..', '..', '..', 'index.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
    const inOld = [...new Set([...old.matchAll(/(?<![\w\d)])\.([a-zA-Z_][\w-]*)/g)].map((m) => m[1]))]
    const added = inOld.filter((c) => !THE_OLD_STYLESHEETS_CLASSES.includes(c))
    expect(added, 'Put this in gw-ui.css as a shared part, written up in the parts table').toEqual([])
  })
})
