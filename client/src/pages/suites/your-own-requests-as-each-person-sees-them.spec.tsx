import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { YourRequestsPage } from './YourRequestsPage'
import { useAuthStore } from '@/stores/auth'

/**
 * A PERSON'S OWN REQUESTS (#/suite/mine), AS EACH PERSON SEES IT. Who is served what is tested on the
 * server (a-question-about-leave-as-each-reader-reads-it.spec.ts). Here: every sentence is the server's,
 * the answer box is there only when a question waits, and a person whose suite is off is told so in
 * the server's words.
 */
vi.mock('@/api/suites', () => ({
  yourRequestsApi: { leave: vi.fn(), spending: vi.fn(), hours: vi.fn(), answerLeave: vi.fn(), answerSpending: vi.fn() },
  reviewsApi: { mineQuietly: vi.fn(async () => []) },
}))
import { yourRequestsApi, reviewsApi } from '@/api/suites'

const refusal = (status: number, message: string) => Object.assign(new Error(String(status)), { response: { status, data: { message } } })
const AISHA = { id: 'u-a', firstName: 'Aisha', role: 'MEMBER', organizationName: 'Baridi Appliances' }

const LEAVE = {
  daysLeftSaid: 'You have 16 days of leave left this year, out of 21.',
  requests: [
    {
      id: 'l1', status: 'waiting' as const,
      where: 'Your leave from Monday 12 October to Friday 16 October is waiting for Wairimu.',
      questions: ['Wairimu asked you on 5 October, “Who will cover the Project X milestone?”', 'You have not answered yet. You can answer it here or in Ask Groundwork.'],
      questionWaiting: { id: 'q1', question: 'Who will cover the Project X milestone?', askedBy: 'Wairimu' },
      declinedBecause: null,
    },
    {
      id: 'l2', status: 'declined' as const,
      where: 'Your leave from Monday 5 October to Tuesday 6 October was declined by Wairimu.',
      questions: [], questionWaiting: null, declinedBecause: 'Wairimu said, “Sales is two short that week.”',
    },
  ],
}
const SPENDING = {
  requests: [{
    id: 's1', status: 'approved' as const,
    where: 'Your request to spend KES 12,000 for tyres for the van is approved by Fatuma.',
    questions: [], questionWaiting: null, declinedBecause: null,
  }],
}

const OFF = Object.assign(new Error('404'), { response: { status: 404, data: { message: 'Time sheets are not switched on in your organisation.' } } })

function open(leave: any, spending: any, hours: any = OFF) {
  ;(yourRequestsApi.leave as any).mockImplementation(() => (leave instanceof Error ? Promise.reject(leave) : Promise.resolve(leave)))
  ;(yourRequestsApi.spending as any).mockImplementation(() => (spending instanceof Error ? Promise.reject(spending) : Promise.resolve(spending)))
  ;(yourRequestsApi.hours as any).mockImplementation(() => (hours instanceof Error ? Promise.reject(hours) : Promise.resolve(hours)))
  useAuthStore.setState({ user: AISHA, token: 't', isAuthenticated: true } as any)
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={qc}><MemoryRouter><YourRequestsPage /></MemoryRouter></QueryClientProvider>)
}

describe('Aisha reads her own requests', () => {
  it('reads the days left, where each request stands, the question asked, and what was said when one was declined', async () => {
    open(LEAVE, SPENDING)
    expect(await screen.findByText('You have 16 days of leave left this year, out of 21.')).toBeTruthy()
    expect(screen.getByText('Your leave from Monday 12 October to Friday 16 October is waiting for Wairimu.')).toBeTruthy()
    expect(screen.getByText('Wairimu asked you on 5 October, “Who will cover the Project X milestone?”')).toBeTruthy()
    expect(screen.getByText('Wairimu said, “Sales is two short that week.”')).toBeTruthy()
    expect(screen.getByText('Your request to spend KES 12,000 for tyres for the van is approved by Fatuma.')).toBeTruthy()
    expect(screen.getAllByText('Waiting').length).toBe(1)
    expect(screen.getByText('Declined')).toBeTruthy()
    expect(screen.getByText('Approved')).toBeTruthy()
  })

  it('has an answer box only on the request with a question waiting, and sends her words as she wrote them', async () => {
    ;(yourRequestsApi.answerLeave as any).mockResolvedValue({
      ...LEAVE,
      requests: [{ ...LEAVE.requests[0], questions: ['Wairimu asked you on 5 October, “Who will cover the Project X milestone?”', 'You answered on 6 October, “Brian will cover it.”'], questionWaiting: null }, LEAVE.requests[1]],
    })
    open(LEAVE, SPENDING)
    const box = await screen.findByLabelText('Your answer')
    expect(screen.getAllByLabelText('Your answer').length).toBe(1)
    fireEvent.change(box, { target: { value: 'Brian will cover it.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send your answer' }))
    await waitFor(() => expect(yourRequestsApi.answerLeave).toHaveBeenCalledWith('l1', 'Brian will cover it.'))
    expect(await screen.findByText('You answered on 6 October, “Brian will cover it.”')).toBeTruthy()
    expect(screen.queryByLabelText('Your answer')).toBeNull()
  })

  it('is told, in plain words, when she has asked for nothing', async () => {
    open({ daysLeftSaid: 'You have 21 days of leave left this year, out of 21.', requests: [] }, { requests: [] })
    expect(await screen.findByText('You have not asked for any leave.')).toBeTruthy()
    expect(screen.getByText('You have not asked to spend anything.')).toBeTruthy()
  })

  /*
   * SCREEN FAULT 8 (FINAL WALK): a member read "Leave requests are not switched on in your
   * organisation." with nothing she could do about it. This test used to pin that she read it;
   * "Your leave" (heading included) is now left out entirely for her when it is off, and the
   * other section she can actually use still reads as before.
   */
  it('leaves out "Your leave" entirely when it is off, for a member, and still reads the other', async () => {
    open(refusal(404, 'Leave requests are not switched on in your organisation.'), SPENDING)
    expect(await screen.findByText('Your request to spend KES 12,000 for tyres for the van is approved by Fatuma.')).toBeTruthy()
    expect(screen.queryByText(/Leave requests are not switched on/)).toBeNull()
    expect(screen.queryByRole('heading', { name: 'Your leave' })).toBeNull()
  })

  /*
   * WALKTHROUGH PASS 2, ITEM 3: AN ADMIN IS TOLD WHERE TO SWITCH A SUITE ON; A PARTICIPANT ISN'T
   * POINTED AT A PAGE THAT REFUSES THEM.
   *
   * UPDATED (B-122, deep page audit, 9 October): the fixture used to stop at "...is not switched
   * on.", which was never what the server actually sends - every "not switched on" refusal ends
   * "An admin switches it on under Suites." (`a-suite-that-is-off-says-what-to-do.ts`). Checked
   * against the old ending, `isSuiteOffMessage` never matched the server's real sentence, so an
   * admin read it as plain text with nothing to press - a dead end this fixture was not catching.
   * The fixture now carries the server's real sentence, and the test still proves the same thing:
   * an admin gets a working link.
   *
   * UPDATED AGAIN (B-123, coordinator follow-up): this page lost its own "Suites" crumb when it
   * was retitled to be the member's own Suites page rather than a page nested under one an admin
   * would reach by a different route - so there is now exactly one "Suites" link here (the one
   * this off-sentence adds), not two.
   */
  it('tells an admin where to switch the suite on', async () => {
    open(refusal(404, 'The leave suite is not switched on. An admin switches it on under Suites.'), SPENDING)
    useAuthStore.setState({ user: { ...AISHA, role: 'ADMIN' } } as any)
    expect(await screen.findByText(/The leave suite is not switched on\./)).toBeTruthy()
    const link = screen.getByRole('link', { name: 'Suites' })
    expect(link).toHaveAttribute('href', '/settings/suites')
  })

  /*
   * SCREEN FAULT 8 (FINAL WALK): a participant now reads no sentence about it at all, not a
   * sentence with no link - the whole section is left out for whoever cannot switch it on.
   */
  it('leaves the section out for a participant entirely, rather than a sentence with no way to act on it', async () => {
    open(refusal(404, 'The leave suite is not switched on. An admin switches it on under Suites.'), SPENDING)
    await screen.findByText('Your request to spend KES 12,000 for tyres for the van is approved by Fatuma.')
    expect(screen.queryByText(/The leave suite is not switched on/)).toBeNull()
    expect(screen.queryByRole('heading', { name: 'Your leave' })).toBeNull()
    expect(screen.queryByRole('link', { name: 'Suites' })).toBeNull()
  })

  /*
   * Fault 8 of the live walk: at 375 wide, "Waiting" and "Approved" stretched to the row's full
   * width once `Row`'s grid collapses to one column there (its default `stretch` on every item).
   * The fix is in gw-ui.css ("A BARE TAG" rule, beside the existing bare-Button one), which only
   * takes effect through real CSS layout a browser applies - jsdom does not run layout, so what is
   * checked here is the one thing a render test can prove: each tag is still `Row`'s own direct
   * child, with no override of the shared `.gwui-tag` class the CSS rule is scoped to, so the fix
   * keeps reaching it.
   */
  it('keeps each status tag as a plain, direct child of its row, so the row’s own width fix still reaches it', async () => {
    open(LEAVE, SPENDING)
    await screen.findByText('Your leave from Monday 12 October to Friday 16 October is waiting for Wairimu.')
    for (const label of ['Waiting', 'Declined', 'Approved']) {
      const tag = screen.getByText(label)
      expect(tag.parentElement).toHaveClass('gwui-row')
      expect(tag).toHaveClass('gwui-tag')
      expect(tag.getAttribute('style')).toBeFalsy()
    }
  })

  it('is told, and can try again, when a list did not load', async () => {
    open(Object.assign(new Error('x'), { response: { status: 500, data: {} } }), SPENDING)
    expect(await screen.findByText('Your requests did not load.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy()
  })

  /*
   * FAULT 1 OF THE LIVE WALK (6 October): after confirming hours in chat a member is told
   * "...you will see it under your hours.", but /suite/mine drew only leave and spending. Added as
   * a third section, every sentence the server's own (GET /suites/time/mine).
   */
  it('reads her own hours, week by week, in the server’s own words', async () => {
    open(LEAVE, SPENDING, {
      standing: 'You have recorded 31 hours this week. You still need 9 hours by Friday at 17:00.',
      weeks: [
        { weekOf: '2026-10-05', minutes: { Naivas: 180, Lakeside: 60 }, total: 240, approved: false, where: 'Your hours for the week of Monday 5 October are waiting for Daniel.' },
        { weekOf: '2026-09-28', minutes: { Naivas: 420 }, total: 420, approved: true, where: 'Your hours for the week of Monday 28 September are approved by Daniel.' },
      ],
    })
    expect(await screen.findByText('You have recorded 31 hours this week. You still need 9 hours by Friday at 17:00.')).toBeTruthy()
    expect(screen.getByText('Your hours for the week of Monday 5 October are waiting for Daniel.')).toBeTruthy()
    expect(screen.getByText('Your hours for the week of Monday 28 September are approved by Daniel.')).toBeTruthy()
  })

  it('is told, in plain words, when she has given no hours yet', async () => {
    open(LEAVE, SPENDING, { standing: null, weeks: [] })
    expect(await screen.findByText('You have not given any hours yet.')).toBeTruthy()
  })

  /*
   * SCREEN FAULT 8 (FINAL WALK): "THE TIME SHEETS SUITE IS NOT SWITCHED ON. AN ADMIN SWITCHES IT
   * ON UNDER SUITES." used to show to Aisha, a member, who can do nothing with it and has no
   * reason to be sent to a settings page that would refuse her anyway. This test used to pin that
   * the sentence showed; a member now gets no "Your hours" section at all when it is off, heading
   * included, and reads leave and spending exactly as before.
   */
  it('leaves out "Your hours" entirely when time sheets are off, for a member, and still reads leave and spending', async () => {
    open(LEAVE, SPENDING, Object.assign(new Error('404'), { response: { status: 404, data: { message: 'Time sheets are not switched on in your organisation.' } } }))
    expect(await screen.findByText('You have 16 days of leave left this year, out of 21.')).toBeTruthy()
    expect(screen.getByText('Your request to spend KES 12,000 for tyres for the van is approved by Fatuma.')).toBeTruthy()
    expect(screen.queryByText(/Time sheets are not switched on/)).toBeNull()
    expect(screen.queryByRole('heading', { name: 'Your hours' })).toBeNull()
  })

  it('an admin still reads the sentence, since an admin can actually switch it on', async () => {
    useAuthStore.setState({ user: { ...AISHA, role: 'ADMIN' }, token: 't', isAuthenticated: true } as any)
    ;(yourRequestsApi.leave as any).mockResolvedValue(LEAVE)
    ;(yourRequestsApi.spending as any).mockResolvedValue(SPENDING)
    ;(yourRequestsApi.hours as any).mockRejectedValue(Object.assign(new Error('404'), { response: { status: 404, data: { message: 'The time sheets suite is not switched on. An admin switches it on under Suites.' } } }))
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(<QueryClientProvider client={qc}><MemoryRouter><YourRequestsPage /></MemoryRouter></QueryClientProvider>)
    expect(await screen.findByRole('heading', { name: 'Your hours' })).toBeTruthy()
    expect(await screen.findByText(/The time sheets suite is not switched on/)).toBeTruthy()
  })

  /*
   * B-123 (Hafsah's design, coordinator follow-up): this IS the member's own "Suites" page, not a
   * page called "Your requests" nested under one she cannot open. Buttons to make a new request sit
   * beside the sections that have a form, and never beside time sheets, which has none.
   */
  it('is titled "Suites", as the member’s own Suites page', async () => {
    open(LEAVE, SPENDING)
    expect(await screen.findByRole('heading', { level: 1, name: 'Suites' })).toBeInTheDocument()
    expect(screen.getByText('Your own part of each suite your organisation has switched on.')).toBeInTheDocument()
  })

  it('has "Request leave" and "Ask to spend money" beside the sections that have a form, to open it filled in', async () => {
    open(LEAVE, SPENDING)
    await screen.findByText('You have 16 days of leave left this year, out of 21.')
    expect(screen.getByRole('link', { name: 'Request leave' })).toHaveAttribute('href', '/suite/leave/new')
    expect(screen.getByRole('link', { name: 'Ask to spend money' })).toHaveAttribute('href', '/suite/spend/new')
    /* Time sheets has no form at all (the prototype: "There is no grid to fill in."), so no button
       sits beside it, and nothing suggests one exists. */
    expect(screen.queryByRole('link', { name: /Add hours|Request hours/ })).toBeNull()
  })

  /*
   * "YOUR REVIEWS" (B-123, Hafsah's design): status and, where there is one, the appeal - read
   * exactly as `ReviewsBoardPage.tsx`'s own "Your reviews" section already reads the same data, so
   * the two pages never disagree about what a review says.
   */
  it('reads her own reviews, with status and her appeal where one exists', async () => {
    ;(reviewsApi.mineQuietly as any).mockResolvedValue([
      { id: 'r1', dueOn: '2027-03-01', writtenWithFirstName: 'Wairimu', stands: 'decided', says: 'Decided on 2 March. Wairimu wrote it with you.', mayAppeal: false, appealSays: 'You appealed on 4 March. Wairimu is deciding it.' },
    ])
    open(LEAVE, SPENDING)
    expect(await screen.findByRole('heading', { name: 'Your reviews' })).toBeInTheDocument()
    expect(screen.getByText('Your review, March')).toBeInTheDocument()
    expect(screen.getByText('Decided on 2 March. Wairimu wrote it with you.')).toBeInTheDocument()
    expect(screen.getByText('You appealed on 4 March. Wairimu is deciding it.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Open your review, March' })).toHaveAttribute('href', '/suite/reviews/r1')
  })

  it('leaves "Your reviews" out entirely when she has none', async () => {
    ;(reviewsApi.mineQuietly as any).mockResolvedValue([])
    open(LEAVE, SPENDING)
    await screen.findByText('You have 16 days of leave left this year, out of 21.')
    expect(screen.queryByRole('heading', { name: 'Your reviews' })).toBeNull()
  })
})
