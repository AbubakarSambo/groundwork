import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { EntryChatPage } from './EntryChatPage'
import { THE_ANCHOR_FIRST_QUESTION } from './TheSetup'

/*
 * FAULT 1 (request, 6 October 2026, live walk against the anchor scenario): "Help my team
 * understand" landed on the ordinary signed-out door ("What do you need updates on, or want to
 * track?"), with its five example cards, instead of entering the anchor's own conversation at
 * once (docs/anchor-scenario-plan.md section 5, "The landing page... enters the scenario at
 * once"). The cause was `EntryChatPage.tsx` treating an arrival as already picked only when
 * `?scenario=` named a card in `SITUATION_CARDS`, which `HELP_TEAM_UNDERSTAND` never does.
 *
 * This checks the fix straight from the rendered page: the door and the picker are gone, the
 * engine's own opening line is what a lead reads, and what she types herself - never a canned
 * message - is what reaches the API, carrying `HELP_TEAM_UNDERSTAND` as the request's own
 * `scenario` field. It also checks the plan's own rule that this only happens while the anchor
 * switch is confirmed on for this tab (`gw-anchor-start-confirmed`) - a stale
 * `?scenario=HELP_TEAM_UNDERSTAND` link, with no such confirmation, keeps today's ordinary door.
 *
 * UPDATED FOR DECISION 114 (docs/decisions-merged.md; docs/answers-from-engine.md, "8 October:
 * decision 114, the anchor changes no screen"): `AnchorLandingPage.tsx` is gone, and
 * `EntryChatPage.tsx` is now the one caller of `GET /entry/anchor-start` - it makes that call
 * itself on a fresh `?scenario=HELP_TEAM_UNDERSTAND` arrival whose confirmation flag is not
 * already set, so `entryAnchorApi` is mocked here too. The "confirmed on" cases below set the flag
 * up front, the same as before, so that call never fires for them (`enabled` reads the flag); the
 * "stale" case leaves it unset and lets the call answer 404, exactly what a real stale link gets
 * back from the engine once the switch is off.
 */

const onboardStream = vi.fn().mockResolvedValue({ reply: 'What is going on for you right now?', extracted: {} })
const anchorStart = vi.fn().mockRejectedValue(new Error('404'))
vi.mock('@/api/entry', () => ({
  entryApi: {
    opener: vi.fn().mockResolvedValue({ reply: '' }),
    chat: vi.fn(), report: vi.fn(), onboard: vi.fn(), classifyIntent: vi.fn(),
    onboardStream: (...a: unknown[]) => onboardStream(...a),
  },
  entryAnchorApi: { start: (...a: unknown[]) => anchorStart(...a) },
}))
vi.mock('@/api/auth', () => ({ authApi: { entrySave: vi.fn() } }))
vi.mock('@/stores/auth', () => ({ useAuthStore: (sel: any) => sel({ user: null, isAuthenticated: false }) }))

function openAnchorArrival() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/start?scenario=HELP_TEAM_UNDERSTAND']}>
        <EntryChatPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  onboardStream.mockClear()
  anchorStart.mockClear()
  anchorStart.mockRejectedValue(new Error('404'))
})

describe('an anchor arrival, with the switch confirmed on', () => {
  beforeEach(() => {
    sessionStorage.setItem('gw-anchor-start-confirmed', '1')
  })

  it('opens on the plan’s own first question, with no door and no situation picker', async () => {
    openAnchorArrival()
    expect(await screen.findByText(THE_ANCHOR_FIRST_QUESTION)).toBeTruthy()
    // The door's own heading, examples and "Continue" are gone.
    expect(screen.queryByRole('heading', { level: 1, name: 'What do you need updates on, or want to track?' })).toBeNull()
    expect(screen.queryByText('Sales are behind and I don’t know why')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Continue' })).toBeNull()
    expect(screen.queryByText('Rather pick from a list?', { exact: false })).toBeNull()
  })

  it('opens on the engine’s served firstQuestion instead, when AnchorLandingPage.tsx carried one', async () => {
    sessionStorage.setItem('gw-anchor-first-question', 'What is really going on for your team?')
    openAnchorArrival()
    expect(await screen.findByText('What is really going on for your team?')).toBeTruthy()
    expect(screen.queryByText(THE_ANCHOR_FIRST_QUESTION)).toBeNull()
  })

  it('sends only what the lead typed, carrying HELP_TEAM_UNDERSTAND as the request’s own scenario field', async () => {
    openAnchorArrival()
    await screen.findByText(THE_ANCHOR_FIRST_QUESTION)
    /* Fault 7 (live walk, 6 October 2026): placeholder shortened, so it is never clipped at 375px. */
    const box = screen.getByPlaceholderText('Type your response, or add a document.')
    fireEvent.change(box, { target: { value: 'Nobody on my team sees how the renewals land.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }))
    await waitFor(() => expect(onboardStream).toHaveBeenCalled())
    const [messages, scenario] = onboardStream.mock.calls[0] as [{ role: string; content: string }[], string | undefined]
    // Never a card's own canned sentence - only the words she actually typed.
    expect(messages[messages.length - 1]).toEqual({ role: 'user', content: 'Nobody on my team sees how the renewals land.' })
    expect(scenario).toBe('HELP_TEAM_UNDERSTAND')
  })
})

describe('a stale ?scenario=HELP_TEAM_UNDERSTAND, with the switch not confirmed on', () => {
  it('asks the engine itself, and keeps today’s ordinary door once it answers 404', async () => {
    // sessionStorage is empty here - nothing has ever confirmed anchor-start for this tab.
    openAnchorArrival()
    expect(await screen.findByRole('heading', { level: 1, name: 'What do you need updates on, or want to track?' })).toBeTruthy()
    expect(screen.queryByText(THE_ANCHOR_FIRST_QUESTION)).toBeNull()
    expect(screen.getByRole('button', { name: 'Sales are behind and I don’t know why' })).toBeTruthy()
    // DECISION 114: this page is now the one that asks, where AnchorLandingPage.tsx used to.
    expect(anchorStart).toHaveBeenCalledWith(null)
  })
})

describe('a fresh ?scenario=HELP_TEAM_UNDERSTAND, which EntryChatPage.tsx itself confirms', () => {
  it('opens on the engine’s own served opening line once GET /entry/anchor-start succeeds', async () => {
    anchorStart.mockResolvedValue({
      available: true, scenario: 'HELP_TEAM_UNDERSTAND', startedFrom: 'anchor',
      groundLabel: 'Help my team understand', source: null,
      firstQuestion: 'What is really going on for your team?',
    })
    openAnchorArrival()
    expect(await screen.findByText('What is really going on for your team?')).toBeTruthy()
    expect(screen.queryByRole('heading', { level: 1, name: 'What do you need updates on, or want to track?' })).toBeNull()
    expect(sessionStorage.getItem('gw-anchor-start-confirmed')).toBe('1')
  })
})
