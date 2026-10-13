import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth'

/**
 * SETTINGS, "You can also sign in with Google or an email link" (own-settings.txt). This used to
 * say so unconditionally, on every deployment, even where GOOGLE_CLIENT_ID is unset and no Google
 * button exists anywhere else in the product (AuthPage, GoogleFailedPage both gate on
 * `authApi.methods().google`). Fixed to read the same gate, so the sentence never promises a way
 * in that is not actually there.
 */
const methods = vi.fn(async () => ({ magicLink: true, google: true }))
vi.mock('@/lib/whatsapp-is-on', () => ({ useWhatsAppIsOn: () => false }))
vi.mock('@/api/auth', () => ({
  authApi: {
    updateProfile: vi.fn(async (b: any) => ({ firstName: b.firstName, lastName: b.lastName })),
    renameOrganization: vi.fn(async (name: string) => ({ name })),
    setPhoneNumber: vi.fn(async (v: string | null) => ({ phoneNumber: v })),
    setEmailNotifications: vi.fn(async (v: boolean) => ({ emailNotifications: v })),
    leaveOrg: vi.fn(async () => ({})),
    requestPasswordSetup: vi.fn(async () => ({ token: 't' })),
    setPassword: vi.fn(async () => ({ user: {}, accessToken: 'a' })),
    methods: () => methods(),
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

describe('the Password section mentions Google only where it is actually offered', () => {
  it('says "You can also sign in with Google or an email link" when the deployment has Google on', async () => {
    methods.mockResolvedValueOnce({ magicLink: true, google: true })
    open(baseUser)
    expect(await screen.findByText('You can also sign in with Google or an email link')).toBeTruthy()
  })

  it('says only "You can also sign in with an email link" when Google is off', async () => {
    methods.mockResolvedValueOnce({ magicLink: true, google: false })
    open(baseUser)
    expect(await screen.findByText('You can also sign in with an email link')).toBeTruthy()
    await waitFor(() => expect(screen.queryByText(/sign in with Google/)).toBeNull())
  })
})
