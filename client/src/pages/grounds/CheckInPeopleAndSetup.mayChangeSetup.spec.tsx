import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CheckInPeopleAndSetup } from './CheckInPeopleAndSetup'

/**
 * FAULT 5: AN ADMIN IS OFFERED SETUP CHANGES SHE CANNOT MAKE.
 *
 * Naomi, an admin reading Tendai's check-in, saw "Change" on Name, How often and Use simpler
 * words, and pressing it opened the field - even though the server sends `mayChangeSetup: false`
 * for her (request 104, the 1 October decision: only the lead changes setup). `canEditRunOrAdmin`
 * used to be `isInitiator || isOrgAdmin`, a role check that never asked the server. It now reads
 * the served `mayChangeSetup`, falling back to the old role check only when a payload has not
 * sent the field at all.
 */
function ground(over: Record<string, any> = {}) {
  return {
    id: 'g1', label: "Tendai's check-in", status: 'ACTIVE', scenario: 'SALES', timelineDays: 90, cadence: 'WEEKLY',
    initiatorId: 'u-tendai',
    participants: [
      { id: 'p-tendai', userId: 'u-tendai', email: 'tendai@x.test', partyType: 'INITIATOR', user: { firstName: 'Tendai', lastName: 'Moyo' } },
    ],
    ...over,
  }
}

function baseProps(over: Record<string, any> = {}) {
  return {
    ground: ground(), user: { id: 'u-naomi' }, id: 'g1', navigate: vi.fn(),
    isInitiator: false, isOrgAdmin: true, viewerIsAParty: false,
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
    groundLabel: "Tendai's check-in", setGroundLabel: vi.fn(),
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

beforeEach(() => vi.clearAllMocks())

describe('Naomi, an admin on Tendai\'s check-in, is not offered setup changes the server refuses her', () => {
  it('offers no "Change" at all when the server sends mayChangeSetup: false', async () => {
    renderWith({ ground: ground({ mayChangeSetup: false }) })
    await waitFor(() => expect(screen.getByText("Tendai's check-in")).toBeTruthy())
    expect(screen.queryAllByRole('button', { name: 'Change' }).length).toBe(0)
  })

  it('still offers "Change" when the server actually grants it (mayChangeSetup: true)', async () => {
    renderWith({ ground: ground({ mayChangeSetup: true }) })
    await waitFor(() => expect(screen.getByText("Tendai's check-in")).toBeTruthy())
    expect(screen.queryAllByRole('button', { name: 'Change' }).length).toBeGreaterThan(0)
  })

  it('falls back to the old role check only when the server has not sent the field at all', async () => {
    renderWith({ ground: ground() })
    await waitFor(() => expect(screen.getByText("Tendai's check-in")).toBeTruthy())
    // isOrgAdmin: true in these props, and no mayChangeSetup field on the ground payload.
    expect(screen.queryAllByRole('button', { name: 'Change' }).length).toBeGreaterThan(0)
  })
})
