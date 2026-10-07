import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { EntryChatPage } from './EntryChatPage'
import { visiblePrimaryButtons } from './the-entry-chats-own-test-helpers'
import {
  stripComments, oldClassesUsed, bannedInlineStyleProps, bannedStyleReferenceProps, tooSmallFontSizes,
} from '@/components/gw/ui/the-rebuilt-pages-use-only-the-new-parts.spec'

/**
 * GROUP 3, PIECE 4D-3 (B1-starting-a-check-in): the chat's own save card (the report header, the
 * generating/failed states, the correction thread, "what happens next", saving as a signed-in user
 * or anonymously, the "check your email" confirmation, naming the situation and inviting people,
 * and "Done"/"Later"), and what sits beside it, the new-scenario-conflict dialog.
 *
 * The overlay itself stays a page-drawn card, not the shared `Modal` - it is not a small dialog
 * with a title and a close button, it is the report, and 4d-2's own comment a few lines above it
 * (ABOVE THE RAIL, WHICH IS 40) already explains why it is its own full-screen layer. Every control
 * inside it now comes from `components/gw/ui` (Button, TextField, TextArea, FieldLabel), and every
 * size, colour and spacing value that was an inline `style={{}}` is now a named class on
 * gw-ui.css, following the same gwui-ec-* convention 4d-1 and 4d-2 already used for this page.
 *
 * Checked the same way as 4d-1/4d-2: the guard's own functions, run against the two source ranges
 * this part rebuilt, then a render with mocked data for each state, pressing only controls that
 * open or close a section or that resolve against a MOCKED api - handleSave below really does call
 * `authApi.entrySave`, but entrySave is a vi.fn() that touches no network and no database, the same
 * guarantee every other spec in this file already relies on. Nothing here calls the real API.
 */

const FULL_SOURCE = readFileSync(join(__dirname, 'EntryChatPage.tsx'), 'utf8')

const SAVECARD_START = FULL_SOURCE.indexOf('      {/*\n        * Save card.')
const SAVECARD_END = FULL_SOURCE.indexOf('{/* End session confirmation modal */}')
if (SAVECARD_START === -1 || SAVECARD_END === -1 || SAVECARD_END <= SAVECARD_START) {
  throw new Error('the 4d-3 source range markers moved - update this spec to find the new ones')
}
const SAVECARD_RANGE = stripComments(FULL_SOURCE.slice(SAVECARD_START, SAVECARD_END))

describe('4d-3: the source this piece rebuilt carries no old class or banned inline style', () => {
  it('the save card and the new-scenario-conflict dialog use none of the old classes or inline styles', () => {
    expect(oldClassesUsed(SAVECARD_RANGE)).toEqual([])
    expect(bannedInlineStyleProps(SAVECARD_RANGE)).toEqual([])
    expect(bannedStyleReferenceProps(SAVECARD_RANGE)).toEqual([])
    expect(tooSmallFontSizes(SAVECARD_RANGE)).toEqual([])
  })
})

vi.mock('@/api/entry', () => ({
  entryApi: {
    opener: vi.fn().mockResolvedValue({ reply: '' }),
    chat: vi.fn(),
    report: vi.fn(),
    onboard: vi.fn(),
    classifyIntent: vi.fn(),
    patchDraft: vi.fn().mockResolvedValue({ ok: true }),
  },
}))
vi.mock('@/api/auth', () => ({ authApi: { entrySave: vi.fn(), colleagues: vi.fn().mockResolvedValue([]) } }))
vi.mock('@/api/billing', () => ({ billingApi: { checkCanCreateGround: vi.fn().mockResolvedValue({ allowed: true }) } }))

let authedUser: { id: string; email: string } | null = null
vi.mock('@/stores/auth', () => ({ useAuthStore: (sel: any) => sel({ user: authedUser, isAuthenticated: !!authedUser }) }))

function expectAtMostOnePrimaryButton(container: HTMLElement) {
  /* Excludes the save card's own primary button while the card is CSS-hidden (visibility:
     hidden, which also takes it out of the tab order and the accessibility tree) - see
     the-entry-chats-own-test-helpers.ts for why a literal DOM count cannot see that on its own. */
  const primaries = visiblePrimaryButtons(container)
  expect(primaries.length, `expected at most one primary (navy) button, found ${primaries.length}`).toBeLessThanOrEqual(1)
}

function renderPage(path = '/start') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}>
        <EntryChatPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const REPORT = JSON.stringify({
  alignmentStatus: 'Clear', whatGroundworkSaw: 'Daniel owns the pipeline.', alignmentBasis: '',
  areasRequiringAlignment: [], alignmentReached: [], honestClose: { aligned: '', open: '', revisit: '', risk: '' },
  mentionedPeople: [], suggestedParties: [],
})

/** A closed, reported session - the way a reload restores one, never typed or saved through the
    UI. The save card renders as soon as this is on disk (the overlay is always mounted, CSS-hidden
    until `showSave`, which the groundName spec already relies on for the same reason). */
function seedClosedSession(extra: Record<string, unknown> = {}) {
  localStorage.setItem('gw_entry_session', JSON.stringify({
    scenario: 'NEW_PROJECT',
    closed: true,
    onboardingStep: 7,
    history: [
      { role: 'assistant', content: 'Have you told Daniel about this worry yet?' },
      { role: 'user', content: 'Once, in July. Not formally.' },
    ],
    report: REPORT,
    groundName: 'Daniel, the next six weeks',
    onboardingSelections: { mode: 'new', initial: 'A team member is not delivering.' },
    ...extra,
  }))
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  authedUser = null
})

describe('the save card, anonymous, before saving', () => {
  it('shows the report and one way to save, and calls no API by merely rendering', async () => {
    const { entryApi } = await import('@/api/entry')
    const { authApi } = await import('@/api/auth')
    seedClosedSession()
    const { container } = renderPage()
    /* The card sits behind "Invite and finish" until opened - the same closed-session bar this
       page has always shown, untouched by this part. Opening it is a fold, not a save or a send:
       it reveals a section, it does not submit anything. */
    fireEvent.click(await screen.findByText(/Invite and finish/))
    expect(screen.getByPlaceholderText('your@email.com')).toBeTruthy()
    expect(screen.getAllByText('Daniel, the next six weeks').length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: 'Save my check-in' })).toBeTruthy()
    expectAtMostOnePrimaryButton(container)
    expect(entryApi.chat).not.toHaveBeenCalled()
    expect(authApi.entrySave).not.toHaveBeenCalled()
  })

  it('saving (against the mocked API only) opens the email confirmation and the invite section, still with one navy button', async () => {
    const { authApi } = await import('@/api/auth')
    vi.mocked(authApi.entrySave).mockResolvedValue({ draftToken: 'd-token' } as any)
    seedClosedSession()
    const { container } = renderPage()
    fireEvent.click(await screen.findByText(/Invite and finish/))
    const emailInput = screen.getByPlaceholderText('your@email.com')
    fireEvent.change(emailInput, { target: { value: 'lead@example.test' } })
    fireEvent.submit(emailInput.closest('form')!)
    await waitFor(() => expect(authApi.entrySave).toHaveBeenCalledTimes(1))
    expect(await screen.findByText('Check your email')).toBeTruthy()
    expect(screen.getByText('Name this situation')).toBeTruthy()
    expect(screen.getByText('Invite people')).toBeTruthy()
    expectAtMostOnePrimaryButton(container)
  })
})

describe('the save card, already signed in', () => {
  it('offers one save button straight to the account, with no email step', async () => {
    authedUser = { id: 'u1', email: 'rukia@example.test' }
    const { authApi } = await import('@/api/auth')
    seedClosedSession()
    const { container } = renderPage()
    fireEvent.click(await screen.findByText(/Invite and finish/))
    expect(screen.getByRole('button', { name: 'Save this' })).toBeTruthy()
    expect(screen.getByText('Saving to rukia@example.test. No confirmation needed, you are already signed in.')).toBeTruthy()
    expect(screen.queryByPlaceholderText('your@email.com')).toBeNull()
    expectAtMostOnePrimaryButton(container)
    expect(authApi.entrySave).not.toHaveBeenCalled()
  })

  /*
   * FAULT 1 (live walk, 6 October 2026): A SIGNED-IN READER WAS TOLD TO SIGN IN.
   *
   * Changing the number of sessions to more than one used to show "6 sessions means signing in,
   * and it is free" to everyone, signed in or not - on the same screen as, two inches below, "No
   * confirmation needed, you are already signed in." The two sentences disagreed about whether
   * signing in was still ahead of her. The "means signing in" clause is said only to a stranger,
   * for whom it is still true.
   */
  it('setting more than one session never tells an already signed-in lead to sign in', async () => {
    authedUser = { id: 'u1', email: 'rukia@example.test' }
    localStorage.setItem('gw_entry_session', JSON.stringify({
      scenario: 'PIP', closed: false, flowPath: 'self', onboardingStep: 7,
      history: [{ role: 'assistant', content: 'How is it going?' }],
      sessions: 1, cadence: 'WEEKLY', cadenceChosen: true, plannedFrom: { timelineDays: 42, cadence: 'WEEKLY' },
      onboardingSelections: { mode: 'new', initial: 'x', classifiedScenario: 'PIP' },
    }))
    renderPage()
    await screen.findByText(/sessions? planned/)
    const sessionsButton = screen.getAllByRole('button', { name: /session,? planned from/i })[0]
    fireEvent.click(sessionsButton)
    const input = screen.getAllByLabelText('How many sessions')[0]
    fireEvent.change(input, { target: { value: '3' } })
    fireEvent.blur(input)
    /* FAULT 4 (live review): this still read "Save your session below to get set up", the same
       words told to a stranger who still has to sign in - read right beside "you are already
       signed in" it contradicted itself. A signed-in lead now reads "Save this below", the same
       words the save card itself uses for them. */
    expect(await screen.findByText(/Save this below/)).toBeTruthy()
    expect(screen.queryByText(/Save your session below to get set up/)).toBeNull()
    expect(screen.queryByText(/means signing in/)).toBeNull()
    expect(screen.getByText(/No confirmation needed, you are already signed in\./)).toBeTruthy()
  })

  /** And the same prompt still says it to a stranger, for whom it remains true. */
  it('still tells a signed-out visitor that more than one session means signing in', async () => {
    authedUser = null
    localStorage.setItem('gw_entry_session', JSON.stringify({
      scenario: 'PIP', closed: false, flowPath: 'self', onboardingStep: 7,
      history: [{ role: 'assistant', content: 'How is it going?' }],
      sessions: 1, cadence: 'WEEKLY', cadenceChosen: true, plannedFrom: { timelineDays: 42, cadence: 'WEEKLY' },
      onboardingSelections: { mode: 'new', initial: 'x', classifiedScenario: 'PIP' },
    }))
    renderPage()
    await screen.findByText(/sessions? planned/)
    const sessionsButton = screen.getAllByRole('button', { name: /session,? planned from/i })[0]
    fireEvent.click(sessionsButton)
    const input = screen.getAllByLabelText('How many sessions')[0]
    fireEvent.change(input, { target: { value: '3' } })
    fireEvent.blur(input)
    await screen.findByText(/means signing in/)
    expect(document.body.textContent).toMatch(/3 sessions means signing in/)
  })
})

describe('changing how many sessions a check-in runs (fault 2, live walk, 6 October 2026)', () => {
  /*
   * ONCE OPENED, THE ONLY CONTROL FOR HOW MANY SESSIONS A CHECK-IN RUNS WAS A BARE "sessions:" -
   * no sentence, nothing said about what the number was for. A plain label, found by a screen
   * reader the same way every other field on this page already is, and one sentence of help.
   */
  it('opens with a plain label and a sentence of help, not a bare "sessions:"', async () => {
    authedUser = { id: 'u1', email: 'rukia@example.test' }
    localStorage.setItem('gw_entry_session', JSON.stringify({
      scenario: 'PIP', closed: false, flowPath: 'self', onboardingStep: 7,
      history: [{ role: 'assistant', content: 'How is it going?' }],
      sessions: 1, cadence: 'WEEKLY', cadenceChosen: true, plannedFrom: { timelineDays: 42, cadence: 'WEEKLY' },
      onboardingSelections: { mode: 'new', initial: 'x', classifiedScenario: 'PIP' },
    }))
    renderPage()
    await screen.findByText(/sessions? planned/)
    const sessionsButton = screen.getAllByRole('button', { name: /session,? planned from/i })[0]
    fireEvent.click(sessionsButton)
    expect(screen.getAllByLabelText('How many sessions')[0]).toBeTruthy()
    expect(screen.getAllByText('How many sessions').length).toBeGreaterThan(0)
    expect(screen.getAllByText('This is your plan for how many check-ins to run. You can change it at any time.').length).toBeGreaterThan(0)
    expect(document.body.textContent).not.toContain('sessions:')
  })
})

/*
 * FAULT 9 (live review): SOMEBODY ADDED FROM A NAMED "PEOPLE MENTIONED" ROW GOT NO NAME FIELD.
 * Her row then read "wanjiru@suites.test is waiting for a seat on your plan.", with no name
 * anywhere, though the report had just named her two lines above the "Add them" button. The name
 * on that row (`p.name`) is now carried into `displayNames` when the address is typed
 * (`queueSuggestedContributor`, EntryChatPage.tsx), the same map `asSomeoneToInvite` already reads
 * to send `displayName` to the server - proven here by the patch this page sends the draft with.
 */
describe('a mentioned person keeps her name when added by typed address (fault 9, live review)', () => {
  it('sends the address with the mentioned name as displayName, not the address alone', async () => {
    authedUser = null
    const { entryApi } = await import('@/api/entry')
    const { authApi } = await import('@/api/auth')
    vi.mocked(authApi.entrySave).mockResolvedValue({ draftToken: 'd-token-mentioned' } as any)
    seedClosedSession({
      report: JSON.stringify({
        alignmentStatus: 'Clear', whatGroundworkSaw: 'x', alignmentBasis: '',
        areasRequiringAlignment: [], alignmentReached: [], honestClose: { aligned: '', open: '', revisit: '', risk: '' },
        mentionedPeople: [{ name: 'Wanjiru Kamau', context: 'Owns onboarding.' }], suggestedParties: [],
      }),
    })
    renderPage()
    fireEvent.click(await screen.findByText(/Invite and finish/))
    const emailInput = screen.getByPlaceholderText('your@email.com')
    fireEvent.change(emailInput, { target: { value: 'lead@example.test' } })
    fireEvent.submit(emailInput.closest('form')!)
    await waitFor(() => expect(authApi.entrySave).toHaveBeenCalled())

    fireEvent.click(await screen.findByText('Add them'))
    const addressField = screen.getByPlaceholderText('their@email.com')
    fireEvent.change(addressField, { target: { value: 'wanjiru@suites.test' } })
    const addRow = addressField.closest('.gwui-ec-savecard-add-row') as HTMLElement
    fireEvent.click(within(addRow).getByRole('button', { name: 'Add' }))

    await waitFor(() => {
      const calls = vi.mocked(entryApi.patchDraft).mock.calls
      const contributors = calls[calls.length - 1]?.[1]?.contributors
      expect(contributors).toContainEqual(
        expect.objectContaining({ email: 'wanjiru@suites.test', displayName: 'Wanjiru Kamau' }),
      )
    }, { timeout: 2000 })
  })
})

describe('the new-scenario-conflict dialog', () => {
  it('asks before clearing a check-in already in progress, and carrying on sends nothing', async () => {
    seedClosedSession()
    const { entryApi } = await import('@/api/entry')
    const { container } = renderPage('/start?new=1')
    expect(await screen.findByText('You have a check-in in progress')).toBeTruthy()
    expect(screen.getByText(/Starting a new one clears the one you were setting up/)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Carry on with this one' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Start a new one' })).toBeTruthy()
    expectAtMostOnePrimaryButton(container)
    expect(entryApi.chat).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Carry on with this one' }))
    await waitFor(() => expect(screen.queryByText('You have a check-in in progress')).toBeNull())
    expect(entryApi.chat).not.toHaveBeenCalled()
  })
})
