import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { EntryChatPage } from './EntryChatPage'
import { addThroughTheTeamBox, saveWithMyEmail } from './a-team-read-in-a-spec'
import { authApi } from '@/api/auth'
import { toast } from 'sonner'

/**
 * THE PEOPLE STEP, FOR AN ANCHOR DRAFT (plan piece 11; docs/anchor-scenario-plan.md section 5 row 4;
 * docs/answers-from-engine.md, "Request 147", `ThePeopleStepRules`).
 *
 * Only when the draft's scenario is `HELP_TEAM_UNDERSTAND` does the invite block draw the engine's
 * own heading, intro and button (`ANCHOR_PEOPLE_STEP_RULES`, `./TheSetup.tsx` - shape only, not
 * served yet, so these are the values from the engine's own answer, used verbatim), and enforce the
 * 19-person limit with the engine's own limit sentence. Every other situation keeps its ordinary
 * wording.
 *
 * UPDATED FOR FAULT 3 (6 October 2026 live walk): the invite block used to draw only once the
 * email was sent, for every situation alike - so an anchor draft's own "Start my Groundwork." button
 * (the thing that is supposed to BE the people step's own button) sat on a screen with no people
 * step yet, and the people step only appeared after that button had already fired the email. The
 * plan's own order is "people before the email" for an anchor draft - every other situation is
 * unchanged, and still only shows the invite block once the email is sent. `openInviteBlock` below
 * no longer submits the email for an anchor draft: the block is already on screen from first paint.
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
/*
 * `sonner`'s `toast()` needs a mounted `<Toaster/>` (App.tsx's, not rendered by this test, which
 * renders only EntryChatPage); calling it unmounted was throwing inside the click handler and
 * silently unmounting the whole page back to its very first render, which looked exactly like a
 * reset to the onboarding door. Mocked, the same way other specs beside this one already do.
 */
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }))
/*
 * THE LIMIT, EXERCISED AT A SMALLER SIZE. Driving 19 real additions through the UI one at a time
 * (type, click Add, click Skip) is the same code path but far slower than the logic needs for a
 * test to prove it - so the limit test shrinks `mayAdd` to 2, keeping every real string (including
 * `limitSentence`) and every other export untouched.
 */
vi.mock('./TheSetup', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./TheSetup')>()
  return { ...actual, ANCHOR_PEOPLE_STEP_RULES: { ...actual.ANCHOR_PEOPLE_STEP_RULES, mayAdd: 2 } }
})

/**
 * `scenario` inside EntryChatPage.tsx is read straight off the URL's own `?scenario=` on every
 * render, which - combined with an already-restored session - reaches the page's own "new scenario
 * while a session exists" conflict branch (EntryChatPage.tsx's `entryRestoreBranch`), not the plain
 * restore this file means to test. So the anchor scenario is carried instead through
 * `onboardingSelections.classifiedScenario` (restored like the rest of `onboardingSelections`),
 * which `isAnchorDraft()` reads first and which is exactly how a real session that has already been
 * classified as the anchor scenario would carry it by the time the lead reaches the people step.
 */
function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/start']}><EntryChatPage /></MemoryRouter>
    </QueryClientProvider>,
  )
}

const closedSession = (anchor: boolean) => JSON.stringify({
  closed: true, onboardingStep: 7,
  history: [{ role: 'assistant', content: 'hi' }, { role: 'user', content: 'ship it' }],
  report: JSON.stringify({ alignmentStatus: 'Clear', whatGroundworkSaw: 'x', alignmentBasis: '', areasRequiringAlignment: [], alignmentReached: [], honestClose: { aligned: '', open: '', revisit: '', risk: '' }, mentionedPeople: [], suggestedParties: [] }),
  onboardingSelections: anchor
    ? { mode: 'new', initial: 'Help my team understand', classifiedScenario: 'HELP_TEAM_UNDERSTAND' }
    : { mode: 'new', initial: 'New project' },
})

/**
 * Renders, and - for every situation but the anchor one - submits the email, since the invite
 * block there only draws once emailSent is true. For an anchor draft (fault 3) the block is already
 * on screen the moment the page renders, so there is nothing to submit first.
 */
async function openInviteBlock(anchor: boolean) {
  localStorage.setItem('gw_entry_session', closedSession(anchor))
  renderPage()
  if (anchor) {
    fireEvent.click((await screen.findAllByRole('button', { name: /^Change/ }))[0]) /* 22 November 2026: the people step is on the setup page */
    await screen.findByText('Who needs to be part of this?')
    return
  }
  const emailInput = await screen.findByPlaceholderText('you@company.com')
  /* The save step asks "Your name" now (local test of staging, 15 October). */
  { const yourName = screen.queryByPlaceholderText('Your name'); if (yourName) fireEvent.change(yourName, { target: { value: 'Hafsah Jumare' } }) }
  fireEvent.change(emailInput, { target: { value: 'lead@example.test' } })
  fireEvent.submit(emailInput.closest('form')!)
  await waitFor(() => expect(authApi.entrySave).toHaveBeenCalled())
}

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
  ;(authApi.entrySave as any).mockResolvedValue({ draftToken: 'd-token' })
})

describe('the people step, for an anchor draft', () => {
  it('reads "Start my Groundwork." on the save button, before the email is even sent', async () => {
    localStorage.setItem('gw_entry_session', closedSession(true))
    renderPage()
    expect(await screen.findByText('Start my Groundwork.')).toBeTruthy()
    expect(screen.queryByText('Save my check-in')).toBeNull()
  })

  it('draws the engine’s own heading and intro, before the email is even sent', async () => {
    await openInviteBlock(true)
    expect(screen.getByText(/Add up to 20 people\. They don.t need to report directly to you/)).toBeTruthy()
    expect(screen.queryByText('Invite people')).toBeNull()
  })

  /**
   * ITEM 2: THE PEOPLE STEP'S RULES NOW TRAVEL FROM THE SERVED DRAFT, NOT A FIXED COPY
   * (docs/answers-from-engine.md, "Request 149 (2 of 6)"). `GET /entry/anchor-start` serves
   * `thePeopleStep`; `AnchorLandingPage.tsx` carries it to this page, which folds it into the
   * draft's own saved session (`thePeopleStep`) from then on. A served value with different words
   * from `ANCHOR_PEOPLE_STEP_RULES` is what this page draws - proof it is reading the carried value,
   * not the fixed fallback.
   */
  it('draws a served thePeopleStep from the draft’s own session, not the fixed fallback', async () => {
    const served = {
      limit: 20 as const, theLeadCounts: true as const, mayAdd: 19 as const,
      heading: 'Served: who needs to be part of this?',
      intro: 'Served: add up to 20 people from the engine itself.',
      contextLabel: 'Served: what do they do?',
      button: 'Served: start my Groundwork.',
      limitSentence: 'Served: this Groundwork holds 20 people.',
    }
    localStorage.setItem('gw_entry_session', JSON.stringify({
      closed: true, onboardingStep: 7,
      history: [{ role: 'assistant', content: 'hi' }, { role: 'user', content: 'ship it' }],
      report: JSON.stringify({ alignmentStatus: 'Clear', whatGroundworkSaw: 'x', alignmentBasis: '', areasRequiringAlignment: [], alignmentReached: [], honestClose: { aligned: '', open: '', revisit: '', risk: '' }, mentionedPeople: [], suggestedParties: [] }),
      onboardingSelections: { mode: 'new', initial: 'Help my team understand', classifiedScenario: 'HELP_TEAM_UNDERSTAND' },
      thePeopleStep: served,
    }))
    renderPage()
    /* Fault 3: before any email is sent. On the setup page, behind Change (22 November 2026). */
    fireEvent.click((await screen.findAllByRole('button', { name: /^Change/ }))[0])
    expect(await screen.findByText('Served: who needs to be part of this?')).toBeTruthy()
    expect(screen.getByText('Served: add up to 20 people from the engine itself.')).toBeTruthy()
    expect(screen.queryByText('Who needs to be part of this?')).toBeNull()
  })

  /* UPDATED (Hafsah, 31 October 2026): people are added through the one team box, in one press, with no per-person step. */
  /* UPDATED again (Hafsah's blocker, 31 October 2026): a third person stops the save with the engine's own sentence, and nobody is
     dropped: the save goes nowhere until the box holds no more than the room. */
  it('saves up to the shrunk mayAdd of 2, and stops a save of three with the engine’s own sentence', async () => {
    await openInviteBlock(true)
    await screen.findByLabelText('Your team, one per line')
    await addThroughTheTeamBox('person0@example.test\nperson1@example.test\nperson2@example.test')
    expect(screen.getByText('This one-month Groundwork holds up to 20 people besides you.')).toBeTruthy()
    saveWithMyEmail()
    await waitFor(() => expect(screen.getByText('This one-month Groundwork holds up to 20 people besides you.')).toBeTruthy())
    expect(authApi.entrySave).not.toHaveBeenCalled()
    /* Said on the page, where it stays, not in a passing toast. */
    expect(toast.error).not.toHaveBeenCalled()
    await addThroughTheTeamBox('person0@example.test\nperson1@example.test')
    saveWithMyEmail()
    await waitFor(() => expect(authApi.entrySave).toHaveBeenCalled())
    const [, body] = vi.mocked(authApi.entrySave).mock.calls[0] as any[]
    expect(body.payload.contributors.map((c: any) => c.email)).toEqual(['person0@example.test', 'person1@example.test'])
  })
})

describe('the limit is enforced at every place a contributor is actually added', () => {
  /*
   * Source check, the same pattern as EntryChatPage.suggestedPartiesActionable.spec.tsx: the live
   * tests above exercise the one-at-a-time "Add"/context flow; the colleague picker's multi-select
   * and the pasted-list "Add all" have no live data to drive in this anonymous-visitor test (no
   * colleagues, nothing to paste against). This proves both of those slice to the room actually
   * left rather than reimplementing the limit differently, so a future add path cannot forget it.
   */
  const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'EntryChatPage.tsx'), 'utf8')

  /* REWRITTEN (round 6): the colleague picker writes into the one team box, so queueColleague is gone. The picker still takes only the
     room actually left, counted as everybody on the list and in the box; and a box over the limit stops the save (readTheTeamBox). */
  /* REWRITTEN 22 November 2026: the tick-list, the per-person note box, its "Add person" and its "Skip" are gone. A colleague is picked as
     the name is typed, and that pick checks the room left, counting everybody on the list and in the box. */
  it('a colleague picked as the name is typed takes only the room actually left, counting the box too', () => {
    expect(src).toContain('if (isAnchorDraft() && peopleOnTheList >= thePeopleStepRules.mayAdd) { toast.error(thePeopleStepRules.limitSentence); return }')
    expect(src).not.toMatch(/function queueColleague|submitInviteContext|mayAddOneMorePerson/)
  })

  /* The pasted list's "Add all" is the one team box now (Hafsah, 31 October 2026); it counts the room left the same way. */
  /* UPDATED (Hafsah's blocker, 31 October 2026): the box is read by the save, which stops rather than dropping anybody past the room. */
  it('the team box is counted against the room actually left before anything is saved', () => {
    expect(src).toContain('if (isAnchorDraft() && inviteAdded.length + read.entries.filter((e) => !onTheList(e)).length > thePeopleStepRules.mayAdd) {')
  })
})

describe('the people step, for every other situation', () => {
  /* Changed 22 November 2026: the setup page's own block heading, "Who’s in it" (setup.txt), in place of the save card's "Invite people". */
  it('keeps the ordinary heading', async () => {
    await openInviteBlock(false)
    fireEvent.click((await screen.findAllByRole('button', { name: /^Change/ }))[0])
    expect(await screen.findByRole('region', { name: 'Who’s in it' })).toBeTruthy()
    expect(screen.queryByText('Who needs to be part of this?')).toBeNull()
  })
})
