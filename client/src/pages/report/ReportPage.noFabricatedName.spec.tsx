import { describe, it, expect } from 'vitest'
import { participantLabel } from '@/lib/utils'

/**
 * NO-FABRICATED-NAME guard for a shared report's party handles. Used to render the email
 * local-part as if it were the person's name.
 *
 * MOVED FROM THE DEAD REPORT BODY. `adminHandle`/`partHandle`, built with
 * `adminParty ? participantLabel(adminParty) : 'the lead'`, lived in `ReportBody`
 * (`ReportPage.tsx`), not mounted by any route since the Report tab became a list of sessions.
 * Every live surface that names a party to another party (`SessionReportPage.tsx`'s `nameFor`,
 * `WhatToProbeThemOn.tsx`, `UpdatesToTheRecord.tsx`, `BoardPage.tsx`'s `HiddenContributorRow`,
 * `SharedReportForAParty.tsx`) goes through `peopleLabels`/`participantLabel` rather than
 * re-implementing the fallback chain - so the rule is strongest checked at its one source, which is
 * what this file now does, rather than against a pattern match on a page that no longer builds a
 * handle at all.
 */
describe('a party is never named by the local part of their email', () => {
  it('participantLabel never reaches for the email, whatever is on the row', () => {
    expect(participantLabel({ email: 'lena.lead@example.test' })).not.toContain('lena')
    expect(participantLabel({ email: 'lena.lead@example.test' })).not.toContain('@')
  })

  it('and falls back to a real name, or a plain neutral word, never an address', () => {
    expect(participantLabel({ user: { firstName: 'Lena', lastName: 'Lead' }, email: 'lena.lead@example.test' })).toBe('Lena Lead')
    expect(participantLabel({ email: 'lena.lead@example.test' })).toMatch(/colleague|lead/i)
  })
})
