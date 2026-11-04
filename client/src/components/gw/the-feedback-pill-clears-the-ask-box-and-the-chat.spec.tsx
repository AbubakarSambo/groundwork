import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppShell } from './AppShell'
import { useAuthStore } from '@/stores/auth'
import { useEntryFillsInPanelStore } from '@/stores/entry-fills-in-panel'

/**
 * RELEASE WALKTHROUGH, 5 OCTOBER: THE FLOATING FEEDBACK PILL COVERED THE ASK BOX'S SEND BUTTON ON
 * THE BOARD AT 1440, AND THE CHAT'S SUGGESTION CHIPS AT 375.
 *
 * The board's own "Ask about this board" bar (`AskTheBoard`, BoardPage.tsx) and the ground page's
 * default check-in tab (the same suggestion-chip conversation `/chat/:id` and `/checkin/:id`
 * already get a different rest position for) both sit at the trigger's own default bottom-right
 * corner. See AppShell.tsx's `FeedbackWidget` for the fix: `isGroundsBoard` raises the resting
 * `bottom` offset on `/grounds/:id/board`, and `onGroundCheckInTab` folds the ground page's bare
 * `/grounds/:id` (no `tab=`, or `tab=chat`) into the same top-of-page treatment `/chat/:id` and
 * `/start` already have.
 */
const USER = { id: 'u1', email: 'aisha@x.test', firstName: 'Aisha', role: 'MEMBER', organizationName: 'Mawe' }

function mount(path: string) {
  useAuthStore.setState({ user: USER, token: 't', isAuthenticated: true } as any)
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } })
  /* B-202 (review round 3): AppShell now waits for the same ['my-waiting'] read RequireOrgSetup
  already makes before it mounts the sidebar at all - without this cached answer the real
  authApi.myWaiting (not mocked in this file) would be asked for real. */
  qc.setQueryData(['my-waiting'], { waiting: false })
  qc.setQueryData(['grounds'], [])
  qc.setQueryData(['my-organizations'], [])
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}><AppShell><div>page content</div></AppShell></MemoryRouter>
    </QueryClientProvider>,
  )
}

function trigger(container: HTMLElement) {
  return container.querySelector('.gw-feedback-btn') as HTMLElement | null
}

/* UPDATED 24 October (Hafsah: fewer buttons): the prototype has no floating Feedback pill, so it is drawn nowhere and can
   never cover the Ask box or the chat. Its old rest positions are now checks that it is not drawn. "Send feedback" on the
   person's own menu opens the same panel (the-feedback-panel-is-reachable-by-keyboard.spec.tsx). */
describe('the feedback pill clears the ask box and the chat', () => {
  /*
   * B-217 (said why in the commit): "raised a fixed amount" was itself the bug - `AskTheBoard`'s
   * bar is the last thing on the board, wherever that lands, so any one fixed `bottom` offset only
   * ever clears the board height it was measured against. Measured live at 1440px: the old `bottom:
   * 84px` still overlapped by 8px on a board short enough to put that row near the fold. Hidden
   * outright now, same as the other moving-target pages below - "Send feedback" on the person's own
   * menu still reaches the same panel.
   */
  it('is hidden on the board, clear of "Ask" however long the board is', () => {
    expect(trigger(mount('/grounds/g1/board').container)).toBeNull()
  })

  /* Browser test, 20 October: at 1280 by 900 it sat on "Add people" as People and setup opened. */
  it('is hidden on a check-in\'s People and setup, clear of "Add people" and the controls down its right edge', () => {
    expect(trigger(mount('/grounds/g1?tab=settings').container)).toBeNull()
  })

  it('is not drawn here either: the prototype has no floating Feedback pill (/grounds)', () => {
    expect(trigger(mount('/grounds').container)).toBeNull()
  })

  /*
   * B-218 (said why in the commit): `12px` sat on top of the lead's own "Your check-in" header
   * button - a real control this route carries that `/chat/:id` and `/checkin/:id` do not, so it
   * needs its own, taller clearance rather than the plain chat-page value.
   */
  it('is not drawn here either: the prototype has no floating Feedback pill (/grounds/g1)', () => {
    expect(trigger(mount('/grounds/g1').container)).toBeNull()
  })

  it('is not drawn here either: the prototype has no floating Feedback pill (/grounds/g1?tab=chat)', () => {
    expect(trigger(mount('/grounds/g1?tab=chat').container)).toBeNull()
  })

  it('is not drawn here either: the prototype has no floating Feedback pill (/grounds/g1?tab=context)', () => {
    expect(trigger(mount('/grounds/g1?tab=context').container)).toBeNull()
  })

  /*
   * FAULT 2, PHONE WALK (6 October 2026): "/start" RESTS LOWER THAN EVERY OTHER CHAT PAGE,
   * CLEAR OF ITS OWN SESSION HEADER.
   *
   * EntryChatPage.tsx's own header carries "N sessions planned" at its right edge, the one real
   * control a lead has for how many sessions the check-in runs - at the trigger's plain `top: 12`
   * rest position, a click meant for it landed on Feedback instead, and there was no other way to
   * open it. Lowered here, on this one page only: every other chat page keeps `top: 12`, since
   * none of them carries a control in that corner.
   */
  it('is not drawn here either: the prototype has no floating Feedback pill (/start)', () => {
    expect(trigger(mount('/start').container)).toBeNull()
  })

  /*
   * WALKTHROUGH PASS 2, ITEM 2: THREE MORE PLACES THE PILL SAT ON A CONTROL.
   *
   * "/chat" (Ask Groundwork's own page) sat on the composer's Send arrow, the same problem
   * "/checkin/" already had. "/settings/suites" sat on the Equipment card's own switch, and
   * "/org/members" sat on a row's "Open" link - both controls that can be anywhere down a long
   * page, so hidden outright rather than chasing a moving target, same as "/more".
   */
  it('is hidden on /chat, same as /checkin/', () => {
    expect(trigger(mount('/chat').container)).toBeNull()
  })

  it('is hidden on Suites, clear of the Equipment switch', () => {
    expect(trigger(mount('/settings/suites').container)).toBeNull()
  })

  it('is hidden on People, clear of the "Open" links', () => {
    expect(trigger(mount('/org/members').container)).toBeNull()
  })

  /*
   * B-218 (REVIEW 4): A RAISED `bottom: 64px` ONLY EVER CLEARED "Download it". Review 4 found it
   * still covering the email notifications row on arrival at 1440, and "Download it", "Leave" and
   * "Sign out" at other scroll positions - the same "a fixed offset only clears the one control it
   * was measured against" problem Suites and People were already hidden outright for. /settings is
   * now hidden the same way, not repositioned; this test used to check the old `bottom: 64px`
   * reposition, which is exactly the defective behaviour that let those other controls stay
   * covered, so it now checks the page is hidden instead.
   */
  it('is hidden on /settings, clear of every control a scroll position can put under it', () => {
    expect(trigger(mount('/settings').container)).toBeNull()
  })

  /*
   * B-218: "0 OF N SET" IS A FULL-HEIGHT COLUMN. `FillsInAsYouTalk`'s own side panel runs the whole
   * height of the page once a situation is picked - there is no corner left clear of it, so the
   * trigger is hidden outright while `EntryChatPage` says the panel is up
   * (`useEntryFillsInPanelStore`), the same way `/more` and the other moving-target pages above are.
   * Before a situation is picked (the store starts `false`), /start keeps its own `top: 64px`.
   */
  it('is hidden on /start while the "Fills in as you talk" panel is up', () => {
    useEntryFillsInPanelStore.setState({ showing: true })
    expect(trigger(mount('/start').container)).toBeNull()
    useEntryFillsInPanelStore.setState({ showing: false })
  })
})
