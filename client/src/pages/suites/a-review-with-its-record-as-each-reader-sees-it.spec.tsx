import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReviewPage } from './ReviewPage'
import { useAuthStore } from '@/stores/auth'
import type { AReview, ReviewForTheWriter, ReviewForThePerson, TheRecord } from '@/api/suites'

/**
 * ONE REVIEW WITH WHAT THE SERVER NOW SENDS: the record Groundwork understands (the person marks a
 * line wrong and says what is true), the writer's briefing, and "Groundwork suggests recognising
 * Aisha’s work". The sentences are the ones the server writes, copied from its own specs
 * (the-record-in-a-review..., the-briefing-for-a-review... and recognising-in-a-review...).
 */
vi.mock('@/api/suites', () => ({ reviewsApi: { board: vi.fn(), mine: vi.fn(), start: vi.fn(), one: vi.fn(), words: vi.fn(), view: vi.fn(), decide: vi.fn(), correct: vi.fn() } }))
import { reviewsApi } from '@/api/suites'

const NOTICED = [{ says: 'Closed 9 sales since March. Paystack shows all 9 payments.', mark: 'proven' as const }]

const RECORD_FOR_AISHA: TheRecord = {
  intro: 'This is what Groundwork understands from the record about your work between 1 April 2026 and 1 October 2026. It comes from your check-ins, the goals and work-plan items you own, what you committed to and how each one went, and what you said was holding you up. If a line is wrong, mark it and say what is true. Your correction is kept beside the line, and the record itself is not changed.',
  whoReads: 'Wairimu reads your corrections and your own view before you meet. Lines from check-ins that Wairimu is not in stay with you, and so does anything you say about them. If you want Wairimu to know, put it in your own view.',
  mayCorrect: true,
  parts: [
    { part: 'worked-on', heading: 'What you worked on', lines: [
      { key: 'checkins:g1', says: 'You checked in 3 times in “Sales team, Q3”, which Wairimu runs, between 6 April 2026 and 28 September 2026.', correction: null },
    ] },
    { part: 'delayed', heading: 'What took longer than first said', lines: [
      { key: 'commitment:c2', says: 'On 4 May 2026, in “Sales team, Q3”, you committed to send the price list to Carrefour. It was marked as not done on 18 May 2026.',
        correction: { said: 'You marked this as wrong on 1 October 2026, and said what is true.', whatIsTrue: 'Carrefour asked us to wait until their new buyer started in June.' } },
    ] },
  ],
}
const FOR_AISHA: ReviewForThePerson = {
  reader: 'person', id: 'r-a', firstName: 'Aisha', writtenWithFirstName: 'Wairimu', dueOn: '2026-10-20', noticed: NOTICED, theirView: null, decision: null,
  managersWords: null, managersWordsHeading: null, whereYouDiffer: null,
  record: RECORD_FOR_AISHA,
  recognise: {
    facts: 'In the four weeks before your review started, you kept nine of your ten commitments in your check-ins with Wairimu. When at least nine in ten are kept, Groundwork suggests to Wairimu that your work is recognised.',
    whoDecides: 'Wairimu decides, and you read the reasons.',
  },
}
const FOR_WAIRIMU: ReviewForTheWriter = {
  reader: 'writer', id: 'r-a', name: 'Aisha Otieno', firstName: 'Aisha', writtenWith: 'Wairimu Kamau', writtenWithFirstName: 'Wairimu', dueOn: '2026-10-20',
  noticed: NOTICED, managersWords: null, theirView: 'I want to lead the supermarket accounts, but I need faster stock.', decision: null, mayWrite: true,
  record: {
    intro: 'This is what Groundwork understands from the record about Aisha’s work between 1 April 2026 and 1 October 2026, from the check-ins you are in. Aisha reads it too, and can mark any line as wrong and say what is true.',
    whoReads: null, mayCorrect: false,
    parts: [{ part: 'delayed', heading: 'What took longer than first said', lines: [RECORD_FOR_AISHA.parts[1].lines[0]] }],
  },
  recognise: {
    headline: 'Groundwork suggests recognising Aisha’s work',
    why: 'Aisha kept nine of the ten commitments made in your check-ins together in the four weeks before this review started. When at least nine in ten are kept, Groundwork suggests recognising the work.',
    whatWouldChangeIt: 'If Aisha keeps fewer than nine in ten of them from now on.',
    yourDecision: 'This is only a suggestion. You decide, and Aisha sees your reasons.',
  },
  briefing: {
    heading: 'Your briefing for Aisha’s review',
    counts: 'In the check-ins you are in with Aisha, Aisha made 5 commitments between 6 April 2026 and 28 September 2026. Aisha kept 2 of them, 1 was not done, 1 was dropped and 1 was still open when this review started.',
    /* 2 November 2026 (F2): the briefing reads layer 2, what the record shows about Aisha with the days and words it rests on,
       and the next step; the person's answer and the "sees them first" note were the stored pattern's, which no lead reads now. */
    patterns: [{
      heading: 'Aisha has let 2 promised days pass without the work done.',
      whatHappened: 'On 4 May, the words were "I will send the price list to Carrefour by Friday." On 18 May, the words were "I will call Naivas on Monday."',
      howOften: 'This rests on 2 separate things from 2 check-ins.',
      checkIn: 'Sales team, Q3',
      nextStep: 'Talk with Aisha about it. Aisha has let 2 promised days pass without the work done.',
    }],
    changedAfterEarlierConversations: ['You talked with Aisha about this on 25 September 2026. Aisha has let 2 promised days pass without the work done.'],
    corrections: [{
      line: 'On 4 May 2026, in “Sales team, Q3”, Aisha committed to send the price list to Carrefour. It was marked as not done on 18 May 2026.',
      said: 'Aisha marked this as wrong on 1 October 2026, and said what is true.',
      whatIsTrue: 'Carrefour asked us to wait until their new buyer started in June.',
    }],
    whoDecides: 'There are no scores. Groundwork gives you the evidence and the patterns, and you decide. Aisha sees your reasons.',
  },
}
const FOR_GRACE: AReview = {
  ...FOR_WAIRIMU, reader: 'admin', mayWrite: false, recognise: null,
  briefing: { heading: 'The briefing for Aisha’s review', counts: null, patterns: [], changedAfterEarlierConversations: [], corrections: [], whoDecides: 'There are no scores. Groundwork gives the evidence and the patterns, and Wairimu decides. Aisha sees the reasons.' },
}

const GRACE = { id: 'u-g', firstName: 'Grace', role: 'ADMIN', organizationName: 'Baridi Appliances' }
const WAIRIMU = { id: 'u-w', firstName: 'Wairimu', role: 'LEAD', organizationName: 'Baridi Appliances' }
const AISHA = { id: 'u-a', firstName: 'Aisha', role: 'MEMBER', organizationName: 'Baridi Appliances' }

function open(user: any, served: AReview) {
  ;(reviewsApi.one as any).mockResolvedValue(served)
  useAuthStore.setState({ user, token: 't', isAuthenticated: true } as any)
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/suite/reviews/r-a']}><Routes><Route path="/suite/reviews/:id" element={<ReviewPage />} /></Routes></MemoryRouter>
    </QueryClientProvider>,
  )
}
const text = () => document.body.textContent ?? ''
beforeEach(() => { vi.clearAllMocks() })

describe('Aisha, the person the review is about', () => {
  it('reads every line of the record said to her as “you”, who reads her corrections, and her correction beside the line', async () => {
    open(AISHA, FOR_AISHA)
    const record = await screen.findByRole('region', { name: 'What Groundwork understands about your work' })
    expect(within(record).getByText(RECORD_FOR_AISHA.intro)).toBeInTheDocument()
    expect(within(record).getByText(RECORD_FOR_AISHA.whoReads!)).toBeInTheDocument()
    const delayed = within(record).getByRole('list', { name: 'What took longer than first said' })
    expect(within(delayed).getByText(RECORD_FOR_AISHA.parts[1].lines[0].says)).toBeInTheDocument()
    expect(within(delayed).getByText('You marked this as wrong on 1 October 2026, and said what is true.')).toBeInTheDocument()
    expect(within(delayed).getByText('“Carrefour asked us to wait until their new buyer started in June.”')).toBeInTheDocument()
  })

  it('marks a line as wrong, says what is true, and reads what the server sends back', async () => {
    const after: ReviewForThePerson = { ...FOR_AISHA, record: { ...RECORD_FOR_AISHA, parts: [
      { ...RECORD_FOR_AISHA.parts[0], lines: [{ ...RECORD_FOR_AISHA.parts[0].lines[0], correction: { said: 'You marked this as wrong on 4 October 2026, and said what is true.', whatIsTrue: 'It was 4 times, not 3.' } }] },
      RECORD_FOR_AISHA.parts[1],
    ] } }
    ;(reviewsApi.correct as any).mockResolvedValue(after)
    open(AISHA, FOR_AISHA)
    const worked = await screen.findByRole('list', { name: 'What you worked on' })
    fireEvent.click(within(worked).getByRole('button', { name: /^This is wrong/ }))
    const save = within(worked).getByRole('button', { name: 'Save what is true' })
    expect(save).toBeDisabled()
    fireEvent.change(within(worked).getByLabelText('What is true'), { target: { value: 'It was 4 times, not 3.' } })
    fireEvent.click(save)
    await waitFor(() => expect(reviewsApi.correct).toHaveBeenCalledWith('r-a', 'checkins:g1', 'It was 4 times, not 3.'))
    expect(await within(worked).findByText('“It was 4 times, not 3.”')).toBeInTheDocument()
  })

  it('reads her own count and who decides, and never the suggestion card or the briefing', async () => {
    open(AISHA, FOR_AISHA)
    const s = await screen.findByRole('region', { name: 'What Groundwork may suggest to Wairimu' })
    expect(within(s).getByText(FOR_AISHA.recognise!.facts)).toBeInTheDocument()
    expect(within(s).getByText('Wairimu decides, and you read the reasons.')).toBeInTheDocument()
    expect(screen.queryByText('Agree')).toBeNull()
    expect(text()).not.toContain('briefing')
  })
})

describe('Wairimu, who writes the review', () => {
  it('reads the record from the check-ins she is in, with no way to mark a line wrong', async () => {
    open(WAIRIMU, FOR_WAIRIMU)
    const record = await screen.findByRole('region', { name: 'What Groundwork understands about Aisha’s work' })
    expect(within(record).getByText(FOR_WAIRIMU.record!.intro)).toBeInTheDocument()
    expect(within(record).queryByRole('button', { name: /This is wrong/ })).toBeNull()
    expect(within(record).getByText('“Carrefour asked us to wait until their new buyer started in June.”')).toBeInTheDocument()
  })

  it('reads her briefing, word for word', async () => {
    open(WAIRIMU, FOR_WAIRIMU)
    const b = await screen.findByRole('region', { name: 'Your briefing for Aisha’s review' })
    const t = FOR_WAIRIMU.briefing!
    expect(within(b).getByText(t.counts!)).toBeInTheDocument()
    const patterns = within(b).getByRole('list', { name: 'What keeps coming up' })
    expect(within(patterns).getByText(t.patterns[0].heading)).toBeInTheDocument()
    expect(within(patterns).getByText(t.patterns[0].whatHappened!)).toBeInTheDocument()
    expect(within(patterns).getByText('This rests on 2 separate things from 2 check-ins.')).toBeInTheDocument()
    expect(within(patterns).getByText(t.patterns[0].nextStep!)).toBeInTheDocument()
    expect(within(b).queryByText(/sees them first/)).toBeNull()
    expect(within(b).getByText(t.changedAfterEarlierConversations[0])).toBeInTheDocument()
    expect(within(b).getByText(t.corrections[0].line)).toBeInTheDocument()
    expect(within(b).getByText('There are no scores. Groundwork gives you the evidence and the patterns, and you decide. Aisha sees your reasons.')).toBeInTheDocument()
  })

  it('reads "Groundwork suggests recognising Aisha’s work" with the prototype’s words and buttons', async () => {
    open(WAIRIMU, FOR_WAIRIMU)
    const card = await screen.findByRole('region', { name: 'Groundwork suggests recognising Aisha’s work' })
    const t = FOR_WAIRIMU.recognise!
    for (const line of [t.headline, t.why, t.whatWouldChangeIt, t.yourDecision]) expect(within(card).getByText(line)).toBeInTheDocument()
    expect(within(card).getAllByRole('button').map(b => b.textContent)).toEqual(['Agree', 'Choose something else'])
  })

  it('"Agree" fills in the decision for her to give reasons; "Choose something else" empties it; the server is told nothing until she saves', async () => {
    open(WAIRIMU, FOR_WAIRIMU)
    const card = await screen.findByRole('region', { name: 'Groundwork suggests recognising Aisha’s work' })
    const decision = screen.getByRole('textbox', { name: 'Your decision' }) as HTMLInputElement
    fireEvent.click(within(card).getByRole('button', { name: 'Agree to recognise Aisha’s work' }))
    expect(decision.value).toBe('Recognise Aisha’s work.')
    fireEvent.click(within(card).getByRole('button', { name: 'Choose something else' }))
    expect(decision.value).toBe('')
    expect(reviewsApi.decide).not.toHaveBeenCalled()
  })
})

describe('Grace, an admin who does not write it', () => {
  it('reads the briefing for Aisha’s review with only what she may read, and no suggestion card', async () => {
    open(GRACE, FOR_GRACE)
    const b = await screen.findByRole('region', { name: 'The briefing for Aisha’s review' })
    expect(within(b).getByText('There are no scores. Groundwork gives the evidence and the patterns, and Wairimu decides. Aisha sees the reasons.')).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: /suggests recognising/ })).toBeNull()
    expect(within(b).queryByRole('list', { name: 'What keeps coming up' })).toBeNull()
  })
})

describe('a review started before the record was read', () => {
  it('draws no record and no briefing, and still reads', async () => {
    open(WAIRIMU, { ...FOR_WAIRIMU, record: null, briefing: undefined, recognise: null })
    await screen.findByRole('heading', { level: 1, name: 'Aisha’s review, October' })
    expect(screen.queryByRole('region', { name: /What Groundwork understands/ })).toBeNull()
  })
})
