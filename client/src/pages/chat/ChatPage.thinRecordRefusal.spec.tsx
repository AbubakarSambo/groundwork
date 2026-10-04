import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ChatPage } from './ChatPage'
import { conversationApi, streamMessage } from '@/api/conversation'

/**
 * A REFUSAL THAT ASKS FOR MORE HAS TO SAY SO WHERE THE PERSON IS LOOKING.
 *
 * Live walk (U.8 re-review): Rukia gave three short answers, the engine closed the session
 * ("...Your report is ready now. Speak soon."), the end card came up, and pressing "That's
 * right, finish" got a 400 back: "A few more exchanges are needed before this check-in can
 * close - the record is still thin. Answer one or two more questions, then complete." The
 * only place that showed was a toast - the server's own jargon, gone in a few seconds - and
 * nothing permanent explained what had happened.
 *
 * The fix: take the end card away (already done, via `setDone(false)`), say what happened as
 * a plain, permanent line in the conversation itself, and give the answer box back with focus
 * so there is somewhere to act on it straight away.
 */

vi.mock('@/stores/auth', () => ({
  useAuthStore: (sel: any) => sel({ user: { id: 'u1', firstName: 'Jordan', email: 'jordan@x.test' } }),
}))
vi.mock('@/api/conversation', () => ({
  conversationApi: {
    transcript: vi.fn(),
    open: vi.fn(),
    /*
     * U.8 THIRD REVIEW: no `canContinue` in this mock any more, on purpose. The live filter
     * between the exception and the client dropped that field entirely, so a spec that only ever
     * faked a response carrying it proved nothing about the real body. The client now keys off
     * the HTTP status instead - any 400 here that is not "already complete" - so this mock is
     * exactly what a live 400 looked like with the bug still in the filter.
     */
    complete: vi.fn().mockRejectedValue({
      response: {
        status: 400,
        data: {
          message: 'A few more exchanges are needed before this check-in can close - the record is still thin. Answer one or two more questions, then complete.',
        },
      },
    }),
  },
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

describe('the thin-record refusal is said in the conversation, not only in a toast', () => {
  it('takes the end card away, says plainly what to do, and gives the box back with focus', async () => {
    ;(conversationApi.transcript as any).mockResolvedValue({
      checkIn: { status: 'IN_PROGRESS', sessionNumber: 1, groundId: 'g1' },
      mayCompleteAfter: 3,
      turns: [
        { id: 't1', role: 'AI', content: 'What moved this week?' },
        { id: 't2', role: 'PERSON', content: 'Sent the proposal.' },
      ],
    })
    // The engine closes the session on the reply to the person's next answer -
    // exactly the live walk: three short answers, then the close.
    ;(streamMessage as any).mockImplementation(async (_id: string, _m: string, h: any) => {
      h.onDelta('...Your report is ready now. Speak soon.')
      h.onDone({ reply: '...Your report is ready now. Speak soon.', sessionComplete: true })
    })

    renderChat()

    await screen.findByText(/Sent the proposal\./i, {}, { timeout: 4000 })
    const box = screen.getByPlaceholderText(/Type, or hold to speak/i)
    fireEvent.change(box, { target: { value: 'Followed up with the client.' } })
    fireEvent.click(screen.getByRole('button', { name: /Send message/i }))

    const finish = await screen.findByRole('button', { name: /That’s right, finish/i }, { timeout: 4000 })
    fireEvent.click(finish)

    // The plain, permanent sentence appears in the conversation.
    expect(await screen.findByText(
      /I need a little more from you before this check-in can close\. Please answer one or two more questions, then finish again\./i,
      {},
      { timeout: 4000 },
    )).toBeTruthy()

    // The server's own jargon is never shown to the person.
    expect(screen.queryByText(/the record is still thin/i)).toBeNull()

    // The end card is gone, and the answer box is back and focused.
    expect(screen.queryByRole('button', { name: /That’s right, finish/i })).toBeNull()
    await waitFor(() => {
      const box = screen.getByPlaceholderText(/Type, or hold to speak/i)
      expect(box).not.toBeDisabled()
      expect(box).toHaveFocus()
    })
  })
})
