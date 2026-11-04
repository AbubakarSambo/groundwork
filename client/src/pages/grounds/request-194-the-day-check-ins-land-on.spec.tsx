import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CheckInPeopleAndSetup } from './CheckInPeopleAndSetup'

/**
 * REQUEST 194 (8 October 2026): THE LEAD CAN CHANGE THE DAY CHECK-INS LAND ON, FROM "PEOPLE AND
 * SETUP", NOT ONLY WHILE SETTING UP.
 *
 * `PATCH /grounds/:id` now accepts `cadenceAnchorDay` (docs/answers-from-engine.md, "Request 194,
 * answered"): 0-6 (Sunday-Saturday) for a weekly or fortnightly rhythm, 1-31 for a monthly one,
 * `null` to clear it. This reuses the same day picker setup already offers (`AnchorDayPicker.tsx`,
 * pulled out of `TheSetup.tsx`), shown only to whoever `mayChangeSetup` says may change this
 * check-in's setup.
 *
 * 4 November 2026: People and setup is the B8 page for everybody now (Release 1B's switch went). There the picker sits
 * open under "How often" in "When it runs" for whoever may change the setup (no "Change" to press first), and the day goes
 * to the server with the rest of the timeframe when "Save changes" is pressed. A reader who may not change it reads the
 * day in the served "How this check-in runs" line (people-and-setup.ts, "every Monday"), which the api specs cover.
 */
function ground(over: Record<string, any> = {}) {
  return {
    id: 'g1', label: "Wairimu's check-in", status: 'ACTIVE', scenario: 'SALES', timelineDays: 90, cadence: 'WEEKLY',
    initiatorId: 'u-wairimu', mayChangeSetup: true, cadenceAnchorDay: null,
    participants: [
      { id: 'p-wairimu', userId: 'u-wairimu', email: 'wairimu@x.test', partyType: 'INITIATOR', user: { firstName: 'Wairimu', lastName: 'Njoroge' } },
    ],
    ...over,
  }
}

function baseProps(over: Record<string, any> = {}) {
  return {
    ground: ground(), user: { id: 'u-wairimu' }, id: 'g1', navigate: vi.fn(),
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
    anchorDayDraft: null as number | null, setAnchorDayDraft: vi.fn(),
    theTimeframeChanged: false, saveSetup: { mutate: vi.fn(), isPending: false },
    groundLabel: "Wairimu's check-in", setGroundLabel: vi.fn(),
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

describe('the day check-ins land on, from People and setup', () => {
  it('a weekly check-in offers the day-of-week picker under "How often"', async () => {
    renderWith()
    await screen.findByText('When it runs')
    expect(screen.getByRole('combobox', { name: 'How often' })).toBeTruthy()
    expect(screen.getByText('Which day of the week should check-ins open? (optional)')).toBeTruthy()
  })

  it('choosing Monday calls setAnchorDayDraft(1)', async () => {
    const props = renderWith()
    await screen.findByText('Which day of the week should check-ins open? (optional)')
    fireEvent.click(screen.getByTitle('Monday'))
    expect(props.setAnchorDayDraft).toHaveBeenCalledWith(1)
  })

  it('"Save changes" sends cadenceAnchorDay in the PATCH', async () => {
    const props = renderWith({ theTimeframeChanged: true, anchorDayDraft: 1 })
    fireEvent.click(await screen.findByRole('button', { name: 'Save changes' }))
    expect(props.saveSetup.mutate).toHaveBeenCalledWith(expect.objectContaining({ cadenceAnchorDay: 1 }))
  })

  it('a monthly check-in offers the day-of-month picker, 1st to 31st', async () => {
    renderWith({ cadenceDraft: 'MONTHLY', ground: ground({ cadence: 'MONTHLY' }) })
    const select = await screen.findByLabelText('Which day of the month should check-ins open? (optional)')
    const options = [...select.querySelectorAll('option')].map(o => o.textContent)
    expect(options[0]).toBe('No fixed day')
    expect(options).toContain('31st of the month')
  })

  it('the picker already shows the chosen day', async () => {
    renderWith({ ground: ground({ cadence: 'WEEKLY', cadenceAnchorDay: 1 }), anchorDayDraft: 1 })
    expect((await screen.findByTitle('Monday')).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByTitle('Tuesday').getAttribute('aria-pressed')).toBe('false')
  })

  it('is not offered to someone who may not change the setup', async () => {
    renderWith({ ground: ground({ mayChangeSetup: false }) })
    await screen.findByText('When it runs')
    expect(screen.queryByText('Which day of the week should check-ins open? (optional)')).toBeNull()
    expect(screen.queryByRole('combobox', { name: 'How often' })).toBeNull()
  })
})
