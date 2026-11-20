import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ChatPage, THIS_CHECK_IN_IS_FINISHED } from './ChatPage'
import { conversationApi, streamMessage } from '@/api/conversation'

/** Run 5, 19 November: typed text on a check-in the server calls finished stayed in the box or vanished, and nothing was said back. */
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

describe('typing into a check-in that is already finished', () => {
  it('is answered in words in the chat, and the box is left empty', { timeout: 20000 }, async () => {
    ;(conversationApi.transcript as any).mockResolvedValue({
      checkIn: { status: 'IN_PROGRESS', sessionNumber: 2, groundId: 'g1' },
      mayCompleteAfter: 3,
      turns: [{ id: 't0', role: 'AI', content: 'What moved this week?' }],
    })
    ;(streamMessage as any).mockRejectedValue(new Error('You have already finished this check-in, so there is nothing more to add.'))
    ;(conversationApi.send as any).mockRejectedValue({ response: { status: 400, data: { message: 'You have already finished this check-in, so there is nothing more to add.' } } })
    renderChat()
    await screen.findByText('What moved this week?', {}, { timeout: 6000 })
    const box = screen.getByPlaceholderText(/Type your answer/i) as HTMLTextAreaElement
    fireEvent.change(box, { target: { value: 'One more thing.' } })
    fireEvent.keyDown(box, { key: 'Enter' })
    expect(await screen.findByText(THIS_CHECK_IN_IS_FINISHED, {}, { timeout: 6000 })).toBeTruthy()
    expect(THIS_CHECK_IN_IS_FINISHED).toBe('This check-in is finished, so I did not add what you typed. Anything new can go in your next check-in.')
    expect(box.value).toBe('')
  })
})
