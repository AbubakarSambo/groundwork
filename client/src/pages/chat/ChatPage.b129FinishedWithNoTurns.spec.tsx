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
 *
 * B-201 UPDATE: that admin-half fix originally showed the server's own sentence on screen, which
 * is itself the privacy leak GW-PRI-04 exists to close - a stranger who opens a real check-in's
 * link (403, "not yours to open") read a different screen from one who makes an id up (404,
 * "could not be found"), which tells them something real sits behind the first link and nothing
 * sits behind the second. Both now show the same GroundGone screen the check-in's own page
 * (GroundParticipantPage, GroundAdminPage) already shows for exactly the same two reasons, with
 * neither of the server's two sentences reaching the screen. The first test below is updated to
 * match (same cause, same fix, the old assertion tested the leak); the second is new, for 404.
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

describe('B-129 / B-201: a check-in a stranger cannot reach is the same plain refusal, whichever reason', () => {
  it('a real check-in that is not theirs (403) shows GroundGone, never the server\'s own "not yours" sentence', async () => {
    ;(conversationApi.transcript as any).mockRejectedValue({ response: { status: 403 } })
    ;(conversationApi.open as any).mockRejectedValue({
      response: { status: 403, data: { message: 'That check-in is not yours to open, so go back to your own check-ins.' } },
    })
    renderChat()
    expect(await screen.findByText('This check-in isn’t available any more', {}, { timeout: 5000 })).toBeTruthy()
    expect(screen.queryByText(/not yours to open/)).toBeNull()
    expect(screen.getByRole('link', { name: 'Go to Check-ins' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull()
    expect(screen.queryByText(/Opening your session/)).toBeNull()
    expect(screen.queryByPlaceholderText(/Type, or hold to speak/)).toBeNull()
  })

  it('a made-up id (404) shows the identical GroundGone screen, never the server\'s own "could not be found" sentence', async () => {
    ;(conversationApi.transcript as any).mockRejectedValue({ response: { status: 404 } })
    ;(conversationApi.open as any).mockRejectedValue({
      response: { status: 404, data: { message: 'That check-in could not be found, so go back to your check-ins and open it from the list.' } },
    })
    renderChat()
    expect(await screen.findByText('This check-in isn’t available any more', {}, { timeout: 5000 })).toBeTruthy()
    expect(screen.queryByText(/could not be found/)).toBeNull()
    expect(screen.getByRole('link', { name: 'Go to Check-ins' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull()
    expect(screen.queryByText(/Opening your session/)).toBeNull()
  })
})
