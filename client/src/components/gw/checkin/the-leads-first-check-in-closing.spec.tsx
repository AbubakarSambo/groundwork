import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TheDonePage } from './TheDonePage'
import { groundsApi } from '@/api/grounds'
import { theClosingAsOneSentence } from '@/lib/the-closing-after-your-first-check-in'

/**
 * DECISION 133 (change 5): THE LEAD'S FIRST CHECK-IN ENDS ON ONE CLOSING MESSAGE, BUILT FROM THE
 * CHECK-IN'S REAL SCHEDULE. Only the lead, only the first check-in, and "in setup" links to People
 * and setup, where the day and how often are changed.
 */
vi.mock('@/api/grounds', () => ({ groundsApi: { get: vi.fn(), getMyCheckinStatus: vi.fn() } }))
vi.mock('@/api/conversation', () => ({ conversationApi: { artifact: vi.fn(async () => ({ artifact: null })) } }))

const GROUND = {
  cadence: 'WEEKLY', cadenceAnchorDay: 1, startsAt: '2026-10-07T00:00:00.000Z',
  participants: [{ id: 'p-lead', partyType: 'INITIATOR', userId: 'u-lead', user: { firstName: 'Wairimu', lastName: 'Kamau' } }],
  aTeamReportComes: false, report: null, checkIns: [{ id: 'ci1', sessionNumber: 1 }],
}

function renderAs(isInitiator: boolean, sessionNumber: number) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <TheDonePage firstName="Wairimu" checkInId="ci1" groundId="g1" sessionNumber={sessionNumber} myUserId="u-lead" isInitiator={isInitiator} />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  ;(groundsApi.get as any).mockResolvedValue(GROUND)
  ;(groundsApi.getMyCheckinStatus as any).mockResolvedValue({ checkIns: [{ id: 'ci1', sessionNumber: 1, status: 'COMPLETED' }] })
})

describe('the lead, at the end of their first check-in', () => {
  it('reads one closing message with the real day and cadence, and "in setup" opens People and setup', async () => {
    renderAs(true, 1)
    const p = await screen.findByTestId('the-leads-first-closing')
    expect(p.textContent).toBe("That's your first check-in done. Come back any time to add updates. Your team will check in every Monday, as you set it. You can change how often in setup.")
    expect(screen.getByRole('link', { name: 'in setup' }).getAttribute('href')).toBe('/grounds/g1?tab=settings')
  })

  it('Now: reads that the team\'s first check-in is open now and until which Monday, as the lead sees it', async () => {
    ;(groundsApi.get as any).mockResolvedValue({ ...GROUND, startsAt: null, createdAt: new Date().toISOString() })
    renderAs(true, 1)
    const p = await screen.findByTestId('the-leads-first-closing')
    expect(p.textContent).toMatch(/^That's your first check-in done\. Come back any time to add updates\. Your team's first check-in is open now and stays open until Monday \d{1,2} [A-Z][a-z]+, and after that they check in every Monday, as you set it\. You can change how often in setup\.$/)
  })

  it('does not read it on a later check-in', async () => {
    renderAs(true, 2)
    await screen.findByText(/Your check-in is saved/)
    expect(screen.queryByTestId('the-leads-first-closing')).toBeNull()
  })
})

describe('a participant, at the end of their first check-in', () => {
  it('never reads the lead\'s closing message', async () => {
    renderAs(false, 1)
    await screen.findByText(/Your check-in is saved/)
    expect(screen.queryByText(/That's your first check-in done/)).toBeNull()
  })
})

describe('the closing is built from the schedule, never invented', () => {
  it('says each cadence as the check-in has it, and leaves the day out when it cannot be known', () => {
    expect(theClosingAsOneSentence({ cadence: 'FORTNIGHTLY', startsAt: '2026-10-07T00:00:00.000Z' })).toContain('Your team will check in every other Wednesday, as you set it.')
    expect(theClosingAsOneSentence({ cadence: 'DAILY' })).toContain('Your team will check in every day, as you set it.')
    expect(theClosingAsOneSentence({ cadence: 'MONTHLY', cadenceAnchorDay: 5 })).toContain('Your team will check in on the 5th of each month, as you set it.')
    expect(theClosingAsOneSentence({ cadence: 'WEEKLY' })).toContain('Your team will check in every week, as you set it.')
    /* Saturday start, team works Monday to Friday: the day moves on to Monday, as the schedule does. */
    expect(theClosingAsOneSentence({ cadence: 'WEEKLY', startsAt: '2026-10-10T00:00:00.000Z', workingDays: [1, 2, 3, 4, 5] })).toContain('every Monday')
    expect(theClosingAsOneSentence({ cadence: null })).toBe("That's your first check-in done. Come back any time to add updates. You can change how often in setup.")
  })
})

/*
 * ITEM 5 (Hafsah, 11 October 2026): the closing sits beside the start the lead chose in setup and
 * never contradicts it. Set up on Sunday 11 October, every Monday.
 */
describe('the closing beside each start the lead can choose', () => {
  const SUNDAY_11 = new Date(2026, 9, 11, 16, 0)
  const weekly = { cadence: 'WEEKLY', cadenceAnchorDay: 1 }

  /* "Now" (Hafsah, 11 October 2026): the first check-in stays open until the next set day at least
     half a cycle away, so the closing says so rather than "every Monday" alone, which read as if the
     team checked in again on Monday 12. Her sentence is kept around it. */
  it('Now on Sunday 11: the first check-in is open now and stays open until Monday 19', () => {
    expect(theClosingAsOneSentence({ ...weekly, startsAt: null, createdAt: '2026-10-11T15:00:00.000Z' }, SUNDAY_11)).toBe(
      "That's your first check-in done. Come back any time to add updates. Your team's first check-in is open now and stays open until Monday 19 October, and after that they check in every Monday, as you set it. You can change how often in setup.")
  })

  it('Now on Thursday 15: Monday 19 is 4 days away, at least half a week, so it stays open until Monday 19', () => {
    const thursday = new Date(2026, 9, 15, 10, 0)
    expect(theClosingAsOneSentence({ ...weekly, startsAt: null, createdAt: thursday.toISOString() }, thursday)).toContain(
      "Your team's first check-in is open now and stays open until Monday 19 October, and after that they check in every Monday, as you set it.")
  })

  it('Now, monthly on the 20th, on the 25th: it stays open until 20 November, 26 days away', () => {
    const the25th = new Date(2026, 9, 25, 10, 0)
    expect(theClosingAsOneSentence({ cadence: 'MONTHLY', cadenceAnchorDay: 20, startsAt: null, createdAt: the25th.toISOString() }, the25th)).toContain(
      "Your team's first check-in is open now and stays open until Friday 20 November, and after that they check in on the 20th of each month, as you set it.")
  })

  it('Now on Saturday 17: Monday 19 is less than half a week away, so it stays open until Monday 26', () => {
    const saturday = new Date(2026, 9, 17, 10, 0)
    expect(theClosingAsOneSentence({ ...weekly, startsAt: null, createdAt: saturday.toISOString() }, saturday)).toContain(
      "Your team's first check-in is open now and stays open until Monday 26 October, and after that they check in every Monday, as you set it.")
  })

  it('Now, monthly on the 20th, on the 11th: it stays open until 20 November', () => {
    expect(theClosingAsOneSentence({ cadence: 'MONTHLY', cadenceAnchorDay: 20, startsAt: null, createdAt: SUNDAY_11.toISOString() }, SUNDAY_11)).toContain(
      "Your team's first check-in is open now and stays open until Friday 20 November, and after that they check in on the 20th of each month, as you set it.")
  })

  it('Tomorrow: it names the day the team starts, then how often', () => {
    expect(theClosingAsOneSentence({ ...weekly, startsAt: '2026-10-12T00:00:00.000Z' }, SUNDAY_11)).toBe(
      "That's your first check-in done. Come back any time to add updates. Your team's first check-in opens on Monday 12 October, and after that they check in every Monday, as you set it. You can change how often in setup.")
  })

  it('On a date: a Wednesday start is said, so "every Monday" does not contradict it', () => {
    expect(theClosingAsOneSentence({ ...weekly, startsAt: '2026-10-21T00:00:00.000Z' }, SUNDAY_11)).toBe(
      "That's your first check-in done. Come back any time to add updates. Your team's first check-in opens on Wednesday 21 October, and after that they check in every Monday, as you set it. You can change how often in setup.")
    expect(theClosingAsOneSentence({ cadence: 'ONE_TIME', startsAt: '2026-10-21T00:00:00.000Z' }, SUNDAY_11)).toBe(
      "That's your first check-in done. Come back any time to add updates. Your team checks in once, on Wednesday 21 October, as you set it. You can change how often in setup.")
  })
})
