import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WelcomePage } from './WelcomePage'
import { authApi } from '@/api/auth'

/** "WHERE DO YOU WORK?" (A3, #/welcome), AS THE PERSON READS IT. Wording from welcome.txt, no head count. */
vi.mock('@/api/auth', () => ({ authApi: { whereCanIJoin: vi.fn(), joinByDomain: vi.fn() } }))
const setAuth = vi.fn()
vi.mock('@/stores/auth', () => ({ useAuthStore: (sel: any) => sel({ setAuth }) }))

function open() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/welcome']}>
        <Routes>
          <Route path="/welcome" element={<WelcomePage />} />
          <Route path="/invite" element={<p>The invitation</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const assign = vi.fn()
beforeEach(() => {
  vi.clearAllMocks()
  Object.defineProperty(window, 'location', { value: { ...window.location, assign }, writable: true })
})

describe('where do you work', () => {
  it('offers the organisation by domain, the invitation as a guest, and creating one', async () => {
    ;(authApi.whereCanIJoin as any).mockResolvedValue({
      byDomain: [{ id: 'baridi', name: 'Baridi Appliances', domain: 'baridi.co.ke' }],
      asAGuest: [{ organisationName: 'Kilimo Traders’ Association', checkInName: 'Harvest', invitePath: '/invite?token=abc' }],
    })
    open()
    expect(screen.getByRole('heading', { name: 'Where do you work?' })).toBeTruthy()
    expect(screen.getByText('Join an organisation you belong to, or create a new one. You can be in more than one and switch between them.')).toBeTruthy()
    expect(await screen.findByText('Anyone with an @baridi.co.ke email can join.')).toBeTruthy()
    expect(screen.getByText('You were invited to one check-in, as a guest.')).toBeTruthy()
    expect(screen.getByText('Create a new organisation')).toBeTruthy()
    expect(screen.getByText('For a team that isn’t on Groundwork yet.')).toBeTruthy()
    expect(document.body.textContent).not.toMatch(/\d+ people/)
  })

  it('"Join" joins by domain, stores (user, token) and opens its check-ins', async () => {
    ;(authApi.whereCanIJoin as any).mockResolvedValue({ byDomain: [{ id: 'baridi', name: 'Baridi Appliances', domain: 'baridi.co.ke' }], asAGuest: [] })
    ;(authApi.joinByDomain as any).mockResolvedValue({ accessToken: 'tok', user: { id: 'u1' }, organization: { id: 'baridi' } })
    open()
    fireEvent.click(await screen.findByRole('button', { name: 'Join Baridi Appliances' }))
    await waitFor(() => expect(authApi.joinByDomain).toHaveBeenCalledWith('baridi'))
    await waitFor(() => expect(setAuth).toHaveBeenCalledWith({ id: 'u1' }, 'tok'))
    expect(assign).toHaveBeenCalledWith('/today')
  })

  it('a refusal is said in the server\'s own sentence', async () => {
    ;(authApi.whereCanIJoin as any).mockResolvedValue({ byDomain: [{ id: 'baridi', name: 'Baridi Appliances', domain: 'baridi.co.ke' }], asAGuest: [] })
    ;(authApi.joinByDomain as any).mockRejectedValue({ response: { data: { message: 'Baridi Appliances has no room for another person on its plan right now. Ask an admin there to make room, or to invite you when there is.' } } })
    open()
    fireEvent.click(await screen.findByRole('button', { name: 'Join Baridi Appliances' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Baridi Appliances has no room for another person on its plan right now.')
  })

  it('"Join as a guest" opens that invitation', async () => {
    ;(authApi.whereCanIJoin as any).mockResolvedValue({ byDomain: [], asAGuest: [{ organisationName: 'Kilimo', checkInName: 'Harvest', invitePath: '/invite?token=abc' }] })
    open()
    fireEvent.click(await screen.findByRole('button', { name: 'Join Kilimo as a guest' }))
    expect(await screen.findByText('The invitation')).toBeTruthy()
  })

  it('with nothing to join, only "Create a new organisation"', async () => {
    ;(authApi.whereCanIJoin as any).mockResolvedValue({ byDomain: [], asAGuest: [] })
    open()
    await waitFor(() => expect(authApi.whereCanIJoin).toHaveBeenCalled())
    expect(screen.getByRole('link', { name: 'Create' })).toHaveAttribute('href', '/org-new')
    expect(screen.queryByRole('button', { name: /^Join/ })).toBeNull()
  })
})
