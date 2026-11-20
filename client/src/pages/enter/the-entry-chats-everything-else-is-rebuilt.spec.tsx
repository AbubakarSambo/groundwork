import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { EntryChatPage } from './EntryChatPage'
import { visiblePrimaryButtons } from './the-entry-chats-own-test-helpers'
import {
  stripComments, oldClassesUsed, bannedInlineStyleProps, bannedStyleReferenceProps, tooSmallFontSizes,
} from '@/components/gw/ui/the-rebuilt-pages-use-only-the-new-parts.spec'

/**
 * GROUP 3, PIECE 4D-4 (B1-starting-a-check-in): everything 4d-1/4d-2/4d-3 left - the "fills in as
 * you talk" side panel's own wrapper, the check-in phase's own composer and bubbles (the
 * not-signed-up notice, the "setup is done" seam, the three private-record notes, every bubble,
 * including the typing dots and the streaming caret), the closed-session invite bar, and the
 * lead's first-check-in briefing (showAdminBriefing - see that screen's own comment in
 * EntryChatPage.tsx for why it is seemingly unreachable today). `EntryChatPage.tsx` joins
 * REBUILT_PAGES as of this part, with a `PRIMARY-BUTTONS-NEVER-TOGETHER` marker explaining its six
 * `kind="primary"` Buttons, none of which ever renders beside another - see that comment, just
 * above the component itself, for which is which and why.
 *
 * FillsInAsYouTalk.tsx is its own file, checked here directly (not one level deep through
 * EntryChatPage.tsx's own imports, since it is a relative `./FillsInAsYouTalk` import, not
 * `@/components/gw/...` - the guard's own one-level check only follows the latter).
 *
 * Checked the same way as every other part of this piece: the guard's own functions, against the
 * exact source ranges this part rebuilt, then a render with mocked data for each reachable state -
 * never typing into the chat, sending, or calling a real API.
 */

const FULL_SOURCE = readFileSync(join(__dirname, 'EntryChatPage.tsx'), 'utf8')
const FILLS_IN_SOURCE = readFileSync(join(__dirname, 'FillsInAsYouTalk.tsx'), 'utf8')

/* The lead's "You're up first" briefing (showAdminBriefing) was deleted on 15 November 2026: nothing ever showed it (audit of the check-in pages, row 27). */

const CHECKIN_START = FULL_SOURCE.indexOf('{/* U.6: the panel that fills in as you talk')
const CHECKIN_END = FULL_SOURCE.indexOf('{/* Doc context overlay */}')
if (CHECKIN_START === -1 || CHECKIN_END === -1 || CHECKIN_END <= CHECKIN_START) {
  throw new Error('the 4d-4 check-in source range markers moved - update this spec to find the new ones')
}
const CHECKIN_RANGE = stripComments(FULL_SOURCE.slice(CHECKIN_START, CHECKIN_END))

const FILLS_IN_STRIPPED = stripComments(FILLS_IN_SOURCE)

describe('4d-4: the source this piece rebuilt carries no old class or banned inline style', () => {
  it('the fills-in panel wrapper, the check-in messages, bubbles, and invite bar use none of the old classes or inline styles', () => {
    expect(oldClassesUsed(CHECKIN_RANGE)).toEqual([])
    expect(bannedInlineStyleProps(CHECKIN_RANGE)).toEqual([])
    expect(bannedStyleReferenceProps(CHECKIN_RANGE)).toEqual([])
    expect(tooSmallFontSizes(CHECKIN_RANGE)).toEqual([])
  })
  it('FillsInAsYouTalk.tsx itself uses none of the old classes or inline styles', () => {
    expect(oldClassesUsed(FILLS_IN_STRIPPED)).toEqual([])
    expect(bannedInlineStyleProps(FILLS_IN_STRIPPED)).toEqual([])
    expect(bannedStyleReferenceProps(FILLS_IN_STRIPPED)).toEqual([])
    expect(tooSmallFontSizes(FILLS_IN_STRIPPED)).toEqual([])
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

/** A check-in already under way (phase 'checkin', the engine has spoken), the way a reload
    restores one - never by typing or sending through the UI. */
function seedCheckInSession() {
  localStorage.setItem('gw_entry_session', JSON.stringify({
    scenario: 'performance',
    closed: false,
    history: [
      { role: 'assistant', content: 'Have you told Daniel about this worry yet?' },
      { role: 'user', content: 'Once, in July. Not formally.' },
    ],
    onboardingStep: 7,
    onboardingSelections: { mode: 'new', initial: 'A team member is not delivering.' },
    groundName: 'Daniel, the next six weeks',
  }))
}

beforeEach(() => { localStorage.clear() })

describe('the fills-in-as-you-talk panel, once the door has given way to a conversation', () => {
  it('shows what the setup knows so far, beside the onboarding conversation, sending nothing', async () => {
    const { entryApi } = await import('@/api/entry')
    localStorage.setItem('gw_entry_session', JSON.stringify({
      history: [],
      closed: false,
      onboardingStep: 1,
      onboardingSelections: { mode: 'new', initial: 'A team member is not delivering.' },
      onboardingHistory: [
        { role: 'assistant', content: 'What brings you here?' },
        { role: 'user', content: 'A team member is not delivering.' },
        { role: 'assistant', content: 'Who is it, and what were they meant to be delivering?' },
      ],
    }))
    renderPage()
    await waitFor(() => expect(screen.getByText('Who is it, and what were they meant to be delivering?')).toBeTruthy())
    /* Changed in F5: the panel no longer says "Fills in as you talk"; it is found by what it is. */
    expect(screen.getByRole('complementary', { name: 'What is set so far' })).toBeTruthy()
    /* Changed 3 November evening: no count of what is set. */
    expect(screen.queryByText(/of 4 set/)).toBeNull()
    expect(entryApi.chat).not.toHaveBeenCalled()
    expect(entryApi.onboard).not.toHaveBeenCalled()
  })
})

describe('the check-in phase, once the engine has spoken', () => {
  it('shows the not-signed-up notice, the conversation as bubbles, and one composer, with one navy button at most', async () => {
    seedCheckInSession()
    const { container } = renderPage()
    await waitFor(() => expect(screen.getAllByText('Once, in July. Not formally.').length).toBeGreaterThan(0))
    expect(screen.getByText('Have you told Daniel about this worry yet?')).toBeTruthy()
    expect(screen.getByText(/You are not signed up yet/)).toBeTruthy()
    /* The fills-in panel only shows during setup (new.txt, beside the onboarding conversation) -
       phase 'checkin' means setup is done, so it is gone here, the same as the prototype's own
       start-chat.txt, which carries no such panel either. */
    expect(screen.queryByRole('complementary', { name: 'What is set so far' })).toBeNull()
    /* The composer: a real textbox, placeholder "Type your answer", arrow-send (B3's own shape,
       not B1's "Send"). */
    expect(screen.getByPlaceholderText('Type your answer')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Send message' })).toBeTruthy()
    expectAtMostOnePrimaryButton(container)
  })

  it('never calls the engine just by rendering this state', async () => {
    const { entryApi } = await import('@/api/entry')
    seedCheckInSession()
    renderPage()
    await waitFor(() => expect(screen.getAllByText('Once, in July. Not formally.').length).toBeGreaterThan(0))
    expect(entryApi.chat).not.toHaveBeenCalled()
    expect(entryApi.onboard).not.toHaveBeenCalled()
  })

  it('once closed, shows the invite bar instead of the composer, with its own one navy button', async () => {
    localStorage.setItem('gw_entry_session', JSON.stringify({
      scenario: 'performance',
      closed: true,
      onboardingStep: 7,
      history: [
        { role: 'assistant', content: 'Have you told Daniel about this worry yet?' },
        { role: 'user', content: 'Once, in July. Not formally.' },
      ],
      onboardingSelections: { mode: 'new', initial: 'A team member is not delivering.' },
      groundName: 'Daniel, the next six weeks',
    }))
    const { container } = renderPage()
    await waitFor(() => expect(screen.getByText('What you said is on record.')).toBeTruthy())
    /* FAULT 10 (live review): "releases when all parties are in" was the product's own jargon for
       itself. Said plainly now: everyone gets the shared report once everyone has checked in. */
    expect(screen.getByText('Invite others to check in. Everyone gets the shared report once all of you have checked in.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Invite and finish' })).toBeTruthy()
    expect(screen.queryByPlaceholderText('Type your answer')).toBeNull()
    expectAtMostOnePrimaryButton(container)
  })
})
