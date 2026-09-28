import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { HowThisHasMoved } from './HowThisHasMoved'

/**
 * U.9 RE-REVIEW: THE SERVER SENDS `sessionNumber`, NOT `round`.
 *
 * Walked live against `GET /grounds/:id/report/rounds`: every row of `moved[]` carries
 * `"sessionNumber": 1`, never `round` - `howThisHasMoved`'s own return type names the field
 * `round` (api/src/modules/reports/how-this-has-moved.ts), but the wire shape a real request sends
 * does not match it. This test uses the real shape, so a future change back to `m.round` fails
 * here instead of only being caught by reading the rendered page.
 */
vi.mock('@/api/reports', () => ({ reportsApi: { rounds: vi.fn() } }))
vi.mock('@/lib/a-date-reads-the-same-everywhere', async (orig) => {
  const real: any = await orig()
  return { ...real, whenItWas: (d: any, p: any) => real.whenItWas(d, p, 'UTC') }
})
import { reportsApi } from '@/api/reports'

function renderPanel() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <HowThisHasMoved groundId="g1" />
    </QueryClientProvider>,
  )
}

describe('HowThisHasMoved reads the real wire shape', () => {
  it('says the session number from sessionNumber, not round', async () => {
    (reportsApi.rounds as any).mockResolvedValue({
      rounds: [],
      moved: [{
        sessionNumber: 1, takenAt: '2026-09-27', says: 'You are aiming for six shops.',
        differences: 1, amended: null,
      }],
    })
    renderPanel()
    expect(await screen.findByText('At the end of session 1, on 27 September, people saw one thing differently.')).toBeTruthy()
  })

  it('leaves the session number out when the row has none, rather than say "undefined"', async () => {
    (reportsApi.rounds as any).mockResolvedValue({
      rounds: [],
      moved: [{
        sessionNumber: undefined, takenAt: '2026-09-27', says: 'You are aiming for six shops.',
        differences: 2, amended: null,
      }],
    })
    renderPanel()
    expect(await screen.findByText('On 27 September, people saw 2 things differently.')).toBeTruthy()
    expect(screen.queryByText(/undefined/)).toBeNull()
  })
})
