import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import {
  SWITCHBOARD_GROUPS, SWITCHBOARD_SITUATIONS, EXAMPLE_SWITCHBOARD_ROW,
  G2_SECTIONS, G2_SECTION_NAMES, SWITCHBOARD_MATRIX,
} from './the-switchboard-g2-table'

/**
 * U.10 REVIEW ITEM 1: THE G2 TABLE, AS DATA, CHECKED AGAINST THE PROTOTYPE'S OWN TEXT.
 *
 * docs/prototype/screens/B1-starting-a-check-in/switchboard.txt is a plain-text scrape of the
 * prototype page. Every group heading, every situation name, and the "Help someone get back on
 * track" legend (Switched on / Optional / Off by design) appear in it verbatim, so this checks the
 * transcription line by line rather than trusting it by eye.
 */
const SWITCHBOARD_FILE = join(__dirname, '../../../../docs/prototype/screens/B1-starting-a-check-in/switchboard.txt')
/* docs/prototype/ is not tracked by git, so this runs only where the prototype's text exists. */
const THE_PROTOTYPE_IS_HERE = existsSync(SWITCHBOARD_FILE)
const SWITCHBOARD_TXT = THE_PROTOTYPE_IS_HERE ? readFileSync(SWITCHBOARD_FILE, 'utf8') : ''

describe.skipIf(!THE_PROTOTYPE_IS_HERE)('the switchboard’s 24 situations, against the prototype’s own text', () => {
  it('has exactly the prototype’s 24 situations', () => {
    expect(SWITCHBOARD_SITUATIONS.length).toBe(24)
  })

  it('every group heading is in the prototype’s text', () => {
    for (const { group } of SWITCHBOARD_GROUPS) expect(SWITCHBOARD_TXT).toContain(group)
  })

  it('every situation name is in the prototype’s text', () => {
    for (const situation of SWITCHBOARD_SITUATIONS) expect(SWITCHBOARD_TXT).toContain(situation)
  })

  it('the example row’s switched-on sections are all in the prototype’s "Switched on" list', () => {
    for (const s of EXAMPLE_SWITCHBOARD_ROW.switchedOn) expect(SWITCHBOARD_TXT).toContain(s)
  })

  it('the example row’s optional sections match the prototype’s "Optional" line', () => {
    expect(SWITCHBOARD_TXT).toContain(EXAMPLE_SWITCHBOARD_ROW.optional.join(', '))
  })

  it('the example row’s off-by-design reasons are the prototype’s own words', () => {
    for (const { why } of EXAMPLE_SWITCHBOARD_ROW.offByDesign) expect(SWITCHBOARD_TXT).toContain(why)
  })
})

/**
 * U.10 RE-REVIEW ITEM A: G2's OWN GRID, AS DATA, PARSED FROM docs/modules.md AND CHECKED AGAINST IT.
 *
 * G2 writes the 30 sections and the 24-by-30 grid out as two markdown tables (docs/modules.md,
 * section "G2. The switchboard: which sections each situation uses"). This parses both tables from
 * the live file and checks SWITCHBOARD_MATRIX and G2_SECTIONS cell by cell against what is actually
 * there today, so a future edit to G2 that the data file does not follow fails here rather than
 * silently drawing the wrong board.
 */
const MODULES_MD = readFileSync(join(__dirname, '../../../../docs/modules.md'), 'utf8')

function tableRows(md: string, startMarker: string, endMarker: string): string[][] {
  const start = md.indexOf(startMarker)
  const end = md.indexOf(endMarker, start)
  const chunk = md.slice(start, end === -1 ? undefined : end)
  return chunk
    .split('\n')
    .filter((l) => l.trim().startsWith('|') && !/^\|[\s-]+\|/.test(l.trim()))
    .map((l) => l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim()))
}

function splitList(cell: string): string[] {
  const c = cell.replace(/\*\*/g, '').trim()
  if (c === 'None' || c === '') return []
  return c.split(',').map((s) => s.trim()).filter(Boolean)
}

describe('G2’s 30 sections, parsed from docs/modules.md', () => {
  const rows = tableRows(MODULES_MD, '| Section | What it shows |', '**Every situation:**')
    .filter((r) => r[0] !== 'Section')

  it('has all 30 sections, in G2’s own order', () => {
    expect(rows.map((r) => r[0])).toEqual(G2_SECTION_NAMES)
    expect(G2_SECTION_NAMES.length).toBe(30)
  })

  it('every section’s "what it shows" matches G2’s own words', () => {
    const byName = new Map(rows.map((r) => [r[0], r[1]]))
    for (const { name, shows } of G2_SECTIONS) expect(byName.get(name)).toBe(shows)
  })
})

describe('G2’s 24-by-30 grid, parsed from docs/modules.md', () => {
  const rows = tableRows(MODULES_MD, '| Group | Situation | What its board is for |', '**What the backend must add.**')
    .filter((r) => r[0] !== 'Group')

  it('has all 24 situations, in G2’s own order', () => {
    expect(rows.length).toBe(24)
    expect(rows.map((r) => r[1].replace(/\*\*/g, ''))).toEqual(SWITCHBOARD_MATRIX.map((r) => r.situation))
  })

  it('every row’s group, sections on, optional, off on purpose and backend-has-it match the data file', () => {
    rows.forEach((row, i) => {
      const want = SWITCHBOARD_MATRIX[i]
      expect(row[0]).toBe(want.group)
      expect(row[1].replace(/\*\*/g, '')).toBe(want.situation)
      expect(splitList(row[3])).toEqual(want.sectionsOn)
      expect(splitList(row[4])).toEqual(want.optional)
      expect(splitList(row[5])).toEqual(want.offOnPurpose)
      expect(row[6].replace(/\*\*/g, '').trim()).toBe(want.backendHasIt ? 'Yes' : 'No')
    })
  })

  it('every section named in the grid is one of the 30 named sections', () => {
    const named = new Set(G2_SECTION_NAMES)
    for (const row of SWITCHBOARD_MATRIX) {
      for (const s of [...row.sectionsOn, ...row.optional, ...row.offOnPurpose]) expect(named.has(s)).toBe(true)
    }
  })
})
