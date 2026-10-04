import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { EntryChatPage } from './EntryChatPage'
import { authApi } from '@/api/auth'
import { toast } from 'sonner'

/**
 * THE PEOPLE STEP, FOR AN ANCHOR DRAFT (plan piece 11; docs/anchor-scenario-plan.md section 5 row 4;
 * docs/answers-from-engine.md, "Request 147", `ThePeopleStepRules`).
 *
 * Only when the draft's scenario is `HELP_TEAM_UNDERSTAND` does the invite block ("Admin setup",
 * shown once the email is sent) draw the engine's own heading, intro and button
 * (`ANCHOR_PEOPLE_STEP_RULES`, `./TheSetup.tsx` - shape only, not served yet, so these are the
 * values from the engine's own answer, used verbatim), and enforce the 19-person limit with the
 * engine's own limit sentence. Every other situation keeps its ordinary wording.
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

/** Renders, then submits the email - the invite block only draws once emailSent is true. */
async function openInviteBlock(anchor: boolean) {
  localStorage.setItem('gw_entry_session', closedSession(anchor))
  renderPage()
  const emailInput = await screen.findByPlaceholderText('your@email.com')
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

  it('draws the engine’s own heading and intro, once the email is sent', async () => {
    await openInviteBlock(true)
    expect(await screen.findByText('Who needs to be part of this?')).toBeTruthy()
    expect(screen.getByText(/Add up to 20 people\. They don.t need to report directly to you/)).toBeTruthy()
    expect(screen.queryByText('Invite people')).toBeNull()
  })

  it('adds up to the shrunk mayAdd of 2, then refuses the next one with the engine’s own sentence', async () => {
    await openInviteBlock(true)
    for (let i = 0; i < 2; i++) {
      fireEvent.change(await screen.findByPlaceholderText('name@company.com'), { target: { value: `person${i}@example.test` } })
      fireEvent.click(screen.getByText('Add'))
      await screen.findByText('What do they do / why are they part of this?')
      fireEvent.click(screen.getByText('Skip'))
      await waitFor(() => expect(screen.queryByText('What do they do / why are they part of this?')).toBeNull())
    }
    expect(toast.error).not.toHaveBeenCalled()
    // A third other person reaches the same context prompt (asking what somebody does is not
    // itself adding them), but "Skip" refuses to add them: the limit is enforced the moment
    // somebody is actually added, with the engine's own sentence.
    fireEvent.change(await screen.findByPlaceholderText('name@company.com'), { target: { value: 'person2@example.test' } })
    fireEvent.click(screen.getByText('Add'))
    await screen.findByText('What do they do / why are they part of this?')
    fireEvent.click(screen.getByText('Skip'))
    expect(toast.error).toHaveBeenCalledWith('This one-month Groundwork holds 20 people, and you are one of them, so you can add 19 more.')
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

  it('queueColleague (the colleague picker, one at a time) checks the limit first', () => {
    expect(src).toMatch(/function queueColleague\([^)]*\) \{\s*\n\s*if \(!mayAddOneMorePerson\(\)\) return/)
  })

  it('the colleague picker\'s multi-select slices to the room actually left, not once per item', () => {
    expect(src).toContain('const room = isAnchorDraft() ? Math.max(0, ANCHOR_PEOPLE_STEP_RULES.mayAdd - inviteAdded.length) : picked.length')
  })

  it('submitInviteContext (the "Add person" button) checks the limit first', () => {
    expect(src).toContain("if (!inviteAdded.includes(inviteContextFor) && !mayAddOneMorePerson()) return")
  })

  it('the "Skip" button checks the limit before adding without context', () => {
    expect(src).toContain('if (inviteAdded.includes(inviteContextFor) || mayAddOneMorePerson()) {')
  })

  it('the pasted-list "Add all" button slices to the room actually left', () => {
    expect(src).toContain('const room = isAnchorDraft() ? Math.max(0, ANCHOR_PEOPLE_STEP_RULES.mayAdd - inviteAdded.length) : allEmails.length')
  })
})

describe('the people step, for every other situation', () => {
  it('keeps the ordinary heading', async () => {
    await openInviteBlock(false)
    expect(await screen.findByText('Invite people')).toBeTruthy()
    expect(screen.queryByText('Who needs to be part of this?')).toBeNull()
  })
})
