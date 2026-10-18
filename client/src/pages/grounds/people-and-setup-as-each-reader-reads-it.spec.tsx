import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CheckInPeopleAndSetup } from './CheckInPeopleAndSetup'
import { YourPeopleAndSetup } from './YourPeopleAndSetup'
import { groundsApi } from '@/api/grounds'

/**
 * PEOPLE AND SETUP, AS EACH READER READS IT (Release 1B, pull request 1 of 3). The sales check-in of the B8 pictures,
 * "Sales team, Q4" at Drop Access, rendered from what the server serves each reader:
 *  - Grace Achieng, who runs it, reads the whole page in the pictures' order, ending with "Decide how it ends";
 *  - Naomi, an admin who does not run it, reads the same page with "You can't end a check-in you don't run";
 *  - Mercy Wanjiru, a team member, reads only her short page;
 *  - with the organisation's switch off, the lead reads today's page exactly as before.
 */
vi.mock('@/api/grounds', async () => {
  const actual = await vi.importActual<typeof import('@/api/grounds')>('@/api/grounds')
  return {
    ...actual,
    groundsApi: {
      ...actual.groundsApi,
      peopleAndSetup: vi.fn(),
      whereEachPersonIsGettingStarted: vi.fn(),
      whereEachPersonIsOnWhatsApp: vi.fn(),
      setKindOfWork: vi.fn(),
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

const person = (id: string, userId: string | null, firstName: string, lastName: string, extra: any = {}) => ({
  id, userId, email: `${firstName.toLowerCase()}@dropaccess.test`, partyType: id === 'p-grace' ? 'INITIATOR' : 'PARTICIPANT',
  invitedAt: '2026-10-10T08:00:00Z', inviteDeliveryStatus: 'DELIVERED', roleAsDescribed: null,
  user: userId ? { firstName, lastName } : null, ...extra,
})

function theSalesCheckIn(over: Record<string, any> = {}) {
  return {
    id: 'g-sales', label: 'Sales team, Q4', status: 'AWAITING_PARTIES', scenario: 'OKR_ALIGNMENT', kindOfWork: 'sales team',
    timelineDays: 18, cadence: 'DAILY', workingDays: [1, 2, 3, 4, 5], initiatorId: 'u-grace', createdAt: '2026-10-10T08:00:00Z',
    orgHasWhatsApp: true, overWhatsApp: null, chaseAfterDays: [1], tellTheLead: true, simplerWords: false, peopleWorkTogether: true,
    peersVisibleToEachOther: true, reportSharesAt: null, organization: { name: 'Drop Access' }, release1bTabsOn: true,
    participants: [
      person('p-grace', 'u-grace', 'Grace', 'Achieng', { roleAsDescribed: 'Sales lead' }),
      person('p-kevin', 'u-kevin', 'Kevin', 'Otieno', { roleAsDescribed: 'Rep, Nairobi hardware shops' }),
      person('p-mercy', 'u-mercy', 'Mercy', 'Wanjiru', { roleAsDescribed: 'Rep, Kiambu and schools' }),
      person('p-joseph', 'u-joseph', 'Joseph', 'Mutua'),
      person('p-peter', null, 'Peter', 'Ouma', { nameGiven: 'Peter Ouma', roleAsDescribed: 'Agent, Thika', inviteDeliveryStatus: 'BOUNCED' }),
    ],
    ...over,
  }
}

const SERVED_TO_GRACE = {
  on: true, view: 'lead',
  howItRuns: '5 people answer every weekday, until 30 October, on WhatsApp or here.',
  problems: [
    { participantId: 'p-mercy', says: 'Mercy Wanjiru has no WhatsApp number, so Mercy answers here.', fix: 'add-a-number' },
    { participantId: 'p-joseph', says: "Nobody has described Joseph Mutua's role here, so Joseph gets the general questions.", fix: 'add-their-role' },
    { participantId: 'p-peter', says: "Peter Ouma can't start, because the invitation to Peter bounced.", fix: 'fix-the-address' },
  ],
  sessions: '5 of 15 sessions done. Sessions already done are never removed.',
  joinedWithTheLink: '3 people have answered with it.',
  kindOfWork: 'sales team', kindsOffered: ['sales team', 'sales org'],
  othersWithAccess: "The people above and the admins of Drop Access can see it. So can a lead in the same department, once the team's report is shared.",
  runsIt: 'Grace Achieng', organisationName: 'Drop Access',
  roleDescribed: { 'p-grace': true, 'p-kevin': true, 'p-mercy': true, 'p-joseph': false, 'p-peter': true },
}
const SERVED_TO_NAOMI = {
  ...SERVED_TO_GRACE, view: 'admin',
  problems: SERVED_TO_GRACE.problems.map((p) => (p.fix === 'add-a-number' ? p : { ...p, fix: null })),
}

function props(over: Record<string, any> = {}) {
  const m = () => ({ mutate: vi.fn(), isPending: false })
  return {
    ground: theSalesCheckIn(), user: { id: 'u-grace' }, id: 'g-sales', navigate: vi.fn(),
    isInitiator: true, isOrgAdmin: false, viewerIsAParty: true, mySessionsDone: 0, plannedSessions: 18,
    addingMany: false, addManyParticipants: vi.fn(),
    newParticipantEmail: '', setNewParticipantEmail: vi.fn(), newParticipantNote: '', setNewParticipantNote: vi.fn(),
    newParticipantDepartment: '', setNewParticipantDepartment: vi.fn(), addParticipantMut: m(),
    queuedToAdd: [], setQueuedToAdd: vi.fn(), inviteTheQueue: m(), lastInvitedEmail: null, whyItWaits: null, lastInviteWaits: false,
    billingStatus: null, onShareCode: vi.fn(), whoIsInThisParties: [], whoIsInThisLeadName: 'Grace Achieng',
    fixingEmailId: null, setFixingEmailId: vi.fn(), fixingEmailValue: '', setFixingEmailValue: vi.fn(), fixEmail: m(), resendInvite: m(), updateRole: m(),
    settingsChangeCount: 1,
    startsAtDraft: '', setStartsAtDraft: vi.fn(), startsAtOnRecord: '2026-10-12', createdAtOnRecord: '2026-10-10T08:00:00Z', canOfferStartDate: false,
    timelineDaysDraft: 18, setTimelineDaysDraft: vi.fn(), cadenceDraft: 'DAILY', setCadenceDraft: vi.fn(),
    workingDaysDraft: [1, 2, 3, 4, 5], setWorkingDaysDraft: vi.fn(), anchorDayDraft: null, setAnchorDayDraft: vi.fn(),
    theTimeframeChanged: false, saveSetup: m(), groundLabel: 'Sales team, Q4', setGroundLabel: vi.fn(), groundScenario: 'OKR_ALIGNMENT', setGroundScenario: vi.fn(),
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

beforeEach(() => {
  vi.clearAllMocks()
  ;(groundsApi.whereEachPersonIsGettingStarted as any).mockResolvedValue({
    stages: ['Invited', 'Reached', 'Verified', 'First check-in', 'Coming back'],
    people: [
      { participantId: 'p-kevin', name: 'Kevin Otieno', team: null, reached: 5, says: 'Kevin checks in on their own, most recently on Friday.' },
      { participantId: 'p-mercy', name: 'Mercy Wanjiru', team: null, reached: 4, says: 'Mercy checked in once, on Monday, and has not come back since.' },
    ],
  })
  ;(groundsApi.whereEachPersonIsOnWhatsApp as any).mockResolvedValue([
    { participantId: 'p-grace', phone: '+254700000112', whatsapp: 'connected', says: '' },
    { participantId: 'p-kevin', phone: '+254700000410', whatsapp: 'connected', says: '' },
  ])
})

describe('Grace, who runs the sales check-in, reads the whole page in the pictures\' order', () => {
  it('reads each section, the sentence at the top, each setup problem with its fix, and the ending', async () => {
    ;(groundsApi.peopleAndSetup as any).mockResolvedValue(SERVED_TO_GRACE)
    renderPage(props({ ground: theSalesCheckIn({ settingsChanges: [{ changedAt: '2026-10-14T09:00:00Z', by: 'you', weeks: { from: 2, to: 3 }, cadence: null }] }) }))
    await screen.findByText('5 people answer every weekday, until 30 October, on WhatsApp or here.')
    const headings = screen.getAllByRole('heading').map((h) => h.textContent)
    const order = ['How this check-in runs', 'What it is', "Who's in it", 'When it runs', 'How people answer', 'Starting point', 'Who sees what', 'Recent changes']
    expect(order.map((h) => headings.indexOf(h)).every((i, n, all) => i >= 0 && (n === 0 || i > all[n - 1]))).toBe(true)
    expect(screen.getByText("Peter Ouma can't start, because the invitation to Peter bounced.")).toBeTruthy()
    expect(screen.getByText('Mercy Wanjiru has no WhatsApp number, so Mercy answers here.')).toBeTruthy()
    expect(screen.getByText("Nobody has described Joseph Mutua's role here, so Joseph gets the general questions.")).toBeTruthy()
    /* Once under how it runs, and once on Peter's own row, as in the picture. */
    expect(screen.getAllByRole('button', { name: 'Fix the address' }).length).toBe(2)
    expect(screen.getAllByRole('button', { name: 'Add a number' }).length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: 'Add their role' })).toBeTruthy()
    expect(screen.getByText('The scenario and kind of work decide the board, the reports, and what each check-in asks about.')).toBeTruthy()
    expect(screen.getByText('5 people. 4 are checking in. 1 needs something before they can start.')).toBeTruthy()
    expect(screen.getByText('5 of 15 sessions done. Sessions already done are never removed.')).toBeTruthy()
    expect(screen.getByText('Never more than one reminder a day. Quiet hours end at 7am. At the last session, everyone is asked how this should close.')).toBeTruthy()
    expect(screen.getByText('Coming back')).toBeTruthy()
    expect(screen.getByText('First check-in done')).toBeTruthy()
    expect(screen.getByText('+254 7·· ··· 410')).toBeTruthy()
    expect(screen.getByText('You changed how long it runs from 2 weeks to 3 weeks on 14 October.')).toBeTruthy()
    expect(screen.getByText('Nobody else has answered yet, so this can still be deleted as a test. Otherwise, ending it stops new check-ins, everything stays as it is, and each person keeps their own history.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Delete this test' })).toBeTruthy()
    expect(screen.getByText('Decide how it ends')).toBeTruthy()
    expect(screen.queryByText("You can't end a check-in you don't run. Ask us and we'll end it, usually the same day.")).toBeNull()
    expect((screen.getByLabelText('Their role here, for Kevin Otieno') as HTMLInputElement).value).toBe('Rep, Nairobi hardware shops')
  })

  it('a change waits for "Save changes", and is written through the route that already writes it', async () => {
    ;(groundsApi.peopleAndSetup as any).mockResolvedValue(SERVED_TO_GRACE)
    const p = props()
    renderPage(p)
    await screen.findByText('5 people answer every weekday, until 30 October, on WhatsApp or here.')
    expect(screen.queryByText('You have changes. They apply from the next check-in. Sessions already done keep their dates.')).toBeNull()
    fireEvent.change(screen.getByLabelText('Targets'), { target: { value: 'own' } })
    expect(p.setWhoSeesTargets.mutate).not.toHaveBeenCalled()
    expect(screen.getByText('You have changes. They apply from the next check-in. Sessions already done keep their dates.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(p.setWhoSeesTargets.mutate).toHaveBeenCalledWith(false)
    expect(p.saveSetup.mutate).not.toHaveBeenCalled()
    expect(p.setChasing.mutate).not.toHaveBeenCalled()
  })

  it('opening the page writes nothing at all', async () => {
    ;(groundsApi.peopleAndSetup as any).mockResolvedValue(SERVED_TO_GRACE)
    const p = props()
    renderPage(p)
    await screen.findByText('5 people answer every weekday, until 30 October, on WhatsApp or here.')
    for (const k of ['saveSetup', 'setChasing', 'setOverWhatsApp', 'setSimplerWords', 'setExpectThemToUnblock', 'setPeerVisibility', 'setContactVisibility', 'setWorkTogether', 'setWhoSeesTargets', 'updateRole']) {
      expect((p as any)[k].mutate).not.toHaveBeenCalled()
    }
    expect(groundsApi.setKindOfWork).not.toHaveBeenCalled()
    expect(groundsApi.setReportSharesAt).not.toHaveBeenCalled()
  })

  it('the join link panel is the product\'s own link, said as what it does', async () => {
    ;(groundsApi.peopleAndSetup as any).mockResolvedValue(SERVED_TO_GRACE)
    renderPage(props({ ground: theSalesCheckIn({ joinToken: 'tok123' }) }))
    await screen.findByText('5 people answer every weekday, until 30 October, on WhatsApp or here.')
    fireEvent.click(screen.getByRole('button', { name: 'Join link and QR code' }))
    const panel = screen.getByLabelText('Join link and QR code')
    expect(within(panel).getByText('Anyone with this link can answer Sales team, Q4')).toBeTruthy()
    expect((within(panel).getByLabelText('Join link') as HTMLInputElement).value).toMatch(/\/answer\?t=tok123$/)
    expect(within(panel).getByText('The check-in ends. After that, the link says the check-in has finished.')).toBeTruthy()
    expect(within(panel).getByText('3 people have answered with it.')).toBeTruthy()
  })
})

describe('Naomi, an admin who does not run it, reads the whole page with no ending', () => {
  it('reads "You can\'t end a check-in you don\'t run", never the lead\'s words about a person, and no setting she may not change', async () => {
    ;(groundsApi.peopleAndSetup as any).mockResolvedValue(SERVED_TO_NAOMI)
    const ground = theSalesCheckIn({ mayChangeSetup: false, participants: theSalesCheckIn().participants.map((p: any) => ({ ...p, roleAsDescribed: null })) })
    renderPage(props({ ground, user: { id: 'u-naomi' }, isInitiator: false, isOrgAdmin: true, viewerIsAParty: false }))
    await screen.findByText('5 people answer every weekday, until 30 October, on WhatsApp or here.')
    expect(screen.getByText("You can't end a check-in you don't run. Ask us and we'll end it, usually the same day. Grace Achieng runs it, so ending it ends something they are running.")).toBeTruthy()
    expect(screen.getByText('Ask us to end this check-in')).toBeTruthy()
    expect(screen.queryByText('Decide how it ends')).toBeNull()
    expect(screen.queryByText('Delete this test')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Fix the address' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Add their role' })).toBeNull()
    expect(screen.getAllByText('Grace has described it.').length).toBe(4)
    expect(screen.getByText('Nobody has described it yet.')).toBeTruthy()
    expect(screen.queryByText('Rep, Nairobi hardware shops')).toBeNull()
    expect(screen.queryByLabelText('Targets')).toBeNull()
    expect(screen.getByText('Each person sees their own share and the team’s total')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Add people' })).toBeNull()
  })
})

describe('with the organisation\'s switch off, People and setup reads exactly as before', () => {
  it('the lead reads today\'s page, and the new page is never asked for', async () => {
    renderPage(props({ ground: theSalesCheckIn({ release1bTabsOn: false }) }))
    expect(screen.getByRole('heading', { name: 'Roles in this check-in' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'How it runs' })).toBeTruthy()
    expect(screen.queryByText('How this check-in runs')).toBeNull()
    expect(groundsApi.peopleAndSetup).not.toHaveBeenCalled()
  })
})

describe('Mercy, a team member, reads only her short page', () => {
  it('one sentence, her role, her status, her sessions, who runs it, and who sees what', async () => {
    ;(groundsApi.peopleAndSetup as any).mockResolvedValue({
      on: true, view: 'member', howItRuns: '5 people answer every weekday, until 30 October, on WhatsApp or here.',
      yourRole: 'Rep, Kiambu and schools', status: 'AWAITING_PARTIES', yourSessionsDone: 5, sessionsPlanned: 15, runsIt: 'Grace Achieng',
      whoSeesWhat: "Grace knows who is here. You see the team's report once it's shared, with names.",
    })
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { container } = render(<QueryClientProvider client={qc}><YourPeopleAndSetup groundId="g-sales" /></QueryClientProvider>)
    await screen.findByText('5 people answer every weekday, until 30 October, on WhatsApp or here.')
    expect(container.textContent).toBe(
      '5 people answer every weekday, until 30 October, on WhatsApp or here.'
      + 'Your roleRep, Kiambu and schools'
      + 'Your statusThis check-in is open, and waiting on people to check in.'
      + 'Your sessionsYou have completed 5 sessions, out of 15.'
      + 'Runs itGrace Achieng'
      + "Grace knows who is here. You see the team's report once it's shared, with names.",
    )
  })

  it('with the switch off the server serves { on: false } and the short page draws nothing', async () => {
    ;(groundsApi.peopleAndSetup as any).mockResolvedValue({ on: false })
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { container } = render(<QueryClientProvider client={qc}><YourPeopleAndSetup groundId="g-sales" /></QueryClientProvider>)
    await waitFor(() => expect(groundsApi.peopleAndSetup).toHaveBeenCalled())
    expect(container.textContent).toBe('')
  })
})
