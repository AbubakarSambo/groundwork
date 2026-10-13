import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthPage } from './AuthPage'
import { billingApi } from '@/api/billing'

/**
 * THE FREE TRIAL ON "CREATE YOUR ACCOUNT" (Hafsah, 26 September). Its sentence is built from the
 * server's numbers, and shown only while the trial is switched on, which waits until billing really
 * grants it (U.19).
 */
vi.mock('@/api/auth', () => ({ authApi: { entrySave: vi.fn(), login: vi.fn(), forgotPassword: vi.fn(), methods: vi.fn().mockResolvedValue({ magicLink: true, google: false }) } }))
vi.mock('@/api/billing', () => ({ billingApi: { getPricing: vi.fn(), whatIsWaitingFor: vi.fn().mockRejectedValue(new Error('none')) } }))
vi.mock('@/stores/auth', () => ({ useAuthStore: (sel: any) => sel({ setAuth: vi.fn() }) }))

function renderSignUp(initialEntry = '/auth?mode=signup') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes><Route path="/auth" element={<AuthPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}
const pricing = (trial: any) => ({ plans: [], free: { groundLimit: 10, memberLimit: 5 }, trial })

beforeEach(() => { vi.clearAllMocks() })

describe('the free trial on sign-up', () => {
  it('off (as it is until billing grants it): nothing about a trial, and the plain sentence', async () => {
    ;(billingApi.getPricing as any).mockResolvedValue(pricing({ on: false, teamsUnder: 20, months: 1 }))
    renderSignUp()
    await waitFor(() => expect(billingApi.getPricing).toHaveBeenCalled())
    expect(await screen.findByText('We send you a link to confirm your email. Your account is made when you open it.')).toBeTruthy()
    expect(screen.queryByText(/months free|No card/)).toBeNull()
  })

  /* Served months changed from 3 to 1 (decision 78, 5 October: every free run is one month). */
  it('on: the prototype\'s sentence, built from the server\'s numbers', async () => {
    ;(billingApi.getPricing as any).mockResolvedValue(pricing({ on: true, teamsUnder: 20, months: 1 }))
    renderSignUp()
    expect(await screen.findByText('Teams of fewer than 20 people get 1 month free. No card needed.')).toBeTruthy()
  })

  it('with other numbers, the same sentence with those numbers', async () => {
    ;(billingApi.getPricing as any).mockResolvedValue(pricing({ on: true, teamsUnder: 30, months: 2 }))
    renderSignUp()
    expect(await screen.findByText('Teams of fewer than 30 people get 2 months free. No card needed.')).toBeTruthy()
  })

  it('a failed read says nothing about a trial', async () => {
    ;(billingApi.getPricing as any).mockRejectedValue(new Error('offline'))
    renderSignUp()
    expect(await screen.findByText('We send you a link to confirm your email. Your account is made when you open it.')).toBeTruthy()
    expect(screen.queryByText(/months free/)).toBeNull()
  })

  /*
   * B-206: signing up from an organisation's own invite link (JoinByLinkPage sends people to
   * `/auth?mode=signup&next=/j/<code>`) is always joining an organisation that already exists, so
   * the trial line - which is about starting your own - has nothing to do with it and is left out,
   * even while the trial is switched on.
   */
  it('leaves the trial line out when signing up from an organisation\'s own join link', async () => {
    ;(billingApi.getPricing as any).mockResolvedValue(pricing({ on: true, teamsUnder: 20, months: 1 }))
    renderSignUp('/auth?mode=signup&next=%2Fj%2Fmsingi-7k2p')
    expect(await screen.findByText('We send you a link to confirm your email. Your account is made when you open it.')).toBeTruthy()
    expect(screen.queryByText(/months free|No card/)).toBeNull()
  })
})
