import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthPage } from './AuthPage'
import { authApi } from '@/api/auth'

/**
 * B-037: CHOOSING "WITH A PASSWORD" AT SIGN-UP STILL READ "CHECK YOUR EMAIL... WE SENT A SIGN-IN
 * LINK", EXACTLY LIKE THE LINK PATH, WITH NO MENTION ANYWHERE OF THE PASSWORD JUST TYPED.
 *
 * Checked against the API first: the password is genuinely saved and used (entrySave sends it,
 * client/src/api/auth.ts, and the server keeps it for an address with no account yet - a live
 * probe signing up with a password, verifying the email, and signing back in with that exact
 * password lands signed in). Confirming the email first is still correct even with a password
 * chosen, since nothing can let somebody claim an address they have not proved they own - so
 * "Check your email" is right either way. What was missing was saying the password had been
 * kept, so choosing one did not look silently ignored.
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

beforeEach(() => { vi.clearAllMocks(); localStorage.clear() })

describe('choosing "With a password" at sign-up', () => {
  it('says the password was kept, not the plain link sentence', async () => {
    ;(authApi.entrySave as any).mockResolvedValue({ message: 'ok', email: 'ama@gmail.com', passwordKey: 'k'.repeat(64) })
    at('/auth?mode=signup', <AuthPage />, '/auth')
    fireEvent.change(await screen.findByLabelText('Your name'), { target: { value: 'Ama' } })
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ama@gmail.com' } })
    fireEvent.click(screen.getByRole('radio', { name: 'With a password' }))
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'harbour7lamp' } })
    fireEvent.change(screen.getByLabelText('Type it again'), { target: { value: 'harbour7lamp' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }))
    await screen.findByRole('heading', { name: 'Check your email' })
    expect(screen.getByText(/Your password is saved/)).toBeTruthy()
    expect(screen.queryByText('We sent a sign-in link to ama@gmail.com. Open it on any device.')).toBeNull()
  })

  it('reads the plain link sentence when "With a link" is chosen instead', async () => {
    ;(authApi.entrySave as any).mockResolvedValue({ message: 'ok', email: 'ama@gmail.com' })
    at('/auth?mode=signup', <AuthPage />, '/auth')
    fireEvent.change(await screen.findByLabelText('Your name'), { target: { value: 'Ama' } })
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ama@gmail.com' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }))
    await screen.findByRole('heading', { name: 'Check your email' })
    expect(screen.queryByText(/Your password is saved/)).toBeNull()
    expect(screen.getByText(/We sent a sign-in link to/)).toBeTruthy()
  })
})
