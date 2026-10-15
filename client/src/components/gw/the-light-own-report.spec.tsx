import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'

vi.mock('@/api/reports', () => ({ reportsApi: { sessionReport: vi.fn(), get: vi.fn() } }))
vi.mock('@/api/conversation', () => ({ conversationApi: { artifact: vi.fn(), disputeEntry: vi.fn() } }))
vi.mock('@/api/grounds', () => ({ groundsApi: { get: vi.fn(), getMySpecificity: vi.fn() } }))

import { reportsApi } from '@/api/reports'
import { conversationApi } from '@/api/conversation'
import { groundsApi } from '@/api/grounds'
import { TheCheckInYouJustFinished } from './TheCheckInYouJustFinished'

/**
 * MIRIAM'S OWN REPORT ON A SALES CHECK-IN, AS SHE READS IT (sales-first.md, sections 2 and 5; the light
 * prototype's own report, docs/prototype/screens/B4-reports-and-sharing/own-report.txt, with the s71 truth fix).
 *
 * What you did well, What you told us, One thing to think about, then the rest folded. The rows are the shape the
 * reports serve her (`myRows`, her own lines alone, each with its mark and where it comes from). A photo is only
 * claimed where the server says a photo backs the line: the Green Mart quote she said "Later" to reads as her word.
 */
const ROWS = [
  { id: 'r1', type: 'PROGRESS', text: 'Lakeside Supermarket’s buyer confirmed the meeting on the 29th.', disputedAt: null, documented: true, mark: 'proven', how: 'From the photo you added.', typeSays: 'This is something you got done.', checkInId: 'c23', sessionNumber: 23 },
  { id: 'r2', type: 'PROGRESS', text: 'Green Mart has a quote.', disputedAt: null, documented: false, mark: 'said', how: 'You said this.', typeSays: 'This is what you said happened. It is not counted as done until something shows it.', checkInId: 'c23', sessionNumber: 23 },
  { id: 'r3', type: 'COMMITMENT', text: 'I’ll visit Westgate Deli on Friday.', disputedAt: null, documented: false, mark: 'said', how: 'You said you will do this. I will ask you how it went.', checkInId: 'c23', sessionNumber: 23 },
  { id: 'r0', type: 'PROGRESS', text: 'Another session’s line.', disputedAt: null, documented: true, mark: 'proven', how: 'From the photo you added.', checkInId: 'c22', sessionNumber: 22 },
]

function renderIt(light: boolean) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <TheCheckInYouJustFinished checkInId="c23" groundId="g1" sessionNumber={23} light={light} />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('Miriam’s own report on a sales check-in', () => {
  beforeEach(() => {
    vi.mocked(reportsApi.sessionReport).mockResolvedValue({
      sessionNumber: 23, plannedSessions: 46,
      counting: [{ who: 'Miriam', isYou: true, answered: true }],
      againstSuccess: { stated: null, conditions: [], definitions: [] },
      howClearThisWas: { level: null, saying: '' },
    } as any)
    vi.mocked(reportsApi.get).mockResolvedValue({ myRows: ROWS, couldTry: [], coaching: null } as any)
    vi.mocked(conversationApi.artifact).mockResolvedValue({ artifact: { summary: null, whatToCarry: 'What would help you get the Westgate Deli deposit this week?' } } as any)
    vi.mocked(groundsApi.get).mockResolvedValue({ checkIns: [{ id: 'c23', sessionNumber: 23, completedAt: '2026-10-15T12:00:00.000Z' }] } as any)
    vi.mocked(groundsApi.getMySpecificity).mockResolvedValue({ mostUseful: null, strongest: null } as any)
  })

  it('reads What you did well, What you told us and One thing to think about, in that order', async () => {
    renderIt(true)
    await screen.findByText('What you did well')
    const order = ['What you did well', 'What you told us', 'One thing to think about'].map((t) => document.body.textContent!.indexOf(t))
    expect(order.every((i) => i >= 0)).toBe(true)
    expect([...order].sort((a, b) => a - b)).toEqual(order)
    expect(screen.queryByText('What you said')).toBeNull()
    expect(screen.queryByText('What you carry into the next one')).toBeNull()
    expect(screen.getByText('What would help you get the Westgate Deli deposit this week?')).toBeTruthy()
  })

  it('What you did well holds only this session’s proven lines, with where the proof came from', async () => {
    renderIt(true)
    const block = (await screen.findByText('What you did well')).parentElement as HTMLElement
    expect(block.textContent).toContain('Lakeside Supermarket’s buyer confirmed the meeting on the 29th.')
    expect(block.textContent).toContain('From the photo you added.')
    expect(block.textContent).not.toContain('Green Mart has a quote.')
    expect(block.textContent).not.toContain('Another session’s line.')
  })

  it('no photo is claimed for the quote she did not add: her line is her word, marked so', async () => {
    renderIt(true)
    const told = (await screen.findByText('What you told us')).parentElement as HTMLElement
    const quote = [...told.querySelectorAll('p')].find((p) => p.textContent === '“Green Mart has a quote.”')!.parentElement as HTMLElement
    expect(quote.textContent).not.toMatch(/photo|document backs it/i)
    expect(quote.querySelector('[role="img"]')?.getAttribute('aria-label')).toBe('Only someone’s word')
    const lakeside = [...told.querySelectorAll('p')].find((p) => /Lakeside/.test(p.textContent ?? ''))!.parentElement as HTMLElement
    expect(lakeside.querySelector('[role="img"]')?.getAttribute('aria-label')).toBe('Proven')
  })

  it('another kind of check-in reads its own report as before', async () => {
    renderIt(false)
    expect(await screen.findByText('What you said')).toBeTruthy()
    expect(screen.queryByText('What you did well')).toBeNull()
    expect(screen.getByText('What you carry into the next one')).toBeTruthy()
    expect(document.querySelectorAll('[role="img"]').length).toBe(0)
  })
})
