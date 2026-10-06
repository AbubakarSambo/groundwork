import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TimeSheetsPage } from './TimeSheetsPage'
import { useAuthStore } from '@/stores/auth'
import type { TimeBoard } from '@/api/suites'

/**
 * TIME SHEETS (E3, #/suite/time), AS EACH PERSON SEES THEM. Who is served what is tested on the server
 * (api/src/modules/suites/the-time-sheets-as-each-reader-reads-them.spec.ts). Here: what each person
 * reads, in the prototype's words (suite-time.txt), that only the approver is offered Approve, and that
 * nothing rates how much anybody works.
 */
vi.mock('@/api/suites', () => ({ timeSheetsApi: { get: vi.fn(), approve: vi.fn() } }))
import { timeSheetsApi } from '@/api/suites'

const H = 60
const row = (personId: string, name: string, n: number, l: number, g: number, over: any = {}) =>
  ({ personId, name, minutes: { Naivas: n * H, Lakeside: l * H, 'Green Mart': g * H }, total: (n + l + g) * H, approved: false, mayApprove: true, ...over })
const THIS_WEEK = { weekOf: '2026-09-21', clients: ['Naivas', 'Lakeside', 'Green Mart'], people: [
  row('u-a', 'Aisha Otieno', 14, 6, 2),
  row('u-b', 'Brian Mwangi', 9, 12, 0),
  row('u-m', 'Miriam Wanjiku', 18, 0, 4, { approved: true }),
] }
const GRACES: TimeBoard = {
  thisWeek: '2026-09-21',
  weeks: [THIS_WEEK],
  agreements: [
    { client: 'Naivas Ngong Road', work: 'installing 12 freezers', hours: 40, span: 'whole', usedMinutes: 47 * H },
    { client: 'Lakeside', work: 'maintenance', hours: 60, span: 'month', usedMinutes: 32 * H },
  ],
}
const WAIRIMUS: TimeBoard = { ...GRACES, agreements: null }

const GRACE = { id: 'u-g', firstName: 'Grace', role: 'ADMIN', organizationName: 'Baridi Appliances' }
const WAIRIMU = { id: 'u-w', firstName: 'Wairimu', role: 'LEAD', organizationName: 'Baridi Appliances' }
const MIRIAM = { id: 'u-m', firstName: 'Miriam', role: 'MEMBER', organizationName: 'Baridi Appliances' }

function open(user: any, served: TimeBoard | Error) {
  if (served instanceof Error) (timeSheetsApi.get as any).mockRejectedValue(served)
  else (timeSheetsApi.get as any).mockResolvedValue(served)
  useAuthStore.setState({ user, token: 't', isAuthenticated: true } as any)
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/suite/time']}><TimeSheetsPage /></MemoryRouter>
    </QueryClientProvider>,
  )
}
const refusal = (status: number, message: string) => Object.assign(new Error(String(status)), { response: { status, data: { message } } })
const cells = (tr: Element) => [...tr.children].map(c => c.textContent)
const text = () => document.body.textContent ?? ''

beforeEach(() => { vi.clearAllMocks() })

describe('Grace, an admin, reads time sheets', () => {
  it('reads the way back, the heading, the sentence, and that hours are for billing only', async () => {
    open(GRACE, GRACES)
    await screen.findByRole('heading', { level: 2, name: 'This week’s hours, waiting for approval' })
    /* "Where you are" is the shared PageTitle crumb's own aria-label (group 2, piece 4 rebuild),
       in place of the page's prior "Breadcrumb". */
    expect(screen.getByRole('navigation', { name: 'Where you are' }).textContent).toBe('Suites/Time sheets')
    expect(screen.getByRole('heading', { level: 1, name: 'Time sheets' })).toBeInTheDocument()
    expect(screen.getByText('Hours spent on each client or project, ready for billing. People tell Groundwork their hours in their check-in or in chat. There is no grid to fill in.')).toBeInTheDocument()
    expect(screen.getByText('Hours are for billing only.')).toBeInTheDocument()
    expect(screen.getByText('They never appear in anyone’s check-in report, their signals or a review. Being busy is not the same as making progress.')).toBeInTheDocument()
  })

  it('reads the week as the prototype’s table, with Approve or Approved', async () => {
    open(GRACE, GRACES)
    const region = await screen.findByRole('region', { name: 'This week’s hours, waiting for approval' })
    expect(within(region).getByText('Week of 21 September')).toBeInTheDocument()
    const trs = [...region.querySelectorAll('tr')]
    expect(cells(trs[0])).toEqual(['Person', 'Naivas', 'Lakeside', 'Green Mart', 'Total', 'Approval'])
    /*
     * FAULT 3 OF THE LIVE WALK (6 October): each stacked cell now carries its own visible label
     * (NaivasLakesideGreen MartTotal prefixed, as ReviewsBoardPage's table already does), so a row
     * read with no client names beside its hours is fixed the same way. The labels are read here
     * too, since `cells` reads each cell's whole text content.
     */
    expect(cells(trs[1])).toEqual(['Aisha Otieno', 'Naivas14 h', 'Lakeside6 h', 'Green Mart2 h', 'Total22 h', 'Approve'])
    expect(cells(trs[2])).toEqual(['Brian Mwangi', 'Naivas9 h', 'Lakeside12 h', 'Green Mart0 h', 'Total21 h', 'Approve'])
    expect(cells(trs[3])).toEqual(['Miriam Wanjiku', 'Naivas18 h', 'Lakeside0 h', 'Green Mart4 h', 'Total22 h', 'Approved'])
  })

  it('each stacked value carries its own visible label, marked aria-hidden since a screen reader already has the real column headers (fault 3 of the live walk)', async () => {
    open(GRACE, GRACES)
    const region = await screen.findByRole('region', { name: 'This week’s hours, waiting for approval' })
    const labels = [...region.querySelectorAll('.gwui-record-table-label')]
    expect(labels.map(l => l.textContent)).toEqual(['Naivas', 'Lakeside', 'Green Mart', 'Total', 'Naivas', 'Lakeside', 'Green Mart', 'Total', 'Naivas', 'Lakeside', 'Green Mart', 'Total'])
    expect(labels.every(l => l.getAttribute('aria-hidden') === 'true')).toBe(true)
  })

  /*
   * FAULT 2 OF THE LIVE WALK (6 October): a reader who reads this row but neither approves it
   * themselves nor already sees it marked Approved used to read a blank last cell - the server's
   * own sentence for where it stands was served (`where`) but never drawn.
   */
  it('reads the server’s own sentence in the last cell when this reader neither approves it nor sees it approved', async () => {
    open(WAIRIMU, { ...WAIRIMUS, weeks: [{ ...THIS_WEEK, people: [{ ...THIS_WEEK.people[0], mayApprove: false, where: 'They are waiting for Daniel.' }] }] })
    expect(await screen.findByText('They are waiting for Daniel.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Approve Aisha Otieno’s hours' })).toBeNull()
  })

  it('reads the hours against what each client agreed, and what to do about one that is over', async () => {
    open(GRACE, GRACES)
    const region = await screen.findByRole('region', { name: 'Hours against what each client agreed' })
    expect([...region.querySelectorAll('li')].map(li => [li.querySelector('b')?.textContent, li.lastElementChild?.textContent])).toEqual([
      ['Naivas Ngong Road: installing 12 freezers (whole job)', '47 of 40 hours, over'],
      ['Lakeside: maintenance (this month)', '32 of 60 hours'],
    ])
    expect(within(region).getByText('Naivas Ngong Road is 7 hours over the 40 the client agreed. Somebody should talk to them before more work is done.')).toBeInTheDocument()
  })

  it('approving sends it to the server and the row says Approved', async () => {
    open(GRACE, GRACES)
    ;(timeSheetsApi.approve as any).mockResolvedValue({ ...GRACES, weeks: [{ ...THIS_WEEK, people: THIS_WEEK.people.map(p => (p.personId === 'u-a' ? { ...p, approved: true } : p)) }] })
    fireEvent.click(await screen.findByRole('button', { name: 'Approve Aisha Otieno’s hours' }))
    await waitFor(() => expect(timeSheetsApi.approve).toHaveBeenCalledWith('2026-09-21', 'u-a'))
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Approve Aisha Otieno’s hours' })).toBeNull())
  })

  it('an earlier week still waiting is shown too, with its own week', async () => {
    open(GRACE, { ...GRACES, weeks: [{ ...THIS_WEEK, weekOf: '2026-09-14' }, THIS_WEEK] })
    const earlier = await screen.findByRole('region', { name: 'Hours still waiting for approval' })
    expect(within(earlier).getByText('Week of 14 September')).toBeInTheDocument()
  })

  it('never shows the example chat, and nothing rates how much anybody works', async () => {
    open(GRACE, GRACES)
    await screen.findByRole('heading', { level: 2, name: 'This week’s hours, waiting for approval' })
    expect(text()).not.toMatch(/How people use it|I spent 3 hours|Written down|busiest|most hours|average|rank/i)
  })

  it('says so plainly when no hours have come in this week', async () => {
    open(GRACE, { thisWeek: '2026-09-21', weeks: [], agreements: [] })
    expect(await screen.findByText('No hours have come in this week.')).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Hours against what each client agreed' })).toBeNull()
  })
})

describe('Wairimu, a lead', () => {
  it('reads her team’s hours, with Approve where she approves, and nothing of what clients agreed', async () => {
    open(WAIRIMU, { ...WAIRIMUS, weeks: [{ ...THIS_WEEK, people: [THIS_WEEK.people[0], { ...THIS_WEEK.people[1], mayApprove: false }] }] })
    await screen.findByRole('region', { name: 'This week’s hours, waiting for approval' })
    expect(screen.getByRole('button', { name: 'Approve Aisha Otieno’s hours' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Approve Brian Mwangi’s hours' })).toBeNull()
    expect(screen.queryByRole('region', { name: 'Hours against what each client agreed' })).toBeNull()
  })
})

describe('Miriam, a colleague, opens the address', () => {
  it('reads the server’s refusal, and no hours', async () => {
    open(MIRIAM, refusal(403, 'Only an admin or a lead can open this board.'))
    expect(await screen.findByRole('alert')).toHaveTextContent('Only an admin or a lead can open this board.')
    expect(document.querySelectorAll('tr')).toHaveLength(0)
  })

  it('while the suite is off, everybody reads that', async () => {
    open(GRACE, refusal(404, 'The time sheets suite is not switched on.'))
    expect(await screen.findByRole('alert')).toHaveTextContent('The time sheets suite is not switched on.')
  })
})
