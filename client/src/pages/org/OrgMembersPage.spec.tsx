import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import { authApi } from '@/api/auth'
import { OrgMembersPage } from './OrgMembersPage'
import { whoAskedForThem } from './WaitingToBeLetIn'
import { howManyHere } from './EveryoneHere'

/**
 * THE PEOPLE PAGE, AS GRACE (AN ADMIN) READS IT, against A4 people.txt. And as anybody else, who
 * is told they need admin access (the server refuses the reads too: GET /users is admin only).
 */
let me: any = { id: 'grace', role: 'ADMIN', organizationName: 'Baridi Appliances' }
vi.mock('@/stores/auth', () => ({ useAuthStore: (sel?: any) => (sel ? sel({ user: me }) : { user: me }) }))
vi.mock('@/lib/whatsapp-is-on', () => ({ useWhatsAppIsOn: () => false }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }))

const people = [
  { id: 'amani', email: 'amani@baridi.co.ke', firstName: 'Amani', lastName: 'Njoroge', role: 'ADMIN', isEmailVerified: true, state: 'checked in', checkInsOn: 1, checkInsAnswered: 1, level: 'Chief executive', team: 'Leadership', reportsTo: null, checkIns: [{ id: 'lead', label: 'Leadership, Q3', runsIt: true }] },
  { id: 'grace', email: 'grace@baridi.co.ke', firstName: 'Grace', lastName: 'Achieng', role: 'ADMIN', isEmailVerified: true, state: 'checked in', checkInsOn: 1, checkInsAnswered: 1, level: 'Head of operations', team: 'Operations', reportsTo: { id: 'amani', name: 'Amani Njoroge' }, checkIns: [{ id: 'lead', label: 'Leadership, Q3', runsIt: false }] },
  { id: 'wairimu', email: 'wairimu@baridi.co.ke', firstName: 'Wairimu', lastName: 'Kamau', role: 'LEAD', isEmailVerified: true, state: 'checked in', checkInsOn: 1, checkInsAnswered: 1, level: 'Sales lead', team: 'Sales', reportsTo: { id: 'amani', name: 'Amani Njoroge' }, checkIns: [{ id: 'sales', label: 'Sales team, Q3', runsIt: true }] },
  { id: 'miriam', email: 'miriam@baridi.co.ke', firstName: 'Miriam', lastName: 'Wanjiku', role: 'MEMBER', isEmailVerified: true, state: 'checked in', checkInsOn: 1, checkInsAnswered: 1, level: 'Sales rep', team: 'Sales', reportsTo: { id: 'wairimu', name: 'Wairimu Kamau' }, checkIns: [{ id: 'sales', label: 'Sales team, Q3', runsIt: false }] },
  { id: 'lina', email: 'lina@baridi.co.ke', firstName: 'Lina', lastName: 'Mutua', role: 'LEAD', isEmailVerified: true, state: 'signed in', checkInsOn: 0, checkInsAnswered: 0, level: 'Product lead', team: 'Product', reportsTo: { id: 'amani', name: 'Amani Njoroge' }, checkIns: [] },
  { id: 'lucy', email: 'lucy@baridi.co.ke', firstName: 'Lucy', lastName: 'Wairimu', role: 'MEMBER', isEmailVerified: false, state: 'invited', checkInsOn: 0, checkInsAnswered: 0, level: null, team: null, reportsTo: null, checkIns: [] },
  { id: 'peter', email: 'peter@ouma-agencies.co.ke', firstName: 'Peter', lastName: 'Ouma', role: 'GUEST', isEmailVerified: true, state: 'signed in', checkInsOn: 1, checkInsAnswered: 0, level: null, team: null, reportsTo: null, checkIns: [{ id: 'sales', label: 'Sales team, Q3', runsIt: false }] },
]

function open(billing: any = { people: { count: 27, cap: 100 }, subscription: { plan: 'GROWTH' } }) {
  vi.spyOn(apiClient, 'get').mockImplementation(async (url: string) => {
    if (url.startsWith('/users?')) return { data: { data: people, meta: { total: people.length } } } as any
    if (url === '/users/organization/owner') return { data: { ownerUserId: 'amani' } } as any
    if (url === '/billing/status') return { data: billing } as any
    if (url === '/users/organization/check-ins') return { data: { whoMayOpen: 'NAMED_LEADS', needsApproval: false } } as any
    if (url === '/users/organization/joining') return { data: { on: false, domain: 'baridi.co.ke', whyNot: null } } as any
    if (url === '/users/organization/invite-link') return { data: { on: false, code: null } } as any
    return { data: [] } as any
  })
  vi.spyOn(authApi, 'whoIsWaiting').mockResolvedValue([
    { id: 'r1', email: 'peter@ouma-agencies.co.ke', name: 'Peter Ouma', addedBy: 'Wairimu Kamau', forCheckIn: 'Sales team, Q3', waitingSince: new Date(Date.now() - 86_400_000).toISOString() },
  ] as any)
  vi.spyOn(authApi, 'waitingForASeat').mockResolvedValue([] as any)
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/org/members']}>
        <Routes>
          <Route path="/org/members" element={<OrgMembersPage />} />
          <Route path="/org/members/:id" element={<p>One person</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => { vi.restoreAllMocks(); me = { id: 'grace', role: 'ADMIN', organizationName: 'Baridi Appliances' } })

describe('waiting to be let in', () => {
  it('names who is waiting, who invited them, to what, and the seats left, in the prototype\'s words', async () => {
    open()
    expect(await screen.findByRole('heading', { name: 'Waiting to be let in' })).toBeTruthy()
    expect(screen.getByText('People from outside Baridi Appliances, invited to a check-in')).toBeTruthy()
    expect(screen.getByText('Peter Ouma, peter@ouma-agencies.co.ke')).toBeTruthy()
    expect(await screen.findByText('Wairimu invited them to Sales team, Q3, yesterday. They take a seat; you have 73 free.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Don’t let them in' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Let them in' })).toBeTruthy()
    expect(screen.getByText('Letting someone in tells them straight away, and tells whoever invited them.')).toBeTruthy()
  })

  it('a failure says so in one full sentence', async () => {
    const { toast } = await import('sonner')
    open()
    vi.spyOn(authApi, 'letThemIn').mockRejectedValue(new Error('down'))
    fireEvent.click(await screen.findByRole('button', { name: 'Let them in' }))
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('That did not go through, and nothing has changed. Try again.'))
  })

  it('with no plan cap, and nobody named', () => {
    expect(whoAskedForThem({ id: 'x', email: 'a@b.co', name: null, addedBy: null, forCheckIn: null }, null))
      .toBe('Someone who is no longer here invited them. They take a seat.')
  })
})

describe('everyone at Baridi', () => {
  it('each row reads the person, where they sit, their team, role, status and check-ins', async () => {
    open()
    expect(await screen.findByRole('heading', { name: 'Everyone at Baridi Appliances' })).toBeTruthy()
    expect(await screen.findByText('27 people, on the Growth plan, which is for up to 100.')).toBeTruthy()
    /* U.19: Peter is a guest from outside, listed here, and billing does not count him. */
    /* The prototype's rule (U.4 re-review): a guest with an account takes a seat. */
    expect(screen.getByText('Guests with no account don’t take a seat.')).toBeTruthy()
    const miriam = screen.getByText('Miriam Wanjiku', { selector: 'b' }).closest('[role="row"]') as HTMLElement
    const row = within(miriam)
    expect(row.getByText('Sales rep, reports to Wairimu Kamau')).toBeTruthy()
    expect(row.getByText('miriam@baridi.co.ke')).toBeTruthy()
    expect(row.getByText('Sales')).toBeTruthy()
    expect(row.getByText('Takes part')).toBeTruthy()
    expect(row.getByText('Checking in')).toBeTruthy()
    expect(row.getByText('Sales team, Q3')).toBeTruthy()
    /* The owner is one field, and reads as "Owner". */
    expect(within(screen.getByText('Amani Njoroge', { selector: 'b' }).closest('[role="row"]') as HTMLElement).getByText('Owner')).toBeTruthy()
    expect(within(screen.getByText('Lina Mutua', { selector: 'b' }).closest('[role="row"]') as HTMLElement).getByText('Signed in, not on a check-in')).toBeTruthy()
    expect(within(screen.getByText('Lucy Wairimu', { selector: 'b' }).closest('[role="row"]') as HTMLElement).getByText('Invited, not opened')).toBeTruthy()
    const peter = within(screen.getByText('Peter Ouma', { selector: 'b' }).closest('[role="row"]') as HTMLElement)
    expect(peter.getByText('Guest')).toBeTruthy()
    expect(peter.getByText('None')).toBeTruthy()
  })

  it('shows no label on anybody: no score, no rating, nothing but what they are and where they got to', async () => {
    const { container } = open()
    await screen.findByText('Miriam Wanjiku', { selector: 'b' })
    expect(container.textContent).not.toMatch(/\bscore\b|\brating\b|at risk|\bPIP\b/i)
  })

  it('filters by role, by team, and by who needs something, and says how many are shown', async () => {
    open()
    await screen.findByText('Miriam Wanjiku', { selector: 'b' })
    expect(screen.getByText('7 people shown.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Can open check-ins' }))
    expect(screen.getByText('2 people shown.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Needs something' }))
    expect(screen.getByText('2 people shown.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Everyone' }))
    fireEvent.change(screen.getByLabelText('Team'), { target: { value: 'Sales' } })
    expect(screen.getByText('2 people shown.')).toBeTruthy()
  })

  it('"Open" goes to that person\'s own page', async () => {
    open()
    fireEvent.click(await screen.findByRole('button', { name: 'Open Miriam Wanjiku' }))
    expect(await screen.findByText('One person')).toBeTruthy()
  })

  it('who reports to whom, under its line', async () => {
    open()
    await screen.findByText('Miriam Wanjiku', { selector: 'b' })
    expect(screen.getByText('Who reports to whom')).toBeTruthy()
    expect(screen.getByText('Level and reporting lines describe the organisation; what someone can do still comes from their role')).toBeTruthy()
  })
})

describe('the rest of the page, in the prototype\'s order and words', () => {
  it('invite people, who can join, who can open a check-in, help your team get started', async () => {
    open()
    expect(await screen.findByRole('heading', { name: 'Invite people' })).toBeTruthy()
    expect(screen.getByText('One per line: a name and an email. Or paste a list from a spreadsheet.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Send their invitations' })).toBeTruthy()
    expect(screen.getByText('They’ll get an email with a link to set themselves up.')).toBeTruthy()
    expect(await screen.findByRole('heading', { name: 'Who can open a check-in' })).toBeTruthy()
    expect(await screen.findByText('Start straight away. Turn this on to review each one before invitations go out.')).toBeTruthy()
    expect(screen.getByText('Only the people you choose. Everyone else takes part in the ones they’re invited to.')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Help your team get started' })).toBeTruthy()
    expect(screen.getByText('How a check-in works, what happens to what people write, and what you can see as their admin.')).toBeTruthy()
    expect(screen.getByText('Everyone at Baridi Appliances on one plan, so nobody waits for a seat.')).toBeTruthy()
  })

  it('nothing on the page joins pieces with a dash', async () => {
    const { container } = open()
    await screen.findByText('Miriam Wanjiku', { selector: 'b' })
    expect(container.textContent).not.toMatch(/ - /)
  })
})

describe('anybody who is not an admin', () => {
  it('is told they need admin access, and nothing is read', () => {
    me = { id: 'miriam', role: 'MEMBER', organizationName: 'Baridi Appliances' }
    open()
    expect(screen.getByText('You need admin access to manage team members.')).toBeTruthy()
    expect(screen.queryByText('Everyone at Baridi Appliances')).toBeNull()
  })
})

describe('the head count', () => {
  it('names the plan a free run covers, not the free plan (U.19)', async () => {
    open({ people: { count: 12, cap: 20 }, subscription: { plan: null }, onTheHouse: { plan: 'SMALL_TEAM', until: '2026-12-27T00:00:00.000Z' } })
    expect(await screen.findByText('12 people, on the Small Team plan, which is for up to 20.')).toBeTruthy()
  })


  it('reads as a sentence on every plan', () => {
    expect(howManyHere(27, 'GROWTH', 100)).toBe('27 people, on the Growth plan, which is for up to 100.')
    expect(howManyHere(3, null, 5)).toBe('3 people, on the free plan, which is for up to 5.')
    expect(howManyHere(1, 'ENTERPRISE', null)).toBe('1 person.')
  })
})

describe('the head count keeps up', () => {
  it('after "Let them in", "N people, on the … plan" is read again, not left as it was', async () => {
    open()
    await screen.findByText('27 people, on the Growth plan, which is for up to 100.')
    const get = apiClient.get as any
    const before = get.mock.calls.filter((c: any[]) => c[0] === '/billing/status').length
    get.mockImplementation(async (url: string) => {
      if (url === '/billing/status') return { data: { people: { count: 28, cap: 100 }, subscription: { plan: 'GROWTH' } } }
      if (url.startsWith('/users?')) return { data: { data: people, meta: { total: people.length } } }
      if (url === '/users/organization/owner') return { data: { ownerUserId: 'amani' } }
      return { data: {} }
    })
    vi.spyOn(authApi, 'letThemIn').mockResolvedValue({} as any)
    fireEvent.click(screen.getByRole('button', { name: 'Let them in' }))
    expect(await screen.findByText('28 people, on the Growth plan, which is for up to 100.')).toBeTruthy()
    expect(get.mock.calls.filter((c: any[]) => c[0] === '/billing/status').length).toBeGreaterThan(before)
  })

  it('and after invitations are sent', async () => {
    open()
    await screen.findByText('27 people, on the Growth plan, which is for up to 100.')
    const get = apiClient.get as any
    get.mockImplementation(async (url: string) => {
      if (url === '/billing/status') return { data: { people: { count: 29, cap: 100 }, subscription: { plan: 'GROWTH' } } }
      if (url.startsWith('/users?')) return { data: { data: people, meta: { total: people.length } } }
      if (url === '/users/organization/owner') return { data: { ownerUserId: 'amani' } }
      return { data: {} }
    })
    vi.spyOn(apiClient, 'post').mockImplementation(async (_u: string, body: any) => ({ data: { preview: body.preview, seatsLeft: 71, rows: [{ email: 'a@x.co', result: 'invited' }, { email: 'b@x.co', result: 'invited' }], summary: body.preview ? '2 people will be invited.' : '2 people were invited.' } }) as any)
    fireEvent.change(screen.getByLabelText('One per line: a name and an email. Or paste a list from a spreadsheet.'), { target: { value: 'a@x.co\nb@x.co' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send their invitations' }))
    expect(await screen.findByText('29 people, on the Growth plan, which is for up to 100.')).toBeTruthy()
  })
})

describe('the people with no seat say who added them', () => {
  it('one person added them all: their name', async () => {
    const { whoAddedThem } = await import('./OrgMembersPage')
    expect(whoAddedThem([{ addedBy: 'Nadia Owino' }, { addedBy: 'Nadia Owino' }]))
      .toBe('Nadia Owino added them and your plan is full, so nothing has been sent to them. Free a seat or move to a larger plan, then send the invitations. They have not been told any of this.')
  })
  it('several people, or nobody recorded: a sentence true of all of them, never "A lead"', async () => {
    const { whoAddedThem } = await import('./OrgMembersPage')
    expect(whoAddedThem([{ addedBy: 'Nadia Owino' }, { addedBy: 'Wairimu Kamau' }])).toMatch(/^Someone on your team added them/)
    expect(whoAddedThem([{ addedBy: null }])).toMatch(/^Someone on your team added them/)
  })
  it('on the page, with each person\'s line', async () => {
    open()
    /* A full plan: 100 of 100 (U.4 fourth review: with room, the card says so instead). */
    ;(apiClient.get as any).mockImplementation(async (url: string) => {
      if (url.startsWith('/users?')) return { data: { data: people, meta: { total: people.length } } }
      if (url === '/users/organization/owner') return { data: { ownerUserId: 'amani' } }
      if (url === '/billing/status') return { data: { people: { count: 100, cap: 100 }, subscription: { plan: 'GROWTH' } } }
      return { data: {} }
    })
    vi.spyOn(authApi, 'waitingForASeat').mockResolvedValue([{ id: 'p1', email: 'tom@baridi.co.ke', addedBy: 'Nadia Owino', forCheckIn: 'Sales team, Q3' }] as any)
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(<QueryClientProvider client={qc}><MemoryRouter><OrgMembersPage /></MemoryRouter></QueryClientProvider>)
    expect(await screen.findByText(/^Nadia Owino added them and your plan is full/)).toBeTruthy()
    expect(screen.getByText('Added by Nadia Owino for Sales team, Q3.')).toBeTruthy()
    expect(screen.queryByText(/A lead added them/)).toBeNull()
  })
})

describe('somebody who left (U.4 fourth review)', () => {
  it('is not listed, and is in no filter\'s count', async () => {
    const pendo = { id: 'pendo', email: 'pendo@baridi.co.ke', firstName: 'Pendo', lastName: 'Mwita', role: 'MEMBER', isActive: false, isEmailVerified: true, state: 'signed in', checkInsOn: 0, checkInsAnswered: 0, level: null, team: null, reportsTo: null, checkIns: [] }
    open()
    ;(apiClient.get as any).mockImplementation(async (url: string) => {
      if (url.startsWith('/users?')) return { data: { data: [...people, pendo], meta: { total: people.length + 1 } } }
      if (url === '/users/organization/owner') return { data: { ownerUserId: 'amani' } }
      if (url === '/billing/status') return { data: { people: { count: 27, cap: 100 }, subscription: { plan: 'GROWTH' } } }
      return { data: {} }
    })
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(<QueryClientProvider client={qc}><MemoryRouter><OrgMembersPage /></MemoryRouter></QueryClientProvider>)
    expect((await screen.findAllByText('7 people shown.')).length).toBeGreaterThan(0)
    expect(screen.queryByText('Pendo Mwita', { selector: 'b' })).toBeNull()
  })
})

describe('the no-seat card once a seat is freed (U.4 fourth review)', () => {
  it('room for all of them, for some, or none', async () => {
    const { whoAddedThem } = await import('./OrgMembersPage')
    const one = [{ addedBy: 'Nadia Owino' }]
    const three = [{ addedBy: 'Nadia Owino' }, { addedBy: 'Nadia Owino' }, { addedBy: 'Nadia Owino' }]
    expect(whoAddedThem(one, 1)).toBe('There is a seat for them now. Send their invitation when you are ready.')
    expect(whoAddedThem(three, null)).toBe('There are seats for all 3 of them now. Send their invitations when you are ready.')
    expect(whoAddedThem(three, 1)).toBe('There is a seat for 1 of them now. Send their invitations when you are ready, and the rest wait until there is room.')
    expect(whoAddedThem(three, 2)).toBe('There are seats for 2 of them now. Send their invitations when you are ready, and the rest wait until there is room.')
    expect(whoAddedThem(one, 0)).toMatch(/^Nadia Owino added them and your plan is full/)
  })

  it('on the page, after a seat was freed, the card no longer says the plan is full', async () => {
    open()
    ;(apiClient.get as any).mockImplementation(async (url: string) => {
      if (url.startsWith('/users?')) return { data: { data: people, meta: { total: people.length } } }
      if (url === '/users/organization/owner') return { data: { ownerUserId: 'amani' } }
      if (url === '/billing/status') return { data: { people: { count: 99, cap: 100 }, subscription: { plan: 'GROWTH' } } }
      return { data: {} }
    })
    vi.spyOn(authApi, 'waitingForASeat').mockResolvedValue([{ id: 'p1', email: 'tom@baridi.co.ke', addedBy: 'Nadia Owino', forCheckIn: 'Sales team, Q3' }] as any)
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(<QueryClientProvider client={qc}><MemoryRouter><OrgMembersPage /></MemoryRouter></QueryClientProvider>)
    expect(await screen.findByText('There is a seat for them now. Send their invitation when you are ready.')).toBeTruthy()
    expect(screen.queryByText(/your plan is full/)).toBeNull()
  })
})
