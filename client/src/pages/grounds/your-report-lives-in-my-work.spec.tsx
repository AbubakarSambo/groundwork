import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MyWorkPage } from './MyWorkPage'
import { groundsApi } from '@/api/grounds'
import { SERVED_TO_THE_LEAD } from './my-work-served.fixture'

/**
 * A PERSON'S OWN REPORT LIVES IN MY WORK (batch 2, group 5; Hafsah, 4 November, item 55).
 *
 * It used to be its own page (/checkin/:id/report), then a whole-report page behind "See every other part of this report",
 * both cut off from the check-in's tabs. Now My work draws it: the Your reports card says the latest in a line, and its "Read" (or a
 * link that names a session) draws that report whole on the page. Until one is opened, no report is drawn (Hafsah, 24 November 2026:
 * the report block was 1,300 pixels on a page that should be 2,882). The report is yours alone: it is drawn for you on your own My work, and never on
 * the lead's view of somebody else's (the server serves `reports.private` there, and refuses the report itself).
 */
vi.mock('@/components/gw/TheCheckInYouJustFinished', () => ({
  TheCheckInYouJustFinished: ({ checkInId, sessionNumber }: any) => <div data-testid="own-report" data-check-in={checkInId}>{`The report of check-in ${sessionNumber}`}</div>,
}))
vi.mock('@/api/grounds', () => ({ groundsApi: { myWork: vi.fn(), get: vi.fn() } }))
vi.mock('@/api/conversation', () => ({ conversationApi: { sessionReport: vi.fn().mockResolvedValue({ onTime: 'You checked in on time today, 2 days running.', report: null }), download: vi.fn() } }))
vi.mock('@/api/reports', () => ({ reportsApi: { get: vi.fn().mockResolvedValue({}) } }))

const ITEMS = [
  { checkInId: 'ci-4', when: '4 November', line: 'Visited Choma Zone butchery.' },
  { checkInId: 'ci-3', when: '3 November', line: 'Sent the quote to Green Mart.' },
]

function renderMyWork(path = '/grounds/g1?tab=mywork') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}>
        <Routes><Route path="/grounds/:id" element={<MyWorkPage groundId="g1" />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  ;(groundsApi.get as any).mockResolvedValue({ id: 'g1', report: { id: 'r1' }, checkIns: [{ id: 'ci-4', sessionNumber: 4 }, { id: 'ci-3', sessionNumber: 3 }] })
})

describe('Kevin’s own report, in My work', () => {
  beforeEach(() => {
    ;(groundsApi.myWork as any).mockResolvedValue({ ...SERVED_TO_THE_LEAD, view: 'self', reports: { heading: 'Your reports', items: ITEMS, emptySays: 'No reports yet.' } })
  })

  it('says his latest report in a line on the Your reports card, and draws no report until he opens one', async () => {
    renderMyWork()
    expect(await screen.findByText('Visited Choma Zone butchery.')).toBeTruthy()
    expect(screen.getByText('4 November')).toBeTruthy()
    expect(screen.queryByText('Sent the quote to Green Mart.')).toBeNull()
    expect(screen.queryByTestId('own-report')).toBeNull()
    expect(screen.queryByRole('heading', { name: 'Your report' })).toBeNull()
  })

  it('"Read" draws his latest report under "Your report", with the on-time line and its download, on the page he is already on', async () => {
    renderMyWork()
    fireEvent.click(await screen.findByRole('button', { name: 'Read' }))
    expect((await screen.findByTestId('own-report')).getAttribute('data-check-in')).toBe('ci-4')
    expect(screen.getByRole('heading', { name: 'Your report' })).toBeTruthy()
    expect(await screen.findByText('You checked in on time today, 2 days running.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Download your check-in 4 record' })).toBeTruthy()
    expect(document.body.textContent).not.toContain('See every other part of this report')
  })

  it('draws the session the address names', async () => {
    renderMyWork('/grounds/g1?tab=mywork&report=ci-3')
    expect((await screen.findByTestId('own-report')).getAttribute('data-check-in')).toBe('ci-3')
  })

  it('"Close the report" puts the page back as it was', async () => {
    renderMyWork('/grounds/g1?tab=mywork&report=ci-3')
    await screen.findByTestId('own-report')
    fireEvent.click(screen.getByRole('button', { name: 'Close the report' }))
    expect(screen.queryByTestId('own-report')).toBeNull()
    expect(screen.queryByRole('link', { name: 'Read' })).toBeNull()
  })
})

describe('the lead reading Kevin’s My work', () => {
  it('draws no one’s own report: it is Kevin’s alone', async () => {
    ;(groundsApi.myWork as any).mockResolvedValue({
      ...SERVED_TO_THE_LEAD, view: 'lead',
      reports: { heading: 'Kevin’s reports', items: [], emptySays: 'No reports yet.', private: 'Each person’s own report is theirs alone.' },
    })
    renderMyWork()
    await screen.findByText('Each person’s own report is theirs alone.')
    expect(screen.queryByTestId('own-report')).toBeNull()
    expect(screen.queryByRole('heading', { name: 'Your report' })).toBeNull()
  })
})
