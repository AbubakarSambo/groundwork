import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ChatPage } from './ChatPage'
import { conversationApi } from '@/api/conversation'

/**
 * U.8 REVIEW: "OPENING YOUR SESSION…" SAID NOTHING FOR AS LONG AS A MINUTE.
 *
 * ConversationService.open runs several model calls before it answers - 14 to 60 seconds, measured
 * against the booted API - and the screen said one unchanging line the whole time. After four
 * seconds (the same threshold the reply wait already uses), it now also says the wait can take a
 * minute or two, so a genuinely slow but healthy opening does not read as a hang. (U.8 fourth
 * review: a real first open was timed at 90 to 130 seconds, past the "up to a minute" this used
 * to say, so the sentence now says "a minute or two", which is true of that range.)
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

const neverSettles = () => new Promise(() => {})

describe('opening a session that is taking a while', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })
  afterEach(() => { vi.useRealTimers() })

  it('says nothing extra at first, only "Groundwork is writing…"', async () => {
    ;(conversationApi.transcript as any).mockResolvedValue({
      checkIn: { status: 'NOT_STARTED', sessionNumber: 1, groundId: 'g1' },
      turns: [],
    })
    ;(conversationApi.open as any).mockImplementation(neverSettles)

    renderChat()
    expect(await screen.findByText('Groundwork is writing…')).toBeTruthy()
    expect(screen.queryByText(/can take a minute or two/i)).toBeNull()
  })

  it('shows the same animated dots every other wait shows, in Groundwork\'s own bubble shape (Hafsah, 9 October)', async () => {
    ;(conversationApi.transcript as any).mockResolvedValue({
      checkIn: { status: 'NOT_STARTED', sessionNumber: 1, groundId: 'g1' },
      turns: [],
    })
    ;(conversationApi.open as any).mockImplementation(neverSettles)

    renderChat()
    const status = await screen.findByText('Groundwork is writing…')
    const region = status.closest('[role="status"]')
    expect(region?.querySelector('.gwui-writing-dots')).toBeTruthy()
  })

  it('says the wait can take a minute or two once it has gone on a few seconds', async () => {
    ;(conversationApi.transcript as any).mockResolvedValue({
      checkIn: { status: 'NOT_STARTED', sessionNumber: 1, groundId: 'g1' },
      turns: [],
    })
    ;(conversationApi.open as any).mockImplementation(neverSettles)

    renderChat()
    await screen.findByText('Groundwork is writing…')
    await vi.advanceTimersByTimeAsync(5_000)

    expect(await screen.findByText('Getting your first question ready. This can take a minute or two.')).toBeTruthy()
  })

  it('never says it once the session has actually opened', async () => {
    ;(conversationApi.transcript as any).mockResolvedValue({
      checkIn: { status: 'NOT_STARTED', sessionNumber: 1, groundId: 'g1' },
      turns: [],
    })
    ;(conversationApi.open as any).mockResolvedValue({ reply: 'How has the week gone?', groundId: 'g1' })

    renderChat()
    await vi.advanceTimersByTimeAsync(10_000)

    expect(await screen.findByText(/How has the week gone\?/i)).toBeTruthy()
    expect(screen.queryByText(/can take a minute or two/i)).toBeNull()
  })
})

/**
 * "CHECK IN YOURSELF" (journey test, 12 October 2026). The lead's own session 2 opened at once, then
 * waited 94 seconds for its first message under "Opening your session…", and read as a page that never
 * opened. While the opener is written the page says what is happening, the way every other chat does,
 * in Groundwork's bubble, and never the old line.
 */
describe('the lead\'s own check-in while its first message is written', () => {
  beforeEach(() => { vi.clearAllMocks() })
  it('shows "Groundwork is writing…" with the dots at once, and not "Opening your session…"', async () => {
    ;(conversationApi.transcript as any).mockResolvedValue({
      checkIn: { status: 'NOT_STARTED', sessionNumber: 2, groundId: 'g1', optional: true },
      turns: [],
    })
    ;(conversationApi.open as any).mockImplementation(neverSettles)

    renderChat()
    const status = await screen.findByText('Groundwork is writing…')
    const region = status.closest('[role="status"]')
    expect(region?.querySelector('.gwui-writing-dots')).toBeTruthy()
    expect(screen.queryByText(/Opening your session/)).toBeNull()
  })
})
