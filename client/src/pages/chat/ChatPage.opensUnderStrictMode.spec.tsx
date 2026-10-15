import { describe, it, expect, vi } from 'vitest'
import { StrictMode } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ChatPage } from './ChatPage'
import { conversationApi } from '@/api/conversation'

/**
 * THE SESSION OPENS UNDER REACT'S DOUBLE EFFECT RUN, AND ONLY ONCE (browser button test, 7 October).
 *
 * The open-once guard was taken when the open was scheduled. React's development mode runs the
 * effect twice: the first run's timer was cancelled and the second run skipped, so the page sat on
 * "Opening your session…" for good. The guard is now taken when the open starts.
 */
vi.mock('@/stores/auth', () => ({
  useAuthStore: (sel: any) => sel({ user: { id: 'u1', firstName: 'Rukia', email: 'rukia@x.test' } }),
}))
vi.mock('@/api/conversation', () => ({
  conversationApi: { transcript: vi.fn(), open: vi.fn(), complete: vi.fn(), send: vi.fn() },
  streamMessage: vi.fn(),
}))
vi.mock('@/api/documents', () => ({ documentsApi: { upload: vi.fn() } }))

describe('opening a fresh session under StrictMode', () => {
  it('opens it once, and shows the opening question', async () => {
    ;(conversationApi.transcript as any).mockResolvedValue({ turns: [], checkIn: { id: 'ci1', groundId: 'g1', status: 'NOT_STARTED' } })
    ;(conversationApi.open as any).mockResolvedValue({ reply: 'What moved this week?', groundId: 'g1' })
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
    render(
      <StrictMode>
        <QueryClientProvider client={qc}>
          <MemoryRouter initialEntries={['/checkin/ci1']}>
            <Routes><Route path="/checkin/:checkInId" element={<ChatPage />} /></Routes>
          </MemoryRouter>
        </QueryClientProvider>
      </StrictMode>,
    )
    expect(await screen.findByText('What moved this week?', {}, { timeout: 6000 })).toBeTruthy()
    await waitFor(() => expect(conversationApi.open).toHaveBeenCalledTimes(1))
  }, 20000)
})
