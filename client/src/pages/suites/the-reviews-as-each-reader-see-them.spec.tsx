import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReviewsBoardPage } from './ReviewsBoardPage'
import { ReviewPage } from './ReviewPage'
import { useAuthStore } from '@/stores/auth'
import type { ReviewsBoard, AReview } from '@/api/suites'

/**
 * PERFORMANCE REVIEWS (E4, #/suite/reviews and #/suite/reviews/:id), AS EACH PERSON SEES THEM. Who is
 * served what is tested on the server (api/src/modules/suites/the-reviews-as-each-reader-reads-them.spec.ts).
 * Here: what each person reads, in the prototype's words (suite-reviews.txt), and that no reader sees
 * a label, a verdict, a score or a rating.
 */
vi.mock('@/api/suites', () => ({ reviewsApi: { board: vi.fn(), mine: vi.fn(), start: vi.fn(), one: vi.fn(), words: vi.fn(), view: vi.fn(), decide: vi.fn() } }))
import { reviewsApi } from '@/api/suites'

const BOARD: ReviewsBoard = {
  every: 'Every 6 months',
  next: [
    { dueId: 'd-a', name: 'Aisha Otieno', writtenWith: 'Wairimu Kamau', dueOn: '2027-03-01', stands: 'started', standsSays: 'Started on 2 October. Aisha can read it and add a view of her own.', reviewId: 'r-a', mayStart: false, proposal: null },
    { dueId: 'd-m', name: 'Miriam Wanjiku', writtenWith: 'Wairimu Kamau', dueOn: '2027-03-01', stands: 'ready', standsSays: 'Ready to start.', reviewId: null, mayStart: true, proposal: null },
  ],
}
/* Real served shape for a review that cannot start yet (where-a-review-stands.ts) and one Groundwork proposed. */
const KWAME = { dueId: 'd-k', name: 'Kwame Boateng', writtenWith: 'Wairimu Kamau', dueOn: '2027-03-01', stands: 'not-yet' as const, standsSays: 'After “Kwame, first 90 days” is decided.', reviewId: null, mayStart: false, proposal: null }
const PROPOSED = { dueId: 'd-p', name: 'Aisha Otieno', writtenWith: 'Wairimu Kamau', dueOn: '2027-03-01', stands: 'ready' as const, standsSays: 'Ready to start. 6 months of check-ins to draw on.', reviewId: null, mayStart: true, proposal: 'Groundwork suggests this review because it has been six months. Nothing reaches Aisha until you say yes.' }
const NOTICED = [
  { says: 'Closed 9 sales since March. Paystack shows all 9 payments.', mark: 'proven' as const },
  { says: 'Says supermarkets take longer than butcheries. Nothing proves this yet.', mark: 'said' as const },
]
const FOR_WAIRIMU: AReview = {
  reader: 'writer', id: 'r-a', name: 'Aisha Otieno', firstName: 'Aisha', writtenWith: 'Wairimu Kamau', writtenWithFirstName: 'Wairimu',
  dueOn: '2027-03-01', noticed: NOTICED,
  managersWords: 'Aisha is our strongest closer with butcheries. I want her to lead supermarkets next.',
  theirView: 'I want to lead the supermarket accounts, but I need faster stock.', decision: null, mayWrite: true,
}
const FOR_GRACE: AReview = { ...FOR_WAIRIMU, reader: 'admin', mayWrite: false }
const FOR_AISHA: AReview = {
  reader: 'person', id: 'r-a', firstName: 'Aisha', writtenWithFirstName: 'Wairimu', dueOn: '2027-03-01', noticed: NOTICED,
  theirView: null, decision: { says: 'Aisha leads the supermarket accounts from April.', reasons: 'She closed 9 sales, all paid.' },
}

const GRACE = { id: 'u-g', firstName: 'Grace', role: 'ADMIN', organizationName: 'Baridi Appliances' }
const WAIRIMU = { id: 'u-w', firstName: 'Wairimu', role: 'LEAD', organizationName: 'Baridi Appliances' }
const AISHA = { id: 'u-a', firstName: 'Aisha', role: 'MEMBER', organizationName: 'Baridi Appliances' }

function open(user: any, at: string) {
  useAuthStore.setState({ user, token: 't', isAuthenticated: true } as any)
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[at]}>
        <Routes>
          <Route path="/suite/reviews" element={<ReviewsBoardPage />} />
          <Route path="/suite/reviews/:id" element={<ReviewPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}
const refusal = (status: number, message: string) => Object.assign(new Error(String(status)), { response: { status, data: { message } } })
const text = () => document.body.textContent ?? ''
const LABELS = /\b(PIP|performance improvement plan|exit|at[- ]risk|low[- ]performer|verdict|rating|score \d|scored)\b/i

beforeEach(() => { vi.clearAllMocks(); (reviewsApi.mine as any).mockResolvedValue([]) })

describe('the board of the next reviews', () => {
  it('reads the prototype’s heading, sentence and box, with the organisation’s own cycle', async () => {
    ;(reviewsApi.board as any).mockResolvedValue(BOARD)
    open(WAIRIMU, '/suite/reviews')
    expect(await screen.findByText('A review happens every 6 months. It is built from what each person did and proved in their check-ins, with their own view beside it. There are no scores.')).toBeInTheDocument()
    /* "Where you are" is the shared PageTitle crumb's own aria-label (group 2, piece 4 rebuild),
       in place of the page's prior "Breadcrumb". */
    expect(screen.getByRole('navigation', { name: 'Where you are' }).textContent).toBe('Suites/Performance reviews')
    expect(screen.getByText('How a review is built')).toBeInTheDocument()
    expect(screen.getByText('From proof in each person’s check-ins, their own view of their work, and their manager’s view. A person decides, not Groundwork.')).toBeInTheDocument()
  })

  it('reads the next reviews by month, with who each is written with and where each stands', async () => {
    ;(reviewsApi.board as any).mockResolvedValue(BOARD)
    open(WAIRIMU, '/suite/reviews')
    const region = await screen.findByRole('region', { name: 'The next reviews' })
    expect(within(region).getByText('March 2027')).toBeInTheDocument()
    const rows = [...region.querySelectorAll('tr')].map(tr => [...tr.children].map(c => c.textContent))
    expect(rows).toEqual([
      ['Person', 'Written with', 'Where it stands', 'What you can do'],
      ['Aisha Otieno', 'Wairimu Kamau', 'Started on 2 October. Aisha can read it and add a view of her own.', 'Open it'],
      ['Miriam Wanjiku', 'Wairimu Kamau', 'Ready to start.', 'Start it'],
    ])
    expect(within(region).getByRole('link', { name: 'Open Aisha Otieno’s review' })).toHaveAttribute('href', '/suite/reviews/r-a')
  })

  it('a review that cannot start yet reads the server’s sentence and "Not yet", never "Decided." and never a button', async () => {
    ;(reviewsApi.board as any).mockResolvedValue({ every: 'Every 6 months', next: [KWAME, PROPOSED] })
    open(WAIRIMU, '/suite/reviews')
    const region = await screen.findByRole('region', { name: 'The next reviews' })
    const kwame = [...region.querySelectorAll('tr')].find(tr => tr.textContent?.includes('Kwame'))!
    expect([...kwame.children].map(c => c.textContent)).toEqual(['Kwame Boateng', 'Wairimu Kamau', 'After “Kwame, first 90 days” is decided.', 'Not yet'])
    expect(within(kwame as HTMLElement).queryByRole('button')).toBeNull()
    expect(text()).not.toContain('Decided.')
  })

  it('a review Groundwork proposed says why under where it stands, and that nothing reaches the person until a yes', async () => {
    ;(reviewsApi.board as any).mockResolvedValue({ every: 'Every 6 months', next: [PROPOSED] })
    open(WAIRIMU, '/suite/reviews')
    const region = await screen.findByRole('region', { name: 'The next reviews' })
    expect(within(region).getByText('Groundwork suggests this review because it has been six months. Nothing reaches Aisha until you say yes.')).toBeInTheDocument()
    expect(within(region).getByText(/Ready to start\. 6 months of check-ins to draw on\./)).toBeInTheDocument()
  })

  it('"Start it" starts the review and opens it', async () => {
    ;(reviewsApi.board as any).mockResolvedValue(BOARD)
    ;(reviewsApi.start as any).mockResolvedValue({ id: 'r-m' })
    ;(reviewsApi.one as any).mockResolvedValue({ ...FOR_WAIRIMU, id: 'r-m', name: 'Miriam Wanjiku', firstName: 'Miriam', noticed: [], managersWords: null, theirView: null })
    open(WAIRIMU, '/suite/reviews')
    fireEvent.click(await screen.findByRole('button', { name: 'Start Miriam Wanjiku’s review' }))
    await waitFor(() => expect(reviewsApi.start).toHaveBeenCalledWith('d-m'))
    expect(await screen.findByRole('heading', { level: 1, name: 'Miriam’s review, March' })).toBeInTheDocument()
  })

  it('says so plainly when none is due, and shows the server’s refusal to a member', async () => {
    ;(reviewsApi.board as any).mockResolvedValue({ every: 'Every 6 months', next: [] })
    open(GRACE, '/suite/reviews')
    expect(await screen.findByText('No reviews are due yet.')).toBeInTheDocument()
  })

  it('a member reads the refusal, and nothing else', async () => {
    ;(reviewsApi.board as any).mockRejectedValue(refusal(403, 'Only an admin or a lead can open this board.'))
    open(AISHA, '/suite/reviews')
    expect(await screen.findByRole('alert')).toHaveTextContent('Only an admin or a lead can open this board.')
    expect(document.querySelectorAll('tr')).toHaveLength(0)
  })

  /* Group 2's review, fault E: the subtitle used to read "It is built from..." alone, with nothing
     before "It", whenever the organisation had not answered "How often is each person reviewed?" -
     every time the suite was off, and the first moment it was switched on. A true sentence - the
     product's own default cadence - is read instead, never a sentence with nothing before "it". */
  it('while the organisation has not said how often, still reads a true sentence, never "It is built..." alone', async () => {
    ;(reviewsApi.board as any).mockResolvedValue({ every: null, next: [] })
    open(GRACE, '/suite/reviews')
    expect(await screen.findByText('A review happens every 6 months. It is built from what each person did and proved in their check-ins, with their own view beside it. There are no scores.')).toBeInTheDocument()
  })

  it('while the suite is off, still reads a true sentence above the server’s refusal, never "It is built..." alone', async () => {
    ;(reviewsApi.board as any).mockRejectedValue(refusal(404, 'The performance reviews suite is not switched on.'))
    open(GRACE, '/suite/reviews')
    expect(await screen.findByRole('alert')).toHaveTextContent('The performance reviews suite is not switched on.')
    expect(screen.getByText('A review happens every 6 months. It is built from what each person did and proved in their check-ins, with their own view beside it. There are no scores.')).toBeInTheDocument()
  })
})

describe('Aisha’s own reviews', () => {
  const MINE = [
    { id: 'r-a', dueOn: '2027-03-01', writtenWithFirstName: 'Wairimu', stands: 'started' as const, says: 'Wairimu has started your review. You can read it and add your own view before you meet.' },
  ]
  it('a member who cannot open the board reads her own reviews, with the server’s sentence and a way in, and not the refusal', async () => {
    ;(reviewsApi.board as any).mockRejectedValue(refusal(403, 'Only an admin or a lead can open this board.'))
    ;(reviewsApi.mine as any).mockResolvedValue(MINE)
    open(AISHA, '/suite/reviews')
    const list = await screen.findByRole('list', { name: 'Your reviews' })
    expect(within(list).getByText('Your review, March')).toBeInTheDocument()
    expect(within(list).getByText('Wairimu has started your review. You can read it and add your own view before you meet.')).toBeInTheDocument()
    expect(within(list).getByRole('link', { name: 'Open your review, March' })).toHaveAttribute('href', '/suite/reviews/r-a')
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('a lead who is also being reviewed reads her own beside the board', async () => {
    ;(reviewsApi.board as any).mockResolvedValue(BOARD)
    ;(reviewsApi.mine as any).mockResolvedValue(MINE)
    open(WAIRIMU, '/suite/reviews')
    expect(await screen.findByRole('list', { name: 'Your reviews' })).toBeInTheDocument()
    expect(await screen.findByRole('region', { name: 'The next reviews' })).toBeInTheDocument()
  })

  it('with none started, there is no "Your reviews" at all', async () => {
    ;(reviewsApi.board as any).mockResolvedValue(BOARD)
    ;(reviewsApi.mine as any).mockResolvedValue([])
    open(WAIRIMU, '/suite/reviews')
    await screen.findByRole('region', { name: 'The next reviews' })
    expect(screen.queryByRole('list', { name: 'Your reviews' })).toBeNull()
  })
})

describe('one review', () => {
  it('Grace, an admin, reads what Groundwork noticed beside Wairimu’s words and Aisha’s own view, as the prototype has them', async () => {
    ;(reviewsApi.one as any).mockResolvedValue(FOR_GRACE)
    open(GRACE, '/suite/reviews/r-a')
    expect(await screen.findByRole('heading', { level: 1, name: 'Aisha’s review, March' })).toBeInTheDocument()
    const noticed = screen.getByRole('region', { name: 'What Groundwork noticed' })
    expect(within(noticed).getByText('Proof first. Anything only said is marked.')).toBeInTheDocument()
    expect([...noticed.querySelectorAll('li')].map(li => li.textContent)).toEqual([NOTICED[0].says, NOTICED[1].says])
    expect(within(screen.getByRole('region', { name: 'What Wairimu writes' })).getByText('“Aisha is our strongest closer with butcheries. I want her to lead supermarkets next.”')).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Aisha’s own view' })).getByText('“I want to lead the supermarket accounts, but I need faster stock.”')).toBeInTheDocument()
    expect(screen.getByText('No scores. Wairimu and Aisha talk it through, and Wairimu decides.')).toBeInTheDocument()
    expect(screen.queryByRole('textbox')).toBeNull()
  })

  it('Wairimu writes her own words and decides with reasons', async () => {
    ;(reviewsApi.one as any).mockResolvedValue(FOR_WAIRIMU)
    ;(reviewsApi.decide as any).mockResolvedValue({ ...FOR_WAIRIMU, decision: { says: 'Aisha leads supermarkets.', reasons: 'Nine sales, all paid.' } })
    open(WAIRIMU, '/suite/reviews/r-a')
    expect(await screen.findByRole('region', { name: 'What you write' })).toBeInTheDocument()
    expect(screen.getByText('No scores. You and Aisha talk it through, and you decide.')).toBeInTheDocument()
    const decision = screen.getByRole('region', { name: 'Your decision' })
    const save = within(decision).getByRole('button', { name: 'Save my decision' })
    expect(save).toBeDisabled()
    fireEvent.change(within(decision).getByLabelText('Your decision'), { target: { value: 'Aisha leads supermarkets.' } })
    expect(save).toBeDisabled()
    fireEvent.change(within(decision).getByLabelText('Your reasons, in a sentence or two'), { target: { value: 'Nine sales, all paid.' } })
    fireEvent.click(save)
    await waitFor(() => expect(reviewsApi.decide).toHaveBeenCalledWith('r-a', 'Aisha leads supermarkets.', 'Nine sales, all paid.'))
    expect(await screen.findByText('Aisha sees your decision and your reasons.')).toBeInTheDocument()
  })

  it('Aisha reads the facts, the decision with its reasons, and writes her own view; never Wairimu’s words', async () => {
    ;(reviewsApi.one as any).mockResolvedValue(FOR_AISHA)
    ;(reviewsApi.view as any).mockResolvedValue({ ...FOR_AISHA, theirView: 'I want to lead the supermarket accounts.' })
    open(AISHA, '/suite/reviews/r-a')
    expect(await screen.findByRole('heading', { level: 1, name: 'Your review, March' })).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Breadcrumb' })).toBeNull()
    expect(screen.queryByRole('region', { name: /writes/ })).toBeNull()
    const decision = screen.getByRole('region', { name: 'The decision' })
    expect(within(decision).getByText('Aisha leads the supermarket accounts from April.')).toBeInTheDocument()
    expect(within(decision).getByText('She closed 9 sales, all paid.')).toBeInTheDocument()
    expect(screen.getByText('No scores. You and Wairimu talk it through, and Wairimu decides.')).toBeInTheDocument()
    const view = screen.getByRole('region', { name: 'Your own view' })
    fireEvent.change(within(view).getByLabelText('Your own view'), { target: { value: 'I want to lead the supermarket accounts.' } })
    fireEvent.click(within(view).getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(reviewsApi.view).toHaveBeenCalledWith('r-a', 'I want to lead the supermarket accounts.'))
  })

  it('before the engine writes it, says so plainly', async () => {
    ;(reviewsApi.one as any).mockResolvedValue({ ...FOR_GRACE, noticed: [], managersWords: null, theirView: null })
    open(GRACE, '/suite/reviews/r-a')
    expect(await screen.findByText('Groundwork has not written this part yet.')).toBeInTheDocument()
    expect(screen.getByText('Wairimu has not written anything yet.')).toBeInTheDocument()
    expect(screen.getByText('Aisha has not written their view yet.')).toBeInTheDocument()
  })

  it('a colleague reads the server’s refusal', async () => {
    ;(reviewsApi.one as any).mockRejectedValue(refusal(403, 'You cannot open this review.'))
    open(AISHA, '/suite/reviews/r-a')
    expect(await screen.findByRole('alert')).toHaveTextContent('You cannot open this review.')
  })

  it('no reader sees a label, a verdict, a score or a rating', async () => {
    for (const [user, served] of [[GRACE, FOR_GRACE], [WAIRIMU, FOR_WAIRIMU], [AISHA, FOR_AISHA]] as const) {
      ;(reviewsApi.one as any).mockResolvedValue(served)
      const { unmount } = open(user, '/suite/reviews/r-a')
      await screen.findByRole('heading', { level: 1 })
      expect(text()).not.toMatch(LABELS)
      unmount()
    }
  })
})
