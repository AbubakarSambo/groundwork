import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppShell } from '@/components/gw/AppShell'
import { MorePage } from './MorePage'
import { SignOutPage } from '@/pages/auth/SignOutPage'
import { useAuthStore } from '@/stores/auth'
import { authApi } from '@/api/auth'

/**
 * A1, THE PHONE: THE BOTTOM BAR AND "MORE" (layout-phone.txt, more-menu-phone.txt), as each reader
 * sees them. Every door the old phone bar gave a reader must still be one tap from "More".
 */
const BASE = { id: 'u1', email: 'x@coamana.test', firstName: 'Sahar', lastName: 'Ali', organizationName: 'Coamana' }
const ADMIN = { ...BASE, role: 'ADMIN' }
const LEAD = { ...BASE, firstName: 'Hafsah', lastName: 'Jumare', role: 'MEMBER', mayOpenCheckIns: false }
const PARTICIPANT = { ...BASE, firstName: 'Adam', lastName: 'Grunewald', role: 'MEMBER' }
const STAFF = { ...ADMIN, isPlatformAdmin: true }

function mount(user: any, orgs: any[] = [{ id: 'o1', name: 'Coamana', slug: 'coamana', role: user.role, active: true }]) {
  useAuthStore.setState({ user, token: 't', isAuthenticated: true } as any)
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } })
  qc.setQueryData(['grounds'], [])
  qc.setQueryData(['my-organizations'], orgs)
  /* B-202 (review round 3): AppShell now waits for the same ['my-waiting'] read RequireOrgSetup
     already makes before it mounts the sidebar at all (see AppShell.tsx) - without this cached
     answer the real authApi.myWaiting (not mocked in this file) would be asked for real, and the
     bar this suite is reading would never mount while that stayed unsettled. Same pattern this
     file already uses for 'grounds' and 'my-organizations'. */
  qc.setQueryData(['my-waiting'], { waiting: false })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/more']}><AppShell><MorePage /></AppShell></MemoryRouter>
    </QueryClientProvider>,
  )
}

const main = () => document.querySelector('main') as HTMLElement
const bar = () => document.querySelector('.gw-sidebar-mobile') as HTMLElement
const hrefOf = (root: HTMLElement, name: string) =>
  [...root.querySelectorAll('a')].filter(a => a.textContent?.trim() === name).map(a => a.getAttribute('href'))

beforeEach(() => { vi.restoreAllMocks(); window.localStorage.clear() })

describe('the bottom bar', () => {
  /* U.5: Today exists now, so it comes first, as layout-phone.txt has it (Today, Check-ins, Start,
     Chat, More). These tests used to check that Today was left out while its page did not exist. */
  /* U.14: Chat exists now (Ask Groundwork's page, #/chat), so it sits before More, as
     layout-phone.txt has it. These tests used to check that Chat was left out while its page did
     not exist. */
  it('has Today, Check-ins, Start, Chat and More for somebody who may start a check-in', () => {
    mount(PARTICIPANT)
    expect([...bar().querySelectorAll('a')].map(a => [a.textContent, a.getAttribute('href')])).toEqual([
      ['Today', '/today'], ['Check-ins', '/grounds'], ['Start', '/start?new=1'], ['Chat', '/chat'], ['More', '/more'],
    ])
  })

  it('and no Start for somebody the server would refuse: Company is in its place', () => {
    /* U.15: ask-on-a-phone.txt shows Company where Start would be, now that the page exists. */
    mount(LEAD)
    expect([...bar().querySelectorAll('a')].map(a => a.textContent)).toEqual(['Today', 'Check-ins', 'Company', 'Chat', 'More'])
    expect(hrefOf(bar(), 'Company')).toEqual(['/company'])
  })

  it('offers Chat to everybody, an admin included, because everybody may ask', () => {
    mount(ADMIN)
    expect(hrefOf(bar(), 'Chat')).toEqual(['/chat'])
  })

  it('and "More" does not offer Today a second time, since the bar has it', () => {
    mount(ADMIN)
    expect(within(main()).queryByRole('link', { name: 'Today' })).toBeNull()
  })

  /*
   * WALKTHROUGH PASS 2, ITEM 8: NOR DOES IT OFFER COMPANY A SECOND TIME, FOR SOMEBODY WHOSE BAR
   * HAS IT IN PLACE OF START. Reusing the exact condition the bar itself uses, so the two can never
   * drift apart.
   */
  it('and "More" does not offer Company a second time, for somebody whose bar has it instead of Start', () => {
    mount(LEAD)
    expect(within(main()).queryByRole('link', { name: 'Company' })).toBeNull()
  })

  it('but still offers Company, once, to somebody whose bar has Start', () => {
    mount(PARTICIPANT)
    expect(hrefOf(main(), 'Company')).toEqual(['/company'])
  })
})

describe('"More", as an admin reads it', () => {
  it('has every door the old phone bar gave an admin, one tap away', () => {
    mount(ADMIN)
    expect(screen.getByRole('heading', { level: 1, name: 'More' })).toBeInTheDocument()
    expect(hrefOf(bar(), 'Check-ins')).toEqual(['/grounds'])
    expect(hrefOf(main(), 'Boards')).toEqual(['/boards'])
    expect(hrefOf(main(), 'People')).toEqual(['/org/members'])
    expect(hrefOf(main(), 'Connections')).toEqual(['/settings/connections'])
    expect(hrefOf(main(), 'Plan and billing')).toEqual(['/billing'])
    expect(hrefOf(main(), 'Your settings')).toEqual(['/settings'])
  })

  it('puts the organisation\'s pages under its name, and help, feedback and signing out on the page', () => {
    mount(ADMIN)
    expect(within(main()).getByRole('heading', { name: 'Coamana' })).toBeInTheDocument()
    for (const name of ['Help', 'Send feedback', 'Sign out']) expect(within(main()).getByRole('button', { name })).toBeInTheDocument()
    expect(within(main()).queryByRole('link', { name: 'Platform ops' })).toBeNull()
  })

  it('and Platform ops only for Groundwork staff', () => {
    mount(STAFF)
    expect(hrefOf(main(), 'Platform ops')).toEqual(['/admin'])
  })
})

describe('"More", as a lead and a participant read it', () => {
  it.each([['lead', LEAD], ['participant', PARTICIPANT]])('a %s gets their settings, help, feedback and sign out, and no admin pages', (_, user) => {
    mount(user)
    expect(hrefOf(main(), 'Your settings')).toEqual(['/settings'])
    for (const name of ['People', 'Connections', 'Plan and billing']) expect(hrefOf(main(), name)).toEqual([])
    expect(within(main()).getByRole('button', { name: 'Sign out' })).toBeInTheDocument()
  })

  /*
   * HAFSAH, 10 OCTOBER (B-146): A MEMBER NOW HAS "BOARDS" HERE TOO. The second deep page audit
   * found /boards already worked for a member - the server already scopes it to what they take
   * part in - but neither her side menu nor her More menu had a door to it. This used to be in the
   * list above, pinning that gap; it is its own assertion now, with the reason.
   */
  it.each([['lead', LEAD], ['participant', PARTICIPANT]])('a %s has "Boards", reaching the check-ins they take part in', (_, user) => {
    mount(user)
    expect(hrefOf(main(), 'Boards')).toEqual(['/boards'])
  })
})

describe('switching organisation and signing out on a phone', () => {
  /* U.3: the browser confirm box is replaced by the prototype's "Choose an organisation" page. One tap
     on another organisation opens that page; nothing switches from the menu itself. */
  it('lists your organisations with the one you are in ticked, and one tap opens "Choose an organisation"', async () => {
    const sw = vi.spyOn(authApi, 'switchOrganization')
    useAuthStore.setState({ user: PARTICIPANT, token: 't', isAuthenticated: true } as any)
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } })
    qc.setQueryData(['grounds'], [])
    qc.setQueryData(['my-organizations'], [
      { id: 'o1', name: 'Coamana', slug: 'c', role: 'MEMBER', active: true },
      { id: 'o2', name: 'Kilimo Traders', slug: 'k', role: 'ADMIN', active: false },
    ])
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={['/more']}>
          <Routes>
            <Route path="/more" element={<AppShell><MorePage /></AppShell>} />
            <Route path="/orgs" element={<p>The chooser</p>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )
    expect(within(main()).getByRole('heading', { name: 'Organisations' })).toBeInTheDocument()
    expect(within(main()).getByLabelText('You are in this organisation')).toBeInTheDocument()
    /* U.3: it goes to "Where do you work?" now that it exists. */
    expect(within(main()).getByRole('link', { name: 'Join or create an organisation' })).toHaveAttribute('href', '/welcome')
    fireEvent.click(within(main()).getByRole('button', { name: /Kilimo Traders/ }))
    expect(await screen.findByText('The chooser')).toBeInTheDocument()
    expect(sw).not.toHaveBeenCalled()
  })

  it('signing out signs out, and says so', async () => {
    /* U.2: Sign out goes to "You're signed out" (/signout), which ends the session as it opens. The
       old version of this test pressed the button and read the store straight away, because the
       button used to call logout() itself; it now checks the page a person reads, and the store. */
    useAuthStore.setState({ user: PARTICIPANT, token: 't', isAuthenticated: true } as any)
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } })
    qc.setQueryData(['grounds'], [])
    qc.setQueryData(['my-organizations'], [{ id: 'o1', name: 'Coamana', slug: 'coamana', role: 'MEMBER', active: true }])
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={['/more']}>
          <AppShell>
            <Routes>
              <Route path="/more" element={<MorePage />} />
              <Route path="/signout" element={<SignOutPage />} />
            </Routes>
          </AppShell>
        </MemoryRouter>
      </QueryClientProvider>,
    )
    fireEvent.click(within(main()).getByRole('button', { name: 'Sign out' }))
    expect(await screen.findByRole('heading', { name: 'You’re signed out' })).toBeTruthy()
    expect(useAuthStore.getState().isAuthenticated).toBe(false)
  })

  /*
   * U.3, then group 1 re-review fault D: this used to be a second control here, "Start my own
   * workspace", renamed to "Create an organisation", then removed outright - the prototype's own
   * "More" draws only the "Join or create an organisation" link (more-menu-phone.txt), and
   * creating one stays reachable through the page that link opens (WelcomePage.tsx's own "Create a
   * new organisation", tested in pages/org/WelcomePage.spec.tsx, which leads to #/org-new).
   */
  it('"Join or create an organisation" opens Welcome, with no second button here', async () => {
    useAuthStore.setState({ user: PARTICIPANT, token: 't', isAuthenticated: true } as any)
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } })
    qc.setQueryData(['grounds'], [])
    qc.setQueryData(['my-organizations'], [{ id: 'o1', name: 'Coamana', slug: 'coamana', role: 'MEMBER', active: true }])
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={['/more']}>
          <Routes>
            <Route path="/more" element={<AppShell><MorePage /></AppShell>} />
            <Route path="/welcome" element={<p>The welcome page</p>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )
    expect(within(main()).queryByRole('button', { name: 'Create an organisation' })).toBeNull()
    fireEvent.click(within(main()).getByRole('link', { name: 'Join or create an organisation' }))
    expect(await screen.findByText('The welcome page')).toBeInTheDocument()
  })
})

describe('the floating Feedback button', () => {
  it('is not drawn on "More", which has "Send feedback" in its own list', () => {
    mount(PARTICIPANT)
    expect(screen.queryByRole('button', { name: /^Feedback\. Drag to move/ })).toBeNull()
    expect(within(main()).getByRole('button', { name: 'Send feedback' })).toBeInTheDocument()
  })

  it('and "Send feedback" there still opens the feedback panel', async () => {
    mount(PARTICIPANT)
    fireEvent.click(within(main()).getByRole('button', { name: 'Send feedback' }))
    const { useFeedbackStore } = await import('@/stores/feedback')
    expect(useFeedbackStore.getState().open).toBe(true)
    useFeedbackStore.getState().hide()
  })

  it('but it is still on every other page', () => {
    useAuthStore.setState({ user: PARTICIPANT, token: 't', isAuthenticated: true } as any)
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } })
    qc.setQueryData(['grounds'], [])
    qc.setQueryData(['my-organizations'], [])
    /* B-202 (review round 3): see the comment on `mount` above - AppShell waits for this same
       cached answer before it mounts the sidebar (and the feedback trigger inside it) at all. */
    qc.setQueryData(['my-waiting'], { waiting: false })
    render(<QueryClientProvider client={qc}><MemoryRouter initialEntries={['/grounds']}><AppShell><div /></AppShell></MemoryRouter></QueryClientProvider>)
    expect(screen.getByRole('button', { name: /^Feedback\. Drag to move/ })).toBeInTheDocument()
  })
})

describe('"More" offers You (C2, U.12), since the phone\'s bar has no room for it', () => {
  it('links to the You board', () => {
    mount(ADMIN)
    expect(hrefOf(main(), 'You')).toEqual(['/you'])
  })
})

describe('"More" names each role in the People page\'s words (U.3 review)', () => {
  it('somebody who takes part reads "Takes part", never "Member"', () => {
    mount(PARTICIPANT, [
      { id: 'o1', name: 'Coamana', slug: 'coamana', role: 'MEMBER', active: true },
      { id: 'o2', name: 'Baridi', slug: 'baridi', role: 'LEAD', active: false },
    ])
    expect(main()).toHaveTextContent('CoamanaTakes part')
    expect(main()).toHaveTextContent('BaridiCan open check-ins')
    expect(main()).not.toHaveTextContent(/\bMember\b/)
  })
})
