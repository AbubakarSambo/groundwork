import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { EntryChatPage } from './EntryChatPage'
import { addThroughTheTeamBox } from './a-team-read-in-a-spec'
import { authApi } from '@/api/auth'
import { entryApi } from '@/api/entry'
import { THE_ANCHOR_FIRST_QUESTION } from './TheSetup'

/**
 * REQUEST 166: THE ANCHOR'S SEVEN ITEMS, NOW THAT THE ENGINE SENDS THEM.
 *
 * `extracted` on every onboard reply now carries the seven keys flat (the-anchor-setup.ts's
 * `THE_SEVEN`), and `ready` closes the conversation once all seven are heard. This checks, straight
 * from the rendered page:
 *   - what is heard on one turn is still there after a later turn says nothing about it (the merge
 *     EntryChatPage.tsx already does when it folds `res.extracted` into `onboardingSelections.anchorItems`),
 *     and the side panel's "N of 7 set" tag ticks accordingly;
 *   - the merged seven travel back on the NEXT onboard call, under `soFar.anchorItems` (the fifth
 *     argument to `entryApi.onboardStream`, matching `theSevenIn`'s nested read on the engine side);
 *   - they travel on `POST /entry/report` too (`entryApi.report`'s fifth argument), so the lead's
 *     reveal says what she said;
 *   - the people step's new "Name" field (section 13, "Name + email") is sent as `displayName`;
 *   - none of the anchor's own seven-item machinery reaches a non-anchor draft - the Name field
 *     itself is shared with every situation now (fault 5(a), live walk, 6 October 2026: an ordinary
 *     setup had no way to give a name when adding somebody by email, even when the conversation
 *     already had one - see the-added-list-keeps-the-name-given.spec.tsx).
 */

const onboardStream = vi.fn()
vi.mock('@/api/entry', () => ({
  entryApi: {
    peopleOnLines: vi.fn(async (t: string) => (await import('./a-team-read-in-a-spec')).readLikeTheServer(t)),
    opener: vi.fn().mockResolvedValue({ reply: '' }),
    chat: vi.fn(),
    report: vi.fn().mockResolvedValue({ report: null }),
    onboard: vi.fn(),
    onboardStream: (...a: unknown[]) => onboardStream(...a),
    classifyIntent: vi.fn().mockResolvedValue({ scenario: null, confidence: 'low' }),
  },
}))
vi.mock('@/api/auth', () => ({ authApi: { entrySave: vi.fn().mockResolvedValue({ draftToken: 'd-token' }) } }))
vi.mock('@/stores/auth', () => ({ useAuthStore: (sel: any) => sel({ user: null, isAuthenticated: false }) }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }))

function renderPage(initialEntry: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[initialEntry]}><EntryChatPage /></MemoryRouter>
    </QueryClientProvider>,
  )
}

function openAnchorArrival() {
  sessionStorage.setItem('gw-anchor-start-confirmed', '1')
  return renderPage('/start?scenario=HELP_TEAM_UNDERSTAND')
}

async function sendOnboardingMessage(text: string) {
  /* Fault 7 (live walk, 6 October 2026): placeholder shortened, so it is never clipped at 375px. */
  const box = await screen.findByPlaceholderText('Type your answer')
  fireEvent.change(box, { target: { value: text } })
  fireEvent.click(screen.getByRole('button', { name: 'Send message' }))
}

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  vi.clearAllMocks()
  onboardStream.mockReset()
})

describe('the anchor’s seven items merge across turns', () => {
  /* Changed 3 November evening: the summary has no "N of 7 set" count; it shows each item heard, which is what is checked now. */
  it('keeps what one turn heard once a later turn says nothing about it, and shows it in the summary', async () => {
    onboardStream
      .mockResolvedValueOnce({
        reply: 'Who are you trying to move?',
        extracted: { responsibleFor: 'Keeping renewals on track', tryingToMove: 'My whole team' },
        ready: false,
        needsPeople: true,
      })
      .mockResolvedValueOnce({
        // Nothing for responsibleFor or tryingToMove this turn - only a third item.
        reply: 'Why does that bother you?',
        extracted: { howItContributes: 'They keep the renewals coming in' },
        ready: false,
        needsPeople: true,
      })

    openAnchorArrival()
    await screen.findByText(THE_ANCHOR_FIRST_QUESTION)

    await sendOnboardingMessage('Nobody on my team sees how the renewals land.')
    await waitFor(() => expect(onboardStream).toHaveBeenCalledTimes(1))
    await screen.findByText('Keeping renewals on track')
    expect(screen.getByText('My whole team')).toBeTruthy()

    await sendOnboardingMessage('The whole commercial team.')
    await waitFor(() => expect(onboardStream).toHaveBeenCalledTimes(2))
    // Both the two already heard, AND the new one: nothing heard before was lost by a turn that
    // said nothing about it.
    await waitFor(() => expect(screen.getAllByRole('listitem').length).toBe(3))
    expect(screen.getByText('Keeping renewals on track')).toBeTruthy()
  })

  it('sends the merged seven back on the next onboard call, under soFar.anchorItems', async () => {
    onboardStream
      .mockResolvedValueOnce({
        reply: 'Who are you trying to move?',
        extracted: { responsibleFor: 'Keeping renewals on track' },
        ready: false,
        needsPeople: true,
      })
      .mockResolvedValueOnce({
        reply: 'Why does that bother you?',
        extracted: { tryingToMove: 'My whole team' },
        ready: false,
        needsPeople: true,
      })
      .mockResolvedValueOnce({
        reply: 'What do you think they don’t understand?',
        extracted: {},
        ready: false,
        needsPeople: true,
      })

    openAnchorArrival()
    await screen.findByText(THE_ANCHOR_FIRST_QUESTION)

    await sendOnboardingMessage('Nobody on my team sees how the renewals land.')
    await waitFor(() => expect(onboardStream).toHaveBeenCalledTimes(1))

    await sendOnboardingMessage('The whole commercial team.')
    await waitFor(() => expect(onboardStream).toHaveBeenCalledTimes(2))
    // The second call's own soFar (sent before its reply arrived) carries only what the FIRST
    // turn heard - responsibleFor - under anchorItems.
    const secondCallSoFar = onboardStream.mock.calls[1][4] as { anchorItems?: Record<string, string> }
    expect(secondCallSoFar.anchorItems).toMatchObject({ responsibleFor: 'Keeping renewals on track' })

    await sendOnboardingMessage('They think the work just runs itself.')
    await waitFor(() => expect(onboardStream).toHaveBeenCalledTimes(3))
    // The third call's soFar now carries BOTH - the first turn's item was never dropped by the
    // second turn, which said nothing about it.
    const thirdCallSoFar = onboardStream.mock.calls[2][4] as { anchorItems?: Record<string, string> }
    expect(thirdCallSoFar.anchorItems).toMatchObject({
      responsibleFor: 'Keeping renewals on track',
      tryingToMove: 'My whole team',
    })
  })
})

describe('the anchor’s seven items on the report call', () => {
  /* Seeds a check-in already under way, as a reload would restore one, with all seven already
     heard in onboardingSelections.anchorItems - the shape the real conversation would have left
     behind by the time the lead ends her own session. */
  function seedAnchorCheckIn() {
    localStorage.setItem('gw_entry_session', JSON.stringify({
      scenario: 'HELP_TEAM_UNDERSTAND',
      closed: false,
      history: [
        { role: 'assistant', content: 'What do you do day to day?' },
        { role: 'user', content: 'I keep our biggest accounts renewing.' },
      ],
      onboardingStep: 7,
      onboardingSelections: {
        mode: 'new',
        initial: 'Help my team understand',
        classifiedScenario: 'HELP_TEAM_UNDERSTAND',
        anchorItems: {
          responsibleFor: 'Keeping renewals on track',
          tryingToMove: 'My whole team',
          howItContributes: 'They keep the renewals coming in',
          seeingToday: 'People closing tickets without checking the account is still happy',
          whyItBothersYou: 'We lose renewals we never saw coming',
          whatTheyDontUnderstand: 'That a closed ticket is not the same as a happy customer',
          whatTheyWouldDoDifferently: 'Check in with the account before closing anything',
        },
      },
      onboardingHistory: [
        { role: 'assistant', content: THE_ANCHOR_FIRST_QUESTION },
        { role: 'user', content: 'Help my team understand' },
      ],
      groundName: 'Help my team understand',
    }))
  }

  it('sends the seven under anchorItems, so the lead’s reveal says what she said', async () => {
    seedAnchorCheckIn()
    renderPage('/start')
    await waitFor(() => expect(screen.getAllByText('I keep our biggest accounts renewing.').length).toBeGreaterThan(0))
    fireEvent.click(screen.getByRole('button', { name: 'End check-in' }))
    const dialog = await screen.findByRole('dialog', { name: 'End this check-in?' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'End check-in' }))
    await waitFor(() => expect(entryApi.report).toHaveBeenCalled())
    const call = (entryApi.report as any).mock.calls[0]
    expect(call[4]).toMatchObject({
      responsibleFor: 'Keeping renewals on track',
      tryingToMove: 'My whole team',
      howItContributes: 'They keep the renewals coming in',
      seeingToday: 'People closing tickets without checking the account is still happy',
      whyItBothersYou: 'We lose renewals we never saw coming',
      whatTheyDontUnderstand: 'That a closed ticket is not the same as a happy customer',
      whatTheyWouldDoDifferently: 'Check in with the account before closing anything',
    })
  })

  it('a non-anchor draft sends no anchorItems on the report call', async () => {
    localStorage.setItem('gw_entry_session', JSON.stringify({
      scenario: 'NEW_PROJECT',
      closed: false,
      history: [
        { role: 'assistant', content: 'What brings you here?' },
        { role: 'user', content: 'A new project is starting.' },
      ],
      onboardingStep: 7,
      onboardingSelections: { mode: 'new', initial: 'A new project is starting.' },
      onboardingHistory: [
        { role: 'assistant', content: 'What brings you here?' },
        { role: 'user', content: 'A new project is starting.' },
      ],
      groundName: 'A new project',
    }))
    renderPage('/start')
    await waitFor(() => expect(screen.getAllByText('A new project is starting.').length).toBeGreaterThan(0))
    fireEvent.click(screen.getByRole('button', { name: 'End check-in' }))
    const dialog = await screen.findByRole('dialog', { name: 'End this check-in?' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'End check-in' }))
    await waitFor(() => expect(entryApi.report).toHaveBeenCalled())
    const call = (entryApi.report as any).mock.calls[0]
    expect(call[4]).toBeUndefined()
  })
})

describe('the people step’s Name field, for an anchor draft', () => {
  const closedAnchorSession = () => JSON.stringify({
    closed: true, onboardingStep: 7,
    history: [{ role: 'assistant', content: 'hi' }, { role: 'user', content: 'ship it' }],
    report: JSON.stringify({ alignmentStatus: 'Clear', whatGroundworkSaw: 'x', alignmentBasis: '', areasRequiringAlignment: [], alignmentReached: [], honestClose: { aligned: '', open: '', revisit: '', risk: '' }, mentionedPeople: [], suggestedParties: [] }),
    onboardingSelections: { mode: 'new', initial: 'Help my team understand', classifiedScenario: 'HELP_TEAM_UNDERSTAND' },
  })

  it('is sent as displayName on commit, beside the email it belongs to', async () => {
    localStorage.setItem('gw_entry_session', closedAnchorSession())
    renderPage('/start')
    await screen.findByText('Who needs to be part of this?')

    /* UPDATED (Hafsah, 31 October 2026): the name is given on the same line as the email, in the one team box. */
    /* UPDATED (Hafsah's blocker, 31 October 2026): nothing to press before saving; the save takes the box's lines. */
    addThroughTheTeamBox('Ada, ada@example.test')

    /* The save step asks "Your name" now (local test of staging, 15 October). */
    { const yourName = screen.queryByPlaceholderText('Your name'); if (yourName) fireEvent.change(yourName, { target: { value: 'Hafsah Jumare' } }) }
    fireEvent.change(screen.getByPlaceholderText('your@email.com'), { target: { value: 'lead@example.test' } })
    fireEvent.submit(screen.getByPlaceholderText('your@email.com').closest('form')!)
    await waitFor(() => expect(authApi.entrySave).toHaveBeenCalled())

    const [, body] = (authApi.entrySave as any).mock.calls[0]
    const contributors = body.payload.contributors as { email?: string; displayName?: string }[]
    expect(contributors).toContainEqual(expect.objectContaining({ email: 'ada@example.test', displayName: 'Ada' }))
  })

  it('is optional: an email added without a name carries no displayName', async () => {
    localStorage.setItem('gw_entry_session', closedAnchorSession())
    renderPage('/start')
    await screen.findByText('Who needs to be part of this?')

    addThroughTheTeamBox('bello@example.test')

    /* The save step asks "Your name" now (local test of staging, 15 October). */
    { const yourName = screen.queryByPlaceholderText('Your name'); if (yourName) fireEvent.change(yourName, { target: { value: 'Hafsah Jumare' } }) }
    fireEvent.change(screen.getByPlaceholderText('your@email.com'), { target: { value: 'lead@example.test' } })
    fireEvent.submit(screen.getByPlaceholderText('your@email.com').closest('form')!)
    await waitFor(() => expect(authApi.entrySave).toHaveBeenCalled())

    const [, body] = (authApi.entrySave as any).mock.calls[0]
    const contributors = body.payload.contributors as { email?: string; displayName?: string }[]
    const bello = contributors.find((c) => c.email === 'bello@example.test')
    expect(bello?.displayName).toBeUndefined()
  })

  /*
   * FAULT 5(a) (live walk, 6 October 2026): THE NAME FIELD IS NOW SHARED WITH EVERY SITUATION.
   *
   * This used to pin the opposite - that the Name field appeared for an anchor draft only, and
   * never otherwise. Walked live, setting up a new hire: Imani Wekesa was named in the
   * conversation, then added by her address alone, with nowhere to give a name because this field
   * was anchor-gated - and her roster row read "imani@walk2.test has not checked in…", though
   * Groundwork already had her name. `displayNames`/`asSomeoneToInvite` already carried a typed
   * name through to `displayName` for every situation; only the field to type one into was gated.
   * What stays anchor-only is the rest of the seven-item machinery this file is really about,
   * checked elsewhere in this describe block.
   */
  /* UPDATED (Hafsah, 31 October 2026): the name is asked on each line of the one team box, for every situation alike. */
  it('offers a name on each line of the team box for any other situation too, not only an anchor draft', async () => {
    localStorage.setItem('gw_entry_session', JSON.stringify({
      closed: true, onboardingStep: 7,
      history: [{ role: 'assistant', content: 'hi' }, { role: 'user', content: 'ship it' }],
      report: JSON.stringify({ alignmentStatus: 'Clear', whatGroundworkSaw: 'x', alignmentBasis: '', areasRequiringAlignment: [], alignmentReached: [], honestClose: { aligned: '', open: '', revisit: '', risk: '' }, mentionedPeople: [], suggestedParties: [] }),
      onboardingSelections: { mode: 'new', initial: 'New project' },
    }))
    renderPage('/start')
    const emailInput = await screen.findByPlaceholderText('your@email.com')
    /* The save step asks "Your name" now (local test of staging, 15 October). */
    { const yourName = screen.queryByPlaceholderText('Your name'); if (yourName) fireEvent.change(yourName, { target: { value: 'Hafsah Jumare' } }) }
    fireEvent.change(emailInput, { target: { value: 'lead@example.test' } })
    fireEvent.submit(emailInput.closest('form')!)
    await waitFor(() => expect(authApi.entrySave).toHaveBeenCalled())
    expect(screen.getByText(/One per line: a name, an email and a phone number\./)).toBeTruthy()
  })
})
