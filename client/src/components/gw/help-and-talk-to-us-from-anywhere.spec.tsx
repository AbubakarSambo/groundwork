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

  it('the floating "?" stands down wherever the sidebar\'s menu carries Help, and stays where it does not', () => {
    const CSS = readFileSync(join(__dirname, '../../index.css'), 'utf8')
    expect(CSS).toMatch(/body:has\(\.gw-sidebar-desktop\) \.gw-help-btn \{ display: none !important; \}/)
    // The button itself is still rendered for every signed-in page, so pages with no sidebar keep it.
    expect(readFileSync(join(__dirname, '../../App.tsx'), 'utf8')).toContain('<HelpButton />')
  })
})
