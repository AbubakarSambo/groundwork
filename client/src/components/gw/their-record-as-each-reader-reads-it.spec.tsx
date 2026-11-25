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
 *
 * Since 24 November 2026 the record is not a section of its own (Hafsah's cuts to My work): what it holds about their work is a row
 * each under What you achieved, the coaching Groundwork gave them is under Coaching, and how their check-ins went is said once, in How
 * you're performing and the Your check-ins card, not a third time here.
 */
const S: any = (SERVED as any).default ?? SERVED

function myWork(payload: any) {
  vi.mocked(groundsApi.myWork).mockResolvedValue(payload)
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={qc}><MemoryRouter><MyWorkPage groundId="g1" /></MemoryRouter></QueryClientProvider>)
}
/** The rows under What you achieved (or What Aisha achieved), where the record's parts are read. */
async function achieved() {
  return within(await screen.findByRole('list', { name: /^What .*achieved$/ }))
}
async function coaching() {
  await screen.findByText('Coaching')
  /* The card's own heading sits first inside it. */
  return within(screen.getByText('Things to do better').parentElement as HTMLElement)
}

describe('on My work', () => {
  it('Aisha reads her own record under What you achieved, with her words, what would change it, and her other check-in', async () => {
    myWork(S.myWork['Aisha as Aisha'])
    const r = await achieved()
    expect(r.getByText('You said four times that something was sold, paid or signed. None of them has proof on file, and you took one back later.')).toBeTruthy()
    expect(r.getByText('Adding the photo, slip or link when you say something is done would change this.')).toBeTruthy()
    expect(r.getByText('On Monday 19 October you said “FN-006 for Baraka Hardware has been paid.” Nothing on file shows it yet.')).toBeTruthy()
    expect(r.getByText('In your other check-ins')).toBeTruthy()
    expect(r.getByText(/^In Litigation team daily, /)).toBeTruthy()
    /* No section of its own any more. */
    expect(screen.queryByText('Your record in Fee notes')).toBeNull()
  })

  it('Aisha reads the coaching Groundwork gave her, and whether it worked, under Coaching', async () => {
    myWork(S.myWork['Aisha as Aisha'])
    const c = await coaching()
    expect(c.getByText('After your check-in on Monday 12 October, Groundwork told you “Add the photo, slip or link when you say something is done. For FN-009, that would be the payment slip, the bank statement or the M-Pesa message.”')).toBeTruthy()
    expect(c.getByText('Backing what you say with proof has stayed the same since then.')).toBeTruthy()
  })

  it('how her check-ins went is not said a third time under What you achieved', async () => {
    myWork(S.myWork['Aisha as Aisha'])
    const r = await achieved()
    expect(r.queryByText('Your check-ins')).toBeNull()
  })

  it('Wanjiru reads Aisha’s record by name, and nothing of Aisha’s other check-ins', async () => {
    myWork(S.myWork['Aisha as Wanjiru'])
    const r = await achieved()
    expect(r.getByText('Aisha said four times that something was sold, paid or signed. None of them has proof on file, and Aisha took one back later.')).toBeTruthy()
    expect(r.queryByText('In your other check-ins')).toBeNull()
    expect(document.body.textContent).not.toContain('Litigation team daily')
  })

  it('Grace reads Joseph’s two figures for Mama Pima, and the coaching he was given', async () => {
    myWork(S.myWork['Joseph as Grace'])
    const r = await achieved()
    expect(r.getByText('On Monday 12 October Joseph said 10 units for Mama Pima Stores, and on Tuesday 13 October Joseph said 15 units.')).toBeTruthy()
    const c = await coaching()
    expect(c.getByText('After Joseph’s check-in on Monday 12 October, Groundwork told Joseph “Add the photo, slip or link when you say something is done.”')).toBeTruthy()
  })

  it('Kevin, Mercy and Njeri read that what they said has proof, with nothing that needs changing', async () => {
    for (const [who, says] of [
      ['Kevin as Kevin', 'You said four times that something was sold, paid or signed. Three of them have proof on file.'],
      ['Mercy as Mercy', 'You said five times that something was sold, paid or signed, and every one has proof on file.'],
      ['Njeri as Njeri', 'You said once that something was sold, paid or signed, and it has proof on file.'],
    ] as const) {
      const { unmount } = myWork(S.myWork[who])
      const r = await achieved()
      expect(r.getByText(says)).toBeTruthy()
      expect(r.queryAllByText(/would change this\.$/)).toEqual([])
      unmount()
    }
  })

  it('Njeri reads the blocker she raised, and what she had tried, under What you achieved', async () => {
    myWork(S.myWork['Njeri as Njeri'])
    const r = await achieved()
    expect(r.getByText('Blockers')).toBeTruthy()
  })

  it('with the direct morning off, nothing of it is drawn', async () => {
    const { record, ...off } = S.myWork['Aisha as Aisha']
    myWork(off)
    expect(await screen.findByText('Aisha’s work')).toBeTruthy()
    expect(document.body.textContent).not.toContain('something was sold, paid or signed')
    expect(document.body.textContent).not.toContain('Groundwork told you')
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
