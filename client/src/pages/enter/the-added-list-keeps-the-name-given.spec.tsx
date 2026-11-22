import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { EntryChatPage } from './EntryChatPage'
import { addThroughTheTeamBox, saveWithMyEmail } from './a-team-read-in-a-spec'

/**
 * FAULT 3 (WALK ITEM 3, PART 1): NAMES ARE DROPPED AFTER THE PEOPLE STEP.
 *
 * The anchor's people step asks for a Name beside each email (section 13), and the name reached
 * the commit payload (`displayName`, request 166) - but it never reached what the lead actually
 * reads on screen. Walked live: the added list showed "✓ musa@anchor.test" and the "Check your
 * email" confirmation said "musa@anchor.test is waiting to be invited.", though Musa had been
 * given a name moments before.
 *
 * `shownAs` (EntryChatPage.tsx) now reads `displayNames` for a plain address and shows
 * "Name (address)" wherever that address is listed - the added chip list and the waiting
 * sentence both go through it, so both are fixed together.
 */

vi.mock('@/api/entry', () => ({
  entryApi: { opener: vi.fn().mockResolvedValue({ reply: '' }), chat: vi.fn(), report: vi.fn(), onboard: vi.fn(), classifyIntent: vi.fn(),
    patchDraft: vi.fn().mockResolvedValue({ ok: true }),
    peopleOnLines: vi.fn(async (t: string) => (await import('./a-team-read-in-a-spec')).readLikeTheServer(t)) },
}))
vi.mock('@/api/auth', () => ({
  authApi: { entrySave: vi.fn().mockResolvedValue({ draftToken: 'draft-anchor-names' }) },
}))
vi.mock('@/stores/auth', () => ({ useAuthStore: (sel: any) => sel({ user: null, isAuthenticated: false }) }))

function seedClosedAnchorSession() {
  localStorage.setItem('gw_entry_session', JSON.stringify({
    closed: true,
    onboardingStep: 7,
    history: [{ role: 'assistant', content: 'hi' }, { role: 'user', content: 'ship it' }],
    report: JSON.stringify({ alignmentStatus: 'Clear', whatGroundworkSaw: 'x', alignmentBasis: '', areasRequiringAlignment: [], alignmentReached: [], honestClose: { aligned: '', open: '', revisit: '', risk: '' }, mentionedPeople: [], suggestedParties: [] }),
    onboardingSelections: { mode: 'new', initial: 'Help my team understand', classifiedScenario: 'HELP_TEAM_UNDERSTAND' },
  }))
}

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/start']}>
        <EntryChatPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('the added list and the waiting sentence keep the name given', () => {
  beforeEach(() => { localStorage.clear(); vi.clearAllMocks() })

  /*
   * UPDATED (Hafsah, 31 October 2026: one team box, one press, no "What do they do" step per person). The name is given on the same
   * line as the email, in the team box, and every place the address is listed reads it.
   */
  /* UPDATED again (Hafsah's blocker, 31 October 2026): the save takes the box's lines, so the name given travels with the save. */
  it('asks nobody "What do they do" while adding, and the name given goes with the save', async () => {
    seedClosedAnchorSession()
    renderPage()
    await screen.findByText('Who needs to be part of this?')
    await addThroughTheTeamBox('Musa Bello, musa@anchor.test')
    saveWithMyEmail()
    const { authApi } = await import('@/api/auth')
    await waitFor(() => expect(authApi.entrySave).toHaveBeenCalled())
    const [, body] = vi.mocked(authApi.entrySave).mock.calls[0] as any[]
    expect(body.payload.contributors).toEqual([expect.objectContaining({ email: 'musa@anchor.test', displayName: 'Musa Bello' })])
    expect(screen.queryByText('What do they do, and why are they part of this?')).toBeNull()
  })

  it('names the person, not just the address, in "is waiting to be invited"', async () => {
    seedClosedAnchorSession()
    renderPage()
    await screen.findByText('Who needs to be part of this?')
    await addThroughTheTeamBox('Musa Bello, musa@anchor.test')
    saveWithMyEmail()

    await screen.findByText('Check your email')
    expect(screen.getByText(/Musa Bello \(musa@anchor\.test\) is waiting to be invited\./)).toBeTruthy()
  })

  it('an email added with no name still shows the address alone', async () => {
    seedClosedAnchorSession()
    renderPage()
    await screen.findByText('Who needs to be part of this?')
    await addThroughTheTeamBox('bello@example.test')
    saveWithMyEmail()
    await screen.findByText('Check your email')
    expect(screen.getByText(/^bello@example\.test is waiting to be invited\./)).toBeTruthy()
  })

  /*
   * FAULT 5(a) (live walk, 6 October 2026): AN ORDINARY SETUP KEEPS A NAME GIVEN BY EMAIL TOO.
   *
   * The Name field used to show only for an anchor draft - so a lead setting up a new hire,
   * Imani Wekesa, already named in the conversation, had nowhere to give her name when adding her
   * by address, and the roster afterwards read "imani@walk2.test has not checked in…" with no name
   * anywhere. The field is shared with every situation now; this is the same mechanism as the
   * anchor's own ("Name (email)" on the chip, named in "is waiting to be invited"), proven here on
   * an ordinary, non-anchor session.
   */
  it('an ordinary (non-anchor) setup keeps a name given beside an email too', async () => {
    localStorage.setItem('gw_entry_session', JSON.stringify({
      scenario: 'NEW_HIRE', closed: true, onboardingStep: 7,
      history: [{ role: 'assistant', content: 'hi' }, { role: 'user', content: 'ship it' }],
      report: JSON.stringify({ alignmentStatus: 'Clear', whatGroundworkSaw: 'x', alignmentBasis: '', areasRequiringAlignment: [], alignmentReached: [], honestClose: { aligned: '', open: '', revisit: '', risk: '' }, mentionedPeople: [], suggestedParties: [] }),
      onboardingSelections: { mode: 'new', initial: 'A new hire is starting.', classifiedScenario: 'NEW_HIRE', peopleNamed: ['Imani'] },
    }))
    const { authApi } = await import('@/api/auth')
    vi.mocked(authApi.entrySave).mockResolvedValue({ draftToken: 'd-token-new-hire' } as any)
    renderPage()
    fireEvent.click(await screen.findByText(/Invite and finish/))
    const emailInput = screen.getByPlaceholderText('your@email.com')
    /* The save step asks "Your name" now (local test of staging, 15 October). */
    { const yourName = screen.queryByPlaceholderText('Your name'); if (yourName) fireEvent.change(yourName, { target: { value: 'Hafsah Jumare' } }) }
    fireEvent.change(emailInput, { target: { value: 'lead@example.test' } })
    fireEvent.submit(emailInput.closest('form')!)
    await waitFor(() => expect(authApi.entrySave).toHaveBeenCalled())
    await screen.findByText('Invite people')

    /* The team box is filled with Imani, named in the conversation; the lead adds her email on her line. */
    expect((screen.getByLabelText('Your team, one per line') as HTMLTextAreaElement).value).toBe('Imani')
    /* UPDATED again (Hafsah's blocker, 31 October 2026): after the email is sent, "Done" takes the box's lines onto the list. */
    await addThroughTheTeamBox('Imani Wekesa, imani@walk2.test')
    fireEvent.click(screen.getByText('Done'))

    await waitFor(() => expect(screen.getByText('✓ Imani Wekesa (imani@walk2.test).')).toBeTruthy())
    expect(screen.queryByText('✓ imani@walk2.test.')).toBeNull()
  })
})
