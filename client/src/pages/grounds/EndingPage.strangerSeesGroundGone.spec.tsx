import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import EndingPage from './EndingPage'
import { groundsApi } from '@/api/grounds'

/**
 * B-201. "How does this end?" had no isError branch at all: a stranger opening it by its own
 * address - a 403 because the check-in is not theirs, or a 404 because the id is made up - saw
 * `ground` stay undefined and the page render straight through to a bare "Back to the board" link
 * over nothing else, an empty shell rather than a refusal. Every other ground page (Chat, the
 * ground pages themselves, the board) already answers both the same way, GW-PRI-04: one screen,
 * whichever of the two reasons applies.
 */
vi.mock('@/api/suggestions', () => ({
  suggestionsApi: { listForLead: vi.fn().mockResolvedValue([]), listForPerson: vi.fn().mockResolvedValue([]) },
  isForTheLead: () => true,
}))
vi.mock('@/api/resolution', () => ({ resolutionApi: { get: vi.fn().mockResolvedValue(null), propose: vi.fn() } }))
vi.mock('@/api/board', () => ({ boardApi: { get: vi.fn().mockResolvedValue({}) } }))
vi.mock('@/api/grounds', () => ({ groundsApi: { get: vi.fn() } }))

function renderEnding() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/grounds/g1/end']}>
        <Routes><Route path="/grounds/:id/end" element={<EndingPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('B-201: a stranger at /grounds/:id/end reads GroundGone, not an empty shell', () => {
  it('a check-in that is not theirs (403)', async () => {
    ;(groundsApi.get as any).mockRejectedValue({ response: { status: 403 } })
    renderEnding()
    expect(await screen.findByText('This check-in isn’t available any more')).toBeTruthy()
    expect(screen.queryByText('Back to the board')).toBeNull()
  })

  it('a made-up id (404) reads the identical screen', async () => {
    ;(groundsApi.get as any).mockRejectedValue({ response: { status: 404 } })
    renderEnding()
    expect(await screen.findByText('This check-in isn’t available any more')).toBeTruthy()
    expect(screen.queryByText('Back to the board')).toBeNull()
  })
})
