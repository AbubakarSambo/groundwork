import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { FromAPlan, WaitingForYouToConfirm } from './ThePlanPage'
import { ContextPage } from './ContextPage'
import { groundsApi } from '@/api/grounds'

vi.mock('@/api/documents', () => ({ documentsApi: { list: vi.fn().mockResolvedValue([]), upload: vi.fn() } }))
vi.mock('@/api/grounds', () => ({
  groundsApi: { readAPlan: vi.fn(), planCardsWaiting: vi.fn(), confirmPlanCard: vi.fn(), planCardNotNow: vi.fn(), editPlanCard: vi.fn() },
}))
vi.mock('@/api/board', () => ({ boardApi: { updateObjective: vi.fn() } }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), message: vi.fn() } }))
vi.mock('@/components/gw/ContextChat', () => ({ ContextChat: () => null }))
vi.mock('@/components/gw/EachPerson', () => ({ EachPerson: () => null }))
vi.mock('@/components/gw/DeliveredPanel', () => ({ DeliveredPanel: () => null }))

const cards = [
  { id: 'c1', kind: 'question', says: 'Groundwork will ask Aisha: "Which accounts actually have a buying process?"', heading: 'A question, from Q4 notes.pdf. It would go in questions you want asked.', landsIn: 'Questions you want asked', from: 'Q4 notes.pdf', fromThePlan: 'which accounts actually have a buying process', note: 'This question is not asked until you confirm it. You can confirm it, change it or leave it out.' },
  { id: 'c2', kind: 'decision', says: 'It is not decided yet whether the Lagos target stays at 12m.', heading: 'A decision, from Q4 notes.pdf. It would go in still to decide.', landsIn: 'Still to decide', from: 'Q4 notes.pdf', fromThePlan: 'not decided whether the Lagos target stays at 12m' },
]
const wrap = (ui: React.ReactNode) => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{ui}</QueryClientProvider>)

describe('the plan page, as the lead reads it', () => {
  beforeEach(() => { vi.clearAllMocks(); (groundsApi.planCardsWaiting as any).mockResolvedValue({ proposals: cards }) })

  it('says the prototype\'s words and each card the server sent', async () => {
    wrap(<><FromAPlan groundId="g1" /><WaitingForYouToConfirm groundId="g1" /></>)
    expect(screen.getByText('From a plan')).toBeTruthy()
    expect(screen.getByText('Nothing is added until you confirm it')).toBeTruthy()
    expect(screen.getByText('Upload a plan, and Groundwork will propose the goals, roles and commitments in it for you to check one by one.')).toBeTruthy()
    expect(await screen.findByText('Waiting for you to confirm')).toBeTruthy()
    expect(screen.getByText('Nothing changes until you confirm it')).toBeTruthy()
    expect(screen.getByText(cards[0].heading)).toBeTruthy()
    expect(screen.getByText('It is not decided yet whether the Lagos target stays at 12m.')).toBeTruthy()
    expect(screen.getByText(cards[0].note!)).toBeTruthy()
    expect(screen.getAllByRole('button', { name: 'Confirm' })).toHaveLength(2)
  })

  it('sends the yes for that card only, and the not now for that card only', async () => {
    ;(groundsApi.confirmPlanCard as any).mockResolvedValue({})
    ;(groundsApi.planCardNotNow as any).mockResolvedValue({})
    wrap(<WaitingForYouToConfirm groundId="g1" />)
    const yes = await screen.findAllByRole('button', { name: 'Confirm' })
    fireEvent.click(yes[1])
    await waitFor(() => expect(groundsApi.confirmPlanCard).toHaveBeenCalledWith('g1', 'c2', null))
    fireEvent.click(screen.getAllByRole('button', { name: 'Not now' })[0])
    await waitFor(() => expect(groundsApi.planCardNotNow).toHaveBeenCalledWith('g1', 'c1'))
  })

  it('reads a pasted plan and says what the server said back', async () => {
    ;(groundsApi.readAPlan as any).mockResolvedValue({ proposals: cards, says: "That's 2 things to confirm. Nothing goes into Context until you do." })
    wrap(<FromAPlan groundId="g1" />)
    fireEvent.click(screen.getByRole('button', { name: 'Paste a plan instead' }))
    fireEvent.change(screen.getByLabelText('Paste your plan here'), { target: { value: 'Q4 plan' } })
    fireEvent.click(screen.getByRole('button', { name: 'Read this plan' }))
    expect(await screen.findByText("That's 2 things to confirm. Nothing goes into Context until you do.")).toBeTruthy()
    expect(groundsApi.readAPlan).toHaveBeenCalledWith('g1', { text: 'Q4 plan' })
  })

  it('is on the lead\'s Context page and on nobody else\'s', async () => {
    const ground = { id: 'g1', contextEnabled: true, brief: 'x', participants: [], objectives: [], contextItems: [], commitments: [], leadContextNotes: [] }
    const { unmount } = wrap(<ContextPage ground={ground} role="lead" viewerUserId="u1" />)
    expect(await screen.findByText('Waiting for you to confirm')).toBeTruthy()
    unmount()
    for (const role of ['party', 'admin'] as const) {
      const r = wrap(<ContextPage ground={ground} role={role} viewerUserId="u2" />)
      await new Promise((x) => setTimeout(x, 30))
      expect(screen.queryByText('From a plan')).toBeNull()
      expect(screen.queryByText('Waiting for you to confirm')).toBeNull()
      r.unmount()
    }
    expect(groundsApi.planCardsWaiting).toHaveBeenCalledTimes(1)
  })
})
