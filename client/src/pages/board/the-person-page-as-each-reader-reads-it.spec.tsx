import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThePersonPage } from './ThePersonPage'
import { boardApi } from '@/api/board'
import { groundsApi } from '@/api/grounds'

/**
 * ONE PERSON'S PAGE, AS EACH READER READS IT (person-page.jpg, screen match 16 October). Wairimu runs the
 * check-in and reads Miriam's deals, check-ins, signals with Miriam's own answer, what to ask her and her
 * own notes about Miriam, all named, never "her". Brian, a colleague, opening the same address reads that
 * the page is for whoever runs the check-in, and nothing about Miriam, even if a board were served to him.
 */
let me = { id: 'u-wairimu', firstName: 'Wairimu', role: 'LEAD' }
vi.mock('@/stores/auth', () => ({ useAuthStore: (sel: any) => sel({ user: me }) }))
vi.mock('@/api/board', () => ({ boardApi: { get: vi.fn() } }))
vi.mock('@/api/grounds', () => ({ groundsApi: { get: vi.fn() } }))

const BOARD = {
  title: 'Sales team, Q3',
  participants: [{ id: 'p-miriam', name: 'Miriam Wanjiku', role: 'Sales' }, { id: 'p-brian', name: 'Brian Mwangi', role: 'Sales' }],
  objectives: [{ id: 'o1', ownerParticipantId: 'p-miriam', target: 5, count: 4 }],
  workRecords: [{ section: 'Deal grid', stages: ['Contacted', 'Need', 'Quoted', 'Won'], rows: [
    { id: 'd1', kind: 'deal', name: 'Westgate Deli', stage: 'Quoted', ownerParticipantId: 'p-miriam', value: 'KES 95,000', mark: 'said', nextSays: 'Nobody has said what happens next.' },
    { id: 'd2', kind: 'deal', name: 'Kito Foods', stage: 'Need', ownerParticipantId: 'p-brian', value: 'KES 120,000' },
  ] }],
  checkInGrid: { sessions: [1, 2, 3], rows: [{ participantId: 'p-miriam', cells: { 1: 'done', 2: 'missed', 3: 'done' } }] },
  whoOwnsWhat: [{ participantId: 'p-miriam', items: [{ id: 'i1', type: 'PROGRESS', text: 'Miriam Wanjiku said, "Green Mart quote proven."', sessionNumber: 3 }] }],
  patterns: [{ id: 'pt1', participantId: 'p-miriam', heading: 'X', whatHappened: 'Qualified deals without a buying date, for 2 weeks in a row.', theirWords: 'Westgate is waiting for the bank.' }],
  coaching: { eachPerson: [{ participantId: 'p-miriam', probe: ['Which of your qualified deals has a buying date in writing?'] }] },
  phaseSpine: { sessions: [] },
}
const GROUND = {
  initiatorId: 'u-wairimu', cadence: 'DAILY',
  participants: [{ id: 'p-miriam', createdAt: '2026-07-01T10:00:00Z' }],
  contextItems: [{ id: 'n1', kind: 'ABOUT_A_PERSON', aboutParticipantId: 'p-miriam', text: 'Strong with supermarkets.' }],
}

function open() {
  ;(boardApi.get as any).mockResolvedValue(BOARD)
  ;(groundsApi.get as any).mockResolvedValue(GROUND)
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/grounds/g1/person/p-miriam']}>
        <Routes><Route path="/grounds/:id/person/:participantId" element={<ThePersonPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('one person’s page', () => {
  it('Wairimu, who runs it, reads Miriam’s deals, check-ins, signals, what to ask and her own notes, by name', async () => {
    me = { id: 'u-wairimu', firstName: 'Wairimu', role: 'LEAD' }
    open()
    expect(await screen.findByRole('heading', { name: 'Miriam’s deals' })).toBeTruthy()
    expect(screen.getByText('Sales team, since 1 July. Miriam’s share is 5, and Miriam has 4.')).toBeTruthy()
    expect(screen.getByText('Westgate Deli')).toBeTruthy()
    expect(screen.queryByText('Kito Foods')).toBeNull()
    expect(screen.getByText('Last 3 weekdays: 2 of 3')).toBeTruthy()
    expect(screen.getByText('Green Mart quote proven.')).toBeTruthy()
    expect(screen.getByText('“Westgate is waiting for the bank.”')).toBeTruthy()
    expect(screen.getByText('Which of your qualified deals has a buying date in writing?')).toBeTruthy()
    expect(screen.getByText('“Strong with supermarkets.”')).toBeTruthy()
    expect(screen.getByText('Only you see these')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Ask Miriam something' })).toBeTruthy()
    expect(document.body.textContent).not.toMatch(/\b(?:Her|She|she|her)\b/)
  })

  it('Brian, a colleague, is told the page is for whoever runs the check-in, and reads nothing about Miriam', async () => {
    me = { id: 'u-brian', firstName: 'Brian', role: 'MEMBER' }
    open()
    expect(await screen.findByText('Only the person who runs this check-in can open this.')).toBeTruthy()
    expect(screen.queryByText('Westgate Deli')).toBeNull()
    expect(screen.queryByText('“Strong with supermarkets.”')).toBeNull()
  })
})
