import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { GoogleFailedPage } from './GoogleFailedPage'
import { GoogleCallbackPage } from './GoogleCallbackPage'
import { AuthPage } from './AuthPage'
import { authApi } from '@/api/auth'

/**
 * "GOOGLE SIGN-IN DIDN'T FINISH" (A2, #/google-failed), as the person sent back from Google reads it,
 * and the two ways they arrive there.
 */

vi.mock('@/api/auth', () => ({
  authApi: {
    methods: vi.fn(),
    googleExchange: vi.fn(),
    me: vi.fn(),
    entrySave: vi.fn(),
    login: vi.fn(),
    forgotPassword: vi.fn(),
    renameOrganization: vi.fn(),
  },
}))
vi.mock('@/api/entry', () => ({ entryApi: { commit: vi.fn() } }))
vi.mock('@/stores/auth', () => ({ useAuthStore: (sel: any) => sel({ setAuth: vi.fn() }) }))

function renderAt(path: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/auth/google/callback" element={<GoogleCallbackPage />} />
          <Route path="/google-failed" element={<GoogleFailedPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const readable = (el: HTMLElement) => (el.textContent ?? '').replace(/\s+/g, ' ').trim()

beforeEach(() => {
  vi.clearAllMocks()
  ;(authApi.methods as any).mockResolvedValue({ magicLink: true, google: true })
})

describe('what the page says', () => {
  it('with Google set up: the prototype\'s words, "Try Google again" and the email link', async () => {
    const { container } = renderAt('/google-failed')
    await screen.findByRole('button', { name: 'Try Google again' })
    expect(readable(container)).toBe(
      'Groundwork' +
      'Google sign-in didn’t finish' +
      /* Hafsah, 26 September: full sentences, no semicolon, and no "Nothing was created or changed." */
      'Google did not finish signing you in. It usually works if you try again. You can also sign in with an email link instead.' +
      'Try Google again' +
      'Email me a sign-in link',
    )
    expect(screen.getByRole('link', { name: 'Email me a sign-in link' }).getAttribute('href')).toBe('/auth?mode=member')
  })

  it('with Google not set up, "Try Google again" is not offered', async () => {
    ;(authApi.methods as any).mockResolvedValue({ magicLink: true, google: false })
    renderAt('/google-failed')
    await waitFor(() => expect(authApi.methods).toHaveBeenCalled())
    await screen.findByRole('link', { name: 'Email me a sign-in link' })
    expect(screen.queryByRole('button', { name: 'Try Google again' })).toBeNull()
  })

  it('does not claim "Nothing was created or changed", which is not always true', async () => {
    const { container } = renderAt('/google-failed')
    await screen.findByRole('heading', { name: 'Google sign-in didn’t finish' })
    expect(readable(container)).not.toMatch(/Nothing was created/)
  })
})

describe('both ways a Google sign-in fails land on it', () => {
  it('the API\'s redirect to /auth?why=google-signin-failed', async () => {
    renderAt('/auth?why=google-signin-failed')
    expect(await screen.findByRole('heading', { name: 'Google sign-in didn’t finish' })).toBeTruthy()
  })

  it('a code that cannot be exchanged, on the way back from Google', async () => {
    ;(authApi.googleExchange as any).mockRejectedValue(new Error('expired'))
    renderAt('/auth/google/callback?code=abc&new=false&nameOrg=false')
    expect(await screen.findByRole('heading', { name: 'Google sign-in didn’t finish' })).toBeTruthy()
  })

  it('a return from Google with no code at all', async () => {
    renderAt('/auth/google/callback')
    expect(await screen.findByRole('heading', { name: 'Google sign-in didn’t finish' })).toBeTruthy()
  })
})
