import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { EntryChatPage } from './EntryChatPage'
import { addThroughTheTeamBox, pressTheSave } from './a-team-read-in-a-spec'
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
    peopleOnLines: vi.fn(async (t: string) => (await import('./a-team-read-in-a-spec')).readLikeTheServer(t)),
    opener: vi.fn().mockResolvedValue({ reply: '' }),
    chat: vi.fn(),
    report: vi.fn(),
    onboard: vi.fn(),
    classifyIntent: vi.fn(),
    patchDraft: vi.fn().mockResolvedValue({ ok: true }),
    commit: vi.fn().mockResolvedValue({ groundId: 'g-created' }),
  },
}))
vi.mock('@/api/auth', () => ({ authApi: { entrySave: vi.fn(), colleagues: vi.fn().mockResolvedValue([]) } }))
vi.mock('@/api/billing', () => ({ billingApi: { checkCanCreateGround: vi.fn().mockResolvedValue({ allowed: true }) } }))

let authedUser: { id: string; email: string; firstName?: string } | null = null
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
    fireEvent.click((await screen.findAllByRole('button', { name: /^Change/ }))[0]) /* 22 November 2026: no card; the setup page is behind Change */
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
    fireEvent.click((await screen.findAllByRole('button', { name: /^Change/ }))[0]) /* 22 November 2026: no card; the setup page is behind Change */
    const emailInput = screen.getByPlaceholderText('your@email.com')
    /* The save step asks "Your name" now (local test of staging, 15 October). */
    { const yourName = screen.queryByPlaceholderText('Your name'); if (yourName) fireEvent.change(yourName, { target: { value: 'Hafsah Jumare' } }) }
    fireEvent.change(emailInput, { target: { value: 'lead@example.test' } })
    fireEvent.submit(emailInput.closest('form')!)
    await waitFor(() => expect(authApi.entrySave).toHaveBeenCalledTimes(1))
    expect(await screen.findByText('Check your email')).toBeTruthy()
    expect(screen.getByText('Name this situation')).toBeTruthy()
    expect(screen.getByText('Invite people')).toBeTruthy()
    expectAtMostOnePrimaryButton(container)
  })
})

describe('the save card asks the lead her name, once (local test of staging, 15 October)', () => {
  /* Hafsah saved from here with nothing asking, and her invitations went out as "Hjumare would like your take on Sales
     check-in", a piece of her address. */
  it('with no name, says why and sends nothing; with her name, sends it with the save', async () => {
    const { authApi } = await import('@/api/auth')
    vi.mocked(authApi.entrySave).mockResolvedValue({ draftToken: 'd-token' } as any)
    seedClosedSession()
    renderPage()
    fireEvent.click((await screen.findAllByRole('button', { name: /^Change/ }))[0]) /* 22 November 2026: no card; the setup page is behind Change */
    const emailInput = screen.getByPlaceholderText('your@email.com')
    fireEvent.change(emailInput, { target: { value: 'hjumare+local@example.test' } })
    fireEvent.submit(emailInput.closest('form')!)
    expect(await screen.findByText('Write your name, so the people you invite know who is asking.')).toBeTruthy()
    expect(authApi.entrySave).not.toHaveBeenCalled()
    fireEvent.change(screen.getByPlaceholderText('Your name'), { target: { value: 'Hafsah Jumare' } })
    fireEvent.submit(emailInput.closest('form')!)
    await waitFor(() => expect(authApi.entrySave).toHaveBeenCalledTimes(1))
    const [, body] = (authApi.entrySave as any).mock.calls[0]
    expect(body.payload.firstName).toBe('Hafsah Jumare')
  })
})

describe('the save card, already signed in', () => {
  it('offers one save button straight to the account, with no email step', async () => {
    authedUser = { id: 'u1', email: 'rukia@example.test', firstName: 'Rukia' }
    const { authApi } = await import('@/api/auth')
    seedClosedSession()
    const { container } = renderPage()
    fireEvent.click((await screen.findAllByRole('button', { name: /^Change/ }))[0]) /* 22 November 2026: no card; the setup page is behind Change */
    expect(screen.getByRole('button', { name: 'Save this' })).toBeTruthy()
    /* FAULT E (reviewer, third round): "Saving to rukia@example.test. No confirmation needed,
       you are already signed in." read like a log line. One plain sentence instead.

       SCREEN FAULT (engine workspace, 9 October night, test bed copy a): that plain sentence
       still named the account and gave the address ("We save this to your account,
       admin@fieldnote.test."). Updated to speak to the person by first name, with no "account"
       and no address. This test is changed because it pinned the old, faulty wording. */
    expect(screen.getByText('We save this for you, Rukia.')).toBeTruthy()
    expect(screen.queryByText(/We save this to your account/)).toBeNull()
    expect(screen.queryByPlaceholderText('your@email.com')).toBeNull()
    expectAtMostOnePrimaryButton(container)
    expect(authApi.entrySave).not.toHaveBeenCalled()
  })

  it('falls back to a plain sentence with no address when no name is known', async () => {
    authedUser = { id: 'u1', email: 'rukia@example.test' }
    seedClosedSession()
    renderPage()
    fireEvent.click((await screen.findAllByRole('button', { name: /^Change/ }))[0]) /* 22 November 2026: no card; the setup page is behind Change */
    expect(screen.getByText('We save this for you.')).toBeTruthy()
    expect(screen.queryByText(/rukia@example\.test/)).toBeNull()
  })

  /*
   * FAULT A (reviewer, third round): THE FIRST SAVE INVITED NOBODY. Daniel and Grace, queued from
   * the colleague picker before pressing Save, never reached the commit - the check-in held only
   * the signed-in lead. Proven here against the real save path (saveAsSignedInUser ->
   * entryApi.commit), with two colleagues queued exactly the way the save card's own PeoplePicker
   * queues them (queueColleague), so a regression in either the queueing or the commit payload
   * shows up here.
   */
  it('sends the people queued from the colleague picker when a signed-in lead saves', async () => {
    authedUser = { id: 'u1', email: 'amina@suites.test' }
    const { authApi } = await import('@/api/auth')
    const { entryApi } = await import('@/api/entry')
    vi.mocked(authApi.colleagues).mockResolvedValue([
      { id: 'c-daniel', name: 'Daniel Park', role: 'Engineer', team: null },
      { id: 'c-grace', name: 'Grace Achieng', role: 'Designer', team: null },
    ] as any)
    seedClosedSession()
    renderPage()
    fireEvent.click((await screen.findAllByRole('button', { name: /^Change/ }))[0]) /* 22 November 2026: no card; the setup page is behind Change */
    const danielCheckbox = await screen.findByRole('checkbox', { name: 'Daniel Park' })
    fireEvent.click(danielCheckbox)
    fireEvent.click(screen.getByRole('checkbox', { name: 'Grace Achieng' }))
    const picker = screen.getByRole('listbox').closest('div')!.parentElement as HTMLElement
    fireEvent.click(within(picker).getByRole('button', { name: /^Add/ }))

    await waitFor(() => expect(screen.getByText(/Daniel Park/)).toBeTruthy())
    await pressTheSave()

    await waitFor(() => expect(entryApi.commit).toHaveBeenCalled())
    const payload = vi.mocked(entryApi.commit).mock.calls[0][0]
    expect(payload.contributors).toContainEqual(expect.objectContaining({ colleagueId: 'c-daniel' }))
    expect(payload.contributors).toContainEqual(expect.objectContaining({ colleagueId: 'c-grace' }))
  })

  /*
   * B-011 (bug log, screens sweep): "PASTE MULTIPLE EMAILS" THEN "ADD ALL" QUEUES EACH PERSON
   * THROUGH ITS OWN FOCUS-NOTE STEP, ONE AT A TIME. Priya and Tomas were pasted and "Add all" was
   * pressed; while Priya's focus note was still on screen, unanswered, the save finished and the
   * page moved on - the check-in held only the person who set it up, neither Priya nor Tomas, with
   * no error shown. Both are named the moment "Add all" is pressed, so saving before either focus
   * note is answered must still invite both.
   */
  /* UPDATED (Hafsah, 31 October 2026): the paste and its per-person focus step are the one team box, one press. The point stands: the
     people just added are on the check-in when it is saved. */
  /* UPDATED again (Hafsah's blocker, 31 October 2026): there is no "Add everyone" before saving; the lines in the box are the team. */
  it('saving with people typed in the team box invites every one of them', async () => {
    authedUser = { id: 'u1', email: 'amina@suites.test' }
    const { entryApi } = await import('@/api/entry')
    seedClosedSession()
    renderPage()
    fireEvent.click((await screen.findAllByRole('button', { name: /^Change/ }))[0]) /* 22 November 2026: no card; the setup page is behind Change */
    await addThroughTheTeamBox('Priya Shah, priya@suites.test\nTomas Berg, tomas@suites.test')
    expect(screen.queryByText('What do you want them to focus on or cover?')).toBeNull()
    await pressTheSave()

    await waitFor(() => expect(entryApi.commit).toHaveBeenCalled())
    const payload = vi.mocked(entryApi.commit).mock.calls[0][0]
    expect(payload.contributors).toContainEqual(expect.objectContaining({ email: 'priya@suites.test', displayName: 'Priya Shah' }))
    expect(payload.contributors).toContainEqual(expect.objectContaining({ email: 'tomas@suites.test', displayName: 'Tomas Berg' }))
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
  /* The two tests that read the "N sessions means signing in" prompt are deleted with it: it was opened only by the header's count of
     check-ins, which is gone with the header's other pieces (Hafsah, 3 November evening). How often and until when are set on the save
     card, which already says to a signed-in lead "We save this for you" (the test above) and to a stranger how to save. */
})

/*
 * RESTORED (nothing-removed-screens.md item 2): live let a lead say which day a weekly or monthly
 * check-in lands on (`cadenceAnchorDay`), sent all the way to `entryApi.commit`. This had been fixed
 * at `null` with no control on screen to change it. Proven end to end: picking a day in `TheSetup`'s
 * own "How often" section and saving really puts it on the commit payload the server receives.
 */
describe('which day it lands on, end to end (nothing-removed-screens.md item 2)', () => {
  it('picking a weekday in setup sends it as cadenceAnchorDay on save', async () => {
    authedUser = { id: 'u1', email: 'amina@suites.test' }
    const { entryApi } = await import('@/api/entry')
    seedClosedSession({ cadence: 'WEEKLY', cadenceChosen: true })
    renderPage()
    fireEvent.click((await screen.findAllByRole('button', { name: /^Change/ }))[0]) /* 22 November 2026: no card; the setup page is behind Change */
    /* Setup page review: "On which day" is the shared Choices now, one radio per day. */
    const mon = await screen.findByRole('radio', { name: 'Mon' })
    fireEvent.click(mon)
    await pressTheSave()
    await waitFor(() => expect(entryApi.commit).toHaveBeenCalled())
    const payload = vi.mocked(entryApi.commit).mock.calls[0][0]
    expect(payload.cadenceAnchorDay).toBe(1)
  })

  it('picking a day of the month for a monthly check-in sends it the same way', async () => {
    authedUser = { id: 'u1', email: 'amina@suites.test' }
    const { entryApi } = await import('@/api/entry')
    seedClosedSession({ cadence: 'MONTHLY', cadenceChosen: true })
    renderPage()
    fireEvent.click((await screen.findAllByRole('button', { name: /^Change/ }))[0]) /* 22 November 2026: no card; the setup page is behind Change */
    const select = await screen.findByRole('combobox')
    fireEvent.change(select, { target: { value: '15' } })
    await pressTheSave()
    await waitFor(() => expect(entryApi.commit).toHaveBeenCalled())
    const payload = vi.mocked(entryApi.commit).mock.calls[0][0]
    expect(payload.cadenceAnchorDay).toBe(15)
  })

  it('sends nothing when no day was picked', async () => {
    authedUser = { id: 'u1', email: 'amina@suites.test' }
    const { entryApi } = await import('@/api/entry')
    seedClosedSession({ cadence: 'WEEKLY', cadenceChosen: true })
    renderPage()
    fireEvent.click((await screen.findAllByRole('button', { name: /^Change/ }))[0]) /* 22 November 2026: no card; the setup page is behind Change */
    await pressTheSave()
    await waitFor(() => expect(entryApi.commit).toHaveBeenCalled())
    const payload = vi.mocked(entryApi.commit).mock.calls[0][0]
    expect(payload.cadenceAnchorDay).toBeUndefined()
  })
})

describe('changing how many sessions a check-in runs (fault 2, live walk, 6 October 2026)', () => {
  /* The header's count of check-ins, its "How many check-ins" box and the typed number that beat an end date are gone (Hafsah,
     3 November evening: the setup screen keeps the check-in's layout). The save card's own how often and end date say how many there
     are; buildCommitPayload sends the dates. The two tests that typed into the count are deleted with it. */
  /*
   * FAULT E, PART 2 (reviewer, third round): THE SAVE CARD'S OWN HEADING CLAIMED A REPORT AND A
   * RECORD THAT DID NOT EXIST YET. Opened with no answer given (history holds only the assistant's
   * opening line), it still read "This is session 1. It is your private report." and "What you
   * said is on record." - both written for after the first session, not before it has started.
   */
  it('the save card heading does not claim a report or a record before any answer is given', async () => {
    authedUser = { id: 'u1', email: 'amina@suites.test' }
    localStorage.setItem('gw_entry_session', JSON.stringify({
      scenario: 'PIP', closed: false, flowPath: 'self', onboardingStep: 7,
      history: [{ role: 'assistant', content: 'How is it going?' }],
      sessions: 1, cadence: 'WEEKLY', cadenceChosen: true,
      onboardingSelections: { mode: 'new', initial: 'x', classifiedScenario: 'PIP' },
    }))
    renderPage()
    /* Opened now from End session, the only way to the card before any answer (the header's count that opened it is gone). */
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'End check-in' }))

    /* Changed 22 November 2026: the eyebrow carried a privacy note ("It will be your private report."), which no screen says. */
    expect(await screen.findByText('This will be check-in 1.')).toBeTruthy()
    expect(screen.getByText('Nothing is on record yet.')).toBeTruthy()
    expect(screen.queryByText('This is check-in 1.')).toBeNull()
    expect(screen.queryByText(/your private report|private to you/)).toBeNull()
    expect(screen.queryByText('What you said is on record.')).toBeNull()
  })
})

/*
 * FAULT 9 (live review): SOMEBODY ADDED FROM A NAMED "PEOPLE MENTIONED" ROW GOT NO NAME FIELD.
 * Her row then read "wanjiru@suites.test is waiting for a seat on your plan.", with no name.
 *
 * REWRITTEN (round 5, the one team box): the report's own "Add them" row is gone, because it was a second way to add people beside
 * the team box and round 5's startup lead added five people through it one at a time. What this proved still holds through the box:
 * a person written on a line with her name and address goes to the draft with her name, after the email is given, when there is no
 * press left to save.
 */
describe('a mentioned person keeps her name when added after the email is given (fault 9, live review)', () => {
  it('sends the address with the name written beside it as displayName, not the address alone', async () => {
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
    fireEvent.click((await screen.findAllByRole('button', { name: /^Change/ }))[0]) /* 22 November 2026: no card; the setup page is behind Change */
    const emailInput = screen.getByPlaceholderText('your@email.com')
    { const yourName = screen.queryByPlaceholderText('Your name'); if (yourName) fireEvent.change(yourName, { target: { value: 'Hafsah Jumare' } }) }
    fireEvent.change(emailInput, { target: { value: 'lead@example.test' } })
    fireEvent.submit(emailInput.closest('form')!)
    await waitFor(() => expect(authApi.entrySave).toHaveBeenCalled())

    expect(screen.queryByText('Add them')).toBeNull()
    await addThroughTheTeamBox('Wanjiru Kamau, wanjiru@suites.test')

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
