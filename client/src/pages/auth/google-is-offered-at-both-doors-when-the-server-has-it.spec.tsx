import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthPage } from './AuthPage'
import { authApi } from '@/api/auth'

/**
 * GOOGLE SIGN-IN AND SIGN-UP, AS THEY WORK ON THE LIVE PRODUCT.
 *
 * The button is offered at both doors exactly when the server's `/auth/methods` says Google is on, and at
 * neither when it says it is off (so nobody is sent to Google's own error page). Pressing it is a full page
 * load to the API's Google address, which is what hands the browser to accounts.google.com. The same
 * button, on the sign-in screen and on the sign-up screen, because Google decides on the server whether the
 * person already has an account (findOrCreateGoogleUser).
 */
vi.mock('@/api/auth', () => ({
  authApi: {
    entrySave: vi.fn(), login: vi.fn(), forgotPassword: vi.fn(), methods: vi.fn(),
    nameFromAddress: vi.fn().mockResolvedValue({ name: null }),
  },
}))
vi.mock('@/stores/auth', () => ({ useAuthStore: (sel: any) => sel({ setAuth: vi.fn() }) }))

function renderAt(path: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  /* B-202 (review round 3): AppShell now waits for the same ['my-waiting'] read RequireOrgSetup
  already makes before it mounts the sidebar at all - without this cached answer the real
  authApi.myWaiting (not mocked in this file) would be asked for real. */
  qc.setQueryData(['my-waiting'], { waiting: false })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}><Routes><Route path="/auth" element={<AuthPage />} /></Routes></MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => { vi.clearAllMocks() })

describe('when the server says Google is on', () => {
  beforeEach(() => { (authApi.methods as any).mockResolvedValue({ magicLink: true, google: true }) })

  it('the sign-in screen offers "Sign in with Google", and it goes to the API\'s Google address', async () => {
    const assign = vi.fn()
    Object.defineProperty(window, 'location', { value: { ...window.location, set href(v: string) { assign(v) }, get href() { return 'http://localhost/' } }, configurable: true })
    renderAt('/auth')
    fireEvent.click(await screen.findByRole('button', { name: 'Sign in with Google' }))
    expect(assign).toHaveBeenCalledWith(expect.stringMatching(/\/api\/v1\/auth\/google$/))
  })

  it('the sign-up screen offers "Sign up with Google"', async () => {
    renderAt('/auth?mode=signup')
    expect(await screen.findByRole('button', { name: 'Sign up with Google' })).toBeTruthy()
  })
})

describe('when the server says Google is off', () => {
  beforeEach(() => { (authApi.methods as any).mockResolvedValue({ magicLink: true, google: false }) })

  it('neither screen has a Google button', async () => {
    const first = renderAt('/auth')
    await screen.findByRole('heading', { name: 'Sign in' })
    expect(screen.queryByRole('button', { name: /Google/ })).toBeNull()
    first.unmount()
    renderAt('/auth?mode=signup')
    await screen.findByRole('heading', { name: 'Sign up to Groundwork' })
    expect(screen.queryByRole('button', { name: /Google/ })).toBeNull()
  })
})

describe('when the server cannot be asked', () => {
  it('there is no Google button, which is the safe direction', async () => {
    ;(authApi.methods as any).mockRejectedValue(new Error('offline'))
    renderAt('/auth')
    await screen.findByRole('heading', { name: 'Sign in' })
    expect(screen.queryByRole('button', { name: /Google/ })).toBeNull()
  })
})
