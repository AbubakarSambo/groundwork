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
vi.mock('@/api/suites', () => ({ reviewsApi: { board: vi.fn(), mine: vi.fn(), start: vi.fn(), one: vi.fn(), words: vi.fn(), view: vi.fn(), decide: vi.fn(), appealsToDecide: vi.fn() } }))
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
  managersWordsById: 'u-w',
  theirView: 'I want to lead the supermarket accounts, but I need faster stock.', decision: null, mayWrite: true,
}
const FOR_GRACE: AReview = { ...FOR_WAIRIMU, reader: 'admin', mayWrite: false }
const FOR_AISHA: AReview = {
  reader: 'person', id: 'r-a', firstName: 'Aisha', writtenWithFirstName: 'Wairimu', dueOn: '2027-03-01', noticed: NOTICED,
  theirView: null,
  managersWords: 'Aisha is our strongest closer with butcheries. I want her to lead supermarkets next.',
  managersWordsById: 'u-w',
  managersWordsHeading: 'What Wairimu writes',
  whereYouDiffer: null,
  decision: { says: 'Aisha leads the supermarket accounts from April.', reasons: 'She closed 9 sales, all paid.' },
}

const GRACE = { id: 'u-g', firstName: 'Grace', role: 'ADMIN', organizationName: 'Baridi Appliances' }
const WAIRIMU = { id: 'u-w', firstName: 'Wairimu', role: 'LEAD', organizationName: 'Baridi Appliances' }
const AISHA = { id: 'u-a', firstName: 'Aisha', role: 'MEMBER', organizationName: 'Baridi Appliances' }
const AMINA = { id: 'u-am', firstName: 'Amina', role: 'ADMIN', organizationName: 'Baridi Appliances' }
/* A second Daniel: the organisation has two people called Daniel, so a first-name guess would get this wrong. */
const DANIEL_TWO = { id: 'u-d2', firstName: 'Daniel', role: 'ADMIN', organizationName: 'Baridi Appliances' }

/*
 * Fault 3 of the live walk: Peter's review, started by Daniel, his manager, who had already written
 * his words; Amina, an admin the rules now also name to write it, read "What you write" with Daniel's
 * words pre-filled, so saving would have overwritten Daniel's words as her own. `managersWordsById`
 * ('u-d', the first Daniel's own sign-in, never 'u-d2') is what the screen now checks (request 162,
 * item 6) - not `writtenWithFirstName`, which only ever held a name and cannot tell two Daniels apart.
 */
const FOR_AMINA_ON_PETER: AReview = {
  reader: 'writer', id: 'r-p', name: 'Peter Otieno', firstName: 'Peter', writtenWith: 'Daniel Kiprotich', writtenWithFirstName: 'Daniel',
  dueOn: '2027-03-01', noticed: [],
  managersWords: 'Peter has carried the Kisumu route on his own since June.',
  managersWordsById: 'u-d',
  theirView: null, decision: null, mayWrite: true,
}

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

beforeEach(() => {
  vi.clearAllMocks()
  ;(reviewsApi.mine as any).mockResolvedValue([])
  ;(reviewsApi.appealsToDecide as any).mockResolvedValue({ appeals: [], waitingForAnotherAdmin: [] })
})

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
    /*
     * Fault 7 of the live walk: at 375 wide, the table stacks with no column beside each cell any
     * more, so a bare name read as "Daniel Park" with nothing to say whether that was the person or
     * who wrote the review with them. Each of the first two cells now carries its own visible label
     * too ("Person", "Written with"), on top of the real, visually-hidden `<th scope="col">` a
     * screen reader always had - so the two labels show up in a plain `textContent` read here even
     * though the table is not actually stacked at this test's own (unset) width.
     */
    expect(rows).toEqual([
      ['Person', 'Written with', 'Where it stands', 'What you can do'],
      ['PersonAisha Otieno', 'Written withWairimu Kamau', 'Started on 2 October. Aisha can read it and add a view of her own.', 'Open it'],
      ['PersonMiriam Wanjiku', 'Written withWairimu Kamau', 'Ready to start.', 'Start it'],
    ])
    expect(within(region).getByRole('link', { name: 'Open Aisha Otieno’s review' })).toHaveAttribute('href', '/suite/reviews/r-a')
  })

  it('a review that cannot start yet reads the server’s sentence and "Not yet", never "Decided." and never a button', async () => {
    ;(reviewsApi.board as any).mockResolvedValue({ every: 'Every 6 months', next: [KWAME, PROPOSED] })
    open(WAIRIMU, '/suite/reviews')
    const region = await screen.findByRole('region', { name: 'The next reviews' })
    const kwame = [...region.querySelectorAll('tr')].find(tr => tr.textContent?.includes('Kwame'))!
    expect([...kwame.children].map(c => c.textContent)).toEqual(['PersonKwame Boateng', 'Written withWairimu Kamau', 'After “Kwame, first 90 days” is decided.', 'Not yet'])
    expect(within(kwame as HTMLElement).queryByRole('button')).toBeNull()
    expect(text()).not.toContain('Decided.')
  })

  /*
   * Fault 7 of the live walk: aria-hidden on these labels, because the stacked width is where they
   * are needed and a screen reader already has the real column headers (visually hidden, not
   * removed) at every width.
   */
  it('each stacked value carries its own visible label, marked aria-hidden since a screen reader already has the real column headers', async () => {
    ;(reviewsApi.board as any).mockResolvedValue(BOARD)
    open(WAIRIMU, '/suite/reviews')
    const region = await screen.findByRole('region', { name: 'The next reviews' })
    const labels = [...region.querySelectorAll('.gwui-record-table-label')]
    expect(labels.map(l => l.textContent)).toEqual(['Person', 'Written with', 'Person', 'Written with'])
    expect(labels.every(l => l.getAttribute('aria-hidden') === 'true')).toBe(true)
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

  /*
   * Group 2's review, fault E: the subtitle used to read "It is built from..." alone, with nothing
   * before "It", whenever the organisation had not answered "How often is each person reviewed?" -
   * every time the suite was off, and the first moment it was switched on. That was first fixed by
   * filling in a made-up default ("every 6 months"), but Msingi Foods has not set how often and
   * that default is not true of it - Imani Hassan read "A review happens every 6 months." as if it
   * were the organisation's own answer (engine workspace, 9 October night, test bed copy a).
   *
   * These two tests are changed because they pinned that made-up default. Now, with nothing set,
   * the first sentence is left out, and the rest reads as its own sentence starting with "A review"
   * - still never a sentence with nothing before "it".
   */
  it('while the organisation has not said how often, leaves out "A review happens...", never "It is built..." alone', async () => {
    ;(reviewsApi.board as any).mockResolvedValue({ every: null, next: [] })
    open(GRACE, '/suite/reviews')
    expect(await screen.findByText('A review is built from what each person did and proved in their check-ins, with their own view beside it. There are no scores.')).toBeInTheDocument()
    expect(text()).not.toContain('A review happens')
  })

  it('the same when the organisation’s answer is an empty string, not only null', async () => {
    ;(reviewsApi.board as any).mockResolvedValue({ every: '', next: [] })
    open(GRACE, '/suite/reviews')
    expect(await screen.findByText('A review is built from what each person did and proved in their check-ins, with their own view beside it. There are no scores.')).toBeInTheDocument()
    expect(text()).not.toContain('A review happens')
  })

  it('while the suite is off, still reads a true sentence above the server’s refusal, never "It is built..." alone', async () => {
    ;(reviewsApi.board as any).mockRejectedValue(refusal(404, 'The performance reviews suite is not switched on.'))
    open(GRACE, '/suite/reviews')
    expect(await screen.findByRole('alert')).toHaveTextContent('The performance reviews suite is not switched on.')
    expect(screen.getByText('A review is built from what each person did and proved in their check-ins, with their own view beside it. There are no scores.')).toBeInTheDocument()
    expect(text()).not.toContain('A review happens')
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

  /*
   * Fault 1 and fault 2 of the live walk of the suites: the server has sent `managersWords` and
   * `managersWordsHeading` to the person a review is about since decision 93 row 15, but the screen
   * never drew them, and a decided review still showed "Your own view" as an editable box with a
   * Save button. This replaces the old test, which pinned both faults ("never Wairimu’s words", and
   * an editable view after the decision was already made) and had no breadcrumb either.
   */
  it('Aisha reads the facts, what Wairimu writes, and the decision with its reasons, all read-only once it is decided', async () => {
    ;(reviewsApi.one as any).mockResolvedValue(FOR_AISHA)
    open(AISHA, '/suite/reviews/r-a')
    expect(await screen.findByRole('heading', { level: 1, name: 'Your review, March' })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Where you are' }).textContent).toBe('Suites/Performance reviews/Your review')
    expect(within(screen.getByRole('region', { name: 'What Wairimu writes' })).getByText('“Aisha is our strongest closer with butcheries. I want her to lead supermarkets next.”')).toBeInTheDocument()
    const decision = screen.getByRole('region', { name: 'The decision' })
    expect(within(decision).getByText('Aisha leads the supermarket accounts from April.')).toBeInTheDocument()
    expect(within(decision).getByText('She closed 9 sales, all paid.')).toBeInTheDocument()
    /*
     * SCREEN FAULT (engine workspace, 9 October night, test bed copy a): Imani Hassan still read
     * "No scores. You and Grace talk it through, and Grace decides." once her review was decided -
     * a sentence about how the decision gets made, left standing once it had already been made.
     * This test pinned that fault (it asserted the line was present once decided); it is changed
     * because the decision itself is already shown above, with nothing left for this line to say.
     */
    expect(screen.queryByText('No scores. You and Wairimu talk it through, and Wairimu decides.')).toBeNull()
    const view = screen.getByRole('region', { name: 'Your own view' })
    expect(within(view).getByText('You have not written your view yet.')).toBeInTheDocument()
    expect(within(view).queryByRole('textbox')).toBeNull()
    expect(within(view).queryByRole('button', { name: 'Save' })).toBeNull()
  })

  /*
   * Fault 4 of the live walk: "Peter has not written their view yet." read oddly ("their" beside a
   * known name). With the person's name known, it now reads "<name>’s own view is not in yet.",
   * never assuming a gender with "his" or "her".
   */
  it('before the engine writes it, says so plainly', async () => {
    ;(reviewsApi.one as any).mockResolvedValue({ ...FOR_GRACE, noticed: [], managersWords: null, theirView: null })
    open(GRACE, '/suite/reviews/r-a')
    expect(await screen.findByText('Groundwork has not written this part yet.')).toBeInTheDocument()
    expect(screen.getByText('Wairimu has not written anything yet.')).toBeInTheDocument()
    expect(screen.getByText('Aisha’s own view is not in yet.')).toBeInTheDocument()
  })

  /*
   * SCREEN FAULT 9 (FINAL WALK): "WHAT DANIEL WRITES", WITH NOTHING UNDER IT. Grace's review page
   * (reader: 'person', reading about themselves) drew the heading and nothing else when the writer
   * had not written their part yet. Said in words now, and never a guessed pronoun ("his part").
   */
  it('says the writer has not written anything yet, rather than a heading with nothing under it', async () => {
    ;(reviewsApi.one as any).mockResolvedValue({ ...FOR_AISHA, managersWords: null })
    open(AISHA, '/suite/reviews/r-a')
    const section = await screen.findByRole('region', { name: 'What Wairimu writes' })
    expect(within(section).getByText('Wairimu has not written anything yet.')).toBeInTheDocument()
    expect(within(section).queryByText(/his part|her part|their part/)).toBeNull()
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

  it('Aisha reads where she and Wairimu differ, once both have written their own view', async () => {
    const withBoth: AReview = {
      ...FOR_AISHA, theirView: 'I want to lead the supermarket accounts, but I need faster stock.',
      whereYouDiffer: {
        says: 'Wairimu and you have each written your own view of your work. Here they are side by side, so you can see where they differ before you meet.',
        managersWords: 'Aisha is our strongest closer with butcheries. I want her to lead supermarkets next.',
        yourView: 'I want to lead the supermarket accounts, but I need faster stock.',
      },
    }
    ;(reviewsApi.one as any).mockResolvedValue(withBoth)
    open(AISHA, '/suite/reviews/r-a')
    const differ = await screen.findByRole('region', { name: 'Where you differ' })
    expect(within(differ).getByText(withBoth.whereYouDiffer!.says)).toBeInTheDocument()
    expect(within(differ).getByText('“Aisha is our strongest closer with butcheries. I want her to lead supermarkets next.”')).toBeInTheDocument()
    expect(within(differ).getByText('“I want to lead the supermarket accounts, but I need faster stock.”')).toBeInTheDocument()
  })

  /*
   * Fault 3, fixed: Daniel's words are shown read-only, attributed to him by name, never pre-filled
   * into Amina's own box. Amina's own box starts empty, so saving it can never pass Daniel's words off
   * as hers.
   */
  it('Amina, who may also now write Peter’s review, reads Daniel’s words read-only and is offered her own, empty', async () => {
    ;(reviewsApi.one as any).mockResolvedValue(FOR_AMINA_ON_PETER)
    open(AMINA, '/suite/reviews/r-p')
    const words = await screen.findByRole('region', { name: 'What Daniel writes' })
    expect(within(words).getByText('“Peter has carried the Kisumu route on his own since June.”')).toBeInTheDocument()
    const own = within(words).getByLabelText('What you write') as HTMLTextAreaElement
    expect(own.value).toBe('')
    const save = within(words).getByRole('button', { name: 'Save' })
    fireEvent.change(own, { target: { value: 'Peter is ready for a bigger route.' } })
    fireEvent.click(save)
    await waitFor(() => expect(reviewsApi.words).toHaveBeenCalledWith('r-p', 'Peter is ready for a bigger route.'))
  })

  /*
   * Request 162, item 6: whose words these are is decided by sign-in (`managersWordsById`), never by
   * comparing first names. Two people called Daniel: the one who actually wrote `managersWords` is
   * 'u-d', not this reader, 'u-d2' - a first-name guess would have matched "Daniel" to "Daniel" and
   * wrongly pre-filled the other Daniel's words into this reader's own, editable box.
   */
  it('a second Daniel reads the first Daniel’s words read-only, by id, though their first names match', async () => {
    ;(reviewsApi.one as any).mockResolvedValue(FOR_AMINA_ON_PETER)
    open(DANIEL_TWO, '/suite/reviews/r-p')
    const words = await screen.findByRole('region', { name: 'What Daniel writes' })
    expect(within(words).getByText('“Peter has carried the Kisumu route on his own since June.”')).toBeInTheDocument()
    const own = within(words).getByLabelText('What you write') as HTMLTextAreaElement
    expect(own.value).toBe('')
  })
})


/* Screens item e: nobody in particular writes it, and the cell says so instead of staying blank. */
describe('the Written with cell when no one is named', () => {
  it('says what the server says, "Any admin"', async () => {
    ;(reviewsApi.board as any).mockResolvedValue({ every: 'Every 6 months', next: [{ ...BOARD.next[1], writtenWith: null, writtenWithSays: 'Any admin' }] })
    open(GRACE, '/suite/reviews')
    expect(await screen.findByText('Any admin')).toBeTruthy()
  })
})
