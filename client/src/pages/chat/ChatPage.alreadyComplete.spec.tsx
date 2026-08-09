import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ChatPage } from './ChatPage'
import { conversationApi } from '@/api/conversation'

/**
 * A SESSION THE SERVER HAS ALREADY CLOSED IS FINISHED, NOT BROKEN.
 *
 * The engine can close a check-in itself, on the person's last answer. When it
 * does, the record is extracted and the check-in is COMPLETED before the person
 * presses anything. Pressing "Finish check-in" then asks the server to complete
 * it a second time, and the server correctly refuses:
 *
 *     400  "This check-in is already complete"
 *
 * That refusal used to be handled as a plain error: a toast, and `completed`
 * left false. So the confirm panel stayed on screen with a live "Finish
 * check-in" button that could never succeed, no matter how many times it was
 * pressed. The person's account was safely on record and the screen showed them
 * an unfinished session indefinitely.
 *
 * This killed four consecutive thirteen-session journey runs, at sessions 9, 3,
 * 6 and 6. My first reading of it was that the person's typed answers had been
 * discarded - they had not. The save had already happened; only the
 * acknowledgement was missing. Worth recording, because "the screen is stuck"
 * and "the data is gone" call for opposite responses and I guessed the wrong one
 * for two runs.
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

/** The server's refusal, in the shape axios delivers it. */
function alreadyCompleteError() {
  return { response: { data: { message: 'This check-in is already complete' } } }
}

describe('finishing a check-in the engine already closed', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(conversationApi.transcript as any).mockResolvedValue({
      checkIn: { status: 'IN_PROGRESS', sessionNumber: 6, groundId: 'g1' },
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

  it('shows the session as finished rather than leaving the confirm panel up', async () => {
    ;(conversationApi.complete as any).mockRejectedValue(alreadyCompleteError())
    renderChat()

    fireEvent.click(await screen.findByText(/Complete session/i, {}, { timeout: 4000 }))
    fireEvent.click(await screen.findByRole('button', { name: /Finish check-in/i }))

    // THE REGRESSION. The button lived on forever, and pressing it again only
    // produced the same refusal.
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /Finish check-in/i })).toBeNull()
    })
  })

  it('does not swallow a genuine failure', async () => {
    ;(conversationApi.complete as any).mockRejectedValue({
      response: { data: { message: 'Not enough on record to close this session yet' } },
    })
    renderChat()

    fireEvent.click(await screen.findByText(/Complete session/i, {}, { timeout: 4000 }))
    const finish = await screen.findByRole('button', { name: /Finish check-in/i })
    fireEvent.click(finish)

    // A real refusal must keep the way forward open - the person has something
    // left to do, and hiding the button would strand them.
    await waitFor(() => expect((conversationApi.complete as any)).toHaveBeenCalled())
    expect(await screen.findByRole('button', { name: /Finish check-in/i })).toBeTruthy()
  })

  it('still finishes normally when the server accepts the completion', async () => {
    ;(conversationApi.complete as any).mockResolvedValue({ status: 'completed' })
    renderChat()

    fireEvent.click(await screen.findByText(/Complete session/i, {}, { timeout: 4000 }))
    fireEvent.click(await screen.findByRole('button', { name: /Finish check-in/i }))

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /Finish check-in/i })).toBeNull()
    })
  })
})
