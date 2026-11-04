import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { GroundAdminPage } from './GroundAdminPage'
import { groundsApi } from '@/api/grounds'

/**
 * RE-REVIEW BUG: THE READ-ONLY REDIRECT FIRED BEFORE THE CHECK-IN HAD LOADED.
 *
 * The effect that sends an admin who neither runs a check-in nor takes part in it away from
 * Check-in/My work to Context read `isInitiator` and `viewerIsAParty` - both false, correctly, for
 * a read-only admin, but ALSO both false for anybody at all while `ground` is still loading (they
 * default to false until the real ground arrives). So the effect could not tell "this reader
 * genuinely has no check-in here" from "nobody knows yet who this reader is" - and every reader,
 * including the lead and a party arriving on `?tab=chat`, was bounced to Context for the instant
 * before the ground loaded. Because nothing ever bounces a reader BACK once `goTab('docs')` has
 * run, a lead whose ground took even one tick to arrive could land on Context and stay there.
 *
 * These tests hold `groundsApi.get` pending, then resolve it, and check where each reader actually
 * ends up by which tab's own content is on screen: "What this check-in is for" only ever renders
 * on Context; "No check-in open right now" (BetweenCheckIns' own header, B3) only ever renders on
 * Check-in. The lead and a party asking for `?tab=chat` must land on Check-in; only the genuinely
 * read-only admin lands on Context.
 */
let currentUser: { id: string; role: string; email: string }
vi.mock('@/stores/auth', () => ({
  useAuthStore: (sel: any) => sel({ user: currentUser, isAuthenticated: true }),
}))
vi.mock('@/api/grounds', () => ({ groundsApi: { get: vi.fn() } }))
vi.mock('@/api/participantRequests', () => ({ participantRequestsApi: { list: vi.fn().mockResolvedValue([]) } }))
vi.mock('@/api/reports', () => ({ reportsApi: { get: vi.fn() } }))
vi.mock('@/api/documents', () => ({ documentsApi: { list: vi.fn() } }))
vi.mock('@/api/resolution', () => ({ resolutionApi: { get: vi.fn().mockResolvedValue(null), propose: vi.fn() } }))
vi.mock('@/api/conversation', () => ({ conversationApi: { remind: vi.fn() } }))
vi.mock('@/api/billing', () => ({ billingApi: { status: vi.fn().mockResolvedValue(null), getContributorCodeShareCard: vi.fn() } }))

function ground(over: Record<string, any> = {}) {
  return {
    id: 'g1', label: 'Sales team, Q3', status: 'ACTIVE', scenario: 'SALES', timelineDays: 90, cadence: 'FORTNIGHTLY',
    daysLeft: 40, overdue: 0,
    initiatorId: 'u-lead',
    participants: [
      { id: 'p-lead', userId: 'u-lead', email: 'lead@x.test', partyType: 'INITIATOR', user: { firstName: 'Wairimu', lastName: 'Kamau' } },
      { id: 'p-party', userId: 'u-party', email: 'party@x.test', partyType: 'PARTICIPANT', user: { firstName: 'Aisha' } },
    ],
    checkIns: [],
    boardRenders: true,
    ...over,
  }
}

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/grounds/g1?tab=chat']}>
        <Routes>
          <Route path="/grounds/:id" element={<GroundAdminPage />} />
          <Route path="/grounds/:id/board" element={<div>the board page itself</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

/** A promise this test controls the resolution of, so the ground can be held "still loading". */
function deferred<T>() {
  let resolve!: (v: T) => void
  const promise = new Promise<T>((r) => { resolve = r })
  return { promise, resolve }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('the read-only redirect waits for the check-in to load', () => {
  it('the lead, arriving on ?tab=chat, still lands on Check-in once loaded, not Context', async () => {
    currentUser = { id: 'u-lead', role: 'MEMBER', email: 'lead@x.test' }
    const { promise, resolve } = deferred<any>()
    ;(groundsApi.get as any).mockReturnValue(promise)
    renderPage()

    /* Still loading: neither tab's own content has rendered yet. */
    expect(screen.queryByText('What this check-in is for')).toBeNull()

    resolve(ground())
    /* Check-in's own content - not Context's, which the bug would have shown instead. Changed in F5 (stage 11): with nothing open,
       the lead's Check-in tab is "Check in yourself", with no ask box of its own. */
    expect(await screen.findByRole('button', { name: 'Check in yourself' })).toBeTruthy()
    expect(screen.queryByText('No check-in open right now')).toBeNull()
    expect(screen.queryByText('What this check-in is for')).toBeNull()
  })

  /*
   * "A PARTY" HERE MEANS A PARTY WHO CAN OPEN THIS PAGE AT ALL. GroundAdminPage refuses anybody
   * who is neither the lead nor an org admin outright (its own "This view is for whoever runs
   * this check-in" gate) - a plain participant with neither role never reaches this effect. The
   * reader this branch of the effect exists for is an org admin who is ALSO enrolled as a party
   * in their own check-in, which is a real and common shape (an admin running their own team's
   * check-in, or a lead reading with an admin's eyes).
   */
  it('an org admin who is also a party, arriving on ?tab=chat, still lands on Check-in once loaded, not Context', async () => {
    currentUser = { id: 'u-admin-party', role: 'ADMIN', email: 'admin-party@x.test' }
    const { promise, resolve } = deferred<any>()
    ;(groundsApi.get as any).mockReturnValue(promise)
    renderPage()

    expect(screen.queryByText('What this check-in is for')).toBeNull()

    resolve(ground({
      participants: [
        { id: 'p-lead', userId: 'u-lead', email: 'lead@x.test', partyType: 'INITIATOR', user: { firstName: 'Wairimu', lastName: 'Kamau' } },
        { id: 'p-admin', userId: 'u-admin-party', email: 'admin-party@x.test', partyType: 'PARTICIPANT', user: { firstName: 'Otieno' } },
      ],
    }))
    expect(await screen.findByText('No check-in open right now')).toBeTruthy()
    expect(screen.queryByText('What this check-in is for')).toBeNull()
  })

  /*
   * UPDATED, HAFSAH, 10 OCTOBER (B-143): a genuinely read-only admin now ends up on the Board
   * page, not Context - the second deep page audit found Context a confusing landing for an admin
   * who is only there to read, and Hafsah's answer sends this reader to the board instead.
   */
  it('a genuinely read-only admin ends up on the Board page, once the check-in has loaded', async () => {
    currentUser = { id: 'u-admin', role: 'ADMIN', email: 'admin@x.test' }
    const { promise, resolve } = deferred<any>()
    ;(groundsApi.get as any).mockReturnValue(promise)
    renderPage()

    resolve(ground())
    expect(await screen.findByText('the board page itself')).toBeTruthy()
    expect(screen.queryByText('No check-in open right now')).toBeNull()
    expect(screen.queryByText('What this check-in is for')).toBeNull()
  })
})
