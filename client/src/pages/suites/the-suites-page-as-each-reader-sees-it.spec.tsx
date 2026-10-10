import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SuitesPage } from './SuitesPage'
import { useAuthStore } from '@/stores/auth'
import type { SuitesForAnAdmin, SuitesForALead, SuitesForADutyHolder, AdminSuite } from '@/api/suites'

/**
 * THE SUITES PAGE (E, #/settings/suites), AS EACH PERSON SEES IT. What each person is served is
 * tested on the server (api/src/modules/suites/the-suites-as-each-reader-reads-them.spec.ts). Here:
 * what each person reads, in the prototype's words (suites-admin.txt, suites-lead.txt), and what the
 * page never offers: a door to a board that is not built, or a switch to anybody but an admin.
 */
/* `yourRequestsApi` defaults to "off" (a 404-shaped rejection, the same as a suite that is not
   switched on): the fault 2 tests below set it explicitly, and every other test here never reads
   "Your own leave and spending requests" at all, so its absence by default changes nothing they
   check. */
/* B-140: SuitesPage now asks GET /suites/reviews/board for the reviews suite's own card
   (reviewsLineFor), the same call ReviewsBoardPage already reads `every` from - mocked here so
   every existing test keeps its default (no override) unless a test sets it. */
const reviewsBoard: any = vi.fn(() => Promise.resolve({ every: null as string | null, next: [] as any[] }))
vi.mock('@/api/suites', () => ({
  suitesApi: { get: vi.fn(), switch: vi.fn() },
  reviewsApi: { board: () => reviewsBoard() },
  yourRequestsApi: {
    leave: vi.fn(() => Promise.reject(Object.assign(new Error('off'), { response: { status: 404 } }))),
    spending: vi.fn(() => Promise.reject(Object.assign(new Error('off'), { response: { status: 404 } }))),
    hours: vi.fn(() => Promise.reject(Object.assign(new Error('off'), { response: { status: 404 } }))),
  },
}))
import { suitesApi, yourRequestsApi } from '@/api/suites'

const suiteOff = () => Promise.reject(Object.assign(new Error('off'), { response: { status: 404 } }))

const suite = (key: string, name: string, line: string, over: Partial<AdminSuite> = {}): AdminSuite =>
  ({ key, name, line, on: false, questions: [], answers: {}, ...over })

const LEAVE_QS: AdminSuite['questions'] = [
  { id: 'days', kind: 'number', ask: 'How many days of leave does each person have in a year?', min: 0, max: 365 },
  { id: 'approver', kind: 'choice', ask: 'Who approves a request for time off?', options: ['Their manager', 'An admin'] },
]

/* What an admin is served: every suite, all off, as a new organisation has them. */
const GRACES: SuitesForAnAdmin = {
  reader: 'admin',
  people: [{ id: 'u-g', name: 'Grace Achieng' }, { id: 'u-k', name: 'Kamau Njenga' }],
  groups: [
    { name: 'People', suites: [
      suite('onboard', 'Onboarding', 'A new person’s to-dos, and what each helper must do to set them up.'),
      suite('leave', 'Leave requests', 'People ask for time off in a check-in or chat. Groundwork checks their days left and who else is off.', { questions: LEAVE_QS }),
      suite('time', 'Time sheets', 'People say how many hours they spent, and on which client or project. Used for billing only.'),
      suite('reviews', 'Performance reviews', 'A review every 6 months, built from what each person did and proved, with their own view beside it.'),
      suite('leaving', 'When someone leaves', 'Handover, returning equipment, removing access and final pay, each with an owner.'),
      suite('roles', 'Role map', 'Every role, what it owns, and who holds it. Shows jobs nobody owns.'),
    ] },
    { name: 'Money', suites: [
      suite('spend', 'Spending and budgets', 'People ask to spend in chat. Groundwork checks the budget and sends it to the right person. Shows each team’s budget against what was spent.'),
    ] },
    { name: 'Work', suites: [
      suite('todos', 'To-dos', 'Everything people said they will do, from every check-in and chat, in one list for each person.'),
      suite('customers', 'Customers and deals', 'One list of customers and deals for the whole company, kept up to date by the sales check-ins.'),
      suite('equipment', 'Equipment', 'See who has each laptop, phone and other piece of equipment, and what needs fixing.', {
        questions: [{ id: 'keeper', kind: 'person', ask: 'Who looks after equipment and repairs?' }],
      }),
    ] },
  ],
}
const withOn = (key: string, answers = {}): SuitesForAnAdmin => ({
  ...GRACES,
  groups: GRACES.groups.map(g => ({ ...g, suites: g.suites.map(s => (s.key === key ? { ...s, on: true, answers } : s)) })),
})

/* What a lead is served: only what is on, of the suites for leads. */
const WAIRIMUS: SuitesForALead = {
  reader: 'lead',
  suites: [
    { key: 'time', name: 'Time sheets', line: 'People say how many hours they spent, and on which client or project. Used for billing only.' },
    { key: 'todos', name: 'To-dos', line: 'Everything people said they will do, from every check-in and chat, in one list for each person.' },
  ],
}

const GRACE = { id: 'u-g', firstName: 'Grace', role: 'ADMIN', organizationName: 'Baridi Appliances' }
const WAIRIMU = { id: 'u-w', firstName: 'Wairimu', role: 'LEAD', organizationName: 'Baridi Appliances' }
const MIRIAM = { id: 'u-m', firstName: 'Miriam', role: 'MEMBER', organizationName: 'Baridi Appliances' }

function open(user: any, served: SuitesForAnAdmin | SuitesForALead | SuitesForADutyHolder | Error) {
  if (served instanceof Error) (suitesApi.get as any).mockRejectedValue(served)
  else (suitesApi.get as any).mockResolvedValue(served)
  useAuthStore.setState({ user, token: 't', isAuthenticated: true } as any)
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/settings/suites']}><SuitesPage /></MemoryRouter>
    </QueryClientProvider>,
  )
}
const card = (name: string) => screen.getByRole('region', { name })
const text = () => document.body.textContent ?? ''

beforeEach(() => { vi.clearAllMocks() })

describe('Grace, an admin, reads the Suites page', () => {
  it('reads the heading and the prototype’s sentence', async () => {
    open(GRACE, GRACES)
    expect(await screen.findByText('Ready-made tools for other kinds of team work. Switch on only what you need. Each one adds a single board, and people use it by talking to Groundwork, not by filling in forms. Only admins see this page.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Suites' })).toBeInTheDocument()
    expect(screen.getByText('Baridi Appliances')).toBeInTheDocument()
  })

  it('reads every suite in three groups, People, Money and Work, each with its line and its switch', async () => {
    open(GRACE, GRACES)
    await screen.findByRole('heading', { level: 2, name: 'People' })
    for (const [group, names] of [
      ['People', ['Onboarding', 'Leave requests', 'Time sheets', 'Performance reviews', 'When someone leaves', 'Role map']],
      ['Money', ['Spending and budgets']],
      ['Work', ['To-dos', 'Customers and deals', 'Equipment']],
    ] as const) {
      const region = screen.getByRole('region', { name: group })
      expect(within(region).getAllByRole('heading', { level: 3 }).map(h => h.textContent)).toEqual(names)
    }
    expect(card('Leave requests').textContent).toBe('Leave requestsPeople ask for time off in a check-in or chat. Groundwork checks their days left and who else is off.Off')
    expect(within(card('Leave requests')).getByRole('switch', { name: 'Leave requests' })).toHaveAttribute('aria-checked', 'false')
    expect(screen.getAllByRole('switch')).toHaveLength(10)
  })

  it('offers each suite that is on a door to its own board, now that all ten are built', async () => {
    /* U.17: this checked a suite with no board yet. Since equipment, the last, every suite has one. */
    const allOn: SuitesForAnAdmin = { ...GRACES, groups: GRACES.groups.map(g => ({ ...g, suites: g.suites.map(s => ({ ...s, on: true })) })) }
    open(GRACE, allOn)
    await screen.findByRole('heading', { level: 2, name: 'People' })
    expect(screen.getAllByRole('link', { name: 'Open its board' }).map(a => a.getAttribute('href'))).toEqual([
      '/suite/onboard', '/suite/leave', '/suite/time', '/suite/reviews', '/suite/leaving', '/suite/roles',
      '/suite/spend', '/suite/todos', '/suite/customers', '/suite/equipment',
    ])
  })

  it('"Open its board" is on the onboarding suite once it is on, and goes to its board', async () => {
    open(GRACE, withOn('onboard'))
    await screen.findByRole('heading', { level: 2, name: 'People' })
    expect(within(card('Onboarding')).getByRole('link', { name: 'Open its board' })).toHaveAttribute('href', '/suite/onboard')
    expect(screen.getAllByRole('link', { name: 'Open its board' })).toHaveLength(1)
  })

  it('"Open its board" is on leave requests too, once it is on', async () => {
    open(GRACE, withOn('leave', { days: 21, approver: 'Their manager' }))
    await screen.findByRole('heading', { level: 2, name: 'People' })
    expect(within(card('Leave requests')).getByRole('link', { name: 'Open its board' })).toHaveAttribute('href', '/suite/leave')
  })

  it('and not while it is off', async () => {
    open(GRACE, GRACES)
    await screen.findByRole('heading', { level: 2, name: 'People' })
    expect(screen.queryByRole('link', { name: 'Open its board' })).toBeNull()
  })

  /*
   * SCREEN FAULT 6: a suite that was switched on, with questions of its own, offered no way back
   * into them - only the switch, which would turn it off. "See or change its settings" opens the
   * same form, filled in with what is already on record (`GET /suites`' own `answers`), and saves
   * through the same PUT /suites/:key the switch itself uses, with `on` left exactly as it is.
   */
  it('a suite that is on, with questions, offers "See or change its settings"', async () => {
    open(GRACE, withOn('leave', { days: 21, approver: 'Their manager' }))
    await screen.findByRole('heading', { level: 2, name: 'People' })
    const c = card('Leave requests')
    expect(within(c).getByRole('button', { name: 'See or change its settings' })).toBeInTheDocument()
  })

  it('a suite that is on, with no questions, offers no such door - there is nothing to see', async () => {
    open(GRACE, withOn('todos'))
    await screen.findByRole('heading', { level: 2, name: 'People' })
    expect(within(card('To-dos')).queryByRole('button', { name: 'See or change its settings' })).toBeNull()
  })

  it('a suite that is off offers no such door either', async () => {
    open(GRACE, GRACES)
    await screen.findByRole('heading', { level: 2, name: 'People' })
    expect(within(card('Leave requests')).queryByRole('button', { name: 'See or change its settings' })).toBeNull()
  })

  it('opens the same form, filled in with what is on record, and saves it with the switch left on', async () => {
    open(GRACE, withOn('leave', { days: 21, approver: 'Their manager' }))
    await screen.findByRole('heading', { level: 2, name: 'People' })
    const c = card('Leave requests')
    fireEvent.click(within(c).getByRole('button', { name: 'See or change its settings' }))
    expect(within(c).getByText('Change your answers below, then save them.')).toBeInTheDocument()
    expect(within(c).getByLabelText('How many days of leave does each person have in a year?')).toHaveValue(21)
    expect(within(c).getByLabelText('Who approves a request for time off?')).toHaveValue('Their manager')
    fireEvent.change(within(c).getByLabelText('How many days of leave does each person have in a year?'), { target: { value: '25' } })
    ;(suitesApi.switch as any).mockResolvedValue(withOn('leave', { days: 25, approver: 'Their manager' }))
    fireEvent.click(within(c).getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(suitesApi.switch).toHaveBeenCalledWith('leave', true, { days: '25', approver: 'Their manager' }))
    /* Still on throughout - this never sent `on: false`. */
    await waitFor(() => expect(within(card('Leave requests')).getByRole('switch')).toHaveAttribute('aria-checked', 'true'))
  })

  /*
   * B-124 FOR AN EXISTING ORGANISATION (coordinator follow-up, 9 October). Kijani Foods' leave
   * suite was switched on before this page existed: its days a year are stored under the older name
   * `daysAYear`, and its `approver` is a person's id, not one of today's two choices. "These
   * settings were set up another way, so they cannot be changed here yet." used to refuse the whole
   * form over this - even the days a year, which reads perfectly well under its old name. The form
   * now always opens: `days` is read from `daysAYear` (the one rename this product actually made),
   * `approver` shows blank with a plain note (its stored value is a person's id, not a valid choice,
   * so it is not guessed at), and "Save" stays disabled until the admin picks one - nothing on
   * record is touched until they do.
   */
  it('opens the form even over settings stored before this page existed, reads what carries over, and leaves the rest for the admin to choose', async () => {
    open(GRACE, withOn('leave', { daysAYear: 21, approver: 'u-g', workflow: 'manager' } as any))
    await screen.findByRole('heading', { level: 2, name: 'People' })
    const c = card('Leave requests')
    fireEvent.click(within(c).getByRole('button', { name: 'See or change its settings' }))
    expect(within(c).getByText('Some of these were set up before this page existed, so they show blank below. Choose them now, and saving sets them from what you choose.')).toBeInTheDocument()
    expect(within(c).getByLabelText('How many days of leave does each person have in a year?')).toHaveValue(21)
    expect(within(c).getByLabelText('Who approves a request for time off?')).toHaveValue('')
    expect(within(c).getByRole('button', { name: 'Save' })).toBeDisabled()
    expect(suitesApi.switch).not.toHaveBeenCalled()
  })

  it('once the admin fills in what could not be read, saves everything - the carried-over value and the new choice together', async () => {
    open(GRACE, withOn('leave', { daysAYear: 21, approver: 'u-g', workflow: 'manager' } as any))
    await screen.findByRole('heading', { level: 2, name: 'People' })
    const c = card('Leave requests')
    fireEvent.click(within(c).getByRole('button', { name: 'See or change its settings' }))
    fireEvent.change(within(c).getByLabelText('Who approves a request for time off?'), { target: { value: 'An admin' } })
    ;(suitesApi.switch as any).mockResolvedValue(withOn('leave', { days: 21, approver: 'An admin' }))
    fireEvent.click(within(c).getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(suitesApi.switch).toHaveBeenCalledWith('leave', true, { days: '21', approver: 'An admin' }))
  })

  it('"Cancel" leaves its answers exactly as they were, and sends nothing', async () => {
    open(GRACE, withOn('leave', { days: 21, approver: 'Their manager' }))
    await screen.findByRole('heading', { level: 2, name: 'People' })
    const c = card('Leave requests')
    fireEvent.click(within(c).getByRole('button', { name: 'See or change its settings' }))
    fireEvent.change(within(c).getByLabelText('How many days of leave does each person have in a year?'), { target: { value: '25' } })
    fireEvent.click(within(c).getByRole('button', { name: 'Cancel' }))
    expect(within(c).queryByText('Change your answers below, then save them.')).toBeNull()
    expect(suitesApi.switch).not.toHaveBeenCalled()
  })

  it('reads "Already part of Groundwork", each with a link to where it lives', async () => {
    open(GRACE, GRACES)
    const region = await screen.findByRole('region', { name: 'Already part of Groundwork' })
    expect(within(region).getByText('These don’t need switching on. Here is where each one lives.')).toBeInTheDocument()
    expect([...region.querySelectorAll('li')].map(li => [li.querySelector('b')?.textContent, li.querySelector('span')?.textContent, li.querySelector('a')?.textContent, li.querySelector('a')?.getAttribute('href')])).toEqual([
      ['Goals and targets', 'Set in each check-in, with what counts.', 'Each check-in', '/grounds'],
      ['Commitments', 'What people said they would do, and whether they did.', 'Each check-in', '/grounds'],
      ['Teams and who reports to whom', 'Each person’s team, level and manager.', 'People', '/org/members'],
      ['Roles and permissions', 'Who can start check-ins, and who can see what.', 'People', '/org/members'],
      ['Company documents', 'The handbook, learnings and resources.', 'Company context', '/company/context'],
      ['Numbers from other systems', 'Sales, payments and usage, shown beside what people say.', 'Connections', '/settings/connections'],
      ['Slack or Teams', 'Notices in the channels your team already uses.', 'Connections', '/settings/connections'],
    ])
  })

  it('a suite with nothing to ask switches on at one press', async () => {
    open(GRACE, GRACES)
    ;(suitesApi.switch as any).mockResolvedValue(withOn('todos'))
    fireEvent.click(await screen.findByRole('switch', { name: 'To-dos' }))
    await waitFor(() => expect(suitesApi.switch).toHaveBeenCalledWith('todos', true, undefined))
    await waitFor(() => expect(within(card('To-dos')).getByRole('switch')).toHaveAttribute('aria-checked', 'true'))
    expect(card('To-dos').textContent).toContain('On')
  })

  it('a suite with questions asks them first, and switches on only once each is answered', async () => {
    open(GRACE, GRACES)
    fireEvent.click(await screen.findByRole('switch', { name: 'Leave requests' }))
    const c = card('Leave requests')
    expect(within(c).getByText('Answer these first, and it switches on.')).toBeInTheDocument()
    const go = within(c).getByRole('button', { name: 'Switch it on' })
    expect(go).toBeDisabled()
    expect(suitesApi.switch).not.toHaveBeenCalled()
    fireEvent.change(within(c).getByLabelText('How many days of leave does each person have in a year?'), { target: { value: '21' } })
    expect(go).toBeDisabled()
    fireEvent.change(within(c).getByLabelText('Who approves a request for time off?'), { target: { value: 'Their manager' } })
    expect(go).not.toBeDisabled()
    ;(suitesApi.switch as any).mockResolvedValue(withOn('leave', { days: 21, approver: 'Their manager' }))
    fireEvent.click(go)
    await waitFor(() => expect(suitesApi.switch).toHaveBeenCalledWith('leave', true, { days: '21', approver: 'Their manager' }))
    await waitFor(() => expect(within(card('Leave requests')).queryByText('Answer these first, and it switches on.')).toBeNull())
  })

  it('a person question offers the organisation’s own people by name', async () => {
    open(GRACE, GRACES)
    fireEvent.click(await screen.findByRole('switch', { name: 'Equipment' }))
    const pick = within(card('Equipment')).getByLabelText('Who looks after equipment and repairs?')
    expect([...pick.querySelectorAll('option')].map(o => o.textContent)).toEqual(['Choose somebody', 'Grace Achieng', 'Kamau Njenga'])
  })

  it('"Cancel" leaves it off, and nothing is sent', async () => {
    open(GRACE, GRACES)
    fireEvent.click(await screen.findByRole('switch', { name: 'Leave requests' }))
    fireEvent.click(within(card('Leave requests')).getByRole('button', { name: 'Cancel' }))
    expect(within(card('Leave requests')).queryByText('Answer these first, and it switches on.')).toBeNull()
    expect(suitesApi.switch).not.toHaveBeenCalled()
  })

  /*
   * FAULT 7D OF THE LIVE WALK (6 October): switching a suite off used to be one press, with no
   * warning even while requests or hours waited in it. A press now asks first, in the shared Modal,
   * with what switching off actually does (switch(), suites.service.ts: the suite's answers and
   * anything already in it are kept; it is only refused from being added to until it is on again).
   */
  it('switching off asks first, and nothing is sent until the press is confirmed', async () => {
    open(GRACE, withOn('todos'))
    fireEvent.click(await screen.findByRole('switch', { name: 'To-dos' }))
    expect(await screen.findByRole('dialog', { name: 'Switch To-dos off?' })).toBeInTheDocument()
    expect(screen.getByText('Anything waiting in it stays as it is, and nobody can add to it until it is switched on again.')).toBeInTheDocument()
    expect(suitesApi.switch).not.toHaveBeenCalled()
  })

  it('confirming switches it off', async () => {
    open(GRACE, withOn('todos'))
    ;(suitesApi.switch as any).mockResolvedValue(GRACES)
    fireEvent.click(await screen.findByRole('switch', { name: 'To-dos' }))
    await screen.findByRole('dialog', { name: 'Switch To-dos off?' })
    fireEvent.click(screen.getByRole('button', { name: 'Switch it off' }))
    await waitFor(() => expect(suitesApi.switch).toHaveBeenCalledWith('todos', false, undefined))
  })

  it('"Cancel" on the confirmation leaves it on, and nothing is sent', async () => {
    open(GRACE, withOn('todos'))
    fireEvent.click(await screen.findByRole('switch', { name: 'To-dos' }))
    await screen.findByRole('dialog', { name: 'Switch To-dos off?' })
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(suitesApi.switch).not.toHaveBeenCalled()
    expect(within(card('To-dos')).getByRole('switch')).toHaveAttribute('aria-checked', 'true')
  })

  it('a switch that does not go through says so, in the server’s words or the product’s own', async () => {
    open(GRACE, GRACES)
    ;(suitesApi.switch as any).mockRejectedValue(new Error('network'))
    fireEvent.click(await screen.findByRole('switch', { name: 'To-dos' }))
    expect(await within(card('To-dos')).findByRole('alert')).toHaveTextContent('That did not go through, and nothing has changed. Try again.')
  })
})

/**
 * B-140: Kijani Foods has switched performance reviews on but never set how often, and the
 * switchboard still said "A review every 6 months..." as if it had - the same made-up cadence
 * B-119 already fixed on the reviews board itself. This asks the one extra call the reviews board
 * already makes (`GET /suites/reviews/board`) and swaps the sentence the same way.
 */
describe('B-140: the reviews card never states a cadence nobody has set', () => {
  it('drops the made-up "every 6 months" once the reviews suite is on and nothing was set', async () => {
    reviewsBoard.mockResolvedValue({ every: null, next: [] })
    open(GRACE, withOn('reviews'))
    const reviews = await screen.findByRole('region', { name: 'Performance reviews' })
    await waitFor(() => expect(within(reviews).queryByText(/A review every 6 months/)).toBeNull())
    expect(within(reviews).getByText('A review is built from what each person did and proved, with their own view beside it.')).toBeTruthy()
  })

  it('keeps the organisation’s own cadence once one has been set', async () => {
    reviewsBoard.mockResolvedValue({ every: 'Every 6 months', next: [] })
    open(GRACE, withOn('reviews'))
    const reviews = await screen.findByRole('region', { name: 'Performance reviews' })
    expect(await within(reviews).findByText('A review every 6 months, built from what each person did and proved, with their own view beside it.')).toBeTruthy()
  })
})

describe('Wairimu, a lead, reads the Suites page', () => {
  it('reads the prototype’s sentence and only the suites that are on, with no switches', async () => {
    open(WAIRIMU, WAIRIMUS)
    expect(await screen.findByText('The team tools your organisation has switched on. An admin switches them on or off.')).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { level: 3 }).map(h => h.textContent)).toEqual(['Time sheets', 'To-dos'])
    expect(card('Time sheets').textContent).toBe('Time sheetsPeople say how many hours they spent, and on which client or project. Used for billing only.Open its board')
    expect(screen.queryAllByRole('switch')).toHaveLength(0)
    expect(text()).not.toMatch(/Only admins see this page|Already part of Groundwork|\bOff\b/)
    /* U.17, time sheets and to-dos: both boards now exist, so both cards have the door. */
    expect(within(card('Time sheets')).getByRole('link', { name: 'Open its board' })).toHaveAttribute('href', '/suite/time')
    expect(within(card('To-dos')).getByRole('link', { name: 'Open its board' })).toHaveAttribute('href', '/suite/todos')
  })

  it('reads "Open its board" on onboarding, whose board is built', async () => {
    open(WAIRIMU, { reader: 'lead', suites: [...WAIRIMUS.suites, { key: 'onboard', name: 'Onboarding', line: 'A new person’s to-dos, and what each helper must do to set them up.' }] })
    expect(await within(await screen.findByRole('region', { name: 'Onboarding' })).findByRole('link', { name: 'Open its board' })).toHaveAttribute('href', '/suite/onboard')
    /* Onboarding, time sheets and, since U.17's to-dos, to-dos all have boards. */
    expect(screen.getAllByRole('link', { name: 'Open its board' })).toHaveLength(3)
  })

  it('says so plainly when none is on', async () => {
    open(WAIRIMU, { reader: 'lead', suites: [] })
    expect(await screen.findByText('None are switched on yet.')).toBeInTheDocument()
  })
})

describe('Miriam, a member, opens the address', () => {
  it('reads the server’s refusal, and nothing else', async () => {
    open(MIRIAM, Object.assign(new Error('403'), { response: { status: 403, data: { message: 'Only an admin or a lead can open the suites.' } } }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Only an admin or a lead can open the suites.')
    expect(screen.queryAllByRole('heading', { level: 3 })).toHaveLength(0)
  })

  it('a page that did not load says so, with a way to try again', async () => {
    open(MIRIAM, new Error('network'))
    expect(await screen.findByText('The suites did not load.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })
})

/* What a member who holds the HR duty is served: only the suites that duty sets up (decision 85). */
const JOYS: SuitesForADutyHolder = {
  reader: 'duty',
  people: [{ id: 'u-g', name: 'Grace Achieng' }, { id: 'u-k', name: 'Kamau Njenga' }],
  youSetUp: [
    suite('leave', 'Leave requests', 'People ask for time off in a check-in or chat. Groundwork checks their days left and who else is off.', { questions: LEAVE_QS }),
    suite('reviews', 'Performance reviews', 'A review every 6 months, built from what each person did and proved, with their own view beside it.', { on: true }),
  ],
}
const OMARS: SuitesForADutyHolder = {
  reader: 'duty', people: JOYS.people,
  youSetUp: [
    suite('spend', 'Spending and budgets', 'People ask to spend in chat. Groundwork checks the budget and sends it to the right person.', { on: true }),
    suite('time', 'Time sheets', 'People say how many hours they spent, and on which client or project. Used for billing only.'),
  ],
}
const JOY = { id: 'u-j', firstName: 'Joy', role: 'MEMBER', organizationName: 'Baridi Appliances' }

describe('Joy, a member who looks after HR, reads the Suites page', () => {
  it('reads a heading, a plain sentence about why, and the suites she sets up, not a blank page', async () => {
    open(JOY, JOYS)
    expect(await screen.findByRole('heading', { level: 2, name: 'Suites you set up' })).toBeInTheDocument()
    expect(screen.getByText('Your organisation has asked you to set up these suites. Answer the first questions to switch one on, and switch it off again whenever you need to.')).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { level: 3 }).map(h => h.textContent)).toEqual(['Leave requests', 'Performance reviews'])
    expect(card('Leave requests').textContent).toBe('Leave requestsPeople ask for time off in a check-in or chat. Groundwork checks their days left and who else is off.Off')
    expect(card('Performance reviews').textContent).toContain('On')
    expect(screen.getAllByRole('switch')).toHaveLength(2)
  })

  it('answers the first questions and switches leave on, with the same form an admin has', async () => {
    (suitesApi.switch as any).mockResolvedValue({ ...JOYS, youSetUp: [{ ...JOYS.youSetUp[0], on: true, answers: { days: 21, approver: 'Their manager' } }, JOYS.youSetUp[1]] })
    open(JOY, JOYS)
    await screen.findByRole('heading', { level: 2, name: 'Suites you set up' })
    fireEvent.click(within(card('Leave requests')).getByRole('switch', { name: 'Leave requests' }))
    expect(screen.getByText('Answer these first, and it switches on.')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('How many days of leave does each person have in a year?'), { target: { value: '21' } })
    fireEvent.change(screen.getByLabelText('Who approves a request for time off?'), { target: { value: 'Their manager' } })
    fireEvent.click(screen.getByRole('button', { name: 'Switch it on' }))
    await waitFor(() => expect(suitesApi.switch).toHaveBeenCalledWith('leave', true, { days: '21', approver: 'Their manager' }))
    await waitFor(() => expect(within(card('Leave requests')).getByRole('switch')).toHaveAttribute('aria-checked', 'true'))
  })
})

describe('Omar, a member who looks after finance, reads the Suites page', () => {
  it('reads spending and time sheets, and the spending door goes to the requests for finance', async () => {
    open({ ...JOY, id: 'u-o', firstName: 'Omar' }, OMARS)
    await screen.findByRole('heading', { level: 2, name: 'Suites you set up' })
    expect(screen.getAllByRole('heading', { level: 3 }).map(h => h.textContent)).toEqual(['Spending and budgets', 'Time sheets'])
    const door = within(card('Spending and budgets')).getByRole('link', { name: 'Open the requests for finance' })
    expect(door).toHaveAttribute('href', '/suite/spend/finance')
  })
})

describe('"Your own leave and spending requests", gated the same way as Today (fault 2, live re-walk)', () => {
  it('is not offered to an admin when both suites are off for them', async () => {
    (yourRequestsApi.leave as any).mockImplementation(suiteOff)
    ;(yourRequestsApi.spending as any).mockImplementation(suiteOff)
    open(GRACE, GRACES)
    await screen.findByRole('heading', { level: 2, name: 'People' })
    await new Promise(r => setTimeout(r, 10))
    expect(screen.queryByRole('link', { name: 'Your own leave and spending requests' })).toBeNull()
  })

  it('is offered to an admin once a suite answers for them', async () => {
    (yourRequestsApi.leave as any).mockResolvedValue({ daysLeftSaid: '12 days left', requests: [] })
    ;(yourRequestsApi.spending as any).mockImplementation(suiteOff)
    open(GRACE, GRACES)
    expect(await screen.findByRole('link', { name: 'Your own leave and spending requests' })).toHaveAttribute('href', '/suite/mine')
  })

  it('is not offered to a member the suites page otherwise refuses, while both are off', async () => {
    (yourRequestsApi.leave as any).mockImplementation(suiteOff)
    ;(yourRequestsApi.spending as any).mockImplementation(suiteOff)
    open(MIRIAM, Object.assign(new Error('403'), { response: { status: 403, data: { message: 'Only an admin or a lead can open the suites.' } } }))
    await screen.findByRole('alert')
    expect(screen.queryByRole('link', { name: 'Your own leave and spending requests' })).toBeNull()
  })

  it('is offered to that same member once a suite is on for them', async () => {
    (yourRequestsApi.leave as any).mockImplementation(suiteOff)
    ;(yourRequestsApi.spending as any).mockResolvedValue({ requests: [] })
    open(MIRIAM, Object.assign(new Error('403'), { response: { status: 403, data: { message: 'Only an admin or a lead can open the suites.' } } }))
    expect(await screen.findByRole('link', { name: 'Your own leave and spending requests' })).toHaveAttribute('href', '/suite/mine')
  })

  /*
   * FAULT 1 OF THE LIVE WALK (6 October): hours is gated the same way as leave and spending, and
   * the link is renamed "Your own requests" once hours answer, so "leave and spending" does not
   * leave hours unsaid.
   */
  it('is offered, and renamed "Your own requests", when only hours answers for a member', async () => {
    (yourRequestsApi.leave as any).mockImplementation(suiteOff)
    ;(yourRequestsApi.spending as any).mockImplementation(suiteOff)
    ;(yourRequestsApi.hours as any).mockResolvedValue({ weeks: [], standing: null })
    open(MIRIAM, Object.assign(new Error('403'), { response: { status: 403, data: { message: 'Only an admin or a lead can open the suites.' } } }))
    expect(await screen.findByRole('link', { name: 'Your own requests' })).toHaveAttribute('href', '/suite/mine')
    expect(screen.queryByRole('link', { name: 'Your own leave and spending requests' })).toBeNull()
  })
})

describe('Wairimu, a lead who also looks after HR, reads both', () => {
  it('reads the suites that are on for leads, then the suites she sets up', async () => {
    open(WAIRIMU, { ...WAIRIMUS, youSetUp: JOYS.youSetUp, people: JOYS.people })
    await screen.findByRole('heading', { level: 2, name: 'Suites you set up' })
    expect(screen.getAllByRole('heading', { level: 3 }).map(h => h.textContent)).toEqual(['Time sheets', 'To-dos', 'Leave requests', 'Performance reviews'])
  })
})
