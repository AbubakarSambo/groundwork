import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
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
  it('a weekly check-in offers the day-of-week picker once "How often" is opened', async () => {
    renderWith()
    await waitFor(() => expect(screen.getByText("Wairimu's check-in")).toBeTruthy())
    fireEvent.click(screen.getByText('How often').closest('.gwui-field-row')!.querySelector('button')!)
    expect(await screen.findByText('Which day of the week should check-ins open? (optional)')).toBeTruthy()
  })

  it('choosing Monday calls setAnchorDayDraft(1)', async () => {
    const props = renderWith()
    fireEvent.click(screen.getByText('How often').closest('.gwui-field-row')!.querySelector('button')!)
    await screen.findByText('Which day of the week should check-ins open? (optional)')
    fireEvent.click(screen.getByTitle('Monday'))
    expect(props.setAnchorDayDraft).toHaveBeenCalledWith(1)
  })

  it('"Save timeframe" sends cadenceAnchorDay in the PATCH', async () => {
    const props = renderWith({ theTimeframeChanged: true, anchorDayDraft: 1 })
    fireEvent.click(screen.getByText('How often').closest('.gwui-field-row')!.querySelector('button')!)
    const save = await screen.findByRole('button', { name: 'Save timeframe' })
    fireEvent.click(save)
    expect(props.saveSetup.mutate).toHaveBeenCalledWith(expect.objectContaining({ cadenceAnchorDay: 1 }))
  })

  it('a monthly check-in offers the day-of-month picker, 1st to 31st', async () => {
    renderWith({ cadenceDraft: 'MONTHLY', ground: ground({ cadence: 'MONTHLY' }) })
    fireEvent.click(screen.getByText('How often').closest('.gwui-field-row')!.querySelector('button')!)
    const select = await screen.findByLabelText('Which day of the month should check-ins open? (optional)')
    const options = [...select.querySelectorAll('option')].map(o => o.textContent)
    expect(options[0]).toBe('No fixed day')
    expect(options).toContain('31st of the month')
  })

  it('"How often" already shows the chosen day', async () => {
    renderWith({ ground: ground({ cadence: 'WEEKLY', cadenceAnchorDay: 1 }) })
    expect(await screen.findByText(/Lands on Mondays\./)).toBeTruthy()
  })

  it('is not offered to someone who may not change the setup', async () => {
    renderWith({ ground: ground({ mayChangeSetup: false }) })
    await waitFor(() => expect(screen.getByText("Wairimu's check-in")).toBeTruthy())
    const row = screen.getByText('How often').closest('.gwui-field-row') as HTMLElement
    expect(row.querySelector('button')).toBeNull()
  })
})
