import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ContextPage } from './ContextPage'
import { documentsApi } from '@/api/documents'

vi.mock('@/api/documents', () => ({
  documentsApi: { list: vi.fn(), upload: vi.fn(), setVisibility: vi.fn(), remove: vi.fn(), setNote: vi.fn() },
}))
vi.mock('@/api/grounds', () => ({ groundsApi: {} }))
vi.mock('@/api/board', () => ({ boardApi: { updateObjective: vi.fn() } }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), message: vi.fn() } }))
vi.mock('@/components/gw/ContextChat', () => ({ ContextChat: () => null }))
vi.mock('@/components/gw/EachPerson', () => ({ EachPerson: () => null }))
vi.mock('@/components/gw/DeliveredPanel', () => ({ DeliveredPanel: () => null }))

/*
 * THE RESOURCES PANEL, IN THE PROTOTYPE'S SHAPE, ONE LEVEL DOWN FROM THE COMPANY (docs/prototype/
 * screens/B2-context/company-context.txt, around "Resources / Shared, read, and what each checks").
 * The Documents band on a check-in's own Context and resources page carries the same heading, the
 * same note, and the same two extra lines per document - "What I read in it" and "Used to check"
 * - drawn only where the server actually sends them. Everything else about the band (the cards, the
 * upload control, who may set a document's visibility) is unchanged; this spec is about the heading
 * and the two new lines, and about a private document staying private.
 */
const people = [
  { id: 'p-lead', userId: 'u-lead', partyType: 'INITIATOR', user: { firstName: 'Wairimu', lastName: 'Kamau' } },
  { id: 'p-aisha', userId: 'u-aisha', partyType: 'PARTY', user: { firstName: 'Aisha', lastName: 'Otieno' } },
]
const ground = {
  id: 'g1',
  contextEnabled: true,
  brief: 'Twenty-five freezer sales this quarter.',
  participants: people,
  objectives: [],
  contextItems: [],
  commitments: [],
  leadContextNotes: [],
}

const draw = (role: 'lead' | 'admin' | 'party', viewerUserId: string) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <ContextPage ground={ground} role={role} viewerUserId={viewerUserId} />
    </QueryClientProvider>,
  )
}

beforeEach(() => vi.clearAllMocks())

describe('the Resources panel', () => {
  it('carries the prototype’s heading and note', async () => {
    ;(documentsApi.list as any).mockResolvedValue([])
    draw('lead', 'u-lead')
    expect(await screen.findByText('Resources')).toBeTruthy()
    expect(screen.getByText('Shared, read, and what each checks')).toBeTruthy()
  })

  it('a shared document says what we read from it, and what it is used to check, from what the server sends', async () => {
    ;(documentsApi.list as any).mockResolvedValue([{
      id: 'd1', name: 'Strategy v2.pdf', uploadedAt: '2026-09-01T10:00:00Z', visibility: 'OPEN', mine: true,
      usedFor: 'Whether goals still match',
      assessment: { suggests: ['The three priorities and the reasoning.'], willDo: [] },
    }])
    draw('lead', 'u-lead')
    await screen.findByText('Strategy v2.pdf')
    expect(screen.getByText('What I read in it')).toBeTruthy()
    expect(screen.getByText('The three priorities and the reasoning.')).toBeTruthy()
    expect(screen.getByText('Used to check')).toBeTruthy()
    expect(screen.getByText('Whether goals still match')).toBeTruthy()
  })

  it('leaves out "Used to check" and "What I read in it" rather than inventing them, where the server sent neither', async () => {
    ;(documentsApi.list as any).mockResolvedValue([
      { id: 'd1', name: 'Board deck, Q3.pdf', uploadedAt: '2026-09-01T10:00:00Z', visibility: 'OPEN', mine: false },
    ])
    draw('party', 'u-aisha')
    await screen.findByText('Board deck, Q3.pdf')
    expect(screen.queryByText('What I read in it')).toBeNull()
    expect(screen.queryByText('Used to check')).toBeNull()
  })

  it('falls back to what the read holds when there is no assessment, and still leaves out "Used to check" it was never sent', async () => {
    ;(documentsApi.list as any).mockResolvedValue([{
      id: 'd1', name: 'Delivery log.csv', uploadedAt: '2026-09-01T10:00:00Z', visibility: 'OPEN', mine: false,
      theDocumentLine: 'Here is what I took from Delivery log.csv.', theContextWeHave: 'Here is what I took from Delivery log.csv.\n\nEvery project and its dates.',
    }])
    draw('party', 'u-aisha')
    await screen.findByText('Delivery log.csv')
    /* "Every project and its dates." appears twice: once on the face, under "What I read in it",
       and again inside "What Groundwork took from it", the fuller itemised read folded below it. */
    expect(within(screen.getByText('What I read in it').parentElement as HTMLElement).getByText('Every project and its dates.')).toBeTruthy()
    expect(screen.getAllByText('Every project and its dates.').length).toBe(2)
    expect(screen.queryByText('Used to check')).toBeNull()
  })

  it('a private document is served only to the lead reading over Aisha’s check-in, never invented on screen', async () => {
    /* THE SERVER DECIDES, NOT THE SCREEN. `documents.list` never returns a document Aisha kept
       private to a lead who did not upload it - the rule enforced in `documentWhereFor`/
       `canSeeDocument` (api/src/modules/documents/who-can-see-a-document.ts). The lead is served
       only the shared brochure, and the Resources panel renders only what it is given. */
    ;(documentsApi.list as any).mockResolvedValue([
      { id: 'd1', name: 'Freezer range brochure.pdf', uploadedAt: '2026-09-01T10:00:00Z', visibility: 'OPEN', mine: false },
    ])
    draw('lead', 'u-lead')
    await screen.findByText('Freezer range brochure.pdf')
    expect(screen.queryByText('My visits.pdf')).toBeNull()
  })

  it('a private document is served to its own owner', async () => {
    ;(documentsApi.list as any).mockResolvedValue([
      { id: 'd2', name: 'My visits.pdf', uploadedAt: '2026-09-01T10:00:00Z', visibility: 'OWN', mine: true },
    ])
    draw('party', 'u-aisha')
    expect(await screen.findByText('My visits.pdf')).toBeTruthy()
  })
})
