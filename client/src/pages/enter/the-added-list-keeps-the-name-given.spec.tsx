import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { EntryChatPage } from './EntryChatPage'

/**
 * FAULT 3 (WALK ITEM 3, PART 1): NAMES ARE DROPPED AFTER THE PEOPLE STEP.
 *
 * The anchor's people step asks for a Name beside each email (section 13), and the name reached
 * the commit payload (`displayName`, request 166) - but it never reached what the lead actually
 * reads on screen. Walked live: the added list showed "✓ musa@anchor.test" and the "Check your
 * email" confirmation said "musa@anchor.test is waiting to be invited.", though Musa had been
 * given a name moments before.
 *
 * `shownAs` (EntryChatPage.tsx) now reads `displayNames` for a plain address and shows
 * "Name (address)" wherever that address is listed - the added chip list and the waiting
 * sentence both go through it, so both are fixed together.
 */

vi.mock('@/api/entry', () => ({
  entryApi: { opener: vi.fn().mockResolvedValue({ reply: '' }), chat: vi.fn(), report: vi.fn(), onboard: vi.fn(), classifyIntent: vi.fn() },
}))
vi.mock('@/api/auth', () => ({
  authApi: { entrySave: vi.fn().mockResolvedValue({ draftToken: 'draft-anchor-names' }) },
}))
vi.mock('@/stores/auth', () => ({ useAuthStore: (sel: any) => sel({ user: null, isAuthenticated: false }) }))

function seedClosedAnchorSession() {
  localStorage.setItem('gw_entry_session', JSON.stringify({
    closed: true,
    onboardingStep: 7,
    history: [{ role: 'assistant', content: 'hi' }, { role: 'user', content: 'ship it' }],
    report: JSON.stringify({ alignmentStatus: 'Clear', whatGroundworkSaw: 'x', alignmentBasis: '', areasRequiringAlignment: [], alignmentReached: [], honestClose: { aligned: '', open: '', revisit: '', risk: '' }, mentionedPeople: [], suggestedParties: [] }),
    onboardingSelections: { mode: 'new', initial: 'Help my team understand', classifiedScenario: 'HELP_TEAM_UNDERSTAND' },
  }))
}

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/start']}>
        <EntryChatPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('the added list and the waiting sentence keep the name given', () => {
  beforeEach(() => { localStorage.clear(); vi.clearAllMocks() })

  it('shows "Name (email)" on the added chip, not the email alone', async () => {
    seedClosedAnchorSession()
    renderPage()
    await screen.findByText('Who needs to be part of this?')

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Musa Bello' } })
    fireEvent.change(screen.getByPlaceholderText('name@company.com'), { target: { value: 'musa@anchor.test' } })
    fireEvent.click(screen.getByText('Add'))
    await screen.findByText('What do they do / why are they part of this?')
    fireEvent.click(screen.getByText('Skip'))

    await waitFor(() => expect(screen.getByText('✓ Musa Bello (musa@anchor.test).')).toBeTruthy())
    expect(screen.queryByText('✓ musa@anchor.test.')).toBeNull()
  })

  it('names the person, not just the address, in "is waiting to be invited"', async () => {
    seedClosedAnchorSession()
    renderPage()
    await screen.findByText('Who needs to be part of this?')

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Musa Bello' } })
    fireEvent.change(screen.getByPlaceholderText('name@company.com'), { target: { value: 'musa@anchor.test' } })
    fireEvent.click(screen.getByText('Add'))
    await screen.findByText('What do they do / why are they part of this?')
    fireEvent.click(screen.getByText('Skip'))
    await waitFor(() => expect(screen.queryByText('What do they do / why are they part of this?')).toBeNull())

    fireEvent.change(screen.getByPlaceholderText('your@email.com'), { target: { value: 'lead@example.test' } })
    fireEvent.submit(screen.getByPlaceholderText('your@email.com').closest('form')!)

    await screen.findByText('Check your email')
    expect(screen.getByText(/Musa Bello \(musa@anchor\.test\) is waiting to be invited\./)).toBeTruthy()
  })

  it('an email added with no name still shows the address alone', async () => {
    seedClosedAnchorSession()
    renderPage()
    await screen.findByText('Who needs to be part of this?')

    fireEvent.change(screen.getByPlaceholderText('name@company.com'), { target: { value: 'bello@example.test' } })
    fireEvent.click(screen.getByText('Add'))
    await screen.findByText('What do they do / why are they part of this?')
    fireEvent.click(screen.getByText('Skip'))

    await waitFor(() => expect(screen.getByText('✓ bello@example.test.')).toBeTruthy())
  })
})
