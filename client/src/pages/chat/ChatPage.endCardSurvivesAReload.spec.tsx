import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ChatPage } from './ChatPage'
import { conversationApi } from '@/api/conversation'

/**
 * SCREEN FAULT 3: THE END CARD AFTER A RELOAD.
 *
 * The engine can close a conversation on its own reply, before the person presses anything - the
 * transcript then serves `endCard` with the check-in still `IN_PROGRESS` (not yet `COMPLETED`,
 * which only happens once they press "That's right, finish"). Reloading the page at that exact
 * point used to lose the end card entirely: `t.endCard` was stored, but nothing set `done`, so the
 * card (gated on `done && !completed && !declined`) did not render, the header fell back to its
 * default "About two minutes" instead of "That's everything for today", and the only control left
 * on screen was the small manual "Finish my check-in now" fallback - a real card, replaced by a
 * single link, every time somebody reloaded mid-close.
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

describe('reloading a check-in the engine has already closed, but not yet confirmed', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(conversationApi.transcript as any).mockResolvedValue({
      checkIn: { status: 'IN_PROGRESS', sessionNumber: 1, groundId: 'g1' },
      mayCompleteAfter: 3,
      turns: [
        { id: 't1', role: 'AI', content: 'What is starting?' },
        { id: 't2', role: 'PERSON', content: 'A new analytics project.' },
        { id: 't3', role: 'AI', content: 'What does success look like?' },
        { id: 't4', role: 'PERSON', content: 'Finance self-serving month-end numbers.' },
      ],
      endCard: { inYourRecord: [{ says: 'A new analytics project is starting.' }], next: [] },
    })
  })

  it('shows the end card, not the bare "Finish my check-in now" fallback', async () => {
    renderChat()
    expect(await screen.findByRole('button', { name: /That’s right, finish/i }, { timeout: 4000 })).toBeTruthy()
    expect(screen.queryByText(/Finish my check-in now/i)).toBeNull()
  }, 15_000)

  /* Changed 3 November evening: the header has no line under the name at all now, so nothing there can disagree with the card. */
  it('keeps the header consistent with the card: no "About two minutes" and no line under the name', async () => {
    renderChat()
    await screen.findByRole('button', { name: /That’s right, finish/i }, { timeout: 4000 })
    expect(screen.queryByText('That’s everything for today')).toBeNull()
    expect(screen.queryByText('About two minutes')).toBeNull()
  }, 15_000)
})
