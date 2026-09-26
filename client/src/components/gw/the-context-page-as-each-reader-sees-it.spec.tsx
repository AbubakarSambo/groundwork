import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ContextPage } from './ContextPage'
import { documentsApi } from '@/api/documents'

vi.mock('@/api/documents', () => ({
  documentsApi: { list: vi.fn(), upload: vi.fn(), setVisibility: vi.fn(), remove: vi.fn(), setNote: vi.fn() },
}))
vi.mock('@/api/grounds', () => ({ groundsApi: {} }))
vi.mock('@/api/board', () => ({ boardApi: { updateObjective: vi.fn() } }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), message: vi.fn() } }))
/* The bands this spec is not about, each tested on its own. */
vi.mock('@/components/gw/ContextChat', () => ({ ContextChat: () => null }))
vi.mock('@/components/gw/EachPerson', () => ({ EachPerson: () => null }))
vi.mock('@/components/gw/DeliveredPanel', () => ({ DeliveredPanel: () => null }))

/*
 * THE CONTEXT PAGE, READ AS EACH PERSON READS IT (U.7, B2 Context).
 *
 * What the prototype's Context page says (docs/prototype/screens/B2-context/context.txt), rendered:
 * the brief with "Your words, from setup. Everyone reads this before they answer." and "Rewrite";
 * the documents as cards, each with what it is for and who reads it; and "Add a document" with "It
 * starts private to you. You choose who can read it."
 */
const people = [
  { id: 'p-lead', userId: 'u-lead', partyType: 'INITIATOR', user: { firstName: 'Wairimu', lastName: 'Kamau' } },
  { id: 'p-aisha', userId: 'u-aisha', partyType: 'PARTY', user: { firstName: 'Aisha', lastName: 'Otieno' } },
]
const ground = {
  id: 'g1',
  contextEnabled: true,
  brief: 'Twenty-five freezer sales this quarter, mostly butcheries and supermarkets.',
  participants: people,
  objectives: [],
  contextItems: [],
  commitments: [],
  leadContextNotes: [],
}
/* What the server sends the lead: her own price list, private, with what it is for. */
const leadsDocs = [
  { id: 'd1', name: 'Freezer range brochure.pdf', uploadedAt: '2026-09-01T10:00:00Z', visibility: 'OPEN', mine: true, usedFor: 'Checks the product and price in each deal' },
  { id: 'd2', name: 'Q3 price list.pdf', uploadedAt: '2026-09-20T10:00:00Z', visibility: 'OWN', mine: true, usedFor: 'Checks price objections' },
]
/* What the server sends Aisha: the shared brochure, without the lead's line about what it is for. */
const aishasDocs = [
  { id: 'd1', name: 'Freezer range brochure.pdf', uploadedAt: '2026-09-01T10:00:00Z', visibility: 'OPEN', mine: false },
]

const draw = (role: 'lead' | 'admin' | 'party', viewerUserId: string) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <ContextPage ground={ground} role={role} viewerUserId={viewerUserId} />
    </QueryClientProvider>,
  )
}
const card = (id: string) => document.querySelector(`[data-gw-document="${id}"]`)?.textContent ?? ''

beforeEach(() => vi.clearAllMocks())

describe('Wairimu, who leads it', () => {
  it('reads the brief in quotes, whose words they are, and can rewrite it', async () => {
    ;(documentsApi.list as any).mockResolvedValue(leadsDocs)
    draw('lead', 'u-lead')
    expect(screen.getByText('“Twenty-five freezer sales this quarter, mostly butcheries and supermarkets.”')).toBeTruthy()
    expect(screen.getByText(/Your words, from setup\. Everyone reads this before they answer\./)).toBeTruthy()
    expect(screen.getByText('Rewrite')).toBeTruthy()
  })

  it('reads each document with what it is for, shared ones first, and Add a document last', async () => {
    ;(documentsApi.list as any).mockResolvedValue(leadsDocs)
    draw('lead', 'u-lead')
    await screen.findByText('Q3 price list.pdf')
    expect(card('d1')).toContain('Checks the product and price in each deal')
    expect(card('d2')).toContain('Checks price objections')
    expect(screen.getByText('Add a document')).toBeTruthy()
    expect(screen.getByText('It starts private to you. You choose who can read it.')).toBeTruthy()
    const order = [...document.querySelectorAll('[data-gw-document]')].map((n) => n.getAttribute('data-gw-document'))
    expect(order).toEqual(['d1', 'd2'])
  })
})

describe('adding a document from the page', () => {
  it('uploads the file privately, then shows what was read and asks who can read it', async () => {
    ;(documentsApi.list as any).mockResolvedValue(leadsDocs)
    ;(documentsApi.upload as any).mockResolvedValue({ id: 'd3', name: 'Sales playbook.docx', visibility: 'OWN', mine: true })
    draw('lead', 'u-lead')
    const file = new File(['x'], 'Sales playbook.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
    fireEvent.change(document.getElementById('ga-doc-upload') as HTMLInputElement, { target: { files: [file] } })
    expect(await screen.findByText('Add it to Context')).toBeTruthy()
    expect(documentsApi.upload).toHaveBeenCalledWith('g1', file, false, undefined)
    expect(screen.getByText('Who can read it')).toBeTruthy()
  })
})

describe('Aisha, who takes part', () => {
  it('reads the brief as Wairimu’s words, and cannot rewrite it', async () => {
    ;(documentsApi.list as any).mockResolvedValue(aishasDocs)
    draw('party', 'u-aisha')
    expect(screen.getByText(/Wairimu’s words, from setup\. Everyone reads this before they answer\./)).toBeTruthy()
    expect(screen.queryByText(/Your words, from setup/)).toBeNull()
    expect(screen.queryByText('Rewrite')).toBeNull()
  })

  it('reads the shared brochure and nothing about what Wairimu said it is for', async () => {
    ;(documentsApi.list as any).mockResolvedValue(aishasDocs)
    draw('party', 'u-aisha')
    await screen.findByText('Freezer range brochure.pdf')
    expect(document.body.textContent).not.toContain('Checks the product and price')
    expect(document.body.textContent).not.toContain('Q3 price list.pdf')
    /* Not hers, so not hers to move or delete. */
    expect(card('d1')).not.toContain('Delete')
  })
})

describe('an admin reading a check-in somebody else leads', () => {
  it('reads the brief as the lead’s words, and may rewrite it', async () => {
    ;(documentsApi.list as any).mockResolvedValue([])
    draw('admin', 'u-admin')
    expect(screen.getByText(/Wairimu’s words, from setup\./)).toBeTruthy()
    expect(screen.getByText('Rewrite')).toBeTruthy()
  })
})
