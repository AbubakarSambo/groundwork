import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { GoogleCallbackPage } from './GoogleCallbackPage'
import { MagicVerifyPage } from './MagicVerifyPage'
import { AuthPage } from './AuthPage'
import { authApi } from '@/api/auth'

/**
 * GOOGLE KEEPS THE PLACE, AND COMES BACK TO THE SAME CONFIRMATION AS EMAIL (U.3 review).
 *
 * "Sign up with Google" on the sign-up reached from an invite link sends the link with it; a Google
 * sign-in that works comes back to it; and one that must choose where they work first lands on the
 * confirmation page, which does not tell them their email was confirmed, because it was not.
 */
vi.mock('@/api/auth', () => ({
  authApi: {
    googleExchange: vi.fn().mockResolvedValue({ accessToken: 'jwt' }),
    me: vi.fn().mockResolvedValue({ id: 'u1', email: 'ama@coamana.test' }),
    methods: vi.fn().mockResolvedValue({ magicLink: true, google: true }),
    verifyEmail: vi.fn(),
    entrySave: vi.fn(),
    nameFromAddress: vi.fn().mockResolvedValue({ name: null }),
  },
}))
vi.mock('@/api/entry', () => ({ entryApi: { commit: vi.fn().mockRejectedValue({ response: { data: { message: 'NO_ENTRY_SESSION' } } }) } }))
vi.mock('@/api/grounds', () => ({ groundsApi: { list: vi.fn().mockResolvedValue([]) } }))
vi.mock('@/stores/auth', () => ({ useAuthStore: (sel: any) => sel({ setAuth: vi.fn() }) }))
const navigated: string[] = []
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<any>('react-router-dom')
  return { ...actual, useNavigate: () => (to: string) => { navigated.push(to) } }
})

function at(path: string, element: React.ReactNode, route: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}><Routes><Route path={route} element={element} /></Routes></MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => { vi.clearAllMocks(); navigated.length = 0; localStorage.clear() })

describe('the trip to Google', () => {
  it('"Sign up with Google" from the invite link carries the link', async () => {
    const assign = vi.fn()
    Object.defineProperty(window, 'location', { value: { ...window.location, set href(v: string) { assign(v) }, get href() { return 'http://localhost/' } }, configurable: true })
    at(`/auth?mode=signup&next=${encodeURIComponent('/j/coamana-6rr7')}`, <AuthPage />, '/auth')
    fireEvent.click(await screen.findByRole('button', { name: 'Sign up with Google' }))
    expect(assign).toHaveBeenCalledWith(expect.stringMatching(/\/api\/v1\/auth\/google\?next=%2Fj%2Fcoamana-6rr7$/))
  })
})

describe('the way back from Google', () => {
  it('an existing account goes back to where it was going', async () => {
    at(`/auth/google/callback?code=c1&new=false&nameOrg=false&next=${encodeURIComponent('/j/coamana-6rr7')}`, <GoogleCallbackPage />, '/auth/google/callback')
    await waitFor(() => expect(navigated).toContain('/j/coamana-6rr7'))
  })

  it('an outside address is never followed', async () => {
    at(`/auth/google/callback?code=c1&new=false&nameOrg=false&next=${encodeURIComponent('//evil.test')}`, <GoogleCallbackPage />, '/auth/google/callback')
    await waitFor(() => expect(navigated).toContain('/'))
    expect(navigated).not.toContain('//evil.test')
  })

  it('from a domain match lands on "Where do you work?", and is not told an email was confirmed', async () => {
    ;(authApi.verifyEmail as any).mockResolvedValueOnce({ email: 'ama@coamana.test', whereDoYouWork: { byDomain: [{ id: 'o-c', name: 'Coamana', domain: 'coamana.test' }] } })
    at('/verify-email?token=wait-1&via=google', <MagicVerifyPage />, '/verify-email')
    expect(await screen.findByRole('heading', { name: 'Where do you work?' })).toBeTruthy()
    ;(authApi.verifyEmail as any).mockResolvedValueOnce({ user: { id: 'u1', email: 'ama@coamana.test' }, accessToken: 't', justCreated: true, needsPassword: false, next: '/today' })
    fireEvent.click(screen.getByRole('button', { name: 'Join Coamana' }))
    await waitFor(() => expect(navigated).toContain('/today'))
    expect(screen.queryByRole('heading', { name: 'Your email is confirmed' })).toBeNull()
  })
})
