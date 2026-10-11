import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { GroundAdminPage } from './GroundAdminPage'
import { groundsApi } from '@/api/grounds'
import { reportsApi } from '@/api/reports'

/**
 * SCREEN FAULT (engine workspace, 9 October night, test bed copy a): "ONCE, THE FIRST MESSAGE SENT
 * FROM THE [OLD CONTEXT] CHAT WAS SAVED BUT THE PAGE MOVED TO HER OWN CHECK-IN (/CHECKIN/...)
 * BEFORE THE REPLY CAME."
 *
 * The lead's Check-in tab silently auto-opens her own session the moment the page mounts there
 * (the `myOpenSessionAutoOpenFired` effect in GroundAdminPage.tsx), through `useOpenSession`'s
 * `probeSession` - a request slow enough that, read live, Wairimu Njoroge had already clicked over
 * to Context and resources and sent her first message to the old context chat before it answered.
 * It then resolved and navigated her to `/checkin/...` anyway, regardless of the tab she had since
 * moved to, and her reply was lost.
 *
 * `useOpenSession`'s `open()` now takes an optional `shouldNavigate` guard, checked right before it
 * acts on the probe's answer; GroundAdminPage passes one, for this silent auto-open call only, that
 * reads the CURRENT tab (via a ref, not the value closed over when the effect ran). This fails
 * before the fix (no guard is passed at all, so a stale open always navigates) and passes after
 * (the guard says no once the reader has moved off the Check-in tab).
 */
const openSpy = vi.fn()
vi.mock('@/hooks/useOpenSession', () => ({
  useOpenSession: () => ({
    open: openSpy,
    opening: false,
    openFailed: false,
    openError: null,
    retryOpen: vi.fn(),
    paywall: { show: false, close: vi.fn(), freeExtensionAvailable: false, code: '', setCode: vi.fn(), codeMsg: null, setCodeMsg: vi.fn(), redeem: vi.fn(), claimFreeExtension: vi.fn(), createSubscription: vi.fn() },
  }),
}))
vi.mock('@/stores/auth', () => ({
  useAuthStore: (sel: any) => sel({ user: { id: 'u-wairimu', firstName: 'Wairimu', lastName: 'Njoroge', email: 'wairimu@x.test' }, isAuthenticated: true }),
}))
vi.mock('@/api/grounds', () => ({ groundsApi: { get: vi.fn() } }))
vi.mock('@/api/reports', () => ({ reportsApi: { get: vi.fn() } }))
vi.mock('@/api/documents', () => ({ documentsApi: { list: vi.fn().mockResolvedValue([]) } }))
vi.mock('@/api/participantRequests', () => ({ participantRequestsApi: { list: vi.fn().mockResolvedValue([]) } }))
vi.mock('@/api/resolution', () => ({ resolutionApi: { get: vi.fn().mockResolvedValue(null), propose: vi.fn() } }))
vi.mock('@/api/conversation', () => ({ conversationApi: { remind: vi.fn() } }))
vi.mock('@/api/billing', () => ({ billingApi: { status: vi.fn().mockResolvedValue(null), getContributorCodeShareCard: vi.fn() } }))

function liveGround() {
  return {
    id: 'g1', label: 'Nakuru win-back', scenario: 'DRIFT', status: 'OPEN',
    timelineDays: 90, cadence: 'WEEKLY', totalSessions: 6, initiatorId: 'u-wairimu',
    participants: [
      { id: 'p-lead', userId: 'u-wairimu', email: 'wairimu@x.test', partyType: 'INITIATOR', user: { firstName: 'Wairimu', lastName: 'Njoroge' } },
    ],
    checkIns: [
      { id: 'c1', participantId: 'p-lead', sessionNumber: 1, status: 'NOT_STARTED', availableFrom: '2020-01-01T00:00:00.000Z' },
    ],
    signals: [],
    boardRenders: true,
  }
}

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/grounds/g1?tab=chat']}>
        <Routes><Route path="/grounds/:id" element={<GroundAdminPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  openSpy.mockClear()
  ;(reportsApi.get as any).mockResolvedValue(null)
  ;(groundsApi.get as any).mockResolvedValue(liveGround())
})

describe('the lead’s silent auto-open does not pull her away once she has moved on', () => {
  it('passes a shouldNavigate guard, and it says no once she has left the Check-in tab', async () => {
    renderPage()
    await waitFor(() => expect(openSpy).toHaveBeenCalled())
    const opts = openSpy.mock.calls[0][1]
    expect(typeof opts.shouldNavigate).toBe('function')
    /* Still on the Check-in tab: a real answer to the probe should still be allowed to navigate. */
    expect(opts.shouldNavigate()).toBe(true)

    /* She clicks over to another tab before the probe answers. */
    fireEvent.click(await screen.findByRole('tab', { name: 'People and setup' }))
    await screen.findByRole('tab', { name: 'People and setup', selected: true })

    /* The SAME guard, read again now that she has moved on, says no. */
    expect(opts.shouldNavigate()).toBe(false)
  })
})
