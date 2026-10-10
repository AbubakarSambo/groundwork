import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ChatPage } from './ChatPage'
import { conversationApi } from '@/api/conversation'
import { groundsApi } from '@/api/grounds'

/**
 * B-129. The deep page audit found a member re-opening a finished session (by its conversation
 * link, days later) stuck on the generic failure banner: "You have already finished this
 * check-in, so there is nothing more to add." over a live "Try again" that can never work, a
 * message box, and "Opening your session…" that never resolves. Live on the test bed, the cause
 * was that `GET /check-ins/:id/transcript` answers `turns: []` for a check-in completed in an
 * earlier session - only a check-in this page itself opened keeps any turns on this endpoint - so
 * the existing "show the Done page for an already-finished session" branch, nested inside
 * `if (t.turns && t.turns.length > 0)`, never ran, and the open attempt that followed was refused
 * with no good fallback. `status` is now read from the check-in itself, with or without turns.
 *
 * The admin half of the same bug - opening a colleague's check-in by its conversation link reads
 * "That check-in is not yours to open, so go back to your own check-ins." over the same banner,
 * composer and stuck bubble - is covered below too.
 */
vi.mock('@/stores/auth', () => ({
  useAuthStore: (sel: any) => sel({ user: { id: 'u1', firstName: 'Esther', email: 'esther@kijani.test' } }),
}))
vi.mock('@/api/conversation', () => ({
  conversationApi: {
    transcript: vi.fn(),
    open: vi.fn(),
    complete: vi.fn(),
    artifact: vi.fn().mockResolvedValue({ artifact: null }),
  },
  streamMessage: vi.fn(),
}))
vi.mock('@/api/documents', () => ({ documentsApi: { upload: vi.fn() } }))
vi.mock('@/api/grounds', () => ({
  groundsApi: {
    get: vi.fn().mockResolvedValue({ id: 'g1', label: 'Weekly sales push, Nairobi', aTeamReportComes: false, report: null, checkIns: [] }),
    getMyCheckinStatus: vi.fn().mockResolvedValue({ checkIns: [] }),
  },
}))

function renderChat() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/checkin/ci1']}>
        <Routes><Route path="/checkin/:checkInId" element={<ChatPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  ;(groundsApi.get as any).mockResolvedValue({ id: 'g1', label: 'Weekly sales push, Nairobi', aTeamReportComes: false, report: null, checkIns: [] })
  ;(groundsApi.getMyCheckinStatus as any).mockResolvedValue({ checkIns: [] })
  ;(conversationApi.artifact as any).mockResolvedValue({ artifact: null })
})

describe('B-129: a completed check-in with no turns on this endpoint still shows Done, not the failure banner', () => {
  it('shows the Done page from the transcript read alone, with zero turns served', async () => {
    ;(conversationApi.transcript as any).mockResolvedValue({
      checkIn: { status: 'COMPLETED', sessionNumber: 1, groundId: 'g1' },
      turns: [],
    })
    renderChat()
    expect(await screen.findByRole('heading', { name: 'Done. Thanks, Esther.' }, { timeout: 5000 })).toBeTruthy()
    expect(screen.queryByText(/already finished this check-in/)).toBeNull()
    expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull()
    expect(screen.queryByText(/Opening your session/)).toBeNull()
  })

  it('also shows Done when the transcript read itself fails and open() reports "already finished" (the onError fallback)', async () => {
    ;(conversationApi.transcript as any)
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce({ checkIn: { status: 'COMPLETED', sessionNumber: 1, groundId: 'g1' }, turns: [] })
    ;(conversationApi.open as any).mockRejectedValue({
      response: { data: { message: 'You have already finished this check-in, so there is nothing more to add.' } },
    })
    renderChat()
    expect(await screen.findByRole('heading', { name: 'Done. Thanks, Esther.' }, { timeout: 5000 })).toBeTruthy()
    expect(screen.queryByText(/already finished this check-in/)).toBeNull()
    expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull()
  })
})

describe('B-129: a check-in that is not yours to open is a plain refusal, not a load failure', () => {
  it('reads the server\'s own sentence, with one way back and nothing else', async () => {
    ;(conversationApi.transcript as any).mockRejectedValue({ response: { status: 403 } })
    ;(conversationApi.open as any).mockRejectedValue({
      response: { data: { message: 'That check-in is not yours to open, so go back to your own check-ins.' } },
    })
    renderChat()
    expect(await screen.findByText('That check-in is not yours to open, so go back to your own check-ins.', {}, { timeout: 5000 })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Back to your check-ins/ })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull()
    expect(screen.queryByText(/Opening your session/)).toBeNull()
    expect(screen.queryByPlaceholderText(/Type, or hold to speak/)).toBeNull()
  })
})
