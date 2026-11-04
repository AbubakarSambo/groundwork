import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
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
 *
 * 4 November 2026: People and setup is the B8 page for everybody now (Release 1B's switch went). It has no "Change"
 * buttons: whoever may change the setup gets the field itself (the name, How often, Targets, Confirming each other's work,
 * Use simpler words, When someone is blocked), and anyone else reads the answer as a sentence. These cases now check those
 * controls, for the same readers, against the same served flag.
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

/** Every setup control the served `mayChangeSetup` gates, as the B8 page draws it. */
function theControls() {
  return {
    name: screen.queryByRole('textbox', { name: 'Name' }),
    howOften: screen.queryByRole('combobox', { name: 'How often' }),
    targets: screen.queryByRole('combobox', { name: 'Targets' }),
    confirming: screen.queryByRole('combobox', { name: 'Confirming each other’s work' }),
    simplerWords: screen.queryByRole('switch', { name: 'Use simpler words' }),
    blocked: screen.getByRole('switch', { name: 'When someone is blocked' }),
  }
}
function offeredEveryOne() {
  const c = theControls()
  expect(c.name).toBeTruthy()
  expect(c.howOften).toBeTruthy()
  expect(c.targets).toBeTruthy()
  expect(c.confirming).toBeTruthy()
  expect(c.simplerWords).toBeTruthy()
  expect(c.blocked).not.toBeDisabled()
}
function offeredNone() {
  const c = theControls()
  expect(c.name).toBeNull()
  expect(c.howOften).toBeNull()
  expect(c.targets).toBeNull()
  expect(c.confirming).toBeNull()
  expect(c.simplerWords).toBeNull()
  expect(c.blocked).toBeDisabled()
  /* The name is still read, as a sentence. */
  expect(screen.getByText("Tendai's check-in")).toBeTruthy()
}
const drawn = () => screen.findByText('When it runs')

describe('Naomi, an admin on Tendai\'s check-in, is not offered setup changes the server refuses her', () => {
  it('offers no setup control at all when the server sends mayChangeSetup: false', async () => {
    renderWith({ ground: ground({ mayChangeSetup: false }) })
    await drawn()
    offeredNone()
  })

  it('still offers them when the server actually grants it (mayChangeSetup: true)', async () => {
    renderWith({ ground: ground({ mayChangeSetup: true }) })
    await drawn()
    offeredEveryOne()
  })

  it('falls back to the old role check only when the server has not sent the field at all', async () => {
    renderWith({ ground: ground() })
    await drawn()
    // isOrgAdmin: true in these props, and no mayChangeSetup field on the ground payload.
    offeredEveryOne()
  })
})

/**
 * A TEST PER CONTROL (decision 119, H10), checked against the one flag that gates every one of
 * them - `canEditRunOrAdmin`, read from the server's `mayChangeSetup` - so none of the setup
 * controls H10 names can drift from the others.
 */
describe('every H10 control asks the same question, for each kind of reader', () => {
  it('Tendai, who leads it, is offered every one of them', async () => {
    renderWith({
      ground: ground({ mayChangeSetup: true }),
      isInitiator: true, isOrgAdmin: false, user: { id: 'u-tendai' },
    })
    await drawn()
    offeredEveryOne()
  })

  it('Naomi, an admin who does not lead it, is offered none of them while Tendai is still here', async () => {
    renderWith({ ground: ground({ mayChangeSetup: false }) })
    await drawn()
    offeredNone()
  })

  it('Naomi is offered every one of them once the server says Tendai has left', async () => {
    renderWith({ ground: ground({ mayChangeSetup: true }) })
    await drawn()
    offeredEveryOne()
  })

  it('a member, in this check-in but not running it, is offered none of them - the server never grants a mere party mayChangeSetup', async () => {
    renderWith({
      ground: ground({ mayChangeSetup: false }),
      isInitiator: false, isOrgAdmin: false, viewerIsAParty: true, user: { id: 'u-someone-else' },
    })
    await drawn()
    offeredNone()
  })
})
