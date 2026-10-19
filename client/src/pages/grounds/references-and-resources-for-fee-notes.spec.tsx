import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReferencesAndResourcesPage } from './ReferencesAndResources'
import { groundsApi } from '@/api/grounds'
import SERVED from './__fixtures__/fee-notes-references-served.json'

/**
 * FEE NOTES IN REFERENCES AND RESOURCES, AS EACH READER READS IT ON SCREEN (Release 2, pull request 3 of 3; the B6 fee-notes
 * pictures). Drawn from what the server serves Wanjiru and Aisha for Muchemi & Co (test)'s fee notes check-in, word for word (the
 * JSON is the server's own output: references-and-resources-for-fee-notes.spec.ts checks the two never differ).
 */
vi.mock('@/api/grounds', async () => {
  const actual = await vi.importActual<typeof import('@/api/grounds')>('@/api/grounds')
  return {
    ...actual,
    groundsApi: { ...actual.groundsApi, referencesAndResources: vi.fn(), referencesEvidence: vi.fn(), baselineHistory: vi.fn(async () => []) },
  }
})

const S: any = SERVED
const GROUND = { id: 'g-muchemi-fee-notes', label: 'Fee notes', release1bTabsOn: true, contextEnabled: true, createdAt: '2026-10-01T08:00:00Z' }
function renderAs(served: any, isTheLead: boolean) {
  ;(groundsApi.referencesAndResources as any).mockResolvedValue(served)
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter><ReferencesAndResourcesPage groundId="g-muchemi-fee-notes" ground={GROUND} isTheLead={isTheLead} /></MemoryRouter>
    </QueryClientProvider>,
  )
}
beforeEach(() => vi.clearAllMocks())

describe('Wanjiru, the partner', () => {
  it('How we work holds Groundwork’s starting set for fee notes: Due, Promised and Paid, and the two risks', async () => {
    renderAs(S.wanjiru, true)
    await screen.findByText('Due: the date or event in the engagement letter has passed.')
    expect(screen.getByText('Promised: the client gave a date.')).toBeTruthy()
    expect(screen.getByText('Paid: with a slip, M-Pesa message or receipt.')).toBeTruthy()
    expect(screen.getByText('A court event that makes a fee note due, with no fee note raised.')).toBeTruthy()
    expect(screen.getByText('A promised date that passes without payment.')).toBeTruthy()
    expect(screen.getByText('Lines marked as Groundwork’s are the starting set for fee notes.')).toBeTruthy()
  })

  it('Documents hold the engagement letter and the fee schedule; Evidence holds the slip and the email, each on its fee note, with the pictures’ groups', async () => {
    renderAs(S.wanjiru, true)
    await screen.findByText('Engagement letter, Kasarani Foods.pdf')
    expect(screen.getByText('Fee schedule 2026.pdf')).toBeTruthy()
    expect(screen.getByText('Fee note FN-004')).toBeTruthy()
    expect(screen.getByText('Fee note FN-007')).toBeTruthy()
    const kinds = screen.getByRole('combobox', { name: 'Kind of evidence' })
    expect(within(kinds).getAllByRole('option').map((o) => o.textContent)).toEqual(['All', 'Court filings', 'Payments', 'Client letters', 'Other documents'])
  })
})

describe('Aisha, an associate', () => {
  it('reads the same starting set, the documents open to her, and only her own evidence', async () => {
    renderAs(S.aisha, false)
    await screen.findByText('Due: the date or event in the engagement letter has passed.')
    expect(screen.getByText('Fee schedule 2026.pdf')).toBeTruthy()
    expect(screen.queryByText('Engagement letter, Kasarani Foods.pdf')).toBeNull()
    expect(screen.getByText('Fee note FN-007')).toBeTruthy()
    expect(screen.queryByText('Fee note FN-004')).toBeNull()
    expect(document.body.textContent).not.toContain('Equity Bank')
  })
})
