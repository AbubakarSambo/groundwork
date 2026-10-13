import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth'

/**
 * B-221: ARRIVING AT `/settings#your-data` SCROLLS "YOUR DATA" INTO VIEW AND FOCUSES ITS HEADING.
 *
 * The "yours to keep" email links `/settings#your-data` (request 224). A plain anchor gets you
 * there on a fresh load without any help from this page - the browser's own default jump is enough
 * for a document the way the prototype draws it. What it does not do on its own, in a single-page
 * app that already has `/settings` open in memory or has just finished a redirect through sign-in,
 * is move keyboard focus - so this page does both itself, once its own data has a user to show.
 */
vi.mock('@/lib/whatsapp-is-on', () => ({ useWhatsAppIsOn: () => false }))
vi.mock('@/api/auth', () => ({
  authApi: {
    updateProfile: vi.fn(),
    renameOrganization: vi.fn(),
    setPhoneNumber: vi.fn(),
    setEmailNotifications: vi.fn(),
    leaveOrg: vi.fn(),
    requestPasswordSetup: vi.fn(),
    setPassword: vi.fn(),
    methods: vi.fn(async () => ({ magicLink: true, google: false })),
  },
}))
vi.mock('@/api/my-data', () => ({ myDataApi: { get: vi.fn(), erase: vi.fn() } }))
import { SettingsPage } from './SettingsPage'

function open(user: any) {
  useAuthStore.setState({ user, token: 't', isAuthenticated: true } as any)
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={qc}><MemoryRouter><SettingsPage /></MemoryRouter></QueryClientProvider>)
}

const theUser = { id: 'u1', role: 'MEMBER', organizationName: 'Baridi Appliances', firstName: 'Grace', lastName: 'Achieng', email: 'grace@baridi.co.ke' }

let scrollIntoView: ReturnType<typeof vi.fn>

beforeEach(() => {
  scrollIntoView = vi.fn()
  // jsdom draws no layout, so `scrollIntoView` does not exist on a real element - stubbed the same
  // way the rest of this suite stubs geometry jsdom does not compute (B-202/B-203 review follow-ups).
  Element.prototype.scrollIntoView = scrollIntoView as unknown as typeof Element.prototype.scrollIntoView
  window.history.pushState({}, '', '/settings')
})

afterEach(() => {
  window.history.pushState({}, '', '/')
})

describe('the "Your data" section', () => {
  it('carries the id `your-data`, so a link can reach it directly', () => {
    open(theUser)
    expect(document.getElementById('your-data')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Your data' }).closest('section')?.id).toBe('your-data')
  })

  it('arriving at #your-data scrolls the section into view and focuses its heading', async () => {
    window.history.pushState({}, '', '/settings#your-data')
    open(theUser)
    await waitFor(() => expect(scrollIntoView).toHaveBeenCalled())
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Your data' })).toHaveFocus())
    // Never a stop on the page's own tab order otherwise - only a caller that means to focus it.
    expect(screen.getByRole('heading', { name: 'Your data' })).toHaveAttribute('tabindex', '-1')
  })

  it('an ordinary visit to Settings, with no hash, never steals focus for "Your data"', async () => {
    open(theUser)
    // Give any stray effect a turn, then confirm nothing moved.
    await new Promise(r => setTimeout(r, 0))
    expect(scrollIntoView).not.toHaveBeenCalled()
    expect(screen.getByRole('heading', { name: 'Your data' })).not.toHaveFocus()
  })
})
