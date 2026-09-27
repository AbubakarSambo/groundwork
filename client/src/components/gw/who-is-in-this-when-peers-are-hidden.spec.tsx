import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { GroundChat } from './GroundChat'

/**
 * NAMES, NOT ROLES - AND NEVER SAID TO THE LEAD ABOUT HERSELF (U.8 third review).
 *
 * "On this check-in people check in without seeing each other. Your lead knows who is here; you
 * will not see the others or what they wrote, and they will not see you." was said, word for word,
 * to every reader alike: a participant read "your lead" rather than the lead's own name, and a
 * semicolon joined two sentences into one - and the SAME sentence was shown to the lead when she is
 * a party in her own check-in (a common case: a lead who also takes part), so she read a
 * description of her own role in the third person, about herself.
 */

vi.mock('@/api/grounds', () => ({
  groundsApi: {
    myTranscript: vi.fn(async () => ({ sessions: [] })),
    myNotes: vi.fn(async () => []),
  },
}))

function renderTopic(props: { leadName?: string | null; viewerIsTheLead?: boolean }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <GroundChat
          groundId="g1"
          openCheckInId={null}
          openSessionNumber={null}
          totalSessions={6}
          nextOpensAt={null}
          onOpenSession={() => {}}
          openPending={false}
          parties={[{ name: 'You', done: false, isSelf: true }]}
          peersHidden
          brief="A brief, so the card's heading renders."
          {...props}
        />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('the sentence when peers are hidden from each other', () => {
  it('names the lead, and joins the two facts as two sentences, not one with a semicolon', async () => {
    renderTopic({ leadName: 'Rukia' })
    expect(await screen.findByText(
      'Rukia knows who is here. You will not see the others or what they wrote, and they will not see you.',
    )).toBeTruthy()
    expect(screen.queryByText(/Your lead knows/)).toBeNull()
    expect(screen.queryByText(/;/)).toBeNull()
  })

  it('gives the lead her own true sentence, never the participant one about herself', async () => {
    renderTopic({ viewerIsTheLead: true, leadName: null })
    expect(await screen.findByText(
      'People on this check-in answer without seeing each other. You can see who is here.',
    )).toBeTruthy()
    expect(screen.queryByText(/knows who is here/)).toBeNull()
  })
})
