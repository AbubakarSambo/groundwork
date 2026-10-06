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
vi.mock('@/api/suites', () => ({ yourRequestsApi: { leave: vi.fn(), spending: vi.fn(), answerLeave: vi.fn(), answerSpending: vi.fn() } }))
import { yourRequestsApi } from '@/api/suites'

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

function open(leave: any, spending: any) {
  ;(yourRequestsApi.leave as any).mockImplementation(() => (leave instanceof Error ? Promise.reject(leave) : Promise.resolve(leave)))
  ;(yourRequestsApi.spending as any).mockImplementation(() => (spending instanceof Error ? Promise.reject(spending) : Promise.resolve(spending)))
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

  it('reads the server\'s words when a suite is off, and still reads the other', async () => {
    open(refusal(404, 'Leave requests are not switched on in your organisation.'), SPENDING)
    expect(await screen.findByText('Leave requests are not switched on in your organisation.')).toBeTruthy()
    expect(screen.getByText('Your request to spend KES 12,000 for tyres for the van is approved by Fatuma.')).toBeTruthy()
  })

  /*
   * WALKTHROUGH PASS 2, ITEM 3: AN ADMIN IS TOLD WHERE TO SWITCH A SUITE ON; A PARTICIPANT ISN'T
   * POINTED AT A PAGE THAT REFUSES THEM.
   */
  it('tells an admin where to switch the suite on', async () => {
    open(refusal(404, 'The leave suite is not switched on.'), SPENDING)
    useAuthStore.setState({ user: { ...AISHA, role: 'ADMIN' } } as any)
    expect(await screen.findByText(/The leave suite is not switched on\./)).toBeTruthy()
    /* Two links read "Suites" here: the breadcrumb, and the one this message adds - both to the
       same place, since both are real doors for an admin. */
    const links = screen.getAllByRole('link', { name: 'Suites' })
    expect(links.length).toBeGreaterThanOrEqual(2)
    for (const link of links) expect(link).toHaveAttribute('href', '/settings/suites')
  })

  it('does not point a participant at Suites, which would refuse them', async () => {
    open(refusal(404, 'The leave suite is not switched on.'), SPENDING)
    expect(await screen.findByText(/The leave suite is not switched on\./)).toBeTruthy()
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
})
