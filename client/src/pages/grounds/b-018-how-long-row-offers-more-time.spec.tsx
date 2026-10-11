import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CheckInPeopleAndSetup } from './CheckInPeopleAndSetup'

/**
 * B-018: THE "HOW LONG" ROW HAD NO BUTTON.
 *
 * The prototype's own row (check-in-people-and-setup.txt) reads "How long / 1 July to 30
 * September. 27 working days left. / Give it more time", but the row here offered nothing - the
 * only way to the timeframe editor that can extend it was the warning that appears in the last
 * week of a check-in. Fixed by giving the row its own "Give it more time" action, opening the same
 * editor "How often"'s "Change" button already does.
 */
function ground(over: Record<string, any> = {}) {
  return {
    id: 'g1', label: "Rukia's check-in", status: 'ACTIVE', scenario: 'SALES', timelineDays: 90, cadence: 'WEEKLY',
    initiatorId: 'u-rukia', mayChangeSetup: true,
    participants: [
      { id: 'p-rukia', userId: 'u-rukia', email: 'rukia@x.test', partyType: 'INITIATOR', user: { firstName: 'Rukia', lastName: 'Otieno' } },
    ],
    ...over,
  }
}

function baseProps(over: Record<string, any> = {}) {
  return {
    ground: ground(), user: { id: 'u-rukia' }, id: 'g1', navigate: vi.fn(),
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
    groundLabel: "Rukia's check-in", setGroundLabel: vi.fn(),
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
      <CheckInPeopleAndSetup {...(props as any)} />
    </QueryClientProvider>,
  )
  return props
}

describe('the "How long" row offers "Give it more time"', () => {
  it('shows the button beside the row, early, not only once a warning appears', async () => {
    renderWith()
    await waitFor(() => expect(screen.getByText("Rukia's check-in")).toBeTruthy())
    const row = screen.getByText('How long').closest('.gwui-field-row') as HTMLElement
    expect(row).toBeTruthy()
    expect(within(row).getByRole('button', { name: 'Give it more time' })).toBeTruthy()
  })

  it('pressing it opens the timeframe editor (the "Ends on" field)', async () => {
    renderWith()
    await waitFor(() => expect(screen.getByText("Rukia's check-in")).toBeTruthy())
    const row = screen.getByText('How long').closest('.gwui-field-row') as HTMLElement
    fireEvent.click(within(row).getByRole('button', { name: 'Give it more time' }))
    expect(await screen.findByLabelText('Ends on')).toBeTruthy()
  })

  it('is not offered to someone who may not change the setup', async () => {
    renderWith({ ground: ground({ mayChangeSetup: false }) })
    await waitFor(() => expect(screen.getByText("Rukia's check-in")).toBeTruthy())
    const row = screen.getByText('How long').closest('.gwui-field-row') as HTMLElement
    expect(within(row).queryByRole('button', { name: 'Give it more time' })).toBeNull()
  })
})
