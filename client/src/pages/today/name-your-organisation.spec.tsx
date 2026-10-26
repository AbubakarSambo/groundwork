import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { NameYourOrganisation, isAMadeUpWorkspaceName, isOnlyTheEmailDomain } from './NameYourOrganisation'
import { useAuthStore } from '@/stores/auth'

/**
 * PEOPLE SIGNING UP WERE LEFT AS "HAFSAH'S WORKSPACE" (Hafsah, 26 October 2026). An admin whose organisation still has the name
 * Groundwork made up is asked for the real one on Today; anybody else, or an organisation with a real name, sees nothing.
 */
vi.mock('@/api/auth', () => ({ authApi: { renameOrganization: vi.fn() } }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
import { authApi } from '@/api/auth'

function as(role: 'ADMIN' | 'MEMBER', organizationName: string, email = 'hafsah@gmail.com') {
  useAuthStore.setState({ user: { id: 'u1', role, organizationId: 'o1', firstName: 'Hafsah', organizationName, email }, token: 't', isAuthenticated: true } as any)
}
const show = () => render(<QueryClientProvider client={new QueryClient()}><NameYourOrganisation /></QueryClientProvider>)

beforeEach(() => { vi.clearAllMocks(); sessionStorage.clear() })

describe('the made-up name', () => {
  it('is "<name>\'s workspace" or "My workspace", never a real name', () => {
    expect(isAMadeUpWorkspaceName("Hafsah's workspace")).toBe(true)
    expect(isAMadeUpWorkspaceName('Hafsah’s workspace')).toBe(true)
    expect(isAMadeUpWorkspaceName('My workspace')).toBe(true)
    expect(isAMadeUpWorkspaceName('Coamana')).toBe(false)
  })
})

describe('on Today', () => {
  it('Hafsah, an admin of "Hafsah\'s workspace", names it Coamana', async () => {
    as('ADMIN', "Hafsah's workspace")
    vi.mocked(authApi.renameOrganization).mockResolvedValue({ id: 'o1', name: 'Coamana' })
    show()
    expect(screen.getByText('What is your organisation called?')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Your organisation’s name'), { target: { value: 'Coamana' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save the name' }))
    await waitFor(() => expect(authApi.renameOrganization).toHaveBeenCalledWith('Coamana'))
    await waitFor(() => expect(useAuthStore.getState().user?.organizationName).toBe('Coamana'))
    expect(screen.queryByText('What is your organisation called?')).toBeNull()
  })
  it('a member is not asked', () => {
    as('MEMBER', "Hafsah's workspace"); show()
    expect(screen.queryByText('What is your organisation called?')).toBeNull()
  })
  it('an organisation with a real name is not asked', () => {
    as('ADMIN', 'Drop Access'); show()
    expect(screen.queryByText('What is your organisation called?')).toBeNull()
  })
  it('"Not now" hides it for now', () => {
    as('ADMIN', 'My workspace'); show()
    fireEvent.click(screen.getByRole('button', { name: 'Not now' }))
    expect(screen.queryByText('What is your organisation called?')).toBeNull()
  })
})

describe('a name that is only the email domain', () => {
  it('"Kisumulamps" for achieng@kisumulamps.test is a guess, and Achieng is asked', () => {
    expect(isOnlyTheEmailDomain('Kisumulamps', 'achieng@kisumulamps.test')).toBe(true)
    expect(isOnlyTheEmailDomain('Kisumu Lamps Ltd', 'achieng@kisumulamps.test')).toBe(false)
    as('ADMIN', 'Kisumulamps', 'achieng@kisumulamps.test'); show()
    expect(screen.getByText('What is your organisation called?')).toBeInTheDocument()
  })
})
