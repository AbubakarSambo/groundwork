import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { QueuePage, QueueLink } from './QueuePage'
import { useAuthStore } from '@/stores/auth'
import type { AQueueItem, TheQueue } from '@/api/suites'

/**
 * THE APPROVER'S QUEUE (new for the screens, request 160/162), AS EACH READER SEES IT. Who is served
 * what, and the exact sentences, are tested on the server (the-approvers-queue-at-a-hundred-people-
 * as-each-reader-reads-it.spec.ts, many-answers-in-one-call-as-each-reader-reads-it.spec.ts). Here:
 * that the page draws the served `says`/`where`/`waitedSays`/`clash`/`standingIn` sentences, that it
 * pages with "Show more" and filters by suite, that approving several sends the batch route the
 * engine built for it (6 October, "the batch decision, ready"), one call for up to 50 and chunks of
 * 50 beyond that, that every result and the summary are shown exactly as served, and that declining
 * stays one at a time.
 */
vi.mock('@/api/suites', () => ({
  queueApi: { get: vi.fn() },
  leaveBoardApi: { decide: vi.fn() },
  spendApi: { decide: vi.fn() },
  decisionsApi: { decide: vi.fn() },
}))
import { queueApi, leaveBoardApi, spendApi, decisionsApi } from '@/api/suites'

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
  /*
   * THE BATCH ROUTE THE ENGINE BUILT FOR IT (6 October, docs/answers-from-engine.md, "For the
   * screens: the batch decision, ready"): "Approve the N selected" now sends `POST /suites/decisions`
   * (`decisionsApi.decide`) rather than the old one-by-one loop with its 429 retry, which the route's
   * own limit of 50 at a time makes unnecessary. Up to 50 selected go in a single call, in order.
   */
  it('sends one call for up to 50 selected, in the order given, with the exact decisions', async () => {
    ;(decisionsApi.decide as any).mockResolvedValue({
      results: [
        { id: 'q-1', suite: 'leave', ok: true, says: 'You approved Aisha’s leave from Monday 12 October to Friday 16 October.' },
        { id: 'q-2', suite: 'spend', ok: true, says: 'You approved Kamau’s request to spend KES 18,000 for fuel for Kisumu deliveries.' },
      ],
      answered: 2,
      says: 'All two answers were kept.',
    })
    open()
    await screen.findByRole('list', { name: 'Waiting for approval' })
    fireEvent.click(screen.getByLabelText('Select all on this page'))
    fireEvent.click(screen.getByRole('button', { name: 'Approve the 2 selected' }))
    await waitFor(() => expect(decisionsApi.decide).toHaveBeenCalledTimes(1))
    expect(decisionsApi.decide).toHaveBeenCalledWith([
      { suite: 'leave', id: 'q-1', answer: 'approve' },
      { suite: 'spend', id: 'q-2', answer: 'approve' },
    ])
    expect(leaveBoardApi.decide).not.toHaveBeenCalled()
    expect(spendApi.decide).not.toHaveBeenCalled()
    /* The queue is re-read once the batch is done, so the approver sees what is left to decide. */
    await waitFor(() => expect((queueApi.get as any).mock.calls.length).toBeGreaterThan(1))
  })

  it('shows each result’s served `says`, word for word, beside the request’s name only when `says` does not already name them, and marks a failure plainly as not done', async () => {
    ;(decisionsApi.decide as any).mockResolvedValue({
      results: [
        { id: 'q-1', suite: 'leave', ok: true, says: 'You approved Aisha’s leave from Monday 12 October to Friday 16 October.' },
        { id: 'q-2', suite: 'spend', ok: false, says: 'Only KES 20,000 or less may be approved without a second person.' },
      ],
      answered: 1,
      says: 'One of the two answers was kept. One could not be kept, and it says why.',
    })
    open()
    await screen.findByRole('list', { name: 'Waiting for approval' })
    fireEvent.click(screen.getByLabelText('Select all on this page'))
    fireEvent.click(screen.getByRole('button', { name: 'Approve the 2 selected' }))
    const results = await screen.findByRole('list', { name: 'What happened' })
    /* The summary is the served top `says`, shown exactly as served. */
    expect(await screen.findByText('One of the two answers was kept. One could not be kept, and it says why.')).toBeInTheDocument()
    expect(within(results).getByText('You approved Aisha’s leave from Monday 12 October to Friday 16 October.')).toBeInTheDocument()
    expect(within(results).getByText('Kamau Njenga’s request was not done. Only KES 20,000 or less may be approved without a second person.')).toBeInTheDocument()
  })

  it('a whole-call refusal shows its served sentence, and changes nothing', async () => {
    ;(decisionsApi.decide as any).mockRejectedValue(refusal(403, 'Only people in this organisation can answer requests here.'))
    open()
    await screen.findByRole('list', { name: 'Waiting for approval' })
    fireEvent.click(screen.getByLabelText('Select all on this page'))
    fireEvent.click(screen.getByRole('button', { name: 'Approve the 2 selected' }))
    expect(await screen.findByText('Only people in this organisation can answer requests here.')).toBeInTheDocument()
    /* Nothing changes: the selection stands, and the queue is not re-read. */
    expect(screen.getByRole('button', { name: 'Approve the 2 selected' })).toBeInTheDocument()
    expect(queueApi.get).toHaveBeenCalledTimes(1)
  })

  /*
   * MORE THAN 50 SELECTED: one call per 50, one after another, in order, showing "Working through 50
   * of 60…" while the second call is still out. The final summary adds the chunks up in the same form
   * the engine's own single-call `says` uses, so a batch of more than 50 reads no differently.
   */
  it('more than 50 selected go in chunks of 50, one call after another: two calls for 60, with exact bodies', async () => {
    const sixty = Array.from({ length: 60 }, (_, i) => ({
      id: `q-${i + 1}`, suite: 'spend' as const, name: `Person ${i + 1}`, firstName: `Person${i + 1}`, team: null,
      waitingSince: '2026-10-01T09:00:00.000Z', workingDaysWaiting: 1, pastTheDeadline: false,
      says: `Person ${i + 1} asked to spend KES 1,000 on something.`, waitedSays: 'It has waited 1 working day.',
      where: 'It is waiting for you.', amount: 1000, line: null, startsOn: null, endsOn: null, clash: null, standingIn: null,
    }))
    open({ ...QUEUE, counts: { all: 60, leave: 0, spend: 60, pastTheDeadline: 0 }, items: sixty, says: 'Sixty requests are waiting for you to approve or decline.' })
    await screen.findByRole('list', { name: 'Waiting for approval' })
    let releaseSecond: () => void = () => {}
    const second = new Promise<void>(resolve => { releaseSecond = resolve })
    ;(decisionsApi.decide as any)
      .mockImplementationOnce(async (decisions: any[]) => ({
        results: decisions.map(d => ({ id: d.id, suite: d.suite, ok: true, says: `You approved ${d.id}.` })),
        answered: decisions.length, says: 'All fifty answers were kept.',
      }))
      .mockImplementationOnce(async (decisions: any[]) => {
        await second
        return { results: decisions.map(d => ({ id: d.id, suite: d.suite, ok: true, says: `You approved ${d.id}.` })), answered: decisions.length, says: 'All ten answers were kept.' }
      })
    fireEvent.click(screen.getByLabelText('Select all on this page'))
    fireEvent.click(screen.getByRole('button', { name: 'Approve the 60 selected' }))
    await waitFor(() => expect(decisionsApi.decide).toHaveBeenCalledTimes(2))
    const [firstBody, secondBody] = (decisionsApi.decide as any).mock.calls.map((c: any[]) => c[0])
    expect(firstBody).toHaveLength(50)
    expect(firstBody[0]).toEqual({ suite: 'spend', id: 'q-1', answer: 'approve' })
    expect(firstBody[49]).toEqual({ suite: 'spend', id: 'q-50', answer: 'approve' })
    expect(secondBody).toHaveLength(10)
    expect(secondBody[0]).toEqual({ suite: 'spend', id: 'q-51', answer: 'approve' })
    expect(secondBody[9]).toEqual({ suite: 'spend', id: 'q-60', answer: 'approve' })
    expect(await screen.findByText('Working through 50 of 60…')).toBeInTheDocument()
    releaseSecond()
    expect(await screen.findByText('All 60 answers were kept.')).toBeInTheDocument()
  })

  /* Fault 2a of the live walk: "Approve the 0 selected" used to show, disabled, before anybody had
     ticked a request - a button that offers nothing to do. The button is now hidden until something
     is selected, and a quiet line says what to do instead. */
  it('offers nothing to approve until something is selected', async () => {
    open()
    await screen.findByRole('list', { name: 'Waiting for approval' })
    expect(screen.queryByRole('button', { name: /Approve the/ })).toBeNull()
    expect(screen.getByText('Tick the requests you want to approve together.')).toBeTruthy()
    fireEvent.click(within(rowOf('Aisha')).getByLabelText('Select Aisha Otieno’s request'))
    expect(screen.getByRole('button', { name: 'Approve the 1 selected' })).toBeEnabled()
    expect(screen.queryByText('Tick the requests you want to approve together.')).toBeNull()
  })
})
describe('the link to the queue, shown elsewhere (Today, the sidebar)', () => {
  /* Live walk at a hundred people, fault 2: the link under "What needs you" used to be the server's
     whole counts sentence drawn as the link text, which read as one long underlined sentence. It is
     now a short, plainly worded link. */
  function openLink(served: TheQueue | Error = QUEUE) {
    if (served instanceof Error) (queueApi.get as any).mockRejectedValue(served)
    else (queueApi.get as any).mockResolvedValue(served)
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    return render(
      <QueryClientProvider client={qc}>
        <MemoryRouter><QueueLink userId="u-f" /></MemoryRouter>
      </QueryClientProvider>,
    )
  }

  it('reads a short, plainly worded link, not the server’s long counts sentence', async () => {
    openLink()
    const link = await screen.findByRole('link', { name: 'See everything waiting for you to decide' })
    expect(link).toHaveAttribute('href', '/suite/queue')
    expect(screen.queryByText(QUEUE.says)).toBeNull()
  })

  it('draws nothing when nothing waits for this person', async () => {
    openLink({ ...QUEUE, counts: { all: 0, leave: 0, spend: 0, pastTheDeadline: 0 }, items: [], says: 'Nothing is waiting for you to approve or decline.' })
    await waitFor(() => expect(queueApi.get).toHaveBeenCalled())
    expect(screen.queryByRole('link', { name: 'See everything waiting for you to decide' })).toBeNull()
  })
})

describe('declining', () => {
  it('stays one at a time, with its own optional reason, through the same decide call the boards use', async () => {
    ;(leaveBoardApi.decide as any).mockResolvedValue({ waiting: [], off: [] })
    open()
    await screen.findByRole('list', { name: 'Waiting for approval' })
    const aisha = rowOf('Aisha')
    fireEvent.click(within(aisha).getByRole('button', { name: 'Decline Aisha Otieno’s request' }))
    fireEvent.change(within(aisha).getByLabelText('Say why. Aisha will read it.'), { target: { value: 'Two people are already away.' } })
    fireEvent.click(within(aisha).getByRole('button', { name: 'Decline' }))
    await waitFor(() => expect(leaveBoardApi.decide).toHaveBeenCalledWith('q-1', 'decline', 'Two people are already away.'))
    /* Never offered as a bulk action: only "Approve the N selected" exists beside the list. */
    expect(screen.queryByRole('button', { name: /Decline the .* selected/ })).toBeNull()
  })
})
