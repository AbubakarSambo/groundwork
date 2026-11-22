import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { EntryChatPage } from './EntryChatPage'
import { TheDoor } from './TheDoor'
import { EverySituation, cardsUnder } from './EverySituation'
import { THE_GROUPS_IN_ORDER } from './the-way-in'

/*
 * THE WAY INTO A NEW CHECK-IN, AS A PERSON READS IT (U.6, B1).
 *
 * Checked against docs/prototype/screens/B1-starting-a-check-in/start.txt, new.txt and
 * all-situations.txt, word for word, on the rendered page rather than in the source.
 */

const onboardStream = vi.fn().mockResolvedValue({ reply: 'Who is it, and what were they meant to be delivering?', extracted: {} })
vi.mock('@/api/entry', () => ({
  entryApi: {
    opener: vi.fn().mockResolvedValue({ reply: '' }),
    chat: vi.fn(), report: vi.fn(), onboard: vi.fn(), classifyIntent: vi.fn(),
    onboardStream: (...a: unknown[]) => onboardStream(...a),
  },
}))
vi.mock('@/api/auth', () => ({ authApi: { entrySave: vi.fn() } }))
vi.mock('@/stores/auth', () => ({ useAuthStore: (sel: any) => sel({ user: null, isAuthenticated: false }) }))

function openStart() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/start']}>
        <EntryChatPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const text = (el: HTMLElement) => (el.textContent ?? '').replace(/\s+/g, ' ').trim()

describe('someone signed out opens /start', () => {
  beforeEach(() => { localStorage.clear(); onboardStream.mockClear() })

  it('reads the prototype’s first screen, and nothing about names, plans or steps', async () => {
    openStart()
    expect(await screen.findByRole('heading', { level: 1, name: 'What do you need updates on, or want to track?' })).toBeTruthy()
    /* Changed in F5: the length is the measured one (how-long-setup-takes.ts), not "about two minutes". */
    expect(screen.getByText('A goal, a new hire, a decision. Describe it and I’ll set it up in about five minutes.')).toBeTruthy()
    for (const example of [
      'Track the team’s targets for the quarter',
      'Sales are behind and I don’t know why',
      'A new hire starts on Monday',
      'Someone isn’t delivering',
      'We have to choose a supplier',
    ]) expect(screen.getByRole('button', { name: example })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Continue' })).toBeTruthy()
    expect(text(screen.getByText('Rather pick from a list?', { exact: false }))).toBe('Rather pick from a list? See every situation.')
    expect(screen.getByLabelText('What do you need updates on, or want to track?')).toBeTruthy()

    const page = document.body.textContent ?? ''
    for (const gone of ['Give this a name', 'check-in planned', 'What is going on', 'Save & invite', 'Start over', 'Or pick a situation that already fits']) {
      expect(page, gone).not.toContain(gone)
    }
  })

  it('an example fills the box, and Continue sends those words to start the setup conversation', async () => {
    openStart()
    fireEvent.click(await screen.findByRole('button', { name: 'Someone isn’t delivering' }))
    expect((screen.getByLabelText('What do you need updates on, or want to track?') as HTMLTextAreaElement).value).toBe('Someone isn’t delivering')
    expect(onboardStream).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    await waitFor(() => expect(onboardStream).toHaveBeenCalled())
    const [history, scenario] = onboardStream.mock.calls[0] as [{ role: string; content: string }[], string | undefined]
    expect(history[history.length - 1]).toEqual({ role: 'user', content: 'Someone isn’t delivering' })
    /* Described in their own words, so no card's situation is sent with it. */
    expect(scenario).toBeUndefined()
  })

  it('Continue does nothing while the box is empty', async () => {
    openStart()
    const go = await screen.findByRole('button', { name: 'Continue' })
    expect((go as HTMLButtonElement).disabled).toBe(true)
  })

  it('“See every situation” shows every situation under the prototype’s headings', async () => {
    openStart()
    fireEvent.click(await screen.findByRole('button', { name: 'See every situation' }))
    expect(screen.getByRole('heading', { level: 1, name: 'What do you want people to check in about?' })).toBeTruthy()
    expect(screen.getByText('Say it in your own words, or start from one of the situations below. Either way, it’s set up as you talk, and nothing is sent to anyone until you say so.')).toBeTruthy()
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual([
      'Something is starting', 'Goals and plans', 'Keeping a read', 'About one person', 'Something has gone off',
    ])
    const person = screen.getByRole('region', { name: 'About one person' })
    expect(within(person).getAllByRole('button').map((b) => [...b.querySelectorAll('span')].map(text))).toEqual([
      ['Help someone get back on track', 'Both sides on the concern, before the conversation.'],
      ['Support a raise, promotion or recognition', 'The same evidence in front of both of you.'],
      ['Check in before a contract ends or renews', 'An honest read of how the term went, from both sides.'],
    ])
    expect(screen.getByText('None of these fit? Describe it and we’ll work out what it is together.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Describe it' })).toBeTruthy()
  })

  it('picking a situation only picks it; “Start with this” sends its opening sentence', async () => {
    openStart()
    fireEvent.click(await screen.findByRole('button', { name: 'See every situation' }))
    fireEvent.click(screen.getByRole('button', { name: /^Help someone get back on track/ }))
    expect(onboardStream).not.toHaveBeenCalled()
    const panel = screen.getByRole('complementary', { name: 'You picked' })
    expect(within(panel).getByText('You picked')).toBeTruthy()
    expect(within(panel).getByText('Help someone get back on track')).toBeTruthy()
    expect(within(panel).getByText('Both sides on the concern, before the conversation.')).toBeTruthy()
    expect(text(panel)).toContain('It starts the conversation with: “A team member is not delivering and I need to address it. I want to make sure I have the full picture before we talk.” You can change every word.')
    expect(text(panel)).toContain('You don’t need to sign up to start. We ask for your email when there’s something worth keeping.')
    fireEvent.click(within(panel).getByRole('button', { name: 'Start with this' }))
    await waitFor(() => expect(onboardStream).toHaveBeenCalled())
    expect(onboardStream.mock.calls[0][1]).toBe('PIP')
  })
})

describe('someone signed in starts a check-in', () => {
  /* Changed in F5 (the approved journey, stage 1): a signed-in lead meets the same way in as the prototype's start.txt, with the
     examples as buttons, under the crumbs; "Set up a check-in" and "Describe it in your own words" are gone. */
  it('reads start.txt’s words under the crumbs, with the examples as buttons and no example in the box', () => {
    render(<TheDoor signedIn onSend={() => {}} onSeeEverySituation={() => {}} />)
    expect(text(screen.getByRole('navigation', { name: 'Where you are' }))).toBe('Check-ins/New check-in')
    expect(screen.getByRole('heading', { level: 1, name: 'What do you need updates on, or want to track?' })).toBeTruthy()
    expect(screen.getByText('A goal, a new hire, a decision. Describe it and I’ll set it up in about five minutes.')).toBeTruthy()
    const box = screen.getByLabelText('What do you need updates on, or want to track?') as HTMLTextAreaElement
    expect(box.placeholder).toBe('')
    expect(screen.getByRole('button', { name: 'Continue' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'A new hire starts on Monday' })).toBeTruthy()
    for (const gone of ['Set up a check-in', 'Describe it in your own words', 'press send', 'For example']) expect(document.body.textContent, gone).not.toContain(gone)
  })

  it('the picked panel does not tell a signed-in person they need no account', () => {
    render(<EverySituation signedIn openerFor={() => 'An opening sentence.'} onSend={() => {}} onStart={() => {}} onDescribe={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /^Help a new hire get started/ }))
    expect(document.body.textContent).not.toContain('You don’t need an account')
  })
})

describe('the list itself', () => {
  it('offers every card under exactly one heading, so none is lost from the list', async () => {
    const { SCENARIOS } = await import('@/pages/grounds/CreateGroundPage')
    const listed = THE_GROUPS_IN_ORDER.flatMap((g) => cardsUnder(g.key).map((c) => c.cardKey))
    expect([...listed].sort()).toEqual(SCENARIOS.map((c) => c.cardKey).sort())
  })
})

describe('a name, the topic in plain words, never the lead\'s words (U.6 review)', () => {
  /* Read live: set up as "Help someone get back on track", classified as DRIFT, saved as "Drift".
     And her own first words must never become the name: it is the invitation's subject. */
  it('says the situation in plain words, else a neutral name', async () => {
    const { fallbackGroundName } = await import('./EntryChatPage')
    const { SCENARIO_LABELS } = await import('@/lib/scenario-catalog')
    expect(fallbackGroundName('PIP')).toBe('Help someone get back on track')
    expect(fallbackGroundName(SCENARIO_LABELS.PIP)).toBe('Help someone get back on track')
    expect(fallbackGroundName('DRIFT')).toBe('Get a project back on track')
    expect(fallbackGroundName('Connect Goals Across the Team')).toBe('Connect goals across the team')
    expect(fallbackGroundName(undefined, 'U6 Review Co')).toBe('A check-in at U6 Review Co')
    expect(fallbackGroundName()).toBe('A check-in')
  })
  /*
   * SCREEN FAULT 2 (live walk, 6 October 2026): BOTH SITES NOW BRANCH ON THE ANCHOR FIRST. An
   * anchor draft's name is the served `groundLabel` itself ("Help my team understand"), never the
   * aim or the organisation fallback - so both call sites read `isAnchorDraft() ? anchorGroundLabel
   * : (...)`, with the ordering this test already pinned (the lead's pick first, then the settled
   * situation, never her words) unchanged inside that `(...)`.
   *
   * FAULTS 4 AND 6 (live walk, 6 October 2026): BOTH SITES NOW SHARE ONE `theDefaultGroundName()`
   * HELPER, rather than each repeating the same `fallbackGroundName(...)` call - the one place the
   * new hire's own default (faults 4 and 6, naming the person rather than the situation) has to
   * live so the committed name and the side panel's preview can never disagree. The ordering this
   * test pins (the lead's pick first, then the settled situation) now lives inside
   * `theDefaultGroundName` itself, checked separately below.
   */
  it('is handed the lead\'s pick first, then the settled situation, and never her words', async () => {
    const { readFileSync } = await import('fs')
    const { join } = await import('path')
    const src = readFileSync(join(__dirname, 'EntryChatPage.tsx'), 'utf8')
    expect(src.match(/groundLabel: isAnchorDraft\(\)\s*\n\s*\? anchorGroundLabel\s*\n(?:\s*\/\*.*\*\/\s*\n)?\s*: \(groundName\.trim\(\) \|\| theDefaultGroundName\(\)\),/g)).toHaveLength(2)
    /* Changed 22 November 2026: the people added under "Who's in it" now name a new hire's check-in too, read on the line before. */
    expect(src).toMatch(/function theDefaultGroundName\(\): string \{[\s\S]{0,600}?return effectiveFallbackGroundName\(\s*\n\s*theSituationTheLeadPicked\(\) \?\? onboardingSelections\.classifiedScenario,/)
    expect(src).not.toMatch(/fallbackGroundName\([^)]*onboardingSelections\.initial/)
  })

  /*
   * FAULT 6 (live walk, 6 October 2026): THE SAVED CHECK-IN'S DEFAULT NAME, FOR A NEW HIRE, IS THE
   * PERSON IT IS ABOUT. Read live: a lead who never typed a name saved a check-in called "Help a
   * new hire get started" - the situation's own label, where the prototype's own check-ins read a
   * person's name ("Faith, first 90 days", new.txt's sidebar). Only the new-hire situation changes
   * here; every other situation falls to the lead's own name when there is one to use (fault 15,
   * checked below), and to `fallbackGroundName`'s own situation label only when there is not -
   * proven here with no lead name passed, which is this test's whole point.
   */
  it('defaults a new hire\'s check-in to their name and the length of time, not the situation\'s label', async () => {
    const { newHireDays, newHireGroundNameFallback, effectiveFallbackGroundName } = await import('./EntryChatPage')
    expect(newHireDays('Imani is starting next week.')).toBe(90)
    expect(newHireDays('Her first 60 days matter most.')).toBe(60)
    expect(newHireDays('A 45-day plan would help.')).toBe(45)
    expect(newHireGroundNameFallback(['Imani Wekesa'], 90)).toBe('Imani, first 90 days')
    expect(newHireGroundNameFallback([], 90)).toBeUndefined()
    expect(newHireGroundNameFallback(undefined, 90)).toBeUndefined()
    expect(effectiveFallbackGroundName('NEW_HIRE', ['Imani Wekesa'], 'Imani starts in two weeks.'))
      .toBe('Imani, first 90 days')
    expect(effectiveFallbackGroundName('NEW_HIRE', ['Imani Wekesa'], 'Her first 60 days matter.'))
      .toBe('Imani, first 60 days')
    /* No name heard yet: falls back to the situation's own label, same as before. */
    expect(effectiveFallbackGroundName('NEW_HIRE', [], 'Nobody named yet.'))
      .toBe('Help a new hire get started')
    /* Every other situation, with no lead name available either, is unaffected. */
    expect(effectiveFallbackGroundName('PIP', ['Daniel'], 'Daniel is not delivering.'))
      .toBe('Help someone get back on track')
  })

  /* Pilot, 12 November: a team is never named after whoever was named first, and a surname is never the next line's capital word. */
  it('names a check-in after a person only when exactly one person is named, and keeps a surname on one line', async () => {
    const { newHireGroundNameFallback, namesFromTheirSetupWords } = await import('./EntryChatPage')
    expect(newHireGroundNameFallback(['Leah Kanyi', 'Speranzer Mutheu'], 90)).toBeUndefined()
    expect(namesFromTheirSetupWords(['speranzer@x.com'], ['Speranzer\nIdentifying agents in Kisumu'])).toEqual({})
    expect(namesFromTheirSetupWords(['speranzer@x.com'], ['Speranzer Mutheu leads Kisumu'])).toEqual({ 'speranzer@x.com': 'Speranzer Mutheu' })
  })

  /*
   * Changed 7 November 2026 (staging check S17): FAULT 15's default, the lead's own name ("Stella's check-in"), said nothing about
   * the work, and the invitation then read "Stella invited you to the Stella's check-in". A check-in with no name of its own is
   * named from what it is about, whoever runs it, and never after the lead.
   */
  it('names an ordinary check-in from what it is about, never after the lead', async () => {
    const { effectiveFallbackGroundName } = await import('./EntryChatPage')
    expect(effectiveFallbackGroundName('NEW_PROJECT', [], 'A new project is starting.', undefined)).toBe('Project updates')
    expect(effectiveFallbackGroundName('PULSE_CHECK', [], 'I want updates from my sales team on deals.', undefined)).toBe('Sales updates')
    expect(effectiveFallbackGroundName('PIP', ['Daniel'], 'Daniel is not delivering.', undefined)).toBe('Help someone get back on track')
    expect(effectiveFallbackGroundName('PIP', ['Daniel'], 'Daniel is not delivering.', undefined)).not.toMatch(/['’]s check-in/)
    /* The new hire's own rule stays: the check-in is about the new hire. */
    expect(effectiveFallbackGroundName('NEW_HIRE', ['Imani Wekesa'], 'Imani starts next week.', undefined)).toBe('Imani, first 90 days')
  })
})

describe('"You picked", in plain words (U.6 review)', () => {
  it('"Help someone get back on track" reads the prototype’s lines and examples', () => {
    render(<EverySituation signedIn={false} openerFor={() => 'A sentence.'} onSend={() => {}} onStart={() => {}} onDescribe={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /^Help someone get back on track/ }))
    const panel = screen.getByRole('complementary', { name: 'You picked' })
    expect(within(panel).getByText('You put their side and yours written down before you talk.')).toBeTruthy()
    expect(within(panel).getByText('A senior hire’s delivery is slipping and you both want the real picture before the conversation.')).toBeTruthy()
    expect(within(panel).getByText('You’re putting someone on a formal plan and want both sides on the concern and what good looks like.')).toBeTruthy()
    /* Not true on the server, so not said. */
    expect(panel.textContent).not.toContain('Neither of you sees the other’s answers')
    for (const old of ['he-said-she-said', 'letting them go', 'capability concern']) expect(panel.textContent).not.toContain(old)
  })

  it('every situation has two examples, each a full sentence, with none of the old jargon', async () => {
    const { FOR_EXAMPLE } = await import('./the-way-in')
    const { SCENARIOS } = await import('@/pages/grounds/CreateGroundPage')
    for (const card of SCENARIOS.filter((c) => c.scenario !== 'OPEN_READ')) {
      const two = FOR_EXAMPLE[card.cardKey]
      expect(two, card.cardKey).toHaveLength(2)
      for (const e of two) {
        expect(e, card.cardKey).toMatch(/^[A-Z].*[.?]$/)
        expect(e).not.toMatch(/re-litigate|he-said-she-said|offsite|lightweight|signal/)
      }
    }
  })
})

describe('who is on the list, in sentences (U.6 review)', () => {
  /* Read live: "Waiting to send (1): u6f-daniel@example.test." and "✓ u6f-daniel@example.test -
     Daniel - He is the subject of this check-in…". The lead's page only. */
  it('says who is waiting in a sentence', async () => {
    const { whoIsWaitingSentence } = await import('./EntryChatPage')
    expect(whoIsWaitingSentence(['u6f-daniel@example.test'])).toBe('u6f-daniel@example.test is waiting to be invited.')
    expect(whoIsWaitingSentence(['a@x.test', 'b@x.test', 'c@x.test'])).toBe('a@x.test, b@x.test and c@x.test are waiting to be invited.')
  })
  /* Screen fault 6(b), live walk 6 October 2026: "Your note:" was a label on a colon ("note:"),
     which CLAUDE.md's wording rule forbids - "You wrote" and the words in quotation marks say who said it, with no colon. */
  it('says each person added without dashes', async () => {
    const { anEntryAsASentence } = await import('./EntryChatPage')
    expect(anEntryAsASentence('u6f-daniel@example.test - Daniel - He is the subject of this check-in'))
      .toBe('u6f-daniel@example.test (Daniel). Groundwork noted “He is the subject of this check-in”.')
    /* Pilots, 13 October 2026, problem 10: the note is Groundwork's suggestion, so it is no longer said as "You wrote". */
    expect(anEntryAsASentence('a@x.test - Runs the pipeline.')).toBe('a@x.test. Groundwork noted “Runs the pipeline”.')
    expect(anEntryAsASentence('a@x.test')).toBe('a@x.test.')
  })
})
