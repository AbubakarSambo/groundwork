import { describe, it, expect, afterEach } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppShell } from './AppShell'
import { useAuthStore } from '@/stores/auth'
import { useCheckInFocusStore } from '@/stores/check-in-focus'

/**
 * SCREEN FAULT 2: THE DONE PAGE AND THE REPORT PAGE HAD NO BOTTOM BAR, AND NO WAY BACK TO TODAY.
 *
 * `/checkin/:id` hides the app's bottom bar for a live session - right, per review round 3, item
 * 7, because a live session is a full screen with its own way out (Pause). But the same bare
 * `/checkin/:id` route also shows this page's own settled Done state once the session has
 * completed or been declined, with no Pause left and nothing else back to Today; and
 * `/checkin/:id/report` was never the conversation at all, and used to be swept into the same
 * "no bottom bar" rule by a regex that matched anything starting with `/checkin/`.
 */
const USER = { id: 'u1', email: 'aisha@x.test', firstName: 'Aisha', role: 'MEMBER', organizationName: 'Mawe' }

function mount(path: string) {
  useAuthStore.setState({ user: USER, token: 't', isAuthenticated: true } as any)
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } })
  /* B-202 (review round 3): AppShell now waits for the same ['my-waiting'] read RequireOrgSetup
  already makes before it mounts the sidebar at all - without this cached answer the real
  authApi.myWaiting (not mocked in this file) would be asked for real. */
  qc.setQueryData(['my-waiting'], { waiting: false })
  qc.setQueryData(['grounds'], [])
  qc.setQueryData(['my-organizations'], [])
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}><AppShell><div>page content</div></AppShell></MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('the bottom bar once a check-in session is no longer the whole screen', () => {
  afterEach(() => { useCheckInFocusStore.setState({ focused: true }) })

  it('shows the bar on /checkin/:id/report - it was never the conversation', () => {
    const { container } = mount('/checkin/ci1/report')
    expect(container.querySelector('nav[aria-label="Main"]')).toBeTruthy()
  })

  it('shows the bar on /checkin/:id once the session has settled (ChatPage reports not-focused)', () => {
    useCheckInFocusStore.setState({ focused: false })
    const { container } = mount('/checkin/ci1')
    expect(container.querySelector('nav[aria-label="Main"]')).toBeTruthy()
  })

  it('still hides the bar on /checkin/:id while the session is live (the default, before ChatPage says otherwise)', () => {
    const { container } = mount('/checkin/ci1')
    expect(container.querySelector('nav[aria-label="Main"]')).toBeNull()
  })

  it('gives the main content its room back on the report page too, not only the live conversation', () => {
    const { container } = mount('/checkin/ci1/report')
    expect(container.querySelector('main')?.className).not.toContain('gw-focus')
  })
})
