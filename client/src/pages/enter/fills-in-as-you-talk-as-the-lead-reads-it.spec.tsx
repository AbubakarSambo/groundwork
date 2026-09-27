import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { FillsInAsYouTalk, type WhatSetupKnows } from './FillsInAsYouTalk'
import { EntryChatPage } from './EntryChatPage'

/*
 * THE PANEL THAT FILLS IN AS YOU TALK, AS THE LEAD READS IT (U.6, B1). Word for word against
 * docs/prototype/screens/B1-starting-a-check-in/new.txt, and only from what setup really holds.
 */

vi.mock('@/api/entry', () => ({
  entryApi: { opener: vi.fn().mockResolvedValue({ reply: '' }), chat: vi.fn(), report: vi.fn(), onboard: vi.fn(), classifyIntent: vi.fn() },
}))
vi.mock('@/api/auth', () => ({ authApi: { entrySave: vi.fn() } }))
vi.mock('@/stores/auth', () => ({ useAuthStore: (sel: any) => sel({ user: null, isAuthenticated: false }) }))

const nothingYet: WhatSetupKnows = {
  name: '', situation: '', cadence: 'FORTNIGHTLY', cadenceChosen: false, workingDays: [], startsOn: '', endsOn: '', mentioned: [], added: [],
}
const rows = () => screen.getAllByRole('listitem').map((li) => li.textContent)

describe('the panel, as the lead reads it', () => {
  it('knows nothing yet, and says nothing it does not know', () => {
    render(<FillsInAsYouTalk {...nothingYet} />)
    expect(screen.getByText('0 of 4 set')).toBeTruthy()
    expect(screen.getByText('Fills in as you talk. You can start without all of it.')).toBeTruthy()
    expect(rows()).toEqual(['○A name', '○How often', '○When it runs', '○Who’s in it'])
  })

  it('fills in as the conversation does: the prototype’s sales team', () => {
    render(<FillsInAsYouTalk
      name="Sales team, Q3" situation="Set goals and keep the team on track"
      cadence="DAILY" cadenceChosen workingDays={[1, 2, 3, 4, 5]} startsOn="2026-07-01" endsOn="2026-09-30"
      mentioned={['Aisha', 'Brian', 'David', 'Miriam', 'Samuel', 'Omar']}
      added={['Aisha Otieno', 'Brian Mwangi', 'David Kariuki', 'Miriam Wanjiku']}
    />)
    expect(screen.getAllByText('Sales team, Q3')).toHaveLength(2)
    expect(screen.getByText('Set goals and keep the team on track')).toBeTruthy()
    expect(screen.getByText('3 of 4 set')).toBeTruthy()
    const [name, often, when, who] = screen.getAllByRole('listitem')
    expect(name.textContent).toBe('✓A nameSales team, Q3')
    expect(often.textContent).toBe('✓How oftenEvery day, weekdays')
    expect(when.textContent).toBe('✓When it runs1 July to 30 September')
    expect(within(who).getByText('4 of 6 added')).toBeTruthy()
    expect(within(who).getByText('Miriam Wanjiku')).toBeTruthy()
    expect(within(who).getByText('2 more you mentioned: Samuel and Omar.')).toBeTruthy()
    expect(who.textContent?.startsWith('○')).toBe(true)
  })

  /* U.6 review: "1 you mentioned: Daniel." read as a fragment. Changed from that wording. */
  it('names the people mentioned before anybody is added', () => {
    render(<FillsInAsYouTalk {...nothingYet} mentioned={['Daniel']} />)
    expect(screen.getByText('You mentioned Daniel.')).toBeTruthy()
  })

  it('and joins two names in a sentence', () => {
    render(<FillsInAsYouTalk {...nothingYet} mentioned={['Aisha', 'Brian']} />)
    expect(screen.getByText('You mentioned Aisha and Brian.')).toBeTruthy()
  })
})

describe('on the setup conversation itself', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('gw_entry_session', JSON.stringify({
      scenario: 'NEW_HIRE', history: [], closed: false, onboardingStep: 1,
      groundName: 'Kwame, first 90 days', cadence: 'WEEKLY', cadenceChosen: true,
      onboardingSelections: { mode: 'new', initial: 'A new hire starts on Monday', peopleNamed: ['Kwame'], classifiedScenario: 'NEW_HIRE' },
      onboardingHistory: [
        { role: 'assistant', content: 'Opening.' },
        { role: 'user', content: 'A new hire starts on Monday.' },
        { role: 'assistant', content: 'Who is it, and what will they be doing?' },
      ],
    }))
  })

  it('shows what the conversation holds so far, beside it', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={['/start']}><EntryChatPage /></MemoryRouter>
      </QueryClientProvider>,
    )
    await waitFor(() => expect(screen.getByText('Who is it, and what will they be doing?')).toBeTruthy())
    const panel = screen.getByRole('complementary', { name: 'Fills in as you talk. You can start without all of it.' })
    expect(within(panel).getByText('Help a new hire get started')).toBeTruthy()
    expect(within(panel).getByText('2 of 4 set')).toBeTruthy()
    expect(within(panel).getByText('Every week')).toBeTruthy()
    expect(within(panel).getByText('You mentioned Kwame.')).toBeTruthy()
  })
})
