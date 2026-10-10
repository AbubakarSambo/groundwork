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
 *
 * UPDATED (design-audit.md section 3, "People", rebuilt from components/gw/ui): a person's name in
 * the table is the shared `PersonCell`'s `.gwui-person-name` div, bold at 16px by its own CSS, not a
 * semantic `<b>` tag - so every `{ selector: 'b' }` below is now `{ selector: '.gwui-person-name' }`.
 * What each test checks (the row's own content, filters, counts, no label on anybody) is unchanged.
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
    /* U.4 review, item 12 (30 Sept): the semicolon joined two facts as if they were one clause, and
       "you have 0 free" would have read as a number nobody would say out loud. */
    expect(await screen.findByText('Wairimu invited them to Sales team, Q3, yesterday. Letting them in takes a seat, and you have 73 free.')).toBeTruthy()
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
      .toBe('Someone who is no longer here invited them. Letting them in takes a seat.')
  })

  it('says "none free" rather than "0 free" (U.4 review, item 12)', () => {
    expect(whoAskedForThem({ id: 'x', email: 'a@b.co', name: null, addedBy: null, forCheckIn: null }, 0))
      .toBe('Someone who is no longer here invited them. Letting them in takes a seat, and you have none free.')
  })

  /*
   * B-096 (engine workspace, 9 October night, test bed copy a): this heading always said "People
   * from outside <organisation>", even for Halima Yusuf, who is on Msingi Foods' own address -
   * `onTheOrganisationsOwnAddress: true`. Fails before the fix (the old heading always shows) and
   * passes after (when anyone on the list is on the organisation's own address, the heading no
   * longer names anybody as being from outside).
   */
  it('reads "waiting to be added" rather than "from outside" when anyone waiting is on the organisation\'s own address', async () => {
    vi.spyOn(apiClient, 'get').mockImplementation(async (url: string) => {
      if (url.startsWith('/users?')) return { data: { data: people, meta: { total: people.length } } } as any
      if (url === '/users/organization/owner') return { data: { ownerUserId: 'amani' } } as any
      if (url === '/billing/status') return { data: { people: { count: 27, cap: 100 }, subscription: { plan: 'GROWTH' } } } as any
      if (url === '/users/organization/check-ins') return { data: { whoMayOpen: 'NAMED_LEADS', needsApproval: false } } as any
      if (url === '/users/organization/joining') return { data: { on: false, domain: 'baridi.co.ke', whyNot: null } } as any
      if (url === '/users/organization/invite-link') return { data: { on: false, code: null } } as any
      return { data: [] } as any
    })
    vi.spyOn(authApi, 'whoIsWaiting').mockResolvedValue([
      { id: 'r1', email: 'peter@ouma-agencies.co.ke', name: 'Peter Ouma', addedBy: 'Wairimu Kamau', forCheckIn: 'Sales team, Q3', waitingSince: new Date(Date.now() - 86_400_000).toISOString() },
      { id: 'r2', email: 'halima@baridi.co.ke', name: 'Halima Yusuf', addedBy: 'Baraka Mutua', forCheckIn: 'Help my team understand', waitingSince: new Date().toISOString(), onTheOrganisationsOwnAddress: true },
    ] as any)
    vi.spyOn(authApi, 'waitingForASeat').mockResolvedValue([] as any)
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={['/org/members']}>
          <Routes>
            <Route path="/org/members" element={<OrgMembersPage />} />
            <Route path="/org/members/:id" element={<p>One person</p>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )
    expect(await screen.findByRole('heading', { name: 'Waiting to be let in' })).toBeTruthy()
    expect(screen.getByText('People invited to a check-in, waiting to be added')).toBeTruthy()
    expect(screen.queryByText(/People from outside/)).toBeNull()
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
    const miriam = screen.getByText('Miriam Wanjiku', { selector: '.gwui-person-name' }).closest('[role="row"]') as HTMLElement
    const row = within(miriam)
    expect(row.getByText('Sales rep, reports to Wairimu Kamau')).toBeTruthy()
    expect(row.getByText('miriam@baridi.co.ke')).toBeTruthy()
    expect(row.getByText('Sales')).toBeTruthy()
    expect(row.getByText('Takes part')).toBeTruthy()
    expect(row.getByText('Checking in')).toBeTruthy()
    expect(row.getByText('Sales team, Q3')).toBeTruthy()
    /* The owner is one field, and reads as "Owner". */
    expect(within(screen.getByText('Amani Njoroge', { selector: '.gwui-person-name' }).closest('[role="row"]') as HTMLElement).getByText('Owner')).toBeTruthy()
    expect(within(screen.getByText('Lina Mutua', { selector: '.gwui-person-name' }).closest('[role="row"]') as HTMLElement).getByText('Signed in, not on a check-in')).toBeTruthy()
    expect(within(screen.getByText('Lucy Wairimu', { selector: '.gwui-person-name' }).closest('[role="row"]') as HTMLElement).getByText('Invited, not opened')).toBeTruthy()
    const peter = within(screen.getByText('Peter Ouma', { selector: '.gwui-person-name' }).closest('[role="row"]') as HTMLElement)
    expect(peter.getByText('Guest')).toBeTruthy()
    /* U.4 review, item 12 (30 Sept): a bare "None" read as an orphaned word at phone width, where
       the column name it belonged to had already collapsed away. The team cell now says "No team". */
    expect(peter.getByText('No team')).toBeTruthy()
  })

  /*
   * RESTORED (8 October, decision 115, night note item 1). `GET /users` now carries `displayName`
   * on every row, and seven of twelve people at one real organisation (Riverbank Trading) had no
   * name on record. Before this fix, a person with no firstName/lastName read by their raw email
   * address in the People list; the server's own placeholder sentence is drawn now instead.
   */
  it('reads the server\'s displayName for a person with no name, never their address', async () => {
    vi.spyOn(apiClient, 'get').mockImplementation(async (url: string) => {
      if (url.startsWith('/users?')) {
        const noName = {
          id: 'noname', email: 'p07@fieldnote.test', firstName: null, lastName: null,
          displayName: 'Someone who has not given a name yet',
          role: 'MEMBER', isEmailVerified: true, state: 'signed in', checkInsOn: 0, checkInsAnswered: 0,
          level: null, team: null, reportsTo: null, checkIns: [],
        }
        return { data: { data: [...people, noName], meta: { total: people.length + 1 } } } as any
      }
      if (url === '/users/organization/owner') return { data: { ownerUserId: 'amani' } } as any
      if (url === '/billing/status') return { data: { people: { count: 27, cap: 100 }, subscription: { plan: 'GROWTH' } } } as any
      if (url === '/users/organization/check-ins') return { data: { whoMayOpen: 'NAMED_LEADS', needsApproval: false } } as any
      if (url === '/users/organization/joining') return { data: { on: false, domain: 'baridi.co.ke', whyNot: null } } as any
      if (url === '/users/organization/invite-link') return { data: { on: false, code: null } } as any
      return { data: [] } as any
    })
    vi.spyOn(authApi, 'whoIsWaiting').mockResolvedValue([] as any)
    vi.spyOn(authApi, 'waitingForASeat').mockResolvedValue([] as any)
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={['/org/members']}>
          <Routes><Route path="/org/members" element={<OrgMembersPage />} /></Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )
    expect(await screen.findByText('Someone who has not given a name yet', { selector: '.gwui-person-name' })).toBeTruthy()
    expect(screen.queryByText('p07@fieldnote.test', { selector: '.gwui-person-name' })).toBeNull()
  })

  it('shows no label on anybody: no score, no rating, nothing but what they are and where they got to', async () => {
    const { container } = open()
    await screen.findByText('Miriam Wanjiku', { selector: '.gwui-person-name' })
    expect(container.textContent).not.toMatch(/\bscore\b|\brating\b|at risk|\bPIP\b/i)
  })

  it('filters by role, by team, and by who needs something, and says how many are shown', async () => {
    /* The role filters are the shared `Choices` (design-audit.md item 7): a radiogroup of radios,
       40px tall, not plain buttons - so each one is found by its radio role now. */
    open()
    await screen.findByText('Miriam Wanjiku', { selector: '.gwui-person-name' })
    expect(screen.getByText('7 people shown.')).toBeTruthy()
    fireEvent.click(screen.getByRole('radio', { name: 'Can open check-ins' }))
    expect(screen.getByText('2 people shown.')).toBeTruthy()
    fireEvent.click(screen.getByRole('radio', { name: 'Needs something' }))
    expect(screen.getByText('2 people shown.')).toBeTruthy()
    fireEvent.click(screen.getByRole('radio', { name: 'Everyone' }))
    fireEvent.change(screen.getByLabelText('Team'), { target: { value: 'Sales' } })
    expect(screen.getByText('2 people shown.')).toBeTruthy()
  })

  /*
   * B-154. The role filter used to say "Take part" while every row for that same role read
   * "Takes part" (`roleWord`'s own word) - the same role, two different words, one letter apart.
   * The filter now says "Takes part" too, and still finds exactly the people with that role.
   */
  it('the "Takes part" filter says the same word the table itself uses for that role', async () => {
    open()
    await screen.findByText('Miriam Wanjiku', { selector: '.gwui-person-name' })
    expect(screen.queryByRole('radio', { name: 'Take part' })).toBeNull()
    fireEvent.click(screen.getByRole('radio', { name: 'Takes part' }))
    expect(screen.getByText('2 people shown.')).toBeTruthy()
    expect(screen.getByText('Miriam Wanjiku', { selector: '.gwui-person-name' })).toBeTruthy()
    expect(screen.getAllByText('Takes part').length).toBeGreaterThan(1)
  })

  /*
   * HAFSAH'S FAULT 4: A SEARCH BOX ABOVE THE TABLE THAT ALSO FINDS A CHECK-IN SOMEBODY IS IN, so an
   * admin can find the two or three people on a check-in among thirty without scrolling the whole
   * table by eye.
   */
  it('the search box finds somebody by name, by email, or by a check-in they are in', async () => {
    open()
    await screen.findByText('Miriam Wanjiku', { selector: '.gwui-person-name' })
    const find = screen.getByPlaceholderText('Find a person or a check-in')
    fireEvent.change(find, { target: { value: 'wairimu kamau' } })
    expect(screen.getByText('1 person shown.')).toBeTruthy()
    expect(screen.getByText('Wairimu Kamau', { selector: '.gwui-person-name' })).toBeTruthy()
    fireEvent.change(find, { target: { value: 'miriam@baridi.co.ke' } })
    expect(screen.getByText('Miriam Wanjiku', { selector: '.gwui-person-name' })).toBeTruthy()
    /* "Leadership, Q3" is Amani's and Grace's check-in: searching its name finds the two of them,
       and nobody who is not on it. */
    fireEvent.change(find, { target: { value: 'Leadership, Q3' } })
    expect(screen.getByText('2 people shown.')).toBeTruthy()
    expect(screen.getByText('Amani Njoroge', { selector: '.gwui-person-name' })).toBeTruthy()
    expect(screen.getByText('Grace Achieng', { selector: '.gwui-person-name' })).toBeTruthy()
    expect(screen.queryByText('Miriam Wanjiku', { selector: '.gwui-person-name' })).toBeNull()
  })

  it('every row keeps all six cells - a team, a role, a status, its check-ins and Open - whatever the role or how many check-ins (regression: min-width: max-content)', async () => {
    /*
     * THE BUG (a picture check against the running product, U.4/People re-review): the shared
     * PersonRow/PeopleTable CSS forced the whole row to size itself as if none of its text ever
     * wrapped (`min-width: max-content`). A person on many check-ins - joined into one long,
     * unbroken sentence - blew the row out to several thousand pixels wide, pushing Team, Role,
     * Status and Open off the visible table for an admin, a lead and the owner, while a member on
     * one short check-in read fine. jsdom does not lay out CSS grid, so this cannot be caught by
     * asserting pixel positions here; what it CAN catch, and what regresses first if the fix is
     * ever undone by trimming the row's children for some rows, is that every one of the six cells
     * is still present in the row for every kind of person, including one with a long list of
     * check-ins.
     */
    const withAllRoles = [
      { id: 'an-admin', email: 'admin@baridi.co.ke', firstName: 'Ada', lastName: 'Admin', role: 'ADMIN', isEmailVerified: true, state: 'checked in', checkInsOn: 1, checkInsAnswered: 1, team: 'Leadership', checkIns: [{ id: 'c1', label: 'Leadership, Q3', runsIt: true }] },
      { id: 'a-lead', email: 'lead@baridi.co.ke', firstName: 'Lena', lastName: 'Lead', role: 'LEAD', isEmailVerified: true, state: 'checked in', checkInsOn: 6, checkInsAnswered: 5, team: 'Sales', checkIns: [{ id: 'c1', label: 'Sales team, Q3', runsIt: true }, { id: 'c2', label: 'MarketView, where next, test', runsIt: false }, { id: 'c3', label: 'Kasarani Foods v Pwani Mills, test', runsIt: false }, { id: 'c4', label: 'Asset loans, cohort 3, test', runsIt: false }, { id: 'c5', label: 'Help a new hire get started', runsIt: false }, { id: 'c6', label: 'Check how the same role is going', runsIt: false }] },
      { id: 'a-member', email: 'member@baridi.co.ke', firstName: 'Mona', lastName: 'Member', role: 'MEMBER', isEmailVerified: true, state: 'checked in', checkInsOn: 1, checkInsAnswered: 1, team: 'Sales', checkIns: [{ id: 'c1', label: 'Sales team, Q3', runsIt: false }] },
      { id: 'a-waiter', email: 'waiting@baridi.co.ke', firstName: 'Wanda', lastName: 'Waiting', role: 'MEMBER', isEmailVerified: false, awaitingOrgApproval: true, state: 'signed in', checkInsOn: 0, checkInsAnswered: 0, team: null, checkIns: [] },
    ]
    vi.spyOn(apiClient, 'get').mockImplementation(async (url: string) => {
      if (url.startsWith('/users?')) return { data: { data: withAllRoles, meta: { total: withAllRoles.length } } } as any
      if (url === '/billing/status') return { data: { people: { count: 4, cap: 10 }, subscription: { plan: 'GROWTH' } } } as any
      return { data: [] } as any
    })
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { EveryoneHere } = await import('./EveryoneHere')
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter><EveryoneHere orgName="Baridi Appliances" ownerId={null} /></MemoryRouter>
      </QueryClientProvider>,
    )
    await screen.findByText('Mona Member', { selector: '.gwui-person-name' })
    const cases: [string, string, string][] = [
      ['Ada Admin', 'Admin', 'Checking in'],
      ['Lena Lead', 'Can open check-ins', 'Checking in'],
      ['Mona Member', 'Takes part', 'Checking in'],
      ['Wanda Waiting', 'Takes part', 'Waiting to be let in'],
    ]
    for (const [name, roleTag, statusTag] of cases) {
      const row = within(screen.getByText(name, { selector: '.gwui-person-name' }).closest('[role="row"]') as HTMLElement)
      expect(row.getByText(roleTag)).toBeTruthy()
      expect(row.getByText(statusTag)).toBeTruthy()
      expect(row.getByRole('link', { name: `Open ${name}` })).toBeTruthy()
    }
    /* Team: "Leadership" for Ada, "Sales" for Lena and Mona, "No team" for Wanda (no team set). */
    expect(within(screen.getByText('Ada Admin', { selector: '.gwui-person-name' }).closest('[role="row"]') as HTMLElement).getByText('Leadership')).toBeTruthy()
    /*
     * U.4 review, item 12 (30 Sept): the team cell's bare "None" read as an orphaned word at phone
     * width, where the column name it belonged to had already collapsed away - so it is "No team"
     * now, and only the check-ins cell (which names what it is missing nowhere on the page) still
     * says "None".
     */
    const wandaRow = within(screen.getByText('Wanda Waiting', { selector: '.gwui-person-name' }).closest('[role="row"]') as HTMLElement)
    expect(wandaRow.getByText('No team')).toBeTruthy()
    expect(wandaRow.getByText('None')).toBeTruthy()
    /*
     * LENA'S SIX CHECK-INS ARE ALL STILL THERE - UPDATED FOR HAFSAH'S FAULT 4 (the sidebar and the
     * People page list every check-in, unusable at a hundred). The cell this regression test guards
     * no longer writes every check-in out in one long sentence: it caps at the first three and
     * offers "and 3 more", which is exactly the nothing-dropped behaviour this test was written to
     * protect, just reached behind a click instead of always rendered in full. Reworded, not
     * weakened: the row still keeps all six cells at any width, and every one of Lena's six
     * check-ins is still reachable from this same cell.
     */
    const lenaRow = within(screen.getByText('Lena Lead', { selector: '.gwui-person-name' }).closest('[role="row"]') as HTMLElement)
    /* Live walk at a hundred check-ins: these names carry commas of their own ("Sales team, Q3"),
       so a comma between them could not tell one from the next. Each now sits on its own line. */
    expect(lenaRow.getByText('Sales team, Q3')).toBeTruthy()
    expect(lenaRow.getByText('MarketView, where next, test')).toBeTruthy()
    expect(lenaRow.getByText('Kasarani Foods v Pwani Mills, test')).toBeTruthy()
    fireEvent.click(lenaRow.getByRole('button', { name: 'and 3 more' }))
    expect(lenaRow.getByText(/Help a new hire get started/)).toBeTruthy()
    expect(lenaRow.getByText(/Check how the same role is going/)).toBeTruthy()
    /* And the list folds back. */
    fireEvent.click(lenaRow.getByRole('button', { name: 'Show fewer' }))
    expect(lenaRow.getByRole('button', { name: 'and 3 more' })).toBeTruthy()
  })

  it('someone declined at the door reads "Not let in", not "Waiting to be let in" (Hafsah, 29 September)', async () => {
    const withADecline = [
      ...people,
      { id: 'grace-declined', email: 'grace@outside.co.ke', firstName: 'Grace', lastName: 'Outside', role: 'MEMBER', isEmailVerified: false, awaitingOrgApproval: true, notLetIn: true, state: 'signed in', checkInsOn: 0, checkInsAnswered: 0, level: null, team: null, reportsTo: null, checkIns: [] },
    ]
    vi.spyOn(apiClient, 'get').mockImplementation(async (url: string) => {
      if (url.startsWith('/users?')) return { data: { data: withADecline, meta: { total: withADecline.length } } } as any
      if (url === '/users/organization/owner') return { data: { ownerUserId: 'amani' } } as any
      if (url === '/billing/status') return { data: { people: { count: 8, cap: 100 }, subscription: { plan: 'GROWTH' } } } as any
      return { data: [] } as any
    })
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { EveryoneHere } = await import('./EveryoneHere')
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter><EveryoneHere orgName="Baridi Appliances" ownerId={null} /></MemoryRouter>
      </QueryClientProvider>,
    )
    const row = within((await screen.findByText('Grace Outside', { selector: '.gwui-person-name' })).closest('[role="row"]') as HTMLElement)
    expect(row.getByText('Not let in')).toBeTruthy()
    expect(row.getByText('Not let in').className).toMatch(/gwui-tag-concern/)
  })

  it('"Open" goes to that person\'s own page', async () => {
    open()
    fireEvent.click(await screen.findByRole('link', { name: 'Open Miriam Wanjiku' }))
    expect(await screen.findByText('One person')).toBeTruthy()
  })

  it('who reports to whom, under its line', async () => {
    open()
    await screen.findByText('Miriam Wanjiku', { selector: '.gwui-person-name' })
    expect(screen.getByText('Who reports to whom')).toBeTruthy()
    /* FAULT 13 (live review): one sentence joined to another with a semicolon. Two full
       sentences now. */
    expect(screen.getByText('Level and reporting lines describe the organisation. What someone can do still comes from their role.')).toBeTruthy()
  })
})

describe('the rest of the page, in the prototype\'s order and words', () => {
  it('invite people, who can join, who can open a check-in, help your team get started', async () => {
    open()
    expect(await screen.findByRole('heading', { name: 'Invite people' })).toBeTruthy()
    expect(screen.getByText('Write one person on each line, with their name and email. Or paste a list from a spreadsheet.')).toBeTruthy()
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
    await screen.findByText('Miriam Wanjiku', { selector: '.gwui-person-name' })
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

  /*
   * "5 people, on the free plan..." and "6 people shown" used to sit on the page together with no
   * word for why they differed (U.4 people-group review, item 1): the seat count leaves out somebody
   * waiting to be let in, or on a check-in with no seat for them, who the table shows anyway so an
   * admin can act on them. Named here, not just counted, when there are few enough to name.
   */
  it('names who the seat count leaves out, so it never just disagrees with the table', () => {
    expect(howManyHere(5, null, 5, ['Faraji'])).toBe('5 people, on the free plan, which is for up to 5. Faraji is waiting to be let in.')
    expect(howManyHere(5, null, 5, ['Faraji', 'Zawadi'])).toBe('5 people, on the free plan, which is for up to 5. Faraji and Zawadi are waiting to be let in.')
    expect(howManyHere(5, null, 5, [], ['Zawadi'])).toBe('5 people, on the free plan, which is for up to 5. Zawadi is on a check-in with no seat for them.')
    expect(howManyHere(5, null, 5, ['Faraji'], ['Zawadi']))
      .toBe('5 people, on the free plan, which is for up to 5. Faraji is waiting to be let in. Zawadi is on a check-in with no seat for them.')
    expect(howManyHere(5, null, 5, ['A', 'B', 'C', 'D'])).toBe('5 people, on the free plan, which is for up to 5. 4 more are waiting to be let in.')
  })

  it('says nothing extra when the count and the table already agree', async () => {
    open({ people: { count: 7, cap: 100 }, subscription: { plan: 'GROWTH' } })
    await screen.findByText('7 people, on the Growth plan, which is for up to 100.')
  })

  /*
   * U.4 RE-REVIEW, ITEM 2B: "FARAJI WAS NOT LET IN", NOT "FARAJI IS WAITING TO BE LET IN".
   *
   * Once an admin has said no, `awaitingOrgApproval` alone said the person was still waiting - which
   * an admin's decision does not clear - while the row right below read "Not let in", the two
   * sentences on the same page disagreeing about the same person.
   */
  it('says somebody an admin has declined was not let in, never that they are waiting', () => {
    expect(howManyHere(5, null, 5, [], [], ['Faraji'])).toBe('5 people, on the free plan, which is for up to 5. Faraji was not let in.')
    expect(howManyHere(5, null, 5, [], [], ['Faraji', 'Zawadi'])).toBe('5 people, on the free plan, which is for up to 5. Faraji and Zawadi were not let in.')
    expect(howManyHere(5, null, 5, ['Peter'], [], ['Faraji']))
      .toBe('5 people, on the free plan, which is for up to 5. Peter is waiting to be let in. Faraji was not let in.')
  })
})

describe('somebody held for a seat, with no account of their own', () => {
  /*
   * Zawadi (on "Sales team, Q3", no seat for her) was not a row on "Everyone at Baridi Appliances"
   * at all (U.4 people-group review, item 2), though the prototype lists such people with the status
   * "No seat on your plan". `findAll` (the server, users.service.ts) now sends one such row per held
   * email; this checks the page draws it with nothing beyond what the warning already says about her
   * (her email and the check-in), and no "Open" link, since there is no account to open.
   */
  it('is a row, named only by email, with no "Open" and no place in the reporting tree', async () => {
    const zawadi = {
      id: 'held:gp-1', email: 'zawadi.u8@example.test', firstName: null, lastName: null,
      role: null, isEmailVerified: false, state: 'invited', checkInsOn: 1, checkInsAnswered: 0,
      heldForASeat: true, noAccountYet: true, level: null, team: null, reportsTo: null,
      checkIns: [{ id: 'sales', label: 'Sales team, Q3', runsIt: false }],
    }
    vi.spyOn(apiClient, 'get').mockImplementation(async (url: string) => {
      if (url.startsWith('/users?')) return { data: { data: [...people, zawadi], meta: { total: people.length + 1 } } } as any
      if (url === '/users/organization/owner') return { data: { ownerUserId: 'amani' } } as any
      if (url === '/billing/status') return { data: { people: { count: 7, cap: 100 }, subscription: { plan: 'GROWTH' } } } as any
      if (url === '/users/organization/check-ins') return { data: { whoMayOpen: 'NAMED_LEADS', needsApproval: false } } as any
      if (url === '/users/organization/joining') return { data: { on: false, domain: 'baridi.co.ke', whyNot: null } } as any
      if (url === '/users/organization/invite-link') return { data: { on: false, code: null } } as any
      return { data: [] } as any
    })
    vi.spyOn(authApi, 'whoIsWaiting').mockResolvedValue([] as any)
    vi.spyOn(authApi, 'waitingForASeat').mockResolvedValue([] as any)
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={['/org/members']}>
          <Routes>
            <Route path="/org/members" element={<OrgMembersPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )
    expect((await screen.findAllByText('zawadi.u8@example.test')).length).toBeGreaterThan(0)
    expect(screen.getByText('No seat on your plan')).toBeTruthy()
    expect(screen.getByText('7 people, on the Growth plan, which is for up to 100. zawadi.u8@example.test is on a check-in with no seat for them.')).toBeTruthy()
    expect(screen.queryByRole('link', { name: /^Open zawadi/i })).toBeNull()
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
    fireEvent.change(screen.getByLabelText('Write one person on each line, with their name and email. Or paste a list from a spreadsheet.'), { target: { value: 'a@x.co\nb@x.co' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send their invitations' }))
    expect(await screen.findByText('29 people, on the Growth plan, which is for up to 100.')).toBeTruthy()
  })
})

describe('the people with no seat say who added them', () => {
  it('one person added them all: their name, and says who "them" is', async () => {
    const { whoAddedThem } = await import('./OrgMembersPage')
    /* FAULT I (reviewer, third round): a missing comma before "and your plan is full" ran two
       separate facts into one clause - "and" now joins a new sentence, not a third item in the
       list of names. */
    expect(whoAddedThem([{ addedBy: 'Nadia Owino', email: 'tom@baridi.co.ke' }, { addedBy: 'Nadia Owino', email: 'ama@baridi.co.ke' }]))
      .toBe('Nadia Owino added tom@baridi.co.ke and ama@baridi.co.ke, and your plan is full, so nothing has been sent to them. Free a seat or move to a larger plan, then send the invitations. They have not been told any of this.')
  })
  it('several people, or nobody recorded: a sentence true of all of them, never "A lead"', async () => {
    const { whoAddedThem } = await import('./OrgMembersPage')
    expect(whoAddedThem([{ addedBy: 'Nadia Owino', email: 'tom@baridi.co.ke' }, { addedBy: 'Wairimu Kamau', email: 'ama@baridi.co.ke' }])).toMatch(/^Someone on your team added tom@baridi\.co\.ke and ama@baridi\.co\.ke/)
    expect(whoAddedThem([{ addedBy: null, email: 'zawadi@baridi.co.ke' }])).toMatch(/^Someone on your team added zawadi@baridi\.co\.ke/)
  })
  it('names the one person, from what is served, when only one is waiting', async () => {
    const { whoAddedThem } = await import('./OrgMembersPage')
    expect(whoAddedThem([{ addedBy: 'Nadia Owino', email: 'tom@baridi.co.ke' }]))
      .toBe('Nadia Owino added tom@baridi.co.ke, and your plan is full, so nothing has been sent to them. Free a seat or move to a larger plan, then send the invitations. They have not been told any of this.')
  })
  /*
   * FAULT I (reviewer, third round): READ BACK TO HERSELF AS A STRANGER. "Amina Yusuf added ..."
   * named the admin reading it as though she were somebody else. When she is the one who added
   * them, this now reads "You added ...", the way she would say it herself.
   */
  it('reads "You added" when the admin reading it is the one who added them', async () => {
    const { whoAddedThem } = await import('./OrgMembersPage')
    expect(whoAddedThem([{ addedBy: 'Amina Yusuf', email: 'wanjiru@suites.test' }, { addedBy: 'Amina Yusuf', email: 'peter.otieno@fitout.test' }], 0, 'Amina Yusuf'))
      .toMatch(/^You added wanjiru@suites\.test and peter\.otieno@fitout\.test, and your plan is full/)
  })
  /*
   * FAULT I (reviewer, third round): AN EMAIL WHERE A NAME WAS KNOWN. "wanjiru@suites.test" read
   * by address when the row carries a name; used in place of it, address still the fallback.
   */
  it('names the waiting people themselves, when a name is known for them', async () => {
    const { whoAddedThem } = await import('./OrgMembersPage')
    expect(whoAddedThem([
      { addedBy: 'Amina Yusuf', email: 'wanjiru@suites.test', name: 'Wanjiru' },
      { addedBy: 'Amina Yusuf', email: 'peter.otieno@fitout.test', name: 'Peter Otieno' },
    ], 0, 'Amina Yusuf')).toMatch(/^You added Wanjiru and Peter Otieno, and your plan is full/)
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
    expect(await screen.findByText(/^Nadia Owino added tom@baridi\.co\.ke, and your plan is full/)).toBeTruthy()
    expect(screen.getByText('Added by Nadia Owino for Sales team, Q3.')).toBeTruthy()
    expect(screen.queryByText(/A lead added them/)).toBeNull()
  })
})

/*
 * RESTORED (8 October, night note item 3, B-129). A paste can now keep people with no seat as a
 * bare invitation (`kind: 'INVITATION'`), never added to any check-in - `forCheckIn` is null for
 * them. The row used to build its own title, "<email> is on a check-in but has no seat", which was
 * false for this kind: they were never added to one. The server's own `saying` is read instead, and
 * it is true for either kind.
 */
describe('a bare invitation kept with no seat (not added to any check-in)', () => {
  it('reads the server\'s own sentence, never "is on a check-in but has no seat"', async () => {
    open()
    ;(apiClient.get as any).mockImplementation(async (url: string) => {
      if (url.startsWith('/users?')) return { data: { data: people, meta: { total: people.length } } }
      if (url === '/users/organization/owner') return { data: { ownerUserId: 'amani' } }
      if (url === '/billing/status') return { data: { people: { count: 27, cap: 100 }, subscription: { plan: 'GROWTH' } } }
      return { data: {} }
    })
    vi.spyOn(authApi, 'waitingForASeat').mockResolvedValue([{
      id: 'invite:p07@fieldnote.test', kind: 'INVITATION', email: 'p07@fieldnote.test', name: 'Дмитрий Иванов',
      addedBy: 'Wairimu Kamau', forCheckIn: null, waitingSince: new Date().toISOString(),
      saying: 'Дмитрий Иванов has no seat on your plan, so the invitation is kept and will go out when there is room.',
    }] as any)
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(<QueryClientProvider client={qc}><MemoryRouter><OrgMembersPage /></MemoryRouter></QueryClientProvider>)
    expect(await screen.findByText('Дмитрий Иванов has no seat on your plan, so the invitation is kept and will go out when there is room.')).toBeTruthy()
    expect(screen.queryByText(/is on a check-in but has no seat/)).toBeNull()
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
    expect(screen.queryByText('Pendo Mwita', { selector: '.gwui-person-name' })).toBeNull()
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
    expect(whoAddedThem(one, 0)).toMatch(/^Nadia Owino added them, and your plan is full/)
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
