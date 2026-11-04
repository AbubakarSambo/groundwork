import { describe, it, expect, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { GroundChat } from './GroundChat'

/**
 * THE SAME WAIT, THE SAME SENTENCE, ON THE CHECK-IN'S OWN PAGE TOO (U.8 third review).
 *
 * Opening a session runs several model calls before it answers (ConversationService.open), which
 * is 14 to 60 seconds of "Opening…" with nothing else said. Only /checkin explained the wait; the
 * check-in's own page (GroundParticipantPage / GroundAdminPage, via this "Check in now" button)
 * did not, so a lead's first open from here sat on "Opening…" for over 70 seconds with nothing
 * else on screen.
 */

vi.mock('@/api/grounds', () => ({
  groundsApi: { myTranscript: vi.fn(async () => ({ sessions: [] })), myNotes: vi.fn(async () => []) },
}))

function renderChat(openPending: boolean) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <GroundChat
          groundId="g1"
          openCheckInId="ci1"
          openSessionNumber={1}
          totalSessions={6}
          nextOpensAt={null}
          onOpenSession={() => {}}
          openPending={openPending}
        />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('the "Check in" button explains a long wait, the same way /checkin does', () => {
  it('says nothing extra for the first few seconds', async () => {
    vi.useFakeTimers()
    try {
      renderChat(true)
      await act(async () => { await vi.advanceTimersByTimeAsync(1000) })
      expect(screen.queryByText('Getting your first question.')).toBeNull()
    } finally {
      vi.useRealTimers()
    }
  })

  it('explains the wait once it has gone on a few seconds', async () => {
    vi.useFakeTimers()
    try {
      renderChat(true)
      await act(async () => { await vi.advanceTimersByTimeAsync(4000) })
      /* Hafsah, 30 October 2026: plain language for an impatient first-time lead; one short line that never says how long it takes. */
      expect(screen.getByText('Getting your first question.')).toBeTruthy()
    } finally {
      vi.useRealTimers()
    }
  })

  it('says nothing when nothing is opening', async () => {
    renderChat(false)
    expect(screen.queryByText('Getting your first question.')).toBeNull()
  })
})
