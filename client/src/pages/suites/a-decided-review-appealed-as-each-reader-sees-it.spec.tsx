import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReviewPage } from './ReviewPage'
import { useAuthStore } from '@/stores/auth'
import type { ReviewForTheWriter, ReviewForThePerson } from '@/api/suites'

/** Appealing a decided review (decision 113). The sentences are the server's own, from its spec. */
vi.mock('@/api/suites', () => ({ reviewsApi: { one: vi.fn(), appeal: vi.fn(), addToTheAppeal: vi.fn(), decideTheAppeal: vi.fn() } }))
import { reviewsApi } from '@/api/suites'

const DECISION = { says: 'Juma stays on the Kisumu route.', reasons: 'He has carried it since June.' }
const PERSON: ReviewForThePerson = {
  reader: 'person', id: 'r1', firstName: 'Juma', writtenWithFirstName: 'Grace', dueOn: '2026-10-20', noticed: [], theirView: null,
  managersWords: null, managersWordsHeading: null, whereYouDiffer: null, decision: DECISION,
  mayAppeal: true, mayAppealSays: 'If you disagree with this decision, you can appeal it. An admin other than Grace reads the review, your side and your reasons, and decides.', appeal: null,
}
const APPEALED: ReviewForThePerson = {
  ...PERSON, mayAppeal: false, mayAppealSays: null,
  appeal: { stands: 'with-an-admin', says: 'You have appealed this decision. An admin other than Grace reads your reasons and decides. You can add to your reasons until then.',
    appealedOn: '8 October', yourReasons: 'I was never asked about the route.', additions: [{ said: 'I also covered for Peter.', on: '9 October' }],
    outcome: null, decidedByFirstName: null, reasons: null, decisionWas: null },
}
const DECIDED: ReviewForThePerson = {
  ...APPEALED, decision: { says: 'Juma leads the Kisumu route.', reasons: 'Baraka changed it.' },
  appeal: { ...APPEALED.appeal!, stands: 'decided', says: 'Baraka, an admin, has read your appeal and has changed the decision. The decision and the reasons on your review are now the new ones.',
    outcome: 'changed', decidedByFirstName: 'Baraka', reasons: 'Juma covered the route for four months.', decisionWas: DECISION },
}
const BASE: ReviewForTheWriter = {
  reader: 'admin', id: 'r1', name: 'Juma Otieno', firstName: 'Juma', writtenWith: 'Grace Wanjiru', writtenWithFirstName: 'Grace', dueOn: '2026-10-20',
  noticed: [], managersWords: 'Fine.', managersWordsById: 'u-g', theirView: null, decision: DECISION, mayWrite: false,
}
const FOR_BARAKA: ReviewForTheWriter = { ...BASE, appeal: {
  reader: 'admin', stands: 'with-an-admin', says: 'Juma appealed Grace’s decision on 8 October. You are an admin who did not decide this review, so you decide the appeal. Juma and Grace both read your reasons.',
  personFirstName: 'Juma', appealedOn: '8 October', theirReasons: 'I was never asked about the route.', additions: [{ said: 'I also covered for Peter.', on: '9 October' }],
  mayDecide: true, outcome: null, decidedByFirstName: null, reasons: null, decisionWas: null } }
const FOR_GRACE: ReviewForTheWriter = { ...BASE, appeal: {
  reader: 'reviewer', stands: 'with-an-admin', says: 'Juma has appealed your decision. An admin other than you reads the review, Juma’s side and the reasons, and decides.',
  personFirstName: 'Juma', appealedOn: '8 October', mayDecide: false, outcome: null, decidedByFirstName: null, reasons: null, decisionWas: null } }

function open(user: any) {
  useAuthStore.setState({ user, token: 't', isAuthenticated: true } as any)
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={qc}><MemoryRouter initialEntries={['/suite/reviews/r1']}><Routes><Route path="/suite/reviews/:id" element={<ReviewPage />} /></Routes></MemoryRouter></QueryClientProvider>)
}
const text = () => document.body.textContent ?? ''
const U = (id: string, firstName: string, role: string) => ({ id, firstName, role, organizationName: 'Baridi' })
beforeEach(() => vi.clearAllMocks())

describe('the person', () => {
  it('reads the server’s sentence and appeals with their reasons', async () => {
    ;(reviewsApi.one as any).mockResolvedValue(PERSON)
    ;(reviewsApi.appeal as any).mockResolvedValue(APPEALED)
    open(U('u-j', 'Juma', 'MEMBER'))
    expect(await screen.findByText(PERSON.mayAppealSays!)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Appeal this decision' }))
    fireEvent.change(screen.getByLabelText('Why you disagree'), { target: { value: 'I was never asked about the route.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send my appeal' }))
    await waitFor(() => expect(reviewsApi.appeal).toHaveBeenCalledWith('r1', 'I was never asked about the route.'))
    expect(await screen.findByText(APPEALED.appeal!.says)).toBeInTheDocument()
    expect(text()).toContain('I also covered for Peter.')
  })
  it('adds to the reasons until it is decided', async () => {
    ;(reviewsApi.one as any).mockResolvedValue(APPEALED)
    ;(reviewsApi.addToTheAppeal as any).mockResolvedValue(APPEALED)
    open(U('u-j', 'Juma', 'MEMBER'))
    fireEvent.change(await screen.findByLabelText('Add to your reasons'), { target: { value: 'One more thing.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add to my reasons' }))
    await waitFor(() => expect(reviewsApi.addToTheAppeal).toHaveBeenCalledWith('r1', 'One more thing.'))
  })
  it('reads who writes the review, not the admin who changed the decision on appeal', async () => {
    ;(reviewsApi.one as any).mockResolvedValue({ ...DECIDED, writtenWithFirstName: 'Baraka', writerFirstName: 'Grace' })
    open(U('u-j', 'Juma', 'MEMBER'))
    expect(await screen.findByRole('heading', { name: 'What Grace writes' })).toBeInTheDocument()
    expect(text()).toContain('Grace has not written anything yet.')
    expect(text()).not.toContain('What Baraka writes')
    expect(text()).not.toContain('Baraka has not written anything yet.')
  })
  it('reads the outcome, the admin’s reasons and what the decision said before, with nothing more to add', async () => {
    ;(reviewsApi.one as any).mockResolvedValue(DECIDED)
    open(U('u-j', 'Juma', 'MEMBER'))
    expect(await screen.findByText(DECIDED.appeal!.says)).toBeInTheDocument()
    expect(text()).toContain('Juma covered the route for four months.')
    expect(text()).toContain('What the decision said before')
    expect(screen.queryByLabelText('Add to your reasons')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Appeal this decision' })).toBeNull()
  })

  /*
   * SCREEN FAULT (engine workspace, 9 October night, test bed copy a): Imani Hassan, after Grace
   * decided her review and Imani appealed, still read "No scores. You and Grace talk it through,
   * and Grace decides." under "Your appeal" - a sentence about how a decision gets made, left
   * standing once it had already been made and even appealed. This fails before the fix (the
   * line is always drawn for the person) and passes after (it is left out once the review is
   * decided, for both an appeal still with an admin and one already decided).
   */
  it('drops "No scores" once the review is decided, under an appeal still waiting', async () => {
    ;(reviewsApi.one as any).mockResolvedValue(APPEALED)
    open(U('u-j', 'Juma', 'MEMBER'))
    await screen.findByText(APPEALED.appeal!.says)
    expect(text()).not.toContain('No scores.')
  })
  it('drops "No scores" once the review is decided, under a decided appeal', async () => {
    ;(reviewsApi.one as any).mockResolvedValue(DECIDED)
    open(U('u-j', 'Juma', 'MEMBER'))
    await screen.findByText(DECIDED.appeal!.says)
    expect(text()).not.toContain('No scores.')
  })
})

describe('an admin who did not decide it', () => {
  it('reads the person’s reasons and decides, giving the new decision when it is changed', async () => {
    ;(reviewsApi.one as any).mockResolvedValue(FOR_BARAKA)
    ;(reviewsApi.decideTheAppeal as any).mockResolvedValue(FOR_BARAKA)
    open(U('u-b', 'Baraka', 'ADMIN'))
    expect(await screen.findByText(FOR_BARAKA.appeal!.says)).toBeInTheDocument()
    expect(text()).toContain('I was never asked about the route.')
    expect(text()).toContain('I also covered for Peter.')
    fireEvent.click(screen.getByLabelText('Change the decision'))
    fireEvent.change(screen.getByLabelText('What the decision is now'), { target: { value: 'Juma leads the Kisumu route.' } })
    fireEvent.change(screen.getByLabelText('Your reasons, in a sentence or two'), { target: { value: 'He covered it for four months.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save my decision on the appeal' }))
    await waitFor(() => expect(reviewsApi.decideTheAppeal).toHaveBeenCalledWith('r1', { outcome: 'changed', reasons: 'He covered it for four months.', decision: 'Juma leads the Kisumu route.' }))
  })
})

describe('the reviewer', () => {
  it('reads only where it stands, and has no form and no reasons of the person', async () => {
    ;(reviewsApi.one as any).mockResolvedValue(FOR_GRACE)
    open(U('u-g', 'Grace', 'ADMIN'))
    expect(await screen.findByText(FOR_GRACE.appeal!.says)).toBeInTheDocument()
    expect(text()).not.toContain('I was never asked')
    expect(screen.queryByRole('button', { name: 'Save my decision on the appeal' })).toBeNull()
  })
})
