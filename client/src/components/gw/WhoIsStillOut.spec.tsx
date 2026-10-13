import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WhoIsStillOut } from './WhoIsStillOut'
import { groundsApi } from '@/api/grounds'

/**
 * U.8 REVIEW: THE LEAD'S DONE-PAGE ROSTER SAID "Rukia Otieno Answered" / "Baraka U8 Not joined
 * yet" - a name beside a status word, joined by nothing a sentence would use. Now: full sentences,
 * "you" for the reader's own row, first names for everyone else, and a header naming who is still
 * to answer rather than a bare count next to the word "session".
 */
vi.mock('@/api/grounds', () => ({
  groundsApi: { get: vi.fn(), getMyCheckinStatus: vi.fn() },
}))
vi.mock('@/api/conversation', () => ({
  conversationApi: { remind: vi.fn() },
}))

function groundWith(overrides: Record<string, any> = {}) {
  return {
    id: 'g1',
    label: 'Sales team, Q3',
    participants: [
      { id: 'p-lead', userId: 'u-lead', partyType: 'INITIATOR', user: { firstName: 'Rukia', lastName: '' } },
      { id: 'p-b', userId: 'u-b', partyType: 'PARTICIPANT', user: { firstName: 'Baraka', lastName: '' } },
      { id: 'p-n', userId: null, partyType: 'PARTICIPANT', user: { firstName: 'Neema', lastName: '' } },
    ],
    checkIns: [
      { id: 'c-lead', participantId: 'p-lead', sessionNumber: 1, status: 'COMPLETED' },
    ],
    ...overrides,
  }
}

function renderIt(ground: any, myUserId = 'u-lead') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  ;(groundsApi.get as any).mockResolvedValue(ground)
  return render(
    <QueryClientProvider client={qc}>
      <WhoIsStillOut groundId="g1" sessionNumber={1} myUserId={myUserId} />
    </QueryClientProvider>,
  )
}

describe('who is still out, as full sentences (U.8 review)', () => {
  it('names who still has to answer, and says so of everyone but the reader', async () => {
    renderIt(groundWith())
    expect(await screen.findByText('Baraka and Neema still have to answer.')).toBeInTheDocument()
  })

  it('the reader reads "you", others read their first name, each a full sentence', async () => {
    renderIt(groundWith())
    await waitFor(() => expect(screen.getByText(/still have to answer/)).toBeInTheDocument())
    expect(screen.getByText('You have answered.')).toBeInTheDocument()
    expect(screen.getByText('Baraka has not started yet.')).toBeInTheDocument()
    expect(screen.getByText('Neema has not joined yet.')).toBeInTheDocument()
  })

  it('says everyone has answered, with nobody named, once the round is in', async () => {
    renderIt(groundWith({
      checkIns: [
        { id: 'c-lead', participantId: 'p-lead', sessionNumber: 1, status: 'COMPLETED' },
        { id: 'c-b', participantId: 'p-b', sessionNumber: 1, status: 'COMPLETED' },
        { id: 'c-n', participantId: 'p-n', sessionNumber: 1, status: 'COMPLETED' },
      ],
    }))
    expect(await screen.findByText('Everyone has answered.')).toBeInTheDocument()
  })

  it('one person still to answer reads as their own sentence, not a count', async () => {
    renderIt(groundWith({
      participants: [
        { id: 'p-lead', userId: 'u-lead', partyType: 'INITIATOR', user: { firstName: 'Rukia', lastName: '' } },
        { id: 'p-b', userId: 'u-b', partyType: 'PARTICIPANT', user: { firstName: 'Baraka', lastName: '' } },
      ],
      checkIns: [
        { id: 'c-lead', participantId: 'p-lead', sessionNumber: 1, status: 'COMPLETED' },
        { id: 'c-b', participantId: 'p-b', sessionNumber: 1, status: 'IN_PROGRESS' },
      ],
    }))
    expect(await screen.findByText('Baraka still has to answer.')).toBeInTheDocument()
    expect(screen.getByText('Baraka is part way through.')).toBeInTheDocument()
  })

  /**
   * B-058, DECISION 115: a person with no name was called by the front of their address -
   * "Qx7 has not joined yet." - on this same sentence, found walking Riverbank Trading's old data
   * (docs/existing-users-check.md). The person has no `user.firstName`/`lastName` and no name typed
   * at an open link, only an address; the fix is the same placeholder sentence the People page uses
   * for them, never a name guessed from "qx7@riverbank.test".
   */
  it('a person with no name reads as the placeholder sentence, never a name guessed from their address', async () => {
    renderIt(groundWith({
      participants: [
        { id: 'p-lead', userId: 'u-lead', partyType: 'INITIATOR', user: { firstName: 'Rukia', lastName: '' } },
        { id: 'p-q', userId: null, partyType: 'PARTICIPANT', email: 'qx7@riverbank.test' },
      ],
      checkIns: [
        { id: 'c-lead', participantId: 'p-lead', sessionNumber: 1, status: 'COMPLETED' },
      ],
    }))
    expect(await screen.findByText('Someone who has not given a name yet still has to answer.')).toBeInTheDocument()
    expect(screen.getByText('Someone who has not given a name yet has not joined yet.')).toBeInTheDocument()
    expect(screen.queryByText(/Qx7/)).toBeNull()
  })
})
