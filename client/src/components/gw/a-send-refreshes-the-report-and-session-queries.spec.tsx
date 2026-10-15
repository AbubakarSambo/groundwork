import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import type { GroundParticipant } from '@/types'

vi.mock('@/api/reports', () => ({ reportsApi: { sendToEveryone: vi.fn() } }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import { reportsApi } from '@/api/reports'
import { SendTheReportToEveryone } from './SendTheReportToEveryone'

/**
 * FAULT 5 (LIVE RE-WALK): AFTER A SEND, THE ROW SAID "NOT SHARED" UNTIL A RELOAD.
 *
 * `onSuccess` only ever invalidated `['ground', groundId]`. Where a report is actually read from -
 * `['report', groundId]` (GroundParticipantPage.tsx, TheSessionsReport.tsx) and each session's own
 * `['session-shaped-report', groundId, sessionNumber]` (TheSessionsReport.tsx) - kept their stale,
 * unreleased copy, so a reader already on one of those pages read "Not shared yet" after a send
 * that had, in fact, shared it. Both are refreshed now too.
 */
function aParticipant(id: string): GroundParticipant {
  return {
    id, groundId: 'g1', partyType: 'PARTICIPANT', wantsTheReport: true,
    email: `${id}@example.test`, user: { firstName: 'Amani', lastName: 'Wekesa' },
  } as any
}

function renderIt(qc: QueryClient, participants: GroundParticipant[], answered: Set<string>) {
  return render(
    <QueryClientProvider client={qc}>
      <SendTheReportToEveryone groundId="g1" participants={participants} answered={answered} />
    </QueryClientProvider>,
  )
}

describe('a send refreshes the report and session queries, not only the ground', () => {
  beforeEach(() => vi.clearAllMocks())

  it('invalidates the ground, the report, and every session-shaped report for this ground', async () => {
    vi.mocked(reportsApi.sendToEveryone).mockResolvedValue({
      sessionNumber: 1, sent: 1, failed: 0, alreadyTold: 0, notAsked: 0, sharedAs: 'NAMED',
    })
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const invalidated: unknown[][] = []
    const real = qc.invalidateQueries.bind(qc)
    vi.spyOn(qc, 'invalidateQueries').mockImplementation((filters: any) => {
      invalidated.push(filters.queryKey)
      return real(filters)
    })
    const p = aParticipant('p1')
    renderIt(qc, [p], new Set(['p1']))

    fireEvent.click(screen.getByRole('button', { name: /Send to 1/ }))
    await waitFor(() => expect(reportsApi.sendToEveryone).toHaveBeenCalled())

    expect(invalidated).toContainEqual(['ground', 'g1'])
    expect(invalidated).toContainEqual(['report', 'g1'])
    expect(invalidated).toContainEqual(['session-shaped-report', 'g1'])
  })

  it('so an active session-shaped report query is refetched after the send, not left stale', async () => {
    vi.mocked(reportsApi.sendToEveryone).mockResolvedValue({
      sessionNumber: 1, sent: 1, failed: 0, alreadyTold: 0, notAsked: 0, sharedAs: 'NAMED',
    })
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } })
    const sessionReportFetch = vi.fn().mockResolvedValue({ releasedAt: null })
    /* `useQuery` inside a mounted component, not `prefetchQuery`: an invalidated query only
       refetches eagerly while something is actually observing it, the same as every real reader's
       page - a bare cache entry with no observer is not what a stale row on screen looks like. */
    function ReaderOfTheSessionReport() {
      useQuery({ queryKey: ['session-shaped-report', 'g1', 1], queryFn: sessionReportFetch })
      return null
    }
    const p = aParticipant('p1')
    render(
      <QueryClientProvider client={qc}>
        <ReaderOfTheSessionReport />
        <SendTheReportToEveryone groundId="g1" participants={[p]} answered={new Set(['p1'])} />
      </QueryClientProvider>,
    )
    await waitFor(() => expect(sessionReportFetch).toHaveBeenCalledTimes(1))

    fireEvent.click(screen.getByRole('button', { name: /Send to 1/ }))
    await waitFor(() => expect(reportsApi.sendToEveryone).toHaveBeenCalled())

    /* `staleTime: Infinity` means only an explicit invalidation - never mere staleness - can cause
       this to refetch, so a second call proves the session-shaped query was actually invalidated. */
    await waitFor(() => expect(sessionReportFetch).toHaveBeenCalledTimes(2))
  })
})
