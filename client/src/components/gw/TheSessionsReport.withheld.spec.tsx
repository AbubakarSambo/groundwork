import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TheSessionsReport } from './TheSessionsReport'
import { reportsApi } from '@/api/reports'

/**
 * ANSWERS FROM THE ENGINE, 51: THE SESSION REPORT BEFORE SOMEONE HAS ANSWERED.
 *
 * Before the report is released, a participant who has not answered THIS session gets only
 * `{ sessionNumber, withheldUntilYouAnswer: true, saying }` from `GET /grounds/:id/report/session/:n`
 * - none of the detail `SessionShapedReport` otherwise carries, because reading somebody else's
 * account before writing your own is exactly what this withholds against. `saying` is shown the
 * same way the round-level version of this already reads on `SharedReportForAParty.tsx`.
 */
function mount(sessionData: unknown) {
  vi.spyOn(reportsApi, 'sessionReport').mockResolvedValue(sessionData as any)
  vi.spyOn(reportsApi, 'get').mockResolvedValue({} as any)
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <TheSessionsReport groundId="g1" sessionNumber={3} />
    </QueryClientProvider>,
  )
}

afterEach(() => vi.restoreAllMocks())

describe('the session report, withheld until you answer', () => {
  it('shows the sentence the engine sends, and none of the detail', async () => {
    mount({
      sessionNumber: 3,
      withheldUntilYouAnswer: true,
      saying: 'A picture is forming from the accounts that are in. You can read it as soon as you have given yours.',
    })
    expect(await screen.findByText('There is a picture forming, and you have not answered yet')).toBeInTheDocument()
    expect(screen.getByText('A picture is forming from the accounts that are in. You can read it as soon as you have given yours.')).toBeInTheDocument()
    // None of the ordinary report's sections - proof this is the withheld branch, not the real one.
    expect(screen.queryByText(/Progress and priorities/)).toBeNull()
    expect(screen.queryByText(/Shared with the team/i)).toBeNull()
  })

  it('renders the ordinary report once it is not withheld', async () => {
    mount({
      sessionNumber: 3,
      state: 'forming',
      whereThingsStand: { agreed: 0, stillOpen: 0, saying: '', settled: [], open: [] },
      sections: [],
      howClearThisWas: { level: null, saying: '' },
      theConversationWorthHaving: null,
      atAGlance: [],
      confidence: { score: 0, band: 'thin', saying: '', reasons: [] },
      patterns: [],
      whatEachPersonSaid: [],
      correctable: false,
      whyNotCorrectable: null,
      counting: [{ who: 'You', isYou: true, answered: true }],
      everybodyHasShownTheirs: false,
      released: false,
      iHaveShownMine: false,
      sharedPicture: null,
      pictureLines: [],
      pictureBasis: 'none',
      writtenPicture: null,
      whyNoQuestion: null,
    })
    expect(await screen.findByText(/Session 3/)).toBeInTheDocument()
    expect(screen.queryByText('There is a picture forming, and you have not answered yet')).toBeNull()
  })
})
