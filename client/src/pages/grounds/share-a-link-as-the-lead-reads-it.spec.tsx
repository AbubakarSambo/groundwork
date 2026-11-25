import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { render, screen, within, cleanup, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CheckInPeopleAndSetup } from './CheckInPeopleAndSetup'
import { ShareSection } from './ShareSection'

vi.mock('qrcode', () => ({ default: { toDataURL: () => Promise.resolve('data:image/png;base64,QR') }, toDataURL: () => Promise.resolve('data:image/png;base64,QR') }))

/*
 * "OR SHARE A LINK" ON THE CHECK-IN'S SETUP, AS THE LEAD READS IT (U.6, B1). Word for word against
 * docs/prototype/screens/B1-starting-a-check-in/setup.txt, less the two lines nothing backs yet.
 */
describe('share a link, as the lead reads it', () => {
  it('reads the prototype’s words, and offers the QR code to download', async () => {
    render(<ShareSection joinToken="abc123" />)
    const box = screen.getByRole('region', { name: 'Or share a link' })
    expect(within(box).getByText('For events, posters and groups where you don’t have everyone’s details.')).toBeTruthy()
    expect(within(box).getByRole('button', { name: 'Copy' })).toBeTruthy()
    expect(within(box).getByText(/\/answer\?t=abc123$/)).toBeTruthy()
    const download = await within(box).findByRole('link', { name: 'Download the QR code' })
    expect(download.getAttribute('download')).toBe('check-in-qr-code.png')
    expect(within(box).getByText('Anyone with the link can answer without an account and says who they are at the end.')).toBeTruthy()
    for (const notBacked of ['Turn the link off', 'take a seat', 'Broadcast link']) {
      expect(box.textContent, notBacked).not.toContain(notBacked)
    }
  })
})

describe('where people answer, on the same Setup', () => {
  /*
   * REPOINTED (People and setup rebuild, 29 Sept): GroundAdminPage.tsx still reads whether
   * WhatsApp is switched on (`useWhatsAppIsOn`) and hands it down as `whatsAppIsOn`.
   *
   * REPOINTED AGAIN (4 November 2026): People and setup is the B8 page for everybody now (Release 1B's switch went), where
   * the gate is the "Where" row under "How people answer". This used to match one line of the old page's source; it now
   * renders the page and reads the row, for each of the three cases.
   */
  const fn = () => vi.fn()
  const mut = () => ({ mutate: vi.fn(), isPending: false })
  function drawIt(whatsAppIsOn: boolean, orgHasWhatsApp: boolean) {
    const props: any = {
      ground: { id: 'g1', label: 'Sales team, Q3', status: 'ACTIVE', scenario: 'SALES', timelineDays: 90, cadence: 'WEEKLY', initiatorId: 'u-lead', mayChangeSetup: true, orgHasWhatsApp, participants: [] },
      user: { id: 'u-lead' }, id: 'g1', navigate: fn(), isInitiator: true, isOrgAdmin: false, viewerIsAParty: true,
      mySessionsDone: 0, plannedSessions: 12, addManyParticipants: fn(), billingStatus: null, onShareCode: fn(),
      fixingEmailId: null, setFixingEmailId: fn(), fixingEmailValue: '', setFixingEmailValue: fn(), fixEmail: mut(), resendInvite: mut(), updateRole: mut(),
      settingsChangeCount: 0, startsAtDraft: '', setStartsAtDraft: fn(), startsAtOnRecord: '', canOfferStartDate: false,
      timelineDaysDraft: 90, setTimelineDaysDraft: fn(), cadenceDraft: 'WEEKLY', setCadenceDraft: fn(), workingDaysDraft: [1, 2, 3, 4, 5], setWorkingDaysDraft: fn(),
      anchorDayDraft: null, setAnchorDayDraft: fn(), theTimeframeChanged: false, saveSetup: mut(),
      peersVisible: false, peersDefaultHidden: false, setPeerVisibility: mut(), contactHidden: false, setContactVisibility: mut(),
      numbersShared: false, setWhoSeesTargets: mut(), whatsAppIsOn, setOverWhatsApp: mut(), setSimplerWords: mut(),
      expectsUnblocking: false, setExpectThemToUnblock: mut(), setWorkTogether: mut(), setChasing: mut(),
      confirmDelete: false, setConfirmDelete: fn(), deleteError: null, setDeleteError: fn(), removeGround: mut(),
    }
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    return render(<QueryClientProvider client={qc}><MemoryRouter><CheckInPeopleAndSetup {...props} /></MemoryRouter></QueryClientProvider>)
  }

  it('is only offered while WhatsApp is switched on, as well as connected', () => {
    const admin = readFileSync(join(__dirname, 'GroundAdminPage.tsx'), 'utf8')
    expect(admin).toContain('const whatsAppIsOn = useWhatsAppIsOn()')

    /* One line with "Change" now (page audit, 24 November 2026, row 2): the choice opens from it. */
    drawIt(true, true)
    fireEvent.click(screen.getByRole('button', { name: 'Change, Where people answer' }))
    expect(screen.getByRole('combobox', { name: 'Where people answer' })).toBeTruthy()
    cleanup()

    for (const [on, connected] of [[false, true], [true, false], [false, false]] as const) {
      drawIt(on, connected)
      expect(screen.queryByRole('button', { name: 'Change, Where people answer' }), `switched on ${on}, connected ${connected}`).toBeNull()
      expect(screen.getByText('Here, in Groundwork only.')).toBeTruthy()
      cleanup()
    }
  })
})
