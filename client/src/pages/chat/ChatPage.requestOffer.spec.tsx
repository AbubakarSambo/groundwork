import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ChatPage } from './ChatPage'
import { conversationApi } from '@/api/conversation'
import { groundsApi } from '@/api/grounds'

/**
 * ANCHOR PIECES 26 AND 27: A LEAVE OR SPENDING REQUEST OFFERED IN THE CHECK-IN (section 22;
 * docs/anchor-scenario.md; docs/answers-from-engine.md, "Anchor pieces 26 and 27, a request
 * offered in the check-in, are built"). The fixtures are the engine's own served words
 * (`a-request-offered-in-the-check-in.ts`).
 */

vi.mock('@/stores/auth', () => ({
  useAuthStore: (sel: any) => sel({ user: { id: 'u1', firstName: 'Rukia', email: 'rukia@x.test' } }),
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

async function settle() {
  for (let i = 0; i < 12; i++) await act(async () => { await vi.advanceTimersByTimeAsync(500) })
}
const findByRole = async (...a: any[]) => { await settle(); return (screen.getByRole as any)(a[0], a[1]) as HTMLElement }
const findByText = async (...a: any[]) => { await settle(); return (screen.getByText as any)(a[0], a[1]) as HTMLElement }
const waitFor = async (check: () => void) => { await settle(); check() }

const GROUND = {
  id: 'g1', label: 'Everyone pulling the same way', initiatorId: 'u-lead', viewerIsInitiator: false,
  participants: [
    { id: 'p-lead', partyType: 'INITIATOR', userId: 'u-lead', managingOnly: false, user: { firstName: 'Amina', lastName: 'Hassan' }, checkIns: [] },
    { id: 'p-r', partyType: 'PARTICIPANT', userId: 'u1', user: { firstName: 'Rukia', lastName: 'Mwangi' }, checkIns: [] },
  ],
  leadFirstName: 'Amina',
  leadAnswersToo: true,
  aTeamReportComes: true,
  checkIns: [],
  report: null,
}

const OPENING = 'What moved this week?'

const requestOffer = {
  kind: 'leave' as const,
  question: 'Shall I treat this as a leave request?',
  yes: 'Yes',
  no: 'No',
}

const openWithButton = {
  kind: 'leave' as const,
  suiteIsOn: true,
  says: "You can submit that through Leave here and it'll appear on your manager's board.",
  button: 'Request leave',
}

const openWithoutButton = {
  kind: 'spending' as const,
  suiteIsOn: false,
  says: 'Your organisation also has the option to manage spending requests through Groundwork.',
  button: null,
}

/** Stands in for the suite's own request form, so a test can read what the button actually
    navigated to and with what prefill, without rendering the real form pages. */
function DestinationStub() {
  const location = useLocation()
  return <div>Arrived at {location.pathname}, prefill {JSON.stringify((location.state as any)?.prefill ?? null)}</div>
}

function renderChat() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/checkin/ci1']}>
        <Routes>
          <Route path="/checkin/:checkInId" element={<ChatPage />} />
          <Route path="/grounds/:id/p" element={<div>The check-in’s own page</div>} />
          <Route path="/grounds/:id" element={<div>The check-in’s own page</div>} />
          <Route path="/suite/leave/new" element={<DestinationStub />} />
          <Route path="/suite/spend/new" element={<DestinationStub />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.clearAllMocks()
  ;(groundsApi.get as any).mockResolvedValue(GROUND)
  ;(groundsApi.getMyCheckinStatus as any).mockResolvedValue({ participantId: 'p-r', partyType: 'PARTICIPANT', checkIns: [], latestStatus: null, latestSessionNumber: null })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('a request offered in the check-in', () => {
  it('shows the served question and both answers', async () => {
    ;(conversationApi.transcript as any).mockResolvedValue({
      checkIn: { status: 'IN_PROGRESS', sessionNumber: 1, groundId: 'g1' },
      turns: [{ id: 't1', role: 'AI', content: OPENING, requestOffer }],
    })
    renderChat()
    await findByText(requestOffer.question, {}, { timeout: 6000 })
    expect(screen.getByRole('button', { name: 'Yes' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'No' })).toBeTruthy()
  })

  it('pressing "Yes" sends exactly that word, the same as a suggested answer', async () => {
    ;(conversationApi.transcript as any).mockResolvedValue({
      checkIn: { status: 'IN_PROGRESS', sessionNumber: 1, groundId: 'g1' },
      turns: [{ id: 't1', role: 'AI', content: OPENING, requestOffer }],
    })
    ;(conversationApi.send as any).mockResolvedValue({ reply: "You can submit that through Leave here and it'll appear on your manager's board.", openTheRequest: openWithButton })
    renderChat()
    fireEvent.click(await findByRole('button', { name: 'Yes' }, { timeout: 6000 }))
    await waitFor(() => expect(conversationApi.send).toHaveBeenCalledWith('ci1', 'Yes'))
  })

  it('draws nothing when the engine sends no request offer', async () => {
    ;(conversationApi.transcript as any).mockResolvedValue({
      checkIn: { status: 'IN_PROGRESS', sessionNumber: 1, groundId: 'g1' },
      turns: [{ id: 't1', role: 'AI', content: OPENING }],
    })
    renderChat()
    await findByText(OPENING, {}, { timeout: 5000 })
    expect(screen.queryByRole('button', { name: 'Yes' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'No' })).toBeNull()
  })
})

/*
 * CHANGED (Hafsah, 6 October, request 165): the button no longer opens Ask. "Request leave" and
 * "Create request" open the suite's own request form, filled in with what the person said. This
 * used to assert `useAskStore` flipped open; it now asserts the real navigation and the prefill.
 */
describe('what their yes opens', () => {
  it('with the suite on, shows the sentence and a button that opens the leave form, not Ask', async () => {
    ;(conversationApi.transcript as any).mockResolvedValue({
      checkIn: { status: 'IN_PROGRESS', sessionNumber: 1, groundId: 'g1' },
      turns: [{ id: 't1', role: 'AI', content: OPENING, openTheRequest: openWithButton }],
    })
    renderChat()
    await findByText(openWithButton.says, {}, { timeout: 6000 })
    const button = screen.getByRole('button', { name: 'Request leave' })
    fireEvent.click(button)
    await waitFor(() => expect(screen.getByText(/Arrived at \/suite\/leave\/new/)).toBeTruthy())
  })

  it("carries what was read from the person's own words as the form's prefill", async () => {
    ;(conversationApi.transcript as any).mockResolvedValue({
      checkIn: { status: 'IN_PROGRESS', sessionNumber: 1, groundId: 'g1' },
      turns: [{ id: 't1', role: 'AI', content: OPENING, openTheRequest: { ...openWithButton, prefill: { startsOn: '2026-10-10', endsOn: '2026-10-12' } } }],
    })
    renderChat()
    await findByText(openWithButton.says, {}, { timeout: 6000 })
    fireEvent.click(screen.getByRole('button', { name: 'Request leave' }))
    await waitFor(() => expect(screen.getByText(/prefill \{"startsOn":"2026-10-10","endsOn":"2026-10-12"\}/)).toBeTruthy())
  })

  it('with the suite off, shows only the sentence, no button', async () => {
    ;(conversationApi.transcript as any).mockResolvedValue({
      checkIn: { status: 'IN_PROGRESS', sessionNumber: 1, groundId: 'g1' },
      turns: [{ id: 't1', role: 'AI', content: OPENING, openTheRequest: openWithoutButton }],
    })
    renderChat()
    await findByText(openWithoutButton.says, {}, { timeout: 6000 })
    expect(screen.queryByRole('button', { name: /Request leave|Create request/ })).toBeNull()
  })
})

