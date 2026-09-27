import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { LeaveBoardPage } from './LeaveBoardPage'
import { theDaysInFull, theDaysShort, whatToKnow } from './the-days-someone-is-off'
import { useAuthStore } from '@/stores/auth'
import type { LeaveBoard } from '@/api/suites'

/**
 * THE LEAVE BOARD (E2, #/suite/leave), AS EACH PERSON SEES IT. Who is served what is tested on the
 * server (api/src/modules/suites/the-leave-board-as-each-reader-reads-it.spec.ts). Here: what each
 * person reads, in the prototype's words (suite-leave.txt), and that only the approver is offered
 * Approve and Decline.
 */
vi.mock('@/api/suites', () => ({ leaveBoardApi: { get: vi.fn(), decide: vi.fn() } }))
import { leaveBoardApi } from '@/api/suites'

const AISHA = { id: 'r-aisha', name: 'Aisha Otieno', startsOn: '2026-10-01', endsOn: '2026-10-02', days: 2, daysLeft: 16, team: 'Sales', alsoOff: [], standIn: null, mayDecide: true }
const SAMUEL = { id: 'r-samuel', name: 'Samuel Njoroge', startsOn: '2026-10-05', endsOn: '2026-10-05', days: 1, daysLeft: null, team: 'Sales', alsoOff: ['Brian'], standIn: null, mayDecide: true }
const WAIRIMUS: LeaveBoard = {
  waiting: [AISHA, SAMUEL],
  off: [
    { id: 'o1', name: 'Brian Mwangi', startsOn: '2026-10-05', endsOn: '2026-10-05', kind: 'annual' },
    { id: 'o2', name: 'Grace Achieng', startsOn: '2026-10-08', endsOn: '2026-10-09', kind: 'annual' },
  ],
}
const KAMAUS: LeaveBoard = { waiting: [{ ...SAMUEL, id: 'r-otieno', name: 'Otieno Ouma', team: 'Operations', alsoOff: [], mayDecide: false }], off: [] }

const WAIRIMU = { id: 'u-w', firstName: 'Wairimu', role: 'LEAD', organizationName: 'Baridi Appliances' }
const KAMAU = { id: 'u-k', firstName: 'Kamau', role: 'LEAD', organizationName: 'Baridi Appliances' }
const AISHA_USER = { id: 'u-a', firstName: 'Aisha', role: 'MEMBER', organizationName: 'Baridi Appliances' }

function open(user: any, served: LeaveBoard | Error) {
  if (served instanceof Error) (leaveBoardApi.get as any).mockRejectedValue(served)
  else (leaveBoardApi.get as any).mockResolvedValue(served)
  useAuthStore.setState({ user, token: 't', isAuthenticated: true } as any)
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/suite/leave']}><LeaveBoardPage /></MemoryRouter>
    </QueryClientProvider>,
  )
}
const refusal = (status: number, message: string) => Object.assign(new Error(String(status)), { response: { status, data: { message } } })
const rows = () => [...document.querySelectorAll('.gw-leave-row')] as HTMLElement[]
const text = () => document.body.textContent ?? ''

beforeEach(() => { vi.clearAllMocks() })

describe('Wairimu, the lead who approves, reads the leave board', () => {
  it('reads the way back, the heading and the prototype’s sentence', async () => {
    open(WAIRIMU, WAIRIMUS)
    expect(await screen.findByRole('heading', { level: 2, name: 'Waiting for approval' })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' }).textContent).toBe('Suites / Leave requests')
    expect(screen.getByRole('heading', { level: 1, name: 'Leave requests' })).toBeInTheDocument()
    expect(screen.getByText('People ask for time off in their check-in or chat. Groundwork checks their balance and who else is off, and sends it to the right approver.')).toBeInTheDocument()
  })

  it('reads each request as the prototype has it, with Approve and Decline', async () => {
    open(WAIRIMU, WAIRIMUS)
    await screen.findByRole('heading', { level: 2, name: 'Waiting for approval' })
    expect(rows().map(r => [r.querySelector('b')?.textContent, r.querySelector('p')?.textContent])).toEqual([
      ['Aisha Otieno: Thursday 1 and Friday 2 October', '16 days left. Nobody else in Sales is off those days.'],
      ['Samuel Njoroge: Monday 5 October', 'Brian is also off that day, so Sales would be two short.'],
    ])
    expect(within(rows()[0]).getByRole('button', { name: 'Approve Aisha Otieno’s request' })).toHaveTextContent('Approve')
    expect(within(rows()[0]).getByRole('button', { name: 'Decline Aisha Otieno’s request' })).toHaveTextContent('Decline')
  })

  it('reads who is off in the next two weeks', async () => {
    open(WAIRIMU, WAIRIMUS)
    const region = await screen.findByRole('region', { name: 'Who’s off' })
    expect(within(region).getByText('The next two weeks')).toBeInTheDocument()
    expect([...region.querySelectorAll('li')].map(li => [...li.children].map(c => c.textContent))).toEqual([
      ['Brian Mwangi', 'Mon 5 Oct', 'Annual leave'],
      ['Grace Achieng', 'Thu 8 to Fri 9 Oct', 'Annual leave'],
    ])
  })

  it('approving sends it to the server, and the request leaves the list', async () => {
    open(WAIRIMU, WAIRIMUS)
    ;(leaveBoardApi.decide as any).mockResolvedValue({ ...WAIRIMUS, waiting: [SAMUEL] })
    fireEvent.click(await screen.findByRole('button', { name: 'Approve Aisha Otieno’s request' }))
    await waitFor(() => expect(leaveBoardApi.decide).toHaveBeenCalledWith('r-aisha', 'approve'))
    await waitFor(() => expect(rows()).toHaveLength(1))
  })

  it('a decision the server refuses says so, in its words', async () => {
    open(WAIRIMU, WAIRIMUS)
    ;(leaveBoardApi.decide as any).mockRejectedValue(refusal(400, 'This request has already been decided.'))
    fireEvent.click(await screen.findByRole('button', { name: 'Decline Aisha Otieno’s request' }))
    expect(await within(rows()[0]).findByRole('alert')).toHaveTextContent('This request has already been decided.')
  })

  it('never shows the prototype’s example chat, which is sample data', async () => {
    open(WAIRIMU, WAIRIMUS)
    await screen.findByRole('heading', { level: 2, name: 'Waiting for approval' })
    expect(text()).not.toMatch(/How people ask|I need next Thursday|Nobody fills in a form|WhatsApp/)
  })

  it('says so plainly when nothing is waiting and nobody is off', async () => {
    open(WAIRIMU, { waiting: [], off: [] })
    expect(await screen.findByText('Nothing is waiting for approval.')).toBeInTheDocument()
    expect(screen.getByText('Nobody is off in the next two weeks.')).toBeInTheDocument()
  })
})

describe('Kamau, a lead who does not approve Otieno’s request', () => {
  it('reads it, with no Approve or Decline', async () => {
    open(KAMAU, KAMAUS)
    await screen.findByRole('heading', { level: 2, name: 'Waiting for approval' })
    expect(rows()[0].querySelector('b')?.textContent).toBe('Otieno Ouma: Monday 5 October')
    expect(screen.queryByRole('button', { name: /Approve|Decline/ })).toBeNull()
  })
})

describe('Aisha, a colleague, opens the address', () => {
  it('reads the server’s refusal, and nothing else', async () => {
    open(AISHA_USER, refusal(403, 'Only an admin or a lead can open this board.'))
    expect(await screen.findByRole('alert')).toHaveTextContent('Only an admin or a lead can open this board.')
    expect(rows()).toHaveLength(0)
  })

  it('while the suite is off, everybody reads that', async () => {
    open(WAIRIMU, refusal(404, 'The leave suite is not switched on.'))
    expect(await screen.findByRole('alert')).toHaveTextContent('The leave suite is not switched on.')
  })
})

describe('the days, and the line under each request, in the prototype’s words', () => {
  it('say one day, two days together, a longer stretch, and a stretch across two months', () => {
    expect(theDaysInFull('2026-10-05', '2026-10-05')).toBe('Monday 5 October')
    expect(theDaysInFull('2026-10-01', '2026-10-02')).toBe('Thursday 1 and Friday 2 October')
    expect(theDaysInFull('2026-10-05', '2026-10-09')).toBe('Monday 5 to Friday 9 October')
    expect(theDaysInFull('2026-09-30', '2026-10-02')).toBe('Wednesday 30 September to Friday 2 October')
    expect(theDaysShort('2026-10-05', '2026-10-05')).toBe('Mon 5 Oct')
    expect(theDaysShort('2026-10-08', '2026-10-09')).toBe('Thu 8 to Fri 9 Oct')
  })

  it('name who else is off, the stand-in, and leave out what is not known', () => {
    expect(whatToKnow({ startsOn: '2026-10-05', endsOn: '2026-10-06', daysLeft: 1, team: 'Sales', alsoOff: ['Brian', 'Grace'], standIn: 'Miriam Wanjiku' }))
      .toBe('1 day left. Brian and Grace are also off those days, so Sales would be three short. Miriam Wanjiku stands in.')
    expect(whatToKnow({ startsOn: '2026-10-05', endsOn: '2026-10-05', daysLeft: null, team: null, alsoOff: [], standIn: null })).toBe('')
  })
})
