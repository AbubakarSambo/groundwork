import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ChatPage } from './ChatPage'
import { conversationApi, streamMessage } from '@/api/conversation'

/**
 * "GROUNDWORK IS WRITING…" IN THE CHECK-IN CHAT (Hafsah, 9 October). Replaces the bare bouncing
 * dots with no words. Fails before this change: the placeholder bubble carried three dots and no
 * sentence, so nothing readable showed, and a screen reader said nothing at all.
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

describe('the check-in chat: the writing indicator', () => {
  it('shows "Groundwork is writing…" from the moment a message is sent until the reply is drawn', async () => {
    ;(conversationApi.transcript as any).mockResolvedValue({
      checkIn: { status: 'IN_PROGRESS', sessionNumber: 2, groundId: 'g1' },
      mayCompleteAfter: 3,
      turns: [{ id: 't0', role: 'AI', content: 'What moved this week?' }],
    })
    let finishStream!: (h: any) => void
    ;(streamMessage as any).mockImplementation((_id: string, _m: string, h: any) =>
      new Promise<void>((resolve) => { finishStream = () => { h.onDone({ reply: 'Thank you.' }); resolve() } }))

    renderChat()
    await screen.findByText('What moved this week?', {}, { timeout: 6000 })
    const box = screen.getByPlaceholderText(/Type, or hold to speak/i)
    fireEvent.change(box, { target: { value: 'Shipped the release.' } })
    fireEvent.keyDown(box, { key: 'Enter' })

    expect(await screen.findByText('Groundwork is writing…')).toBeTruthy()
    finishStream(null)
    expect(await screen.findByText('Thank you.')).toBeTruthy()
    expect(screen.queryByText('Groundwork is writing…')).toBeNull()
  })

  it('clears the indicator when sending fails entirely, and puts the message back in the box as it always did', async () => {
    ;(conversationApi.transcript as any).mockResolvedValue({
      checkIn: { status: 'IN_PROGRESS', sessionNumber: 2, groundId: 'g1' },
      mayCompleteAfter: 3,
      turns: [{ id: 't0', role: 'AI', content: 'What moved this week?' }],
    })
    ;(streamMessage as any).mockRejectedValue(new Error('network'))
    ;(conversationApi.send as any).mockRejectedValue(new Error('network'))

    renderChat()
    await screen.findByText('What moved this week?', {}, { timeout: 6000 })
    const box = screen.getByPlaceholderText(/Type, or hold to speak/i) as HTMLTextAreaElement
    fireEvent.change(box, { target: { value: 'Shipped the release.' } })
    fireEvent.keyDown(box, { key: 'Enter' })

    expect(await screen.findByText('Groundwork is writing…')).toBeTruthy()
    /* Once the send has genuinely failed, the message goes back in the box (ChatPage's own existing
       failure behaviour - see its comment on `setInput(message)`), and the indicator is gone. */
    await vi.waitFor(() => expect(box.value).toBe('Shipped the release.'), { timeout: 6000 })
    expect(screen.queryByText('Groundwork is writing…')).toBeNull()
  })
})
