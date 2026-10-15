import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

/**
 * DECISION 133 (change 6): "CHECK IN YOURSELF" AND "ADD CONTEXT", FOR THE LEAD ONLY, ON THE
 * CHECK-IN PAGE AND AT THE END OF EACH REPORT THEY READ. Rendered here at the end of a report, as
 * each reader: Wairimu who runs it, Brian who takes part, and an admin who only reads it.
 */
const showForCheckInSetup = vi.fn()
vi.mock('@/stores/ask', () => ({ useAskStore: (sel: any) => sel({ showForCheckInSetup }) }))
vi.mock('@/api/grounds', () => ({ groundsApi: { get: vi.fn(), checkInYourself: vi.fn() } }))
vi.mock('@/api/reports', () => ({ reportsApi: { week: vi.fn() } }))

import { groundsApi } from '@/api/grounds'
import { reportsApi } from '@/api/reports'
import WeeklyReportPage from '@/pages/report/WeeklyReportPage'

function renderTheReport() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/grounds/g1/report/week']}>
        <Routes>
          <Route path="/grounds/:id/report/week" element={<WeeklyReportPage />} />
          <Route path="/checkin/:checkInId" element={<p>The lead's check-in page</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const WEEK = { weekStart: '2026-09-21', builtAt: '2026-09-23T10:00:00.000Z', heading: 'This week, 21 to 23 Sep, so far', whatThisIs: 'The weekly report.', inNumbers: [], eachPerson: [], acrossTheTeam: [], threeInARow: [], forNextWeek: [] }

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(reportsApi.week).mockResolvedValue(WEEK as any)
})

describe('the end of a report, as the lead reads it', () => {
  it('ends with "Check in yourself", which opens her own check-in, and "Add context", which opens Ask on this check-in', async () => {
    vi.mocked(groundsApi.get).mockResolvedValue({ id: 'g1', label: 'Sales team, Q3', status: 'ACTIVE', viewerIsInitiator: true } as any)
    vi.mocked(groundsApi.checkInYourself).mockResolvedValue({ checkInId: 'ci-9', sessionNumber: 4, opened: true })
    renderTheReport()
    await screen.findByRole('heading', { name: 'This week, 21 to 23 Sep, so far' })
    fireEvent.click(await screen.findByRole('button', { name: 'Add context' }))
    expect(showForCheckInSetup).toHaveBeenCalledWith('g1')
    fireEvent.click(screen.getByRole('button', { name: 'Check in yourself' }))
    await waitFor(() => expect(groundsApi.checkInYourself).toHaveBeenCalledWith('g1'))
    expect(await screen.findByText("The lead's check-in page")).toBeTruthy()
  })

  it('says the server\'s own sentence when it cannot open', async () => {
    vi.mocked(groundsApi.get).mockResolvedValue({ id: 'g1', label: 'Sales team, Q3', status: 'ACTIVE', viewerIsInitiator: true } as any)
    vi.mocked(groundsApi.checkInYourself).mockRejectedValue({ response: { data: { message: 'This check-in is on hold. Nothing can be added to it until it is resumed.' } } })
    renderTheReport()
    fireEvent.click(await screen.findByRole('button', { name: 'Check in yourself' }))
    expect(await screen.findByText('This check-in is on hold. Nothing can be added to it until it is resumed.')).toBeTruthy()
  })

  it('is not offered once the check-in has ended', async () => {
    vi.mocked(groundsApi.get).mockResolvedValue({ id: 'g1', label: 'Sales team, Q3', status: 'CLOSED', viewerIsInitiator: true } as any)
    renderTheReport()
    await screen.findByRole('heading', { name: 'This week, 21 to 23 Sep, so far' })
    expect(screen.queryByRole('button', { name: 'Check in yourself' })).toBeNull()
  })
})

describe('the end of a report, as anybody else reads it', () => {
  it('shows neither button to Brian, who takes part, or to an admin who only reads it', async () => {
    for (const g of [{ viewerIsInitiator: false }, { viewerIsInitiator: false, viewerRunsThisGround: false }]) {
      vi.mocked(groundsApi.get).mockResolvedValue({ id: 'g1', label: 'Sales team, Q3', status: 'ACTIVE', ...g } as any)
      const { unmount } = renderTheReport()
      await screen.findByRole('heading', { name: 'This week, 21 to 23 Sep, so far' })
      expect(screen.queryByRole('button', { name: 'Check in yourself' })).toBeNull()
      expect(screen.queryByRole('button', { name: 'Add context' })).toBeNull()
      unmount()
    }
  })
})
