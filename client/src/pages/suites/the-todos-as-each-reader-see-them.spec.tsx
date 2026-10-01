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
 * (suite-todos.txt), word for word, for Grace (an admin) and Wairimu (a lead), and what everybody
 * else reads.
 */
vi.mock('@/api/suites', () => ({ todosApi: { get: vi.fn() } }))
import { todosApi } from '@/api/suites'

const GRACES: TodoList = {
  people: [
    { name: 'Aisha Otieno', todos: [{ id: 'c-3', text: 'Ask John Butchery’s owner for a buying date on Friday', source: 'check-in', on: '2026-09-23' }] },
    { name: 'Miriam Wanjiku', todos: [
      { id: 'c-1', text: 'Visit Westgate Deli on Friday', source: 'check-in', on: '2026-09-24' },
      { id: 'c-6', text: 'Finish the product course', source: 'check-in', on: '2026-09-20' },
    ] },
    { name: 'Wairimu Kamau', todos: [{ id: 'c-4', text: 'Decide whether a price range counts as money ready', source: 'check-in', on: '2026-09-24' }] },
  ],
}
const WAIRIMUS: TodoList = { people: [GRACES.people[0], { name: 'Miriam Wanjiku', todos: [GRACES.people[1].todos[0]] }, GRACES.people[2]] }

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
const lists = () => screen.getAllByRole('region').map(r => [
  within(r).getByRole('heading').textContent,
  [...r.querySelectorAll('li')].map(li => [li.querySelector('b')?.textContent, li.querySelector('p')?.textContent]),
])

beforeEach(() => { vi.clearAllMocks() })

describe('Grace, an admin', () => {
  it('reads the way back, the heading and the sentence', async () => {
    open(GRACE, GRACES)
    expect(await screen.findByRole('heading', { name: 'Miriam Wanjiku' })).toBeInTheDocument()
    /* "Where you are" is the shared PageTitle crumb's own aria-label (group 2, piece 4 rebuild),
       in place of the page's prior "Breadcrumb". */
    expect(screen.getByRole('navigation', { name: 'Where you are' }).textContent).toBe('Suites/To-dos')
    expect(screen.getByRole('heading', { level: 1, name: 'To-dos' })).toBeInTheDocument()
    expect(screen.getByText('Everything people said they will do in their check-ins, in one list for each person. Nobody has to write it down twice.')).toBeInTheDocument()
  })

  it('reads one list for each person, each line with where it came from and when', async () => {
    open(GRACE, GRACES)
    await screen.findByRole('heading', { name: 'Miriam Wanjiku' })
    expect(lists()).toEqual([
      ['Aisha Otieno', [['Ask John Butchery’s owner for a buying date on Friday', 'From a check-in, 23 September']]],
      ['Miriam Wanjiku', [
        ['Visit Westgate Deli on Friday', 'From a check-in, 24 September'],
        ['Finish the product course', 'From a check-in, 20 September'],
      ]],
      ['Wairimu Kamau', [['Decide whether a price range counts as money ready', 'From a check-in, 24 September']]],
    ])
  })

  it('cannot mark somebody else’s line done, and reads no chat example', async () => {
    open(GRACE, GRACES)
    await screen.findByRole('heading', { name: 'Miriam Wanjiku' })
    expect(screen.queryAllByRole('button')).toHaveLength(0)
    expect(screen.queryByText('Done')).toBeNull()
    expect(screen.queryByText('How people use it')).toBeNull()
  })

  it('reads a plain sentence when nobody has anything on their list', async () => {
    open(GRACE, { people: [] })
    expect(await screen.findByText('Nobody has anything on their list yet.')).toBeInTheDocument()
  })

  it('no label on anybody', async () => {
    open(GRACE, GRACES)
    await screen.findByRole('heading', { name: 'Miriam Wanjiku' })
    expect(document.body.textContent).not.toMatch(/\b(PIP|exit|at risk|score|rating)\b/i)
  })
})

describe('Wairimu, a lead', () => {
  it('reads only what the server gives her: her team and her own', async () => {
    open(WAIRIMU, WAIRIMUS)
    await screen.findByRole('heading', { name: 'Miriam Wanjiku' })
    expect(lists().map(([name, items]) => [name, (items as any[]).length])).toEqual([['Aisha Otieno', 1], ['Miriam Wanjiku', 1], ['Wairimu Kamau', 1]])
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
