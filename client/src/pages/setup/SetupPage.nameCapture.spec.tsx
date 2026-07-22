import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SetupPage } from './SetupPage'
import { authApi } from '@/api/auth'

/**
 * Name-capture guard: /setup used to capture org name + role only, so every
 * magic-link account kept the email-derived firstName ("Hjumare", "Admin")
 * that shows on every participant-facing surface. Step 1 now requires the
 * person's name and sends it as firstName/lastName. Revert (drop the field /
 * the validation) -> Continue advances with no name, updateProfile called
 * without a real firstName -> this bites.
 */

vi.mock('@/api/auth', () => ({ authApi: { updateProfile: vi.fn().mockResolvedValue({ firstName: 'Sarah' }) } }))
vi.mock('@/stores/auth', () => ({
  useAuthStore: (sel: any) => sel({ user: { firstName: '', lastName: '', organizationName: '', jobTitle: '' }, updateUser: vi.fn() }),
}))

function renderSetup() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/setup']}><SetupPage /></MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('NAME-CAPTURE: /setup requires a real name before continuing', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders a "Your name" field on step 1', () => {
    renderSetup()
    expect(screen.getByText('Your name')).toBeTruthy()
  })

  it('blocks Continue with an empty name and does not call updateProfile', async () => {
    renderSetup()
    // fill org fields but leave name empty
    fireEvent.change(screen.getByPlaceholderText('e.g. Acme Corp'), { target: { value: 'Acme' } })
    fireEvent.click(screen.getByRole('button', { name: /Continue/i }))
    await waitFor(() => expect(screen.getByText(/Enter your name/i)).toBeTruthy())
    expect(authApi.updateProfile).not.toHaveBeenCalled()
  })

  it('with a name, sends firstName/lastName to updateProfile', async () => {
    renderSetup()
    fireEvent.change(screen.getByPlaceholderText('e.g. Sarah Okonkwo'), { target: { value: 'Sarah Okonkwo' } })
    fireEvent.change(screen.getByPlaceholderText('e.g. Acme Corp'), { target: { value: 'Acme' } })
    fireEvent.click(screen.getByRole('button', { name: /Continue/i }))
    await waitFor(() => expect(authApi.updateProfile).toHaveBeenCalled())
    const arg = (authApi.updateProfile as any).mock.calls[0][0]
    expect(arg.firstName).toBe('Sarah')
    expect(arg.lastName).toBe('Okonkwo')
  })
})
