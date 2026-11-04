import { describe, it, expect, vi, beforeEach } from 'vitest'
/**
 * A 15-SECOND BUDGET, BECAUSE THESE WAIT FOUR INSIDE A DEFAULT FIVE.
 *
 * Each of these waits up to 4000ms for the third acknowledged message before the Complete control
 * appears - the wait is deliberate and correct. But vitest's default budget for a whole test is
 * 5000ms, so under a parallel full-suite run the setup plus that wait tips over it: seen failing at
 * 5455ms in one run and passing alone and on the next full run. A flake, and the kind that teaches
 * people to re-run rather than read.
 */
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
 * presses anything. Pressing "Finish session" then asks the server to complete
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

  it('shows the session as finished rather than leaving the confirm panel up', async () => {
    ;(conversationApi.complete as any).mockRejectedValue(alreadyCompleteError())
    renderChat()

    /* Changed 26 October: End session ends it at once; there is no confirm card in between. */
    fireEvent.click(await screen.findByText('End session', {}, { timeout: 4000 }))

    // THE REGRESSION. The button lived on forever, and pressing it again only
    // produced the same refusal.
    await waitFor(() => {
      expect(screen.queryByText('End session')).toBeNull()
    })
  }, 15_000)

  /**
   * ANY 400 OTHER THAN "ALREADY COMPLETE" IS "NOT YET" (U.8 third review).
   *
   * This test used to mock a 400 with no `status` field and no `canContinue`, and expected the
   * confirm button to stay up so the person could press it again - written on the assumption that
   * some OTHER kind of genuine 400 failure could come back from `/complete`. It cannot: the
   * completion gate in `conversation.service.ts` has exactly two throw branches besides "already
   * complete", and both are the same "answer a little more" refusal. So there is no real 400 this
   * endpoint sends that is not one of those two - keeping the confirm button up for one was
   * stranding somebody exactly the same way the original bug did.
   *
   * The fix no longer keys off `canContinue` at all - a shared filter between the exception and
   * the client can drop arbitrary fields (it did, and that was the third-review bug), so the
   * client now treats it by HTTP status: any 400 from this endpoint that is not "already complete"
   * re-opens the composer with the plain, permanent explanation, exactly like the case that does
   * carry `canContinue`.
   */
  it('treats a 400 with no canContinue field the same way as one that has it', async () => {
    ;(conversationApi.complete as any).mockRejectedValue({
      response: { status: 400, data: { message: 'Not enough on record to close this session yet' } },
    })
    renderChat()

    /* Changed 26 October: End session ends it at once; there is no confirm card in between. */
    fireEvent.click(await screen.findByText('End session', {}, { timeout: 4000 }))

    await waitFor(() => expect((conversationApi.complete as any)).toHaveBeenCalled())
    // The card comes down, the server's own sentence is never shown, and the plain explanation
    // and a live composer take its place.
    expect(await screen.findByText(/I need a little more from you before this check-in can close/i)).toBeTruthy()
    expect(screen.queryByText(/Not enough on record to close this session yet/i)).toBeNull()
    expect((screen.getByPlaceholderText('Type your answer') as HTMLTextAreaElement).disabled).toBe(false)
  }, 15_000)

  it('a failure that is not a 400 (network down, a server error) keeps the confirm button up', async () => {
    ;(conversationApi.complete as any).mockRejectedValue({
      response: { status: 500, data: { message: 'Internal server error' } },
    })
    renderChat()

    /* Changed 26 October: End session ends it at once; there is no confirm card in between. */
    fireEvent.click(await screen.findByText('End session', {}, { timeout: 4000 }))

    // A failure that is not the gate refusing a thin record must keep the way forward open - the
    // person has nothing new to add, and hiding the button would strand them.
    await waitFor(() => expect((conversationApi.complete as any)).toHaveBeenCalled())
    expect(await screen.findByText('End session')).toBeTruthy()
  }, 15_000)

  it('still finishes normally when the server accepts the completion', async () => {
    ;(conversationApi.complete as any).mockResolvedValue({ status: 'completed' })
    renderChat()

    /* Changed 26 October: End session ends it at once; there is no confirm card in between. */
    fireEvent.click(await screen.findByText('End session', {}, { timeout: 4000 }))

    await waitFor(() => {
      expect(screen.queryByText('End session')).toBeNull()
    })
  }, 15_000)
})
