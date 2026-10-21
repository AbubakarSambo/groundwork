import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TheCheckInYouJustFinished } from './TheCheckInYouJustFinished'

/**
 * YOUR OWN REPORT, AS PICTURED, AS MIRIAM READS IT (own-report.jpg, screen 42). "What you did well" in its own panel,
 * the session's own sentences, "What you told us" with each line's mark and where it comes from, "One thing to think
 * about" with one thing to think about, and "Something here isn't right". None of the card's other parts are on it:
 * they are on the page as it was, one tap away.
 */
vi.mock('@/api/reports', () => ({ reportsApi: {
  sessionReport: vi.fn(async () => ({ counting: [], howClearThisWas: { level: 'medium' } })),
  get: vi.fn(async () => ({
    myRows: [
      { id: 'r1', type: 'PROGRESS', text: 'You added a photo of the Green Mart quote. It counts as proof.', mark: 'proven', how: null, disputedAt: null, checkInId: 'c4', sessionNumber: 38 },
      { id: 'r2', type: 'COMMITMENT', text: 'Green Mart buys in January.', mark: 'said', how: 'You said this. A message from them would prove it.', disputedAt: null, checkInId: 'c4', sessionNumber: 38 },
      { id: 'r3', type: 'PROGRESS', text: 'A line from another session.', mark: 'said', disputedAt: null, checkInId: 'c3', sessionNumber: 37 },
    ],
    coaching: { showingUp: 'The inbox wins over the important work.', whyItMatters: 'WHY-IT-MATTERS', beforeNextTime: ['Put the dates in writing.', 'What would help you get the deposit this week?'] },
  })),
  startSelfCorrection: vi.fn(),
} }))
vi.mock('@/api/conversation', () => ({ conversationApi: {
  artifact: vi.fn(async () => ({ artifact: { summary: 'The Green Mart sale moved forward. The quote is proven.', whatToCarry: null } })),
  disputeEntry: vi.fn(),
} }))
vi.mock('@/api/grounds', () => ({ groundsApi: { get: vi.fn(async () => ({ checkIns: [] })), getMySpecificity: vi.fn(async () => ({})) } }))

function renderIt() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={qc}><MemoryRouter><TheCheckInYouJustFinished checkInId="c4" groundId="g1" sessionNumber={38} light pictured /></MemoryRouter></QueryClientProvider>)
}

describe('your own report, as pictured', () => {
  it('reads as own-report.jpg does, with this session’s lines only', async () => {
    renderIt()
    const well = await screen.findByRole('region', { name: 'What you did well' })
    expect(within(well).getByText('You added a photo of the Green Mart quote. It counts as proof.')).toBeTruthy()
    expect(await screen.findByText('The Green Mart sale moved forward. The quote is proven.')).toBeTruthy()
    const told = screen.getByRole('region', { name: 'What you told us' })
    expect(within(told).getByText('Green Mart buys in January.')).toBeTruthy()
    expect(within(told).getByText('You said this. A message from them would prove it.')).toBeTruthy()
    expect(screen.queryByText('A line from another session.')).toBeNull()
    const think = screen.getByRole('region', { name: 'One thing to think about' })
    expect(within(think).getByText('What would help you get the deposit this week?')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Something here isn’t right' })).toBeTruthy()
    /* The rest of the card waits on the page as it was. */
    expect(screen.queryByText('What you said this time')).toBeNull()
    expect(screen.queryByText('More in your report')).toBeNull()
    expect(screen.queryByText('WHY-IT-MATTERS')).toBeNull()
  })
})
