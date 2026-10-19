import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CheckInPeopleAndSetup } from './CheckInPeopleAndSetup'
import { groundsApi } from '@/api/grounds'

/**
 * "WHAT IT IS" ON PEOPLE AND SETUP, THE TYPE, AS EACH READER READS IT (Release 2, pull request 1 of 3; the B8 picture
 * people-and-setup-fee-notes-lead). Muchemi & Co (test)'s weekly fee notes check-in, which Wanjiru Muchemi runs, rendered from
 * what the server serves:
 *  - Wanjiru reads "Collect what’s owed", the two kinds of work the picture names with "Fee notes and invoices" chosen, and the
 *    sentence telling her to save to confirm it; saving stores her choice, and only then;
 *  - an admin who does not run it reads the kind of work and the same sentence said about Wanjiru, with nothing to choose;
 *  - where Release 2 is off, the server serves no type, and the row is today's kind of work, exactly as before.
 */
vi.mock('@/api/grounds', async () => {
  const actual = await vi.importActual<typeof import('@/api/grounds')>('@/api/grounds')
  return {
    ...actual,
    groundsApi: {
      ...actual.groundsApi,
      peopleAndSetup: vi.fn(),
      whereEachPersonIsGettingStarted: vi.fn(async () => ({ stages: [], people: [] })),
      whereEachPersonIsOnWhatsApp: vi.fn(async () => []),
      setKindOfWork: vi.fn(),
      confirmTheType: vi.fn(async () => ({ id: 'g-muchemi-fee-notes', checkInType: 'invoices or fee notes', checkInTypeConfirmedAt: '2026-10-19T09:00:00Z' })),
      setReportSharesAt: vi.fn(),
      baselineHistory: vi.fn(async () => []),
      baselineEntries: vi.fn(async () => ({ entries: [], canShowMovement: false, frozenReason: '' })),
      baselineEntryCandidates: vi.fn(async () => ({ candidates: [] })),
    },
  }
})
vi.mock('@/api/billing', async () => {
  const actual = await vi.importActual<typeof import('@/api/billing')>('@/api/billing')
  return { ...actual, billingApi: { ...actual.billingApi, nextSeat: vi.fn(async () => ({ addsASeat: false })) } }
})

const person = (id: string, userId: string, firstName: string, lastName: string) => ({
  id, userId, email: `${firstName.toLowerCase()}@muchemi.test`, partyType: id === 'p-wanjiru' ? 'INITIATOR' : 'PARTICIPANT',
  invitedAt: '2026-10-10T08:00:00Z', inviteDeliveryStatus: 'DELIVERED', roleAsDescribed: id === 'p-wanjiru' ? null : 'Follows up fee notes',
  user: { firstName, lastName },
})

const FEE_NOTES = {
  id: 'g-muchemi-fee-notes', label: 'Fee notes', status: 'ACTIVE', scenario: 'COLLECTIONS', kindOfWork: null,
  brief: 'Every fee note goes out when it falls due, and clients pay within 30 days.',
  timelineDays: 90, cadence: 'WEEKLY', workingDays: [1], cadenceAnchorDay: 1, initiatorId: 'u-wanjiru', createdAt: '2026-10-10T08:00:00Z',
  orgHasWhatsApp: true, overWhatsApp: null, chaseAfterDays: [1], tellTheLead: true, simplerWords: false, peopleWorkTogether: true,
  peersVisibleToEachOther: true, reportSharesAt: null, organization: { name: 'Muchemi & Co (test)' }, release1bTabsOn: true,
  participants: [
    person('p-wanjiru', 'u-wanjiru', 'Wanjiru', 'Muchemi'),
    person('p-brian', 'u-brian', 'Brian', 'Otieno'),
    person('p-aisha', 'u-aisha', 'Aisha', 'Kamau'),
    person('p-njeri', 'u-njeri', 'Njeri', 'Wambui'),
  ],
}

const OFFERED = [{ type: 'invoices or fee notes', label: 'Fee notes and invoices' }, { type: 'loans', label: 'Loan repayments' }]
const SERVED_TO_WANJIRU = {
  on: true, view: 'lead', howItRuns: '4 people answer every Monday, until you end it, on WhatsApp or here.', problems: [],
  sessions: '1 session so far. It runs until you end it.', joinedWithTheLink: 'Nobody has answered with it yet.',
  kindOfWork: null, kindsOffered: ['sales team', 'sales org'],
  othersWithAccess: "The people above and the admins of Muchemi & Co (test) can see it. So can a lead in the same department, once the team's report is shared.",
  runsIt: 'Wanjiru Muchemi', organisationName: 'Muchemi & Co (test)', roleDescribed: {},
  checkInType: { offered: OFFERED, type: 'invoices or fee notes', confirmed: false, says: 'Groundwork read this from what you wrote when setting it up. Save changes to confirm it.', mayConfirm: true },
}
const SERVED_TO_THE_ADMIN = {
  ...SERVED_TO_WANJIRU, view: 'admin',
  checkInType: { offered: OFFERED, type: 'invoices or fee notes', confirmed: false, says: 'Groundwork read this from what Wanjiru wrote when setting it up. Wanjiru has not confirmed it yet.', mayConfirm: false },
}

function props(over: Record<string, any> = {}) {
  const m = () => ({ mutate: vi.fn(), isPending: false })
  return {
    ground: FEE_NOTES, user: { id: 'u-wanjiru' }, id: 'g-muchemi-fee-notes', navigate: vi.fn(),
    isInitiator: true, isOrgAdmin: false, viewerIsAParty: true, mySessionsDone: 0, plannedSessions: 13,
    addingMany: false, addManyParticipants: vi.fn(),
    newParticipantEmail: '', setNewParticipantEmail: vi.fn(), newParticipantNote: '', setNewParticipantNote: vi.fn(),
    newParticipantDepartment: '', setNewParticipantDepartment: vi.fn(), addParticipantMut: m(),
    queuedToAdd: [], setQueuedToAdd: vi.fn(), inviteTheQueue: m(), lastInvitedEmail: null, whyItWaits: null, lastInviteWaits: false,
    billingStatus: null, onShareCode: vi.fn(), whoIsInThisParties: [], whoIsInThisLeadName: 'Wanjiru Muchemi',
    fixingEmailId: null, setFixingEmailId: vi.fn(), fixingEmailValue: '', setFixingEmailValue: vi.fn(), fixEmail: m(), resendInvite: m(), updateRole: m(),
    settingsChangeCount: 1,
    startsAtDraft: '', setStartsAtDraft: vi.fn(), startsAtOnRecord: '2026-10-12', createdAtOnRecord: '2026-10-10T08:00:00Z', canOfferStartDate: false,
    timelineDaysDraft: 90, setTimelineDaysDraft: vi.fn(), cadenceDraft: 'WEEKLY', setCadenceDraft: vi.fn(),
    workingDaysDraft: [1], setWorkingDaysDraft: vi.fn(), anchorDayDraft: 1, setAnchorDayDraft: vi.fn(),
    theTimeframeChanged: false, saveSetup: m(), groundLabel: 'Fee notes', setGroundLabel: vi.fn(), groundScenario: 'COLLECTIONS', setGroundScenario: vi.fn(),
    peersVisible: true, peersDefaultHidden: false, setPeerVisibility: m(), contactHidden: true, setContactVisibility: m(),
    numbersShared: true, setWhoSeesTargets: m(), whatsAppIsOn: true, setOverWhatsApp: m(), setSimplerWords: m(),
    expectsUnblocking: true, setExpectThemToUnblock: m(), setWorkTogether: m(), setChasing: m(),
    confirmDelete: false, setConfirmDelete: vi.fn(), deleteError: null, setDeleteError: vi.fn(), removeGround: m(),
    ...over,
  }
}

function renderPage(p: any) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(<QueryClientProvider client={qc}><MemoryRouter><CheckInPeopleAndSetup {...p} /></MemoryRouter></QueryClientProvider>)
}

const whatItIs = () => within(screen.getByRole('heading', { name: 'What it is' }).closest('section') as HTMLElement)

beforeEach(() => { vi.clearAllMocks() })

describe('Wanjiru, who runs it', () => {
  it('reads the scenario, the two kinds of work the picture names with the one Groundwork read chosen, and how to confirm it', async () => {
    ;(groundsApi.peopleAndSetup as any).mockResolvedValue(SERVED_TO_WANJIRU)
    renderPage(props())
    await waitFor(() => expect(whatItIs().getByText('Groundwork read this from what you wrote when setting it up. Save changes to confirm it.')).toBeTruthy())
    expect(whatItIs().getByText('Collect what’s owed')).toBeTruthy()
    const kind = whatItIs().getByLabelText('Kind of work') as HTMLSelectElement
    expect([...kind.options].map((o) => o.textContent)).toEqual(['Fee notes and invoices', 'Loan repayments'])
    expect(kind.value).toBe('invoices or fee notes')
    expect(whatItIs().getByText('The scenario and kind of work decide the board, the reports, and what each check-in asks about.')).toBeTruthy()
    expect(groundsApi.confirmTheType).not.toHaveBeenCalled()
  })

  it('saving stores the kind of work she chose as confirmed, and nothing is stored before she saves', async () => {
    ;(groundsApi.peopleAndSetup as any).mockResolvedValue(SERVED_TO_WANJIRU)
    renderPage(props())
    await waitFor(() => expect(whatItIs().getByLabelText('Kind of work')).toBeTruthy())
    fireEvent.change(whatItIs().getByLabelText('Kind of work'), { target: { value: 'loans' } })
    expect(groundsApi.confirmTheType).not.toHaveBeenCalled()
    fireEvent.click(screen.getAllByRole('button', { name: 'Save changes' })[0])
    await waitFor(() => expect(groundsApi.confirmTheType).toHaveBeenCalledWith('g-muchemi-fee-notes', 'loans'))
    expect(groundsApi.setKindOfWork).not.toHaveBeenCalled()
  })
})

describe('an admin who does not run it', () => {
  it('reads the kind of work and the sentence about Wanjiru, with nothing to choose', async () => {
    ;(groundsApi.peopleAndSetup as any).mockResolvedValue(SERVED_TO_THE_ADMIN)
    renderPage(props({ user: { id: 'u-admin' }, isInitiator: false, isOrgAdmin: true, viewerIsAParty: false }))
    await waitFor(() => expect(whatItIs().getByText('Groundwork read this from what Wanjiru wrote when setting it up. Wanjiru has not confirmed it yet.')).toBeTruthy())
    expect(whatItIs().getByText('Fee notes and invoices')).toBeTruthy()
    expect(whatItIs().queryByLabelText('Kind of work')).toBeNull()
  })
})

describe('with Release 2 off', () => {
  it('the server serves no type, and the row is today\'s kind of work, exactly as before', async () => {
    const { checkInType: _gone, ...asBefore } = SERVED_TO_WANJIRU
    ;(groundsApi.peopleAndSetup as any).mockResolvedValue(asBefore)
    renderPage(props({ ground: { ...FEE_NOTES, scenario: 'PULSE_CHECK', kindOfWork: 'sales team' }, groundScenario: 'PULSE_CHECK' }))
    await waitFor(() => expect(whatItIs().getByLabelText('Kind of work')).toBeTruthy())
    const kind = whatItIs().getByLabelText('Kind of work') as HTMLSelectElement
    expect([...kind.options].map((o) => o.value)).toEqual(['', 'sales team', 'sales org'])
    expect(whatItIs().queryByText(/Save changes to confirm it/)).toBeNull()
    expect(screen.queryByText('Fee notes and invoices')).toBeNull()
  })
})
