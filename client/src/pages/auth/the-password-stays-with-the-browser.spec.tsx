import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthPage } from './AuthPage'
import { MagicVerifyPage } from './MagicVerifyPage'
import { authApi } from '@/api/auth'

/**
 * A PASSWORD CHOSEN AT SIGN-UP STAYS WITH THE BROWSER THAT CHOSE IT (U.3 review, a security fix).
 *
 * The browser keeps the key the server gives it with the password, and hands it back when the
 * confirmation is opened. Nothing on screen mentions it. The server's side is in
 * api/src/modules/auth/the-password-stays-with-the-browser.spec.ts.
 */
vi.mock('@/api/auth', () => ({
  authApi: {
    entrySave: vi.fn(), login: vi.fn(), forgotPassword: vi.fn(), methods: vi.fn().mockResolvedValue({ magicLink: true, google: false }),
    nameFromAddress: vi.fn().mockResolvedValue({ name: null }), verifyEmail: vi.fn(),
  },
}))
vi.mock('@/api/entry', () => ({ entryApi: { commit: vi.fn().mockRejectedValue({ response: { data: { message: 'NO_ENTRY_SESSION' } } }) } }))
vi.mock('@/api/grounds', () => ({ groundsApi: { list: vi.fn().mockResolvedValue([]) } }))
vi.mock('@/stores/auth', () => ({ useAuthStore: (sel: any) => sel({ setAuth: vi.fn() }) }))
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<any>('react-router-dom')
  return { ...actual, useNavigate: () => vi.fn() }
})

function at(path: string, element: React.ReactNode, route: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(<QueryClientProvider client={qc}><MemoryRouter initialEntries={[path]}><Routes><Route path={route} element={element} /></Routes></MemoryRouter></QueryClientProvider>)
}

let n = 0
beforeEach(() => { vi.clearAllMocks(); localStorage.clear() })

describe('the browser that signs up with a password', () => {
  it('keeps the key it was given, and says nothing about it', async () => {
    ;(authApi.entrySave as any).mockResolvedValue({ message: 'ok', email: 'x', passwordKey: 'k'.repeat(64) })
    at('/auth?mode=signup', <AuthPage />, '/auth')
    fireEvent.change(await screen.findByLabelText('Your name'), { target: { value: 'Ama' } })
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ama@gmail.com' } })
    /* Group 3, piece 1: the sign-up choice is the shared `Choices` part now (role="radiogroup",
       each option its own role="radio" button named by its own text), not a native radio with a
       wrapping <label> - so it is found by role and name, not by label. */
    fireEvent.click(screen.getByRole('radio', { name: 'With a password' }))
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'harbour7lamp' } })
    fireEvent.change(screen.getByLabelText('Type it again'), { target: { value: 'harbour7lamp' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }))
    await screen.findByRole('heading', { name: 'Check your email' })
    expect(localStorage.getItem('gw_password_key')).toBe('k'.repeat(64))
    expect(document.body.textContent).not.toMatch(/key/i)
  })
})

describe('opening the confirmation', () => {
  const user = { id: 'u1', email: 'ama@gmail.com', role: 'ADMIN' }

  it('in that browser, sends the key, then forgets it once the account is made', async () => {
    localStorage.setItem('gw_password_key', 'k'.repeat(64))
    ;(authApi.verifyEmail as any).mockResolvedValue({ user, accessToken: 't', justCreated: true })
    n += 1
    at(`/verify-email?token=same-${n}`, <MagicVerifyPage />, '/verify-email')
    /* Changed in batch 2, group 6 (S14): no "Your email is confirmed" page; the link goes straight on. */
    await waitFor(() => expect(authApi.verifyEmail).toHaveBeenCalled())
    expect(authApi.verifyEmail).toHaveBeenCalledWith(`same-${n}`, undefined, 'k'.repeat(64))
    await waitFor(() => expect(localStorage.getItem('gw_password_key')).toBeNull())
  })

  it('in another browser, sends no key, exactly as a sign-up by link', async () => {
    ;(authApi.verifyEmail as any).mockResolvedValue({ user, accessToken: 't', justCreated: true })
    n += 1
    at(`/verify-email?token=other-${n}`, <MagicVerifyPage />, '/verify-email')
    await waitFor(() => expect(authApi.verifyEmail).toHaveBeenCalled())
    expect(authApi.verifyEmail).toHaveBeenCalledWith(`other-${n}`)
    expect(document.body.textContent).not.toMatch(/password/i)
  })
})
