import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthPage } from './AuthPage'
import { authApi } from '@/api/auth'

/**
 * THE SIGN-IN SCREEN, AS A SIGNED-OUT VISITOR READS IT (A2, #/signin).
 *
 * The wording is the prototype's (docs/prototype/screens/A2-accounts-and-signing-in/signin.txt),
 * except the email label, which stays "Email" until Hafsah decides on "Your work email".
 */

vi.mock('@/api/auth', () => ({
  authApi: { entrySave: vi.fn(), login: vi.fn(), forgotPassword: vi.fn(), methods: vi.fn() },
}))
vi.mock('@/stores/auth', () => ({ useAuthStore: (sel: any) => sel({ setAuth: vi.fn() }) }))

function renderAt(path: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

/** The words a person reads, top to bottom, with the hidden anti-bot field left out. */
function readable(container: HTMLElement) {
  const copy = container.cloneNode(true) as HTMLElement
  copy.querySelectorAll('[aria-hidden="true"], .gw-sr-only').forEach(n => n.remove())
  return (copy.textContent ?? '').replace(/\s+/g, ' ').trim()
}

beforeEach(() => {
  vi.clearAllMocks()
  ;(authApi.methods as any).mockResolvedValue({ magicLink: true, google: false })
})

describe('what a signed-out visitor reads', () => {
  it('with Google not set up: every line, in order, and no Google button', async () => {
    const { container } = renderAt('/auth')
    await screen.findByRole('heading', { name: 'Sign in' })
    expect(readable(container)).toBe([
      'Groundwork',
      'Sign in',
      'Use your password, or we’ll email you a link that signs you in.',
      'Email',
      'Password',
      'Show',
      'Sign in',
      'Email me a sign-in link instead',
      'Forgot password?',
      'New here? Sign up',
      'Short check-ins, and proof of what actually moved.',
      'What people say, in their own words',
      'What a photo, a payment or a document shows',
    ].join(''))
    expect(screen.queryByText(/with Google/)).toBeNull()
  })

  it('with Google set up, "Sign in with Google" is offered', async () => {
    ;(authApi.methods as any).mockResolvedValue({ magicLink: true, google: true })
    renderAt('/auth')
    expect(await screen.findByRole('button', { name: 'Sign in with Google' })).toBeTruthy()
  })

  it('says nothing about "work email" or a free trial while those wait for Hafsah', async () => {
    const { container } = renderAt('/auth')
    await screen.findByRole('heading', { name: 'Sign in' })
    expect(readable(container)).not.toMatch(/work email|months free/i)
  })
})

describe('"Email me a sign-in link instead"', () => {
  it('sends a link to the address typed, and shows "Check your email"', async () => {
    ;(authApi.entrySave as any).mockResolvedValue({ message: 'ok', email: 'x' })
    renderAt('/auth')
    fireEvent.change(await screen.findByLabelText('Email'), { target: { value: 'Miriam@Baridi.test ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Email me a sign-in link instead' }))
    await screen.findByText('Check your email')
    expect(authApi.entrySave).toHaveBeenCalledWith('miriam@baridi.test', undefined, '')
    expect(authApi.login).not.toHaveBeenCalled()
  })

  it('with no address typed, says so and sends nothing', async () => {
    renderAt('/auth')
    fireEvent.click(await screen.findByRole('button', { name: 'Email me a sign-in link instead' }))
    expect((await screen.findByRole('alert')).textContent).toBe('That address does not look right.')
    expect(authApi.entrySave).not.toHaveBeenCalled()
  })
})

describe('the answers at the door are unchanged', () => {
  it('a refused sign-in shows the server\'s one answer, whether or not the address has an account', async () => {
    const same = 'If that address has an account here, we have emailed you a way in - check your inbox. If you have a password and it did not work, check it and try again.'
    ;(authApi.login as any).mockRejectedValue({ response: { status: 401, data: { message: same } } })
    renderAt('/auth')
    fireEvent.change(await screen.findByLabelText('Email'), { target: { value: 'nobody@baridi.test' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Whatever1' } })
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    await waitFor(() => expect(screen.getByText(same)).toBeTruthy())
    expect(screen.getByText(same).closest('[role="alert"]')).toBeTruthy()
  })

  it('somebody signed out for being away is told why, and that nothing is lost', async () => {
    renderAt('/auth?why=session-expired&next=/grounds/1')
    expect(await screen.findByText('You were signed out because you had been away a while. Sign in and we will take you back to where you were. Nothing you wrote has been lost.')).toBeTruthy()
  })
})
