import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { InvitePage } from './InvitePage'
import { participantsApi } from '@/api/participants'

/**
 * THE INVITATION, FOR AN ANCHOR GROUND (plan piece 11; docs/anchor-scenario-plan.md section 5 row
 * 5; docs/anchor-scenario.md section 14, "the team invitation psychology"; docs/answers-from-engine
 * .md, "Request 147", `TheAnchorInvitation` - shape only, not served yet).
 *
 * Only when the preview serves `anchorInvitation` does the page draw its own heading, lines and
 * button; every other invitation is exactly as it reads today. The prototype's own sentence about
 * who can read this (`whoCanReadThis`) is kept either way.
 */

vi.mock('@/api/participants', () => ({
  participantsApi: { preview: vi.fn(), accept: vi.fn() },
}))
vi.mock('@/stores/auth', () => ({
  useAuthStore: (sel: any) => sel({ setAuth: vi.fn(), user: null, isAuthenticated: false }),
}))
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<any>('react-router-dom')
  return { ...actual, useNavigate: () => vi.fn() }
})

function renderInvite() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/join?token=tok']}>
        <Routes><Route path="/join" element={<InvitePage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const anchorInvitation = {
  subject: "Hafsah is trying a different way to help the team get on the same page",
  heading: 'Hafsah is trying a different way to help the team get on the same page.',
  lines: [
    "For the next month, Groundwork will check in with each person one to one about the work you're doing, what you're seeing, what's getting in the way and how it connects to the bigger picture.",
    'Hafsah wants to hear your side.',
    "There aren't right answers. The point is to help the team understand one another better and make the work move.",
  ],
  leadHasSharedWhatTheyAreSeeing: false,
  button: 'Start your first check-in',
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('the invitation, for an anchor Ground', () => {
  it('draws the engine’s own heading, lines and button when anchorInvitation is served', async () => {
    ;(participantsApi.preview as any).mockResolvedValue({
      groundLabel: 'Help my team understand', initiatorName: 'Hafsah', leadFirstName: 'Hafsah',
      scenario: 'HELP_TEAM_UNDERSTAND', alreadyAccepted: false, anchorInvitation,
    })
    renderInvite()
    expect(await screen.findByText(anchorInvitation.heading)).toBeTruthy()
    for (const line of anchorInvitation.lines) {
      expect(screen.getByText(line)).toBeTruthy()
    }
    expect(screen.getByRole('button', { name: anchorInvitation.button })).toBeTruthy()
    expect(screen.queryByText('Answer today’s check-in now')).toBeNull()
    // The prototype's own sentence about who can read this stays, unchanged.
    expect(screen.getByText(/The people in this check-in, including your manager, can see what you say in it\./)).toBeTruthy()
  })

  it('is exactly as today when anchorInvitation is not served', async () => {
    ;(participantsApi.preview as any).mockResolvedValue({
      groundLabel: 'Sales targets', initiatorName: 'Hafsah', leadFirstName: 'Hafsah',
      scenario: 'NEW_PROJECT', alreadyAccepted: false,
    })
    renderInvite()
    expect(await screen.findByRole('button', { name: 'Answer today’s check-in now' })).toBeTruthy()
    expect(screen.queryByText(anchorInvitation.heading)).toBeNull()
  })
})
