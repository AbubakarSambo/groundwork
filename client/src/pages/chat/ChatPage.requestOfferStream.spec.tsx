import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ChatPage } from './ChatPage'
import { conversationApi, streamMessage } from '@/api/conversation'

/**
 * ANCHOR PIECES 26 AND 27: THE STREAM'S DONE EVENT CARRIES THE REQUEST OFFER THROUGH TOO.
 *
 * `requestOffer` and `openTheRequest` ride on the stream's `done` the same way `ideaOffer` and
 * `suggestedAnswers` already do. Real timers, same pattern as
 * ChatPage.offerOnlyWhatTheServerAccepts.spec.tsx. The mock calls `onDelta`/`onDone` with no yield
 * at all, in the very same tick as the message being sent - once a real network read, this is now
 * the harder case: ChatPage keeps `displayedMsgs` in step with `msgs` on the optimistic echo
 * itself, so the screen picks up the exchange whatever the stream's timing.
 */

vi.mock('@/stores/auth', () => ({
  useAuthStore: (sel: any) => sel({ user: { id: 'u1', firstName: 'Rukia', email: 'rukia@x.test' } }),
}))
vi.mock('@/api/conversation', () => ({
  conversationApi: { transcript: vi.fn(), open: vi.fn(), complete: vi.fn(), send: vi.fn() },
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

const requestOffer = {
  kind: 'leave' as const,
  question: 'Shall I treat this as a leave request?',
  yes: 'Yes',
  no: 'No',
}

/* Waits allow for a loaded machine: the full suite runs 600-odd files at once, and the page's own
   transcript read waits up to two seconds by design. The timing gap itself is proven by the test
   that streams with no yield at all. */
describe('the stream carries the request offer through', () => {
  beforeEach(() => vi.clearAllMocks())

  it("the stream's done event carries requestOffer through to the screen", async () => {
    ;(conversationApi.transcript as any).mockResolvedValue({
      checkIn: { status: 'IN_PROGRESS', sessionNumber: 2, groundId: 'g1' },
      mayCompleteAfter: 3,
      turns: [{ id: 't0', role: 'AI', content: 'What moved this week?' }],
    })
    ;(streamMessage as any).mockImplementation(async (_id: string, _m: string, h: any) => {
      h.onDelta('Shall I treat this as a leave request?')
      h.onDone({ reply: 'Shall I treat this as a leave request?', requestOffer, openTheRequest: null })
    })

    renderChat()
    // Opening a session reads its transcript behind a random jitter of up to two seconds
    // (ChatPage.tsx's own note on it), so this one wait - before anything has been sent,
    // unrelated to the stream fix below - keeps the same allowance every other ChatPage
    // spec gives it (see ChatPage.resume.spec.tsx).
    await screen.findByText('What moved this week?', {}, { timeout: 6000 })
    const box = screen.getByPlaceholderText(/Type your answer/i)
    fireEvent.change(box, { target: { value: "I'm taking Friday off." } })
    fireEvent.click(screen.getByRole('button', { name: /Send message/i }))

    await screen.findAllByText(requestOffer.question, {}, { timeout: 6000 })
    expect(screen.getByRole('button', { name: 'Yes' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'No' })).toBeTruthy()
  }, 20000)

  it("the stream's done event carries openTheRequest through to the screen", async () => {
    ;(conversationApi.transcript as any).mockResolvedValue({
      checkIn: { status: 'IN_PROGRESS', sessionNumber: 2, groundId: 'g1' },
      mayCompleteAfter: 3,
      turns: [{ id: 't0', role: 'AI', content: 'Shall I treat this as a leave request?', requestOffer }],
    })
    const openTheRequest = {
      kind: 'leave' as const,
      suiteIsOn: true,
      says: "You can submit that through Leave here and it'll appear on your manager's board.",
      button: 'Request leave',
    }
    ;(streamMessage as any).mockImplementation(async (_id: string, _m: string, h: any) => {
      h.onDelta(openTheRequest.says)
      h.onDone({ reply: openTheRequest.says, requestOffer: null, openTheRequest })
    })

    renderChat()
    // Same jitter, same allowance as above - this wait is on the opening transcript load too.
    await screen.findByRole('button', { name: 'Yes' }, { timeout: 6000 })
    const box = screen.getByPlaceholderText(/Type your answer/i)
    fireEvent.change(box, { target: { value: 'Yes' } })
    fireEvent.click(screen.getByRole('button', { name: /Send message/i }))

    await screen.findAllByText(openTheRequest.says, {}, { timeout: 6000 })
    expect(screen.getByRole('button', { name: 'Request leave' })).toBeTruthy()
  }, 20000)
})

/**
 * THE FAULT ITSELF: `displayedMsgs` (what's actually rendered) only resynced with `msgs` while
 * `streamingRef.current` was false, and that ref was set true synchronously, in the same tick as
 * the optimistic echo's own `setMsgs` - before React could ever flush a render with it still
 * false. A stream whose `onDelta`/`onDone` fire with no genuine async yield at all (not even the
 * `setTimeout(r, 0)` the tests above used to add) then never had the person's own message or the
 * AI's reply appear on screen, though `msgs` state was correct the whole time. This mock is not
 * `async` and returns an already-settled promise, so nothing here yields before the handlers run.
 */
describe('the screen keeps up with a stream that never yields', () => {
  beforeEach(() => vi.clearAllMocks())

  it("shows both the person's message and the reply when the stream resolves with no yield at all", async () => {
    ;(conversationApi.transcript as any).mockResolvedValue({
      checkIn: { status: 'IN_PROGRESS', sessionNumber: 2, groundId: 'g1' },
      mayCompleteAfter: 3,
      turns: [{ id: 't0', role: 'AI', content: 'What moved this week?' }],
    })
    ;(streamMessage as any).mockImplementation((_id: string, _m: string, h: any) => {
      h.onDelta('Got it, thanks.')
      h.onDone({ reply: 'Got it, thanks.' })
      return Promise.resolve()
    })

    renderChat()
    // Same jitter, same allowance as the tests above - this wait is on the opening
    // transcript load, which has nothing to do with the stream this test is about.
    await screen.findByText('What moved this week?', {}, { timeout: 6000 })
    const box = screen.getByPlaceholderText(/Type your answer/i)
    fireEvent.change(box, { target: { value: 'I shipped the report.' } })
    fireEvent.click(screen.getByRole('button', { name: /Send message/i }))

    expect(await screen.findByText('I shipped the report.')).toBeTruthy()
    expect(await screen.findByText('Got it, thanks.')).toBeTruthy()
  }, 20000)
})
