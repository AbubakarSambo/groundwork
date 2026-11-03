import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CheckInPeopleAndSetup } from './CheckInPeopleAndSetup'

/**
 * WHO ELSE CAN SEE IT (check-in-people-and-setup.jpg, screen 83), said as the server's rule is today: the people in it and the
 * organisation's admins, except on an evaluation check-in or somebody's first 90 days, where an admin reads it only if they set
 * it up or approved it. No "Give someone access": no such grant exists, and it would be a privacy change.
 *
 * (Props harness from the spec below.)
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

/*
 * Changed on 3 November 2026 (F5). This spec asked for a "Who else can see it" section that says who may read the board and
 * reports. It was never built, and the standards of 2 November forbid privacy notes on screens, so it now checks the page says
 * nothing of the kind and offers no access grant. Who may read a check-in is the server's rule, and its tests are unchanged
 * (api grounds/who-may-read-this-check-in.ts, checked in a-lead-in-the-department-does-not-read-an-evaluation.spec.ts and its neighbours).
 */
describe('who else can see it', () => {
  it('on a team check-in, no note about who can read it, and no access grant', () => {
    renderWith()
    expect(screen.queryByRole('heading', { name: 'Who else can see it' })).toBeNull()
    expect(document.body.textContent).not.toMatch(/can read the board and reports/)
    expect(screen.queryByText('Give someone access')).toBeNull()
  })
  it('on somebody’s first 90 days, the same', () => {
    renderWith({ ground: ground({ scenario: 'NEW_HIRE' }) })
    expect(document.body.textContent).not.toMatch(/can read the board and reports|An admin reads them only if/)
    expect(screen.queryByText('Give someone access')).toBeNull()
  })
})
