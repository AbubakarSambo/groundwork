import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth'

/**
 * SETTINGS, "WHAT WE SEND YOU" (decision 109, task 2): the switch's title and detail, and what it
 * reads when the person already stopped this mail from a link in one of our emails
 * (`emailsStoppedFromAMail` from GET /auth/me).
 */
vi.mock('@/lib/whatsapp-is-on', () => ({ useWhatsAppIsOn: () => false }))
const setEmailNotifications = vi.fn(async (v: boolean) => ({ emailNotifications: v, emailsStoppedFromAMail: false }))
vi.mock('@/api/auth', () => ({
  authApi: {
    updateProfile: vi.fn(async (b: any) => ({ firstName: b.firstName, lastName: b.lastName })),
    renameOrganization: vi.fn(async (name: string) => ({ name })),
    setPhoneNumber: vi.fn(async (v: string | null) => ({ phoneNumber: v })),
    setEmailNotifications: (v: boolean) => setEmailNotifications(v),
    leaveOrg: vi.fn(async () => ({})),
    requestPasswordSetup: vi.fn(async () => ({ token: 't' })),
    setPassword: vi.fn(async () => ({ user: {}, accessToken: 'a' })),
  },
}))
vi.mock('@/api/my-data', () => ({
  myDataApi: {
    get: vi.fn(async () => ({ userId: 'u1', email: 'grace@baridi.co.ke', firstName: 'Grace', lastName: 'Achieng', recordEntries: [], checkIns: [], grounds: [] })),
    erase: vi.fn(async () => ({})),
  },
}))
import { SettingsPage } from './SettingsPage'

function open(user: any) {
  useAuthStore.setState({ user, token: 't', isAuthenticated: true } as any)
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={qc}><MemoryRouter><SettingsPage /></MemoryRouter></QueryClientProvider>)
}

const baseUser = { id: 'u1', role: 'MEMBER', organizationName: 'Baridi Appliances', firstName: 'Grace', lastName: 'Achieng', email: 'grace@baridi.co.ke' }

beforeEach(() => { vi.clearAllMocks() })

describe('What we send you', () => {
  it('reads the title and detail the engine serves, switched on by default', () => {
    open({ ...baseUser, emailNotifications: true, emailsStoppedFromAMail: false })
    expect(screen.getByText('Emails from Groundwork that we decide to send')).toBeTruthy()
    expect(screen.getByText('Reminders, summaries and insights that nobody asked for that morning. Emails you ask for, such as sign-in links, invitations, reports and approvals, always reach you.')).toBeTruthy()
    const toggle = screen.getByRole('switch')
    expect(toggle.getAttribute('aria-checked')).toBe('true')
  })

  it('when stopped from a mail link, the switch shows off and says so', () => {
    open({ ...baseUser, emailNotifications: true, emailsStoppedFromAMail: true })
    const toggle = screen.getByRole('switch')
    expect(toggle.getAttribute('aria-checked')).toBe('false')
    expect(screen.getByText('You turned these off from a link in one of our emails. Turn them back on here whenever you like.')).toBeTruthy()
    expect(screen.queryByText(/Reminders, summaries and insights/)).toBeNull()
  })

  it('turning it on PATCHes emailNotifications: true', async () => {
    open({ ...baseUser, emailNotifications: true, emailsStoppedFromAMail: true })
    await userEvent.click(screen.getByRole('switch'))
    expect(setEmailNotifications).toHaveBeenCalledWith(true)
  })
})
