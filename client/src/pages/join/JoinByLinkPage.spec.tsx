import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { JoinByLinkPage } from './JoinByLinkPage'
import { apiClient } from '@/api/client'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/stores/auth'

/** AN ORGANISATION'S INVITE LINK (A3, #/j/baridi), AS THE PERSON WHO OPENS IT READS IT. */
function open(preview: any, signedIn = false, google = false, myOrgs: any[] = []) {
  vi.spyOn(apiClient, 'get').mockImplementation((url: string) => {
    if (url === '/auth/my-organizations') return Promise.resolve({ data: myOrgs } as any)
    return Promise.resolve({ data: { success: true, data: preview } } as any)
  })
  vi.spyOn(authApi, 'methods').mockResolvedValue({ magicLink: true, google })
  useAuthStore.setState({ isAuthenticated: signedIn, user: signedIn ? { id: 'u1' } : null, token: signedIn ? 't' : null } as any)
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/j/baridi-7k2p']}>
        <Routes>
          <Route path="/j/:code" element={<JoinByLinkPage />} />
          <Route path="/auth" element={<p>The sign-up</p>} />
          <Route path="/join/waiting" element={<p>Almost in - the waiting page</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}
const OPEN = { open: true, organisationName: 'Baridi Appliances', inviterName: 'Wairimu Kamau' }
const assign = vi.fn()
beforeEach(() => {
  vi.restoreAllMocks()
  assign.mockClear()
  Object.defineProperty(window, 'location', { value: { ...window.location, assign, host: 'localhost:5173' }, writable: true })
})

describe('the link, for somebody without an account', () => {
  it('reads as the prototype\'s card, without a head count', async () => {
    open(OPEN)
    expect(await screen.findByRole('heading', { name: 'Wairimu Kamau invited you to Baridi Appliances' })).toBeTruthy()
    expect(await screen.findByText('People there use Groundwork for short check-ins on their work. Join with your email.')).toBeTruthy()
    expect(screen.getByText('localhost:5173/j/baridi-7k2p')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Join Baridi Appliances' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'I already use Groundwork' })).toBeTruthy()
    expect(document.body.textContent).toContain('Not from Baridi Appliances? Create your own organisation instead.')
    expect(document.body.textContent).not.toMatch(/\d+ people/)
  })

  it('mentions Google only while Google sign-in is on', async () => {
    open(OPEN, false, true)
    expect(await screen.findByText('People there use Groundwork for short check-ins on their work. Join with your email or Google.')).toBeTruthy()
  })

  it('"Join" goes to make an account first, and comes back', async () => {
    open(OPEN)
    fireEvent.click(await screen.findByRole('button', { name: 'Join Baridi Appliances' }))
    expect(await screen.findByText('The sign-up')).toBeTruthy()
  })
})

describe('the link, for somebody signed in', () => {
  it('"Join" joins, stores (user, token), and opens its check-ins', async () => {
    open(OPEN, true)
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: { success: true, data: { accessToken: 'tok', user: { id: 'u1' } } } } as any)
    const setAuth = vi.fn(); useAuthStore.setState({ setAuth } as any)
    fireEvent.click(await screen.findByRole('button', { name: 'Join Baridi Appliances' }))
    await waitFor(() => expect(post).toHaveBeenCalledWith('/join-links/baridi-7k2p/join'))
    await waitFor(() => expect(setAuth).toHaveBeenCalledWith({ id: 'u1' }, 'tok'))
    expect(assign).toHaveBeenCalledWith('/today')
    expect(screen.queryByRole('button', { name: 'I already use Groundwork' })).toBeNull()
  })

  /* Item 11, 29 September: an email domain that does not match the organisation's own does not
     join on the spot - the server raises a request instead, with no user or token to sign in
     with, and sends them to the same "Almost in" page a check-in invitation would. */
  it('"Join", from an outside domain, waits for an admin instead of signing in', async () => {
    open(OPEN, true)
    vi.spyOn(apiClient, 'post').mockResolvedValue({ data: { success: true, data: { queuedForApproval: true, organisationName: 'Baridi Appliances' } } } as any)
    const setAuth = vi.fn(); useAuthStore.setState({ setAuth } as any)
    fireEvent.click(await screen.findByRole('button', { name: 'Join Baridi Appliances' }))
    await screen.findByText('Almost in - the waiting page')
    expect(setAuth).not.toHaveBeenCalled()
    expect(assign).not.toHaveBeenCalled()
  })

  /*
   * B-206: GRACE, THE ADMIN OF MSINGI FOODS, PRESSING MSINGI'S OWN JOIN LINK. The old page showed
   * her "Grace Achieng invited you to Msingi Foods" with a "Join Msingi Foods" button, as if she
   * were not already in it; a member pressing it landed on /today with nothing said. Comparing the
   * link's organisation to the FULL list of organisations this person belongs to (the same list
   * `/orgs` itself reads, `useYourOrganisations`) - matched by name, since the preview the server
   * sends carries no id - tells her plainly instead.
   */
  it('tells a signed-in member of this organisation they are already in it, with a way to Today', async () => {
    open(OPEN, true, false, [{ id: 'org-1', name: 'Baridi Appliances', slug: 'baridi', role: 'ADMIN', active: true }])
    const post = vi.spyOn(apiClient, 'post')
    expect(await screen.findByRole('heading', { name: 'You’re already part of Baridi Appliances' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Join Baridi Appliances/ })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Go to Today' }))
    expect(post).not.toHaveBeenCalled()
  })

  /*
   * B-206 (review round 2): NEEMA, A MEMBER OF MSINGI FOODS, WITH LAKEVIEW CLINIC CURRENTLY OPEN.
   * The first fix only compared the invite's organisation to whichever one she currently had open
   * (`ownOrganisationName`), so with Lakeview chosen, /j/msingi-foods-jsf3 still read "Grace Achieng
   * invited you to Msingi Foods... Join Msingi Foods" - she is already in it, just not looking at it
   * right now. `useYourOrganisations` reads her FULL membership, so the match holds regardless of
   * which one is currently active; not being the active one, the offer is to open it (the same
   * switch `/orgs` makes), never to join it again.
   */
  it('tells a member of an organisation they are not currently looking at that they already belong to it, and offers to open it', async () => {
    open(OPEN, true, false, [
      { id: 'lakeview-1', name: 'Lakeview Clinic', slug: 'lakeview', role: 'MEMBER', active: true },
      { id: 'msingi-1', name: 'Baridi Appliances', slug: 'baridi', role: 'MEMBER', active: false },
    ])
    expect(await screen.findByRole('heading', { name: 'You’re already part of Baridi Appliances' })).toBeTruthy()
    expect(screen.getByText('It is not the organisation you currently have open.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Join Baridi Appliances/ })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Go to Today' })).toBeNull()

    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: { accessToken: 'tok2', user: { id: 'u1' } } } as any)
    const setAuth = vi.fn(); useAuthStore.setState({ setAuth } as any)
    fireEvent.click(await screen.findByRole('button', { name: 'Open Baridi Appliances' }))
    await waitFor(() => expect(post).toHaveBeenCalledWith('/auth/switch-organization', { organizationId: 'msingi-1' }))
    await waitFor(() => expect(setAuth).toHaveBeenCalledWith({ id: 'u1' }, 'tok2'))
    expect(assign).toHaveBeenCalledWith('/today')
  })
})

describe('a link that is off', () => {
  /* UPDATED FOR B-158: the heading is now "That link didn't work", the prototype's own words
     (F4-small-states/badlink.txt) - this page used to say "This invite link is not open any
     more", one of five different headings the deep page audit found for the same state. */
  it('says so and what to do', async () => {
    open({ open: false })
    expect(await screen.findByRole('heading', { name: 'That link didn’t work' })).toBeTruthy()
    expect(screen.getByText('Ask whoever sent it for the new one.')).toBeTruthy()
  })

  /* Walkthrough pass 2, item 4: this used to stop at the sentence, with nothing to press. */
  it('is not a dead end: the Groundwork mark is there, and so is a way on', async () => {
    open({ open: false })
    await screen.findByRole('heading', { name: 'That link didn’t work' })
    expect(screen.getByRole('link', { name: 'Groundwork' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Go to the Groundwork home page' })).toBeTruthy()
  })

  /*
   * B-206: A SIGNED-IN PERSON OPENING A LINK THAT HAS BEEN TURNED OFF IS NOT ASKED TO SIGN IN -
   * they already are. Today is where they already belong.
   */
  it('offers a signed-in person Today, not Sign in', async () => {
    open({ open: false }, true)
    await screen.findByRole('heading', { name: 'That link didn’t work' })
    expect(screen.getByRole('button', { name: 'Go to Today' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Sign in' })).toBeNull()
  })
})
