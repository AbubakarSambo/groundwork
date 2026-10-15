import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { LinkDidNotWork, LinkExpired, LinkAlreadyUsedConfirmed } from './LinkExpired'
import { useAuthStore } from '@/stores/auth'

/**
 * B-130. The deep page audit found /verify-email, /set-password and /reset-password, when the
 * link did not work, offered only "Send me a new link" - a dead end for somebody who already has
 * a password and just wants to sign in. The invite and join pages already offer "Sign in instead"
 * in the same situation; these pages did not.
 */
vi.mock('@/api/auth', () => ({ authApi: { entrySave: vi.fn(), forgotPassword: vi.fn() } }))

function renderIt(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('B-130: a broken link offers a way to sign in, not only a new link', () => {
  it('"That link didn’t work" (verify-email, set-password, reset-password) offers Sign in instead', () => {
    renderIt(<LinkDidNotWork kind="sign-in" />)
    expect(screen.getByRole('button', { name: 'Sign in instead' })).toBeTruthy()
  })

  it('"That link has expired" offers Sign in instead too', () => {
    renderIt(<LinkExpired kind="sign-in" />)
    expect(screen.getByRole('button', { name: 'Sign in instead' })).toBeTruthy()
  })
})

/*
 * B-208: A SIGNED-IN PERSON OPENING A DEAD SIGN-IN OR RESET LINK IS NOT OFFERED A WAY TO SIGN IN -
 * they already are. These two buttons ("Send me a new link", "Sign in instead") are both for
 * somebody signed out; signed in, the one thing that makes sense is a way to Today.
 */
describe('B-208: signed in already, a dead link offers Today instead', () => {
  afterEach(() => { useAuthStore.setState({ isAuthenticated: false, user: null, token: null } as any) })

  it('"That link didn’t work", signed in, offers Go to Today and neither old button', () => {
    useAuthStore.setState({ isAuthenticated: true, user: { id: 'u1' }, token: 't' } as any)
    renderIt(<LinkDidNotWork kind="sign-in" />)
    expect(screen.getByRole('button', { name: 'Go to Today' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Send me a new link' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Sign in instead' })).toBeNull()
    expect(screen.queryByLabelText('Email')).toBeNull()
  })

  it('"That link has expired", signed in, offers Go to Today and neither old button', () => {
    useAuthStore.setState({ isAuthenticated: true, user: { id: 'u1' }, token: 't' } as any)
    renderIt(<LinkExpired kind="sign-in" />)
    expect(screen.getByRole('button', { name: 'Go to Today' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Send me a fresh link' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Sign in instead' })).toBeNull()
  })

  /*
   * B-208 (review round 2): THE SENTENCE UNDER THE TITLE STOPPED OFFERING THINGS THE SCREEN NO
   * LONGER HAS. Signed in, "That link didn't work... Open it again from the email, or ask for a new
   * one." used to sit under the lone "Go to Today" button - neither of the two things it describes
   * is on this screen any more.
   */
  it('"That link didn’t work", signed in, drops the sentence about opening it again or asking for a new one', () => {
    useAuthStore.setState({ isAuthenticated: true, user: { id: 'u1' }, token: 't' } as any)
    renderIt(<LinkDidNotWork kind="sign-in" />)
    expect(screen.queryByText(/Open it again from the email/i)).toBeNull()
    expect(screen.queryByText(/ask for a new one/i)).toBeNull()
  })

  it('"That link has expired", signed in, drops the sentence about asking for a fresh one', () => {
    useAuthStore.setState({ isAuthenticated: true, user: { id: 'u1' }, token: 't' } as any)
    renderIt(<LinkExpired kind="sign-in" />)
    expect(screen.queryByText(/ask for a fresh one/i)).toBeNull()
  })
})

/*
 * B-208 (review round 2): ZAWADI, SIGNED IN BY THAT VERY LINK, AND GRACE BOTH USED TO READ "YOUR
 * EMAIL IS ALREADY CONFIRMED... SIGN IN FROM THE SIGN-IN PAGE." [Sign in] - wrong for anybody
 * already signed in (asked to sign in again, on the account they are using) and wrong for Grace in
 * particular ("Your email" names an address that was never hers).
 */
describe('B-208: signed in already, "the link is already used and confirmed" offers Today, names nobody', () => {
  afterEach(() => { useAuthStore.setState({ isAuthenticated: false, user: null, token: null } as any) })

  it('signed out: unchanged - the server\'s own sentence, and Sign in', () => {
    renderIt(<LinkAlreadyUsedConfirmed sentence="This link has already been used, so your address is confirmed. Sign in from the sign-in page." />)
    expect(screen.getByRole('heading', { name: 'Your email is already confirmed' })).toBeTruthy()
    expect(screen.getByText(/Sign in from the sign-in page/)).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Sign in' })).toBeTruthy()
  })

  /*
   * B-208 (review round 3): "THIS ADDRESS IS ALREADY CONFIRMED" ANSWERED A QUESTION NOBODY SIGNED
   * IN IS ASKING - confirming an address is a set-password/reset link's own state, not a sign-in
   * link's. Updated to the heading and sentence that are actually true for this reader: the link
   * has already been used, and being signed in already means there is nothing left to do but carry
   * on.
   */
  it('signed in: "This link has already been used", "You\'re signed in, so you can carry on.", Go to Today, and never "Sign in"', () => {
    useAuthStore.setState({ isAuthenticated: true, user: { id: 'grace-1', email: 'grace@msingi.test' }, token: 't' } as any)
    renderIt(<LinkAlreadyUsedConfirmed sentence="This link has already been used, so your address is confirmed. Sign in from the sign-in page." />)
    expect(screen.getByRole('heading', { name: 'This link has already been used' })).toBeTruthy()
    expect(screen.getByText("You're signed in, so you can carry on.")).toBeTruthy()
    expect(screen.queryByText(/Your email/i)).toBeNull()
    expect(screen.queryByText(/Sign in from the sign-in page/)).toBeNull()
    expect(screen.getByRole('button', { name: 'Go to Today' })).toBeTruthy()
    expect(screen.queryByRole('link', { name: 'Sign in' })).toBeNull()
  })
})
