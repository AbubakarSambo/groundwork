import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { LeaveBoardPage } from './LeaveBoardPage'
import { theDaysInFull, theDaysShort } from './the-days-someone-is-off'
import { useAuthStore } from '@/stores/auth'
import type { LeaveBoard } from '@/api/suites'

/**
 * THE LEAVE BOARD (E2, #/suite/leave), AS EACH PERSON SEES IT. Who is served what is tested on the
 * server (api/src/modules/suites/the-leave-board-as-each-reader-reads-it.spec.ts). Here: what each
 * person reads, in the prototype's words (suite-leave.txt), and that only the approver is offered
 * Approve and Decline.
 */
/* Changed 22 November 2026: the page reads, on /suites/mine, whether the suite is on and whether this reader may open the board, before asking for it. */
vi.mock('@/api/suites', () => ({ leaveBoardApi: { get: vi.fn(), decide: vi.fn(), ask: vi.fn() }, suitesApi: { mine: vi.fn(async () => ({ leave: true, spend: true, time: true, reviews: true, any: true, says: '', maySeeSuites: true, mayOpenTheLeaveBoard: true })) } }))
import { leaveBoardApi } from '@/api/suites'

/* The shape and the sentences the server writes (the-leave-board.service.ts, a-leave-request-as-the-approver-reads-it.ts). */
const AISHA = {
  id: 'r-aisha', name: 'Aisha Otieno', startsOn: '2026-10-01', endsOn: '2026-10-02', days: 2, daysLeft: 16, team: 'Sales', alsoOff: [], standIn: null, mayDecide: true,
  leaveKind: null, rules: [], where: 'It is waiting for you.',
  owns: ['Aisha owns “Project X milestone” on Sales, Q3, due on Thursday 15 October.'], questions: [],
  said: [
    'Aisha asked for leave from Thursday 1 October to Friday 2 October, which is 2 working days.',
    'Aisha has 16 days left.',
    'Nobody else in Sales is off those days.',
    'Aisha owns “Project X milestone” on Sales, Q3, due on Thursday 15 October.',
  ],
}
const SAMUEL = {
  id: 'r-samuel', name: 'Samuel Njoroge', startsOn: '2026-10-05', endsOn: '2026-10-05', days: 1, daysLeft: null, team: 'Sales', alsoOff: ['Brian'], standIn: null, mayDecide: true,
  leaveKind: null, rules: [], where: 'Wairimu has approved it, and it is now waiting for you.', owns: [], questions: [],
  said: ['Samuel asked for leave on Monday 5 October, which is 1 working day.', 'Brian is also off that day, so Sales would be two short.'],
}
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
/* "Waiting for approval" is now the shared RowList's own list (group 2, piece 4 rebuild), in place
   of the page's prior .gw-leave-row class - found by its list's accessible name instead. */
const rows = () => {
  const list = screen.queryByRole('list', { name: 'Waiting for approval' })
  return list ? ([...list.querySelectorAll('li')] as HTMLElement[]) : []
}
const text = () => document.body.textContent ?? ''

beforeEach(() => { vi.clearAllMocks() })

describe('Wairimu, the lead who approves, reads the leave board', () => {
  it('reads the way back, the heading and the prototype’s sentence', async () => {
    open(WAIRIMU, WAIRIMUS)
    expect(await screen.findByRole('heading', { level: 2, name: 'Waiting for approval' })).toBeInTheDocument()
    /* "Where you are" is the shared PageTitle crumb's own aria-label (group 2, piece 4 rebuild),
       in place of the page's prior "Breadcrumb". */
    expect(screen.getByRole('navigation', { name: 'Where you are' }).textContent).toBe('Suites/Leave requests')
    expect(screen.getByRole('heading', { level: 1, name: 'Leave requests' })).toBeInTheDocument()
    expect(screen.getByText('People ask for time off in their check-in or chat. Groundwork checks their balance and who else is off, and sends it to the right approver.')).toBeInTheDocument()
  })

  /*
   * Fault 5 of the live walk: said[0] ("Aisha asked for leave from ... which is 2 working days.")
   * repeats the same dates the bold title above it already gives, as a second sentence under the
   * same title. It is dropped here, so each row's dates are said once.
   */
  it('reads each request as the prototype has it, with Approve and Decline', async () => {
    open(WAIRIMU, WAIRIMUS)
    await screen.findByRole('heading', { level: 2, name: 'Waiting for approval' })
    expect(rows().map(r => [r.querySelector('b')?.textContent, [...r.querySelectorAll('p')].map(p => p.textContent)])).toEqual([
      ['Aisha Otieno: Thursday 1 and Friday 2 October', ['It is waiting for you.', ...AISHA.said.slice(1)]],
      ['Samuel Njoroge: Monday 5 October', ['Wairimu has approved it, and it is now waiting for you.', ...SAMUEL.said.slice(1)]],
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
    /* Decline now asks "Say why" first, as spending does (live walk); the decline is sent from there. */
    fireEvent.click(within(rows()[0]).getByRole('button', { name: 'Decline' }))
    expect(await within(rows()[0]).findByRole('alert')).toHaveTextContent('This request has already been decided.')
  })

  it('asks why before declining, and sends what was said as the reason the person is told', async () => {
    open(WAIRIMU, WAIRIMUS)
    ;(leaveBoardApi.decide as any).mockResolvedValue({ ...WAIRIMUS, waiting: [SAMUEL] })
    fireEvent.click(await screen.findByRole('button', { name: 'Decline Aisha Otieno’s request' }))
    expect(leaveBoardApi.decide).not.toHaveBeenCalled()
    fireEvent.change(screen.getByLabelText('Say why (optional)'), { target: { value: 'Two of the team are already off that week.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Decline' }))
    await waitFor(() => expect(leaveBoardApi.decide).toHaveBeenCalledWith('r-aisha', 'decline', 'Two of the team are already off that week.'))
  })

  /*
   * Fault 5 of the live walk: "How people ask" dropped the prototype's own example chat. It is back
   * now, drawn with the shared Bubble, but never with a real person from this organisation in it -
   * the prototype's own "Wairimu" becomes the neutral "your manager" (Wairimu is this organisation's
   * own lead in this test, so the old text would have named a real colleague).
   */
  it('says where people ask, with the prototype’s example chat, in neutral words, never a real colleague’s name', async () => {
    open(WAIRIMU, WAIRIMUS)
    const how = await screen.findByRole('region', { name: 'How people ask' })
    expect(within(how).getByText('I need next Thursday and Friday off.')).toBeInTheDocument()
    expect(within(how).getByText('You have 16 days left and nobody else in your team is off then. Shall I send it to your manager?')).toBeInTheDocument()
    /* Batch S, round 2 (W16): there is a form beside it, so the page no longer says nobody fills one in. */
    expect(within(how).getByText('In their check-in, in chat, on WhatsApp, or with the Request leave form.')).toBeInTheDocument()
    expect(how.textContent).not.toContain('Wairimu')
  })

  it('a request waiting for finance never says the lead can approve it: the server’s sentence is drawn', async () => {
    open(KAMAU, { waiting: [{ ...SAMUEL, id: 'r-w', name: 'Otieno Ouma', mayDecide: false, where: 'Wairimu has approved it, and it is now waiting for Omar in finance.' }], off: [] })
    await screen.findByRole('heading', { level: 2, name: 'Waiting for approval' })
    expect(rows()[0].textContent).toContain('Wairimu has approved it, and it is now waiting for Omar in finance.')
    expect(rows()[0].textContent).not.toMatch(/lead can approve/)
  })

  it('reads the kind of leave beside the request, what the person owns, and each question with its answer', async () => {
    open(WAIRIMU, { waiting: [{
      ...AISHA, leaveKind: 'Sick leave',
      questions: ['You asked Aisha on 5 October, “Who will cover the milestone?”', 'Aisha answered on 6 October, “Brian will.”'],
      said: [...AISHA.said, 'You asked Aisha on 5 October, “Who will cover the milestone?”', 'Aisha answered on 6 October, “Brian will.”'],
    }], off: [] })
    await screen.findByRole('heading', { level: 2, name: 'Waiting for approval' })
    const row = rows()[0]
    expect(within(row).getByText('Sick leave')).toBeInTheDocument()
    expect(within(row).getByText('Aisha owns “Project X milestone” on Sales, Q3, due on Thursday 15 October.')).toBeInTheDocument()
    expect(within(row).getByText('You asked Aisha on 5 October, “Who will cover the milestone?”')).toBeInTheDocument()
    expect(within(row).getByText('Aisha answered on 6 October, “Brian will.”')).toBeInTheDocument()
    expect(text()).not.toContain('Annual leave')
  })

  it('asks the person a question, and reads the server’s board with the question in it', async () => {
    open(WAIRIMU, WAIRIMUS)
    const after = { ...WAIRIMUS, waiting: [{ ...AISHA, said: [...AISHA.said, 'You asked Aisha on 4 October, “Who will cover the milestone?”'] }, SAMUEL] }
    ;(leaveBoardApi.ask as any).mockResolvedValue(after)
    await screen.findByRole('heading', { level: 2, name: 'Waiting for approval' })
    fireEvent.click(within(rows()[0]).getByRole('button', { name: 'Ask Aisha Otieno a question' }))
    const send = within(rows()[0]).getByRole('button', { name: 'Send the question' })
    expect(send).toBeDisabled()
    fireEvent.change(within(rows()[0]).getByLabelText('Your question'), { target: { value: 'Who will cover the milestone?' } })
    fireEvent.click(send)
    await waitFor(() => expect(leaveBoardApi.ask).toHaveBeenCalledWith('r-aisha', 'Who will cover the milestone?'))
    expect(await within(rows()[0]).findByText('You asked Aisha on 4 October, “Who will cover the milestone?”')).toBeInTheDocument()
  })

  it('offers no question where the reader does not decide', async () => {
    open(KAMAU, KAMAUS)
    await screen.findByRole('heading', { level: 2, name: 'Waiting for approval' })
    expect(screen.queryByRole('button', { name: /question/i })).toBeNull()
  })

  it('who is off reads the kind of leave the server names, and Annual leave only when it names none', async () => {
    open(WAIRIMU, { waiting: [], off: [
      { id: 'o1', name: 'Brian Mwangi', startsOn: '2026-10-05', endsOn: '2026-10-05', kind: 'sick', kindName: 'Sick leave' },
      { id: 'o2', name: 'Grace Achieng', startsOn: '2026-10-08', endsOn: '2026-10-09', kind: 'annual' },
    ] })
    const region = await screen.findByRole('region', { name: 'Who’s off' })
    expect([...region.querySelectorAll('li')].map(li => [...li.children].map(c => c.textContent))).toEqual([
      ['Brian Mwangi', 'Mon 5 Oct', 'Sick leave'],
      ['Grace Achieng', 'Thu 8 to Fri 9 Oct', 'Annual leave'],
    ])
  })

  it('Joy, who looks after HR, reads the leave she is told about, in the server’s sentences, and nothing to decide', async () => {
    open({ id: 'u-j', firstName: 'Joy', role: 'MEMBER', organizationName: 'Baridi Appliances' }, {
      reader: 'hr', waiting: [], off: [],
      toldToHr: [{
        id: 'r-aisha', name: 'Aisha Otieno', startsOn: '2026-10-08', endsOn: '2026-10-09', status: 'approved', kindName: 'Annual leave',
        said: ['Aisha Otieno asked for annual leave from Thursday 8 October to Friday 9 October, which is 2 working days.', 'Wairimu approved it.'],
      }],
    })
    const region = await screen.findByRole('region', { name: 'Leave you are told about' })
    expect(within(region).getByText('Because you look after HR.')).toBeInTheDocument()
    expect(within(region).getByText('Aisha Otieno: Thursday 8 and Friday 9 October')).toBeInTheDocument()
    /* said[0] ("Aisha Otieno asked for annual leave from ... which is 2 working days.") repeats the
       title above it, so it is dropped here too (fault 5). */
    expect(within(region).queryByText('Aisha Otieno asked for annual leave from Thursday 8 October to Friday 9 October, which is 2 working days.')).toBeNull()
    expect(within(region).getByText('Wairimu approved it.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Approve|Decline/ })).toBeNull()
  })

  it('draws no "Leave you are told about" for a reader the server sends none to', async () => {
    open(WAIRIMU, WAIRIMUS)
    await screen.findByRole('heading', { level: 2, name: 'Waiting for approval' })
    expect(screen.queryByRole('region', { name: 'Leave you are told about' })).toBeNull()
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

describe('the days, in the prototype’s words', () => {
  it('say one day, two days together, a longer stretch, and a stretch across two months', () => {
    expect(theDaysInFull('2026-10-05', '2026-10-05')).toBe('Monday 5 October')
    expect(theDaysInFull('2026-10-01', '2026-10-02')).toBe('Thursday 1 and Friday 2 October')
    expect(theDaysInFull('2026-10-05', '2026-10-09')).toBe('Monday 5 to Friday 9 October')
    expect(theDaysInFull('2026-09-30', '2026-10-02')).toBe('Wednesday 30 September to Friday 2 October')
    expect(theDaysShort('2026-10-05', '2026-10-05')).toBe('Mon 5 Oct')
    expect(theDaysShort('2026-10-08', '2026-10-09')).toBe('Thu 8 to Fri 9 Oct')
  })
})
