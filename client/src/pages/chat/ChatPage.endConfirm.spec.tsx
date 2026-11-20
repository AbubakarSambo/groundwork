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
   * CHANGED 15 NOVEMBER 2026 (Hafsah, audit of the check-in pages, row 29). On 26 October "End session" ended it at once. It is now
   * "Pause", and pressing it brings up the end card ("What I wrote down"); only "That’s right, finish" finalises, and that is still
   * the person's own end, so the server accepts it with anything said.
   */
  it('nothing is finalised until “That’s right, finish” is pressed', async () => {
    renderChat()
    fireEvent.click(await screen.findByText('Pause', {}, { timeout: 4000 }))
    await screen.findByRole('button', { name: 'That’s right, finish' })
    expect((conversationApi.complete as any)).not.toHaveBeenCalled()
  })

  it('Pause shows what was written down first, and finishing from there is the person’s own end', async () => {
    renderChat()
    fireEvent.click(await screen.findByText('Pause', {}, { timeout: 4000 }))
    expect(await screen.findByRole('region', { name: 'What I wrote down' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'That’s right, finish' }))
    await waitFor(() => expect((conversationApi.complete as any)).toHaveBeenCalledWith(expect.any(String), true))
  })
})
