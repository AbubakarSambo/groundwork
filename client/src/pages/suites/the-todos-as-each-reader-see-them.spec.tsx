import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TodosPage } from './TodosPage'
import { useAuthStore } from '@/stores/auth'
import type { TodoList } from '@/api/suites'

/**
 * TO-DOS (E8, #/suite/todos), AS EACH READER SEES THEM. Who is served what is tested on the server
 * (api/src/modules/suites/the-todos-as-each-reader-reads-them.spec.ts). Here: the prototype's words
 * (suite-todos.txt), word for word except where decision 110 (P8) or item 28 rules them out, for
 * Grace (an admin) and Wairimu (a lead), and what everybody else reads.
 *
 * DECISION 110, P8 (docs/known-issues.md): this board groups by check-in, never by person, since a
 * person's load across check-ins is private even from an admin. These tests were pinned to one
 * section per person before that decision; they are rewritten here to check one section per
 * check-in, and to prove nobody reads a heading, count or section that gathers one person's
 * to-dos across more than one check-in.
 */
vi.mock('@/api/suites', () => ({ todosApi: { get: vi.fn() } }))
import { todosApi } from '@/api/suites'

const GRACES: TodoList = {
  people: [
    { name: 'Aisha Otieno', firstName: 'Aisha', todos: [{ id: 'c-3', text: 'Ask John Butchery’s owner for a buying date on Friday', source: 'check-in', on: '2026-09-23', checkIn: 'Sales team, Q3' }] },
    { name: 'Miriam Wanjiku', firstName: 'Miriam', todos: [
      { id: 'c-1', text: 'Visit Westgate Deli on Friday', source: 'check-in', on: '2026-09-24', checkIn: 'Sales team, Q3' },
      { id: 'c-6', text: 'Finish the product course', source: 'check-in', on: '2026-09-20', checkIn: 'Product course' },
    ] },
    { name: 'Wairimu Kamau', firstName: 'Wairimu', todos: [{ id: 'c-4', text: 'Decide whether a price range counts as money ready', source: 'check-in', on: '2026-09-24', checkIn: 'Sales team, Q3' }] },
  ],
}
const WAIRIMUS: TodoList = { people: [GRACES.people![0], { name: 'Miriam Wanjiku', firstName: 'Miriam', todos: [GRACES.people![1].todos[0]] }, GRACES.people![2]] }

const GRACE = { id: 'u-g', firstName: 'Grace', role: 'ADMIN', organizationName: 'Baridi Appliances' }
const WAIRIMU = { id: 'u-w', firstName: 'Wairimu', role: 'LEAD', organizationName: 'Baridi Appliances' }
const MIRIAM = { id: 'u-m', firstName: 'Miriam', role: 'MEMBER', organizationName: 'Baridi Appliances' }

function open(user: any, served: TodoList | Error) {
  if (served instanceof Error) (todosApi.get as any).mockRejectedValue(served)
  else (todosApi.get as any).mockResolvedValue(served)
  useAuthStore.setState({ user, token: 't', isAuthenticated: true } as any)
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/suite/todos']}><TodosPage /></MemoryRouter>
    </QueryClientProvider>,
  )
}
const refusal = (status: number, message: string) => Object.assign(new Error(String(status)), { response: { status, data: { message } } })
const sections = () => screen.getAllByRole('region').map(r => [
  within(r).getByRole('heading').textContent,
  [...r.querySelectorAll('li')].map(li => li.textContent),
])

beforeEach(() => { vi.clearAllMocks() })

describe('Grace, an admin', () => {
  it('reads the way back, the heading and the subtitle', async () => {
    open(GRACE, GRACES)
    expect(await screen.findByRole('heading', { name: 'Sales team, Q3' })).toBeInTheDocument()
    /* "Where you are" is the shared PageTitle crumb's own aria-label (group 2, piece 4 rebuild),
       in place of the page's prior "Breadcrumb". */
    expect(screen.getByRole('navigation', { name: 'Where you are' }).textContent).toBe('Suites/To-dos')
    expect(screen.getByRole('heading', { level: 1, name: 'To-dos' })).toBeInTheDocument()
    expect(screen.getByText('Everything people said they will do, in each check-in. Nobody has to write it down twice.')).toBeInTheDocument()
  })

  it('groups by check-in, never by person: one section per check-in, each person’s to-dos split across them', async () => {
    open(GRACE, GRACES)
    await screen.findByRole('heading', { name: 'Sales team, Q3' })
    expect(sections()).toEqual([
      ['Sales team, Q3', [
        'Aisha said they would ask John Butchery’s owner for a buying date on Friday, on 23 September.',
        'Miriam said they would visit Westgate Deli on Friday, on 24 September.',
        'Wairimu said they would decide whether a price range counts as money ready, on 24 September.',
      ]],
      ['Product course', ['Miriam said they would finish the product course, on 20 September.']],
    ])
  })

  it('no section, heading or count is headed by a person’s name', async () => {
    open(GRACE, GRACES)
    await screen.findByRole('heading', { name: 'Sales team, Q3' })
    for (const name of ['Aisha Otieno', 'Miriam Wanjiku', 'Wairimu Kamau']) {
      expect(screen.queryByRole('heading', { name })).toBeNull()
    }
  })

  it('Miriam’s to-dos in two check-ins appear under the two check-ins, never gathered together', async () => {
    open(GRACE, GRACES)
    await screen.findByRole('heading', { name: 'Sales team, Q3' })
    const salesSection = screen.getByRole('heading', { name: 'Sales team, Q3' }).closest('section')!
    const courseSection = screen.getByRole('heading', { name: 'Product course' }).closest('section')!
    expect(within(salesSection).getByText(/Miriam said they would visit Westgate Deli/)).toBeInTheDocument()
    expect(within(courseSection).getByText(/Miriam said they would finish the product course/)).toBeInTheDocument()
    expect(within(salesSection).queryByText(/finish the product course/)).toBeNull()
    expect(within(courseSection).queryByText(/visit Westgate Deli/)).toBeNull()
  })

  /* The re-review: when the check-in's own name already ends with the same date ("Help a new hire
     get started, from 27 September"), ", on 27 September" is not said again. */
  it('does not say the date twice when the check-in’s own name already ends with it', async () => {
    open(GRACE, {
      people: [{ name: 'Juma Kariuki', firstName: 'Juma', todos: [
        { id: 'j-1', text: 'Ride Ngong Road with him again', source: 'check-in', on: '2026-09-27', checkIn: 'Help a new hire get started, from 27 September' },
      ] }],
    })
    await screen.findByRole('heading', { name: 'Help a new hire get started, from 27 September' })
    expect(screen.getByText('Juma said they would ride Ngong Road with him again.')).toBeInTheDocument()
  })

  it('draws the engine’s served shape, one list for each check-in with its people (7 October answer)', async () => {
    open(GRACE, {
      checkIns: [
        { id: 'ci-1', label: 'Sales team, Q3', people: [
          { name: 'Miriam Wanjiku', firstName: 'Miriam', todos: [{ id: 'c-1', text: 'Visit Westgate Deli on Friday', source: 'check-in', on: '2026-09-24', checkIn: 'Sales team, Q3' }] },
        ] },
        { id: 'ci-2', label: 'Product course', people: [
          { name: 'Miriam Wanjiku', firstName: 'Miriam', todos: [{ id: 'c-6', text: 'Finish the product course', source: 'check-in', on: '2026-09-20', checkIn: 'Product course' }] },
        ] },
      ],
    })
    await screen.findByRole('heading', { name: 'Sales team, Q3' })
    expect(sections()).toEqual([
      ['Sales team, Q3', ['Miriam said they would visit Westgate Deli on Friday, on 24 September.']],
      ['Product course', ['Miriam said they would finish the product course, on 20 September.']],
    ])
  })

  it('cannot mark somebody else’s line done, and reads no chat example', async () => {
    open(GRACE, GRACES)
    await screen.findByRole('heading', { name: 'Sales team, Q3' })
    expect(screen.queryAllByRole('button')).toHaveLength(0)
    expect(screen.queryByText('Done')).toBeNull()
    expect(screen.queryByText('How people use it')).toBeNull()
  })

  /*
   * FAULT 4 OF THE LIVE WALK (6 October, decision 110, P8): "Nobody has anything on their list yet."
   * reads as a list kept for each person, which this board must never be (decision 110 keeps a
   * person's load across check-ins private, even from an admin). Changed to say what is actually
   * true: no check-in has a to-do in it yet.
   */
  it('reads a plain sentence when no check-in has a to-do', async () => {
    open(GRACE, { people: [] })
    expect(await screen.findByText('No check-in has a to-do yet.')).toBeInTheDocument()
    expect(screen.queryByText('Nobody has anything on their list yet.')).toBeNull()
  })

  it('no label on anybody', async () => {
    open(GRACE, GRACES)
    await screen.findByRole('heading', { name: 'Sales team, Q3' })
    expect(document.body.textContent).not.toMatch(/\b(PIP|exit|at risk|score|rating)\b/i)
  })
})

describe('Wairimu, a lead', () => {
  it('reads only what the server gives her: her team and her own, still grouped by check-in', async () => {
    open(WAIRIMU, WAIRIMUS)
    await screen.findByRole('heading', { name: 'Sales team, Q3' })
    expect(sections().map(([name, items]) => [name, (items as any[]).length])).toEqual([['Sales team, Q3', 3]])
    expect(screen.queryByText(/Product course/)).toBeNull()
    expect(screen.queryByText('Finish the product course')).toBeNull()
  })
})

describe('everybody else', () => {
  it('Miriam, a member, reads the server’s refusal', async () => {
    open(MIRIAM, refusal(403, 'Only an admin or a lead can open this board.'))
    expect(await screen.findByRole('alert')).toHaveTextContent('Only an admin or a lead can open this board.')
  })

  it('while the suite is off, the server says so', async () => {
    open(GRACE, refusal(404, 'The to-dos suite is not switched on.'))
    expect(await screen.findByRole('alert')).toHaveTextContent('The to-dos suite is not switched on.')
  })
})
