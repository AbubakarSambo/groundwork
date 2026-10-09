import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReviewPage } from './ReviewPage'
import { useAuthStore } from '@/stores/auth'
import type { ReviewForTheWriter } from '@/api/suites'

/**
 * "YOUR DECISION" ONLY TO WHOEVER MADE IT (decision 113), found on test bed copy a, 9 October. Where any admin
 * may write a review, every admin reads it as its writer. Before this, Peter, the admin deciding Fatuma's appeal,
 * read Grace's decision as "Your decision ... Fatuma sees your decision and your reasons." right above "Fatuma
 * appealed Grace's decision ... You are an admin who did not decide this review"; and once Sade had changed the
 * decision, Grace, the reviewer, read Sade's decision as her own. The server now says who made the decision as it
 * stands (`decidedByYou`, `decidedByFirstName`).
 */
vi.mock('@/api/suites', () => ({ reviewsApi: { one: vi.fn(), appeal: vi.fn(), addToTheAppeal: vi.fn(), decideTheAppeal: vi.fn() } }))
import { reviewsApi } from '@/api/suites'

const WAS = { says: 'Fatuma stays in her role. The late September close is not counted against her.', reasons: 'The bank statements arrived on 5 October.' }
const NOW = { says: 'Fatuma stays in her role, and the September close is recorded as delayed by the bank.', reasons: 'The bank confirmed in writing that the statements came late.' }
const BASE: ReviewForTheWriter = {
  reader: 'writer', id: 'r1', name: 'Fatuma Bello', firstName: 'Fatuma', writtenWith: 'Grace Achieng', writtenWithFirstName: 'Grace', dueOn: '2026-10-09',
  noticed: [], managersWords: null, managersWordsById: null, theirView: null, decision: WAS, mayWrite: true,
}
const PETER_BEFORE: ReviewForTheWriter = { ...BASE, decidedByYou: false, decidedByFirstName: 'Grace', appeal: {
  reader: 'admin', stands: 'with-an-admin', says: "Fatuma appealed Grace's decision on 8 November. You are an admin who did not decide this review, so you decide the appeal.",
  personFirstName: 'Fatuma', appealedOn: '8 November', theirReasons: 'Not because of my work.', additions: [], mayDecide: true, outcome: null, decidedByFirstName: null, reasons: null, decisionWas: null } }
const CHANGED = { stands: 'decided' as const, personFirstName: 'Fatuma', appealedOn: '8 November', mayDecide: false, outcome: 'changed' as const, decidedByFirstName: 'Sade', reasons: NOW.reasons, decisionWas: WAS }
const GRACE_AFTER: ReviewForTheWriter = { ...BASE, decision: NOW, decidedByYou: false, decidedByFirstName: 'Sade', appeal: {
  ...CHANGED, reader: 'reviewer', says: 'Fatuma appealed your decision. Sade, an admin, has read the appeal and has changed the decision.' } }
const SADE_AFTER: ReviewForTheWriter = { ...BASE, decision: NOW, decidedByYou: true, decidedByFirstName: 'Sade', appeal: {
  ...CHANGED, reader: 'admin', says: 'Fatuma appealed the decision on 8 November. You read the appeal and changed the decision.', theirReasons: 'Not because of my work.', additions: [] } }

function open(user: any) {
  useAuthStore.setState({ user, token: 't', isAuthenticated: true } as any)
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={qc}><MemoryRouter initialEntries={['/suite/reviews/r1']}><Routes><Route path="/suite/reviews/:id" element={<ReviewPage />} /></Routes></MemoryRouter></QueryClientProvider>)
}
const text = () => document.body.textContent ?? ''
const U = (id: string, firstName: string) => ({ id, firstName, role: 'ADMIN', organizationName: 'Msingi Foods' })
beforeEach(() => vi.clearAllMocks())

describe('the decision on a review, as each admin reads it', () => {
  it('an admin deciding the appeal reads the reviewer’s decision as hers, never as “Your decision”', async () => {
    ;(reviewsApi.one as any).mockResolvedValue(PETER_BEFORE)
    open(U('u-p', 'Peter'))
    expect(await screen.findByRole('heading', { name: 'Grace’s decision' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Grace’s reasons' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Your decision' })).toBeNull()
    expect(text()).not.toContain('Fatuma sees your decision and your reasons.')
    expect(text()).not.toContain('you decide.')
    expect(text()).toContain('No scores. Grace decided, and Fatuma reads the decision and the reasons.')
  })
  it('the reviewer reads a decision changed on appeal as the deciding admin’s', async () => {
    ;(reviewsApi.one as any).mockResolvedValue(GRACE_AFTER)
    open(U('u-g', 'Grace'))
    expect(await screen.findByRole('heading', { name: 'Sade’s decision' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Your decision' })).toBeNull()
    expect(text()).not.toContain('Fatuma sees your decision and your reasons.')
  })
  it('the admin who changed it reads it as “Your decision”', async () => {
    ;(reviewsApi.one as any).mockResolvedValue(SADE_AFTER)
    open(U('u-s', 'Sade'))
    expect(await screen.findByRole('heading', { name: 'Your decision' })).toBeInTheDocument()
    expect(text()).toContain('Fatuma sees your decision and your reasons.')
  })
})
