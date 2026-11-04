import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TheCheckInYouJustFinished } from './TheCheckInYouJustFinished'

/**
 * MERCY'S OWN REPORT FOR WEDNESDAY 14 OCTOBER, AS SHE READS IT (Hafsah's quality pass of 18 October, section 5, O-1 to O-7). What
 * the API now serves her on the short run (gw_sweep_drop3): her report read from her own deals and lines on the server
 * (the-team-report-of-14-october-as-each-reader-reads-it.spec.ts reads the same lines from the record). The rows the old path
 * read are still served, and none of them is drawn.
 */
const OWN = {
  didWell: [{ text: 'You got Greenfield Supermarket’s signed order for 25 units, KES 125,000, on 13 October, and you added it. It counts as proof.', how: null, mark: 'proven' }],
  story: 'Greenfield Supermarket is your first sale, 25 of your 40 units. Tuskys Westgate is still waiting on Joseph’s samples.',
  toldUs: [
    { text: 'You quoted Rose at Mama Mboga Mart KES 10,000 for 2 units, and Rose decides.', how: 'You said this. A copy of the quote would prove it.', mark: 'said' },
    { text: 'Greenfield Supermarket takes delivery on Friday 16 October and pays then.', how: 'You said this. A message from Mrs Njeri would prove it.', mark: 'said' },
    { text: 'You’ll call Joseph again on Thursday morning.', how: null, mark: 'said' },
  ],
}
const THINK = 'Tuskys Westgate has waited on Joseph’s samples since 12 October. What could you show Peter before the samples come?'
vi.mock('@/api/reports', () => ({ reportsApi: {
  sessionReport: vi.fn(async () => ({ counting: [], releaseOneSalesReport: true, forYouToThinkAbout: THINK, yourOwnReport: OWN })),
  get: vi.fn(async () => ({
    myRows: [
      { id: 'r1', type: 'PROGRESS', text: "For Greenfield, we got the order signed yesterday for 25 units. It's actually KES 125,000.", mark: 'proven', how: 'From the document you added.', disputedAt: null, checkInId: 'c3', sessionNumber: 3 },
      { id: 'r2', type: 'COMMITMENT', text: "I'll call Joseph again on Thursday morning.", mark: 'said', how: 'You said you will do this. I will ask you how it went.', disputedAt: null, checkInId: 'c3', sessionNumber: 3 },
      { id: 'r3', type: 'INTENT', text: 'I expect Joseph to deliver.', mark: 'said', how: 'You said this.', disputedAt: null, checkInId: 'c3', sessionNumber: 3 },
    ],
    coaching: null,
  })),
  startSelfCorrection: vi.fn(),
} }))
vi.mock('@/api/conversation', () => ({ conversationApi: { artifact: vi.fn(async () => ({ artifact: { summary: 'Here is what you shared.', whatToCarry: null } })), disputeEntry: vi.fn() } }))
vi.mock('@/api/grounds', () => ({ groundsApi: { get: vi.fn(async () => ({ checkIns: [] })), getMySpecificity: vi.fn(async () => ({})) } }))

describe('Mercy’s own report for 14 October', () => {
  it('reads as the kit does: what she did, her story, what she told us said once, and one thing to think about', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(<QueryClientProvider client={qc}><MemoryRouter><TheCheckInYouJustFinished checkInId="c3" groundId="g1" sessionNumber={3} light pictured /></MemoryRouter></QueryClientProvider>)
    const well = await screen.findByRole('region', { name: 'What you did well' })
    expect(within(well).getByText(OWN.didWell[0].text)).toBeTruthy()
    expect(within(well).queryByText(/Delivery|pays then/)).toBeNull()
    expect(screen.getByText(OWN.story)).toBeTruthy()
    const told = screen.getByRole('region', { name: 'What you told me' })
    for (const x of OWN.toldUs) expect(within(told).getByText(x.text)).toBeTruthy()
    expect(within(told).getByText('You said this. A message from Mrs Njeri would prove it.')).toBeTruthy()
    expect(within(screen.getByRole('region', { name: 'One thing to think about' })).getByText(THINK)).toBeTruthy()
    const text = document.body.textContent ?? ''
    expect(text).not.toMatch(/I will ask you|I expect Joseph|yesterday|Here is what you shared/)
  })
})
