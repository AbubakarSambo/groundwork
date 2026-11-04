import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CheckInPeopleAndSetup } from './CheckInPeopleAndSetup'

/**
 * B-152. "Delete this check-in" stayed on screen once somebody else had already answered, even
 * though the server refuses to delete a check-in that is now a record, and the sentence beside it
 * sent people to "Ask us to end it instead" - which does not exist (the lead already has "Decide
 * how it ends", in the section just above). The button and the whole panel now only show while
 * deleting could actually work: before anyone but the lead has answered.
 *
 * 4 November 2026: People and setup is the B8 page for everybody now (Release 1B's switch went), where the button reads
 * "Delete this test" beside "Decide how it ends". What is protected is the same: offered only before anyone else answered.
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

describe('B-152: "Delete this check-in" only while deleting could still work', () => {
  it('is offered before anyone else has answered', async () => {
    renderWith({
      isInitiator: true,
      whoIsInThisParties: [{ id: 'p-lead', done: false, isSelf: true }, { id: 'p-a', done: false, isSelf: false }],
    })
    expect(await screen.findByRole('button', { name: 'Delete this test' })).toBeTruthy()
  })

  it('is hidden, with no "Ask us to end it instead", once somebody else has answered', async () => {
    renderWith({
      isInitiator: true,
      whoIsInThisParties: [{ id: 'p-lead', done: true, isSelf: true }, { id: 'p-a', done: true, isSelf: false }],
    })
    await screen.findByRole('link', { name: 'Decide how it ends' })
    expect(screen.queryByRole('button', { name: 'Delete this test' })).toBeNull()
    expect(screen.getByText(/Ending it stops new check-ins\. Everything stays as it is/)).toBeTruthy()
    expect(screen.queryByText(/Ask us to end it instead/)).toBeNull()
  })
})
