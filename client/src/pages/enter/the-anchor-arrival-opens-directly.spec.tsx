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
 * switch is confirmed on for this tab (`gw-anchor-start-confirmed`, set by `AnchorLandingPage.tsx`
 * once `GET /entry/anchor-start` actually succeeds) - a stale `?scenario=HELP_TEAM_UNDERSTAND`
 * link, with no such confirmation, keeps today's ordinary door.
 */

const onboardStream = vi.fn().mockResolvedValue({ reply: 'What is going on for you right now?', extracted: {} })
vi.mock('@/api/entry', () => ({
  entryApi: {
    opener: vi.fn().mockResolvedValue({ reply: '' }),
    chat: vi.fn(), report: vi.fn(), onboard: vi.fn(), classifyIntent: vi.fn(),
    onboardStream: (...a: unknown[]) => onboardStream(...a),
  },
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
  it('keeps today’s ordinary door', async () => {
    // sessionStorage is empty here - no AnchorLandingPage.tsx visit ever confirmed anchor-start.
    openAnchorArrival()
    expect(await screen.findByRole('heading', { level: 1, name: 'What do you need updates on, or want to track?' })).toBeTruthy()
    expect(screen.queryByText(THE_ANCHOR_FIRST_QUESTION)).toBeNull()
    expect(screen.getByRole('button', { name: 'Sales are behind and I don’t know why' })).toBeTruthy()
  })
})
