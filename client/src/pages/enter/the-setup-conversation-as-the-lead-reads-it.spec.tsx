import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { EntryChatPage } from './EntryChatPage'

/*
 * THE SETUP CONVERSATION, AS THE LEAD READS IT (U.6 review), against start-chat.txt: "Set up a
 * check-in", the conversation, "This sounds like" and "It’s something else". Not the old name box,
 * "Getting started", the arrow steps, "Pick a different situation" or the chickens example.
 */
vi.mock('@/api/entry', () => ({
  entryApi: { opener: vi.fn().mockResolvedValue({ reply: '' }), chat: vi.fn(), report: vi.fn(), onboard: vi.fn(), classifyIntent: vi.fn() },
}))
vi.mock('@/api/auth', () => ({ authApi: { entrySave: vi.fn() } }))
vi.mock('@/stores/auth', () => ({ useAuthStore: (sel: any) => sel({ user: null, isAuthenticated: false }) }))

function openWith(session: object) {
  localStorage.clear()
  localStorage.setItem('gw_entry_session', JSON.stringify(session))
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/start']}><EntryChatPage /></MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('the setup conversation', () => {
  beforeEach(() => localStorage.clear())

  it('reads as start-chat.txt, and none of the old wording', async () => {
    const { THE_OPENING_QUESTION } = await import('./EntryChatPage')
    openWith({
      scenario: 'PIP', history: [], closed: false, onboardingStep: 1,
      onboardingSelections: { mode: 'new', initial: 'A team member is not delivering.', classifiedScenario: 'PIP', peopleNamed: ['Daniel'] },
      onboardingHistory: [
        { role: 'assistant', content: THE_OPENING_QUESTION },
        { role: 'user', content: 'A team member is not delivering and I need to address it.' },
        { role: 'assistant', content: 'Who is it, and what were they meant to be delivering?' },
      ],
    })
    await waitFor(() => expect(screen.getByText('Who is it, and what were they meant to be delivering?')).toBeTruthy())
    expect(screen.getByRole('heading', { level: 1, name: 'Set up a check-in' })).toBeTruthy()
    /* Changed in F5 (stage 2): the opening is one line with the measured length. Changed 3 November evening (Hafsah: no cards in the
       conversation): the kind of check-in and its meaning are in the summary, with It’s something else, and End session is on screen. */
    expect(document.body.textContent).toContain('This takes about five minutes. You can stop any time with End session.')
    expect(screen.queryByRole('region', { name: 'This sounds like' })).toBeNull()
    const summary = screen.getByRole('complementary', { name: 'What is set so far' })
    expect(summary.textContent).toContain('Help someone get back on track')
    expect(summary.textContent).toContain('Both sides on the concern, before the conversation.')
    expect(screen.queryByRole('button', { name: 'Confirmed' })).toBeNull()
    expect(screen.getByRole('button', { name: 'It’s something else' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'End session' })).toBeTruthy()
    const page = document.body.textContent ?? ''
    for (const old of ['Give this a name', 'Getting started', 'session is about 10 minutes', 'What is going on', 'Save & invite', 'Pick a different situation', 'Set up as', 'organic chickens', 'Fills in as you talk', 'about ten minutes']) {
      expect(page, old).not.toContain(old)
    }
  })

  /*
   * FAULT 3 (live walk, 6 October 2026): THE "SO FAR" CARD SPOKE AS "I", ONE-WORD LABELS AND A
   * SEMICOLON-JOINED LIST. Now full plain labels, "and" between several aims, and one voice
   * throughout ("Groundwork" rather than "I").
   */
  /*
   * CHANGED 11 OCTOBER (decision 133): this read the "What Groundwork has so far" card that sat above
   * the two-button fork at the end of setup. The fork and its card are gone: setup carries straight
   * on into the lead's first check-in, so nothing stands between them.
   */
  it('shows no "so far" card or fork between setup and the first check-in', async () => {
    openWith({
      scenario: 'NEW_PROJECT', closed: false, history: [], onboardingStep: 3, onboardingReady: true,
      onboardingHistory: [
        { role: 'assistant', content: 'Tell me about it.' },
        { role: 'user', content: 'We are training new bakers.' },
      ],
      onboardingSelections: {
        mode: 'new', initial: 'Training new bakers.', classifiedScenario: 'NEW_PROJECT',
        peopleNamed: ['Imani'], goals: ['learn our bread recipes', 'run the morning bake'],
      },
    })
    await waitFor(() => expect(document.body.textContent).toContain('Imani'))
    expect(screen.queryByText('What Groundwork has so far')).toBeNull()
    expect(screen.queryByText('I set this up and check in myself')).toBeNull()
  })

  /*
   * FAULT 4 (live walk, 6 October 2026): "A NAME" STAYED UNTICKED THOUGH THE PERSON (IMANI) WAS
   * ALREADY NAMED. The side panel's "0 of 4 set" never ticked "A name" while `groundName` itself
   * was still blank, even though the new hire's own name had already come up in conversation and
   * the check-in would be named after her the moment it saved (fault 6). Offering that same name
   * here ticks the row the moment Groundwork has a name to offer.
   */
  it('ticks "A name" for a new hire once the person has been named, before the lead types anything', async () => {
    openWith({
      scenario: 'NEW_HIRE', closed: false, history: [], onboardingStep: 3,
      onboardingHistory: [
        { role: 'assistant', content: 'Tell me about it.' },
        { role: 'user', content: 'Imani is starting as our new baker next week.' },
      ],
      onboardingSelections: {
        mode: 'new', initial: 'Imani is starting as our new baker.', classifiedScenario: 'NEW_HIRE',
        peopleNamed: ['Imani'],
      },
    })
    await waitFor(() => expect(screen.getAllByText('Imani, first 90 days').length).toBeGreaterThan(0))
    expect(document.body.textContent).not.toContain('0 of 4 set')
  })

  /* Was "the planned number follows how often it runs", read off the header's plan count, which is gone with the header's other pieces
     (Hafsah, 3 November evening). How often it runs and until when are on the summary and the save card. */
  it('once in the check-in, the header is its name and End session, with no plan count', async () => {
    openWith({
      scenario: 'PIP', closed: false, flowPath: 'self', onboardingStep: 7,
      history: [{ role: 'assistant', content: 'How is it going?' }],
      sessions: 1, cadence: 'WEEKLY', cadenceChosen: true, plannedFrom: { timelineDays: 42, cadence: 'WEEKLY' },
      onboardingSelections: { mode: 'new', initial: 'x', classifiedScenario: 'PIP' },
    })
    await waitFor(() => expect(screen.getByRole('button', { name: 'End session' })).toBeTruthy())
    expect(document.body.textContent).not.toMatch(/check-ins? planned|Session 1 in progress/)
  })
})

describe('the setup shows what will be saved (U.6 review)', () => {
  /* Read live: "This will run every 2 weeks" and fortnightly dates, saved as weekly for 90 days. */
  it('an unpicked rhythm is the situation’s own, and its dates run to its usual end', async () => {
    localStorage.clear()
    localStorage.setItem('gw_entry_session', JSON.stringify({
      scenario: '', closed: true, flowPath: 'self', onboardingStep: 7,
      history: [{ role: 'user', content: 'He has missed three deadlines.' }, { role: 'assistant', content: 'Noted.' }],
      onboardingSelections: { mode: 'new', initial: 'x', classifiedScenario: 'PIP' },
    }))
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(<QueryClientProvider client={qc}><MemoryRouter initialEntries={['/start']}><EntryChatPage /></MemoryRouter></QueryClientProvider>)
    expect(await screen.findByText('Not set yet. This will run every week unless you pick one.')).toBeTruthy()
    /* 90 days, weekly: 12 check-ins, as the server keeps them, and the end date goes with the save.
       Screen fault 10 (final walk): a comma, not a colon, and "sessions" said plainly. */
    await waitFor(() => expect(document.body.textContent).toMatch(/, 12 check-ins in all\./))
    expect(document.body.textContent).not.toContain('every 2 weeks unless')
  })
})

describe('coming back to /start with a setup unfinished (U.6 review)', () => {
  it('offers "Carry on with this one" or "Start a new one"', async () => {
    localStorage.clear()
    localStorage.setItem('gw_entry_session', JSON.stringify({
      scenario: '', history: [], closed: false, onboardingStep: 1,
      onboardingSelections: { mode: 'new', initial: 'x', classifiedScenario: 'PIP' },
      onboardingHistory: [{ role: 'assistant', content: 'Opening.' }, { role: 'user', content: 'Someone is not delivering.' }, { role: 'assistant', content: 'Who is it?' }],
    }))
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(<QueryClientProvider client={qc}><MemoryRouter initialEntries={['/start?new=1']}><EntryChatPage /></MemoryRouter></QueryClientProvider>)
    expect(await screen.findByRole('button', { name: 'Carry on with this one' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Start a new one' })).toBeTruthy()
    expect(document.body.textContent).not.toMatch(/scenario|Keep current session/i)
    expect(document.body.textContent).toContain('Starting a new one clears the one you were setting up, and nothing you said in it is kept. Carry on with it to pick up where you left off.')
    expect(document.body.textContent).not.toContain('Keep it to carry on')
  })

  /* Read live: pressing it showed the empty first screen, and the setup came back only on reload. */
  it('"Carry on with this one" puts the kept conversation back on the screen straight away', async () => {
    localStorage.clear()
    localStorage.setItem('gw_entry_session', JSON.stringify({
      scenario: '', history: [], closed: false, onboardingStep: 1,
      onboardingSelections: { mode: 'new', initial: 'x', classifiedScenario: 'PIP' },
      onboardingHistory: [{ role: 'assistant', content: 'Opening.' }, { role: 'user', content: 'Someone is not delivering.' }, { role: 'assistant', content: 'Who is it?' }],
    }))
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(<QueryClientProvider client={qc}><MemoryRouter initialEntries={['/start?new=1']}><EntryChatPage /></MemoryRouter></QueryClientProvider>)
    fireEvent.click(await screen.findByRole('button', { name: 'Carry on with this one' }))
    expect(await screen.findByText('Who is it?')).toBeTruthy()
    expect(screen.getByText('Someone is not delivering.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Carry on with this one' })).toBeNull()
    expect(document.body.textContent).not.toContain('Describe it in your own words')
  })
})
