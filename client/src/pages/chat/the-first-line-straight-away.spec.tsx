import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ChatPage } from './ChatPage'
import { conversationApi } from '@/api/conversation'

/**
 * THE FIRST LINE STRAIGHT AWAY (Hafsah, 3 November 2026 night, answer 2; fix plan, batch 1, group 7). While Kevin's check-in opens, the
 * fact line from the record is on screen at once, under it "Groundwork is writing…" while the question is written, and the opening
 * that arrives starts with the same words, so nothing he has read is written again.
 */
vi.mock('@/stores/auth', () => ({ useAuthStore: (sel: any) => sel({ user: { id: 'u-kevin', firstName: 'Kevin', email: 'kevin@drop.test' } }) }))
vi.mock('@/api/conversation', () => ({
  conversationApi: { transcript: vi.fn(), open: vi.fn(), complete: vi.fn(), openingLine: vi.fn() },
  streamMessage: vi.fn(),
}))
vi.mock('@/api/documents', () => ({ documentsApi: { upload: vi.fn() } }))

const LINE = 'This takes about ten minutes. You can stop any time.\n\nKevin, Ngong Road Minimart said they would pay KES 25,000 for 5 units on delivery tomorrow.'
const QUESTION = 'Is the delivery set for tomorrow, and who is taking it?'

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

describe('opening a check-in whose opener comes from the record', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(conversationApi.transcript as any).mockResolvedValue({ checkIn: { status: 'NOT_STARTED', sessionNumber: 4, groundId: 'g1' }, turns: [] })
  })

  it('shows the fact line at once, with Groundwork still writing the question under it', async () => {
    ;(conversationApi.openingLine as any).mockResolvedValue(LINE)
    ;(conversationApi.open as any).mockImplementation(() => new Promise(() => {}))
    renderChat()
    await waitFor(() => expect(document.body.textContent).toContain('Kevin, Ngong Road Minimart said they would pay KES 25,000 for 5 units on delivery tomorrow.'), { timeout: 4000 })
    expect(screen.getByText('Groundwork is writing…')).toBeTruthy()
  })

  it('and the opening that arrives starts with those words, followed by the question', async () => {
    ;(conversationApi.openingLine as any).mockResolvedValue(LINE)
    let answer: (v: any) => void = () => undefined
    ;(conversationApi.open as any).mockImplementation(() => new Promise((r) => { answer = r }))
    renderChat()
    await waitFor(() => expect(document.body.textContent).toContain('Kevin, Ngong Road Minimart'), { timeout: 4000 })
    answer({ reply: `${LINE} ${QUESTION}`, groundId: 'g1' })
    await waitFor(() => expect(document.body.textContent).toContain(QUESTION), { timeout: 4000 })
    expect(document.body.textContent).toContain('Kevin, Ngong Road Minimart said they would pay KES 25,000 for 5 units on delivery tomorrow.')
  })
})
