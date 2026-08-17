import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * "NOT YET · PARTY 2" TELLS A LEAD NOTHING SHE CAN ACT ON.
 *
 * Found on the report tab of a real three-party ground, opened as its lead. The reveal row is the
 * one place on the page that answers "who am I waiting on", and it answered with a positional
 * index. She could see that somebody had not revealed and had no way to know who, on a page that
 * names people freely everywhere else - `participantLabel` is used five times in this same file.
 *
 * Nothing was missing from the client. The roster was already loaded; the row simply counted from
 * one instead of reading it. No new request, no API change.
 *
 * The second defect was in the same heading: `allActivated ? '· Both activated'`, hardcoded from
 * when a ground was always two people, sitting directly above a row of THREE cards that the same
 * block had just rendered by counting them.
 */
const SRC = readFileSync(join(__dirname, 'GroundAdminPage.tsx'), 'utf8')
const CODE = SRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '')

describe('the reveal row names people', () => {
  it('no longer prints a positional index as the primary label', () => {
    expect(CODE).not.toMatch(/marginTop: 2 \}\}>Party \{i \+ 1\}<\/div>/)
  })

  it('reads the name off the roster the page already has', () => {
    expect(CODE).toMatch(/\(ground\?\.participants \?\? \[\]\)\.find\(\(x: any\) => x\.id === p\.participantId\)/)
    expect(CODE).toMatch(/person \? participantLabel\(person\) : `Party \$\{i \+ 1\}`/)
  })

  it('and keeps the index as a fallback rather than rendering nothing', () => {
    /**
     * A party invited by email who has never recorded a name still has to occupy a card - blanking
     * it would lose the fact that somebody has not revealed, which is the whole point of the row.
     */
    expect(CODE).toMatch(/`Party \$\{i \+ 1\}`/)
  })

  it('using the helper this page already uses everywhere else', () => {
    /** Not a second naming rule. A lead should not read two different names for the same person. */
    expect(CODE).toMatch(/import \{ participantLabel \} from '@\/lib\/utils'/)
  })
})

describe('the heading counts past two', () => {
  it('does not say "Both" about a ground that may have more than two parties', () => {
    expect(CODE).not.toMatch(/Both activated/)
  })

  it('and says something true for any number of them', () => {
    expect(CODE).toMatch(/Everyone has revealed/)
  })

  it('while still distinguishing the waiting state', () => {
    /** The control: the heading must keep saying which of the two states this ground is in. */
    expect(CODE).toMatch(/activationStatus\.allActivated \? '· Everyone has revealed' : '· Waiting'/)
  })
})
