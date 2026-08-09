import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ChatPage } from './ChatPage'
import { conversationApi, streamMessage } from '@/api/conversation'

/**
 * DO NOT OFFER TO FINISH SOMETHING THE SERVER WILL REFUSE.
 *
 * The manual fallback ("Not seeing a wrap-up? Complete session") appears once
 * three answers exist. It counted every PERSON message on screen, including the
 * ones echoed locally the instant somebody pressed send, before the server had
 * seen anything.
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

describe('the completion offer follows the server, not the screen', () => {
  beforeEach(() => vi.clearAllMocks())

  it('appears once three answers are actually on the record', async () => {
    ;(conversationApi.transcript as any).mockResolvedValue({
      checkIn: { status: 'IN_PROGRESS', sessionNumber: 2, groundId: 'g1' },
      turns: serverTurns(3),
    })
    renderChat()
    // The transcript load is deferred by up to 2s of jitter, so the default
    // 1s findBy timeout races it.
    expect(await screen.findByText(/Not seeing a wrap-up/i, {}, { timeout: 5000 })).toBeTruthy()
  })

  it('does not appear on two answers, however many are on screen', async () => {
    // THE REGRESSION. Two stored, and the offer must stay away.
    ;(conversationApi.transcript as any).mockResolvedValue({
      checkIn: { status: 'IN_PROGRESS', sessionNumber: 2, groundId: 'g1' },
      turns: serverTurns(2),
    })
    renderChat()
    /**
     * WAIT FOR THE CONVERSATION TO ACTUALLY LOAD FIRST.
     *
     * The first version of this waited for the composer, which renders
     * immediately whether or not anything has loaded. So it asserted the offer
     * was absent before the transcript had even arrived, and would have passed
     * against any implementation at all - including one that shows the offer on
     * two answers, which is the exact bug it claims to prevent.
     */
    await screen.findByText(/Answer number 2/i, {}, { timeout: 5000 })
    expect(screen.queryByText(/Not seeing a wrap-up/i)).toBeNull()
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
      turns: serverTurns(4),
    })
    renderChat()
    expect(await screen.findByText(/Not seeing a wrap-up/i, {}, { timeout: 5000 })).toBeTruthy()
  })
})

describe('a send that never lands does not unlock the offer', () => {
  /**
   * THE ACTUAL BUG, which the tests above do not reach.
   *
   * Those load a transcript, so every message already has a server id and no
   * local echo exists. Reverting the fix left them all green, which means they
   * were pinning nothing. The bug only appears when somebody SENDS.
   */
  beforeEach(() => vi.clearAllMocks())

  const twoOnRecord = () =>
    (conversationApi.transcript as any).mockResolvedValue({
      checkIn: { status: 'IN_PROGRESS', sessionNumber: 2, groundId: 'g1' },
      turns: serverTurns(2),
    })

  async function typeAndSend(text: string) {
    const box = await screen.findByPlaceholderText(/Share what you have been working on/i, {}, { timeout: 5000 })
    fireEvent.change(box, { target: { value: text } })
    fireEvent.click(screen.getByRole('button', { name: '↑' }))
  }

  it('keeps the offer away when the third answer never reaches the server', async () => {
    // THE REGRESSION. Two on record, a third typed and lost. On screen it looks
    // like three. The server has two and will refuse a close.
    twoOnRecord()
    ;(streamMessage as any).mockRejectedValue(new Error('network'))
    ;(conversationApi.send as any).mockRejectedValue(new Error('network'))

    renderChat()
    await screen.findByText(/Answer number 2/i, {}, { timeout: 5000 })
    await typeAndSend('My third answer, which never arrives')

    await waitFor(() => expect(screen.getByText(/never arrives/i)).toBeTruthy())
    expect(screen.queryByText(/Not seeing a wrap-up/i)).toBeNull()
  })

  it('offers it once the third answer is acknowledged by a reply', async () => {
    // The reply is the proof: it can only exist if the turn was stored.
    twoOnRecord()
    ;(streamMessage as any).mockImplementation(async (_id: string, _m: string, h: any) => {
      h.onDelta('Noted.')
      h.onDone({ reply: 'Noted.', sessionComplete: false })
    })

    renderChat()
    await screen.findByText(/Answer number 2/i, {}, { timeout: 5000 })
    await typeAndSend('My third answer, which does land')

    expect(await screen.findByText(/Not seeing a wrap-up/i, {}, { timeout: 5000 })).toBeTruthy()
  })
})
