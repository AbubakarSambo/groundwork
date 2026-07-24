import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ChatPage } from './ChatPage'
import { conversationApi } from '@/api/conversation'

/**
 * Reopen guard (#3): when a participant reopens a completed check-in (a
 * self-correction session), the prior session's turns must RENDER so they can
 * see what they said before adding to it - composed with the transcript
 * rehydration (#73). The prior turns are read-only ("update, not a
 * replacement"). Drop the prior-turns rendering -> the earlier account is
 * invisible on reopen -> this bites.
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
      <MemoryRouter initialEntries={['/checkin/corr1']}>
        <Routes><Route path="/checkin/:checkInId" element={<ChatPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('#3 REOPEN: a correction session renders the prior session read-only', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(conversationApi.transcript as any).mockResolvedValue({
      checkIn: { status: 'IN_PROGRESS', sessionNumber: 2, groundId: 'g1' },
      // the correction session's own opener
      turns: [{ id: 'c1', role: 'AI', content: "You're returning to session 1. What would you like to correct or add?" }],
      // the prior (corrected) session's turns
      priorTurns: [
        { id: 'p1', role: 'AI', content: 'What does success look like?' },
        { id: 'p2', role: 'PERSON', content: 'Finance self-serving month-end numbers by Q3.' },
      ],
      priorSessionNumber: 1,
    })
  })

  it('shows the prior turns, labelled as the earlier session and read-only', async () => {
    renderChat()
    // the prior account renders...
    await screen.findByText(/Finance self-serving month-end numbers by Q3/i, {}, { timeout: 4000 })
    // ...labelled as the earlier session...
    expect(screen.getByText(/From your earlier session 1/i)).toBeTruthy()
    // ...and framed as an update, not a replacement (read-only intent)
    expect(screen.getByText(/recorded as an update, not a replacement/i)).toBeTruthy()
  })
})
