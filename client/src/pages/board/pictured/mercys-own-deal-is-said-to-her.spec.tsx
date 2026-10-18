import { it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TheOpenDeal } from './ThePicturedSalesBoard'

/**
 * THE DROP ACCESS SHORT RUN (gw_sweep_drop3), ITEM 14. Mercy opened her own Tuskys Westgate and read "Mercy’s account" and "Mercy,
 * last contact 4 days ago" above "Your read, in your words". Her own deal is said to her as hers, in one voice.
 */
vi.mock('@/api/reports', () => ({ reportsApi: { sharing: vi.fn(async () => null), release: vi.fn(), hold: vi.fn() } }))
const TUSKYS = {
  id: 't', kind: 'deal', name: 'Tuskys Westgate', stage: 'Contacted', owner: 'Mercy Wairimu', mark: 'said', value: null, lastSaidOn: '2026-10-14',
  contactHistory: [{ on: '2026-10-14', mark: 'said' }],
  groupSays: 'None of the four criteria is on record yet. It was last spoken about on 14 October. A next step is on record.',
  theirRead: { who: 'You', words: "There's not much else I can do for Tuskys Westgate until they see the samples." },
  nextStep: 'Joseph to bring the samples, by Thursday',
}

it('Mercy reads her own deal as "Your deal", with "Your read, in your words", and never her own name about herself', () => {
  render(<QueryClientProvider client={new QueryClient()}><MemoryRouter><TheOpenDeal r={TUSKYS} groupNote={null} today="2026-10-18" groundId="g1" onChange={null} ownTag="Your deal" /></MemoryRouter></QueryClientProvider>)
  const text = document.body.textContent ?? ''
  expect(text).toContain('Your deal')
  expect(text).toContain('Your read, in your words')
  expect(text).not.toMatch(/Mercy’s account|Mercy, last contact/)
})
