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
 * ChatPage.offerOnlyWhatTheServerAccepts.spec.tsx. The mock's own `await new Promise(r =>
 * setTimeout(r, 0))` before calling `onDelta` stands in for the real network read a live stream
 * always does - without a genuine yield there, the mock's `onDelta`/`onDone` would fire inside the
 * very same tick as the message being sent, before React has painted the person's own echo, and
 * the screen would never pick up the exchange at all.
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

describe('the stream carries the request offer through', () => {
  beforeEach(() => vi.clearAllMocks())

  it("the stream's done event carries requestOffer through to the screen", async () => {
    ;(conversationApi.transcript as any).mockResolvedValue({
      checkIn: { status: 'IN_PROGRESS', sessionNumber: 2, groundId: 'g1' },
      mayCompleteAfter: 3,
      turns: [{ id: 't0', role: 'AI', content: 'What moved this week?' }],
    })
    ;(streamMessage as any).mockImplementation(async (_id: string, _m: string, h: any) => {
      await new Promise(r => setTimeout(r, 0))
      h.onDelta('Shall I treat this as a leave request?')
      h.onDone({ reply: 'Shall I treat this as a leave request?', requestOffer, openTheRequest: null })
    })

    renderChat()
    await screen.findByText('What moved this week?', {}, { timeout: 10000 })
    const box = screen.getByPlaceholderText(/Type, or hold to speak/i)
    fireEvent.change(box, { target: { value: "I'm taking Friday off." } })
    fireEvent.click(screen.getByRole('button', { name: /Send message/i }))

    await screen.findAllByText(requestOffer.question, {}, { timeout: 10000 })
    expect(screen.getByRole('button', { name: 'Yes' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'No' })).toBeTruthy()
  }, 30000)

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
      await new Promise(r => setTimeout(r, 0))
      h.onDelta(openTheRequest.says)
      h.onDone({ reply: openTheRequest.says, requestOffer: null, openTheRequest })
    })

    renderChat()
    await screen.findByRole('button', { name: 'Yes' }, { timeout: 10000 })
    const box = screen.getByPlaceholderText(/Type, or hold to speak/i)
    fireEvent.change(box, { target: { value: 'Yes' } })
    fireEvent.click(screen.getByRole('button', { name: /Send message/i }))

    await screen.findAllByText(openTheRequest.says, {}, { timeout: 10000 })
    expect(screen.getByRole('button', { name: 'Request leave' })).toBeTruthy()
  }, 30000)
})
