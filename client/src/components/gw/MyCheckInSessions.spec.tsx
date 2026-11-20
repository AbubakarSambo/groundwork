import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { MyCheckInSessions } from './MyCheckInSessions'
import { groundsApi } from '@/api/grounds'

/**
 * THE SESSION HISTORY UNDER MY WORK (round 4, item A step 1).
 *
 * The real shape `myTranscript` sends (api/grounds.ts's own type): `{ sessions: [{ checkInId,
 * sessionNumber, status, date, isSelfCorrection, correctionOf, turns: [{ id, role, content }] }] }`,
 * sessions oldest first off the wire.
 */
vi.mock('@/api/conversation', () => ({
  conversationApi: { artifact: vi.fn().mockResolvedValue({ artifact: null }) },
}))

const REAL_SHAPE = {
  sessions: [
    {
      checkInId: 'ci-1', sessionNumber: 1, status: 'COMPLETED', date: '2026-09-01T16:00:00.000Z',
      isSelfCorrection: false, correctionOf: null,
      turns: [
        { id: 't1', role: 'AI', content: 'How did the pitch to Green Mart go?' },
        { id: 't2', role: 'PERSON', content: 'Sent it. They liked it but want to wait until after December.' },
      ],
    },
    {
      checkInId: 'ci-2', sessionNumber: 2, status: 'COMPLETED', date: '2026-09-08T16:00:00.000Z',
      isSelfCorrection: false, correctionOf: null,
      turns: [
        { id: 't3', role: 'AI', content: 'Anything move with Westgate Deli?' },
        { id: 't4', role: 'PERSON', content: 'Nothing yet.' },
      ],
    },
    /* A session with no turns yet is not a session somebody has anything to open. */
    { checkInId: 'ci-3', sessionNumber: 3, status: 'IN_PROGRESS', date: '2026-09-15T09:00:00.000Z', isSelfCorrection: false, correctionOf: null, turns: [] },
  ],
}

function mount(data: unknown = REAL_SHAPE) {
  vi.spyOn(groundsApi, 'myTranscript').mockResolvedValue(data as any)
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter><MyCheckInSessions groundId="g1" /></MemoryRouter>
    </QueryClientProvider>,
  )
}

afterEach(() => vi.restoreAllMocks())

describe('the session history under My work', () => {
  it('lists every past session with turns, newest first', async () => {
    mount()
    expect(await screen.findByText(/Check-in 2, on/)).toBeInTheDocument()
    const rows = (await screen.findAllByRole('button')).map(b => b.textContent)
    const i2 = rows.findIndex(t => t?.includes('Check-in 2'))
    const i1 = rows.findIndex(t => t?.includes('Check-in 1'))
    expect(i2).toBeGreaterThanOrEqual(0)
    expect(i2).toBeLessThan(i1)
    // The empty in-progress session has no turns, so it is not a row to open.
    expect(screen.queryByText(/Check-in 3, on/)).toBeNull()
  })

  it('a row is closed until opened, and opening it shows that session\'s own turns', async () => {
    mount()
    const row = await screen.findByRole('button', { name: /Check-in 1, on/ })
    expect(screen.queryByText('Sent it. They liked it but want to wait until after December.')).toBeNull()
    await userEvent.click(row)
    expect(await screen.findByText('Sent it. They liked it but want to wait until after December.')).toBeInTheDocument()
    expect(screen.getByText('How did the pitch to Green Mart go?')).toBeInTheDocument()
    // Session 2's turns are not shown just because session 1 opened.
    expect(screen.queryByText('Nothing yet.')).toBeNull()
    await userEvent.click(row)
    expect(screen.queryByText('Sent it. They liked it but want to wait until after December.')).toBeNull()
  })

  it('says so plainly when there is nothing on record yet', async () => {
    mount({ sessions: [] })
    expect(await screen.findByText(/Nothing on record yet/)).toBeInTheDocument()
  })

  it('says so plainly when the history could not be loaded', async () => {
    vi.spyOn(groundsApi, 'myTranscript').mockRejectedValue(new Error('offline'))
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter><MyCheckInSessions groundId="g1" /></MemoryRouter>
      </QueryClientProvider>,
    )
    expect(await screen.findByText('Your check-ins could not be loaded. Try again in a moment.')).toBeInTheDocument()
  })
})
