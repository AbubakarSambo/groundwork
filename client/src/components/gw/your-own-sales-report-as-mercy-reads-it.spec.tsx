import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TheCheckInYouJustFinished } from './TheCheckInYouJustFinished'

/**
 * MERCY'S OWN REPORT FOR 15 OCTOBER, ON RELEASE 1'S SALES CHECK-IN (Hafsah's points 19 to 22, 18 October 2026; own-report.txt).
 * The rows and the question are what the API served Mercy Wairimu in Drop Access (test). She reads Rose's promise as Rose's,
 * kept on Mama Mboga Mart; the signed order's date, 13 October, with what she said noted; one question about a deal of hers
 * that is stuck; and no second summary paragraph ("Here is what you shared…").
 */
vi.mock('@/api/reports', () => ({ reportsApi: {
  sessionReport: vi.fn(async () => ({
    counting: [], releaseOneSalesReport: true,
    forYouToThinkAbout: 'Greenfield Supermarket said yes, but nothing on record says they have paid yet. What would help you get the payment this week?',
  })),
  get: vi.fn(async () => ({
    myRows: [
      { id: 'r1', type: 'PROGRESS', text: 'The deal is signed for 25 units at 125,000 shillings.', mark: 'proven', how: 'From the document you added.', disputedAt: null, checkInId: 'c4', sessionNumber: 4 },
      { id: 'r2', type: 'COMMITMENT', text: 'I will send Peter the quote for 30 units by Friday.', mark: 'said', how: 'You said you will do this. I will ask you how it went.', disputedAt: null, checkInId: 'c4', sessionNumber: 4 },
      { id: 'r3', type: 'PROGRESS', text: 'Rose said she will buy the two units at the end of the month, on October 30th.', mark: 'said', how: 'This is Rose’s promise, not yours, so it is kept on the Mama Mboga Mart deal, with 30 October as the day they will buy. A message from Rose would prove it.', disputedAt: null, checkInId: 'c4', sessionNumber: 4 },
      /* 14 October on the test bed (Drop Access short run, 18 October): Greenfield's promise, once read as "Delivery’s". */
      { id: 'r5', type: 'PROGRESS', text: "Delivery is set for Friday, and they'll pay then.", mark: 'said', how: 'This is Greenfield Supermarket’s promise, not yours, so it is kept on the Greenfield Supermarket deal. A message from Greenfield Supermarket would prove it.', disputedAt: null, checkInId: 'c4', sessionNumber: 4 },
      { id: 'r6', type: 'COMMITMENT', text: "I'll ask Grace first about the price, then I'll call him back.", readAs: "I'll ask Grace first about the price, then I'll call Mr Kariuki back.", mark: 'said', how: 'You said you will do this. I will ask you how it went.', disputedAt: null, checkInId: 'c4', sessionNumber: 4 },
      { id: 'r4', type: 'PROGRESS', text: 'Mrs. Njeri signed the order today, which is the 15th of October.', readAs: 'Mrs. Njeri signed the order on 13 October.', mark: 'proven', how: 'This date comes from the document you added. You said it was signed on 15 October.', disputedAt: null, checkInId: 'c4', sessionNumber: 4 },
    ],
    coaching: null,
  })),
  startSelfCorrection: vi.fn(),
} }))
vi.mock('@/api/conversation', () => ({ conversationApi: {
  artifact: vi.fn(async () => ({ artifact: {
    summary: 'Here is what you shared. You recorded being held up waiting for samples you needed to close deals.',
    whatToCarry: 'You noted that for a deal with Rose at Mama Mboga Mart, \'I have not asked Rose about money yet.\'',
  } })),
  disputeEntry: vi.fn(),
} }))
vi.mock('@/api/grounds', () => ({ groundsApi: { get: vi.fn(async () => ({ checkIns: [] })), getMySpecificity: vi.fn(async () => ({})) } }))

function renderIt() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={qc}><MemoryRouter><TheCheckInYouJustFinished checkInId="c4" groundId="g1" sessionNumber={4} light pictured /></MemoryRouter></QueryClientProvider>)
}

describe('Mercy’s own report, as she reads it', () => {
  it('reads Greenfield Supermarket’s promise as theirs, never "Delivery’s", and who "him" is where her check-in names him', async () => {
    renderIt()
    const told = await screen.findByRole('region', { name: 'What you told us' })
    const text = document.body.textContent ?? ''
    expect(within(told).getByText("Delivery is set for Friday, and they'll pay then.")).toBeTruthy()
    expect(within(told).getByText('This is Greenfield Supermarket’s promise, not yours, so it is kept on the Greenfield Supermarket deal. A message from Greenfield Supermarket would prove it.')).toBeTruthy()
    expect(text).not.toContain('Delivery’s promise')
    expect(within(told).getByText("I'll ask Grace first about the price, then I'll call Mr Kariuki back.")).toBeTruthy()
    expect(text).not.toContain("then I'll call him back")
  })

  it('reads Rose’s promise as Rose’s, the signed order’s date with what she said, and a question about a stuck deal', async () => {
    renderIt()
    const think = await screen.findByRole('region', { name: 'One thing to think about' })
    expect(within(think).getByText('Greenfield Supermarket said yes, but nothing on record says they have paid yet. What would help you get the payment this week?')).toBeTruthy()
    expect(within(think).queryByText(/I have not asked Rose about money yet/)).toBeNull()

    const told = screen.getByRole('region', { name: 'What you told us' })
    expect(within(told).getByText('Rose said she will buy the two units at the end of the month, on October 30th.')).toBeTruthy()
    expect(within(told).getByText('This is Rose’s promise, not yours, so it is kept on the Mama Mboga Mart deal, with 30 October as the day they will buy. A message from Rose would prove it.')).toBeTruthy()
    /* The proven line is said once, under What you did well, with where its date comes from (Drop Access short run, item 14). */
    expect(within(told).queryByText('Mrs. Njeri signed the order on 13 October.')).toBeNull()
    expect(within(told).queryByText('Mrs. Njeri signed the order today, which is the 15th of October.')).toBeNull()

    const well = screen.getByRole('region', { name: 'What you did well' })
    expect(within(well).getByText('Mrs. Njeri signed the order on 13 October. This date comes from the document you added. You said it was signed on 15 October.')).toBeTruthy()
    expect(screen.queryByText(/today, which is the 15th of October/)).toBeNull()

    /* No second summary paragraph. */
    expect(screen.queryByText(/Here is what you shared/)).toBeNull()
  })
})
