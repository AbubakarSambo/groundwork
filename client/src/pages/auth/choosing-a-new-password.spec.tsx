import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ChoosePasswordPage } from './ChoosePasswordPage'
import { authApi } from '@/api/auth'

/**
 * "CHOOSE A NEW PASSWORD" (A2, #/reset), as the person who opened a reset link reads it.
 * The words are the prototype's (docs/prototype/screens/A2-accounts-and-signing-in/reset.txt); the
 * rules are the ones the server checks today.
 */

vi.mock('@/api/auth', () => ({ authApi: { setPassword: vi.fn(), resetPassword: vi.fn(), validateToken: vi.fn(), entrySave: vi.fn(), forgotPassword: vi.fn() } }))
vi.mock('@/stores/auth', () => ({ useAuthStore: (sel: any) => sel({ setAuth: vi.fn() }) }))

function renderAt(path: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/reset-password" element={<ChoosePasswordPage />} />
          <Route path="/set-password" element={<ChoosePasswordPage />} />
          <Route path="/grounds" element={<p>Your check-ins</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

function readable(container: HTMLElement) {
  const copy = container.cloneNode(true) as HTMLElement
  /* Group 3, piece 1: the rebuilt screen-reader-only text uses the shared .gwui-sr-only class
     (gw-ui.css), not the old .gw-sr-only - strip both, since neither belongs in what a sighted
     reader reads. */
  copy.querySelectorAll('[aria-hidden], .gw-sr-only, .gwui-sr-only').forEach(n => n.remove())
  return (copy.textContent ?? '').replace(/\s+/g, ' ').trim()
}

beforeEach(() => {
  vi.clearAllMocks()
  ;(authApi.validateToken as any).mockResolvedValue({ valid: true })
})

describe('what the page says', () => {
  it('without an address from the server: every line, and no "For"', async () => {
    const { container } = renderAt('/reset-password?token=tok')
    await waitFor(() => expect(authApi.validateToken).toHaveBeenCalledWith('tok', 'PASSWORD_RESET'))
    expect(readable(container)).toBe([
      'Groundwork',
      'Choose a new password',
      'Once it’s saved, you’re signed out everywhere else.',
      'New password', 'Show',
      'Type it again', 'Show',
      'At least 8 characters',
      'A number or a symbol',
      'Not your email address',
      'Both passwords match',
      'Save password',
    ].join(''))
  })

  it('when the server says whose link it is, the page names the address', async () => {
    ;(authApi.validateToken as any).mockResolvedValue({ valid: true, email: 'wairimu@baridi.test' })
    renderAt('/reset-password?token=tok')
    expect(await screen.findByText(/For/)).toBeTruthy()
    expect(screen.getByText('wairimu@baridi.test').parentElement?.textContent)
      .toBe('For wairimu@baridi.test. Once it’s saved, you’re signed out everywhere else.')
  })

  it('a check that fails changes nothing: no address, and the form still works', async () => {
    ;(authApi.validateToken as any).mockRejectedValue(new Error('offline'))
    ;(authApi.resetPassword as any).mockResolvedValue({ user: { id: 'u1' }, accessToken: 'a' })
    renderAt('/reset-password?token=tok')
    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'Harbour7lamp' } })
    fireEvent.change(screen.getByLabelText('Type it again'), { target: { value: 'Harbour7lamp' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save password' }))
    expect(await screen.findByText('Your check-ins')).toBeTruthy()
    expect(authApi.resetPassword).toHaveBeenCalledWith('tok', 'Harbour7lamp')
  })
})

describe('the rules, before anything is sent', () => {
  it('each rule is ticked as it is met', () => {
    renderAt('/reset-password?token=tok')
    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'Harbour7lamp' } })
    const met = () => screen.getAllByRole('listitem').filter(li => li.className.includes('met')).map(li => li.textContent)
    expect(met()).toEqual(['✓Met, At least 8 characters', '✓Met, A number or a symbol', '✓Met, Not your email address'])
    fireEvent.change(screen.getByLabelText('Type it again'), { target: { value: 'Harbour7lamp' } })
    expect(met()).toHaveLength(4)
  })

  it('two different passwords are caught here, in plain words, and nothing is sent', async () => {
    renderAt('/reset-password?token=tok')
    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'Harbour7lamp' } })
    fireEvent.change(screen.getByLabelText('Type it again'), { target: { value: 'Harbour7lamb' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save password' }))
    expect((await screen.findByRole('alert')).textContent).toBe('The two passwords are not the same. Type the same password in both boxes.')
    expect(authApi.resetPassword).not.toHaveBeenCalled()
  })

  it('a password that misses a rule is caught here too', async () => {
    renderAt('/reset-password?token=tok')
    /* Letters only: no number or symbol (the prototype's rule, Hafsah's decision of 26 September). */
    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'harbourlamp' } })
    fireEvent.change(screen.getByLabelText('Type it again'), { target: { value: 'harbourlamp' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save password' }))
    expect((await screen.findByRole('alert')).textContent).toBe('Your password does not meet every rule in the list yet.')
    expect(authApi.resetPassword).not.toHaveBeenCalled()
  })
})

describe('"Choose a password", the first password from a set-up link (A2, #/password)', () => {
  /* Hafsah's decision of 26 September: choosing a password is optional, so the prototype's
     "Keep using email links instead" is offered (it was left out while that waited on her).
     SCREEN FAULT 5 (FINAL WALK): with no session yet - exactly this fixture's case, a bare
     `/set-password?token=` with nobody signed in - that button used to claim "Keep using" an
     email link nobody had ever used, then still asked for the address again regardless. It now
     says plainly what happens for this case: a new link is what gets sent
     (ChoosePasswordPage.spec.tsx has the signed-in case, where the prototype's own wording is
     unchanged because skipping there costs nothing). */
  it('reads the prototype\'s words, except "Email me a sign-in link instead" in place of "Keep using email links instead"', () => {
    const { container } = renderAt('/set-password?token=tok')
    expect(readable(container)).toBe([
      'Groundwork',
      'Choose a password',
      'For signing in without an email link. You can keep using links too.',
      'Password', 'Show',
      'At least 8 characters',
      'A number or a symbol',
      'Not your email address',
      'Use one you don’t use anywhere else. A few unrelated words are easier to remember than symbols.',
      'Save password',
      'Email me a sign-in link instead',
    ].join(''))
    expect(screen.queryByLabelText('Type it again')).toBeNull()
    /* U.2 step 12: a set-up link is checked as the page opens too, so an old one shows the expired card. */
    expect(authApi.validateToken).toHaveBeenCalledWith('tok', 'PASSWORD_SETUP')
  })

  it('the bar fills one part per rule met, and says "Strong enough" only when every rule is', () => {
    const { container } = renderAt('/set-password?token=tok')
    /* Group 3, piece 1: the strength bar's CSS moved to the shared gwui-strength-bar/gwui-strength-on
       classes (gw-ui.css). */
    const parts = () => [...container.querySelectorAll('.gwui-strength-bar span')].map(s => s.className === 'gwui-strength-on')
    expect(parts()).toEqual([false, false, false])
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'harbourlamp' } })
    expect(parts()).toEqual([true, false, true])
    expect(screen.queryByText('Strong enough')).toBeNull()
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'harbour7lamp' } })
    expect(parts()).toEqual([true, true, true])
    expect(screen.getByText('Strong enough')).toBeTruthy()
  })

  it('saving sends the one password to set-password, never to reset', async () => {
    ;(authApi.setPassword as any).mockResolvedValue({ user: { id: 'u1' }, accessToken: 'a' })
    renderAt('/set-password?token=tok&next=%2Fgrounds')
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Harbour7lamp' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save password' }))
    expect(await screen.findByText('Your check-ins')).toBeTruthy()
    expect(authApi.setPassword).toHaveBeenCalledWith('tok', 'Harbour7lamp')
    expect(authApi.resetPassword).not.toHaveBeenCalled()
  })

  it('a password that misses a rule is not sent', async () => {
    renderAt('/set-password?token=tok')
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'short' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save password' }))
    expect((await screen.findByRole('alert')).textContent).toBe('Your password does not meet every rule in the list yet.')
    expect(authApi.setPassword).not.toHaveBeenCalled()
  })
})

describe('"Email me a sign-in link instead" (no session yet - screen fault 5, final walk)', () => {
  it('without a session, goes to the sign-in link form, and no password is sent', async () => {
    renderAt('/set-password?token=tok&next=%2Fgrounds')
    fireEvent.click(screen.getByRole('button', { name: 'Email me a sign-in link instead' }))
    expect(authApi.setPassword).not.toHaveBeenCalled()
  })
})
