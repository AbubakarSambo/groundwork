import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThePicturedTeamReport } from './ThePicturedTeamReport'
import { reportsApi } from '@/api/reports'
import { boardApi } from '@/api/board'

/**
 * THE TEAM'S REPORT AS GRACE READS IT, ON RELEASE 1'S SALES CHECK-IN (Hafsah's points 15, 16 and 18, and "What each person
 * did", 18 October 2026; sales-team-report.txt). The report below is what the API served Grace Achieng in Drop Access (test)
 * for session 5, cut to the parts this page reads: the title by its day, In short from the deals, what moved, each person's
 * short line with their own words behind "Open a person", and no "Why the numbers don’t match" where the record cannot work
 * it out. With the switch off the server sends none of it, and the page reads as before.
 */
vi.mock('@/api/reports', () => ({ reportsApi: { sharing: vi.fn(async () => null), sessionReport: vi.fn(), sendToEveryone: vi.fn() } }))
vi.mock('@/api/board', () => ({ boardApi: { get: vi.fn() } }))
vi.mock('@/api/client', () => ({ apiClient: { post: vi.fn(), patch: vi.fn() } }))

const G = '5f00946a-5452-4997-b905-2e565cc93708'
const COUNTING = [{ who: 'Joseph Kariuki', answered: true }, { who: 'Kevin Omondi', answered: true }, { who: 'Mercy Wairimu', answered: true }]
const PEOPLE = [
  { who: 'Joseph Kariuki', isYou: false, lines: ['Mama Pima still has not replied.', 'Juja Hardware: I met Mr Kariuki again, he still wants 5 units.'], inShort: 'Juja Hardware: I met Mr Kariuki again, he still wants 5 units.' },
  { who: 'Kevin Omondi', isYou: false, lines: ['Savannah Cafe paid the KES 30,000 deposit this morning for 6 units.', 'I have the M-Pesa message from Jane, I will add it later today.'], inShort: 'Savannah Cafe paid the KES 30,000 deposit this morning for 6 units.' },
  { who: 'Mercy Wairimu', isYou: false, lines: ['Greenfield took delivery of the 25 units today and paid on delivery.', 'I sent Peter the quote for 30 units, KES 150,000, by email this morning.'], inShort: 'I sent Peter the quote for 30 units, KES 150,000, by email this morning.' },
]
const SERVED = {
  released: false, counting: COUNTING, pictureLines: ['This is what changed since the last round. You stated each of the three team members...'],
  releaseOneSalesReport: true,
  whatEachPersonSaid: PEOPLE,
  theTeamsDay: {
    day: '2026-10-18',
    title: 'The team’s report, Sunday 18 October',
    lastUpdated: 'Last updated on Sunday 18 October at 1:59am, when Mercy checked in. It only changes when something new comes in, such as a check-in, a document or a number from another system.',
    inShort: ['Four sales moved forward today, but none of them has proof yet.'],
    moved: [
      { dealId: 'd-savannah', name: 'Savannah Cafe', owner: 'Kevin', from: 'Quoted', to: 'Won', proven: false },
      { dealId: 'd-tuskys', name: 'Tuskys Westgate', owner: 'Mercy', from: 'Contacted', to: 'Quoted', proven: false },
    ],
    whyTheNumbersDontMatch: null,
  },
}
const BOARD = {
  releaseOneSalesBoard: true, kindOfWork: 'sales team', decisions: [], leadActions: [],
  workRecords: [{ section: 'Deal grid', stages: ['Contacted', 'Need established', 'Pitched', 'Qualified', 'Quoted', 'Won'], rows: [
    { id: 'd-savannah', kind: 'deal', name: 'Savannah Cafe', owner: 'Kevin Omondi', stage: 'Won', theirRead: { words: 'Savannah Cafe paid the KES 30,000 deposit this morning for 6 units.' } },
    { id: 'd-tuskys', kind: 'deal', name: 'Tuskys Westgate', owner: 'Mercy Wairimu', stage: 'Quoted', theirRead: { words: 'Joseph finally brought the samples today, so I showed them to Peter at Tuskys Westgate.' } },
  ] }],
  whoOwnsWhat: [{ name: 'Kevin Omondi', items: [{ type: 'COMMITMENT', sessionNumber: 5, text: 'Kasarani Gym is still on, I will see the owner on Monday.' }] }],
}
const wrap = () => render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <MemoryRouter><ThePicturedTeamReport groundId={G} sessionNumber={5} ground={{ label: 'Sales team, Q4', checkIns: [], participants: [] }} /></MemoryRouter>
  </QueryClientProvider>,
)

describe('the team’s report, as Grace reads it', () => {
  beforeEach(() => { vi.clearAllMocks(); vi.mocked(boardApi.get).mockResolvedValue(BOARD as any) })

  it('reads as sales-team-report.txt does: the day, In short from the deals, what moved, and each person in short', async () => {
    vi.mocked(reportsApi.sessionReport).mockResolvedValue(SERVED as any)
    wrap()
    expect(await screen.findByRole('heading', { name: 'The team’s report, Sunday 18 October' })).toBeTruthy()
    expect(screen.getByText(SERVED.theTeamsDay.lastUpdated)).toBeTruthy()
    expect(screen.getByText('Four sales moved forward today, but none of them has proof yet.')).toBeTruthy()
    const text = document.body.textContent ?? ''
    expect(text).not.toContain('This is what changed since the last round')
    expect(text).not.toContain('Session 5 of')
    expect(screen.getByLabelText('Savannah Cafe: Won')).toBeTruthy()
    expect(screen.getByLabelText('Tuskys Westgate: Quoted')).toBeTruthy()
    /* Each person's short line, not every line they said; "Will do" as before. */
    expect(screen.getByText('I sent Peter the quote for 30 units, KES 150,000, by email this morning.')).toBeTruthy()
    expect(screen.queryByText(/Greenfield took delivery/)).toBeNull()
    expect(screen.getByText('Kasarani Gym is still on, I will see the owner on Monday.')).toBeTruthy()
    expect(screen.getByText('Short summaries. Open a person to see what they said, in their own words.')).toBeTruthy()
    /* Nothing the record cannot work out. */
    expect(screen.queryByText('Why the numbers don’t match')).toBeNull()
  })

  it('under What moved, a deal says the stage it reached and the line about it, never a budget nobody gave (Drop Access, 18 October)', async () => {
    /* gw_sweep_drop3: Mama Mboga Mart's latest sentence on the board was "Mama Mboga Mart didn't state a budget.", and What moved showed it. */
    const says = 'Now quoted. Mercy said, "I quoted her KES 10,000 for the two units."'
    vi.mocked(boardApi.get).mockResolvedValue({ ...BOARD, workRecords: [{ ...BOARD.workRecords[0], rows: [
      ...BOARD.workRecords[0].rows,
      { id: 'd-mama', kind: 'deal', name: 'Mama Mboga Mart', owner: 'Mercy Wairimu', stage: 'Quoted', theirRead: { words: 'Mama Mboga Mart didn\'t state a budget.' } },
    ] }] } as any)
    vi.mocked(reportsApi.sessionReport).mockResolvedValue({ ...SERVED, theTeamsDay: { ...SERVED.theTeamsDay, moved: [
      { dealId: 'd-mama', name: 'Mama Mboga Mart', owner: 'Mercy', from: 'Need established', to: 'Quoted', proven: false, says },
    ] } } as any)
    wrap()
    expect(await screen.findByLabelText('Mama Mboga Mart: Quoted')).toBeTruthy()
    expect(screen.getByText(says)).toBeTruthy()
    expect(document.body.textContent ?? '').not.toMatch(/state a budget/)
  })

  it('opening a person shows what they said, in their own words', async () => {
    vi.mocked(reportsApi.sessionReport).mockResolvedValue(SERVED as any)
    wrap()
    fireEvent.click(await screen.findByRole('button', { name: 'Mercy' }))
    const own = screen.getByRole('heading', { name: 'Mercy, in their own words' }).parentElement as HTMLElement
    expect(within(own).getByText('“Greenfield took delivery of the 25 units today and paid on delivery.”')).toBeTruthy()
    expect(within(own).getByText('“I sent Peter the quote for 30 units, KES 150,000, by email this morning.”')).toBeTruthy()
  })

  it('where customers gave a price range, she reads why the numbers don’t match, each way', async () => {
    const says = [
      'Some of Mercy and Kevin’s customers gave a price range, not a fixed amount. For example, Lakeside Supermarket gave KES 80,000 to 120,000. You have not decided yet whether a price range counts as the customer’s budget, so the same deals can be counted two ways.',
      'This affects two sales: Lakeside Supermarket and Westgate Deli. If a price range counts, three deals are qualified, worth KES 182,500: Lakeside Supermarket, Westgate Deli and Juja Hardware. If it does not, one deal is qualified, worth KES 22,500: Juja Hardware.',
      'Nobody is doing anything wrong. The team has not agreed on one rule yet.',
    ]
    vi.mocked(reportsApi.sessionReport).mockResolvedValue({ ...SERVED, theTeamsDay: { ...SERVED.theTeamsDay, whyTheNumbersDontMatch: says } } as any)
    wrap()
    expect(await screen.findByText('Why the numbers don’t match')).toBeTruthy()
    for (const s of says) expect(screen.getByText(s)).toBeTruthy()
  })

  /*
   * 14 October on the test bed (Drop Access short run, 18 October): the board as the API served it to Grace. Mercy's and
   * Joseph's "him" is named from the line before in their check-in; Kevin's is named nowhere, so his own words stay, in
   * quotation marks; Greenfield's "they'll pay then" is what happened, never Mercy's "Will do".
   */
  it('reads who "him" is in each "Will do", and never Greenfield’s promise as Mercy’s', async () => {
    vi.mocked(reportsApi.sessionReport).mockResolvedValue(SERVED as any)
    vi.mocked(boardApi.get).mockResolvedValue({ ...BOARD, whoOwnsWhat: [
      { name: 'Mercy Wairimu', items: [
        { type: 'PROGRESS', sessionNumber: 5, text: 'Mercy Wairimu said, "Delivery is set for Friday, and they\'ll pay then."' },
        { type: 'COMMITMENT', sessionNumber: 5, text: 'Mercy Wairimu said, "I\'ll call him again on Thursday morning. I\'ll follow up again on Thursday if they\'re not there."', withTheName: "I'll call Joseph again on Thursday morning. I'll follow up again on Thursday if they're not there." },
      ] },
      { name: 'Joseph Kariuki', items: [
        { type: 'COMMITMENT', sessionNumber: 5, text: 'Joseph Kariuki said, "I\'ll ask Grace first about the price, then I\'ll call him back."', withTheName: "I'll ask Grace first about the price, then I'll call Mr Kariuki back." },
      ] },
      { name: 'Kevin Omondi', items: [{ type: 'COMMITMENT', sessionNumber: 5, text: 'Kevin Omondi said, "I\'ll follow up with him on Monday."' }] },
    ] } as any)
    wrap()
    await screen.findByRole('heading', { name: 'The team’s report, Sunday 18 October' })
    const text = document.body.textContent ?? ''
    expect(text).toContain("Will do: I'll call Joseph again on Thursday morning. I'll follow up again on Thursday if they're not there.")
    expect(text).toContain("Will do: I'll ask Grace first about the price, then I'll call Mr Kariuki back.")
    expect(text).toContain('Will do: "I\'ll follow up with him on Monday."')
    expect(text).not.toMatch(/Will do: [^W]*pay then/)
  })

  /*
   * Hafsah's quality pass of 18 October, section 4: the report for Wednesday 14 October on the short run (gw_sweep_drop3), as the
   * API now serves it to Grace (the-team-report-of-14-october-as-each-reader-reads-it.spec.ts builds these lines from the record).
   */
  it('reads the report of 14 October as the findings ask: how much it relies on, the news, each person in short and marked, and the closing line', async () => {
    const DAY = {
      day: '2026-10-14', title: 'The team’s report, Wednesday 14 October',
      lastUpdated: 'Last updated on Wednesday 14 October at 2:09pm, when Joseph checked in. It only changes when something new comes in, such as a check-in, a document or a number from another system.',
      inShort: [
        'Four sales moved forward on 14 October, but none of them has proof yet.',
        'Savannah Cafe said yes to 6 units, and Jane pays a KES 15,000 deposit on Friday 16 October.',
        'Mercy quoted Mama Mboga Mart KES 10,000.',
        'Joseph has still not brought the samples for Tuskys Westgate, promised three check-ins running.',
        'Joseph is waiting on your answer on 5 units at KES 4,500 each for Juja Hardware.',
      ],
      moved: [
        { dealId: 'd-mama', name: 'Mama Mboga Mart', owner: 'Mercy', from: 'Need established', to: 'Quoted', proven: false, says: 'Now quoted. Mercy quoted Rose KES 10,000 for 2 units.' },
        { dealId: 'd-savannah', name: 'Savannah Cafe', owner: 'Kevin', from: 'Quoted', to: 'Quoted', proven: false, saidYes: true, says: 'Jane said yes to 6 units at KES 30,000. Jane pays a KES 15,000 deposit on Friday 16 October.' },
      ],
      whyTheNumbersDontMatch: null,
      whereTheySeeItDifferently: ['You expect Kevin, Mercy and Joseph to sell 40 units each.', 'Kevin said on 13 October that Kevin’s own aim is all 120 units, not 40. Kevin has not told you.'],
      howSure: 'How sure Groundwork is about this report: sure about Kilele Hotel, which is backed by M-Pesa, and Greenfield Supermarket, which has a signed order. Not sure about the deals still open, which are each person’s word so far.',
    }
    vi.mocked(reportsApi.sessionReport).mockResolvedValue({
      ...SERVED, released: true, theTeamsDay: DAY,
      confidence: { band: 'partial', saying: 'All 3 people checked in, and 3 of the 26 things said have a document behind them.', reasons: ['Joseph’s “I\'ll ask Grace first about the price, then I\'ll call Mr Kariuki back” has no date.'] },
      whatWentQuiet: 'Kevin is waiting on Ali at Ngong Road Minimart and on Jane’s deposit at Savannah Cafe. Neither came up after 14 October.',
      whatEachPersonSaid: [
        { who: 'Mercy Wairimu', isYou: false, lines: ['I quoted her KES 10,000 for the two units.'], mark: 'said', inShort: 'Quoted Rose at Mama Mboga Mart KES 10,000 for 2 units. Greenfield Supermarket pays the KES 125,000 on delivery on Friday 16 October.', willDo: 'Call Joseph again on Thursday morning.' },
        { who: 'Joseph Kariuki', isYou: false, lines: ['Wanjiru said to call her next week.'], mark: 'said', inShort: 'Mr Kariuki at Juja Hardware wants 5 units if they are KES 4,500 each. The samples for Tuskys Westgate, promised three check-ins running, still not done.', willDo: 'Get your answer on the price first, then call Mr Kariuki at Juja Hardware back.' },
        { who: 'Kevin Omondi', isYou: false, lines: ['Savannah Cafe said yes to 6 units.'], mark: 'said', inShort: 'Savannah Cafe said yes to 6 units. Quoted Ali at Ngong Road Minimart KES 20,000 for 4 units.', willDo: 'Follow up with Ali at Ngong Road Minimart on Monday.' },
      ],
      whereThingsStand: { openWithReasons: [{ topic: 't', positions: [{ who: 'You', view: 'Expects Kevin Omondi, Mercy Wairimu, and Joseph Kariuki to each sell 40 units.' }, { who: 'Kevin Omondi', view: 'Is personally aiming to sell all 120 units.' }] }] },
      whatIDontKnowYet: [
        { title: 'Whether Joseph brought the samples for Tuskys Westgate on Thursday 15 October', says: 'Nobody has said since. Next: Mercy will be asked.' },
        { title: 'When Wanjiru, Ali, Rose and Mr Kariuki will buy', says: 'No buying date is on record for any of them. Next: Joseph, Kevin and Mercy will be asked.' },
        { title: 'What Upper Hill Offices needs', says: 'Kevin has not reached Paul since 12 October. Next: Kevin will be asked.' },
      ],
    } as any)
    wrap()
    await screen.findByRole('heading', { name: 'The team’s report, Wednesday 14 October' })
    const text = document.body.textContent ?? ''
    expect(text).toContain('How much this report can rely on: medium. All 3 people checked in, and 3 of the 26 things said have a document behind them.')
    expect(text).toContain('Joseph’s “I\'ll ask Grace first about the price, then I\'ll call Mr Kariuki back” has no date.')
    expect(text).not.toContain('can rely on: high')
    for (const l of DAY.inShort) expect(screen.getByText(l)).toBeTruthy()
    expect(screen.getByText('Jane said yes to 6 units at KES 30,000. Jane pays a KES 15,000 deposit on Friday 16 October.')).toBeTruthy()
    expect(screen.getByText('Now quoted. Mercy quoted Rose KES 10,000 for 2 units.')).toBeTruthy()
    expect(text).toContain('Will do: Call Joseph again on Thursday morning.')
    expect(text).toContain('Will do: Get your answer on the price first, then call Mr Kariuki at Juja Hardware back.')
    expect(text).toContain('Will do: Follow up with Ali at Ngong Road Minimart on Monday.')
    expect(screen.getAllByRole('img', { name: 'Only someone’s word' })).toHaveLength(3)
    expect(screen.getByText('Kevin said on 13 October that Kevin’s own aim is all 120 units, not 40. Kevin has not told you.')).toBeTruthy()
    expect(text).not.toContain('Is personally aiming to sell all 120 units.')
    expect(screen.getByText('Kevin is waiting on Ali at Ngong Road Minimart and on Jane’s deposit at Savannah Cafe. Neither came up after 14 October.')).toBeTruthy()
    expect(screen.getByText('What Upper Hill Offices needs')).toBeTruthy()
    expect(text).not.toContain('How are you making your number?')
    expect(screen.getByText(DAY.howSure)).toBeTruthy()
  })

  it('D-3: the question’s "No" is the prototype’s quiet button beside the answer', async () => {
    vi.mocked(reportsApi.sessionReport).mockResolvedValue(SERVED as any)
    vi.mocked(boardApi.get).mockResolvedValue({ ...BOARD, decisions: [{ question: 'Can Juja Hardware have 5 units at KES 4,500 each?', why: 'Joseph asked you on 14 October.', action: { choices: [
      { label: 'Yes, agree to it', route: { method: 'POST', path: `/grounds/${G}/board/answer`, body: {} } },
      { label: 'No', route: { method: 'POST', path: `/grounds/${G}/board/answer`, body: {} } },
    ] } }] } as any)
    wrap()
    const no = await screen.findByRole('button', { name: 'No' })
    expect(no.className).toMatch(/quiet/)
    expect(screen.getByRole('button', { name: 'Yes, agree to it' }).className).toMatch(/pri/)
  })

  it('with Release 1’s switch off, the report reads as before', async () => {
    const { theTeamsDay: _gone, releaseOneSalesReport: _off, ...before } = SERVED
    vi.mocked(reportsApi.sessionReport).mockResolvedValue({ ...before, whatEachPersonSaid: PEOPLE.map(({ inShort: _x, ...p }) => p) } as any)
    vi.mocked(boardApi.get).mockResolvedValue({ ...BOARD, releaseOneSalesBoard: false } as any)
    wrap()
    expect(await screen.findByText('This is what changed since the last round. You stated each of the three team members...')).toBeTruthy()
    expect(screen.queryByText('Four sales moved forward today, but none of them has proof yet.')).toBeNull()
    expect(screen.getByText(/Greenfield took delivery of the 25 units today/)).toBeTruthy()
  })
})

/* F5 part 3 (stage 9): the report opens with "Against the target", the board's own question and answer, as the lead reads it. */
describe('the team’s report, against the target, as the lead reads it', () => {
  it('says the board’s question and its answer under "Against the target"', async () => {
    vi.mocked(reportsApi.sessionReport).mockResolvedValue(SERVED as any)
    vi.mocked(boardApi.get).mockResolvedValue({ ...BOARD, headline: { question: 'Will we reach 25 sales by 31 December?', answer: '3 deals named today, none closed yet.', bars: [] } } as any)
    wrap()
    const h = await screen.findByRole('heading', { name: 'Against the target' })
    const section = h.closest('section') as HTMLElement
    expect(within(section).getByText('Will we reach 25 sales by 31 December?')).toBeTruthy()
    expect(within(section).getByText('3 deals named today, none closed yet.')).toBeTruthy()
  })
  it('draws nothing where the record holds no team aim', async () => {
    vi.mocked(reportsApi.sessionReport).mockResolvedValue(SERVED as any)
    vi.mocked(boardApi.get).mockResolvedValue(BOARD as any)
    wrap()
    await screen.findByRole('heading', { name: 'The team’s report, Sunday 18 October' })
    expect(screen.queryByRole('heading', { name: 'Against the target' })).toBeNull()
  })
})
