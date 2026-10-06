import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

vi.mock('@/api/resolution', () => ({
  resolutionApi: {
    get: vi.fn(async () => ({
      resolution: { id: 'r1', groundId: 'g1', endState: 'KEEP', closedAt: '2026-09-30T10:00:00Z', reason: 'He met his goal of 4 new accounts.' },
      confirmations: [],
      confirmedCount: 1,
      totalActive: 2,
      options: [{ value: 'KEEP', label: 'Keep the hire' }],
      groundStatus: 'CLOSED',
      leadDecides: true,
      viewerIsLead: true,
      viewerIsParty: true,
    })),
    propose: vi.fn(),
  },
}))

import { ResolutionPanel } from '@/components/gw/ResolutionPanel'

/**
 * HOW IT ENDED, ON THE REPORT (U.11).
 *
 * The report printed "Closed: KEEP" - the stored code joined to a word with a colon. It now
 * prints the outcome by its name, and the lead's reason, which the server serves only to the
 * people in the check-in and an admin.
 *
 * MOVED FROM THE DEAD REPORT BODY. This used to render `ResolutionSection` from the old
 * `ReportBody` (`ReportPage.tsx`), which nothing has mounted since the Report tab became a list of
 * sessions. The live equivalent is `ResolutionPanel`, which the board and the ending page both use -
 * the rule is the same one, worded the same way, so this now asserts against the surface a person
 * actually opens.
 */
describe('the report says how the check-in ended', () => {
  it('by the outcome’s name and the reason, never the stored code', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { container } = render(
      <QueryClientProvider client={qc}><ResolutionPanel groundId="g1" /></QueryClientProvider>,
    )
    expect(await screen.findByText('Keep the hire')).toBeTruthy()
    expect(screen.getByText('He met his goal of 4 new accounts.')).toBeTruthy()
    expect(container.textContent).not.toContain('Closed:')
    expect(container.textContent).not.toMatch(/\bKEEP\b/)
  })
})
