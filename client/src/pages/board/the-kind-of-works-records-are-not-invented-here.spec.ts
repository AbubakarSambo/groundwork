import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * THE ADD-A-RECORD FORM'S OWN KINDS, CHECKED AGAINST THE ENGINE'S FILE, NEVER GUESSED.
 *
 * `WorkRecords.tsx`'s `ITEM_KINDS_FOR_HOLDS` has to know which `WorkItem.kind` values a section
 * accepts before the lead can add one - api/src/modules/board/the-kind-of-work.ts (engine-owned,
 * never changed from this workspace) is the one place that decides this, and it does not serve the
 * list on the board, so the form has to carry its own copy. Rather than trust that copy by eye,
 * this reads the engine's own source text and checks every `holds` string and its item kinds still
 * appear there together - the same style as the-switchboard-g2-table.spec.ts's own check against
 * docs/modules.md, so a future change to the engine's table that this file does not follow fails a
 * test rather than quietly adding a record nobody asked for.
 */
const ENGINE_SRC = readFileSync(
  join(__dirname, '../../../../api/src/modules/board/the-kind-of-work.ts'),
  'utf8',
)

const ITEM_KINDS_FOR_HOLDS: Record<string, string[]> = {
  'deals': ['deal'],
  'releases and tasks': ['release', 'task'],
  'tickets': ['ticket'],
  'the priorities across the teams': ['priority'],
  'milestones': ['milestone'],
  'money in and out, by month': ['money'],
  'stakeholders': ['stakeholder'],
  'incidents': ['incident'],
  'trader groups': ['group'],
  'commitments and decisions': ['commitment', 'decision'],
  'loans and their repayments': ['loan'],
  'priorities people named': ['priority'],
  'subscriptions and the metrics people state': ['subscription', 'metric'],
  'deadlines': ['deadline'],
  'the parties': ['party'],
  'counties and their projects': ['county', 'project'],
}

describe('the add-a-record form’s kinds, against the engine’s own RECORDS_FOR_EACH_KIND', () => {
  it('every `holds` phrase this form knows is the engine’s own words', () => {
    for (const holds of Object.keys(ITEM_KINDS_FOR_HOLDS)) {
      expect(ENGINE_SRC).toContain(`holds: '${holds}'`)
    }
  })

  it('every kind this form offers for a section is one the engine lists right beside that section’s `holds`', () => {
    for (const [holds, kinds] of Object.entries(ITEM_KINDS_FOR_HOLDS)) {
      const at = ENGINE_SRC.indexOf(`holds: '${holds}'`)
      expect(at).toBeGreaterThan(-1)
      const line = ENGINE_SRC.slice(at, ENGINE_SRC.indexOf('\n', at))
      for (const kind of kinds) expect(line).toContain(`'${kind}'`)
    }
  })

  it('has no section the engine does not, and misses none it has', () => {
    const engineHolds = [...ENGINE_SRC.matchAll(/holds: '([^']+)'/g)].map((m) => m[1])
    expect(new Set(Object.keys(ITEM_KINDS_FOR_HOLDS))).toEqual(new Set(engineHolds.filter((h) => !/^(where |ticket volume)/.test(h))))
  })
})
