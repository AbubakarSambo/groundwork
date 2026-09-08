import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

/**
 * NO-FABRICATED-NAME display guard. The initiator's own roster and the
 * shared-solo-report label used to show a raw email / email-local-part
 * instead of the participant's actual name (or roleAsDescribed / "a
 * teammate" fallback) - the one existing helper for this, participantLabel(),
 * was bypassed on these two surfaces. Source-level: both call sites must use
 * participantLabel, and neither may render a raw email-local-part as a name.
 */
const src = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), 'GroundAdminPage.tsx'),
  'utf8',
)

describe('GroundAdminPage: roster and shared-report label use participantLabel, not a raw email', () => {
  it('imports participantLabel', () => {
    /**
     * Loosened from the exact import line to the identifier: `personLabel` now sits alongside it in
     * the same statement (the lead's own view may fall back to an address; a party's view may not),
     * and pinning the literal line would make adding a second helper look like removing this one.
     */
    expect(src).toMatch(/import \{[^}]*\bparticipantLabel\b[^}]*\} from '@\/lib\/utils'/)
  })

  it('the roster row name comes from a helper, never a hand-rolled address', () => {
    /**
     * NOW `personLabel`, AND FOR THE REASON THIS GUARD EXISTS.
     *
     * The prohibition is on a fabricated name - an email LOCAL-PART wearing the position of a
     * name - and it still holds below. What this row must not do is leave people
     * indistinguishable: a lead who invited three colleagues saw three rows all reading "a
     * teammate", which is `participantLabel`'s fallback and correct BETWEEN PARTIES, where an
     * address may be hidden. On the lead's own roster they typed those addresses themselves, so
     * `personLabel` - the same family of helper, address as an explicit last resort - is the one
     * that belongs here. See the note above `personLabel` in lib/utils.ts.
     */
    expect(src).toMatch(/\{personLabel\(p\)\}/)
  })

  it('and neither surface builds a name out of an address', () => {
    expect(src).toMatch(/\{personLabel\(p\)\}'s private report/)
    expect(src).not.toMatch(/p\.email\.split\('@'\)\[0\]/)
  })
})
