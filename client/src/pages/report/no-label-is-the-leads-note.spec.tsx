import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReportBody } from './ReportPage'
import { groundsApi } from '@/api/grounds'
import { reportsApi } from '@/api/reports'
import { PRIVATE_NOTE, whereTheNoteIs } from '@/test/the-leads-note-is-never-a-label'

/**
 * THE REPORT PAGE NEVER NAMES SOMEBODY WITH THE LEAD'S NOTE. Request 36, 27 September 2026.
 *
 * `ReportBody`, the whole report's body (not mounted by any route today: the Report tab is a list
 * of sessions). The report's own lines come from the server with names already swapped in. What it names
 * itself is who updated what they said, where the record is thin, and the lead's review flags, and
 * those were `personLabel(row)`, which fell back to the lead's note. Two people with no name: the
 * lead reads "One colleague" and "Another colleague", and nobody reads any part of the note.
 */
let me: any = { id: 'u-grace', firstName: 'Grace', lastName: 'Obi', role: 'MEMBER' }
vi.mock('@/stores/auth', () => {
  const useAuthStore: any = (sel: any) => sel({ user: me, isAuthenticated: true })
  useAuthStore.getState = () => ({ user: me, isAuthenticated: true })
  return { useAuthStore }
})
vi.mock('@/api/grounds', () => ({ groundsApi: { get: vi.fn(), getMyCheckinStatus: vi.fn(), addParticipant: vi.fn() } }))
vi.mock('@/api/reports', () => ({ reportsApi: { get: vi.fn(), startSelfCorrection: vi.fn() } }))

const at = (d: number) => new Date(Date.UTC(2026, 8, d)).toISOString()

function groundFor(reader: 'lead' | 'participant') {
  const note = reader === 'lead' ? PRIVATE_NOTE : null
  return {
    id: 'g1', label: 'Sales team, Q3', scenario: 'OKR_ALIGNMENT', status: 'ACTIVE', initiatorId: 'u-grace',
    participants: [
      { id: 'p-lead', userId: 'u-grace', partyType: 'INITIATOR', createdAt: at(1), user: { firstName: 'Grace', lastName: 'Obi' }, roleAsDescribed: null, checkIns: [] },
      { id: 'p-a', userId: reader === 'participant' ? 'u-me' : 'u-a', partyType: 'PARTICIPANT', createdAt: at(2), user: null, roleAsDescribed: note, checkIns: [{ sessionNumber: 1, status: 'COMPLETED' }] },
      { id: 'p-b', userId: 'u-b', partyType: 'PARTICIPANT', createdAt: at(3), user: null, roleAsDescribed: note, checkIns: [{ sessionNumber: 1, status: 'COMPLETED' }] },
      { id: 'p-c', userId: 'u-c', partyType: 'PARTICIPANT', createdAt: at(4), user: null, roleAsDescribed: note, checkIns: [{ sessionNumber: 1, status: 'COMPLETED' }] },
    ],
    checkIns: [],
  }
}

function reportFor(reader: 'lead' | 'participant') {
  return {
    id: 'r1', groundId: 'g1', releasedAt: at(6), agreements: [], divergences: [],
    sharedPicture: 'Everyone agrees the price list is late.',
    engagement: { parties: [{ contributed: true }, { contributed: true }, { contributed: true }, { contributed: true }] },
    updates: [
      { participantId: 'p-b', completedAt: at(6), isPostSignOff: false, roleAsDescribed: reader === 'lead' ? PRIVATE_NOTE : null },
      { participantId: 'p-c', completedAt: at(6), isPostSignOff: false, roleAsDescribed: reader === 'lead' ? PRIVATE_NOTE : null },
    ],
    ...(reader === 'lead'
      ? { arcAdvisories: [{ participantId: 'p-b', note: 'The answers stop after the first session.', features: [], roleAsDescribed: PRIVATE_NOTE }] }
      : {}),
  }
}

function renderReport() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/grounds/g1/report']}>
        <Routes><Route path="/grounds/:id/report" element={<ReportBody />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('the report page never names somebody with the lead’s note', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(groundsApi.getMyCheckinStatus as any).mockResolvedValue(null)
  })

  it('as the lead: who updated what they said, and the review flag, are plain words', async () => {
    me = { id: 'u-grace', firstName: 'Grace', lastName: 'Obi', role: 'MEMBER' }
    ;(groundsApi.get as any).mockResolvedValue(groundFor('lead'))
    ;(reportsApi.get as any).mockResolvedValue(reportFor('lead'))
    renderReport()
    await waitFor(() => expect(document.body.textContent).toMatch(/updated what they said/))
    expect(document.body.textContent).toMatch(/Another colleague updated what they said/)
    expect(document.body.textContent).toMatch(/A third colleague updated what they said/)
    expect(whereTheNoteIs().elsewhere).toEqual([])
    expect(document.body.textContent).not.toMatch(/teammate/i)
  })

  it('as a participant: plain words, not counting the reader, and no part of the note', async () => {
    me = { id: 'u-me', firstName: '', role: 'MEMBER' }
    ;(groundsApi.get as any).mockResolvedValue(groundFor('participant'))
    ;(reportsApi.get as any).mockResolvedValue(reportFor('participant'))
    renderReport()
    await waitFor(() => expect(document.body.textContent).toMatch(/updated what they said/))
    expect(document.body.textContent).toMatch(/One colleague updated what they said/)
    expect(document.body.textContent).toMatch(/Another colleague updated what they said/)
    expect(whereTheNoteIs()).toEqual({ asTheirNote: [], elsewhere: [] })
    expect(document.body.textContent).not.toMatch(/teammate/i)
    expect(screen.queryByText(/For your review/)).toBeNull()
  })
})
