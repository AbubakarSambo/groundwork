import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthPage } from './AuthPage'
import { authApi } from '@/api/auth'

/**
 * SIGNING IN TAKES YOU WHERE YOU WERE GOING. W8-70.
 *
 * `RequireAuth` and `RequirePlatformAdmin` both redirected to `/auth?from=<path>`.
 * `AuthPage` has only ever read `?next=`. So **every** signed-out person who clicked any
 * link into the app - a ground, a report, a board, an invite in a message - signed in and
 * landed on the grounds list, with no explanation and nothing to click to get back to what
 * they were opening.
 *
 * The same bug was found and fixed once for PricingPage, which is why `next` exists. The
 * general case was never fixed, because two people wrote two names for one idea and the
 * one the redirects used was the dead one. Nothing failed loudly: a redirect that loses
 * its destination just looks like the product forgetting.
 */

vi.mock('@/api/auth', () => ({
  authApi: { login: vi.fn(), entrySave: vi.fn(), forgotPassword: vi.fn(), methods: vi.fn(), requestMagicLink: vi.fn() },
}))
vi.mock('@/stores/auth', () => ({ useAuthStore: (sel: any) => sel({ setAuth: vi.fn() }) }))

const navigated = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => navigated }
})

async function signInFrom(search: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[`/auth${search}`]}>
        <Routes><Route path="/auth" element={<AuthPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
  await waitFor(() => screen.getByLabelText(/^Email/i))
  fireEvent.change(screen.getByLabelText(/^Email/i), { target: { value: 'her@x.test' } })
  fireEvent.change(screen.getByLabelText(/^Password/i), { target: { value: 'Passw0rdish' } })
  fireEvent.click(screen.getByRole('button', { name: /^Sign in/i }))
  await waitFor(() => expect(navigated).toHaveBeenCalled())
  return navigated.mock.calls[0][0]
}

beforeEach(() => {
  vi.clearAllMocks()
  ;(authApi.methods as any).mockResolvedValue({ magicLink: true, google: false })
  ;(authApi.login as any).mockResolvedValue({ user: { id: 'u1' }, accessToken: 'a' })
})

describe('after signing in', () => {
  it('an app redirect lands them where they were going', async () => {
    expect(await signInFrom('?from=%2Fgrounds%2Fg-1%2Freport')).toBe('/grounds/g-1/report')
  })

  it('and `next` still works, since that is what the product already sent', async () => {
    expect(await signInFrom('?next=%2Fpricing')).toBe('/pricing')
  })

  it('with nothing asked for, the grounds list is the right default', async () => {
    expect(await signInFrom('')).toBe('/')
  })

  it('but neither spelling can send anybody off the product', async () => {
    // Both are read off a URL anybody can write, on the page where a password is typed.
    expect(await signInFrom('?from=https%3A%2F%2Fevil.example')).toBe('/')
  })

  it('nor to another origin via a protocol-relative path', async () => {
    // "//evil.example" starts with a slash, so a naive startsWith('/') check passes it.
    expect(await signInFrom('?from=%2F%2Fevil.example')).toBe('/')
  })
})

describe('and the redirects send the name that is read', () => {
  it('App.tsx uses next', () => {
    /**
     * The half that a render test cannot see: AuthPage could read both names perfectly and
     * the bug would survive if the redirects kept sending a third one.
     */
    const app = readFileSync(join(__dirname, '../../App.tsx'), 'utf8')
    const code = app.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
    expect(code).toMatch(/\/auth\?next=\$\{encodeURIComponent\(dest\)\}/)
    expect(code).not.toMatch(/\/auth\?from=/)
  })
})
