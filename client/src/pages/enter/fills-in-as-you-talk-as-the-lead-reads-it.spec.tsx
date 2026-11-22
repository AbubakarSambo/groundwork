import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { FillsInAsYouTalk, ReadyToSend, type WhatSetupKnows } from './FillsInAsYouTalk'
import { EntryChatPage } from './EntryChatPage'

/*
 * THE SUMMARY THAT FILLS IN AS YOU TALK, AS THE LEAD READS IT (U.6, B1), and only from what setup really holds.
 * CHANGED 3 NOVEMBER EVENING (Hafsah: "one quiet summary of what's been understood so far"): no "N of 4 set" count and no ticks;
 * each line is there once the conversation has given it. The tests below read the same facts as before, in the new shape.
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
    const { container } = render(<FillsInAsYouTalk {...nothingYet} />)
    expect(container.textContent).not.toMatch(/of 4 set|[✓○]|Fills in as you talk/)
    expect(screen.queryAllByRole('listitem')).toEqual([])
  })

  /* Setup page, piece 3a: walked on 13 October, "until 30 December" with no start said left this row
     empty. An end she said, or "when I end it", fills it; the situation's usual end does not. */
  it('says the end she named, or that it runs until she ends it, and never the usual end', () => {
    const { unmount } = render(<FillsInAsYouTalk {...nothingYet} endsOn="2026-12-30" endSaid />)
    expect(rows()).toEqual(['When it runsUntil 30 December'])
    unmount()
    const second = render(<FillsInAsYouTalk {...nothingYet} runsUntilEnded />)
    expect(rows()).toEqual(['When it runsUntil you end it'])
    second.unmount()
    render(<FillsInAsYouTalk {...nothingYet} endsOn="2026-12-30" />)
    expect(screen.queryAllByRole('listitem')).toEqual([])
  })

  it('fills in as the conversation does: the prototype’s sales team', () => {
    render(<FillsInAsYouTalk
      name="Sales team, Q3" situation="Set goals and keep the team on track"
      cadence="DAILY" cadenceChosen workingDays={[1, 2, 3, 4, 5]} startsOn="2026-07-01" endsOn="2026-09-30"
      mentioned={['Aisha', 'Brian', 'David', 'Miriam', 'Samuel', 'Omar']}
      added={['Aisha Otieno', 'Brian Mwangi', 'David Kariuki', 'Miriam Wanjiku']}
    />)
    /* new.txt: the name heads the panel and is its first line too, "A name". */
    expect(screen.getAllByText('Sales team, Q3')).toHaveLength(2)
    expect(screen.getByText('Set goals and keep the team on track')).toBeTruthy()
    const [name, often, when, who] = screen.getAllByRole('listitem')
    expect(name.textContent).toBe('A nameSales team, Q3')
    /* S18 (7 November): one wording for how often, the same as every other page. Was 'Every day, weekdays'. */
    expect(often.textContent).toBe('How oftenEvery weekday, Monday to Friday')
    expect(when.textContent).toBe('When it runs1 July to 30 September')
    expect(within(who).getByText('4 of 6 added')).toBeTruthy()
    expect(screen.getByText('Miriam Wanjiku')).toBeTruthy()
    expect(screen.getByText('2 more you mentioned: Samuel and Omar.')).toBeTruthy()
    expect(document.body.textContent).not.toMatch(/of 4 set|[✓○]/)
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

  /* Was "reads the name before the chip": there is no chip now. The name, when given, is the summary's first line. */
  it('reads the name first, in document order, with no chip after it', () => {
    const { container } = render(<FillsInAsYouTalk {...nothingYet} name="Sales team, Q3" />)
    expect(container.querySelector('aside')?.textContent).toBe('Sales team, Q3A nameSales team, Q3')
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
    const panel = screen.getByRole('complementary', { name: 'What is set so far' })
    expect(within(panel).getByText('Help a new hire get started')).toBeTruthy()
    expect(within(panel).queryByText(/of 4 set/)).toBeNull()
    expect(within(panel).getByText('Every week')).toBeTruthy()
    /* Named with no email: one line, and the email is given in the chat (new.txt, 22 November 2026). */
    expect(within(panel).getByText('You mentioned Kwame. Add their email in the chat.')).toBeTruthy()
  })
})

/* F5, stage 3: the team given in the conversation, as the panel shows it, and the end of setup in the panel (stage 5). */
describe('the team from the conversation, and ready to send', () => {
  const four = ['John Kamau, john@deals.test, 0722 124 856', 'Jane Wanjiku, jane@deals.test', 'Peter Mbugua, peter@deals.test', 'Mary Mwangi, mary@deals.test']
  it('lists each person under “Invited so far”, with Change beside every line, and says in one line who still needs an email', () => {
    let changed = 0
    render(<FillsInAsYouTalk {...nothingYet} people={four} noEmailYet={['Samuel', 'Omar']} onChange={() => { changed++ }} />)
    const who = screen.getAllByRole('listitem').find((li) => li.textContent?.startsWith('Who’s in it'))!
    expect(within(who).getByText('4 people')).toBeTruthy()
    expect(screen.getByText('Invited so far')).toBeTruthy()
    expect(screen.getByText('John Kamau, john@deals.test, 0722 124 856')).toBeTruthy()
    expect(screen.getByText('2 more you mentioned: Samuel and Omar. Add their emails in the chat.')).toBeTruthy()
    within(who).getByRole('button', { name: 'Change who’s in it' }).click()
    expect(changed).toBe(1)
    expect(screen.queryByLabelText('Your team, one per line')).toBeNull()
  })
  it('ends with what sending does and one button', () => {
    let sent = 0
    render(<FillsInAsYouTalk {...nothingYet} people={four} noEmailYet={[]} save={<ReadyToSend people={4} opens="Their first check-in opens on Tuesday 4 November." onSend={() => { sent++ }} sending={false} />} />)
    expect(screen.getByText('Ready to send when you are')).toBeTruthy()
    expect(screen.getByText('4 people get an invitation now. Their first check-in opens on Tuesday 4 November.')).toBeTruthy()
    screen.getByRole('button', { name: 'Send 4 invitations' }).click()
    expect(sent).toBe(1)
  })
  it('with nobody else on it, the one button is Start it', () => {
    render(<ReadyToSend people={0} opens="" onSend={() => {}} sending={false} />)
    expect(screen.getByRole('button', { name: 'Start it' })).toBeTruthy()
    expect(screen.getByText('Nobody else is on it yet. You can add people any time.')).toBeTruthy()
  })
  it('on a phone, is one line that opens it', () => {
    render(<FillsInAsYouTalk {...nothingYet} name="Deal progress" cadence="DAILY" cadenceChosen workingDays={[1, 2, 3, 4, 5]} people={four} noEmailYet={[]} asOneLine />)
    /* Hafsah's own form, 3 November evening: "4 people · Sales team". */
    expect(screen.getByText('4 people · Deal progress').tagName).toBe('SUMMARY')
  })
})
