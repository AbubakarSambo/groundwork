import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'

vi.mock('@/api/reports', () => ({ reportsApi: { sessionReport: vi.fn(), get: vi.fn() } }))
vi.mock('@/lib/a-date-reads-the-same-everywhere', async (orig) => {
  const real: any = await orig()
  return { ...real, whenItWas: (d: any, p: any) => real.whenItWas(d, p, 'UTC') }
})
import { reportsApi } from '@/api/reports'
import { TheSessionsReport, sessionAndWhoCheckedIn, hasCheckedIn, lastUpdated } from './TheSessionsReport'

/**
 * U.9: ONE SESSION'S REPORT, AS THE LEAD AND AS A PARTICIPANT READ ITS TOP.
 *
 * The prototype (docs/prototype/screens/B4-reports-and-sharing/one-session.txt) opens with
 * "Session 37. 6 of 6 people checked in." and, once the report is out, "Shared with the team".
 * The server sends each reader their own `counting`, with `isYou` on their own row and names
 * resolved through the wrapper, so the same component is rendered with what each reader receives.
 */
function aSession(over: Record<string, unknown>) {
  return {
    sessionNumber: 37, plannedSessions: 65, state: 'final', sections: [], whereThingsStand: { settled: [], open: [] },
    counting: [], showsEverybody: true, takenAt: '2026-09-22T18:00:00.000Z', amendedAt: null, ...over,
  }
}

function renderIt(totalInThisRound?: number | null) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter><TheSessionsReport groundId="g1" sessionNumber={37} totalInThisRound={totalInThisRound} /></MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('one session, as each reader reads its top', () => {
  beforeEach(() => {
    vi.mocked(reportsApi.sessionReport).mockReset()
    vi.mocked(reportsApi.get).mockReset()
    vi.mocked(reportsApi.get).mockResolvedValue({ updatedAt: '2026-09-23T18:00:00.000Z' } as any)
  })

  it('the lead, who did not check in, reads the count and each person as a sentence', async () => {
    vi.mocked(reportsApi.sessionReport).mockResolvedValue(aSession({
      counting: [
        { who: 'Aisha', isYou: false, answered: true },
        { who: 'Miriam', isYou: false, answered: true },
        { who: 'Omar', isYou: false, answered: false },
      ],
    }) as any)
    renderIt()
    expect(await screen.findByText('Check-in 37 of 65. 2 of 3 people checked in.')).toBeTruthy()
    /* E10: it says how it was shared. */
    expect(screen.getByText('Shared with the team when this session closed.')).toBeTruthy()
    expect(screen.getByText('Aisha has checked in.')).toBeTruthy()
    expect(screen.getByText('Omar has not checked in yet.')).toBeTruthy()
    const text = document.body.textContent ?? ''
    expect(text).not.toMatch(/ · |STILL FORMING|Not answered yet|Participant [A-Z]|the initiator/)
  })

  it('a participant reads their own row as "you", and nothing says it is shared while it is not', async () => {
    vi.mocked(reportsApi.sessionReport).mockResolvedValue(aSession({
      state: 'forming',
      counting: [
        { who: 'Miriam', isYou: true, answered: true },
        { who: 'a colleague', isYou: false, answered: false },
      ],
    }) as any)
    renderIt()
    expect(await screen.findByText('Check-in 37 of 65. 1 of 2 people checked in.')).toBeTruthy()
    expect(screen.getByText('You have checked in.')).toBeTruthy()
    expect(screen.getByText('a colleague has not checked in yet.')).toBeTruthy()
    expect(document.body.textContent).not.toContain('Shared with the team')
    expect(document.body.textContent).not.toContain('(you)')
    expect(await screen.findByText('Last updated on Wednesday 23 September at 6pm. It only changes when something new comes in, such as a check-in, a document or a number from another system.')).toBeTruthy()
  })

  it('a report that is out, and so no longer changes, does not ask when it last changed', async () => {
    vi.mocked(reportsApi.sessionReport).mockResolvedValue(aSession({ counting: [] }) as any)
    renderIt()
    await screen.findByText('Shared with the team when this session closed.')
    expect(reportsApi.get).not.toHaveBeenCalled()
    expect(document.body.textContent).not.toContain('Last updated')
  })

  it('says one person, and leaves out the count when nobody is counted', () => {
    expect(sessionAndWhoCheckedIn(2, null, 1, 1)).toBe('Check-in 2. 1 of 1 person checked in.')
    expect(sessionAndWhoCheckedIn(2, null, 0, 0)).toBe('Check-in 2.')
    expect(hasCheckedIn({ who: 'Brian', isYou: true, answered: false })).toBe('You have not checked in yet.')
    expect(lastUpdated('2026-09-23T18:30:00.000Z')).toMatch(/^Last updated on Wednesday 23 September at 6:30pm\. /)
  })

  it('U.9 REVIEW FIX 6: agrees with the check-in header\'s count when the session report\'s own count leaves somebody out', async () => {
    /*
     * Engine request 56, walked live: the session report's own `counting` had 5 people, the
     * check-in header counted 6 - it left Zawadi out of the count, not just off the list. The
     * host page passes the header's own total (`totalInThisRound`, from the same `whoIsInRound`
     * helper); this reads it only when it is bigger than what `counting` itself says, so a
     * session that genuinely has fewer parties is never inflated.
     */
    vi.mocked(reportsApi.sessionReport).mockResolvedValue(aSession({
      counting: [
        { who: 'Aisha', isYou: false, answered: true },
        { who: 'Miriam', isYou: false, answered: true },
        { who: 'Omar', isYou: false, answered: false },
        { who: 'Brian', isYou: false, answered: false },
      ],
    }) as any)
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter><TheSessionsReport groundId="g1" sessionNumber={37} totalInThisRound={6} /></MemoryRouter>
      </QueryClientProvider>,
    )
    expect(await screen.findByText('Check-in 37 of 65. 2 of 6 people checked in.')).toBeTruthy()
  })

  it('draws nothing for "last updated" when the date is not a real date, the shape the server sends today', async () => {
    /*
     * ENGINE REQUEST 53: applyNames' walk turns a Date into {} on its way through the wrapper
     * that swaps names in, so `updatedAt` arrives as `{}` rather than an ISO string or a Date.
     * `whenItWas` already returns '' for a date it cannot parse, so before this fix the sentence
     * still printed with two blank spots either side of "at" - "Last updated on  at . It only
     * changes ..." - a broken sentence rather than nothing. This is the real shape, not a string
     * standing in for it.
     */
    vi.mocked(reportsApi.sessionReport).mockResolvedValue(aSession({ state: 'forming', counting: [] }) as any)
    vi.mocked(reportsApi.get).mockResolvedValue({ updatedAt: {} } as any)
    renderIt()
    await screen.findByText('People are still answering, so this moves.', { exact: false })
    expect(document.body.textContent).not.toContain('Last updated')
    expect(document.body.textContent).not.toMatch(/on  at \./)
  })
})
