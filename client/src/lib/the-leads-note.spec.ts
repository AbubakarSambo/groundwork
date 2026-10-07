import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { theLeadsNote, waitsForItsStart } from './the-leads-note'
import { participantLabel } from './utils'

/* The lead's Sessions list (U.6 review): "Daniel - Daniel is expected to generate…" read as pieces
   joined with dashes, and "Resend invite" was offered for an invitation still waiting for its day. */
describe('the lead’s note about a person', () => {
  it('reads as sentences', () => {
    expect(theLeadsNote('Daniel - Daniel is expected to generate 20 leads a week')).toBe('Daniel. You wrote “Daniel is expected to generate 20 leads a week”.')
    /* Changed (7 Oct, request 177 item 1): a note typed with no name in front read as a line about the person, as if she had said it. */
    expect(theLeadsNote('Runs the pipeline')).toBe('You wrote “Runs the pipeline”.')
    expect(theLeadsNote('')).toBeNull()
  })
  /* Request 36 (Hafsah, 27 September): no label is made from the lead's note at all, not even its
     first part. This used to expect "Daniel"; "Daniel - Your sales manager, who you said..." gave
     "Daniel - Your sales manager" on the board. The lead reads the note as theirs, beside the name. */
  it('and no name is made from it', () => {
    expect(participantLabel({ roleAsDescribed: 'Daniel - Daniel is expected to generate 20 leads a week' })).toBe('a colleague')
  })
})

describe('an invitation waiting for its start day', () => {
  const later = new Date(Date.now() + 5 * 86_400_000).toISOString()
  it('is not offered "Resend invite"', () => {
    expect(waitsForItsStart({ invitedAt: null, startsAt: later })).toBe(true)
    expect(waitsForItsStart({ invitedAt: '2026-09-27T10:00:00Z', startsAt: later })).toBe(false)
    expect(waitsForItsStart({ invitedAt: null, startsAt: null })).toBe(false)
    expect(waitsForItsStart({ invitedAt: null, startsAt: later, awaitingSeat: true })).toBe(false)
  })
  it('and the Sessions list says so instead', () => {
    const src = readFileSync(join(__dirname, '..', 'pages', 'grounds', 'GroundAdminPage.tsx'), 'utf8')
    expect(src).toContain('{isInitiator && !p.userId && waitsForItsStart(p as any) && (')
    expect(src).toContain('Their invitation goes out on the morning the check-in starts.')
    /* Walkthrough pass 2, item 1: "Resend invite" is also withheld from somebody with no seat at
       all - their invitation has never gone out, so there is nothing to resend. */
    expect(src).toContain('{isInitiator && !p.userId && !p.awaitingSeat && !waitsForItsStart(p as any) && (')
    expect(src).toContain('{theLeadsNote(p.roleAsDescribed)}')
  })
})
