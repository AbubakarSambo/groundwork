import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'

vi.mock('@/api/reports', () => ({ reportsApi: { sessionReport: vi.fn(), get: vi.fn() } }))
vi.mock('@/api/conversation', () => ({ conversationApi: { artifact: vi.fn(), disputeEntry: vi.fn() } }))
vi.mock('@/api/grounds', () => ({ groundsApi: { get: vi.fn(), getMySpecificity: vi.fn() } }))

import { reportsApi } from '@/api/reports'
import { conversationApi } from '@/api/conversation'
import { groundsApi } from '@/api/grounds'
import { TheCheckInYouJustFinished } from './TheCheckInYouJustFinished'

/**
 * U.9 RE-REVIEW, ITEM A: THE END-OF-SESSION CARD, RENDERED WITH THE REAL SHAPE, AS THE PERSON WHO
 * JUST FINISHED READS IT.
 *
 * Checks the masthead ("Check-in 1, on 27 September. Only you read this part." - not "CHECK-IN 1
 * · 27 SEPT · YOURS · NOBODY ELSE READS THIS HALF"), the block headings (one sentence, no number,
 * no capitals, no lower-case sub-line under it), and the row under a quote ("This is something you
 * asked for. A document backs it." - not "ask · from a document"). The specificity bar is checked
 * separately (it is shown once, at the top of SessionReportPage, not here) - see
 * `a-report-that-exists-does-not-say-it-does-not.spec.ts` and `your-report-as-each-reader-reads-it.spec.tsx`.
 */
function renderIt() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <TheCheckInYouJustFinished checkInId="c1" groundId="g1" sessionNumber={1} />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('the end-of-session card, as the person who just finished reads it', () => {
  beforeEach(() => {
    vi.mocked(reportsApi.sessionReport).mockResolvedValue({
      sessionNumber: 1, plannedSessions: null,
      counting: [{ who: 'Miriam', isYou: true, answered: true }],
      againstSuccess: { stated: null, conditions: [], definitions: [] },
      howClearThisWas: { level: null, saying: '' },
    } as any)
    vi.mocked(reportsApi.get).mockResolvedValue({
      myRows: [
        { id: 'r1', type: 'COMMITMENT', text: 'Send Kito Foods a quote by 9 October.', disputedAt: null, documented: true, checkInId: 'c1', sessionNumber: 1 },
      ],
      couldTry: [], coaching: null,
    } as any)
    vi.mocked(conversationApi.artifact).mockResolvedValue({ artifact: { summary: null, whatToCarry: 'Send the quote by Friday.' } } as any)
    vi.mocked(groundsApi.get).mockResolvedValue({
      checkIns: [{ id: 'c1', sessionNumber: 1, completedAt: '2026-09-27T10:00:00.000Z' }],
    } as any)
    vi.mocked(groundsApi.getMySpecificity).mockResolvedValue({ mostUseful: null, strongest: null } as any)
  })

  it('the masthead is a sentence, not capitals joined with "·"', async () => {
    renderIt()
    /* UPDATED FOR B-147: "Check-in 1" was itself check-in-means-session, the exact mistake the
       audit found repeated across the product for naming one sitting of a check-in. "Session 1" is
       the product's one word for it. */
    expect(await screen.findByText('Session 1, on 27 Sept. Only you read this part.')).toBeTruthy()
    expect(document.body.textContent).not.toContain('YOURS · NOBODY ELSE READS THIS HALF')
  })

  it('what was said reads as a sentence, not "commitment · from a document"', async () => {
    renderIt()
    expect(await screen.findByText(/Send Kito Foods a quote by 9 October\./)).toBeTruthy()
    expect(await screen.findByText('This is a commitment. A document backs it.')).toBeTruthy()
    expect(document.body.textContent).not.toMatch(/·/)
  })

  it('the one thing carried forward has no heading with a number or capitals, and no date it cannot prove', async () => {
    /*
     * U.9 END-OF-MODULE API SUITE: THE DECLARED PLAIN HEADING, NOT THE SCREEN'S OWN LONGER ONE.
     * `the-order-is-the-order-on-screen.spec.ts` checks this block's label against
     * `the-four-reports.ts`'s `WHAT_THE_BLOCK_IS_CALLED.whatYouCarry`, which is "What you carry
     * into the next one" - so the screen's "The one thing…" phrasing had to go, even though it
     * was true (only one sentence is ever drawn under it).
     */
    renderIt()
    expect(await screen.findByText('What you carry into the next one')).toBeTruthy()
    expect(await screen.findByText('Send the quote by Friday.')).toBeTruthy()
    expect(document.body.textContent).not.toMatch(/By when, in your words/)
  })
})
