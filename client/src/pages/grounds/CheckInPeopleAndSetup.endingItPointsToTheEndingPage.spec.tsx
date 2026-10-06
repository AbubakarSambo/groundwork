import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CheckInPeopleAndSetup } from './CheckInPeopleAndSetup'

/**
 * FAULT 7: THE SETUP TAB SAYS THE LEAD CANNOT END A CHECK-IN, BUT THE ENDING PAGE LETS HER.
 *
 * People and setup said "You cannot end a check-in yourself yet. Ask us and we will end it for
 * you" while /grounds/:id/end (EndingPage.tsx) already lets the lead "Save the outcome and end
 * it" - the comment explaining the old sentence ("no route ends a check-in") was itself stale.
 * The lead now reads a true sentence pointing at the page that exists; an admin, who can only
 * read that page rather than decide there, keeps the old sentence and the mail fallback.
 */
function ground(over: Record<string, any> = {}) {
  return {
    id: 'g1', label: 'Sales team, Q3', status: 'ACTIVE', scenario: 'SALES', timelineDays: 90, cadence: 'WEEKLY',
    initiatorId: 'u-lead',
    participants: [
      { id: 'p-lead', userId: 'u-lead', email: 'lead@x.test', partyType: 'INITIATOR', user: { firstName: 'Amina', lastName: 'Wanjiru' } },
    ],
    ...over,
  }
}

function baseProps(over: Record<string, any> = {}) {
  return {
    ground: ground(), user: { id: 'u-lead' }, id: 'g1', navigate: vi.fn(),
    isInitiator: true, isOrgAdmin: false, viewerIsAParty: true,
    mySessionsDone: 0, plannedSessions: 12,
    addingMany: false, addManyParticipants: vi.fn(),
    newParticipantEmail: '', setNewParticipantEmail: vi.fn(),
    newParticipantNote: '', setNewParticipantNote: vi.fn(),
    newParticipantDepartment: '', setNewParticipantDepartment: vi.fn(),
    addParticipantMut: { mutate: vi.fn(), isPending: false },
    queuedToAdd: [], setQueuedToAdd: vi.fn(),
    inviteTheQueue: { mutate: vi.fn(), isPending: false },
    lastInvitedEmail: null, whyItWaits: null, lastInviteWaits: false,
    billingStatus: null, onShareCode: vi.fn(),
    fixingEmailId: null, setFixingEmailId: vi.fn(),
    fixingEmailValue: '', setFixingEmailValue: vi.fn(),
    fixEmail: { mutate: vi.fn(), isPending: false },
    resendInvite: { mutate: vi.fn(), isPending: false },
    updateRole: { mutate: vi.fn(), isPending: false },
    settingsChangeCount: 0,
    startsAtDraft: '', setStartsAtDraft: vi.fn(),
    startsAtOnRecord: '', canOfferStartDate: false,
    timelineDaysDraft: 90, setTimelineDaysDraft: vi.fn(),
    cadenceDraft: 'WEEKLY', setCadenceDraft: vi.fn(),
    workingDaysDraft: [1, 2, 3, 4, 5], setWorkingDaysDraft: vi.fn(),
    theTimeframeChanged: false, saveSetup: { mutate: vi.fn(), isPending: false },
    groundLabel: 'Sales team, Q3', setGroundLabel: vi.fn(),
    groundScenario: 'SALES', setGroundScenario: vi.fn(),
    peersVisible: false, peersDefaultHidden: false, setPeerVisibility: { mutate: vi.fn(), isPending: false },
    contactHidden: false, setContactVisibility: { mutate: vi.fn(), isPending: false },
    numbersShared: false, setWhoSeesTargets: { mutate: vi.fn(), isPending: false },
    whatsAppIsOn: false, setOverWhatsApp: { mutate: vi.fn(), isPending: false },
    setSimplerWords: { mutate: vi.fn(), isPending: false },
    expectsUnblocking: false, setExpectThemToUnblock: { mutate: vi.fn(), isPending: false },
    setWorkTogether: { mutate: vi.fn(), isPending: false },
    setChasing: { mutate: vi.fn(), isPending: false },
    confirmDelete: false, setConfirmDelete: vi.fn(),
    deleteError: null, setDeleteError: vi.fn(),
    removeGround: { mutate: vi.fn(), isPending: false },
    ...over,
  }
}

function renderWith(over: Record<string, any> = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const props = baseProps(over)
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/grounds/g1']}>
        <Routes>
          <Route path="/grounds/:id" element={<CheckInPeopleAndSetup {...(props as any)} />} />
          <Route path="/grounds/:id/end" element={<p>The ending page</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return props
}

beforeEach(() => vi.clearAllMocks())

describe('"Ending it" points the lead at the page that actually ends a check-in', () => {
  it('tells the lead she can end it, with a link to the ending page', async () => {
    renderWith({ isInitiator: true, isOrgAdmin: false, viewerIsAParty: true })
    expect(await screen.findByText('You can end this check-in when it has done its job.')).toBeTruthy()
    expect(screen.queryByText(/You cannot end a check-in yourself yet/)).toBeNull()
    const link = screen.getByRole('link', { name: 'Decide how it ends' })
    expect(link).toHaveAttribute('href', '/grounds/g1/end')
  })

  it('still tells an admin, who cannot decide there herself, to ask us', async () => {
    renderWith({ isInitiator: false, isOrgAdmin: true, viewerIsAParty: false })
    expect(await screen.findByText(/You cannot end a check-in yourself yet\. Ask us and we will end it for you/)).toBeTruthy()
    expect(screen.queryByRole('link', { name: 'Decide how it ends' })).toBeNull()
    expect(screen.getByRole('link', { name: 'Ask us to end this check-in' })).toBeTruthy()
  })
})
