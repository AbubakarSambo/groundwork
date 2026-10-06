import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { QueuePage } from './QueuePage'
import { useAuthStore } from '@/stores/auth'
import type { AQueueItem, TheQueue } from '@/api/suites'

/**
 * THE APPROVER'S QUEUE (new for the screens, request 160/162), AS EACH READER SEES IT. Who is served
 * what, and the exact sentences, are tested on the server (the-approvers-queue-at-a-hundred-people-
 * as-each-reader-reads-it.spec.ts, several-at-once-as-each-reader-reads-it.spec.ts). Here: that the
 * page draws the served `says`/`where`/`waitedSays`/`clash`/`standingIn` sentences, that it pages
 * with "Show more" and filters by suite, that approving several carries one refusal past the rest,
 * and that declining stays one at a time.
 */
vi.mock('@/api/suites', () => ({
  queueApi: { get: vi.fn() },
  leaveBoardApi: { decide: vi.fn() },
  spendApi: { decide: vi.fn() },
}))
import { queueApi, leaveBoardApi, spendApi } from '@/api/suites'

const AISHA: AQueueItem = {
  id: 'q-1', suite: 'leave', name: 'Aisha Otieno', firstName: 'Aisha', team: 'Sales',
  waitingSince: '2026-10-01T09:00:00.000Z', workingDaysWaiting: 2, pastTheDeadline: false,
  says: 'Aisha asked for leave from Monday 12 October to Friday 16 October, which is 5 working days.',
  waitedSays: 'It has waited 2 working days.',
  where: 'It is waiting for you.',
  amount: null, line: null, startsOn: '2026-10-12', endsOn: '2026-10-16',
  clash: { count: 1, names: ['Brian'], says: 'Brian is also off that day, so Sales would be two short.' },
  standingIn: null,
}
const KAMAU: AQueueItem = {
  id: 'q-2', suite: 'spend', name: 'Kamau Njenga', firstName: 'Kamau', team: 'Operations',
  waitingSince: '2026-10-06T09:00:00.000Z', workingDaysWaiting: 0, pastTheDeadline: false,
  says: 'Kamau asked to spend KES 18,000 on fuel for Kisumu deliveries.',
  waitedSays: 'It was asked for today.',
  where: 'It is waiting for you.',
  amount: 18000, line: 'Kamau: KES 18,000 for fuel for Kisumu deliveries',
  startsOn: null, endsOn: null, clash: null,
  standingIn: { name: 'Wairimu', until: '2026-10-09', says: 'You are standing in for Wairimu, who is on leave until Friday 9 October.' },
}

const QUEUE: TheQueue = {
  counts: { all: 2, leave: 1, spend: 1, pastTheDeadline: 0 },
  page: 1, pageSize: 25, pages: 1,
  items: [AISHA, KAMAU],
  says: 'Two requests are waiting for you to approve or decline: one for leave and one to spend.',
}

const FATUMA = { id: 'u-f', firstName: 'Fatuma', role: 'LEAD', organizationName: 'Baridi Appliances' }

function open(served: TheQueue | Error = QUEUE) {
  if (served instanceof Error) (queueApi.get as any).mockRejectedValue(served)
  else (queueApi.get as any).mockResolvedValue(served)
  useAuthStore.setState({ user: FATUMA, token: 't', isAuthenticated: true } as any)
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/suite/queue']}><QueuePage /></MemoryRouter>
    </QueryClientProvider>,
  )
}
const refusal = (status: number, message: string) => Object.assign(new Error(String(status)), { response: { status, data: { message } } })
const rows = () => within(screen.getByRole('list', { name: 'Waiting for approval' })).getAllByRole('listitem')
const rowOf = (name: string) => rows().find(li => li.textContent?.includes(name))!

beforeEach(() => { vi.clearAllMocks() })

describe('what is drawn', () => {
  it('reads the heading, the server’s top sentence, and each request’s own sentences', async () => {
    open()
    expect(screen.getByRole('heading', { level: 1, name: 'Waiting for you to decide' })).toBeInTheDocument()
    expect(await screen.findByText(QUEUE.says)).toBeInTheDocument()
    expect(within(rowOf('Aisha')).getByText(AISHA.says)).toBeInTheDocument()
    expect(within(rowOf('Aisha')).getByText(AISHA.waitedSays)).toBeInTheDocument()
    expect(within(rowOf('Kamau')).getByText(KAMAU.says)).toBeInTheDocument()
  })

  it('draws the clash under the leave request that has one, and the stand-in sentence under the one it covers', async () => {
    open()
    await screen.findByRole('list', { name: 'Waiting for approval' })
    expect(within(rowOf('Aisha')).getByText(AISHA.clash!.says)).toBeInTheDocument()
    expect(within(rowOf('Kamau')).getByText(KAMAU.standingIn!.says)).toBeInTheDocument()
    expect(within(rowOf('Kamau')).queryByText(AISHA.clash!.says)).toBeNull()
    expect(within(rowOf('Aisha')).queryByText(KAMAU.standingIn!.says)).toBeNull()
  })

  it('an empty queue reads the server’s own sentence', async () => {
    open({ ...QUEUE, counts: { all: 0, leave: 0, spend: 0, pastTheDeadline: 0 }, items: [], says: 'Nothing is waiting for you to approve or decline.' })
    expect(await screen.findByText('Nothing is waiting for you to approve or decline.')).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Waiting for approval' })).toBeNull()
  })

  it('a refusal reads the server’s own sentence', async () => {
    open(refusal(403, 'Only people in this organisation can read what waits for them.'))
    expect(await screen.findByText('Only people in this organisation can read what waits for them.')).toBeInTheDocument()
  })
})

describe('filtering by suite', () => {
  it('asks the server for the chosen suite, and resets to the first page', async () => {
    open()
    await screen.findByRole('list', { name: 'Waiting for approval' })
    fireEvent.click(screen.getByRole('tab', { name: 'Leave' }))
    await waitFor(() => expect(queueApi.get).toHaveBeenCalledWith({ page: 1, pageSize: 25, suite: 'leave' }))
    fireEvent.click(screen.getByRole('tab', { name: 'Spending' }))
    await waitFor(() => expect(queueApi.get).toHaveBeenCalledWith({ page: 1, pageSize: 25, suite: 'spend' }))
    fireEvent.click(screen.getByRole('tab', { name: 'All' }))
    await waitFor(() => expect(queueApi.get).toHaveBeenCalledWith({ page: 1, pageSize: 25, suite: undefined }))
  })
})

describe('paging with "Show more"', () => {
  it('never loads a hundred at once, and "Show more" asks for more of the same list', async () => {
    const many: TheQueue = { ...QUEUE, counts: { all: 30, leave: 1, spend: 29, pastTheDeadline: 0 } }
    open(many)
    await screen.findByRole('list', { name: 'Waiting for approval' })
    expect(queueApi.get).toHaveBeenCalledWith({ page: 1, pageSize: 25, suite: undefined })
    const button = screen.getByRole('button', { name: 'Show more' })
    fireEvent.click(button)
    await waitFor(() => expect(queueApi.get).toHaveBeenCalledWith({ page: 1, pageSize: 50, suite: undefined }))
  })

  it('with nothing left to show, there is no "Show more"', async () => {
    open()
    await screen.findByRole('list', { name: 'Waiting for approval' })
    expect(screen.queryByRole('button', { name: 'Show more' })).toBeNull()
  })
})

describe('approving several at once', () => {
  it('approves each selected item in turn, through the same decide calls the boards use, and carries one refusal past the rest', async () => {
    ;(leaveBoardApi.decide as any).mockResolvedValue({ waiting: [], off: [] })
    ;(spendApi.decide as any).mockRejectedValue(refusal(409, 'Wairimu approved this request a moment ago, so your answer was not kept.'))
    open()
    await screen.findByRole('list', { name: 'Waiting for approval' })
    fireEvent.click(screen.getByLabelText('Select all on this page'))
    const approveAll = screen.getByRole('button', { name: 'Approve the 2 selected' })
    fireEvent.click(approveAll)
    await waitFor(() => expect(leaveBoardApi.decide).toHaveBeenCalledWith('q-1', 'approve'))
    await waitFor(() => expect(spendApi.decide).toHaveBeenCalledWith('q-2', 'approve'))
    expect(await within(rowOf('Kamau')).findByText('Wairimu approved this request a moment ago, so your answer was not kept.')).toBeInTheDocument()
    /* The queue is re-read once the batch is done, so the approver sees what is left to decide. */
    await waitFor(() => expect((queueApi.get as any).mock.calls.length).toBeGreaterThan(1))
  })

  it('offers nothing to approve until something is selected', async () => {
    open()
    await screen.findByRole('list', { name: 'Waiting for approval' })
    expect(screen.getByRole('button', { name: 'Approve the 0 selected' })).toBeDisabled()
    fireEvent.click(within(rowOf('Aisha')).getByLabelText('Select Aisha Otieno’s request'))
    expect(screen.getByRole('button', { name: 'Approve the 1 selected' })).toBeEnabled()
  })
})

describe('declining', () => {
  it('stays one at a time, with its own optional reason, through the same decide call the boards use', async () => {
    ;(leaveBoardApi.decide as any).mockResolvedValue({ waiting: [], off: [] })
    open()
    await screen.findByRole('list', { name: 'Waiting for approval' })
    const aisha = rowOf('Aisha')
    fireEvent.click(within(aisha).getByRole('button', { name: 'Decline Aisha Otieno’s request' }))
    fireEvent.change(within(aisha).getByLabelText('Say why (optional)'), { target: { value: 'Two people are already away.' } })
    fireEvent.click(within(aisha).getByRole('button', { name: 'Decline' }))
    await waitFor(() => expect(leaveBoardApi.decide).toHaveBeenCalledWith('q-1', 'decline', 'Two people are already away.'))
    /* Never offered as a bulk action: only "Approve the N selected" exists beside the list. */
    expect(screen.queryByRole('button', { name: /Decline the .* selected/ })).toBeNull()
  })
})
