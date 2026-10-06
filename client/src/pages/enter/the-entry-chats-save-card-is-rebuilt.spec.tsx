import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
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
