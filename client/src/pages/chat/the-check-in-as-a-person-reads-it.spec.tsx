import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ChatPage } from './ChatPage'
import { conversationApi } from '@/api/conversation'
import { groundsApi } from '@/api/grounds'

/**
 * THE CHECK-IN, AS THE PERSON ANSWERING IT READS IT (B3).
 *
 * Wording from docs/prototype/screens/B3-the-check-in/check-in-start.txt and check-in-end-card.txt.
 * What Groundwork says is the engine's and comes from the server; these tests check how the screen
 * frames it, for a participant (Miriam) and for the lead answering their own check-in (Wairimu).
 */

let me = { id: 'u-miriam', firstName: 'Miriam', email: 'miriam@x.test' }
vi.mock('@/stores/auth', () => ({
  useAuthStore: (sel: any) => sel({ user: me }),
}))
vi.mock('@/api/conversation', () => ({
  conversationApi: {
    transcript: vi.fn(), open: vi.fn(), send: vi.fn(), complete: vi.fn(), decline: vi.fn(),
    artifact: vi.fn().mockResolvedValue({ artifact: null }), documentReceived: vi.fn().mockResolvedValue({ reply: '' }),
  },
  streamMessage: vi.fn().mockRejectedValue(new Error('no stream in tests')),
}))
vi.mock('@/api/documents', () => ({ documentsApi: { upload: vi.fn() } }))
vi.mock('@/api/grounds', () => ({
  groundsApi: { get: vi.fn(), getMyCheckinStatus: vi.fn() },
}))

const SALES = {
  id: 'g1', label: 'Sales team, Q3', initiatorId: 'u-wairimu', viewerIsInitiator: false,
  participants: [
    { id: 'p-w', partyType: 'INITIATOR', userId: 'u-wairimu', managingOnly: false, user: { firstName: 'Wairimu', lastName: 'Kamau' }, checkIns: [] },
    { id: 'p-m', partyType: 'PARTICIPANT', userId: 'u-miriam', user: { firstName: 'Miriam', lastName: 'Wanjiku' }, checkIns: [] },
  ],
  checkIns: [],
  report: null,
}

const OPENING = 'Good news first: last week you said Lakeside’s buyer would meet you on the 29th. The buyer has now confirmed the meeting. That is in your record. Now, yesterday you said Green Mart wanted a quote. What happened?'

function renderChat() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/checkin/ci1']}>
        <Routes>
          <Route path="/checkin/:checkInId" element={<ChatPage />} />
          <Route path="/grounds/:id/p" element={<div>The check-in’s own page</div>} />
          <Route path="/grounds/:id" element={<div>The check-in’s own page</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  me = { id: 'u-miriam', firstName: 'Miriam', email: 'miriam@x.test' }
  ;(groundsApi.get as any).mockResolvedValue(SALES)
  ;(groundsApi.getMyCheckinStatus as any).mockResolvedValue({ participantId: 'p-m', partyType: 'PARTICIPANT', checkIns: [], latestStatus: null, latestSessionNumber: null })
  ;(conversationApi.transcript as any).mockResolvedValue({
    checkIn: { status: 'IN_PROGRESS', sessionNumber: 38, groundId: 'g1' },
    mayCompleteAfter: 5,
    turns: [{ id: 't1', role: 'AI', content: OPENING }],
  })
})

describe('the header', () => {
  it('names the check-in on the way back, and says it is your check-in, with Pause', async () => {
    renderChat()
    expect(await screen.findByRole('button', { name: '← Sales team, Q3' }, { timeout: 5000 })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Your check-in' })).toBeTruthy()
    expect(await screen.findByRole('button', { name: 'Pause' })).toBeTruthy()
    expect(await screen.findByText(OPENING, {}, { timeout: 5000 })).toBeTruthy()
  })

  it('does not promise how long it takes', async () => {
    renderChat()
    await screen.findByText(OPENING, {}, { timeout: 5000 })
    expect(screen.queryByText(/About two minutes/)).toBeNull()
  })

  it('Pause offers to stop for now, which leaves with everything saved', async () => {
    renderChat()
    fireEvent.click(await screen.findByRole('button', { name: 'Pause' }, { timeout: 5000 }))
    const menu = screen.getByRole('menu')
    expect(within(menu).getByText('Stop for now')).toBeTruthy()
    expect(within(menu).getByText('Everything you have said is saved. You can come back to it any time.')).toBeTruthy()
    fireEvent.click(within(menu).getByRole('menuitem', { name: /Stop for now/ }))
    expect(await screen.findByText('The check-in’s own page')).toBeTruthy()
    expect(conversationApi.decline).not.toHaveBeenCalled()
  })

  it('Pause offers to skip, and skipping still asks first and says what follows', async () => {
    renderChat()
    fireEvent.click(await screen.findByRole('button', { name: 'Pause' }, { timeout: 5000 }))
    fireEvent.click(within(screen.getByRole('menu')).getByRole('menuitem', { name: /Skip this check-in/ }))
    expect(await screen.findByText('Not taking part in this session?')).toBeTruthy()
    expect(screen.getByText('The report will say you declined. It will not guess at what you would have said.')).toBeTruthy()
    expect(conversationApi.decline).not.toHaveBeenCalled()
  })

  it('the old underlined way to decline is gone from under the conversation', async () => {
    renderChat()
    await screen.findByText(OPENING, {}, { timeout: 5000 })
    expect(screen.queryByText(/I do not want to take part/)).toBeNull()
  })
})
