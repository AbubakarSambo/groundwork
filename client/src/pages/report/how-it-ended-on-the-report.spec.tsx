import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

vi.mock('@/api/client', () => ({
  apiClient: {
    get: vi.fn(async () => ({
      data: {
        resolution: { id: 'r1', groundId: 'g1', endState: 'KEEP', closedAt: '2026-09-30T10:00:00Z', reason: 'He met his goal of 4 new accounts.' },
        confirmations: [],
        confirmedCount: 1,
        totalActive: 2,
        options: [{ value: 'KEEP', label: 'Keep the hire' }],
        groundStatus: 'CLOSED',
        leadDecides: true,
      },
    })),
  },
}))

import { ResolutionSection } from './ReportPage'

/**
 * HOW IT ENDED, ON THE REPORT (U.11). The report printed "Closed: KEEP", the stored code joined to a
 * word with a colon. It now prints the outcome by its name, and the lead's reason, which the server
 * serves only to the people in the check-in and an admin.
 */
describe('the report says how the check-in ended', () => {
  it('by the outcome’s name and the reason, never the stored code', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { container } = render(
      <MemoryRouter>
        <QueryClientProvider client={qc}><ResolutionSection groundId="g1" /></QueryClientProvider>
      </MemoryRouter>,
    )
    expect(await screen.findByText('Keep the hire')).toBeTruthy()
    expect(screen.getByText('Decided by the lead. Every account stays on the record.')).toBeTruthy()
    expect(screen.getByText('He met his goal of 4 new accounts.')).toBeTruthy()
    expect(container.textContent).not.toContain('KEEP')
    expect(container.textContent).not.toContain('Closed:')
  })
})
