import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { ContextPage } from './ContextPage'

vi.mock('@/api/documents', () => ({ documentsApi: { list: vi.fn().mockResolvedValue([]), upload: vi.fn() } }))
vi.mock('@/api/grounds', () => ({ groundsApi: { readAPlan: vi.fn(), planCardsWaiting: vi.fn().mockResolvedValue({ proposals: [] }) } }))
vi.mock('@/api/board', () => ({ boardApi: { updateObjective: vi.fn() } }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), message: vi.fn() } }))
vi.mock('@/components/gw/ContextChat', () => ({ ContextChat: () => null }))
vi.mock('@/components/gw/EachPerson', () => ({ EachPerson: () => null }))
vi.mock('@/components/gw/DeliveredPanel', () => ({ DeliveredPanel: () => null }))

/**
 * THE PLAN, AS AGREED, ON THE CONTEXT TAB (Hafsah, 18 October; the prototype's full Context page). The page draws the lines the
 * server sends this reader (api: the-plan-as-agreed.spec.ts), each as what, then who and when, and leaves the section out when
 * there are none, as the prototype has no empty wording for it.
 */
const LINES = [
  { id: 't-1', what: 'Each rep to open 10 new leads each week', who: 'Everyone', when: 'Weekly' },
  { id: 't-2', what: '12 new leads a week', who: 'Kevin', when: 'Weekly' },
]
const base = { id: 'g1', contextEnabled: true, brief: 'x', participants: [], objectives: [], contextItems: [], commitments: [], leadContextNotes: [] }
const wrap = (ui: React.ReactNode) => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter>{ui}</MemoryRouter></QueryClientProvider>)

describe('the plan, as agreed', () => {
  it('Grace reads each line, with who and when, on the full page', () => {
    wrap(<ContextPage ground={{ ...base, planAsAgreed: LINES }} role="lead" viewerUserId="u-grace" />)
    expect(screen.getByText('The plan, as agreed')).toBeTruthy()
    expect(screen.getByText('12 new leads a week')).toBeTruthy()
    expect(screen.getByText('Kevin, Weekly')).toBeTruthy()
    expect(screen.getByText('Everyone, Weekly')).toBeTruthy()
  })
  it('Kevin reads his own as his, on the light sales page, folded to one line', () => {
    wrap(<ContextPage ground={{ ...base, kindOfWork: 'sales team', planAsAgreed: [{ ...LINES[1], who: 'You' }], participants: [{ id: 'p-kevin', userId: 'u-kevin', partyType: 'PARTICIPANT' }] }} role="party" viewerUserId="u-kevin" />)
    const fold = screen.getByText('The plan, as agreed')
    expect(screen.getByText('1 line agreed')).toBeTruthy()
    fireEvent.click(fold)
    expect(screen.getByText('You, Weekly')).toBeTruthy()
  })
  it('with nothing on record, there is no section', () => {
    wrap(<ContextPage ground={base} role="lead" viewerUserId="u-grace" />)
    expect(screen.queryByText('The plan, as agreed')).toBeNull()
  })
})
