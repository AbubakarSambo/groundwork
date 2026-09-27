import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TheEndCard } from './TheEndCard'
import { TheDonePage } from './TheDonePage'
import { GroundChat } from '../GroundChat'
import { whoElseAnswers, whoRunsThis } from '@/lib/what-the-end-of-a-check-in-can-say'

/**
 * U.8 FOURTH REVIEW: A PARTICIPANT ON A HIDDEN CHECK-IN, THE REAL ROW SHAPE.
 *
 * On a check-in that hides peers from each other, `GET /grounds/:id` sends a participant only her
 * own participant row - the lead's own row is filtered out, same as anybody else's - plus
 * `leadFirstName` and `leadAnswersToo` at the top level, unaffected by that filter. Amani's ground
 * never carries a lead row inside `participants` to search for; the end card and the Done page must
 * still say "Rukia also answers a check-in" from the two top-level fields alone.
 */
const AMANIS_HIDDEN_GROUND = {
  participants: [
    { id: 'p-amani', partyType: 'PARTICIPANT', userId: 'u-amani', managingOnly: false },
  ],
  leadFirstName: 'Rukia',
  leadAnswersToo: true,
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

describe('the topic card names the lead on a check-in that hides everyone else', () => {
  it('says "Rukia knows who is here", from leadFirstName alone, not from a participants row', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter>
          <GroundChat
            groundId="g1" openCheckInId={null} openSessionNumber={null} totalSessions={6}
            nextOpensAt={null} onOpenSession={() => {}} openPending={false}
            parties={[{ name: 'You', done: false, isSelf: true }]}
            peersHidden
            brief="A brief, so the card's heading renders."
            leadName={whoRunsThis(AMANIS_HIDDEN_GROUND)}
            viewerIsTheLead={AMANIS_HIDDEN_GROUND.viewerIsInitiator}
          />
        </MemoryRouter>
      </QueryClientProvider>,
    )
    expect(await screen.findByText(/Rukia knows who is here/)).toBeTruthy()
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
})
