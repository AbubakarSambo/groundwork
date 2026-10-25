import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReviewPage } from './ReviewPage'
import { useAuthStore } from '@/stores/auth'
import AS_PICTURED from './__fixtures__/release-7-review-as-pictured.json'

vi.mock('@/api/suites', () => ({ reviewsApi: { board: vi.fn(), mine: vi.fn(), start: vi.fn(), one: vi.fn(), words: vi.fn(), view: vi.fn(), decide: vi.fn(), correct: vi.fn() } }))
import { reviewsApi } from '@/api/suites'

/* Release 7, hand-written data only: Daniel's review as the engine builds it (suites/the-review-as-pictured), read by Wairimu, who decides it. */
const REVIEW: any = {
  reader: 'writer', id: 'r-d', name: 'Daniel Okafor', firstName: 'Daniel', writtenWith: 'Wairimu Kamau', writtenWithFirstName: 'Wairimu', dueOn: '2026-10-01',
  noticed: [], managersWords: null, theirView: 'When the direction changed, I moved quickly', decision: null, mayWrite: true, record: null, recognise: null,
  briefing: { heading: 'Before you talk', counts: [], patterns: [], patternsNote: null, changedAfterEarlierConversations: [], corrections: [], whoDecides: 'You decide.' },
  asPictured: AS_PICTURED,
}

describe('Release 7: a review built from check-ins, on screen', () => {
  it('reads the three readings, what he committed to and did, blocked or dropped, his view, and who decides, in that order', async () => {
    useAuthStore.setState({ user: { id: 'u-wairimu' } as any })
    ;(reviewsApi.one as any).mockResolvedValue(REVIEW)
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter initialEntries={['/suite/reviews/r-d']}><Routes><Route path="/suite/reviews/:id" element={<ReviewPage />} /></Routes></MemoryRouter></QueryClientProvider>)
    await screen.findByText('Did the work produce what was intended?')
    expect(screen.getByText('5 on “Corporate renewals”, against a first target of 5 and a later one of 8.')).toBeTruthy()
    const heads = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)
    expect(heads.slice(0, 5)).toEqual(['What Daniel committed to, and what Daniel did', 'Blocked, or dropped it?', 'Daniel’s own view', 'Wairimu decides', expect.any(String)])
    const blocked = screen.getByRole('list', { name: 'Blocked, or dropped it' })
    expect(within(blocked).getByText('The situation, mostly. Daniel was waiting on the accounts for a contact at four of the accounts.')).toBeTruthy()
    expect(document.body.textContent).not.toMatch(/\b(PIP|exit|at risk|score)\b/)
  })
})
