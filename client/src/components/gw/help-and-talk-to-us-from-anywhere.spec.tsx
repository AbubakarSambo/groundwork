import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { readFileSync } from 'fs'
import { join } from 'path'
import { AppShell } from './AppShell'
import { HelpModal } from './HelpModal'
import { MorePage } from '@/pages/more/MorePage'
import { useAuthStore } from '@/stores/auth'
import { useHelpStore } from '@/stores/help'

/**
 * A1: HELP AND "TALK TO US" FROM ANYWHERE, as a person finds them: in the sidebar's own menu on a
 * computer, on "More" on a phone, and at the foot of the Help window on every tab.
 */
const USER = { id: 'u1', email: 'adam@coamana.test', firstName: 'Adam', lastName: 'Grunewald', role: 'MEMBER', organizationName: 'Coamana' }

function mount(path: string, page: React.ReactNode = <div />) {
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
      <MemoryRouter initialEntries={[path]}><HelpModal /><AppShell>{page}</AppShell></MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => useHelpStore.setState({ open: false, tab: 0 }))

describe('help and "Talk to us" from anywhere', () => {
  it('the sidebar\'s own menu has Help and Talk to us', () => {
    const { container } = mount('/grounds')
    const rail = container.querySelector('.gw-sidebar-desktop') as HTMLElement
    fireEvent.click(within(rail).getByRole('button', { name: /Settings, help, sign out/ }))
    expect(within(rail).getByRole('link', { name: 'Talk to us' })).toHaveAttribute('href', '/talk-to-us')
    fireEvent.click(within(rail).getByRole('button', { name: 'Help' }))
    expect(useHelpStore.getState().open).toBe(true)
  })

  it('"More" on a phone has them too', () => {
    mount('/more', <MorePage />)
    const main = document.querySelector('main') as HTMLElement
    expect(within(main).getByRole('link', { name: 'Talk to us' })).toHaveAttribute('href', '/talk-to-us')
    expect(within(main).getByRole('button', { name: 'Help' })).toBeInTheDocument()
  })

  it.each([0, 2, 4] as const)('the Help window offers Talk to us on tab %s, with when somebody replies', (tab) => {
    useHelpStore.setState({ open: true, tab })
    mount('/grounds')
    expect(screen.getByText('Tell us what you need and somebody will come back to you within two working days.')).toBeInTheDocument()
    const link = screen.getAllByRole('link', { name: 'Talk to us' }).find(a => a.closest('.gw-help-talk'))!
    expect(link).toHaveAttribute('href', '/talk-to-us')
  })

  it('the request page promises the same thing, so the two cannot drift apart', () => {
    const page = readFileSync(join(__dirname, '../../pages/talk/TalkToUsPage.tsx'), 'utf8')
    expect(page).toContain('Tell us what you need and somebody will come back to you within two working days.')
  })

  /* U.3: U.1 kept the floating "?" on pages with no sidebar. Hafsah decided on 26 September that it goes
     wherever the prototype does not have it, which is everywhere, with nothing in its place. */
  it('there is no floating "?" on any page', () => {
    const CSS = readFileSync(join(__dirname, '../../index.css'), 'utf8')
    expect(CSS).not.toMatch(/\.gw-help-btn/)
    expect(readFileSync(join(__dirname, '../../App.tsx'), 'utf8')).not.toContain('<HelpButton')
    expect(readFileSync(join(__dirname, 'HelpModal.tsx'), 'utf8')).not.toMatch(/export function HelpButton/)
  })
})
