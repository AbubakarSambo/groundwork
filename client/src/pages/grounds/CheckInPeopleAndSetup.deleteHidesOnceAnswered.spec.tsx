import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CheckInPeopleAndSetup } from './CheckInPeopleAndSetup'
import { groundsApi } from '@/api/grounds'

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

/** What the server serves on People and setup: `stillATest` is its one answer (people-and-setup.ts, whoElseHasAnswered). */
function served(stillATest: boolean) {
  return {
    on: true, view: 'lead', howItRuns: '2 people answer every week, here.', problems: [], sessions: '1 of 12 sessions done.', yourSessionsDone: 0,
    sessionsPlanned: 12, joinedWithTheLink: 'Nobody has answered with it yet.', kindOfWork: null, kindsOffered: [], othersWithAccess: '',
    runsIt: 'Amina Wanjiru', organisationName: 'Msingi', roleDescribed: {}, stillATest,
  }
}

beforeEach(() => { vi.restoreAllMocks(); vi.clearAllMocks() })

describe('B-152: "Delete this check-in" only while deleting could still work', () => {
  /* 22 November 2026, bug N6: these cases now say what the server serves, because the page no longer decides from this session's
     rows. The rows below are kept to prove they no longer decide it. */
  it('is offered before anyone else has answered', async () => {
    vi.spyOn(groundsApi, 'peopleAndSetup').mockResolvedValue(served(true) as any)
    renderWith({
      isInitiator: true,
      whoIsInThisParties: [{ id: 'p-lead', done: false, isSelf: true }, { id: 'p-a', done: false, isSelf: false }],
    })
    expect((await screen.findByText('Delete this test', {}, { timeout: 5000 })).closest('button')).toBeTruthy()
    expect(screen.getByText('Nobody else has answered yet, so this can still be deleted as a test. Otherwise, ending it stops new check-ins, everything stays as it is, and each person keeps their own history.')).toBeTruthy()
    expect(screen.queryByText('Delete this check-in')).toBeNull()
  }, 20000)

  it('is hidden, with no "Ask us to end it instead", once somebody else has answered', async () => {
    vi.spyOn(groundsApi, 'peopleAndSetup').mockResolvedValue(served(false) as any)
    renderWith({
      isInitiator: true,
      whoIsInThisParties: [{ id: 'p-lead', done: true, isSelf: true }, { id: 'p-a', done: true, isSelf: false }],
    })
    expect(await screen.findByRole('button', { name: 'Delete this check-in' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Delete this test' })).toBeNull()
    expect(screen.getByText(/Ending it stops new check-ins\. Everything stays as it is/)).toBeTruthy()
    expect(screen.queryByText(/Ask us to end it instead/)).toBeNull()
  })

  /**
   * BUG N6 (release test 22 November 2026). Baraka ran "Imani Hassan, first ninety days". Imani answered session 1; it was session 2,
   * and she had not answered that one yet. The page counted only this session, read "Nobody else has answered yet", offered the hard
   * delete, and the server refused it. The page now reads the server's answer, which counts every session.
   */
  it('a team member who answered an earlier session, and not this one, has answered: the lead is offered the delete that keeps the record', async () => {
    vi.spyOn(groundsApi, 'peopleAndSetup').mockResolvedValue(served(false) as any)
    renderWith({
      isInitiator: true,
      whoIsInThisParties: [{ id: 'p-lead', done: false, isSelf: true }, { id: 'p-imani', done: false, isSelf: false }],
    })
    expect(await screen.findByText("People have already answered this check-in, so what they said is kept. You can still delete the check-in, and it will be gone from everyone's lists.")).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Delete this check-in' })).toBeTruthy()
    expect(screen.queryByText(/Nobody else has answered yet/)).toBeNull()
    expect(screen.queryByRole('button', { name: 'Delete this test' })).toBeNull()
    expect(screen.getByText('Ending it stops new check-ins. Everything stays as it is, and each person keeps their own history. This can’t be undone.')).toBeTruthy()
  })

  it('before the server has answered, only what keeps the record is offered', async () => {
    vi.spyOn(groundsApi, 'peopleAndSetup').mockReturnValue(new Promise(() => {}) as any)
    renderWith({ isInitiator: true, whoIsInThisParties: [] })
    await screen.findByRole('link', { name: 'Decide how it ends' })
    expect(screen.queryByRole('button', { name: 'Delete this test' })).toBeNull()
  })
})
