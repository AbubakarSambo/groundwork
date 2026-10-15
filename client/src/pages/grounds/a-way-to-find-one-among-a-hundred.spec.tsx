import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { GroundsListPage } from './GroundsListPage'
import { useAuthStore } from '@/stores/auth'

/**
 * HAFSAH'S FAULT 4: A WAY TO FIND ONE CHECK-IN AMONG A HUNDRED.
 *
 * check-ins.txt draws no search box - there was no hundred-check-in organisation pictured when it
 * was written - so this is C1's own page gaining one, in its own plain voice, the way the People
 * page already offers "Find somebody". Below a handful of check-ins nothing changes (tested
 * elsewhere, in the-check-ins-list-as-each-reader-reads-it.spec.tsx): the box only appears once
 * there is enough here that scanning the sections by eye stops being realistic.
 */
vi.mock('@/api/grounds', () => ({ groundsApi: { list: vi.fn(), awaitingApproval: vi.fn(), approve: vi.fn(), declineGround: vi.fn() } }))
import { groundsApi } from '@/api/grounds'

const LEAD = { id: 'u-h', firstName: 'Hafsah', lastName: 'Jumare', role: 'MEMBER', organizationName: 'Coamana' }

/** A hundred check-ins the lead runs, all alike apart from their name. */
function aHundred() {
  const out: any[] = []
  for (let i = 0; i < 100; i++) {
    out.push({
      id: `g${i}`,
      label: i === 42 ? 'Kwame, first 90 days' : `Check-in ${i}`,
      status: 'ACTIVE',
      initiatorId: 'u-h',
      participants: [{ id: `p${i}`, userId: 'u-h', partyType: 'INITIATOR', user: { firstName: 'Hafsah', lastName: 'Jumare' } }],
      checkIns: [],
      glance: { progress: { roundsDone: 1, roundsPlanned: 12, answeredThisRound: 1, ofPeople: 1 } },
    })
  }
  return out
}

function open(list: any[]) {
  ;(groundsApi.list as any).mockResolvedValue(list)
  ;(groundsApi.awaitingApproval as any).mockResolvedValue([])
  useAuthStore.setState({ user: LEAD, token: 't', isAuthenticated: true } as any)
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={qc}><MemoryRouter><GroundsListPage /></MemoryRouter></QueryClientProvider>)
}

beforeEach(() => vi.clearAllMocks())

describe('a way to find one among a hundred', () => {
  it('offers a search box once there are many to look through', async () => {
    open(aHundred())
    expect(await screen.findByPlaceholderText('Find a check-in')).toBeTruthy()
  })

  it('finds the one check-in that matches, among a hundred', async () => {
    open(aHundred())
    const find = await screen.findByPlaceholderText('Find a check-in')
    fireEvent.change(find, { target: { value: 'kwame' } })
    expect(await screen.findByText(/Kwame, first 90 days/)).toBeTruthy()
    expect(screen.queryByText(/^Check-in 0/)).toBeNull()
  })

  it('says plainly when nothing matches', async () => {
    open(aHundred())
    const find = await screen.findByPlaceholderText('Find a check-in')
    fireEvent.change(find, { target: { value: 'there is no such check-in' } })
    expect(await screen.findByText('Nothing here matches "there is no such check-in".')).toBeTruthy()
  })
})
