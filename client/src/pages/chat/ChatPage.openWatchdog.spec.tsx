import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ChatPage } from './ChatPage'
import { conversationApi } from '@/api/conversation'

/**
 * AN OPENING THAT NEVER ARRIVES MUST SAY SO.
 *
 * `openFailed` - which renders "Could not open your session" and a "Try again"
 * button - was set only when the open request came BACK with an error. If the
 * request never returned, or never fired because the transcript fetch ahead of
 * it hung, nothing set it. No message, no retry, no composer: an empty check-in
 * with nothing on screen suggesting anything was wrong.
 *
 * Observed live twice in thirteen-session journey runs, at sessions 5 and 9: the
 * check-in NOT_STARTED, zero turns, no error logged on either side, the screen
 * blank for as long as anyone was willing to wait. The retry affordance existed
 * the whole time and was simply unreachable in the one situation that most
 * needed it.
 *
 * These use fake timers, so they assert the watchdog rather than waiting on it.
 */

vi.mock('@/stores/auth', () => ({
  useAuthStore: (sel: any) => sel({ user: { id: 'u1', firstName: 'Jordan', email: 'jordan@x.test' } }),
}))
vi.mock('@/api/conversation', () => ({
  conversationApi: { transcript: vi.fn(), open: vi.fn(), complete: vi.fn() },
  streamMessage: vi.fn(),
}))
vi.mock('@/api/documents', () => ({ documentsApi: { upload: vi.fn() } }))

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

/** A promise that never settles - the hang, exactly as it behaved live. */
const neverSettles = () => new Promise(() => {})

describe('a check-in that never opens', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })
  afterEach(() => { vi.useRealTimers() })

  it('offers a way forward when the opening request never comes back', async () => {
    ;(conversationApi.transcript as any).mockResolvedValue({
      checkIn: { status: 'NOT_STARTED', sessionNumber: 5, groundId: 'g1' },
      turns: [],
    })
    ;(conversationApi.open as any).mockImplementation(neverSettles)

    renderChat()
    await vi.advanceTimersByTimeAsync(50_000)

    // THE REGRESSION: this screen used to stay blank and silent forever.
    expect(await screen.findByText(/Could not open your session/i)).toBeTruthy()
    expect(await screen.findByRole('button', { name: /Try again/i })).toBeTruthy()
  })

  it('offers a way forward when the fetch before it hangs, so open never even fires', async () => {
    ;(conversationApi.transcript as any).mockImplementation(neverSettles)

    renderChat()
    await vi.advanceTimersByTimeAsync(50_000)

    expect(await screen.findByText(/Could not open your session/i)).toBeTruthy()
    // The open request genuinely never fired - this is the harder half of the
    // failure, and the one no error handler could ever have caught.
    expect((conversationApi.open as any)).not.toHaveBeenCalled()
  })

  it('stays quiet when the session opens normally', async () => {
    ;(conversationApi.transcript as any).mockResolvedValue({
      checkIn: { status: 'NOT_STARTED', sessionNumber: 5, groundId: 'g1' },
      turns: [],
    })
    ;(conversationApi.open as any).mockResolvedValue({ reply: 'How has the week gone?', groundId: 'g1' })

    renderChat()
    await vi.advanceTimersByTimeAsync(50_000)

    // A healthy opening must never be accused of failing.
    expect(screen.queryByText(/Could not open your session/i)).toBeNull()
    expect(await screen.findByText(/How has the week gone\?/i)).toBeTruthy()
  })
})
