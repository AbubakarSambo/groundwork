import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TheCheckInYouJustFinished } from './TheCheckInYouJustFinished'

/**
 * THE DROP ACCESS SHORT RUN (gw_sweep_drop3), ITEM 14. Mercy's own report of 14 October, session 3, as served (myRows), read
 * "For Greenfield, we got the order signed yesterday for 25 units. It's actually KES 125,000." and "Delivery is set for Friday,
 * and they'll pay then." under What you did well and again under What you told us. Each line is now said once, on Release 1's
 * sales check-in (the server marks the report releaseOneSalesReport only where the organisation's switch is on). With the
 * switch off, the page reads as it did before.
 */
const served = { releaseOne: true }
vi.mock('@/api/reports', () => ({ reportsApi: {
  sessionReport: vi.fn(async () => ({ counting: [], howClearThisWas: { level: 'medium' }, ...(served.releaseOne ? { releaseOneSalesReport: true } : {}) })),
  get: vi.fn(async () => ({
    myRows: [
      { id: 'm1', type: 'COMMITMENT', text: "I'll call Joseph again on Thursday morning.", mark: 'said', how: 'You said you will do this. I will ask you how it went.', disputedAt: null, sessionNumber: 3 },
      { id: 'm2', type: 'PROGRESS', text: 'I quoted her KES 10,000 for the two units.', mark: 'memory', how: 'You gave this from memory. Nothing written backs it yet.', disputedAt: null, sessionNumber: 3 },
      { id: 'm3', type: 'PROGRESS', text: "For Greenfield, we got the order signed yesterday for 25 units. It's actually KES 125,000.", mark: 'proven', how: 'From the document you added.', disputedAt: null, sessionNumber: 3 },
      { id: 'm4', type: 'COMMITMENT', text: "Delivery is set for Friday, and they'll pay then.", mark: 'proven', how: 'From the document you added.', disputedAt: null, sessionNumber: 3 },
    ],
  })),
  startSelfCorrection: vi.fn(),
} }))
vi.mock('@/api/conversation', () => ({ conversationApi: { artifact: vi.fn(async () => ({ artifact: { summary: null, whatToCarry: null } })), disputeEntry: vi.fn() } }))
vi.mock('@/api/grounds', () => ({ groundsApi: { get: vi.fn(async () => ({ checkIns: [] })), getMySpecificity: vi.fn(async () => ({})) } }))

describe('Mercy\'s own report says each line once', () => {
  it('the Greenfield lines are under What you did well, and not again under What you told us', async () => {
    served.releaseOne = true
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(<QueryClientProvider client={qc}><MemoryRouter><TheCheckInYouJustFinished checkInId="c3" groundId="g1" sessionNumber={3} light pictured /></MemoryRouter></QueryClientProvider>)
    const well = await screen.findByRole('region', { name: 'What you did well' })
    expect(within(well).getByText(/For Greenfield, we got the order signed yesterday for 25 units/)).toBeTruthy()
    const told = screen.getByRole('region', { name: 'What you told us' })
    expect(within(told).queryByText(/For Greenfield/)).toBeNull()
    expect(within(told).queryByText(/Delivery is set for Friday/)).toBeNull()
    expect(within(told).getByText("I'll call Joseph again on Thursday morning.")).toBeTruthy()
    expect(screen.getAllByText(/For Greenfield, we got the order signed/)).toHaveLength(1)
  })

  it('with Release 1\'s switch off, What you told us lists every line, as before', async () => {
    served.releaseOne = false
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(<QueryClientProvider client={qc}><MemoryRouter><TheCheckInYouJustFinished checkInId="c3" groundId="g1" sessionNumber={3} light pictured /></MemoryRouter></QueryClientProvider>)
    const told = await screen.findByRole('region', { name: 'What you told us' })
    expect(within(told).getByText(/For Greenfield, we got the order signed yesterday for 25 units/)).toBeTruthy()
    expect(within(told).getByText("I'll call Joseph again on Thursday morning.")).toBeTruthy()
  })
})
