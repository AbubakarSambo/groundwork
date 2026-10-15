import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ContextPage } from './ContextPage'
import { documentsApi } from '@/api/documents'

vi.mock('@/api/documents', () => ({
  documentsApi: { list: vi.fn(), upload: vi.fn(), setVisibility: vi.fn(), remove: vi.fn(), setNote: vi.fn() },
}))
vi.mock('@/api/grounds', () => ({ groundsApi: { planCardsWaiting: vi.fn().mockResolvedValue({ proposals: [] }) } }))
vi.mock('@/api/board', () => ({ boardApi: { updateObjective: vi.fn() } }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), message: vi.fn() } }))
vi.mock('@/components/gw/ContextChat', () => ({ ContextChat: () => null }))
vi.mock('@/components/gw/EachPerson', () => ({ EachPerson: () => <div>the cards for each person</div> }))
vi.mock('@/components/gw/DeliveredPanel', () => ({ DeliveredPanel: () => null }))

/**
 * THE LIGHT CONTEXT PAGE, AS EACH READER READS IT (docs/light-rebuild/sales-first.md, section 4; the
 * light prototype's s56 and s63). One page: what this check-in is for, then everything else as folded
 * lines with facts counted from what the server sent this reader, then "Add context".
 */
const people = [
  { id: 'p-lead', userId: 'u-lead', partyType: 'INITIATOR', user: { firstName: 'Wairimu', lastName: 'Kamau' } },
  { id: 'p-miriam', userId: 'u-miriam', partyType: 'PARTY', user: { firstName: 'Miriam', lastName: 'Wanjiru' } },
]
const ground = {
  id: 'g1', kindOfWork: 'sales org', contextEnabled: true,
  brief: 'Sell 25 freezers this quarter.', briefAsEveryoneReadsIt: 'Sell 25 freezers this quarter.', briefIsTheLeadsOwnWords: true, briefChangedBy: null,
  participants: people,
  objectives: [{ id: 'o1', name: 'Freezers sold', target: 25, ownerParticipantId: null }],
  contextItems: [{ id: 'c1', kind: 'WAY_OF_WORKING', text: 'A sale counts as won when there is a payment record.', audience: 'EVERYONE' }],
  commitments: [{ id: 'k1', participantId: 'p-miriam', text: 'Follow up every quote within 48 hours.', status: 'OPEN' }],
  leadContextNotes: [],
}
const draw = (role: 'lead' | 'party', viewerUserId: string) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <ContextPage ground={ground} role={role} viewerUserId={viewerUserId} />
    </QueryClientProvider>,
  )
}
const line = (name: string) => [...document.querySelectorAll('details.gwui-fold')].find((d) => d.querySelector(':scope > summary .gwui-fold-name')?.textContent === name) as HTMLElement | undefined

beforeEach(() => vi.clearAllMocks())

describe('Wairimu, who leads it', () => {
  it('reads what it is for, then everything else folded with a fact each, then Add context', async () => {
    ;(documentsApi.list as any).mockResolvedValue([
      { id: 'd1', name: 'Q3 sales plan.pdf', uploadedAt: '2026-09-01T10:00:00Z', visibility: 'OPEN', mine: true },
      { id: 'd2', name: 'Q3 price list.pdf', uploadedAt: '2026-09-20T10:00:00Z', visibility: 'OWN', mine: true },
    ])
    draw('lead', 'u-lead')
    expect(screen.getByText('“Sell 25 freezers this quarter.”')).toBeTruthy()
    expect(screen.getByText('Tap any line to see more')).toBeTruthy()
    expect(line('Targets')?.querySelector('.gwui-fold-fact')?.textContent).toBe('1 target, each person sees their own share')
    expect(line('How we work')?.querySelector('.gwui-fold-fact')?.textContent).toBe('1 rule')
    expect(within(line('How we work')!).getByText('A sale counts as won when there is a payment record.')).toBeTruthy()
    await vi.waitFor(() => expect(line('Documents')?.querySelector('.gwui-fold-fact')?.textContent).toBe('2 documents, 1 only you can read'))
    expect(within(line('Each person’s card')!).getByText('the cards for each person')).toBeTruthy()
    expect(line('What people are down as doing')?.querySelector('.gwui-fold-fact')?.textContent).toBe('1 thing people said they would do')
    expect(line('Targets')!.hasAttribute('open')).toBe(false)
  })
})

describe('Miriam, in the team', () => {
  it('reads her own part open, and the same folded lines, without the lead’s cards line or the plan', async () => {
    ;(documentsApi.list as any).mockResolvedValue([{ id: 'd1', name: 'Q3 sales plan.pdf', uploadedAt: '2026-09-01T10:00:00Z', visibility: 'OPEN', mine: false }])
    draw('party', 'u-miriam')
    expect(screen.getByText('the cards for each person')).toBeTruthy()
    expect(line('Each person’s card')).toBeUndefined()
    expect(line('Targets')).toBeTruthy()
    await vi.waitFor(() => expect(line('Documents')?.querySelector('.gwui-fold-fact')?.textContent).toBe('1 document'))
    expect(screen.queryByText('From a plan')).toBeNull()
  })
})
