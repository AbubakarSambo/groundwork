import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { EntryChatPage } from './EntryChatPage'
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

async function addOnePerson(email: string) {
  fireEvent.change(await screen.findByPlaceholderText('name@company.com'), { target: { value: email } })
  fireEvent.click(screen.getByText('Add'))
  await screen.findByText('What do they do, and why are they part of this?')
  fireEvent.click(screen.getByText('Skip'))
  await waitFor(() => expect(screen.queryByText('What do they do, and why are they part of this?')).toBeNull())
}

const LIMIT_SENTENCE = 'This one-month Groundwork holds up to 20 people besides you.'

describe('the people step keeps the limit sentence on screen, and disables Add person', () => {
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

  it('disables "Add person" once the limit is reached, instead of it silently doing nothing', async () => {
    seedClosedAnchorSession()
    renderPage()
    await screen.findByText('Who needs to be part of this?')
    await addOnePerson('person0@example.test')
    await addOnePerson('person1@example.test')

    fireEvent.change(await screen.findByPlaceholderText('name@company.com'), { target: { value: 'person2@example.test' } })
    fireEvent.click(screen.getByText('Add'))
    await screen.findByText('What do they do, and why are they part of this?')
    expect(screen.getByText('Add person').closest('button')).toBeDisabled()
    expect(toast.error).not.toHaveBeenCalled()
  })
})
