import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WaitingForAnAdminPage } from './WaitingForAnAdminPage'
import { authApi } from '@/api/auth'

/**
 * B-202 (review round 2, part b): "ALMOST IN" ASKS AGAIN ON ITS OWN.
 *
 * Before this, nothing on this page ever asked the server a second time, so a person let in by an
 * admin while this tab stayed open kept reading "Almost in" forever - the only way off it was a
 * manual reload, and `RequireOrgSetup` (App.tsx) made that worse by trusting a cached `waiting:
 * true` without asking again either. Fixed on both ends; this covers this page's own half: it polls
 * every 30 seconds, so being let in turns it into "You're in" without the person doing anything.
 */
vi.mock('@/api/auth', () => ({ authApi: { myWaiting: vi.fn(), remindAboutMyWaiting: vi.fn() } }))

const WAITING = {
  waiting: true,
  organisationName: 'Baridi Appliances',
  askedAt: new Date().toISOString(),
  admin: { name: 'Grace Achieng', firstName: 'Grace' },
  inviterFirstName: null,
  canRemindFrom: new Date().toISOString(),
}

function open() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={qc}><MemoryRouter><WaitingForAnAdminPage /></MemoryRouter></QueryClientProvider>)
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers({ shouldAdvanceTime: true })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('"Almost in" asks again on its own', () => {
  it('turns into "You\'re in" once an admin lets them in, without a reload', async () => {
    ;(authApi.myWaiting as any)
      .mockResolvedValueOnce(WAITING)
      .mockResolvedValue({ waiting: false })
    open()
    expect(await screen.findByRole('heading', { name: 'Almost in' })).toBeTruthy()

    await vi.advanceTimersByTimeAsync(30_000)

    expect(await screen.findByRole('heading', { name: 'You’re in' })).toBeTruthy()
    expect((authApi.myWaiting as any).mock.calls.length).toBeGreaterThanOrEqual(2)
  })
})
