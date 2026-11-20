import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ChatPage } from './ChatPage'
import { conversationApi } from '@/api/conversation'
import { groundsApi } from '@/api/grounds'

/**
 * ROUND 6, ITEM 4: A FINISHED SESSION, OPENED FRESH, SHOWS THE PROTOTYPE'S DONE PAGE.
 *
 * `/checkin/:id` for a session the server already completed - not just finished in this render,
 * but loaded that way, e.g. a link followed the next day - used to fall through to ChatPage's own
 * old "already complete" view: its own report blocks, a dash-joined sentence ("…stays on this
 * session - the button below…"), "Open the team board →" (an arrow), and a "Back to check-ins"
 * link cut off at the bottom. `justFinished` - the flag the early return to `TheDonePage` actually
 * keys on - was only ever set by the two LIVE-finish paths (finishing now, or the "already
 * complete" refusal caught while sending), never by loading a transcript that was already
 * `COMPLETED`. It is now.
 */
vi.mock('@/stores/auth', () => ({
  useAuthStore: (sel: any) => sel({ user: { id: 'u1', firstName: 'Jordan', email: 'jordan@x.test' } }),
}))
vi.mock('@/api/conversation', () => ({
  conversationApi: {
    transcript: vi.fn(),
    open: vi.fn(),
    complete: vi.fn(),
    artifact: vi.fn().mockResolvedValue({ artifact: null }),
  },
  streamMessage: vi.fn(),
}))
vi.mock('@/api/documents', () => ({ documentsApi: { upload: vi.fn() } }))
vi.mock('@/api/grounds', () => ({
  groundsApi: {
    get: vi.fn().mockResolvedValue({
      id: 'g1', label: 'Sales team, Q3', aTeamReportComes: false, report: null, checkIns: [],
    }),
    getMyCheckinStatus: vi.fn().mockResolvedValue({ checkIns: [] }),
  },
}))

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

beforeEach(() => {
  vi.clearAllMocks()
  ;(groundsApi.get as any).mockResolvedValue({
    id: 'g1', label: 'Sales team, Q3', aTeamReportComes: false, report: null, checkIns: [],
  })
  ;(groundsApi.getMyCheckinStatus as any).mockResolvedValue({ checkIns: [] })
  ;(conversationApi.artifact as any).mockResolvedValue({ artifact: null })
  ;(conversationApi.transcript as any).mockResolvedValue({
    checkIn: { status: 'COMPLETED', sessionNumber: 38, groundId: 'g1' },
    turns: [
      { id: 't1', role: 'AI', content: 'What happened with Green Mart?' },
      { id: 't2', role: 'PERSON', content: 'Sent the quote.' },
    ],
  })
})

/*
 * CHANGED IN BATCH 2, GROUP 5: a finished session opened fresh used to get the Done page ("Done.
 * Thanks, Jordan.", "Read yours"). That page is gone (Hafsah, items 54 and 55): a finished check-in
 * opens as its conversation, settled, in the Check-in tab, and its report is in My work. The
 * pop-up belongs only to the moment of finishing, so it is not drawn here either.
 */
describe('a finished session, opened fresh (not just finished in this render)', () => {
  it('shows its conversation, settled, with no Done page and no pop-up', async () => {
    renderChat()
    expect(await screen.findByText('Sent the quote.', {}, { timeout: 5000 })).toBeTruthy()
    expect(screen.getByText('What happened with Green Mart?')).toBeTruthy()
    expect(screen.queryByRole('heading', { name: /Done\. Thanks/ })).toBeNull()
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.queryByText(/Open the team board/)).toBeNull()
    expect(screen.queryByText(/Back to check-ins/)).toBeNull()
    expect(screen.queryByText(/stays on this session/)).toBeNull()
  })

  it('cannot be typed into: the session is over', async () => {
    renderChat()
    await screen.findByText('Sent the quote.', {}, { timeout: 5000 })
    expect((screen.getByRole('textbox', { name: 'Your answer' }) as HTMLTextAreaElement).disabled).toBe(true)
  })
})
