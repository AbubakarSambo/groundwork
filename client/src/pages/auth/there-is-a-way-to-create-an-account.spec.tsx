import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthPage } from './AuthPage'
import { authApi } from '@/api/auth'

/**
 * THERE IS A WAY TO CREATE AN ACCOUNT, AND IT SAYS SO. W10-1, W10-2.
 *
 * Her words: "the sign-up flow still just says sign-in, no create an account options
 * etc... We seem to be failing to get this wrong with you."
 *
 * She was right, and the reason was structural: there was no sign-up flow. There was a
 * sign-in page with a sign-up hidden inside its send-me-a-link view, under a heading
 * that said "Sign in or create account", reachable from the fourth line of small
 * print. The plumbing worked; the door was missing.
 *
 * Three things pinned here, in the order they matter:
 *  1. a failure is never reported as success
 *  2. the create view exists, and asks for the name and organisation so neither is
 *     guessed from the email address
 *  3. "you have no password" is not shown as "wrong password"
 */

vi.mock('@/api/auth', () => ({
  authApi: {
    entrySave: vi.fn(),
    login: vi.fn(),
    forgotPassword: vi.fn(),
    methods: vi.fn(),
  },
}))
vi.mock('@/stores/auth', () => ({ useAuthStore: (sel: any) => sel({ setAuth: vi.fn() }) }))

const mockedNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => mockedNavigate }
})

function renderAuth(search = '') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[`/auth${search}`]}>
        <Routes><Route path="/auth" element={<AuthPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  ;(authApi.methods as any).mockResolvedValue({ magicLink: true, google: false })
  ;(authApi.entrySave as any).mockResolvedValue({ message: 'ok', email: 'her@x.test' })
})

/**
 * THE LABEL IS "EMAIL", NOT "WORK EMAIL", AND THAT IS THE POINT. W15-1.
 *
 * Nothing in the code has ever required a company domain. The label was the only thing implying
 * one, and it was enough to turn away somebody running a real business off a Gmail address - the
 * exact small team this is for. Anchored as /^Email$/ so a future "Work email" fails here rather
 * than quietly passing a loose match.
 */
describe('the create-account door', () => {
  it('is on the sign-in page, and says what it is', async () => {
    renderAuth()
    await waitFor(() => expect(screen.getByText(/New here\? Sign up/)).toBeTruthy())
  })

  it('and opens a view whose heading is only about creating an account', async () => {
    renderAuth()
    fireEvent.click(await waitFor(() => screen.getByText(/New here\? Sign up/)))
    expect(screen.getByText('Create your account')).toBeTruthy()
    // Not "Sign in or create account" - a heading that hedges is the thing she read as
    // "it just says sign-in".
    expect(screen.queryByText(/Sign in or create account/)).toBeNull()
  })

  it('?mode=signup lands there directly', async () => {
    renderAuth('?mode=signup')
    await waitFor(() => expect(screen.getByText('Create your account')).toBeTruthy())
  })

  /*
   * WALKTHROUGH PASS 2, ITEM 4: TWO NAVY BUTTONS AT ONCE. "How would you like to sign in?" drew its
   * chosen option ("With a link we email you", the default) navy, the same colour as "Create
   * account" below it - two navy controls on one page, which CLAUDE.md's "at most one navy button
   * per page" rules out and which the prototype's own sign-up screen never has (signup.txt has only
   * "Create account"). `Choices` now takes a `quiet` prop for exactly this case.
   */
  it('has exactly one navy control: "Create account", never the chosen sign-in method too', async () => {
    renderAuth('?mode=signup')
    await waitFor(() => expect(screen.getByText('Create your account')).toBeTruthy())
    const chosen = screen.getByRole('radio', { name: 'With a link we email you', checked: true })
    expect(chosen.className).not.toContain('gwui-choice-on ')
    expect(chosen.className.trim()).not.toBe('gwui-choice gwui-choice-on')
    expect(chosen.className).toContain('gwui-choice-on-quiet')
    expect(screen.getByRole('button', { name: /^Create account$/ }).className).toContain('gwui-btn-primary')
  })

  it('asks for the name and the organisation', async () => {
    /**
     * Both were guessed before, and not harmlessly: `entrySave` derives the first name
     * from the address and `verifyEmail` names the organisation "<name>'s workspace",
     * so a person signing up to run a team landed in a company nobody named.
     */
    renderAuth('?mode=signup')
    await waitFor(() => expect(screen.getByLabelText(/Your name/i)).toBeTruthy())
    expect(screen.getByText(/Your organisation/)).toBeTruthy()
  })

  it('and sends them, so neither is derived from the email', async () => {
    renderAuth('?mode=signup')
    await waitFor(() => screen.getByLabelText(/Your name/i))
    fireEvent.change(screen.getByLabelText(/Your name/i), { target: { value: 'Sam Taylor' } })
    fireEvent.change(screen.getByLabelText(/^Email$/i), { target: { value: 'sam@acme.test' } })
    fireEvent.change(screen.getByLabelText(/Your organisation/i), { target: { value: 'Acme Ltd' } })
    fireEvent.click(screen.getByRole('button', { name: /^Create account$/ }))
    await waitFor(() => expect(authApi.entrySave).toHaveBeenCalledWith(
      'sam@acme.test',
      { payload: { firstName: 'Sam Taylor', orgName: 'Acme Ltd' } },
      /* The honeypot, empty: a person never meets the field. */
      '',
      /* No password: the email link is the default way to sign in (U.2). */
      undefined,
    ))
  })

  /* A Gmail address, because a company address now suggests its organisation's name (U.2, Hafsah's
     decision of 26 September); a public mail address suggests nothing, so the box stays empty. */
  it('the organisation is optional, because a naming decision should not block signing up', async () => {
    renderAuth('?mode=signup')
    await waitFor(() => screen.getByLabelText(/Your name/i))
    fireEvent.change(screen.getByLabelText(/Your name/i), { target: { value: 'Sam' } })
    fireEvent.change(screen.getByLabelText(/^Email$/i), { target: { value: 'sam@gmail.com' } })
    fireEvent.click(screen.getByRole('button', { name: /^Create account$/ }))
    /* The third argument is the honeypot — empty for a person who never sees the field. See
       components/gw/a-field-nobody-can-see.tsx. */
    await waitFor(() => expect(authApi.entrySave).toHaveBeenCalledWith('sam@gmail.com', { payload: { firstName: 'Sam' } }, '', undefined))
  })
})

describe('a failure is not a success', () => {
  it('a server error says so, instead of sending them to wait for an email', async () => {
    /**
     * THE WORST THING IN THE OLD FLOW, and four characters of code: `onError: () =>
     * setLinkSent(true)`. Somebody whose account was never created was told to check
     * their email for a link that would never arrive.
     */
    ;(authApi.entrySave as any).mockRejectedValue({ response: { status: 500 } })
    renderAuth('?mode=signup')
    await waitFor(() => screen.getByLabelText(/^Email$/i))
    fireEvent.change(screen.getByLabelText(/^Email$/i), { target: { value: 'sam@acme.test' } })
    fireEvent.click(screen.getByRole('button', { name: /^Create account$/ }))
    await waitFor(() => expect(screen.getByText(/did not send/i)).toBeTruthy())
    expect(screen.queryByText(/Check your email/)).toBeNull()
  })

  it('a network failure says so too', async () => {
    // No response at all. Nothing about this reveals whether the address is registered.
    ;(authApi.entrySave as any).mockRejectedValue({})
    renderAuth('?mode=signup')
    await waitFor(() => screen.getByLabelText(/^Email$/i))
    fireEvent.change(screen.getByLabelText(/^Email$/i), { target: { value: 'sam@acme.test' } })
    fireEvent.click(screen.getByRole('button', { name: /^Create account$/ }))
    await waitFor(() => expect(screen.getByText(/did not send/i)).toBeTruthy())
  })

  it('and never says an address already has an account', async () => {
    /*
     * Changed by Hafsah's rule of 26 September: sign-up never reveals whether an address has an
     * account. This test used to require "already has an account" on a 409. entry-save answers an
     * existing address exactly as a new one now, so a 409 is only a refusal like any other.
     */
    ;(authApi.entrySave as any).mockRejectedValue({ response: { status: 409 } })
    renderAuth('?mode=signup')
    await waitFor(() => screen.getByLabelText(/^Email$/i))
    fireEvent.change(screen.getByLabelText(/^Email$/i), { target: { value: 'sam@acme.test' } })
    fireEvent.click(screen.getByRole('button', { name: /^Create account$/ }))
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy())
    expect(screen.queryByText(/already has an account/i)).toBeNull()
  })
})

describe('an account with no password', () => {
  it('is told that, not that the password was wrong', async () => {
    /**
     * A participant added to a check-in has an account and no password. The server spots
     * it, emails a setup link and says so - but it arrived as red text under the
     * password field, which reads as "you typed it wrong" and invites another go at a
     * password that has never existed.
     *
     * Deliberately not a lookup before they submit: an endpoint answering "does this
     * address have a password" is an account-enumeration oracle.
     */
    ;(authApi.login as any).mockRejectedValue({
      response: { data: { message: "We've emailed you a link to set your password. Check your inbox." } },
    })
    renderAuth()
    await waitFor(() => screen.getByLabelText(/^Email/i))
    fireEvent.change(screen.getByLabelText(/^Email/i), { target: { value: 'her@x.test' } })
    fireEvent.change(screen.getByLabelText(/^Password/i), { target: { value: 'anything' } })
    fireEvent.click(screen.getByRole('button', { name: /^Sign in/i }))
    await waitFor(() => expect(screen.getByText(/emailed you a link to set your password/)).toBeTruthy())
    expect(screen.getByText('Check your email')).toBeTruthy()
  })

  it('and a genuinely wrong password still says so', async () => {
    ;(authApi.login as any).mockRejectedValue({ response: { data: { message: 'Invalid email or password' } } })
    renderAuth()
    await waitFor(() => screen.getByLabelText(/^Email/i))
    fireEvent.change(screen.getByLabelText(/^Email/i), { target: { value: 'her@x.test' } })
    fireEvent.change(screen.getByLabelText(/^Password/i), { target: { value: 'wrong' } })
    fireEvent.click(screen.getByRole('button', { name: /^Sign in/i }))
    await waitFor(() => expect(screen.getByText(/Invalid email or password/)).toBeTruthy())
  })
})
