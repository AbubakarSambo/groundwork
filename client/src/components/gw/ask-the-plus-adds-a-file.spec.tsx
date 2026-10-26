import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AskGroundwork } from './AskGroundwork'
import type { AskPage as AskPageData } from '@/api/ask'
import { useAuthStore } from '@/stores/auth'

/**
 * THE "+" BESIDE ASK'S MESSAGE BOX (Hafsah, 15 October 2026). Adding a file in Ask works as it does in the check-in chat:
 * a "+" beside the box, shown to whoever may add a document (Wanjiru, a lead, for the check-ins she runs; Grace, an
 * admin, for the whole organisation), opening the file picker at once. After the file is chosen, Ask says back what it
 * read and asks before anything is kept, exactly as the typed way does. Miriam, who only takes part, has no "+".
 */
vi.mock('@/api/ask', () => ({ askApi: { mine: vi.fn(), ask: vi.fn(), answer: vi.fn(), addADocumentForTheOrganisation: vi.fn() } }))
vi.mock('@/api/documents', () => ({ documentsApi: { upload: vi.fn(), list: vi.fn() } }))
vi.mock('@/api/grounds', () => ({ groundsApi: { list: vi.fn().mockResolvedValue([]) } }))
import { askApi } from '@/api/ask'
import { documentsApi } from '@/api/documents'

const PAGE = (addsContext: boolean): AskPageData => ({
  canAsk: true, about: [], turns: [], askName: 'Ask Msingi Foods', caption: 'Ask about the company, your work or your check-ins.',
  addLine: 'You can also add context or documents to your check-ins here.', welcome: null, starters: [], addsContext,
} as AskPageData)

const PLUS = 'Add a photo or a document'
const IT_GOES_ON = 'It will go on "Sales team, Q3", and only you will be able to see it until you say otherwise.'
const SAID_BACK = 'I have read Price list. It holds 12 prices. Who should be able to read it?'

function as(role: 'ADMIN' | 'MEMBER') {
  useAuthStore.setState({ user: { id: 'u1', role, organizationId: 'o1', firstName: 'X' }, token: 't', isAuthenticated: true } as unknown as Parameters<typeof useAuthStore.setState>[0])
}

function panel() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/today']}>
        <AskGroundwork onClose={() => {}} pollIntervalMs={1} pollTimeoutMs={5} />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const picker = (c: HTMLElement) => c.querySelector('input[type="file"]') as HTMLInputElement

beforeEach(() => { vi.clearAllMocks() })
afterEach(() => { vi.restoreAllMocks() })

describe('who sees the "+"', () => {
  it('Wanjiru, a lead who may add context, sees it', async () => {
    as('MEMBER'); vi.mocked(askApi.mine).mockResolvedValue(PAGE(true))
    panel()
    expect(await screen.findByRole('button', { name: PLUS })).toBeInTheDocument()
  })

  it('Grace, an admin, sees it for the whole organisation', async () => {
    as('ADMIN'); vi.mocked(askApi.mine).mockResolvedValue(PAGE(false))
    panel()
    expect(await screen.findByRole('button', { name: PLUS })).toBeInTheDocument()
  })

  it('Miriam, who only takes part, does not', async () => {
    as('MEMBER'); vi.mocked(askApi.mine).mockResolvedValue(PAGE(false))
    panel()
    await screen.findByPlaceholderText('Ask about the company, your work or your check-ins.')
    expect(screen.queryByRole('button', { name: PLUS })).toBeNull()
  })
})

describe('pressing it opens the file picker straight away', () => {
  it('nothing is sent to Ask until a file is chosen', async () => {
    as('MEMBER'); vi.mocked(askApi.mine).mockResolvedValue(PAGE(true))
    const { container } = panel()
    const clicked = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {})
    fireEvent.click(await screen.findByRole('button', { name: PLUS }))
    expect(clicked).toHaveBeenCalledTimes(1)
    expect(clicked.mock.instances[0]).toBe(picker(container))
    expect(picker(container).accept).toContain('.jpg')
    expect(picker(container).accept).toContain('.pdf')
    expect(askApi.ask).not.toHaveBeenCalled()
  })
})

describe('after the file is chosen, Ask says back what it read and asks before keeping anything', () => {
  it('for Wanjiru: Ask decides the check-in, the file goes up private to her, and nothing is kept before her answer', async () => {
    as('MEMBER'); vi.mocked(askApi.mine).mockResolvedValue(PAGE(true))
    vi.mocked(askApi.ask)
      .mockResolvedValueOnce({ lane: 'add_a_document', composedBy: 'rules', blocks: [
        { type: 'text', body: IT_GOES_ON },
        { type: 'next_step', label: 'Choose a file', href: '/grounds', kind: 'upload_a_document', id: 'g-sales', context: { groundId: 'g-sales', label: 'Sales team, Q3' } },
      ] })
      .mockResolvedValueOnce({ lane: 'add_a_document', composedBy: 'rules', blocks: [
        { type: 'text', body: SAID_BACK },
        { type: 'proposal', proposalId: 'pr-1', summary: 'Who should be able to read Price list?' },
      ] })
    vi.mocked(documentsApi.upload).mockResolvedValue({ id: 'doc-1' } as never)
    vi.mocked(documentsApi.list).mockResolvedValue([])
    vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {})
    const { container } = panel()
    fireEvent.click(await screen.findByRole('button', { name: PLUS }))
    const file = new File(['x'], 'Price list.pdf', { type: 'application/pdf' })
    fireEvent.change(picker(container), { target: { files: [file] } })

    await waitFor(() => expect(askApi.ask).toHaveBeenCalledWith('I want to add a document.', undefined))
    expect(await screen.findByText('I want to add a document.')).toBeInTheDocument()
    expect(await screen.findByText(IT_GOES_ON)).toBeInTheDocument()
    await waitFor(() => expect(documentsApi.upload).toHaveBeenCalledWith('g-sales', file))
    /* The step the "+" already answered is not offered again. */
    expect(screen.queryByRole('button', { name: 'Choose a file' })).toBeNull()
    await waitFor(() => expect(askApi.ask).toHaveBeenLastCalledWith("I've uploaded it.", 'g-sales'))
    expect(await screen.findByText(SAID_BACK)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Yes' })).toBeInTheDocument()
    expect(askApi.answer).not.toHaveBeenCalled()
  })

  it('once the file is read, Ask says what is in it (26 October 2026)', async () => {
    as('MEMBER'); vi.mocked(askApi.mine).mockResolvedValue(PAGE(true))
    vi.mocked(askApi.ask)
      .mockResolvedValueOnce({ lane: 'add_a_document', composedBy: 'rules', blocks: [
        { type: 'text', body: IT_GOES_ON },
        { type: 'next_step', label: 'Choose a file', href: '/grounds', kind: 'upload_a_document', id: 'g-sales', context: { groundId: 'g-sales', label: 'Sales team, Q3' } },
      ] })
      .mockResolvedValueOnce({ lane: 'add_a_document', composedBy: 'rules', blocks: [{ type: 'text', body: 'Anything else?' }] })
    vi.mocked(documentsApi.upload).mockResolvedValue({ id: 'doc-2' } as never)
    vi.mocked(documentsApi.list).mockResolvedValue([
      { id: 'doc-1', assessment: { suggests: ['An older price list.'] } },
      { id: 'doc-2', assessment: { suggests: ['An M-Pesa message for KES 12,000 from Ngong Road.'] } },
    ] as never)
    vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {})
    const { container } = panel()
    fireEvent.click(await screen.findByRole('button', { name: PLUS }))
    fireEvent.change(picker(container), { target: { files: [new File(['x'], 'mpesa.jpg', { type: 'image/jpeg' })] } })
    expect(await screen.findByText('mpesa.jpg: An M-Pesa message for KES 12,000 from Ngong Road.')).toBeInTheDocument()
    expect(screen.queryByText(/An older price list/)).toBeNull()
  })

  it('for Grace: the document for the whole organisation is read and said back, and kept only on her yes', async () => {
    as('ADMIN'); vi.mocked(askApi.mine).mockResolvedValue(PAGE(false))
    vi.mocked(askApi.ask).mockResolvedValue({ lane: 'add_a_document', composedBy: 'rules', blocks: [
      { type: 'text', body: 'It will be for the whole of Msingi Foods.' },
      { type: 'next_step', label: 'Choose a file', href: '/company', kind: 'upload_a_document', id: 'organisation', context: { forTheOrganisation: 'yes' } },
    ] })
    vi.mocked(askApi.addADocumentForTheOrganisation).mockResolvedValue({ lane: 'add_a_document', composedBy: 'rules', blocks: [
      { type: 'text', body: 'I have read Staff handbook. Nothing is added yet.' },
      { type: 'proposal', proposalId: 'pr-hb', summary: "Add Staff handbook to Msingi Foods' handbook?" },
    ] })
    vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {})
    const { container } = panel()
    fireEvent.click(await screen.findByRole('button', { name: PLUS }))
    const file = new File(['x'], 'Staff handbook.pdf', { type: 'application/pdf' })
    fireEvent.change(picker(container), { target: { files: [file] } })
    await waitFor(() => expect(askApi.ask).toHaveBeenCalledWith('I want to add a document for the whole organisation.', undefined))
    await waitFor(() => expect(askApi.addADocumentForTheOrganisation).toHaveBeenCalledWith(file))
    expect(documentsApi.upload).not.toHaveBeenCalled()
    expect(await screen.findByText('I have read Staff handbook. Nothing is added yet.')).toBeInTheDocument()
    expect(askApi.answer).not.toHaveBeenCalled()
    vi.mocked(askApi.answer).mockResolvedValue({ lane: 'add_a_document', composedBy: 'rules', blocks: [{ type: 'text', body: "I have added Staff handbook to Msingi Foods' handbook." }] })
    fireEvent.click(screen.getByRole('button', { name: 'Yes' }))
    await waitFor(() => expect(askApi.answer).toHaveBeenCalledWith('pr-hb', 'yes'))
    expect(await screen.findByText("I have added Staff handbook to Msingi Foods' handbook.")).toBeInTheDocument()
  })

  it('when Ask says there is nowhere to put it, its words are shown and the file is not sent', async () => {
    as('MEMBER'); vi.mocked(askApi.mine).mockResolvedValue(PAGE(true))
    vi.mocked(askApi.ask).mockResolvedValue({ lane: 'add_a_document', composedBy: 'rules', blocks: [
      { type: 'text', body: 'You have no check-in open, so there is nowhere to put one yet.' },
    ] })
    vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {})
    const { container } = panel()
    fireEvent.click(await screen.findByRole('button', { name: PLUS }))
    fireEvent.change(picker(container), { target: { files: [new File(['x'], 'a.pdf')] } })
    expect(await screen.findByText('You have no check-in open, so there is nowhere to put one yet.')).toBeInTheDocument()
    expect(documentsApi.upload).not.toHaveBeenCalled()
    expect(askApi.addADocumentForTheOrganisation).not.toHaveBeenCalled()
  })
})
