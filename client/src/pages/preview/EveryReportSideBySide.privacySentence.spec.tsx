import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import EveryReportSideBySide from './EveryReportSideBySide'
import { groundsApi } from '@/api/grounds'
import { conversationApi } from '@/api/conversation'
import { reportsApi } from '@/api/reports'

/**
 * THE SHARED-PICTURE EMAIL NO LONGER CLAIMS NOBODY IS QUOTED (7 October, answers-from-engine.md,
 * "For the screens: one sentence left in the preview page"). Decision 4 makes that sentence
 * untrue: what people say in a check-in can be read by the people in it. This guards the real
 * sentence the engine asked for, with the organisation's own Ask name in it, and that the old,
 * untrue claim never comes back.
 */

vi.mock('@/api/grounds', () => ({ groundsApi: { getMyCheckinStatus: vi.fn() } }))
vi.mock('@/api/conversation', () => ({ conversationApi: { sessionReport: vi.fn() } }))
vi.mock('@/api/reports', () => ({ reportsApi: { sessionReport: vi.fn() } }))

const mockUser = vi.hoisted(() => ({ current: {} as any }))
vi.mock('@/stores/auth', () => ({
  useAuthStore: (sel: any) => sel({ user: mockUser.current }),
}))

function renderPreview(ground: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[`/preview?ground=${ground}&session=1`]}>
        <EveryReportSideBySide />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('the shared-picture email on the "every report surface" preview page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUser.current = { organizationName: 'Kijani Farms', organization: { name: 'Kijani Farms' } }
    ;(groundsApi.getMyCheckinStatus as any).mockResolvedValue({
      participantId: 'p-1', partyType: 'MEMBER',
      checkIns: [{ id: 'ci-1', sessionNumber: 1, status: 'DONE', completedAt: '2026-10-01T00:00:00.000Z' }],
      latestStatus: 'DONE', latestSessionNumber: 1,
    })
    ;(conversationApi.sessionReport as any).mockResolvedValue({ report: null, finishedAt: null, sessionNumber: 1, groundId: 'g-1', isInitiator: false })
    ;(reportsApi.sessionReport as any).mockResolvedValue(null)
  })

  it('names who can see what you say, and names the organisation\'s own Ask, instead of claiming nobody is quoted', async () => {
    renderPreview('g-1')
    await screen.findByText(/Read the shared picture/)
    expect(screen.getByText(/The people in this check-in, including your manager, can see what you say in it\./)).toBeInTheDocument()
    expect(screen.getByText(/Your questions to Ask Kijani Farms stay private\./)).toBeInTheDocument()
    expect(screen.queryByText(/does not quote anybody/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/not shown to anybody/i)).not.toBeInTheDocument()
  })

  it('falls back to "Ask Groundwork" when no organisation name is in hand', async () => {
    mockUser.current = {}
    renderPreview('g-1')
    await screen.findByText(/Read the shared picture/)
    expect(screen.getByText(/Your questions to Ask Groundwork stay private\./)).toBeInTheDocument()
  })
})
