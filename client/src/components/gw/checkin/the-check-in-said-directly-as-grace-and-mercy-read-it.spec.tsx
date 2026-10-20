import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { readFileSync } from 'fs'
import { join } from 'path'
import { TheEndCard } from './TheEndCard'
import { TheCheckInHeader } from './TheCheckInHeader'
import { TheDonePage } from './TheDonePage'
import { TheDirectMorning } from '@/lib/the-direct-morning'
import { groundsApi } from '@/api/grounds'
import CARDS from './__fixtures__/night-run-2-end-cards.json'

/**
 * THE CHECK-IN'S OWN FIXED LINES, SAID DIRECTLY (the direct morning, Hafsah, 20 October 2026). The end cards are the ones the API served
 * Grace Achieng (she runs "Sales team, Q4" at Drop Access and checks in too) and Mercy Wairimu (a rep, on the web) at the end of their
 * check-ins on Monday 19 October, in the second night run.
 *
 * OFF, every line reads as it did. ON, what goes in the record and what happens next stay, word for word; the lines that reassure,
 * explain the report or say who sees it are gone. Who sees what is the backend's rule, the same either way.
 */
vi.mock('@/api/grounds', () => ({ groundsApi: { get: vi.fn(), getMyCheckinStatus: vi.fn(async () => ({ checkIns: [] })) } }))
vi.mock('@/api/conversation', () => ({ conversationApi: { artifact: vi.fn(async () => ({ artifact: { whatToCarry: 'Arrange the delivery of Mama Rose’s dispenser.' } })) } }))

const mercy = (CARDS as any).mercy.endCard
const grace = (CARDS as any).grace.endCard
const card = (engine: any, on: boolean, leadName: string | null) => render(
  <TheDirectMorning on={on}>
    <TheEndCard engine={engine} leadName={leadName} nextOpens="Your next check-in opens tomorrow at 8am." othersCanSeeWhatYouSay finishing={false} onFinish={() => {}} onChange={() => {}} />
  </TheDirectMorning>,
)
const text = () => document.body.textContent ?? ''

describe('the end card, as Mercy reads it', () => {
  it('off: why answering matters, the reassurance and who sees it, as before', () => {
    card(mercy, false, 'Grace')
    fireEvent.click(screen.getByText('Why answering matters, and what happens next'))
    expect(text()).toContain('Grace also answers a check-in. The report puts the answers side by side. It shows where you agree and where you see things differently. It does not decide who is right.')
    expect(text()).toContain('If you don’t want to talk about something yet, that’s fine. You can leave it for now.')
    expect(text()).toContain('Your team will see what you said today, and a short summary of what moved.')
  })

  it('on: what goes in her record and what happens next, and none of the rest', () => {
    card(mercy, true, 'Grace')
    expect(screen.getByText('What goes in your record')).toBeTruthy()
    expect(screen.getByText('It confirms the order for 25 units from Greenfield Supermarket at KES 125,000, and it\'s signed.')).toBeTruthy()
    expect(screen.getByText('Your next check-in opens tomorrow at 8am.')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'What happens next' })).toBeTruthy()
    expect(screen.getByText('There are 2 more lines in your record. You can read them all in your record after you finish.')).toBeTruthy()
    expect(text()).not.toMatch(/does not decide who is right|that’s fine|Your team will see|Why answering matters/)
  })
})

describe('the end card, as Grace reads it', () => {
  it('on: her own lines, and no line about anybody else seeing them', () => {
    card(grace, true, null)
    expect(screen.getByText('What goes in your record')).toBeTruthy()
    expect(text()).not.toMatch(/that’s fine|Your team will see|stays yours alone/)
  })
})

describe('the check-in header’s Pause menu', () => {
  const header = (on: boolean) => {
    render(<TheDirectMorning on={on}><TheCheckInHeader title="Sales team, Q4" underTitle={on ? 'A few minutes' : 'About ten minutes'} mayPause onStopForNow={() => {}} onSkip={() => {}} /></TheDirectMorning>)
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }))
  }
  it('off, as before', () => {
    header(false)
    expect(text()).toContain('Everything you have said is saved. You can come back to it any time.')
    expect(text()).toContain('You can say no. You will see what that means before anything is recorded.')
  })
  it('on, each choice says what it does and nothing that defends the product', () => {
    header(true)
    expect(screen.getByText('Stop for now')).toBeTruthy()
    expect(screen.getByText('You can come back to it later.')).toBeTruthy()
    expect(screen.getByText('Skip this check-in')).toBeTruthy()
    expect(text()).not.toMatch(/You can say no|before anything is recorded|Everything you have said is saved/)
  })
})

describe('the Done page, as Mercy reads it', () => {
  const GROUND = (on: boolean) => ({
    label: 'Sales team, Q4', directMorningOn: on,
    participants: [
      { id: 'p-grace', partyType: 'INITIATOR', userId: 'u-grace', user: { firstName: 'Grace', lastName: 'Achieng' }, managingOnly: false },
      { id: 'p-mercy', partyType: 'PARTICIPANT', userId: 'u-mercy', managingOnly: false },
    ],
    aTeamReportComes: true, viewerIsInitiator: false, leadFirstName: 'Grace', leadAnswersToo: true,
    report: { id: 'r1', releasedAt: null },
    checkIns: [{ id: 'ci-mercy-6', sessionNumber: 6, specificityDimensions: { delivery: 'specific', evidence: 'specific', enablement: 'vague', coverage: 'specific', commitment: 'specific' } }],
  })
  const done = (on: boolean) => {
    ;(groundsApi.get as any).mockResolvedValue(GROUND(on))
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    return render(<QueryClientProvider client={qc}><MemoryRouter><TheDonePage firstName="Mercy" checkInId="ci-mercy-6" groundId="g1" sessionNumber={6} myUserId="u-mercy" isInitiator={false} /></MemoryRouter></QueryClientProvider>)
  }
  it('off: why answering matters, "Only you", and the two lines under how checkable it was, as before', async () => {
    done(false)
    await screen.findByText('Grace also answers a check-in. The report puts the answers side by side. It does not decide who is right.')
    expect(screen.getByText('Only you')).toBeTruthy()
    expect(text()).toContain('Groundwork looked for these five things. It may have missed some of what you said.')
    expect(text()).toContain('This is about the check-in. Only you see it.')
  })
  it('on: what to carry, her two reports, and nothing that explains or reassures', async () => {
    done(true)
    await screen.findByText('Arrange the delivery of Mama Rose’s dispenser.')
    expect(screen.getByText('Done. Thanks, Mercy.')).toBeTruthy()
    expect(screen.getByText('Your own report')).toBeTruthy()
    expect(screen.getByText('The team’s report')).toBeTruthy()
    expect(screen.getByText('Everyone’s check-ins together. You’ll get it once everyone has answered.')).toBeTruthy()
    expect(screen.queryByText('Only you')).toBeNull()
    expect(text()).not.toMatch(/does not decide who is right|It may have missed|Only you see it|Why answering matters/)
  })
})

describe('the check-in page itself (pages/chat/ChatPage.tsx)', () => {
  const page = readFileSync(join(__dirname, '..', '..', '..', 'pages', 'chat', 'ChatPage.tsx'), 'utf8')
  it('reads the switch from the check-in it already holds, and says it once for everything inside', () => {
    expect(page).toContain('const direct = isTheDirectMorningOn(ground.data)')
    expect(page).toContain('<TheDirectMorning on={direct}>')
  })
  it('with it on, a few minutes, and no "You are not expected to agree" or "Nothing you have written here is shown to anyone"', () => {
    expect(page).toContain(": direct ? 'A few minutes' : 'About ten minutes'")
    expect(page).toContain('{!direct && <p className="gwui-panel-text-muted">Answer in your own words. You are not expected to agree with any of it.</p>}')
    expect(page).toContain('{!direct && <li>Nothing you have written here is shown to anyone.</li>}')
  })
})
