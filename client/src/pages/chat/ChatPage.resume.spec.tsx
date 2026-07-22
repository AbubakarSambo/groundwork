import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ChatPage } from './ChatPage'
import { conversationApi } from '@/api/conversation'

/**
 * Bug 9 guard: open() only ever returns the single opener line, so opening on
 * every mount reset a returning user's visible transcript to empty even though
 * their turns are stored server-side. ChatPage now loads the transcript on
 * mount and renders existing turns; open() is only for a fresh (turn-less)
 * session. Revert to open()-on-mount -> the prior turns are not rendered ->
 * this bites.
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
        <Routes>
          <Route path="/checkin/:checkInId" element={<ChatPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('BUG9: resuming a check-in rehydrates the stored transcript', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders the existing turns on resume (not just the opener) and does not re-open', async () => {
    ;(conversationApi.transcript as any).mockResolvedValue({
      checkIn: { status: 'IN_PROGRESS', sessionNumber: 1, groundId: 'g1' },
      turns: [
        { id: 't1', role: 'AI', content: 'Welcome, Jordan. What is your role here?' },
        { id: 't2', role: 'PERSON', content: 'I own the onboarding redesign workstream.' },
        { id: 't3', role: 'AI', content: 'Clear. What would exist by day 90?' },
      ],
    })
    renderChat()
    // the returning user sees their prior answer, not an empty/reset check-in
    await screen.findByText(/I own the onboarding redesign workstream/i, {}, { timeout: 3000 })
    await screen.findByText(/What would exist by day 90/i, {}, { timeout: 3000 })
    // and open() was NOT called, because turns already existed
    expect((conversationApi.open as any)).not.toHaveBeenCalled()
  })

  it('falls back to open() for a fresh session with no turns', async () => {
    ;(conversationApi.transcript as any).mockResolvedValue({
      checkIn: { status: 'NOT_STARTED', sessionNumber: 1, groundId: 'g1' },
      turns: [],
    })
    ;(conversationApi.open as any).mockResolvedValue({ reply: 'Welcome. Fresh opener.', groundId: 'g1' })
    renderChat()
    await waitFor(() => expect((conversationApi.open as any)).toHaveBeenCalled(), { timeout: 4000 })
  })
})
