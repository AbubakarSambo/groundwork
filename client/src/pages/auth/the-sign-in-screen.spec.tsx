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

/* U.3: the suggested name now comes from the server, which holds the one list of public mail domains.
   This stands in for it with two of its answers. */
vi.mock('@/api/auth', () => ({
  authApi: {
    entrySave: vi.fn(), login: vi.fn(), forgotPassword: vi.fn(), methods: vi.fn(),
    nameFromAddress: vi.fn(async (e: string) => ({ name: /@coamana\./.test(e) ? 'Coamana' : /@baridi\./.test(e) ? 'Baridi' : null })),
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
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

/** The words a person reads, top to bottom, with the hidden anti-bot field left out. */
function readable(container: HTMLElement) {
  const copy = container.cloneNode(true) as HTMLElement
  /* Group 3, piece 1: the rebuilt screen-reader-only text uses the shared .gwui-sr-only class
     (gw-ui.css), not the old .gw-sr-only - strip both, since neither belongs in what a sighted
     reader reads. */
  copy.querySelectorAll('[aria-hidden="true"], .gw-sr-only, .gwui-sr-only').forEach(n => n.remove())
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
    /* U.2 review: with nothing typed it says what to do, not that something typed is wrong. */
    expect((await screen.findByRole('alert')).textContent).toBe('Type your email address first.')
    expect(authApi.entrySave).not.toHaveBeenCalled()
  })
})

describe('the answers at the door are unchanged', () => {
  it('a refused sign-in shows the server\'s one answer, whether or not the address has an account', async () => {
    /* The server's sentence (api/src/modules/auth/one-answer-at-the-door.ts), without the dash it
       used to join its two halves with. */
    const same = 'If that address has an account here, we have emailed you a way in, so check your inbox. If you have a password and it did not work, check it and try again.'
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

describe('"Check your email", as the person who asked for a link reads it', () => {
  it('reads the prototype\'s words, with the way back for a mistyped address', async () => {
    ;(authApi.entrySave as any).mockResolvedValue({ message: 'ok', email: 'x' })
    const { container } = renderAt('/auth')
    fireEvent.change(await screen.findByLabelText('Email'), { target: { value: 'wairimu@baridi.test' } })
    fireEvent.click(screen.getByRole('button', { name: 'Email me a sign-in link instead' }))
    await screen.findByRole('heading', { name: 'Check your email' })
    expect(readable(container)).toBe([
      'Groundwork',
      'Check your email',
      'We sent a sign-in link to wairimu@baridi.test. Open it on any device.',
      'Send it again',
      'You can send it again in 30 seconds.',
      'Wrong address? Use a different one',
    ].join(''))
    expect((screen.getByRole('button', { name: 'Send it again' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('"Wrong address? Use a different one" goes back to a form holding the address', async () => {
    ;(authApi.entrySave as any).mockResolvedValue({ message: 'ok', email: 'x' })
    renderAt('/auth')
    fireEvent.change(await screen.findByLabelText('Email'), { target: { value: 'wairimu@baridi.tset' } })
    fireEvent.click(screen.getByRole('button', { name: 'Email me a sign-in link instead' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Wrong address? Use a different one' }))
    expect(((await screen.findByLabelText('Email')) as HTMLInputElement).value).toBe('wairimu@baridi.tset')
  })
})

describe('"Forgot your password?", as a signed-out visitor reads it', () => {
  async function openForgot() {
    const r = renderAt('/auth')
    fireEvent.click(await screen.findByRole('button', { name: 'Forgot password?' }))
    await screen.findByRole('heading', { name: 'Forgot your password?' })
    return r
  }

  it('reads the prototype\'s words, with the true lifetime of the link', async () => {
    const { container } = await openForgot()
    expect(readable(container)).toBe([
      'Groundwork',
      'Forgot your password?',
      'We’ll email you a link to choose a new one. It works for an hour.',
      'Email',
      'Email me a reset link',
      'Back to sign in',
      'New here? Sign up',
    ].join(''))
    // The server's reset link lasts an hour (HOW_LONG['reset a password']), not the prototype's 30 minutes.
    expect(readable(container)).not.toMatch(/30 minutes/)
  })

  it('once sent, gives the same answer whether or not the address has an account', async () => {
    ;(authApi.forgotPassword as any).mockRejectedValueOnce({ response: { status: 404 } })
    const { container } = await openForgot()
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'nobody@baridi.test' } })
    fireEvent.click(screen.getByRole('button', { name: 'Email me a reset link' }))
    await screen.findByRole('heading', { name: 'Check your email' })
    expect(readable(container)).toBe([
      'Groundwork',
      'Check your email',
      'If there is an account for nobody@baridi.test, we sent it a link to choose a new password. The link works for an hour.',
      'Send it again',
      'You can send it again in 30 seconds.',
      'Wrong address? Use a different one',
    ].join(''))
    expect(authApi.forgotPassword).toHaveBeenCalledWith('nobody@baridi.test')
    expect(authApi.entrySave).not.toHaveBeenCalled()
  })

  it('"New here? Sign up" opens the sign-up form', async () => {
    await openForgot()
    fireEvent.click(screen.getByRole('button', { name: 'New here? Sign up' }))
    expect(await screen.findByRole('heading', { name: 'Create your account' })).toBeTruthy()
  })
})

describe('signing in again never lands on "You\'re signed out"', () => {
  it('a ?next=/signout is ignored, because arriving there would sign you straight out again', async () => {
    ;(authApi.login as any).mockResolvedValue({ user: { id: 'u1' }, accessToken: 't' })
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={['/auth?next=%2Fsignout']}>
          <Routes>
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/" element={<p>Your check-ins</p>} />
            <Route path="/signout" element={<p>Signed out again</p>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )
    fireEvent.change(await screen.findByLabelText('Email'), { target: { value: 'hafsah@coamana.test' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Whatever1' } })
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByText('Your check-ins')).toBeTruthy()
    expect(screen.queryByText('Signed out again')).toBeNull()
  })
})

describe('"Create your account" says what happens next, truthfully', () => {
  /* Since Hafsah's decision of 26 September, a password is optional and can be chosen here. */
  it('the link confirms the email and makes the account; nothing promises or denies a password', async () => {
    renderAt('/auth?mode=signup')
    expect(await screen.findByText('We send you a link to confirm your email. Your account is made when you open it.')).toBeTruthy()
    expect(screen.queryByText(/No password to choose/)).toBeNull()
  })
})

describe('signing up with a password, if the person prefers (Hafsah, 26 September)', () => {
  it('the link is the default; choosing a password shows the two boxes and the prototype\'s rules', async () => {
    const { container } = renderAt('/auth?mode=signup')
    await screen.findByRole('heading', { name: 'Create your account' })
    /* Group 3, piece 1: the choice is the shared `Choices` part now (role="radiogroup", each
       option its own role="radio" button named by its own text), not a native radio with a
       wrapping <label> - so it is found and read by role and name, not by label. */
    expect(screen.getByRole('radio', { name: 'With a link we email you' }).getAttribute('aria-checked')).toBe('true')
    expect(screen.queryByLabelText('Type it again')).toBeNull()
    fireEvent.click(screen.getByRole('radio', { name: 'With a password' }))
    expect(readable(container)).toContain(['Password', 'Show', 'Type it again', 'Show', 'At least 8 characters', 'A number or a symbol', 'Not your email address', 'Both passwords match', 'Create account'].join(''))
  })

  it('sends the password with the sign-up, and shows "Check your email"', async () => {
    ;(authApi.entrySave as any).mockResolvedValue({ message: 'ok', email: 'x' })
    renderAt('/auth?mode=signup')
    fireEvent.change(await screen.findByLabelText('Your name'), { target: { value: 'Wairimu' } })
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'wairimu@baridi.test' } })
    /* The suggestion arrives from the server now (U.3). */
    await waitFor(() => expect((screen.getByLabelText('Your organisation (optional)') as HTMLInputElement).value).toBe('Baridi'))
    fireEvent.click(screen.getByRole('radio', { name: 'With a password' }))
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'harbour7lamp' } })
    fireEvent.change(screen.getByLabelText('Type it again'), { target: { value: 'harbour7lamp' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }))
    await screen.findByRole('heading', { name: 'Check your email' })
    /* "Baridi" is the organisation name suggested from the address, which they left as it was, so it
       is marked as suggested (U.3 re-review: "Create" after "Where do you work?" does not reuse it). */
    expect(authApi.entrySave).toHaveBeenCalledWith('wairimu@baridi.test', { payload: { firstName: 'Wairimu', orgName: 'Baridi', orgNameSuggested: true } }, '', 'harbour7lamp')
  })

  it('a password that is the email address typed above is caught before anything is sent', async () => {
    renderAt('/auth?mode=signup')
    fireEvent.change(await screen.findByLabelText('Email'), { target: { value: 'wairimu@baridi.test' } })
    fireEvent.click(screen.getByRole('radio', { name: 'With a password' }))
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'wairimu@baridi.test' } })
    fireEvent.change(screen.getByLabelText('Type it again'), { target: { value: 'wairimu@baridi.test' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }))
    expect((await screen.findByRole('alert')).textContent).toBe('Your password does not meet every rule in the list yet.')
    expect(authApi.entrySave).not.toHaveBeenCalled()
  })
})

describe('the organisation\'s name, suggested from the address (Hafsah, 26 September)', () => {
  it('a company address suggests its name, which the person can change and keep', async () => {
    renderAt('/auth?mode=signup')
    fireEvent.change(await screen.findByLabelText('Email'), { target: { value: 'hafsah@coamana.com' } })
    const org = screen.getByLabelText('Your organisation (optional)') as HTMLInputElement
    await waitFor(() => expect(org.value).toBe('Coamana'))
    expect(screen.getByText('We suggested this from your email address. You can change it now or later.')).toBeTruthy()
    fireEvent.change(org, { target: { value: 'Coamana Group' } })
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'hafsah@coamana.co.ke' } })
    expect(org.value).toBe('Coamana Group')
    expect(screen.getByText('What your organisation will be called. You can change it later.')).toBeTruthy()
  })

  it('a public mail address suggests nothing', async () => {
    renderAt('/auth?mode=signup')
    fireEvent.change(await screen.findByLabelText('Email'), { target: { value: 'hafsah@gmail.com' } })
    expect((screen.getByLabelText('Your organisation (optional)') as HTMLInputElement).value).toBe('')
  })
})
