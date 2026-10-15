import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TheDonePage } from './TheDonePage'
import { groundsApi } from '@/api/grounds'

/**
 * U.8, EDGE CASE CAUGHT BEFORE TICKING: A ROUND CAN CLOSE BEFORE THE TEAM DOES.
 *
 * A lead who finishes session 1 alone, then adds more people, leaves session 1 in
 * `roundCompletions` for good - it records that everyone who was on the round AT THE TIME IT
 * CLOSED had answered, which was true (there was nobody else yet). The Done page's old
 * `roundIsIn` read exactly that array and offered "Read it" on the team's report, while
 * `GET /grounds/:id/report` for the same check-in still answers `{ forming: true, releasedAt:
 * null }` - there is nothing to read.
 *
 * The one fact that decides whether there is something to read is whether the report has
 * released, on `ground.report.releasedAt` - the real shape below has session 1 sitting in
 * `roundCompletions` AND a report that has not released, together, the way a live check-in
 * would actually send it.
 */

vi.mock('@/api/grounds', () => ({
  groundsApi: {
    get: vi.fn(),
    getMyCheckinStatus: vi.fn(async () => ({ checkIns: [] })),
  },
}))
vi.mock('@/api/conversation', () => ({
  conversationApi: { artifact: vi.fn(async () => ({ artifact: null })) },
}))

const AFTER_A_ROUND_CLOSED_ALONE_THEN_GREW = {
  participants: [
    { id: 'p-lead', partyType: 'INITIATOR', userId: 'u-lead', managingOnly: false },
  ],
  aTeamReportComes: true,
  viewerIsInitiator: true,
  /* Session 1 closed when the lead was the only party - real, not a lie, at the time it closed. */
  roundCompletions: [{ sessionNumber: 1, completedAt: '2026-09-20T10:00:00.000Z' }],
  /* But the report for it has not released: forming, same as the report endpoint answers now. */
  report: { id: 'r1', releasedAt: null, createdAt: '2026-09-20T10:00:01.000Z' },
}

function renderDonePage() {
  ;(groundsApi.get as any).mockResolvedValue(AFTER_A_ROUND_CLOSED_ALONE_THEN_GREW)
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <TheDonePage
          firstName="Wairimu"
          checkInId="c1"
          groundId="g1"
          sessionNumber={1}
          myUserId="u-lead"
          isInitiator
        />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('the team report card, on a round that closed before the report released', () => {
  it('does not offer "Read it" - the round having closed is not the report having released', async () => {
    renderDonePage()
    await screen.findByText('The team’s report')
    expect(screen.queryByRole('link', { name: 'Read it' })).toBeNull()
  })

  it('says "Not shared yet", and why, instead', async () => {
    renderDonePage()
    expect(await screen.findByText('Not shared yet')).toBeTruthy()
    expect(screen.getByText('Everyone’s check-ins together. You’ll get it once everyone has answered.')).toBeTruthy()
  })

  it('offers "Read it" once the same report has actually released', async () => {
    ;(groundsApi.get as any).mockResolvedValue({
      ...AFTER_A_ROUND_CLOSED_ALONE_THEN_GREW,
      report: { id: 'r1', releasedAt: '2026-09-22T09:00:00.000Z', createdAt: '2026-09-20T10:00:01.000Z' },
    })
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter>
          <TheDonePage
            firstName="Wairimu"
            checkInId="c1"
            groundId="g1"
            sessionNumber={1}
            myUserId="u-lead"
            isInitiator
          />
        </MemoryRouter>
      </QueryClientProvider>,
    )
    expect(await screen.findByRole('link', { name: 'Read it' })).toBeTruthy()
    expect(screen.queryByText('Not shared yet')).toBeNull()
  })
})
