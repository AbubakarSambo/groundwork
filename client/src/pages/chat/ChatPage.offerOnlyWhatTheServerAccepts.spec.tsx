import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ChatPage } from './ChatPage'
import { conversationApi, streamMessage } from '@/api/conversation'

/**
 * DO NOT OFFER TO FINISH SOMETHING THE SERVER HAS NOT SEEN.
 *
 * The manual fallback ("Finish my check-in now") counted every PERSON message on
 * screen, including the ones echoed locally the instant somebody pressed send,
 * before the server had seen anything.
 *
 * So a dropped send inflated the count, the offer appeared, the person pressed
 * it, and the server turned them down:
 *
 *   "A few more exchanges are needed before this check-in can close - the
 *    record is still thin. Answer one or two more questions, then complete."
 *
 * Invited to finish, then refused. Seen four times in a single twelve-session
 * run, and it reads as a broken product even though both halves are behaving
 * sensibly on their own.
 *
 * The echo itself is right - the chat should feel instant. What was wrong is
 * counting it as evidence that anything landed. The reply is the only proof a
 * turn was stored, so a message is marked local until one arrives.
 *
 * WORTH KNOWING: the first version of this fix simply excluded local messages,
 * and nothing ever promoted them, so the offer became unreachable forever. That
 * would have been worse than the bug. These pin both directions.
 *
 * U.8 FOURTH REVIEW: THE THRESHOLD ITSELF IS NOW ONE LANDED ANSWER, NOT THE
 * SERVER'S TURN FLOOR (request 47). The floor the server states with a session
 * (`mayCompleteAfter`, three or five depending on the kind of check-in) and the
 * engine's own decision to write a closing reply can disagree on the very same
 * session - the fourth review watched the engine say "...Your report is ready
 * now" after three answers while the completion gate refused those same three
 * answers as too thin. Gating the button on the floor left the person with
 * nothing to press until two answers later. It is one now, always: pressing it
 * before the record is ready reaches the same friendly refusal this page
 * already turns into a plain sentence with the composer handed back (see
 * ChatPage.thinRecordRefusal.spec.tsx), so an early press costs one exchange,
 * never a dead end. What must still hold, and is what this file pins, is that
 * the one answer counted is one the SERVER has acknowledged, never a local
 * echo that has not landed yet.
 */

vi.mock('@/stores/auth', () => ({
  useAuthStore: (sel: any) => sel({ user: { id: 'u1', firstName: 'Jordan', email: 'jordan@x.test' } }),
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

/** Turns as the SERVER has them, which is what the transcript returns. */
const serverTurns = (personCount: number) =>
  Array.from({ length: personCount * 2 }, (_, i) => ({
    id: `t${i}`,
    role: i % 2 === 0 ? 'AI' : 'PERSON',
    content: i % 2 === 0 ? 'What moved this week?' : `Answer number ${Math.ceil(i / 2)}`,
  }))

describe('the completion offer is available from the first landed answer, always', () => {
  beforeEach(() => vi.clearAllMocks())

  it('appears once a single answer is actually on the record', async () => {
    ;(conversationApi.transcript as any).mockResolvedValue({
      checkIn: { status: 'IN_PROGRESS', sessionNumber: 2, groundId: 'g1' },
      /* The server still states its own turn floor, and nothing here reads it any more (U.8 fourth review, request 47). */
      mayCompleteAfter: 3,
      turns: serverTurns(1),
    })
    renderChat()
    // The transcript load is deferred by up to 2s of jitter, so the default
    // 1s findBy timeout races it.
    expect(await screen.findByText(/Finish my check-in now/i, {}, { timeout: 5000 })).toBeTruthy()
  })

  it('says nothing about finishing before any answer has landed', async () => {
    // Zero on record: an opening question with nothing said back yet.
    ;(conversationApi.transcript as any).mockResolvedValue({
      checkIn: { status: 'IN_PROGRESS', sessionNumber: 2, groundId: 'g1' },
      mayCompleteAfter: 3,
      turns: [{ id: 't0', role: 'AI', content: 'What moved this week?' }],
    })
    renderChat()
    await screen.findByText(/What moved this week/i, {}, { timeout: 5000 })
    expect(screen.queryByText(/Finish my check-in now/i)).toBeNull()
  })

  it('is still reachable at all, which the first version of this fix broke', async () => {
    /**
     * The failure mode of the fix itself. Excluding local messages without ever
     * promoting them means the count never rises, the offer never appears, and
     * somebody whose session did not close naturally has no way out at all.
     * Worse than the bug it replaced.
     */
    ;(conversationApi.transcript as any).mockResolvedValue({
      checkIn: { status: 'IN_PROGRESS', sessionNumber: 2, groundId: 'g1' },
      mayCompleteAfter: 3,
      turns: serverTurns(4),
    })
    renderChat()
    expect(await screen.findByText(/Finish my check-in now/i, {}, { timeout: 5000 })).toBeTruthy()
  })
})

describe('a send that never lands does not unlock the offer', () => {
  /**
   * THE ACTUAL BUG, which the tests above do not reach.
   *
   * Those load a transcript, so every message already has a server id and no
   * local echo exists. Reverting the fix left them all green, which means they
   * were pinning nothing. The bug only appears when somebody SENDS.
   *
   * Zero on record now, not two (U.8 fourth review): the threshold to offer is
   * one landed answer, so starting from two would already show the button
   * before anybody typed anything, and these tests would be pinning nothing.
   */
  beforeEach(() => vi.clearAllMocks())

  const nothingOnRecordYet = () =>
    (conversationApi.transcript as any).mockResolvedValue({
      checkIn: { status: 'IN_PROGRESS', sessionNumber: 2, groundId: 'g1' },
      turns: [{ id: 't0', role: 'AI', content: 'What moved this week?' }],
    })

  async function typeAndSend(text: string) {
    const box = await screen.findByPlaceholderText(/Type your answer/i, {}, { timeout: 5000 })
    fireEvent.change(box, { target: { value: text } })
    fireEvent.click(screen.getByRole('button', { name: /Send message/i }))
  }

  it('keeps the offer away when the first answer never reaches the server', async () => {
    // THE REGRESSION. Nothing on record, one typed and lost. On screen it
    // looks like one has landed. The server has none and will refuse a close.
    nothingOnRecordYet()
    ;(streamMessage as any).mockRejectedValue(new Error('network'))
    ;(conversationApi.send as any).mockRejectedValue(new Error('network'))

    renderChat()
    await screen.findByText(/What moved this week/i, {}, { timeout: 5000 })
    await typeAndSend('My first answer, which never arrives')

    await waitFor(() => expect(screen.getByText(/never arrives/i)).toBeTruthy())
    expect(screen.queryByText(/Finish my check-in now/i)).toBeNull()
  })

  it('offers it once the first answer is acknowledged by a reply', async () => {
    // The reply is the proof: it can only exist if the turn was stored.
    nothingOnRecordYet()
    ;(streamMessage as any).mockImplementation(async (_id: string, _m: string, h: any) => {
      h.onDelta('Noted.')
      h.onDone({ reply: 'Noted.', sessionComplete: false })
    })

    renderChat()
    await screen.findByText(/What moved this week/i, {}, { timeout: 5000 })
    await typeAndSend('My first answer, which does land')

    expect(await screen.findByText(/Finish my check-in now/i, {}, { timeout: 5000 })).toBeTruthy()
  })
})
