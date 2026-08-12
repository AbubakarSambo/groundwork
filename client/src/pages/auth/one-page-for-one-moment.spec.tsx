import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthPage } from './AuthPage'
import { authApi } from '@/api/auth'

/**
 * ONE PAGE FOR ONE MOMENT. W8-49.
 *
 * "A link is on its way" existed twice. `/auth` had a tick, one sentence and a link
 * back to sign in. `/auth/sent` had the countdown, the resend, what to expect, and a
 * way back for somebody who mistyped their address. Which one a person got depended
 * on which button they pressed, and the worse one was on the page everybody starts
 * from.
 *
 * The good one is now the only one, and `/auth/sent` renders this same page. That URL
 * stays real because `SaveCard` on the marketing home navigates to it - a merge that
 * deletes a URL somebody links to is not a merge, it is a 404.
 */

vi.mock('@/api/auth', () => ({
  authApi: {
    entrySave: vi.fn(),
    login: vi.fn(),
    forgotPassword: vi.fn(),
    requestMagicLink: vi.fn(),
    methods: vi.fn(),
  },
}))
vi.mock('@/stores/auth', () => ({ useAuthStore: (sel: any) => sel({ setAuth: vi.fn() }) }))

function renderAt(path: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/auth/sent" element={<AuthPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  ;(authApi.methods as any).mockResolvedValue({ magicLink: true, google: false })
})

describe('/auth/sent is a state of /auth, not a second page', () => {
  it('arriving there shows the link-sent panel, with the address it went to', async () => {
    // SaveCard navigates here with the address in the query string. If this route
    // stopped resolving, the marketing home's only sign-up button would 404.
    renderAt('/auth/sent?email=sam%40acme.test')
    await waitFor(() => expect(screen.getByText('Check your email')).toBeTruthy())
    expect(screen.getByText('sam@acme.test')).toBeTruthy()
  })

  it('and it is the good version: the resend and the way back are both there', async () => {
    /**
     * The whole point of the merge. These four things only existed on the separate
     * page, so somebody who sent themselves a link from /auth got none of them - and
     * a mistyped address had no exit at all.
     */
    renderAt('/auth/sent?email=sam%40acme.test')
    await waitFor(() => expect(screen.getByText(/Resend available in/)).toBeTruthy())
    expect(screen.getByText(/What to expect/)).toBeTruthy()
    expect(screen.getByText(/Check your spam folder/)).toBeTruthy()
    expect(screen.getByText(/Wrong address\? Use a different one/)).toBeTruthy()
  })

  it('the old thin version is gone rather than kept alongside', async () => {
    // The sentence that only the /auth copy had. Two of these is how they drifted.
    renderAt('/auth/sent?email=sam%40acme.test')
    await waitFor(() => screen.getByText('Check your email'))
    expect(screen.queryByText(/A link is on its way to/)).toBeNull()
  })

  it('and nothing else renders around it', async () => {
    /**
     * FOUND IN A BROWSER, NOT BY A TEST. My first version of this merge asserted the
     * panel was there and the old copy was gone, and both held - but the sign-in form
     * still rendered ABOVE it, because the password view was gated on `view` and never
     * on `linkSent`. So /auth/sent showed an email field, a password field, "Sign in",
     * "Forgot your password?", "Create an account", and then "Check your email"
     * underneath all of it. Two screens stacked.
     *
     * The lesson is the one already in the plan: prove it at the render, not at the
     * assertions you happened to write.
     */
    renderAt('/auth/sent?email=sam%40acme.test')
    await waitFor(() => screen.getByText('Check your email'))
    expect(screen.queryByLabelText(/^Password/i)).toBeNull()
    expect(screen.queryByRole('button', { name: /^Sign in$/ })).toBeNull()
    expect(screen.queryByText(/Forgot your password/)).toBeNull()
    expect(screen.queryByText(/New here\? Create an account/)).toBeNull()
  })

  it('and /auth itself does not open in the sent state', async () => {
    // The state is keyed on the path. If it were not, the sign-in form would be
    // replaced by "check your email" for everybody who ever visited.
    renderAt('/auth')
    await waitFor(() => expect(screen.getByLabelText(/^Email/i)).toBeTruthy())
    expect(screen.queryByText('Check your email')).toBeNull()
  })
})
