import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import * as SERVED from './__fixtures__/night-run-2-their-record.json'

vi.mock('@/api/grounds', async () => {
  const actual = await vi.importActual<typeof import('@/api/grounds')>('@/api/grounds')
  return { ...actual, groundsApi: { ...actual.groundsApi, myWork: vi.fn(), get: vi.fn().mockResolvedValue({ id: 'g1', checkIns: [] }), getMySpecificity: vi.fn().mockResolvedValue(null) } }
})
vi.mock('@/api/reports', () => ({ reportsApi: { sessionReport: vi.fn(), get: vi.fn().mockResolvedValue({}), startSelfCorrection: vi.fn() } }))
vi.mock('@/api/conversation', () => ({ conversationApi: { artifact: vi.fn().mockResolvedValue(null), disputeEntry: vi.fn() } }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), message: vi.fn() } }))

import { groundsApi } from '@/api/grounds'
import { reportsApi } from '@/api/reports'
import { MyWorkPage } from '@/pages/grounds/MyWorkPage'
import { TheCheckInYouJustFinished } from './TheCheckInYouJustFinished'

/**
 * EACH PERSON'S RECORD AND THE COACHING GROUNDWORK GAVE THEM, AS EACH READER READS IT (Groundwork does the managing, part 1). Drawn from
 * what the API serves each reader from the second night run (`__fixtures__/night-run-2-their-record.json`, captured from readMyWork and
 * the reports controller with the direct morning on; api board/my-work-carries-their-record-as-each-reader-reads-it.spec.ts and
 * reports/your-own-report-carries-what-groundwork-followed-up.spec.ts prove the same payloads).
 */
const S: any = (SERVED as any).default ?? SERVED

function myWork(payload: any) {
  vi.mocked(groundsApi.myWork).mockResolvedValue(payload)
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(<QueryClientProvider client={qc}><MemoryRouter><MyWorkPage groundId="g1" /></MemoryRouter></QueryClientProvider>)
}
async function theRecordOnThePage() {
  return within((await screen.findByText(/record in /, { selector: 'h2, h3, .gwui-fold-name' })).closest('[data-gw-their-record]') as HTMLElement)
}

describe('on My work', () => {
  it('Aisha reads her own record, with her words, what would change it, her coaching, and her other check-in', async () => {
    myWork(S.myWork['Aisha as Aisha'])
    const r = await theRecordOnThePage()
    expect(r.getByText('Your record in Fee notes')).toBeTruthy()
    expect(r.getByText('You said four times that something was sold, paid or signed. None of them has proof on file, and you took one back later.')).toBeTruthy()
    expect(r.getByText('Adding the photo, slip or link when you say something is done would change this.')).toBeTruthy()
    expect(r.getByText('On Monday 19 October you said “FN-006 for Baraka Hardware has been paid.” Nothing on file shows it yet.')).toBeTruthy()
    expect(r.getByText('After your check-in on Monday 12 October, Groundwork told you “Add the photo, slip or link when you say something is done. For FN-009, that would be the payment slip, the bank statement or the M-Pesa message.”')).toBeTruthy()
    expect(r.getByText('Backing what you say with proof has stayed the same since then.')).toBeTruthy()
    expect(r.getByText('In your other check-ins')).toBeTruthy()
    expect(r.getByText(/^In Litigation team daily, /)).toBeTruthy()
  })

  it('Wanjiru reads Aisha’s record by name, and nothing of Aisha’s other check-ins', async () => {
    myWork(S.myWork['Aisha as Wanjiru'])
    const r = await theRecordOnThePage()
    expect(r.getByText('Aisha’s record in Fee notes')).toBeTruthy()
    expect(r.getByText('Aisha said four times that something was sold, paid or signed. None of them has proof on file, and Aisha took one back later.')).toBeTruthy()
    expect(r.queryByText('In your other check-ins')).toBeNull()
    expect(document.body.textContent).not.toContain('Litigation team daily')
  })

  it('Grace reads Joseph’s two figures for Mama Pima, and the coaching he was given', async () => {
    myWork(S.myWork['Joseph as Grace'])
    const r = await theRecordOnThePage()
    expect(r.getByText('On Monday 12 October Joseph said 10 units for Mama Pima Stores, and on Tuesday 13 October Joseph said 15 units.')).toBeTruthy()
    expect(r.getByText('After Joseph’s check-in on Monday 12 October, Groundwork told Joseph “Add the photo, slip or link when you say something is done.”')).toBeTruthy()
  })

  it('Kevin, Mercy and Njeri read that what they said has proof, and that Groundwork has not coached them', async () => {
    for (const [who, says] of [
      ['Kevin as Kevin', 'You said four times that something was sold, paid or signed. Three of them have proof on file.'],
      ['Mercy as Mercy', 'You said five times that something was sold, paid or signed, and every one has proof on file.'],
      ['Njeri as Njeri', 'You said once that something was sold, paid or signed, and it has proof on file.'],
    ] as const) {
      const { unmount } = (() => { const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } }); vi.mocked(groundsApi.myWork).mockResolvedValue(S.myWork[who]); return render(<QueryClientProvider client={qc}><MemoryRouter><MyWorkPage groundId="g1" /></MemoryRouter></QueryClientProvider>) })()
      const r = await theRecordOnThePage()
      expect(r.getByText(says)).toBeTruthy()
      expect(r.queryAllByText(/would change this\.$/)).toEqual([])
      expect(r.getByText('Groundwork has not coached you on anything yet.')).toBeTruthy()
      unmount()
    }
  })

  it('with the direct morning off, nothing of it is drawn', async () => {
    const { record, ...off } = S.myWork['Aisha as Aisha']
    myWork(off)
    expect(await screen.findByText('Aisha’s work')).toBeTruthy()
    expect(screen.queryByText(/record in Fee notes/)).toBeNull()
    expect(document.querySelector('[data-gw-their-record]')).toBeNull()
  })
})

describe('in your own report', () => {
  function ownReport(yourRecord: any) {
    vi.mocked(reportsApi.sessionReport).mockResolvedValue({ releaseOneSalesReport: true, yourOwnReport: { didWell: [], story: null, toldUs: [] }, ...(yourRecord ? { yourRecord } : {}) } as any)
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(<QueryClientProvider client={qc}><MemoryRouter><TheCheckInYouJustFinished checkInId="c2" groundId="g1" sessionNumber={2} pictured /></MemoryRouter></QueryClientProvider>)
  }

  /* Your record is on My work, not on your own report (Hafsah's answer, 25 October), even where the server sends it. */
  it('Aisha does not read her record on her own report', async () => {
    ownReport(S.ownReport['Aisha, session 2'])
    expect(await screen.findByText('Something here isn’t right')).toBeTruthy()
    expect(screen.queryByText('What Groundwork followed up for you')).toBeNull()
  })

  it('and nothing where the server sends nothing', async () => {
    ownReport(null)
    expect(await screen.findByText('Something here isn’t right')).toBeTruthy()
    expect(screen.queryByText('What Groundwork followed up for you')).toBeNull()
  })
})
