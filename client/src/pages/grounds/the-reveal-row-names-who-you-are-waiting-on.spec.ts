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
 * when a check-in was always two people, sitting directly above a row of THREE cards that the same
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
    /**
     * Loosened from the exact import line to the identifier: `personLabel` now sits alongside it in
     * the same statement (the lead's own view may fall back to an address; a party's view may not),
     * and pinning the literal line would make adding a second helper look like removing this one.
     */
    expect(CODE).toMatch(/import \{[^}]*\bparticipantLabel\b[^}]*\} from '@\/lib\/utils'/)
  })
})

describe('the heading counts past two', () => {
  it('does not say "Both" about a check-in that may have more than two parties', () => {
    expect(CODE).not.toMatch(/Both activated/)
  })

  it('and says something true for any number of them', () => {
    /*
     * Matched on the shape, not the verb. This read /Everyone has revealed/ and went red when the
     * act was renamed from "reveal" to "show" - a vocabulary decision, with the heading still
     * saying the true thing for any number of people. That is the second time this file has been
     * broken by pinning a word rather than the claim; the comment below records the first.
     */
    expect(CODE).toMatch(/Everyone has \w+ theirs/)
  })

  it('while still distinguishing the waiting state', () => {
    /**
     * The control: the heading must keep saying which of the two states this check-in is in.
     *
     * Matched on the BRANCH rather than on both strings verbatim. It pinned the exact ternary, so
     * adding a word - "Everyone has shown theirs", after the heading was renamed to say WHICH
     * reports it means - turned it red while both states were still perfectly distinguished.
     */
    expect(CODE).toMatch(/activationStatus\.allActivated \? '·[^']*' : '· Waiting'/)
  })
})
