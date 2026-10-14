import { describe, it, expect, vi } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'

/**
 * "THIS ADDS A SEAT: +$5 A MONTH" BEFORE AN INVITATION GOES (fix list item 6), as Wairimu, who leads a check-in at Baridi,
 * reads it on the invite form: said when the next person goes past the plan's seats, and nothing otherwise.
 */
const m = vi.hoisted(() => ({ next: { addsASeat: true, says: 'This adds a seat: +$5 a month' } as any }))
vi.mock('@/api/billing', async () => {
  const actual = await vi.importActual<typeof import('@/api/billing')>('@/api/billing')
  return { ...actual, billingApi: { ...actual.billingApi, nextSeat: vi.fn().mockImplementation(async () => m.next) } }
})

import { ThisAddsASeat } from './this-adds-a-seat'

function show() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={qc}><MemoryRouter><ThisAddsASeat /></MemoryRouter></QueryClientProvider>)
}

describe('the price of the next seat, before an invitation', () => {
  it('past the plan\'s seats, Wairimu reads "This adds a seat: +$5 a month"', async () => {
    m.next = { addsASeat: true, says: 'This adds a seat: +$5 a month' }
    show()
    await waitFor(() => expect(document.body.textContent).toBe('This adds a seat: +$5 a month'))
  })

  it('with a seat to spare, nothing is said', async () => {
    m.next = { addsASeat: false, says: null }
    show()
    await new Promise((r) => setTimeout(r, 20))
    expect(document.body.textContent).toBe('')
  })
})
