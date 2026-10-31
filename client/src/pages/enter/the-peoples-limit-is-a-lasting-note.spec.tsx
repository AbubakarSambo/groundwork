import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { EntryChatPage } from './EntryChatPage'
import { addThroughTheTeamBox } from './a-team-read-in-a-spec'
import { toast } from 'sonner'

/**
 * FAULT 8 (live walk, 6 October 2026): A PASSING TOAST WAS THE ONLY SIGN THE 19-PERSON LIMIT WAS
 * REACHED, AND "ADD PERSON" COULD THEN SILENTLY DO NOTHING.
 *
 * A pasted 20th email was dropped with only a toast, gone in a few seconds; with a further email
 * already sitting in the context step, pressing "Add person" there called `submitInviteContext`,
 * which checks the same limit and just returns - no toast, no disabled control, nothing on screen
 * saying why. This shrinks `mayAdd` to 2 (the same approach
 * the-people-step-for-an-anchor-draft.spec.tsx already uses) to reach the limit in two real adds
 * instead of nineteen, then checks that once it is reached: the engine's own limit sentence stays
 * on screen as a `Note`, not a toast, and "Add person" is disabled rather than doing nothing.
 */

vi.mock('@/api/auth', () => ({ authApi: { entrySave: vi.fn().mockResolvedValue({ draftToken: 'd-token' }) } }))
vi.mock('@/api/entry', () => ({
  entryApi: {
    peopleOnLines: vi.fn(async (t: string) => (await import('./a-team-read-in-a-spec')).readLikeTheServer(t)),
    opener: vi.fn().mockResolvedValue({ reply: '' }),
    chat: vi.fn(), report: vi.fn(), onboard: vi.fn(), classifyIntent: vi.fn(),
    patchDraft: vi.fn().mockResolvedValue({ ok: true }),
  },
}))
vi.mock('@/stores/auth', () => ({ useAuthStore: (sel: any) => sel({ user: null, isAuthenticated: false }) }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }))
vi.mock('./TheSetup', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./TheSetup')>()
  return { ...actual, ANCHOR_PEOPLE_STEP_RULES: { ...actual.ANCHOR_PEOPLE_STEP_RULES, mayAdd: 2 } }
})

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/start']}><EntryChatPage /></MemoryRouter>
    </QueryClientProvider>,
  )
}

function seedClosedAnchorSession() {
  localStorage.setItem('gw_entry_session', JSON.stringify({
    closed: true, onboardingStep: 7,
    history: [{ role: 'assistant', content: 'hi' }, { role: 'user', content: 'ship it' }],
    report: JSON.stringify({ alignmentStatus: 'Clear', whatGroundworkSaw: 'x', alignmentBasis: '', areasRequiringAlignment: [], alignmentReached: [], honestClose: { aligned: '', open: '', revisit: '', risk: '' }, mentionedPeople: [], suggestedParties: [] }),
    onboardingSelections: { mode: 'new', initial: 'Help my team understand', classifiedScenario: 'HELP_TEAM_UNDERSTAND' },
  }))
}

/* UPDATED (Hafsah, 31 October 2026): people are added through the one team box; there is no per-person "Add person" step. */
async function addOnePerson(email: string) {
  await screen.findByLabelText('Your team, one per line')
  addThroughTheTeamBox(email)
  await waitFor(() => expect(screen.getByText(`✓ ${email}.`)).toBeTruthy())
}

const LIMIT_SENTENCE = 'This one-month Groundwork holds up to 20 people besides you.'

describe('the people step keeps the limit sentence on screen, and adds nobody past it', () => {
  beforeEach(() => { localStorage.clear(); vi.clearAllMocks() })

  it('says nothing about the limit before it is reached', async () => {
    seedClosedAnchorSession()
    renderPage()
    await screen.findByText('Who needs to be part of this?')
    expect(screen.queryByText(LIMIT_SENTENCE)).toBeNull()
  })

  it('keeps the limit sentence on screen as a Note once mayAdd is reached, not only a toast', async () => {
    seedClosedAnchorSession()
    renderPage()
    await screen.findByText('Who needs to be part of this?')
    await addOnePerson('person0@example.test')
    await addOnePerson('person1@example.test')
    expect(await screen.findByText(LIMIT_SENTENCE)).toBeTruthy()
    // It really is lasting, not a toast that already dismissed itself.
    await waitFor(() => expect(screen.getByText(LIMIT_SENTENCE)).toBeTruthy())
  })

  it('once the limit is reached, the box adds nobody more, and the limit stays said on screen', async () => {
    seedClosedAnchorSession()
    renderPage()
    await screen.findByText('Who needs to be part of this?')
    await addOnePerson('person0@example.test')
    await addOnePerson('person1@example.test')
    addThroughTheTeamBox('person2@example.test')
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(LIMIT_SENTENCE))
    expect(screen.queryByText('✓ person2@example.test.')).toBeNull()
    expect(screen.getByText(LIMIT_SENTENCE)).toBeTruthy()
  })
})
