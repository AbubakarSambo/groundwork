import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ChatPage } from './ChatPage'
import { conversationApi } from '@/api/conversation'
import { documentsApi } from '@/api/documents'
import { groundsApi } from '@/api/grounds'

/**
 * REVIEW ROUND 3, ITEM 7: THE "ABOUT THIS CHECK-IN" POP-UP.
 *
 * The review's own capture (Aisha, Engineering release, test) showed the goals listed twice - once
 * in the engine's own prose ("The goals on this check-in: All 100 tasks…; The API format…") and
 * again as the screen's own bulleted "The objectives on record:" list, repeating the same two
 * goals - and a pop-up with no visible way to close it (only Escape or a click on the scrim).
 */
vi.mock('@/stores/auth', () => ({
  useAuthStore: (sel: any) => sel({ user: { id: 'u-aisha', firstName: 'Aisha', email: 'aisha@x.test' } }),
}))
vi.mock('@/api/conversation', () => ({
  conversationApi: {
    transcript: vi.fn(), open: vi.fn(), send: vi.fn(), complete: vi.fn(), decline: vi.fn(),
    artifact: vi.fn().mockResolvedValue({ artifact: null }), documentReceived: vi.fn().mockResolvedValue({ reply: '' }),
  },
  streamMessage: vi.fn().mockRejectedValue(new Error('no stream in tests')),
}))
vi.mock('@/api/documents', () => ({ documentsApi: { upload: vi.fn() } }))
vi.mock('@/api/grounds', () => ({ groundsApi: { get: vi.fn(), getMyCheckinStatus: vi.fn() } }))

async function settle() {
  for (let i = 0; i < 12; i++) await act(async () => { await vi.advanceTimersByTimeAsync(500) })
}

const GROUND = {
  id: 'g1', label: 'Engineering release, test', initiatorId: 'u-lead', viewerIsInitiator: false,
  participants: [
    { id: 'p-lead', partyType: 'INITIATOR', userId: 'u-lead', managingOnly: false, user: { firstName: 'Priya', lastName: 'Rao' }, checkIns: [] },
    { id: 'p-aisha', partyType: 'PARTICIPANT', userId: 'u-aisha', user: { firstName: 'Aisha' }, checkIns: [] },
  ],
  leadFirstName: 'Priya', leadAnswersToo: true, aTeamReportComes: true, checkIns: [], report: null,
}

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
  vi.useFakeTimers()
  vi.clearAllMocks()
  ;(groundsApi.get as any).mockResolvedValue(GROUND)
  ;(groundsApi.getMyCheckinStatus as any).mockResolvedValue({ checkIns: [] })
  ;(documentsApi.upload as any).mockResolvedValue({})
  ;(conversationApi.transcript as any).mockResolvedValue({
    checkIn: { status: 'IN_PROGRESS', sessionNumber: 2, groundId: 'g1' },
    turns: [{ id: 't1', role: 'AI', content: 'Did you deploy the refund endpoint to staging on Thursday 1 October?' }],
    priorTurns: [{ id: 'p1', role: 'PERSON', content: 'I finished the refund endpoint on 25 September and it is merged' }],
    priorSessionNumber: 1,
    brief: {
      subject: 'Engineering release, test',
      says: 'It is for understanding the status of tasks and open dependencies for the release. The goals on this check-in: All 100 tasks for the release are deployed to production (100); The API format and the data structure have named owners.',
      objectives: [
        { name: 'All 100 tasks for the release are deployed to production', target: 100 },
        { name: 'The API format and the data structure have named owners', target: null },
      ],
    },
  })
})
afterEach(() => { vi.useRealTimers() })

describe('the about pop-up', () => {
  it('does not list the goals twice - once, in the engine\'s own prose, not again as a separate bulleted list', async () => {
    renderChat()
    await settle()
    fireEvent.click(screen.getByRole('button', { name: 'What this check-in is about, and what you said last time' }))
    await settle()
    expect(screen.getByText(/The goals on this check-in: All 100 tasks/)).toBeTruthy()
    /* The old screen-authored label, and the bulleted re-listing, are both gone. */
    expect(screen.queryByText('The objectives on record:')).toBeNull()
    expect(screen.queryByText('The objective on record:')).toBeNull()
    expect(screen.queryByText('These are the goals on record.')).toBeNull()
    /* Only one occurrence of the goal's own name - not one in the prose and a second as a bullet. */
    expect(screen.getAllByText(/data structure have named owners/).length).toBe(1)
  })

  it('shows the structured list, labelled as a full sentence, only when there is no prose already naming the goals', async () => {
    ;(conversationApi.transcript as any).mockResolvedValue({
      checkIn: { status: 'IN_PROGRESS', sessionNumber: 2, groundId: 'g1' },
      turns: [{ id: 't1', role: 'AI', content: 'Hello' }],
      brief: {
        subject: 'Engineering release, test',
        says: null,
        objectives: [{ name: 'Ship the release', target: null }],
      },
    })
    renderChat()
    await settle()
    fireEvent.click(screen.getByRole('button', { name: 'What this check-in is about, and what you said last time' }))
    await settle()
    expect(screen.getByText('These are the goals on record.')).toBeTruthy()
    expect(screen.getByText('Ship the release')).toBeTruthy()
  })

  /*
   * RE-REVIEW BUG: the pop-up's own heading ("What this check-in is about, and what you said
   * last time") was repeated, word for word, as the first section's own heading inside it
   * ("What this check-in is about") - the same sentence, twice, one line apart.
   */
  it('does not repeat "What this check-in is about" as a heading inside the pop-up', async () => {
    renderChat()
    await settle()
    fireEvent.click(screen.getByRole('button', { name: 'What this check-in is about, and what you said last time' }))
    await settle()
    expect(screen.getByRole('heading', { name: 'What this check-in is about, and what you said last time' })).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'What this check-in is about' })).toBeNull()
  })

  it('has a visible "Close" button, not only Escape or a click on the scrim', async () => {
    renderChat()
    await settle()
    fireEvent.click(screen.getByRole('button', { name: 'What this check-in is about, and what you said last time' }))
    await settle()
    const close = screen.getByRole('button', { name: 'Close' })
    fireEvent.click(close)
    await settle()
    expect(screen.queryByRole('button', { name: 'Close' })).toBeNull()
  })

  it('the earlier session is framed as a sentence, not a dot-joined fragment', async () => {
    renderChat()
    await settle()
    expect(screen.getByText('From your earlier session 1. You can read it, not change it.')).toBeTruthy()
    expect(screen.queryByText(/· read-only/)).toBeNull()
  })
})
