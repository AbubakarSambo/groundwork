/**
 * The server has returned `{ activated: false }` to a non-initiator since the reveal gate was
 * written, with a comment saying "the client shows the Reveal button". No client code called
 * `reportsApi.activate` — the page fell through to its no-report branch and told a participant the
 * report "appears once everybody has checked in", when everybody had, and the only thing missing
 * was their own agreement to the exchange.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { TheReveal, whatToSayIfItDidNotOpen } from './the-reveal-is-both-sides-at-once'
import { reportsApi } from '@/api/reports'

vi.mock('@/api/reports', () => ({ reportsApi: { activate: vi.fn() } }))

const wrap = (ui: React.ReactElement) => {
  const qc = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  })
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>)
}

beforeEach(() => vi.mocked(reportsApi.activate).mockReset())

describe('the reveal', () => {
  it('offers a control, rather than telling a participant to wait for people who have finished', () => {
    wrap(<TheReveal groundId="g1" />)
    expect(screen.getByText(/Everybody has checked in/i)).toBeTruthy()
    expect(screen.getByRole('button', { name: /show me the shared record/i })).toBeTruthy()
    expect(screen.queryByText(/appears once everybody has checked in/i)).toBeNull()
  })

  it('says why it is both sides at once, which is the whole point of the gate', () => {
    wrap(<TheReveal groundId="g1" />)
    expect(screen.getByText(/opens for both sides at the same moment/i)).toBeTruthy()
  })

  it('reassures them their own answers are already saved', () => {
    wrap(<TheReveal groundId="g1" />)
    expect(screen.getByText(/already saved/i)).toBeTruthy()
  })

  it('calls activate for this ground when pressed', async () => {
    vi.mocked(reportsApi.activate).mockResolvedValue({} as any)
    wrap(<TheReveal groundId="g1" />)
    fireEvent.click(screen.getByRole('button', { name: /show me/i }))
    await waitFor(() => expect(reportsApi.activate).toHaveBeenCalledWith('g1'))
  })

  it('and warns that it cannot be undone before they press it', () => {
    wrap(<TheReveal groundId="g1" />)
    expect(screen.getByText(/cannot be undone/i)).toBeTruthy()
  })
})

describe('what to say if it did not open', () => {
  /* Tested here rather than by driving a rejected mutation through the runner: the sentence is the
     thing that matters, and the runner's own handling of a rejection it has already seen handled
     is not. */
  it('says nothing was revealed, so nobody is left wondering what it did', () => {
    expect(whatToSayIfItDidNotOpen(new Error('network'))).toMatch(/Nothing has been revealed/)
  })

  it('prefers the server\'s own refusal where it gave one', () => {
    const refused = Object.assign(new Error('x'), { response: { data: { message: 'Report has not been released yet' } } })
    expect(whatToSayIfItDidNotOpen(refused)).toBe('Report has not been released yet')
  })

  it('ignores an empty or absent message rather than showing a blank', () => {
    for (const said of ['', '   ', undefined, null]) {
      const e = Object.assign(new Error('x'), { response: { data: { message: said } } })
      expect(whatToSayIfItDidNotOpen(e)).toMatch(/Nothing has been revealed/)
    }
  })

  it('and never leaves somebody without an instruction', () => {
    expect(whatToSayIfItDidNotOpen(undefined)).toMatch(/try again/i)
  })
})

describe('and the report page reaches it', () => {
  const page = fs.readFileSync(path.join(__dirname, 'ReportPage.tsx'), 'utf8')

  it('branches on activated: false BEFORE the no-report branch', () => {
    const reveal = page.indexOf("(report as any).activated === false")
    const noReport = page.indexOf('if (!report || (!(report as any).sharedPicture')
    expect(reveal).toBeGreaterThan(-1)
    expect(reveal).toBeLessThan(noReport)
  })

  it('so the endpoint has a caller at last', () => {
    const api = fs.readFileSync(path.join(__dirname, '..', '..', 'api', 'reports.ts'), 'utf8')
    expect(api).toContain('activate:')
    expect(fs.readFileSync(path.join(__dirname, 'the-reveal-is-both-sides-at-once.tsx'), 'utf8'))
      .toContain('reportsApi.activate(groundId)')
  })
})
