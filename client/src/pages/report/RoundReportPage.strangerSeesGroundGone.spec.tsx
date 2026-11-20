import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import RoundReportPage from './RoundReportPage'
import { groundsApi } from '@/api/grounds'

/**
 * B-201. One session's own report page (/grounds/:id/session/:n) had no isError branch at all: a
 * stranger opening it - a 403 because the check-in is not theirs, or a 404 because the id is made
 * up - saw `ground` stay undefined and the page render straight through to the header ("Check-in")
 * over an empty "Session N" with nothing below it (`TheSessionsReport` itself answers `null` for
 * the same two statuses). Every other ground page already answers both the same way, GW-PRI-04:
 * one screen, whichever of the two reasons applies.
 */
vi.mock('@/api/grounds', () => ({ groundsApi: { get: vi.fn() } }))
vi.mock('@/stores/auth', () => ({ useAuthStore: (sel: any) => sel({ user: { id: 'u1' } }) }))
vi.mock('@/components/gw/TheSessionsReport', () => ({ TheSessionsReport: () => null }))

function renderRound() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/grounds/g1/session/1']}>
        <Routes><Route path="/grounds/:id/session/:sessionNumber" element={<RoundReportPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('B-201: a stranger at /grounds/:id/session/:n reads GroundGone, not an empty shell', () => {
  it('a check-in that is not theirs (403)', async () => {
    ;(groundsApi.get as any).mockRejectedValue({ response: { status: 403 } })
    renderRound()
    expect(await screen.findByText('This check-in isn’t available any more')).toBeTruthy()
    expect(screen.queryByText('Every check-in')).toBeNull()
    expect(screen.queryByText(/Session 1/)).toBeNull()
  })

  it('a made-up id (404) reads the identical screen', async () => {
    ;(groundsApi.get as any).mockRejectedValue({ response: { status: 404 } })
    renderRound()
    expect(await screen.findByText('This check-in isn’t available any more')).toBeTruthy()
    expect(screen.queryByText('Every check-in')).toBeNull()
    expect(screen.queryByText(/Session 1/)).toBeNull()
  })
})
