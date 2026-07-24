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
 * session" now opens a confirm step; only "Finish check-in" finalises.
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

  it('does not finalise on the first click - it asks to confirm first', async () => {
    renderChat()
    const trigger = await screen.findByText(/Complete session/i, {}, { timeout: 4000 })
    fireEvent.click(trigger)
    // a confirm step appears...
    await screen.findByText(/Ready to finish this check-in\?/i)
    // ...and nothing has been finalised yet
    expect((conversationApi.complete as any)).not.toHaveBeenCalled()
  })

  it('finalises only after the explicit "Finish check-in" confirmation', async () => {
    renderChat()
    const trigger = await screen.findByText(/Complete session/i, {}, { timeout: 4000 })
    fireEvent.click(trigger)
    const finish = await screen.findByRole('button', { name: /Finish check-in/i })
    fireEvent.click(finish)
    await waitFor(() => expect((conversationApi.complete as any)).toHaveBeenCalledTimes(1))
  })

  it('can back out of the confirmation without finalising', async () => {
    renderChat()
    const trigger = await screen.findByText(/Complete session/i, {}, { timeout: 4000 })
    fireEvent.click(trigger)
    fireEvent.click(await screen.findByRole('button', { name: /Not yet, keep going/i }))
    expect((conversationApi.complete as any)).not.toHaveBeenCalled()
  })
})
