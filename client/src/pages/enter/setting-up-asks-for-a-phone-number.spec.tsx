import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

/**
 * SETTING UP A CHECK-IN ASKS FOR A PHONE NUMBER BESIDE EACH PERSON (Hafsah, 30 October 2026: always shown, labelled "Phone number",
 * and only what mentions WhatsApp is hidden while it is off). Once the check-in is saved and they are on it, each number goes through
 * PATCH /grounds/:id/participants/:participantId/whatsapp-number's writer, the one writer for a lead's number, which the save itself calls.
 */
let whatsappOn = false
vi.mock('@/lib/whatsapp-is-on', () => ({ useWhatsAppIsOn: () => whatsappOn }))
vi.mock('@/api/entry', () => ({
  entryApi: { opener: vi.fn().mockResolvedValue({ reply: '' }), chat: vi.fn(), report: vi.fn(), onboard: vi.fn(), classifyIntent: vi.fn(), patchDraft: vi.fn().mockResolvedValue({ ok: true }),
    peopleOnLines: vi.fn(async (t: string) => (await import('./a-team-read-in-a-spec')).readLikeTheServer(t)) },
}))
vi.mock('@/api/auth', () => ({ authApi: { entrySave: vi.fn().mockResolvedValue({ draftToken: 'draft-phone' }) } }))
vi.mock('@/stores/auth', () => ({ useAuthStore: (sel: any) => sel({ user: null, isAuthenticated: false }) }))
vi.mock('@/api/grounds', () => ({ groundsApi: { get: vi.fn(), addTheirWhatsAppNumber: vi.fn(async () => ({ said: 'kept' })) } }))
vi.mock('sonner', () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() }) }))

import { groundsApi } from '@/api/grounds'
import { toast } from 'sonner'
import { EntryChatPage } from './EntryChatPage'
import { addThroughTheTeamBox, saveWithMyEmail } from './a-team-read-in-a-spec'

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

/*
 * REWRITTEN (Hafsah's blocker, 31 October 2026: "nothing anyone says in setup is ever lost"). The numbers went through a second request
 * the page made after a signed-in save (theNumbersGivenInTheSetup), so a save finished from the email link never kept them. Each number
 * now travels with its person in the save, and the server keeps it through the one writer for a lead's number
 * (api entry/the-numbers-given-in-setup-are-kept.spec.ts proves that half, and what is said when one does not keep).
 */
describe('saving without being signed in', () => {
  beforeEach(() => { localStorage.clear(); vi.clearAllMocks() })

  it('sends each number with the person it was typed beside, in the save itself', async () => {
    whatsappOn = false
    seedClosedAnchorSession()
    renderPage()
    await screen.findByText('Who needs to be part of this?')
    addThroughTheTeamBox('Musa Bello, musa@anchor.test, +254 712 345 678\nAda Obi, ada@anchor.test')
    saveWithMyEmail()
    const { authApi } = await import('@/api/auth')
    await waitFor(() => expect(authApi.entrySave).toHaveBeenCalled())
    const [, body] = vi.mocked(authApi.entrySave).mock.calls[0] as any[]
    expect(body.payload.contributors).toEqual([
      { email: 'musa@anchor.test', displayName: 'Musa Bello', phone: '+254 712 345 678' },
      { email: 'ada@anchor.test', displayName: 'Ada Obi' },
    ])
    expect(groundsApi.addTheirWhatsAppNumber).not.toHaveBeenCalled()
    expect(toast.error).not.toHaveBeenCalled()
  })
})
