import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ChatPage } from './ChatPage'
import { conversationApi } from '@/api/conversation'

/**
 * End-confirmation guard (#4): a check-in must never finalise without an
 * explicit "ready to finish?" confirmation - it must not auto-end, and the
 * complete action must not fire on the first click. Clicking "Complete
 * session" now opens a confirm step; only "Finish session" finalises.
 * Since U.8 the confirm step is the prototype's end card: "Finish my check-in now" (or the
 * engine closing) brings it up, and only "That’s right, finish" finalises.
 * Wire the button straight back to complete.mutate() -> complete is called on
 * the first click -> this bites.
 */

vi.mock('@/stores/auth', () => ({
  useAuthStore: (sel: any) => sel({ user: { id: 'u1', firstName: 'Jordan', email: 'jordan@x.test' } }),
}))
vi.mock('@/api/conversation', () => ({
  conversationApi: { transcript: vi.fn(), open: vi.fn(), complete: vi.fn().mockResolvedValue({ status: 'COMPLETED' }) },
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

describe('#4 END-CONFIRM: finishing a check-in requires explicit confirmation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(conversationApi.transcript as any).mockResolvedValue({
      checkIn: { status: 'IN_PROGRESS', sessionNumber: 1, groundId: 'g1' },
      /* The server states its turn floor with every session since 22 Sep 2026; three here, as it was when these were written. */
      mayCompleteAfter: 3,
      turns: [
        { id: 't1', role: 'AI', content: 'What is starting?' },
        { id: 't2', role: 'PERSON', content: 'A new analytics project.' },
        { id: 't3', role: 'AI', content: 'What does success look like?' },
        { id: 't4', role: 'PERSON', content: 'Finance self-serving month-end numbers.' },
        { id: 't5', role: 'AI', content: 'Over what period?' },
        { id: 't6', role: 'PERSON', content: 'Over the next 90 days.' },
      ],
    })
  })

  /*
   * CHANGED 26 OCTOBER 2026 (Hafsah: "End session" is always visible, and ending early keeps everything said). This file pinned the
   * old confirm step, where "Finish my check-in now" brought up the end card and only "That’s right, finish" finalised. Now the
   * person's own End session ends it at once, as their own end, and nothing is finalised before they press it.
   */
  it('nothing is finalised until End session is pressed', async () => {
    renderChat()
    await screen.findByText('End session', {}, { timeout: 4000 })
    expect((conversationApi.complete as any)).not.toHaveBeenCalled()
  })

  it('End session ends it at once, as the person’s own end', async () => {
    renderChat()
    fireEvent.click(await screen.findByText('End session', {}, { timeout: 4000 }))
    await waitFor(() => expect((conversationApi.complete as any)).toHaveBeenCalledWith(expect.any(String), true))
  })
})
