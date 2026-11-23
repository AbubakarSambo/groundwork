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

const PEOPLE = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'PeopleAndSetupAsPictured.tsx'), 'utf8')

describe('GroundAdminPage: roster and shared-report label use participantLabel, not a raw email', () => {
  it('imports a labelling helper rather than hand-rolling one', () => {
    /**
     * Loosened once from the exact import line to the identifier, because `personLabel` came to sit
     * alongside it. Loosened again to either, because `participantLabel` is no longer used on this
     * page at all: the two places that called it - the roster row and the private-report heading -
     * both belong to the LEAD, who typed these addresses themselves, and both now use
     * `personLabel`. The rule that matters is below and unchanged: no name is ever built out of an
     * address on this page.
     */
    expect(src).toMatch(/import \{[^}]*\b(personLabel|participantLabel)\b[^}]*\} from '@\/lib\/utils'/)
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
    /* The roster moved to People and setup's one list (page audit, 24 November 2026, row 8): each row is named by whereThisPersonIs
       (WhosInItRoster.tsx), which never guesses a name from an address and says "Somebody invited by email" where it has neither. */
    expect(PEOPLE).toMatch(/const row = whereThisPersonIs\(p,/)
    expect(PEOPLE).toMatch(/\{row\.name\}/)
  })

  it('and neither surface builds a name out of an address', () => {
    for (const s of [src, PEOPLE]) expect(s).not.toMatch(/p\.email\.split\('@'\)\[0\]/)
  })
})
