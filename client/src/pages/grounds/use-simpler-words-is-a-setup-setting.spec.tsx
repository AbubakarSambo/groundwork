import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CheckInPeopleAndSetup } from './CheckInPeopleAndSetup'
import { groundsApi } from '@/api/grounds'

/**
 * "USE SIMPLER WORDS" (6 October answer from the engine workspace), on the check-in's own setup
 * page, next to "Over WhatsApp". The field is `simplerWords` on the check-in, changed through
 * `PATCH /grounds/:id/simpler-words` with `{ on }`, and only the lead of the check-in or an admin
 * who runs it may change it (the server's own refusal, served word for word). The label and its one
 * sentence are copied exactly from the engine's answer, and nothing beyond it is promised: the
 * WhatsApp reply, the phone report, reminders and emails still send their usual sentences today.
 *
 * 4 November 2026: People and setup is the B8 page for everybody now (Release 1B's switch went). There the setting is a
 * checkbox under "How people answer", with B8's own sentence beside it, for whoever may change the setup, with no "Change"
 * to press; like every setting on that page it is sent when "Save changes" is pressed.
 */

vi.mock('@/api/grounds', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/grounds')>()
  return {
    ...actual,
    groundsApi: {
      ...actual.groundsApi,
      baselineHistory: vi.fn().mockResolvedValue([]),
      baselineEntries: vi.fn().mockResolvedValue([]),
      baselineEntryCandidates: vi.fn().mockResolvedValue([]),
    },
  }
})

function ground(over: Record<string, any> = {}) {
  return {
    id: 'g1', label: 'Sales team, Q3', status: 'ACTIVE', scenario: 'SALES', timelineDays: 90, cadence: 'WEEKLY',
    initiatorId: 'u-lead', simplerWords: false,
    participants: [
      { id: 'p-lead', userId: 'u-lead', email: 'lead@x.test', partyType: 'INITIATOR', user: { firstName: 'Amina', lastName: 'Wanjiru' } },
    ],
    ...over,
  }
}

function baseProps(over: Record<string, any> = {}) {
  const setSimplerWords = { mutate: vi.fn(), isPending: false }
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
    setSimplerWords,
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

describe('"Use simpler words", on the check-in\'s own setup', () => {
  it('reads off by default, to the lead', async () => {
    renderWith()
    const box = await screen.findByRole('switch', { name: 'Use simpler words' })
    expect(box.getAttribute('aria-checked')).toBe('false')
  })

  it('switching it on and saving sends { on: true }, and the row shows on', async () => {
    const props = renderWith()
    fireEvent.click(await screen.findByRole('switch', { name: 'Use simpler words' }))
    expect(props.setSimplerWords.mutate).not.toHaveBeenCalled()
    fireEvent.click(await screen.findByRole('button', { name: 'Save changes' }))
    expect(props.setSimplerWords.mutate).toHaveBeenCalledWith(true)

    // Reflects the server's answer once the ground is read back with it on.
    cleanup()
    const onProps = baseProps({ ground: ground({ simplerWords: true }) })
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={qc}>
        <CheckInPeopleAndSetup {...(onProps as any)} />
      </QueryClientProvider>,
    )
    expect((await screen.findByRole('switch', { name: 'Use simpler words' })).getAttribute('aria-checked')).toBe('true')
  })

  it('carries one plain sentence, and nothing it does not do today', async () => {
    renderWith()
    expect(await screen.findByText('Short sentences and everyday words, in the check-in and everything sent afterwards')).toBeTruthy()
  })

  it('is not shown to a participant', async () => {
    // This page is never reached by a plain participant (only the lead or an org admin land here -
    // see the access note at the top of CheckInPeopleAndSetup.tsx), so a reader who is neither
    // never sees this row at all.
    renderWith({ isInitiator: false, isOrgAdmin: false, viewerIsAParty: false })
    await waitFor(() => expect(screen.queryByText('Use simpler words')).toBeNull())
  })

  it('an admin who runs it may also change it, with the same condition as Over WhatsApp', async () => {
    renderWith({ isInitiator: false, isOrgAdmin: true, viewerIsAParty: false })
    expect(await screen.findByRole('switch', { name: 'Use simpler words' })).not.toBeDisabled()
  })

  it('a refusal, when it comes, is said in the server\'s own served sentence, never a made-up one', async () => {
    /*
     * The row has no error text of its own: a refusal is the toast GroundAdminPage.tsx raises from
     * the mutation's `onError`, the same pattern every other setup switch on this page uses
     * ("Over WhatsApp" included) - it shows whatever the server actually said
     * (`e?.response?.data?.message`) rather than a sentence invented here, so the page never
     * promises a wording the server did not serve.
     */
    const { readFileSync } = await import('node:fs')
    const { join } = await import('node:path')
    const admin = readFileSync(join(__dirname, 'GroundAdminPage.tsx'), 'utf8')
    expect(admin).toMatch(/const setSimplerWords = useMutation\(\{[\s\S]{0,200}onError: \(e: any\) => toast\.error\(e\?\.response\?\.data\?\.message \?\? 'That did not change\.'\)/)
  })
})

describe('the real API call', () => {
  it('PATCHes /grounds/:id/simpler-words with { on } and reads back { id, simplerWords }', async () => {
    const spy = vi.spyOn((await import('@/api/client')).apiClient, 'patch').mockResolvedValue({ data: { id: 'g1', simplerWords: true } } as any)
    const result = await groundsApi.setSimplerWords('g1', true)
    expect(spy).toHaveBeenCalledWith('/grounds/g1/simpler-words', { on: true })
    expect(result).toEqual({ id: 'g1', simplerWords: true })
    spy.mockRestore()
  })
})
