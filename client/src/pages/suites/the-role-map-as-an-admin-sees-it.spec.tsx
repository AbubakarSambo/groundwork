import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RoleMapPage, inASentence } from './RoleMapPage'
import { useAuthStore } from '@/stores/auth'
import type { RoleMap } from '@/api/suites'

/**
 * THE ROLE MAP (E6, #/suite/roles), AS AN ADMIN SEES IT, AND WHAT EVERYBODY ELSE READS. Who is served
 * what is tested on the server (api/src/modules/suites/the-role-map-as-each-reader-reads-it.spec.ts).
 * Here: the prototype's words (suite-roles.txt), who holds each role, jobs nobody owns, and no label.
 */
vi.mock('@/api/suites', () => ({ roleMapApi: { get: vi.fn() } }))
import { roleMapApi } from '@/api/suites'

const MAP: RoleMap = {
  roles: [
    { name: 'Sales lead', owns: 'The sales target and the sales team', heldBy: ['Wairimu Kamau'] },
    { name: 'Head of operations', owns: 'People, pay, finance and credit terms', heldBy: ['Grace Achieng'] },
    { name: 'Sales rep', owns: 'Their own customers and deals', heldBy: ['A B', 'C D', 'E F', 'G H', 'I J', 'K L'] },
    { name: 'Stock planning', owns: 'Booking freezers before customers need them', heldBy: [] },
    { name: 'Operations lead', owns: null, heldBy: ['Kamau Njenga'] },
  ],
  nobody: [{ name: 'Stock planning', why: 'That is why Kwame waited three weeks for freezers.' }],
}
const GRACE = { id: 'u-g', firstName: 'Grace', role: 'ADMIN', organizationName: 'Baridi Appliances' }
const WAIRIMU = { id: 'u-w', firstName: 'Wairimu', role: 'LEAD', organizationName: 'Baridi Appliances' }

function open(user: any, served: RoleMap | Error) {
  if (served instanceof Error) (roleMapApi.get as any).mockRejectedValue(served)
  else (roleMapApi.get as any).mockResolvedValue(served)
  useAuthStore.setState({ user, token: 't', isAuthenticated: true } as any)
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/suite/roles']}><RoleMapPage /></MemoryRouter>
    </QueryClientProvider>,
  )
}
const refusal = (status: number, message: string) => Object.assign(new Error(String(status)), { response: { status, data: { message } } })
const rows = () => [...document.querySelectorAll('tbody tr')].map(tr => [...tr.children].map(c => c.textContent))

beforeEach(() => { vi.clearAllMocks() })

describe('Grace, an admin', () => {
  it('reads the way back, the heading and the prototype’s sentence', async () => {
    open(GRACE, MAP)
    expect(await screen.findByRole('table')).toBeInTheDocument()
    /* "Where you are" is the shared PageTitle crumb's own aria-label (group 2, piece 4 rebuild),
       in place of the page's prior "Breadcrumb". */
    expect(screen.getByRole('navigation', { name: 'Where you are' }).textContent).toBe('Suites/Role map')
    expect(screen.getByRole('heading', { level: 1, name: 'Role map' })).toBeInTheDocument()
    expect(screen.getByText('Every role, what it owns, and who holds it. It is built from your teams and people, and it shows jobs that nobody owns.')).toBeInTheDocument()
  })

  it('reads each role, what it owns, and who holds it, as the prototype writes them', async () => {
    open(GRACE, MAP)
    await screen.findByRole('table')
    expect([...document.querySelectorAll('thead th')].map(th => th.textContent)).toEqual(['Role', 'What it owns', 'Who holds it'])
    expect(rows()).toEqual([
      ['Sales lead', 'The sales target and the sales team', 'Wairimu Kamau'],
      ['Head of operations', 'People, pay, finance and credit terms', 'Grace Achieng'],
      ['Sales rep', 'Their own customers and deals', '6 people'],
      ['Stock planning', 'Booking freezers before customers need them', 'Nobody'],
      ['Operations lead', '', 'Kamau Njenga'],
    ])
  })

  it('reads each job nobody owns, and why it matters once Groundwork has written it', async () => {
    open(GRACE, MAP)
    expect(await screen.findByText('Nobody owns stock planning. That is why Kwame waited three weeks for freezers.')).toBeInTheDocument()
  })

  it('reads only "Nobody owns ..." before Groundwork has written why', async () => {
    open(GRACE, { ...MAP, nobody: [{ name: 'Stock planning', why: null }] })
    expect(await screen.findByText('Nobody owns stock planning.')).toBeInTheDocument()
  })

  it('is not offered a way to give a role an owner, or the role interview, which are not built', async () => {
    open(GRACE, MAP)
    await screen.findByRole('table')
    expect(screen.queryByText('Give it an owner')).toBeNull()
    expect(screen.queryByText('Send the role interview')).toBeNull()
    expect(screen.queryAllByRole('button')).toHaveLength(0)
  })

  it('reads a plain sentence when no role is known', async () => {
    open(GRACE, { roles: [], nobody: [] })
    expect(await screen.findByText('No roles are known yet.')).toBeInTheDocument()
  })

  it('no label on anybody', async () => {
    open(GRACE, MAP)
    await screen.findByRole('table')
    expect(document.body.textContent).not.toMatch(/\b(PIP|exit|at risk|score|rating)\b/i)
  })
})

describe('everybody else', () => {
  it('Wairimu, a lead, reads the server’s refusal', async () => {
    open(WAIRIMU, refusal(403, 'Only an admin can open this board.'))
    expect(await screen.findByRole('alert')).toHaveTextContent('Only an admin can open this board.')
    expect(screen.queryByRole('table')).toBeNull()
  })

  it('while the suite is off, the server says so', async () => {
    open(GRACE, refusal(404, 'The role map suite is not switched on.'))
    expect(await screen.findByRole('alert')).toHaveTextContent('The role map suite is not switched on.')
  })
})

describe('a role name inside a sentence', () => {
  it('starts small unless it is a short form such as CRM', () => {
    expect(inASentence('Stock planning')).toBe('stock planning')
    expect(inASentence('CRM lead')).toBe('CRM lead')
  })
})
