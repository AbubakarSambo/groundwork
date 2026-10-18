import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WhatNeedsYou } from './pictured/ThePicturedSalesBoard'
import { reportsApi } from '@/api/reports'

/**
 * TODAY'S REPORT SHARES ITSELF, UNLESS THE LEAD HOLDS IT (Hafsah's answers 1 and 5, 16 October 2026; board-as-lead.jpg).
 * Wairimu reads "Today’s report shares itself at 6:30pm", "Read it first if you like, or share it now.", "Share now"
 * and "Hold it". "Share now" shares it; "Hold it" holds it, and then she reads that she is holding it, with "Share now"
 * only. An admin who only reads is told none of it.
 */
vi.mock('@/api/reports', () => ({ reportsApi: { sharing: vi.fn(), release: vi.fn(async () => ({})), hold: vi.fn(async () => ({})) } }))
vi.mock('@/api/check-in-links', () => ({ checkInLinksApi: { get: vi.fn(async () => ({ links: [] })) } }))

const TODAY = [{ sessionNumber: 38, shared: false, answered: 5 }]

function renderIt(readOnly = false) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <WhatNeedsYou b={{ decisions: [] }} renderActions={() => null} groundId="g1" deals={{ rows: [] }} sessionRows={TODAY} readOnly={readOnly} />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('today’s report on the lead’s board', () => {
  beforeEach(() => vi.clearAllMocks())

  it('Wairimu reads when it shares itself, and may share it now or hold it', async () => {
    vi.mocked(reportsApi.sharing).mockResolvedValue({ sessionNumber: 38, shared: false, held: false, at: '6:30pm', says: 'Today’s report shares itself at 6:30pm.' })
    renderIt()
    expect(await screen.findByText('Today’s report shares itself at 6:30pm')).toBeTruthy()
    expect(screen.getByText('Read it first if you like, or share it now.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Hold it' }))
    await waitFor(() => expect(reportsApi.hold).toHaveBeenCalledWith('g1'))
    fireEvent.click(screen.getByRole('button', { name: 'Share now' }))
    await waitFor(() => expect(reportsApi.release).toHaveBeenCalledWith('g1'))
  })

  it('once she holds it, she reads that she is holding it, and only "Share now"', async () => {
    vi.mocked(reportsApi.sharing).mockResolvedValue({ sessionNumber: 38, shared: false, held: true, at: '6:30pm', says: 'You are holding today’s report. Nobody in the team sees it until you share it.' })
    renderIt()
    expect(await screen.findByText('You are holding today’s report. Nobody in the team sees it until you share it')).toBeTruthy()
    expect(screen.getByText('Share it when you are ready.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Hold it' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Share now' })).toBeTruthy()
  })

  it('an admin who only reads is told nothing about sharing it', async () => {
    renderIt(true)
    await new Promise((r) => setTimeout(r, 20))
    expect(screen.queryByText(/shares itself/)).toBeNull()
    expect(screen.queryByRole('button', { name: 'Hold it' })).toBeNull()
    expect(reportsApi.sharing).not.toHaveBeenCalled()
  })
})
