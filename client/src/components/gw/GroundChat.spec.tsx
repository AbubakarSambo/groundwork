import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { GroundChat } from './GroundChat'
import { groundsApi } from '@/api/grounds'
import { reportsApi } from '@/api/reports'

/**
 * A GROUND READ AS A CONVERSATION.
 *
 * This file also carries what `GroundParticipantPage.conversation.spec.tsx` used to
 * pin, now that the card view is retired: that a person can read their past
 * check-ins at all. That was Hafsah's "I have no way to go back and see my chats",
 * and it is the reason the transcript is fetched here rather than being an expander
 * on a card.
 *
 * Driven rather than read, because the things worth pinning here are about what
 * appears on screen: the order, the dividers, whose words are shown, and whether
 * the bottom of the scroll offers the right thing.
 */

vi.mock('@/api/grounds', () => ({
  groundsApi: { myTranscript: vi.fn(), myNotes: vi.fn(), addMyNote: vi.fn(), deleteMyNote: vi.fn() },
}))
vi.mock('@/api/documents', () => ({ documentsApi: { upload: vi.fn() } }))
vi.mock('@/api/reports', () => ({ reportsApi: { startSelfCorrection: vi.fn() } }))
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

const session = (n: number, date: string, turns: [string, string][]) => ({
  checkInId: `c${n}`,
  sessionNumber: n,
  status: 'COMPLETED',
  date,
  isSelfCorrection: false,
  correctionOf: null,
  turns: turns.map(([role, content], i) => ({ id: `t${n}-${i}`, role, content })),
})

function renderChat(props: Partial<Parameters<typeof GroundChat>[0]> = {}) {
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
          label="Chain proof"
          sessionsDone={2}
          {...props}
        />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  ;(groundsApi.myNotes as any).mockResolvedValue([])
  ;(reportsApi.startSelfCorrection as any).mockResolvedValue({ checkInId: 'c-new' })
  ;(groundsApi.myTranscript as any).mockResolvedValue({
    sessions: [
      session(1, '2026-08-10T00:00:00.000Z', [['PERSON', 'The scope moved.'], ['AI', 'Who agreed to that?']]),
      session(2, '2026-08-24T00:00:00.000Z', [['PERSON', 'Still waiting on the partner.']]),
    ],
  })
})

describe('the conversation', () => {
  it('shows every session, oldest first', async () => {
    renderChat()
    await waitFor(() => expect(screen.getByText('The scope moved.')).toBeTruthy())
    const body = document.body.textContent ?? ''
    expect(body.indexOf('Session 1')).toBeLessThan(body.indexOf('Session 2'))
    expect(body.indexOf('The scope moved.')).toBeLessThan(body.indexOf('Still waiting on the partner.'))
  })

  it('divides by session, with the date alongside', async () => {
    // The one deliberate departure from a chat app: the unit here is the session,
    // which can span days, and the date is for orientation.
    renderChat()
    await waitFor(() => expect(screen.getByText(/Session 1/)).toBeTruthy())
    expect(screen.getByText(/10 Aug 2026/)).toBeTruthy()
    expect(screen.getByText(/24 Aug 2026/)).toBeTruthy()
  })

  it('labels a correction as an addition to the session it corrects', async () => {
    ;(groundsApi.myTranscript as any).mockResolvedValue({
      sessions: [{ ...session(3, '2026-09-01T00:00:00.000Z', [['PERSON', 'The date was March.']]), isSelfCorrection: true, correctionOf: 1 }],
    })
    renderChat()
    // "Session 3" would read as a third round of the ground, which it is not.
    await waitFor(() => expect(screen.getByText(/Added to session 1/)).toBeTruthy())
  })

  it('says so plainly when there is nothing on record yet', async () => {
    ;(groundsApi.myTranscript as any).mockResolvedValue({ sessions: [] })
    renderChat()
    await waitFor(() => expect(screen.getByText(/Nothing on record yet/)).toBeTruthy())
  })
})

describe('the bottom of the scroll', () => {
  it('offers the open session, with how many there are', async () => {
    renderChat({ openCheckInId: 'c9', openSessionNumber: 2 })
    await waitFor(() => expect(screen.getByRole('button', { name: /Continue session 2 of 6/ })).toBeTruthy())
  })

  it('and takes a note when nothing is open', async () => {
    renderChat()
    await waitFor(() => expect(screen.getByPlaceholderText(/Note something/)).toBeTruthy())
    expect(screen.queryByRole('button', { name: /Continue session/ })).toBeNull()
  })

  it('never offers a note box while a session is open', async () => {
    // Two places to type would split a person's account in half, with only one of
    // them on record.
    renderChat({ openCheckInId: 'c9', openSessionNumber: 2 })
    await waitFor(() => expect(screen.getByRole('button', { name: /Continue session/ })).toBeTruthy())
    expect(screen.queryByPlaceholderText(/Note something/)).toBeNull()
  })

  it('says when the next one opens rather than showing a dead input with no reason', async () => {
    renderChat({ nextOpensAt: '2026-08-26T00:00:00.000Z' })
    await waitFor(() => expect(screen.getByText(/next check-in opens 26 August/)).toBeTruthy())
  })

  it('and says a note is not part of the record', async () => {
    // The product is about a shared record. A private box inside it has to say
    // which it is, or somebody will think they have checked in.
    renderChat()
    await waitFor(() => expect(screen.getByText(/not part of your record/)).toBeTruthy())
  })
})

describe('notes waiting for the next check-in', () => {
  it('are listed, and are not rendered as part of the conversation', async () => {
    ;(groundsApi.myNotes as any).mockResolvedValue([
      { id: 'n1', text: 'partner missed the call', createdAt: '2026-08-20T00:00:00.000Z', carriedIntoCheckInId: null },
    ])
    renderChat()
    await waitFor(() => expect(screen.getByText('partner missed the call')).toBeTruthy())
    const body = document.body.textContent ?? ''
    // Below the composer's divider, not among the messages: a note has never been
    // questioned and must not read as something said in a session.
    expect(body.indexOf('Still waiting on the partner.')).toBeLessThan(body.indexOf('partner missed the call'))
    expect(screen.getByText(/Waiting for your next check-in/)).toBeTruthy()
  })

  it('and one already raised is not listed again', async () => {
    /**
     * TWO NOTES ON PURPOSE, AND THE BITE-CHECK IS WHY.
     *
     * The first version mocked only the carried note and waited for the composer's
     * placeholder - which renders immediately, before the notes query resolves. So
     * the absence check ran against an empty list and passed however the filter
     * behaved. Removing the filter left it green, which is how I found out.
     *
     * Waiting for the uncarried note proves the query has resolved; only then does
     * the carried one being absent mean anything.
     */
    ;(groundsApi.myNotes as any).mockResolvedValue([
      { id: 'n1', text: 'already asked about this', createdAt: '2026-08-20T00:00:00.000Z', carriedIntoCheckInId: 'c2' },
      { id: 'n2', text: 'still waiting to be asked', createdAt: '2026-08-21T00:00:00.000Z', carriedIntoCheckInId: null },
    ])
    renderChat()
    await waitFor(() => expect(screen.getByText('still waiting to be asked')).toBeTruthy())
    expect(screen.queryByText('already asked about this')).toBeNull()
  })

  it('writing one sends the text and nothing else', async () => {
    ;(groundsApi.addMyNote as any).mockResolvedValue({ id: 'n2', text: 'x', createdAt: '', carriedIntoCheckInId: null })
    renderChat()
    const box = await waitFor(() => screen.getByPlaceholderText(/Note something/))
    fireEvent.change(box, { target: { value: '  the deadline moved  ' } })
    fireEvent.click(screen.getByRole('button', { name: /Note it/ }))
    await waitFor(() => expect(groundsApi.addMyNote).toHaveBeenCalledWith('g1', 'the deadline moved'))
  })
})

describe('reading a past check-in', () => {
  it('every completed session offers what the engine took from it', async () => {
    // The summary is not a duplicate of the turns above it - it is what was
    // EXTRACTED, which is the thing somebody wants to check: did it hear me right.
    renderChat()
    await waitFor(() => expect(screen.getAllByRole('button', { name: /What we heard from you/ }).length).toBe(2))
  })

  it('and an unfinished session does not, because nothing has been written yet', async () => {
    ;(groundsApi.myTranscript as any).mockResolvedValue({
      sessions: [{ ...session(1, '2026-08-10T00:00:00.000Z', [['PERSON', 'mid sentence']]), status: 'IN_PROGRESS' }],
    })
    renderChat()
    await waitFor(() => expect(screen.getByText('mid sentence')).toBeTruthy())
    expect(screen.queryByRole('button', { name: /What we heard from you/ })).toBeNull()
  })
})

/**
 * THE WAY TO FIX A SESSION IS VISIBLE, NOT BEHIND A DISCLOSURE.
 *
 * Retiring the card view moved the self-correction inside "what we heard from you", so
 * somebody who believed the record had them wrong had to open a summary before finding
 * out they were allowed to correct it. The persona suite caught it as an absence - "the
 * self-correction affordance EXISTS (hard - absence is a failure, not a shrug)" - five
 * minutes after the push, and it was right twice: the wording had drifted too, from
 * "correct it" to something I had reworded.
 *
 * This says it in a second, and pins the words the product has always used.
 */
describe('correcting a session that got you wrong', () => {
  it('is offered on every completed session without opening anything', async () => {
    renderChat()
    const buttons = await waitFor(() => screen.getAllByRole('button', { name: /correct it/i }))
    // Two completed sessions in the fixture, so two offers.
    expect(buttons).toHaveLength(2)
  })

  it('and starts a correction against that session', async () => {
    renderChat()
    const buttons = await waitFor(() => screen.getAllByRole('button', { name: /correct it/i }))
    fireEvent.click(buttons[0])
    await waitFor(() => expect(reportsApi.startSelfCorrection).toHaveBeenCalledWith('g1', 1))
  })

  it('but not on a session that is still open - there is nothing to correct yet', async () => {
    ;(groundsApi.myTranscript as any).mockResolvedValue({
      sessions: [{ ...session(1, '2026-08-10T00:00:00.000Z', [['PERSON', 'mid sentence']]), status: 'IN_PROGRESS' }],
    })
    renderChat()
    await waitFor(() => expect(screen.getByText('mid sentence')).toBeTruthy())
    expect(screen.queryByRole('button', { name: /correct it/i })).toBeNull()
  })
})
