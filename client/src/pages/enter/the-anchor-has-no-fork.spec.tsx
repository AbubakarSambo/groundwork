import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { EntryChatPage } from './EntryChatPage'
import { entryApi } from '@/api/entry'
import { THE_ANCHOR_FIRST_QUESTION } from './TheSetup'

/**
 * REQUEST 165, "THE REST OF THE ANCHOR'S WALK" (docs/answers-from-engine.md, 6 October).
 *
 * Every other situation's set-up conversation reaches `ready` and then asks the fork - "I set this
 * up and check in myself" against "I check in once to set the context, then only they check in" -
 * and whichever is picked opens an ordinary first check-in that asks her opening question again.
 * The anchor's own set-up conversation IS the one conversation: once the engine says `ready`, there
 * is nothing left to ask and nowhere else to go but the reveal, then the people step. The spec has
 * no fork and no second conversation for the anchor; every other situation keeps its fork exactly
 * as it was.
 */

const onboardStream = vi.fn()
vi.mock('@/api/entry', () => ({
  entryApi: {
    opener: vi.fn().mockResolvedValue({ reply: '' }),
    chat: vi.fn(),
    report: vi.fn().mockResolvedValue({ report: null }),
    onboard: vi.fn(),
    onboardStream: (...a: unknown[]) => onboardStream(...a),
    classifyIntent: vi.fn().mockResolvedValue({ scenario: null, confidence: 'low' }),
  },
}))
vi.mock('@/api/auth', () => ({ authApi: { entrySave: vi.fn().mockResolvedValue({ draftToken: 'd-token' }) } }))
vi.mock('@/stores/auth', () => ({ useAuthStore: (sel: any) => sel({ user: null, isAuthenticated: false }) }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }))

function renderPage(initialEntry: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[initialEntry]}><EntryChatPage /></MemoryRouter>
    </QueryClientProvider>,
  )
}

function openAnchorArrival() {
  sessionStorage.setItem('gw-anchor-start-confirmed', '1')
  return renderPage('/start?scenario=HELP_TEAM_UNDERSTAND')
}

async function sendOnboardingMessage(text: string) {
  const box = await screen.findByPlaceholderText('Type your response, or add a document.')
  fireEvent.change(box, { target: { value: text } })
  fireEvent.click(screen.getByRole('button', { name: 'Send message' }))
}

const REVEAL = {
  title: 'Help my team understand',
  subtitle: 'One-month Groundwork',
  carrying: 'Keeping renewals on track',
  whatTheTeamNeedsToUnderstand: null,
  sharedWithTheTeam: false,
  whoYouAreTryingToMove: 'My whole team',
  seeingToday: null,
  whatMeaningfulChangeWouldLookLike: [],
  whatGroundworkWillExplore: [],
  howIWillWorkWithYourTeam: [],
}

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  vi.clearAllMocks()
  onboardStream.mockReset()
  ;(entryApi.report as any).mockResolvedValue({
    report: {
      alignmentStatus: 'Clear', whatGroundworkSaw: 'x', alignmentBasis: '', areasRequiringAlignment: [],
      alignmentReached: [], honestClose: { aligned: '', open: '', revisit: '', risk: '' }, mentionedPeople: [],
      suggestedParties: [], leadsReveal: REVEAL,
    },
  })
})

describe('an anchor draft at ready', () => {
  it('goes straight to the reveal and then the people step, never the fork', async () => {
    onboardStream.mockResolvedValueOnce({
      reply: 'Thank you, I have what I need.',
      extracted: {
        responsibleFor: 'Keeping renewals on track', tryingToMove: 'My whole team',
        howItContributes: 'They keep renewals coming in', seeingToday: 'Tickets closed too soon',
        whyItBothersYou: 'We lose renewals we never saw coming',
        whatTheyDontUnderstand: 'A closed ticket is not a happy customer',
        whatTheyWouldDoDifferently: 'Check with the account before closing anything',
      },
      ready: true,
      needsPeople: true,
    })

    openAnchorArrival()
    await screen.findByText(THE_ANCHOR_FIRST_QUESTION)

    await sendOnboardingMessage('Nobody on my team sees how the renewals land.')

    // Straight to the reveal - no fork in between.
    await screen.findByText('Help my team understand')
    expect(screen.queryByText('I set this up and check in myself')).toBeNull()
    expect(screen.queryByText('I check in once to set the context, then only they check in')).toBeNull()

    // And then the people step, on the same screen.
    await screen.findByText('Who needs to be part of this?')

    // No second conversation was ever started: nothing re-asks her opening question.
    expect(entryApi.chat).not.toHaveBeenCalled()
  })
})

describe('every other situation', () => {
  it('still shows the fork once its own set-up conversation is ready', async () => {
    onboardStream.mockResolvedValueOnce({
      reply: 'Thank you, that gives me what I need.',
      extracted: { initial: 'A new project is starting.' },
      ready: true,
      needsPeople: true,
    })

    renderPage('/start')
    const box = await screen.findByPlaceholderText('For example: our sales targets this quarter')
    fireEvent.change(box, { target: { value: 'A new project is starting.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))

    expect(await screen.findByText('I set this up and check in myself')).toBeTruthy()
    expect(screen.getByText('I check in once to set the context, then only they check in')).toBeTruthy()
  })
})
