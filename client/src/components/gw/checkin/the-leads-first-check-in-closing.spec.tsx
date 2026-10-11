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
