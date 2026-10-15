import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TheDonePage } from './TheDonePage'
import { groundsApi } from '@/api/grounds'

/**
 * RE-REVIEW BUG: THE DONE PAGE SAID "OPENS ON SUNDAY 4 OCTOBER" ABOUT A SESSION ALREADY RUNNING.
 *
 * The lead's session 2 was already IN_PROGRESS - somebody had started it - and the Done page still
 * read its `availableFrom` (a future date, from before it was started) and said "Your next check-in
 * opens on Sunday 4 October at 8:23pm." An IN_PROGRESS session is open whatever its availableFrom
 * says, the same rule `myOpenOpensLater` already uses on the ground pages. Fixed in
 * what-the-end-of-a-check-in-can-say.ts (`whenTheNextOneOpens`, `theNextOpenCheckInId`); this pins
 * what the Done page actually shows.
 */
vi.mock('@/api/grounds', () => ({
  groundsApi: { get: vi.fn(), getMyCheckinStatus: vi.fn() },
}))
vi.mock('@/api/conversation', () => ({
  conversationApi: { artifact: vi.fn(async () => ({ artifact: null })) },
}))

const GROUND = {
  participants: [
    { id: 'p-lead', partyType: 'INITIATOR', userId: 'u-lead', user: { firstName: 'Wairimu', lastName: 'Kamau' }, managingOnly: false },
  ],
  aTeamReportComes: false,
  viewerIsInitiator: true,
  leadFirstName: 'Wairimu',
  leadAnswersToo: true,
  report: null,
  checkIns: [{ id: 'ci1', sessionNumber: 1 }],
}

function renderDonePage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <TheDonePage firstName="Wairimu" checkInId="ci1" groundId="g1" sessionNumber={1} myUserId="u-lead" isInitiator />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('the Done page, when the next session is already open', () => {
  it('says it is open now, not a future date, and links to it', async () => {
    ;(groundsApi.get as any).mockResolvedValue(GROUND)
    ;(groundsApi.getMyCheckinStatus as any).mockResolvedValue({
      checkIns: [
        { id: 'ci1', sessionNumber: 1, status: 'COMPLETED' },
        { id: 'ci2', sessionNumber: 2, status: 'IN_PROGRESS', availableFrom: '2026-10-04T20:23:00.000Z' },
      ],
    })
    renderDonePage()
    expect(await screen.findByText(/Your check-in is saved\. Your next check-in is open now\./)).toBeTruthy()
    expect(screen.queryByText(/opens on/)).toBeNull()
    const link = screen.getByRole('link', { name: 'Go to it' })
    expect(link).toHaveAttribute('href', '/checkin/ci2')
  })

  it('says a future date and shows no link when the next session genuinely has not opened yet', async () => {
    ;(groundsApi.get as any).mockResolvedValue(GROUND)
    ;(groundsApi.getMyCheckinStatus as any).mockResolvedValue({
      checkIns: [
        { id: 'ci1', sessionNumber: 1, status: 'COMPLETED' },
        { id: 'ci2', sessionNumber: 2, status: 'NOT_STARTED', availableFrom: '2099-10-04T20:23:00.000Z' },
      ],
    })
    renderDonePage()
    expect(await screen.findByText(/Your check-in is saved\. Your next check-in opens/)).toBeTruthy()
    expect(screen.queryByRole('link', { name: 'Go to it' })).toBeNull()
  })
})
