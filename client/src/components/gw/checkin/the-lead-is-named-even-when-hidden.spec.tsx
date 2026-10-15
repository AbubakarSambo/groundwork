import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TheEndCard } from './TheEndCard'
import { TheDonePage } from './TheDonePage'
import { WhoIsInThis } from '../WhoIsInThis'
import { whoElseAnswers, whoRunsThis } from '@/lib/what-the-end-of-a-check-in-can-say'

/**
 * U.8 FOURTH REVIEW: A PARTICIPANT ON A HIDDEN CHECK-IN, THE REAL ROW SHAPE.
 *
 * On a check-in that hides peers from each other, `GET /grounds/:id` sends a participant only her
 * own participant row - the lead's own row is filtered out, same as anybody else's - plus
 * `leadFirstName` and `leadAnswersToo` at the top level, unaffected by that filter. Amani's ground
 * never carries a lead row inside `participants` to search for; the end card and the Done page must
 * still say "Rukia also answers a check-in" from the two top-level fields alone.
 *
 * `aTeamReportComes` (U.8 fifth review) is the same idea for a different sentence: whether "Two
 * reports come from this" and the team's report card show on the Done page at all. It is also a
 * plain yes/no read off the raw participants, sent regardless of how many rows `participants` itself
 * carries here - Amani's is a real team of (at least) two, and this ground fixture's own
 * `participants` array still has only her one row, on purpose, to prove the Done page is not
 * counting it.
 */
const AMANIS_HIDDEN_GROUND = {
  participants: [
    { id: 'p-amani', partyType: 'PARTICIPANT', userId: 'u-amani', managingOnly: false },
  ],
  leadFirstName: 'Rukia',
  leadAnswersToo: true,
  aTeamReportComes: true,
  viewerIsInitiator: false,
}

describe('the end card names the lead on a check-in that hides everyone else', () => {
  it('says "Rukia also answers a check-in", from leadFirstName/leadAnswersToo, not from a participants row', () => {
    render(
      <TheEndCard
        engine={null}
        leadName={whoElseAnswers(AMANIS_HIDDEN_GROUND)}
        nextOpens={null}
        finishing={false}
        onFinish={() => {}}
        onChange={() => {}}
      />,
    )
    expect(screen.getByText(/Rukia also answers a check-in/)).toBeTruthy()
    expect(screen.queryByText(/Your lead also answers/)).toBeNull()
  })

  it('says nothing about the lead answering when she only manages, even with her name in hand', () => {
    render(
      <TheEndCard
        engine={null}
        leadName={whoElseAnswers({ ...AMANIS_HIDDEN_GROUND, leadAnswersToo: false })}
        nextOpens={null}
        finishing={false}
        onFinish={() => {}}
        onChange={() => {}}
      />,
    )
    expect(screen.queryByText(/also answers a check-in/)).toBeNull()
  })
})

vi.mock('@/api/grounds', () => ({
  groundsApi: {
    get: vi.fn(async () => AMANIS_HIDDEN_GROUND),
    getMyCheckinStatus: vi.fn(async () => ({ checkIns: [] })),
    myTranscript: vi.fn(async () => ({ sessions: [] })),
    myNotes: vi.fn(async () => []),
  },
}))
vi.mock('@/api/conversation', () => ({
  conversationApi: { artifact: vi.fn(async () => ({ artifact: null })) },
}))

/**
 * ROUND 4, ITEM A STEP 2: "WHO IS IN THIS" MOVED FROM `GroundChat`'s Check-in tab TO `WhoIsInThis`,
 * on People and setup. No QueryClient or Router needed any more - `WhoIsInThis` is plain props in,
 * words out.
 */
describe('the roster names the lead on a check-in that hides everyone else', () => {
  it('says "Rukia knows who is here", from leadFirstName alone, not from a participants row', () => {
    render(
      <WhoIsInThis
        parties={[{ name: 'You', done: false, isSelf: true }]}
        peersHidden
        leadName={whoRunsThis(AMANIS_HIDDEN_GROUND)}
        viewerIsTheLead={AMANIS_HIDDEN_GROUND.viewerIsInitiator}
      />,
    )
    expect(screen.getByText(/Rukia knows who is here/)).toBeTruthy()
    expect(screen.queryByText(/Your lead knows/)).toBeNull()
  })
})

function renderDonePage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <TheDonePage
          firstName="Amani"
          checkInId="c1"
          groundId="g1"
          sessionNumber={1}
          myUserId="u-amani"
          isInitiator={false}
        />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('the Done page names the lead on a check-in that hides everyone else', () => {
  it('says "Rukia also answers a check-in" once the ground has loaded', async () => {
    renderDonePage()
    expect(await screen.findByText(/Rukia also answers a check-in/)).toBeTruthy()
  })

  /*
   * U.8 FIFTH REVIEW: "TWO REPORTS COME FROM THIS" MUST NOT DEPEND ON `ground.participants`.
   *
   * The fixture's own `participants` array has one row - Amani's - same as the real payload a
   * hidden check-in sends her. If the Done page still counted that array (the old
   * `howManyAnswer(g) > 1`), it would read this as a check-in of one and never show the team's
   * report card, however many people are really on it. `aTeamReportComes: true` on the fixture is
   * the only fact that should be deciding this.
   */
  it('shows "Two reports come from this" and the team\'s report card, from aTeamReportComes alone', async () => {
    renderDonePage()
    expect(await screen.findByText('Two reports come from this')).toBeTruthy()
    expect(screen.getByText('The team’s report')).toBeTruthy()
  })
})
