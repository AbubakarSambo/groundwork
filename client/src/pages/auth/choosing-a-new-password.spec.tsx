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
  copy.querySelectorAll('[aria-hidden], .gw-sr-only').forEach(n => n.remove())
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
      'A capital letter and a small letter',
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
    expect(met()).toEqual(['✓Done: At least 8 characters', '✓Done: A capital letter and a small letter'])
    fireEvent.change(screen.getByLabelText('Type it again'), { target: { value: 'Harbour7lamp' } })
    expect(met()).toHaveLength(3)
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
    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'harbour7lamp' } })
    fireEvent.change(screen.getByLabelText('Type it again'), { target: { value: 'harbour7lamp' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save password' }))
    expect((await screen.findByRole('alert')).textContent).toBe('Your password does not meet every rule in the list yet.')
    expect(authApi.resetPassword).not.toHaveBeenCalled()
  })
})

describe('"Choose a password", the first password from a set-up link (A2, #/password)', () => {
  it('reads the prototype\'s words, without "Keep using email links instead"', () => {
    const { container } = renderAt('/set-password?token=tok')
    expect(readable(container)).toBe([
      'Groundwork',
      'Choose a password',
      'For signing in without an email link. You can keep using links too.',
      'Password', 'Show',
      'At least 8 characters',
      'A capital letter and a small letter',
      'Use one you don’t use anywhere else. A few unrelated words are easier to remember than symbols.',
      'Save password',
    ].join(''))
    expect(screen.queryByText(/Keep using email links instead/)).toBeNull()
    expect(screen.queryByLabelText('Type it again')).toBeNull()
    /* U.2 step 12: a set-up link is checked as the page opens too, so an old one shows the expired card. */
    expect(authApi.validateToken).toHaveBeenCalledWith('tok', 'PASSWORD_SETUP')
  })

  it('the bar fills one part per rule met, and says "Strong enough" only when every rule is', () => {
    const { container } = renderAt('/set-password?token=tok')
    const parts = () => [...container.querySelectorAll('.gw-auth-strength-bar span')].map(s => s.className === 'on')
    expect(parts()).toEqual([false, false])
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'harbourlamp' } })
    expect(parts()).toEqual([true, false])
    expect(screen.queryByText('Strong enough')).toBeNull()
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Harbourlamp' } })
    expect(parts()).toEqual([true, true])
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
