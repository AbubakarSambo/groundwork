import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { DeliveredPanel } from './DeliveredPanel'
import { groundsApi } from '@/api/grounds'

vi.mock('@/api/grounds', () => ({
  groundsApi: {
    /* One thing said already: an empty list draws nothing at all (Hafsah, 24 November 2026), so the wording is read with one. */
    myDeliveries: vi.fn().mockResolvedValue([{ id: 'd1', text: 'Signed Mama Pendo', evidence: null, objectiveId: null, carriedIntoCheckInId: null }]),
    addDelivery: vi.fn(),
    deleteMyDelivery: vi.fn(),
  },
}))

function mount() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <DeliveredPanel groundId="g1" expectations={[{ id: 'o1', text: 'Sign 12 shops' }]} />
    </QueryClientProvider>,
  )
}

/*
 * RE-REVIEW: THREE PIECES OF THIS PANEL READ AS FRAGMENTS OR OVER-STATED THE OPTION.
 * "Something nobody asked for" did not say it is about the reader's own work; "Where anyone can
 * see it - a link, a document, a date" joined pieces with a dash instead of a plain sentence; and
 * the footer ("This is not yours. It reaches your next session as something to ask about...")
 * read like a warning about ownership rather than a plain statement of what happens to it.
 */
describe('what you say you delivered, the wording', () => {
  it('names the option as something the reader did, not just "nobody asked for"', async () => {
    mount()
    expect(await screen.findByText('Something you did that nobody asked for')).toBeTruthy()
    expect(screen.queryByText('Something nobody asked for')).toBeNull()
  })

  it('the evidence field asks in a plain sentence, not a dash-joined fragment', async () => {
    mount()
    await screen.findByText('Something you did that nobody asked for')
    expect(screen.getByPlaceholderText('Where someone can see it, for example a link, a document or a date')).toBeTruthy()
  })

  it('the footer says plainly what happens to it, not that it is "not yours"', async () => {
    mount()
    await screen.findByText('Something you did that nobody asked for')
    expect(screen.getByText(/This goes to your next check-in, which will ask you about it\./)).toBeTruthy()
    expect(screen.queryByText(/This is not yours\./)).toBeNull()
  })
})

describe('what you say you delivered, with nothing said yet', () => {
  it('draws nothing at all: no heading, no empty form', async () => {
    vi.mocked(groundsApi.myDeliveries).mockResolvedValueOnce([])
    const { container } = mount()
    await new Promise((r) => setTimeout(r, 20))
    expect(container.textContent).toBe('')
    expect(screen.queryByText('What you say you delivered')).toBeNull()
  })
})
