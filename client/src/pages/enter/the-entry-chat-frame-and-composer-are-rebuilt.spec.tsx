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
 * GROUP 3, PIECE 4D-1 (B1-starting-a-check-in): the entry chat's page frame, header, message list
 * and composer, rebuilt from `components/gw/ui`. `EntryChatPage.tsx` only joins `REBUILT_PAGES`
 * (and the guard that checks it) once the last part of piece 4d is done, so this file does for the
 * part of the source this piece touched what that guard would otherwise do for the whole file: the
 * same checks (`oldClassesUsed`, `bannedInlineStyleProps`, `tooSmallFontSizes` - imported from the
 * guard itself, not copied, so the two can never drift apart), run on the real source text, plus a
 * render with mocked data to check the rendered words and the one-navy-button rule.
 *
 * Checked against the WHOLE FILE, not only the lines this part touched: the later phase (the
 * check-in's own composer, the attach menu, the save card) is still old markup, owned by the parts
 * still to come (4d-2/3/4), so the old-class and inline-style checks below are scoped to the
 * ranges 4d-1 rebuilt (the top-level frame through the end of the onboarding phase) rather than the
 * full 4,500 lines, which would fail on code nobody has touched yet.
 *
 * Viewing never sends anything: no test here presses Send, picks a situation, or does anything the
 * network calls in the code show would save or send a message - `entryApi.chat`/`onboard` are
 * mocked and asserted never called.
 */

const FULL_SOURCE = readFileSync(join(__dirname, 'EntryChatPage.tsx'), 'utf8')
/* The range this piece rebuilt: from the component's own `return (` to the start of the check-in
   phase's own comment marker, a few lines below the end of the onboarding phase block. Read by
   markers already in the file rather than by line number, so a later, unrelated edit above this
   range cannot silently narrow it. */
const RANGE_START = FULL_SOURCE.indexOf('  return (\n    /* The viewport less the nav strip')
/*
 * STOPS BEFORE "FILLS IN AS YOU TALK" ON PURPOSE. That side panel (FillsInAsYouTalk.tsx) is its own
 * file, still drawn here through an untouched wrapper `<div className="gw-fills-in" style={{...}}>`
 * - deliberately left for a later part of piece 4d (it is not the page frame, the header, the
 * message list or the composer), and noted as such in this part's report. Including it here would
 * fail this guard on code nobody has rebuilt yet.
 */
const RANGE_END = FULL_SOURCE.indexOf('{/* U.6: the panel that fills in as you talk')
if (RANGE_START === -1 || RANGE_END === -1 || RANGE_END <= RANGE_START) {
  throw new Error('the 4d-1 source range markers moved - update this spec to find the new ones')
}
const REBUILT_RANGE = stripComments(FULL_SOURCE.slice(RANGE_START, RANGE_END))

describe('4d-1: the source this piece rebuilt carries no old class or banned inline style', () => {
  it('uses none of the old classes', () => {
    expect(oldClassesUsed(REBUILT_RANGE)).toEqual([])
  })
  it('sets no inline font-size, colour, margin, padding or gap', () => {
    expect(bannedInlineStyleProps(REBUILT_RANGE)).toEqual([])
    expect(bannedStyleReferenceProps(REBUILT_RANGE)).toEqual([])
  })
  it('sets no text smaller than 13 pixels', () => {
    expect(tooSmallFontSizes(REBUILT_RANGE)).toEqual([])
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
vi.mock('@/api/auth', () => ({ authApi: { entrySave: vi.fn() } }))
vi.mock('@/api/billing', () => ({ billingApi: { checkCanCreateGround: vi.fn().mockResolvedValue({ allowed: true }) } }))
vi.mock('@/stores/auth', () => ({ useAuthStore: (sel: any) => sel({ user: null, isAuthenticated: false }) }))

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

beforeEach(() => { localStorage.clear() })

describe('the chat as it first opens (signed out, atTheDoor)', () => {
  it('shows the door, not the header or composer, with one primary button at most', async () => {
    const { container } = renderPage()
    /* start.txt's own heading - the engine supplies none of this screen's words yet, since
       nothing has been said. */
    await waitFor(() => expect(screen.getByRole('heading', { name: 'What do you need updates on, or want to track?' })).toBeTruthy())
    expect(screen.getByRole('button', { name: 'See every situation' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Continue' })).toBeTruthy()
    expectAtMostOnePrimaryButton(container)
  })

  /**
   * FAULT 5 (live walk, 6 October 2026): THE SIGNED-OUT HEADER'S OWN SIDE GUTTER, AT 375.
   *
   * The mark and "Sign in" sat flush to the screen edges while the body text below (inside
   * `.gwui-ec-messages`, padded 20px either side) did not. jsdom lays nothing out, so this checks
   * the two things that produce the gutter: the row is a direct child of `.gwui-ec-frame`, and
   * gw-ui.css gives exactly that pairing the body's own 20px either side.
   */
  it('gives the mark and "Sign in" the same side gutter the body already has', async () => {
    const { container } = renderPage()
    await waitFor(() => expect(screen.getByText('Sign in')).toBeTruthy())
    const markRow = container.querySelector('.gwui-ec-frame > .gwui-mark-row')
    expect(markRow).toBeTruthy()
    const css = readFileSync(join(__dirname, '..', '..', 'components', 'gw', 'ui', 'gw-ui.css'), 'utf8')
    expect(css).toMatch(/\.gwui-ec-frame > \.gwui-mark-row \{ padding-left: 16px; padding-right: 16px; \}/)
    expect(css).toMatch(/\.gwui-ec-messages \{\s*flex: 1; overflow-y: auto; padding: 16px 16px;/)
  })
})

describe('the chat once a conversation exists (the engine has spoken)', () => {
  /** Seeds a conversation already under way, the way a reload restores one - never by typing or
      sending through the UI. */
  function seedConversation() {
    localStorage.setItem('gw_entry_session', JSON.stringify({
      scenario: '',
      history: [],
      closed: false,
      onboardingStep: 1,
      onboardingSelections: { mode: 'new', initial: 'We are starting a new project' },
      onboardingHistory: [
        { role: 'assistant', content: 'What brings you here?' },
        { role: 'user', content: 'We are starting a new project with four people.' },
        { role: 'assistant', content: 'Got it. Who is on the team with you?' },
      ],
    }))
  }

  it('shows the header and bar, message bubbles and composer, with one primary button at most', async () => {
    seedConversation()
    const { container } = renderPage()
    /* The engine's own words, carried over from the restored session - not rewritten here. */
    await waitFor(() => expect(screen.getByText('Got it. Who is on the team with you?')).toBeTruthy())
    expect(screen.getByText('We are starting a new project with four people.')).toBeTruthy()
    /* The screen's own words: the page title. The phase-step bar (PhaseSteps) is only shown once
       the onboarding phase has given way to the check-in phase itself - `!atTheDoor && phase !==
       'onboarding'` - so it is not part of this seeded onboarding state; it is exercised directly
       by TypeScript (PhaseSteps.tsx) rather than forced here with a race this screen's own flow
       does not offer. */
    expect(screen.getByRole('heading', { name: 'Set up a check-in' })).toBeTruthy()
    /* The composer: a real textbox and a "Send" button, B1's own shape (new.txt), not an arrow. */
    expect(screen.getByRole('textbox', { name: 'Your answer' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Send message' })).toBeTruthy()
    expectAtMostOnePrimaryButton(container)
  })

  it('opens the document panel without sending or saving anything', async () => {
    seedConversation()
    const { container } = renderPage()
    await waitFor(() => expect(screen.getByText('Got it. Who is on the team with you?')).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: 'Add a document (paste or upload) instead of typing it out' }))
    expect(await screen.findByRole('textbox', { name: 'What is it?' })).toBeTruthy()
    expectAtMostOnePrimaryButton(container)
  })

  it('never calls the engine just by rendering this state', async () => {
    const { entryApi } = await import('@/api/entry')
    seedConversation()
    renderPage()
    await waitFor(() => expect(screen.getByText('Got it. Who is on the team with you?')).toBeTruthy())
    expect(entryApi.chat).not.toHaveBeenCalled()
    expect(entryApi.onboard).not.toHaveBeenCalled()
  })
})
