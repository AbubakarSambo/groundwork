import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

/**
 * SETTING UP A CHECK-IN ASKS FOR A PHONE NUMBER BESIDE EACH PERSON (Hafsah, 30 October 2026: always shown, labelled "Phone number",
 * and only what mentions WhatsApp is hidden while it is off). Once the check-in is saved and they are on it, each number goes through
 * PATCH /grounds/:id/participants/:participantId/whatsapp-number, the one writer for a lead's number (theNumbersGivenInTheSetup).
 */
let whatsappOn = false
vi.mock('@/lib/whatsapp-is-on', () => ({ useWhatsAppIsOn: () => whatsappOn }))
vi.mock('@/api/entry', () => ({
  entryApi: { opener: vi.fn().mockResolvedValue({ reply: '' }), chat: vi.fn(), report: vi.fn(), onboard: vi.fn(), classifyIntent: vi.fn(),
    peopleOnLines: vi.fn(async (t: string) => (await import('./a-team-read-in-a-spec')).readLikeTheServer(t)) },
}))
vi.mock('@/api/auth', () => ({ authApi: { entrySave: vi.fn().mockResolvedValue({ draftToken: 'draft-phone' }) } }))
vi.mock('@/stores/auth', () => ({ useAuthStore: (sel: any) => sel({ user: null, isAuthenticated: false }) }))
vi.mock('@/api/grounds', () => ({ groundsApi: { get: vi.fn(), addTheirWhatsAppNumber: vi.fn(async () => ({ said: 'kept' })) } }))
vi.mock('sonner', () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() }) }))

import { groundsApi } from '@/api/grounds'
import { toast } from 'sonner'
import { EntryChatPage, theNumbersGivenInTheSetup } from './EntryChatPage'

function seedClosedAnchorSession() {
  localStorage.setItem('gw_entry_session', JSON.stringify({
    closed: true,
    onboardingStep: 7,
    history: [{ role: 'assistant', content: 'hi' }, { role: 'user', content: 'ship it' }],
    report: JSON.stringify({ alignmentStatus: 'Clear', whatGroundworkSaw: 'x', alignmentBasis: '', areasRequiringAlignment: [], alignmentReached: [], honestClose: { aligned: '', open: '', revisit: '', risk: '' }, mentionedPeople: [], suggestedParties: [] }),
    onboardingSelections: { mode: 'new', initial: 'Help my team understand', classifiedScenario: 'HELP_TEAM_UNDERSTAND' },
  }))
}
const renderPage = () => render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
    <MemoryRouter initialEntries={['/start']}><EntryChatPage /></MemoryRouter>
  </QueryClientProvider>,
)

describe('the people step of the setup', () => {
  beforeEach(() => { localStorage.clear(); vi.clearAllMocks() })

  /* UPDATED (Hafsah, 31 October 2026: one team box): the number is asked on each person's line, "a name, an email and a phone number". */
  it('asks for a phone number on each line with WhatsApp off, saying nothing about WhatsApp', async () => {
    whatsappOn = false
    seedClosedAnchorSession()
    renderPage()
    await screen.findByText('Who needs to be part of this?')
    expect(screen.getByText(/One per line: a name, an email and a phone number\./)).toBeTruthy()
    expect(screen.queryByText(/With a phone number, their check-ins can also reach them on WhatsApp/)).toBeNull()
  })

  it('says what a phone number does with WhatsApp on', async () => {
    whatsappOn = true
    seedClosedAnchorSession()
    renderPage()
    await screen.findByText('Who needs to be part of this?')
    expect(screen.getByText(/With a phone number, their check-ins can also reach them on WhatsApp\./)).toBeTruthy()
  })
})

describe('once the check-in is saved', () => {
  beforeEach(() => vi.clearAllMocks())

  it('saves each number to the person it was typed beside, through the number endpoint', async () => {
    vi.mocked(groundsApi.get).mockResolvedValue({ participants: [{ id: 'p-musa', email: 'musa@anchor.test' }, { id: 'p-ada', email: 'ada@anchor.test' }] } as any)
    await theNumbersGivenInTheSetup('g1', { 'musa@anchor.test': '+254 712 345 678' }, false)
    expect(groundsApi.addTheirWhatsAppNumber).toHaveBeenCalledWith('g1', 'p-musa', '+254 712 345 678')
    expect(groundsApi.addTheirWhatsAppNumber).toHaveBeenCalledTimes(1)
  })

  it('a number that does not save says so, without WhatsApp while it is off, and the check-in stands', async () => {
    vi.mocked(groundsApi.get).mockResolvedValue({ participants: [{ id: 'p-musa', email: 'musa@anchor.test' }] } as any)
    vi.mocked(groundsApi.addTheirWhatsAppNumber).mockRejectedValueOnce({ response: { data: { message: 'The WhatsApp number could not be saved.' } } })
    await theNumbersGivenInTheSetup('g1', { 'musa@anchor.test': '0712' }, false)
    expect(toast.error).toHaveBeenCalledWith('The phone number for musa@anchor.test did not save. The check-in is saved, and they are on it.')
  })
})
