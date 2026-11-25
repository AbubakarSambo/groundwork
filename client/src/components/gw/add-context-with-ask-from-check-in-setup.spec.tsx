import { describe, it, expect, vi, beforeEach } from 'vitest'
import { askIsReady } from '@/test/ask-is-ready'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ContextPage } from './ContextPage'
import { AskGroundwork } from './AskGroundwork'
import { useAskStore } from '@/stores/ask'
import { useAuthStore } from '@/stores/auth'
import type { AskPage as AskPageData } from '@/api/ask'

/**
 * "ADD CONTEXT WITH ASK <ORGANISATION NAME>" (decision 65, request 169).
 *
 * Opening Ask Groundwork from a check-in's own Context and resources page used to need the lead to
 * type "context" first. This button removes that step: it tells Ask which check-in it was opened
 * from, so the setup conversation opens straight away, sending `{ message: "", groundId,
 * openedFrom: "check_in_setup" }` as its very first message (docs/answers-from-engine.md, 30
 * September, "decision 65"). It is shown only while the engine serves `addsContext: true` on
 * `GET /ask` (request 169) - absent today, so it stays hidden - and only to whoever may confirm
 * setup on this check-in.
 */
vi.mock('@/api/documents', () => ({
  documentsApi: { list: vi.fn().mockResolvedValue([]), upload: vi.fn(), setVisibility: vi.fn(), remove: vi.fn(), setNote: vi.fn() },
}))
vi.mock('@/api/grounds', () => ({ groundsApi: { list: vi.fn().mockResolvedValue([]) } }))
vi.mock('@/api/board', () => ({ boardApi: { updateObjective: vi.fn() } }))
vi.mock('@/api/ask', () => ({ askApi: { mine: vi.fn(), ask: vi.fn(), answer: vi.fn() } }))
/* The bands this spec is not about, each tested on its own. */
vi.mock('@/components/gw/ContextChat', () => ({ ContextChat: () => null }))
vi.mock('@/components/gw/EachPerson', () => ({ EachPerson: () => null }))
vi.mock('@/components/gw/DeliveredPanel', () => ({ DeliveredPanel: () => null }))

import { askApi } from '@/api/ask'

const people = [
  { id: 'p-lead', userId: 'u-lead', partyType: 'INITIATOR', user: { firstName: 'Amina', lastName: 'Wanjiru' } },
  { id: 'p-rukia', userId: 'u-rukia', partyType: 'PARTY', user: { firstName: 'Rukia', lastName: 'Otieno' } },
]
const ground = {
  id: 'g-tobi',
  contextEnabled: true,
  brief: 'Tobi, first 90 days.',
  participants: people,
  objectives: [],
  contextItems: [],
  commitments: [],
  leadContextNotes: [],
}

function askPageData(addsContext: boolean | undefined): AskPageData {
  return {
    canAsk: true,
    about: [{ id: 'g-tobi', label: 'Tobi, first 90 days' }],
    turns: [],
    askName: 'Ask Baridi',
    caption: 'Ask about the company, your work or your check-ins.',
    addLine: 'You can also add context or documents to your check-ins here.',
    welcome: null,
    starters: [],
    ...(addsContext !== undefined ? { addsContext } : {}),
  }
}

function renderContextPage(role: 'lead' | 'admin' | 'party', viewerUserId: string, over: Record<string, any> = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/grounds/g-tobi?tab=context']}>
        <ContextPage ground={{ ...ground, ...over }} role={role} viewerUserId={viewerUserId} />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

/** The page plus the panel it opens, wired the way AppShell wires them, so a click can be
    followed all the way to the request it sends. */
function renderPageAndPanel(role: 'lead' | 'admin' | 'party', viewerUserId: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  function Shell() {
    const open = useAskStore((s) => s.open)
    const hide = useAskStore((s) => s.hide)
    const pendingMessage = useAskStore((s) => s.pendingMessage)
    const consumePendingMessage = useAskStore((s) => s.consumePendingMessage)
    const openedFromGroundId = useAskStore((s) => s.openedFromCheckInSetupGroundId)
    const consumeOpenedFrom = useAskStore((s) => s.consumeOpenedFromCheckInSetup)
    return (
      <>
        <ContextPage ground={ground} role={role} viewerUserId={viewerUserId} />
        {open && (
          <AskGroundwork
            onClose={hide}
            initialMessage={pendingMessage}
            onSentInitialMessage={consumePendingMessage}
            initialOpenedFromGroundId={openedFromGroundId}
            onSentInitialOpenedFrom={consumeOpenedFrom}
          />
        )}
      </>
    )
  }
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/grounds/g-tobi?tab=context']}>
        <Shell />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  useAskStore.setState({ open: false, pendingMessage: null, openedFromCheckInSetupGroundId: null })
  useAuthStore.setState({
    user: { id: 'u-lead', email: 'amina@x.test', firstName: 'Amina', lastName: 'Wanjiru', role: 'MEMBER', organizationName: 'Baridi' } as any,
    token: 't', isAuthenticated: true,
  } as any)
})

describe('the button is hidden without the flag', () => {
  it('says nothing while GET /ask has not served addsContext at all', async () => {
    ;(askApi.mine as any).mockResolvedValue(askPageData(undefined))
    renderContextPage('lead', 'u-lead')
    await waitFor(() => expect(askApi.mine).toHaveBeenCalled())
    expect(screen.queryByText(/Add context with Ask/)).toBeNull()
  })

  it('says nothing while the engine serves addsContext: false', async () => {
    ;(askApi.mine as any).mockResolvedValue(askPageData(false))
    renderContextPage('lead', 'u-lead')
    await waitFor(() => expect(askApi.mine).toHaveBeenCalled())
    expect(screen.queryByText(/Add context with Ask/)).toBeNull()
  })
})

describe('with addsContext true', () => {
  it('shows "Add context with Ask Baridi" to the lead, and opens Ask sending exactly the one message', async () => {
    ;(askApi.mine as any).mockResolvedValue(askPageData(true))
    ;(askApi.ask as any).mockResolvedValue({ blocks: [{ type: 'text', body: 'What is this check-in for?' }], composedBy: 'rules', lane: 'add_context' })
    renderPageAndPanel('lead', 'u-lead')
    const button = await screen.findByText('Add context with Ask Baridi')
    fireEvent.click(button)
    await waitFor(() => expect(askApi.ask).toHaveBeenCalled())
    expect(askApi.ask).toHaveBeenCalledWith('', 'g-tobi', 'check_in_setup')
  })

  it('is hidden for a participant', async () => {
    ;(askApi.mine as any).mockResolvedValue(askPageData(true))
    renderContextPage('party', 'u-rukia')
    await waitFor(() => expect(askApi.mine).toHaveBeenCalled())
    expect(screen.queryByText(/Add context with Ask/)).toBeNull()
  })

  it('shows for an admin who may confirm setup here (mayChangeSetup true)', async () => {
    ;(askApi.mine as any).mockResolvedValue(askPageData(true))
    renderContextPage('admin', 'u-other', { mayChangeSetup: true })
    expect(await screen.findByText('Add context with Ask Baridi')).toBeTruthy()
  })
})

describe('an ordinary Ask question never sends openedFrom', () => {
  it('a question typed in the panel, opened the ordinary way, carries no openedFrom', async () => {
    ;(askApi.mine as any).mockResolvedValue(askPageData(true))
    ;(askApi.ask as any).mockResolvedValue({ blocks: [{ type: 'text', body: 'Answer.' }], composedBy: 'rules', lane: 'general' })
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={['/']}>
          <AskGroundwork onClose={() => {}} />
        </MemoryRouter>
      </QueryClientProvider>,
    )
    const composer = await askIsReady()
    fireEvent.change(composer, { target: { value: 'What are my priorities?' } })
    fireEvent.keyDown(composer, { key: 'Enter' })
    await waitFor(() => expect(askApi.ask).toHaveBeenCalled())
    /* No check-in picked here, so `aboutId` is '' - falsy, so the real request still carries no
       groundId at all (`askApi.ask`'s own `...(groundId ? { groundId } : {})`). What matters for
       this test is the third argument: never 'check_in_setup' on an ordinary question. */
    expect((askApi.ask as any).mock.calls[0][2]).toBeUndefined()
  })
})
