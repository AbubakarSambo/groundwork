import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WaitingForYouToConfirm } from './ThePlanPage'
import { groundsApi } from '@/api/grounds'

vi.mock('@/api/grounds', () => ({
  groundsApi: { planCardsWaiting: vi.fn(), confirmPlanCard: vi.fn(), planCardNotNow: vi.fn(), editPlanCard: vi.fn(), correctATargetCard: vi.fn() },
}))
vi.mock('@/api/documents', () => ({ documentsApi: { list: vi.fn().mockResolvedValue([]) } }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), message: vi.fn() } }))

/**
 * THE TARGETS GRACE GAVE, AS ONE CARD (Hafsah, 18 October 2026). The server holds each target read from her check-in and writes
 * nothing until she confirms (api: the-leads-targets-wait-for-her-yes.spec.ts). She reads them together, with her own words under
 * each; Confirm puts them all on record, Edit corrects one, Not now keeps them all off it. The server serves this list to the lead
 * alone; a participant's Context page never asks for it (ContextPage: isTheLead).
 */
const HERS = [
  { id: 'h1', kind: 'goal', fromYourCheckIn: true, saidOn: '2026-10-12', says: 'The team’s target is 120 units sold by 30 October.', fromThePlan: 'The team is aiming to sell 120 water dispensers by 30 October.', heading: 'x', landsIn: 'Targets', from: 'your check-in', fields: { what: 'units sold by 30 October', number: 120 } },
  { id: 'h2', kind: 'goal', fromYourCheckIn: true, saidOn: '2026-10-12', says: 'Kevin Omondi’s target is 40 units sold by 30 October.', fromThePlan: 'Kevin, Mercy and Joseph each sell 40.', heading: 'x', landsIn: 'Targets', from: 'your check-in', fields: { what: 'units sold by 30 October', number: 40, participantId: 'p-kevin' } },
]
const wrap = (ui: React.ReactNode) => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{ui}</QueryClientProvider>)

describe('Grace reads the targets she gave as one card', () => {
  beforeEach(() => { vi.clearAllMocks(); (groundsApi.planCardsWaiting as any).mockResolvedValue({ proposals: HERS }) })

  it('lists every target once, with her own words, and one Confirm', async () => {
    wrap(<WaitingForYouToConfirm groundId="g1" />)
    expect(await screen.findByText('The 2 targets you gave in your check-in on 12 October. They go on record only once you confirm them.')).toBeTruthy()
    expect(screen.getByText('The team’s target is 120 units sold by 30 October.')).toBeTruthy()
    expect(screen.getByText('You said, “Kevin, Mercy and Joseph each sell 40.”')).toBeTruthy()
    expect(screen.getAllByRole('button', { name: 'Confirm' })).toHaveLength(1)
    expect(screen.getAllByRole('button', { name: 'Edit' })).toHaveLength(2)
  })

  it('Confirm sends her yes for every target on the card', async () => {
    (groundsApi.confirmPlanCard as any).mockResolvedValue({})
    wrap(<WaitingForYouToConfirm groundId="g1" />)
    fireEvent.click(await screen.findByRole('button', { name: 'Confirm' }))
    await waitFor(() => expect(groundsApi.confirmPlanCard).toHaveBeenCalledTimes(2))
    expect((groundsApi.confirmPlanCard as any).mock.calls.map((c: any[]) => c[1])).toEqual(['h1', 'h2'])
  })

  it('Not now keeps them all off the record', async () => {
    (groundsApi.planCardNotNow as any).mockResolvedValue({})
    wrap(<WaitingForYouToConfirm groundId="g1" />)
    fireEvent.click(await screen.findByRole('button', { name: 'Not now' }))
    await waitFor(() => expect(groundsApi.planCardNotNow).toHaveBeenCalledTimes(2))
    expect(groundsApi.confirmPlanCard).not.toHaveBeenCalled()
  })

  it('Edit corrects one target: what it counts and its number', async () => {
    (groundsApi.correctATargetCard as any).mockResolvedValue({})
    wrap(<WaitingForYouToConfirm groundId="g1" />)
    fireEvent.click((await screen.findAllByRole('button', { name: 'Edit' }))[1])
    fireEvent.change(screen.getByLabelText('The number'), { target: { value: '45' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(groundsApi.correctATargetCard).toHaveBeenCalledWith('g1', 'h2', { what: 'units sold by 30 October', number: 45 }))
  })
})
