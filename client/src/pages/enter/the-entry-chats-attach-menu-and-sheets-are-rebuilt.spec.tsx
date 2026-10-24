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
 * GROUP 3, PIECE 4D-2 (B1-starting-a-check-in): the attach menu (the quick-action chip row and its
 * "Attach a document" chip, the natural-close prompt above it, and the attached-doc pill) and the
 * two sheets that sit on top of the check-in phase (the doc-context dialog that asks what a just
 * attached document supports, and the end-session confirmation). Both are now the shared `Modal`
 * part rather than one centred box and one sliding up from the bottom at a different z-index - the
 * prototype draws no bottom sheet of its own, and two overlays on one screen at two different
 * heights was the exact bug `Save card.`'s own comment a few lines below this range describes, so a
 * second one-off shape was not worth inventing here.
 *
 * Checked the same way as 4d-1: the guard's own functions, run against only the two source ranges
 * this part rebuilt (the natural-close prompt and the attach row through the start of the doc-context
 * modal, and the end-session confirmation modal at the end of the file), not the whole 4,350 lines -
 * the check-in composer and bubbles further down, the save card, and FillsInAsYouTalk are still old
 * markup, owned by 4d-3/4d-4.
 *
 * Viewing never sends anything: `entryApi.chat`/`onboard` stay mocked and unused throughout.
 */

const FULL_SOURCE = readFileSync(join(__dirname, 'EntryChatPage.tsx'), 'utf8')

/* Stops before "Input bar / save CTA" on purpose: the check-in composer and the closed-session
   invite bar were still old markup there at the time this part was written, owned by 4d-4 ("the
   check-in phase's own composer") rather than this one - since rebuilt, and covered by
   the-entry-chats-everything-else-is-rebuilt.spec.tsx's own range instead. This range stays as it
   was scoped, so a later edit above it cannot silently widen what this file checks. */
const QUICK_ACTIONS_START = FULL_SOURCE.indexOf('{/* Natural close prompt */}')
const QUICK_ACTIONS_END = FULL_SOURCE.indexOf('{/* Input bar / save CTA */}')
if (QUICK_ACTIONS_START === -1 || QUICK_ACTIONS_END === -1 || QUICK_ACTIONS_END <= QUICK_ACTIONS_START) {
  throw new Error('the 4d-2 source range markers moved - update this spec to find the new ones')
}
const QUICK_ACTIONS_RANGE = stripComments(FULL_SOURCE.slice(QUICK_ACTIONS_START, QUICK_ACTIONS_END))

const DOC_CONTEXT_START = FULL_SOURCE.indexOf('{/* Doc context overlay */}')
const DOC_CONTEXT_END = FULL_SOURCE.indexOf('* Save card.')
if (DOC_CONTEXT_START === -1 || DOC_CONTEXT_END === -1 || DOC_CONTEXT_END <= DOC_CONTEXT_START) {
  throw new Error('the 4d-2 doc-context source range markers moved - update this spec to find the new ones')
}
const DOC_CONTEXT_RANGE = stripComments(FULL_SOURCE.slice(DOC_CONTEXT_START, DOC_CONTEXT_END))

const END_CONFIRM_START = FULL_SOURCE.indexOf('{/* End session confirmation modal */}')
if (END_CONFIRM_START === -1) {
  throw new Error('the 4d-2 end-session marker moved - update this spec to find the new one')
}
const END_CONFIRM_RANGE = stripComments(FULL_SOURCE.slice(END_CONFIRM_START))

describe('4d-2: the source this piece rebuilt carries no old class or banned inline style', () => {
  it('the attach row uses none of the old classes or inline styles', () => {
    expect(oldClassesUsed(QUICK_ACTIONS_RANGE)).toEqual([])
    expect(bannedInlineStyleProps(QUICK_ACTIONS_RANGE)).toEqual([])
    expect(bannedStyleReferenceProps(QUICK_ACTIONS_RANGE)).toEqual([])
    expect(tooSmallFontSizes(QUICK_ACTIONS_RANGE)).toEqual([])
  })
  it('the doc-context dialog uses none of the old classes or inline styles', () => {
    expect(oldClassesUsed(DOC_CONTEXT_RANGE)).toEqual([])
    expect(bannedInlineStyleProps(DOC_CONTEXT_RANGE)).toEqual([])
    expect(bannedStyleReferenceProps(DOC_CONTEXT_RANGE)).toEqual([])
    expect(tooSmallFontSizes(DOC_CONTEXT_RANGE)).toEqual([])
  })
  it('the end-session confirmation uses none of the old classes or inline styles', () => {
    expect(oldClassesUsed(END_CONFIRM_RANGE)).toEqual([])
    expect(bannedInlineStyleProps(END_CONFIRM_RANGE)).toEqual([])
    expect(bannedStyleReferenceProps(END_CONFIRM_RANGE)).toEqual([])
    expect(tooSmallFontSizes(END_CONFIRM_RANGE)).toEqual([])
  })
})

vi.mock('@/api/entry', () => ({
  entryApi: {
    opener: vi.fn().mockResolvedValue({ reply: '' }),
    chat: vi.fn(),
    report: vi.fn(),
    onboard: vi.fn(),
    classifyIntent: vi.fn(),
  },
}))
vi.mock('@/api/auth', () => ({ authApi: { entrySave: vi.fn(), colleagues: vi.fn().mockResolvedValue([]) } }))
vi.mock('@/api/billing', () => ({ billingApi: { checkCanCreateGround: vi.fn().mockResolvedValue({ allowed: true }) } }))
/* Mutable so screen fault 10's signed-in-lead test can flip it, without disturbing every other
   test in this file, which reads an anonymous visitor exactly as before. */
let authedUser: { id: string; email: string } | null = null
vi.mock('@/stores/auth', () => ({ useAuthStore: (sel: any) => sel({ user: authedUser, isAuthenticated: !!authedUser }) }))

function expectAtMostOnePrimaryButton(container: HTMLElement) {
  /* Excludes the save card's own primary button while the card is CSS-hidden (visibility:
     hidden, which also takes it out of the tab order and the accessibility tree) - see
     the-entry-chats-own-test-helpers.ts for why a literal DOM count cannot see that on its own. */
  const primaries = visiblePrimaryButtons(container)
  expect(primaries.length, `expected at most one primary (navy) button, found ${primaries.length}`).toBeLessThanOrEqual(1)
}

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/start']}>
        <EntryChatPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

/** Seeds a check-in session already under way (phase 'checkin'), the way a reload restores one -
    never by typing, sending, attaching or saving through the UI. */
function seedCheckInSession(extra: Record<string, unknown> = {}) {
  localStorage.setItem('gw_entry_session', JSON.stringify({
    scenario: 'performance',
    closed: false,
    history: [
      { role: 'assistant', content: 'Have you told Daniel about this worry yet?' },
      { role: 'user', content: 'Once, in July. Not formally.' },
    ],
    onboardingStep: 7,
    onboardingSelections: { mode: 'new', initial: 'A team member is not delivering.' },
    onboardingHistory: [
      { role: 'assistant', content: 'What brings you here?' },
      { role: 'user', content: 'A team member is not delivering.' },
    ],
    groundName: 'Daniel, the next six weeks',
    ...extra,
  }))
}

beforeEach(() => { localStorage.clear(); authedUser = null })

describe('the quick-action chip row, once a check-in is under way', () => {
  it('shows the chips and the attach chip, with one navy button at most', async () => {
    seedCheckInSession()
    const { container } = renderPage()
    await waitFor(() => expect(screen.getAllByText('Once, in July. Not formally.').length).toBeGreaterThan(0))
    expect(screen.getByText('Attach a document')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Patterns' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'End session' })).toBeTruthy()
    expectAtMostOnePrimaryButton(container)
  })

  it('opening the end-session confirmation sends nothing and offers one way out, not two heights of overlay', async () => {
    const { entryApi } = await import('@/api/entry')
    seedCheckInSession()
    const { container } = renderPage()
    await waitFor(() => expect(screen.getAllByText('Once, in July. Not formally.').length).toBeGreaterThan(0))
    fireEvent.click(screen.getByRole('button', { name: 'End session' }))
    expect(await screen.findByRole('dialog', { name: 'End this session?' })).toBeTruthy()
    expect(screen.getByText(/Ending this session generates your report/)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Keep going' })).toBeTruthy()
    /* The confirmation's own "End session" is the one inside the dialog now, a solid red danger
       button, not a second navy primary alongside the chip row's. */
    const dialog = screen.getByRole('dialog', { name: 'End this session?' })
    expect(dialog.querySelector('.btn.danger')).toBeTruthy()
    expectAtMostOnePrimaryButton(container)
    expect(entryApi.chat).not.toHaveBeenCalled()
    expect(entryApi.report).not.toHaveBeenCalled()

    /* Keep going closes it without ending anything. */
    fireEvent.click(screen.getByRole('button', { name: 'Keep going' }))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'End this session?' })).toBeNull())
    expect(entryApi.report).not.toHaveBeenCalled()
  })

  /*
   * SCREEN FAULT 10 (FINAL WALK): "YOUR ANSWERS ARE SAVED ON THIS DEVICE" TOLD A SIGNED-IN LEAD
   * SOMETHING FALSE. That sentence is true of the anonymous draft kept in this browser before
   * anybody has an account; once signed in, the answers are saved against the account, not the
   * device.
   */
  it('tells an anonymous visitor their answers are saved on this device', async () => {
    seedCheckInSession()
    renderPage()
    await waitFor(() => expect(screen.getAllByText('Once, in July. Not formally.').length).toBeGreaterThan(0))
    fireEvent.click(screen.getByRole('button', { name: 'End session' }))
    expect(await screen.findByText(/Your answers are saved on this device\./)).toBeTruthy()
  })

  it('never tells a signed-in lead their answers are saved on this device', async () => {
    authedUser = { id: 'u1', email: 'rukia@example.test' }
    seedCheckInSession()
    renderPage()
    await waitFor(() => expect(screen.getAllByText('Once, in July. Not formally.').length).toBeGreaterThan(0))
    fireEvent.click(screen.getByRole('button', { name: 'End session' }))
    expect(await screen.findByRole('dialog', { name: 'End this session?' })).toBeTruthy()
    expect(screen.queryByText(/saved on this device/)).toBeNull()
    expect(screen.getByText(/Ending this session generates your report/)).toBeTruthy()
  })
})

describe('the doc-context dialog, once a document is chosen', () => {
  /** Chooses a local file the same way the hidden file input does (FileReader only, never a
      network call) - the same kind of UI-only interaction 4d-1's own test uses to open the
      document panel, not an upload or a send. */
  it('asks what the document supports, and sends nothing to the engine by itself', async () => {
    const { entryApi } = await import('@/api/entry')
    seedCheckInSession()
    const { container } = renderPage()
    await waitFor(() => expect(screen.getAllByText('Once, in July. Not formally.').length).toBeGreaterThan(0))
    const file = new File(['the brief'], 'brief.txt', { type: 'text/plain' })
    const input = document.getElementById('entry-doc-upload-chip') as HTMLInputElement
    fireEvent.change(input, { target: { files: [file] } })

    expect(await screen.findByRole('dialog', { name: '📎 brief.txt' })).toBeTruthy()
    expect(screen.getByText(/What context does this document support/)).toBeTruthy()
    expect(screen.getByPlaceholderText(/the brief I referenced/)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Add to session' })).toBeTruthy()
    expectAtMostOnePrimaryButton(container)
    expect(entryApi.chat).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '📎 brief.txt' })).toBeNull())
  })
})
