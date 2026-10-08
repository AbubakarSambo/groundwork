import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ContextPage } from './ContextPage'

/**
 * Screens item f: the check-in's own context chat is drawn only while GET /ask says it is open
 * (oldContextChatIsOpen). Switched off on the server, the lead reads the page without it and adds context through Ask.
 */
vi.mock('@/api/documents', () => ({
  documentsApi: { list: vi.fn().mockResolvedValue([]), upload: vi.fn(), setVisibility: vi.fn(), remove: vi.fn(), setNote: vi.fn() },
}))
vi.mock('@/api/grounds', () => ({ groundsApi: { list: vi.fn().mockResolvedValue([]) } }))
vi.mock('@/api/board', () => ({ boardApi: { updateObjective: vi.fn() } }))
vi.mock('@/api/ask', () => ({ askApi: { mine: vi.fn(), ask: vi.fn(), answer: vi.fn() } }))
vi.mock('@/components/gw/ContextChat', () => ({ ContextChat: () => <div>The old context chat</div> }))
vi.mock('@/components/gw/EachPerson', () => ({ EachPerson: () => null }))
vi.mock('@/components/gw/DeliveredPanel', () => ({ DeliveredPanel: () => null }))
import { askApi } from '@/api/ask'

const ground = {
  id: 'g1', contextEnabled: true, brief: 'Tobi, first 90 days.',
  participants: [{ id: 'p-lead', userId: 'u-lead', partyType: 'INITIATOR', user: { firstName: 'Amina', lastName: 'Wanjiru' } }],
  objectives: [], contextItems: [], commitments: [], leadContextNotes: [],
}
const ask = (extra: Record<string, unknown>) => ({ canAsk: true, about: [], turns: [], askName: 'Ask Baridi', caption: '', addLine: null, welcome: null, starters: [], ...extra })
function draw() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={qc}><MemoryRouter><ContextPage ground={ground as any} role="lead" viewerUserId="u-lead" /></MemoryRouter></QueryClientProvider>)
}
beforeEach(() => vi.clearAllMocks())

describe('the old context chat on the Context and resources page', () => {
  it('is gone, with its note, when the server says it is off', async () => {
    ;(askApi.mine as any).mockResolvedValue(ask({ oldContextChatIsOpen: false, addsContext: true }))
    draw()
    await waitFor(() => expect(askApi.mine).toHaveBeenCalled())
    await new Promise((r) => setTimeout(r, 50))
    expect(screen.queryByText('The old context chat')).toBeNull()
    expect(document.body.textContent).not.toContain('This conversation sets the context.')
  })
  it('is drawn while the server says it is open', async () => {
    ;(askApi.mine as any).mockResolvedValue(ask({ oldContextChatIsOpen: true }))
    draw()
    expect(await screen.findByText('The old context chat')).toBeTruthy()
  })
  it('is drawn by an older server that does not say', async () => {
    ;(askApi.mine as any).mockResolvedValue(ask({}))
    draw()
    await waitFor(() => expect(screen.queryByText('The old context chat')).toBeTruthy())
  })
})
