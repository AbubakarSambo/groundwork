import { readFileSync } from 'fs'
import { join } from 'path'
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
    /* Says what Peter needs, read from the same reason his row reads (Hafsah, 30 October 2026:
       plain language for an impatient first-time lead; "1 needs something" said nothing). */
    expect(screen.getByText('5 people. 4 are checking in. 1 did not get the invitation, because the email bounced.')).toBeTruthy()
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

/**
 * WITH THE DIRECT MORNING ON (Hafsah, 20 October 2026; `directMorningOn` on the check-in, GET /grounds/:id): Grace's page drops the
 * line explaining what the scenario and kind of work decide, and the line explaining what the report shows. Every setting, problem
 * and fix is the same; who sees what is the same setting either way.
 */
describe('Grace’s People and setup, with the direct morning on', () => {
  it('no explanation of Groundwork, and every section, problem and setting as before', async () => {
    ;(groundsApi.peopleAndSetup as any).mockResolvedValue({ ...SERVED_TO_GRACE, directMorning: true })
    renderPage(props({ ground: { ...theSalesCheckIn(), directMorningOn: true } }))
    await screen.findByText('5 people answer every weekday, until 30 October, on WhatsApp or here.')
    expect(screen.queryByText('The scenario and kind of work decide the board, the reports, and what each check-in asks about.')).toBeNull()
    expect(document.body.textContent).not.toMatch(/the report shows where (the team|you) agree/)
    expect(screen.getByText("Peter Ouma can't start, because the invitation to Peter bounced.")).toBeTruthy()
    expect(screen.getByText('5 of 15 sessions done. Sessions already done are never removed.')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Who sees what' })).toBeTruthy()
  })
  it('off, the two lines read as they did', async () => {
    ;(groundsApi.peopleAndSetup as any).mockResolvedValue(SERVED_TO_GRACE)
    renderPage(props({ ground: { ...theSalesCheckIn(), directMorningOn: false } }))
    await screen.findByText('5 people answer every weekday, until 30 October, on WhatsApp or here.')
    expect(screen.getByText('The scenario and kind of work decide the board, the reports, and what each check-in asks about.')).toBeTruthy()
  })
})

/**
 * WHO MAY SEE WHOM, ON THE PAGE IN USE. Moved here (7 November 2026) from the specs of two components batch 1 stopped drawing,
 * WhoIsInThis.tsx and RolesInThisCheckIn.tsx, when both were deleted. Every privacy rule those specs held is checked again here,
 * rendered as each reader of the page that now draws the roster: Grace, who runs it; Naomi, an admin who does not; and a team
 * member, who reads only her own short page.
 */
describe('who may see whom, as each reader reads the roster', () => {
  const NOTES = ['Sales lead', 'Rep, Nairobi hardware shops', 'Rep, Kiambu and schools', 'Agent, Thika']

  it('Naomi, an admin who does not run it, reads no note the lead wrote about anybody, even with the notes still on the row', async () => {
    /* The server strips the notes for her (theLeadsWordsAbout, grounds.service.ts); this proves the page would not show them either. */
    ;(groundsApi.peopleAndSetup as any).mockResolvedValue(SERVED_TO_NAOMI)
    renderPage(props({ ground: theSalesCheckIn({ mayChangeSetup: false }), user: { id: 'u-naomi' }, isInitiator: false, isOrgAdmin: true, viewerIsAParty: false }))
    await screen.findByText('5 people answer every weekday, until 30 October, on WhatsApp or here.')
    const text = document.body.textContent ?? ''
    const values = Array.from(document.querySelectorAll('input, textarea')).map((el) => (el as HTMLInputElement).value)
    for (const note of NOTES) {
      expect(text).not.toContain(note)
      expect(values).not.toContain(note)
    }
    expect(screen.queryByLabelText('Their role here, for Kevin Otieno')).toBeNull()
    expect(screen.getAllByText('Grace has described it.').length).toBe(4)
  })

  it('a team member reads her own short page, which names the lead and carries nobody else, on a check-in that hides people from each other', async () => {
    ;(groundsApi.peopleAndSetup as any).mockResolvedValue({
      on: true, view: 'member', howItRuns: '3 people answer every week, until 30 November, here.',
      yourRole: 'Field officer', status: 'AWAITING_PARTIES', yourSessionsDone: 1, sessionsPlanned: 6, runsIt: 'Rukia Otieno',
      whoSeesWhat: "Rukia knows who is here. You see the team's report once it's shared, without names.",
    })
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { container } = render(<QueryClientProvider client={qc}><YourPeopleAndSetup groundId="g-hidden" /></QueryClientProvider>)
    await screen.findByText("Rukia knows who is here. You see the team's report once it's shared, without names.")
    expect(container.textContent).not.toMatch(/Your lead/)
    expect(container.textContent).toBe(
      '3 people answer every week, until 30 November, here.'
      + 'Your roleField officer'
      + 'Your statusThis check-in is open, and waiting on people to check in.'
      + 'Your sessionsYou have completed 1 session, out of 6.'
      + 'Runs itRukia Otieno'
      + "Rukia knows who is here. You see the team's report once it's shared, without names.",
    )
  })

  it('the roster says who has checked in, and never a word of what anybody said, to Grace or to Naomi', async () => {
    const ground = theSalesCheckIn({
      checkIns: [{ id: 'c-kevin', participantId: 'p-kevin', status: 'COMPLETED', summary: 'I closed the Kilele deal on Monday', messages: [{ content: 'Kilele paid in full' }] }],
    })
    const parties = [{ id: 'p-kevin', done: true, isSelf: false }, { id: 'p-mercy', done: false, isSelf: false }]
    for (const reader of [
      { served: SERVED_TO_GRACE, over: {} },
      { served: SERVED_TO_NAOMI, over: { user: { id: 'u-naomi' }, isInitiator: false, isOrgAdmin: true, viewerIsAParty: false } },
    ]) {
      ;(groundsApi.peopleAndSetup as any).mockResolvedValue(reader.served)
      const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
      const { unmount } = render(<QueryClientProvider client={qc}><MemoryRouter><CheckInPeopleAndSetup {...props({ ground, whoIsInThisParties: parties, ...reader.over }) as any} /></MemoryRouter></QueryClientProvider>)
      await screen.findByText('5 people answer every weekday, until 30 October, on WhatsApp or here.')
      const text = document.body.textContent ?? ''
      expect(text).toContain('Kevin Otieno has checked in for this session.')
      expect(text).toContain('Mercy Wanjiru has not checked in for this session yet.')
      expect(text).not.toMatch(/Kilele/)
      unmount()
    }
  })

  it('nobody is said to be late before the session opens', async () => {
    ;(groundsApi.peopleAndSetup as any).mockResolvedValue(SERVED_TO_GRACE)
    renderPage(props({ whoIsInThisParties: [{ id: 'p-kevin', done: false, isSelf: false }, { id: 'p-grace', done: false, isSelf: true }], whoIsInThisNotOpenYet: true }))
    await screen.findByText('5 people answer every weekday, until 30 October, on WhatsApp or here.')
    expect(document.body.textContent).not.toMatch(/checked in for this session|late/i)
  })

  it('Naomi, on a check-in that hides people from each other, reads that she can see who is here, never the sentence meant for a team member', async () => {
    ;(groundsApi.peopleAndSetup as any).mockResolvedValue(SERVED_TO_NAOMI)
    renderPage(props({ ground: theSalesCheckIn({ mayChangeSetup: false }), user: { id: 'u-naomi' }, isInitiator: false, isOrgAdmin: true, viewerIsAParty: false, whoIsInThisPeersHidden: true }))
    await screen.findByText('5 people answer every weekday, until 30 October, on WhatsApp or here.')
    expect(screen.getByText('People on this check-in answer without seeing each other. You can see who is here.')).toBeTruthy()
    expect(document.body.textContent).not.toMatch(/knows who is here|Your lead|will not see the others/)
  })

  it('an address the server did not send her is not on the page, and somebody with no name and no address is "Somebody invited by email"', async () => {
    ;(groundsApi.peopleAndSetup as any).mockResolvedValue(SERVED_TO_NAOMI)
    const hidden = theSalesCheckIn({
      mayChangeSetup: false,
      participants: [
        ...theSalesCheckIn().participants.map((p: any) => ({ ...p, email: null, roleAsDescribed: null })),
        person('p-zawadi', null, '', '', { email: null, nameGiven: null, inviteDeliveryStatus: 'PENDING' }),
      ],
    })
    renderPage(props({ ground: hidden, user: { id: 'u-naomi' }, isInitiator: false, isOrgAdmin: true, viewerIsAParty: false }))
    await screen.findByText('5 people answer every weekday, until 30 October, on WhatsApp or here.')
    expect(screen.getAllByText('Somebody invited by email').length).toBeGreaterThan(0)
    expect(document.body.textContent).not.toMatch(/@dropaccess\.test|A colleague|Zawadi/)
  })
})

/**
 * THE PERMISSION STAYS IN THE SERVICE (W13-5; moved from who-is-in-this.spec.tsx, 7 November 2026). The server decides who may
 * see whom and filters the payload; the pages draw what they are given. If a page grew its own peer rule, the rule would exist in
 * two places and they would disagree.
 */
describe('who may be seen is decided by the server, not by the page', () => {
  const raw = (rel: string) => readFileSync(join(__dirname, rel), 'utf8')
  const code = (rel: string) => raw(rel).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

  it('the roster on People and setup draws every person it is served, with no peer rule of its own', () => {
    const page = raw('./PeopleAndSetupAsPictured.tsx')
    const roster = page.slice(page.indexOf("{/* 3. WHO'S IN IT */}"), page.indexOf('{/* 4. WHEN IT RUNS */}'))
      .replace(/\/\*[\s\S]*?\*\//g, '')
    expect(roster.length).toBeGreaterThan(0)
    expect(roster).not.toMatch(/peersVisible|restrictExternalVisibility|hidePeers|participants\.filter\(/)
    expect(roster).toContain('[...participants].sort(')
    expect(code('./PeopleAndSetupAsPictured.tsx')).toContain('const participants: any[] = g?.participants ?? []')
  })

  it('a team member\'s page draws what the service serves her, rather than a roster built from a role', () => {
    expect(code('./GroundParticipantPage.tsx')).toContain("{tab === 'settings' && <YourPeopleAndSetup groundId={id ?? ''} />}")
    expect(code('./YourPeopleAndSetup.tsx')).toContain('groundsApi.peopleAndSetup(groundId)')
  })

  it('and that page has no peer rule of its own, so the rule exists in one place', () => {
    expect(code('./YourPeopleAndSetup.tsx')).not.toMatch(/peersVisible|participants|restrictExternalVisibility|hidePeers/)
  })

  it('the page that runs the check-in qualifies "peers hidden" by who is reading, since whoever runs it is not one of the people it hides', () => {
    expect(code('./GroundAdminPage.tsx'))
      .toMatch(/whoIsInThisPeersHidden = \(ground as any\)\.peersVisibleEffective === false && !canRunThisGround/)
  })

  it('and a team member\'s page still gets the rule unqualified', () => {
    expect(code('./GroundParticipantPage.tsx')).not.toMatch(/peersVisibleEffective === false &&/)
  })

  it('"not open yet" is read off the same two values the composer reads', () => {
    expect(code('./GroundAdminPage.tsx')).toMatch(/const whoIsInThisNotOpenYet = !myOpenCheckInId && !!myNextOpensAt/)
  })
})
