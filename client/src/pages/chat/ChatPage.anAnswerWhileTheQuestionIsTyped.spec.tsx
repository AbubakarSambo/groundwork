import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ChatPage } from './ChatPage'
import { conversationApi, streamMessage } from '@/api/conversation'

/**
 * AN ANSWER SENT WHILE THE QUESTION IS STILL BEING TYPED OUT (Drop Access, 16 October). Mercy answered as her first question
 * arrived, and the question stayed on her screen as "Last t" for the rest of the check-in. The whole question stays.
 */
vi.mock('@/stores/auth', () => ({ useAuthStore: (sel: any) => sel({ user: { id: 'u1', firstName: 'Mercy', email: 'mercy@x.test' } }) }))
vi.mock('@/api/conversation', () => ({ conversationApi: { transcript: vi.fn(), open: vi.fn(), complete: vi.fn(), send: vi.fn() }, streamMessage: vi.fn() }))
vi.mock('@/api/documents', () => ({ documentsApi: { upload: vi.fn() } }))

const QUESTION = 'Last time you said Joseph finally brought the samples and you showed them to Peter at Tuskys Westgate. What happened with the quote for 30 units that Peter wanted?'

describe('an answer sent while the question is typed out', () => {
  beforeEach(() => vi.clearAllMocks())
  it('Mercy still reads the whole question above her answer', async () => {
    ;(conversationApi.transcript as any).mockResolvedValue({ checkIn: { status: 'IN_PROGRESS', sessionNumber: 5, groundId: 'g1' }, mayCompleteAfter: 3, turns: [{ id: 't0', role: 'AI', content: QUESTION }] })
    ;(streamMessage as any).mockImplementation(async (_id: string, _m: string, h: any) => { h.onDelta('What happened with that quote?'); h.onDone({ reply: 'What happened with that quote?' }) })
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
    render(<QueryClientProvider client={qc}><MemoryRouter initialEntries={['/checkin/ci1']}><Routes><Route path="/checkin/:checkInId" element={<ChatPage />} /></Routes></MemoryRouter></QueryClientProvider>)
    await screen.findByText(/^Last time/, {}, { timeout: 6000 })
    const box = screen.getByPlaceholderText(/Type your answer/i)
    fireEvent.change(box, { target: { value: 'Greenfield took delivery of the 25 units today and paid on delivery.' } })
    fireEvent.keyDown(box, { key: 'Enter' })
    await screen.findAllByText('What happened with that quote?', {}, { timeout: 6000 })
    await new Promise((r) => setTimeout(r, 2600))
    expect(screen.getByText(QUESTION)).toBeTruthy()
  }, 20000)
})
