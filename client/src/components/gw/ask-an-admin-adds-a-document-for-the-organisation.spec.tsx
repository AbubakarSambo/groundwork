import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AskGroundwork } from './AskGroundwork'
import type { AskPage as AskPageData } from '@/api/ask'

/**
 * HAFSAH'S FIX LIST, ITEM 3: an admin adds a document in Ask, said back before anything is kept. The server decides
 * who may (api/src/modules/ask/an-admin-adds-a-document-for-the-whole-organisation.spec.ts); here is what Grace, the
 * admin, reads in the panel: the line under the caption, the file picker, what was read, and the yes.
 */
vi.mock('@/api/ask', () => ({ askApi: { mine: vi.fn(), ask: vi.fn(), answer: vi.fn(), addADocumentForTheOrganisation: vi.fn() } }))
vi.mock('@/api/documents', () => ({ documentsApi: { upload: vi.fn(), list: vi.fn() } }))
import { askApi } from '@/api/ask'
import { documentsApi } from '@/api/documents'

const GRACE: AskPageData = {
  canAsk: true,
  about: [],
  turns: [],
  askName: 'Ask Msingi Foods',
  caption: 'Ask about the company, your work or your check-ins.',
  addLine: 'You can also add a document for the whole organisation here.',
  welcome: null,
  starters: [],
}

const OFFER = 'It will be for the whole of Msingi Foods. When you choose the file, I will read it and tell you what is in it. Nothing is added until you say yes.'
const SAID_BACK = "I have read Staff handbook. It has 3 parts. They cover Leave, Expenses and Travel.\n\nNothing is added yet. If you say yes, it becomes part of Msingi Foods' handbook. Ask Msingi Foods answers from it, and check-ins are read with it in mind. If you say no, nothing from it is kept."

function panel() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/today']}>
        <AskGroundwork onClose={() => {}} pollIntervalMs={1} pollTimeoutMs={30} />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(askApi.mine).mockResolvedValue(GRACE)
})

describe('Grace adds the staff handbook through Ask', () => {
  it('reads the line under the caption, chooses the file, reads what it holds, and says yes', async () => {
    vi.mocked(askApi.ask).mockResolvedValue({
      lane: 'add_a_document', composedBy: 'rules',
      blocks: [
        { type: 'text', body: OFFER },
        { type: 'next_step', label: 'Choose a file', href: '/company', kind: 'upload_a_document', id: 'organisation', context: { forTheOrganisation: 'yes' } },
      ],
    })
    vi.mocked(askApi.addADocumentForTheOrganisation).mockResolvedValue({
      lane: 'add_a_document', composedBy: 'rules',
      blocks: [{ type: 'text', body: SAID_BACK }, { type: 'proposal', proposalId: 'pr-hb', summary: "Add Staff handbook to Msingi Foods' handbook?" }],
    })
    vi.mocked(askApi.answer).mockResolvedValue({
      lane: 'add_a_document', composedBy: 'rules',
      blocks: [{ type: 'text', body: "I have added Staff handbook to Msingi Foods' handbook, in 3 parts. Ask Msingi Foods answers from it from now on." }],
    })

    const { container } = panel()
    expect(await screen.findByText('You can also add a document for the whole organisation here.')).toBeInTheDocument()
    fireEvent.change(screen.getByPlaceholderText(GRACE.caption), { target: { value: 'Add a document for the whole organisation.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))
    expect(await screen.findByText(OFFER)).toBeInTheDocument()

    fireEvent.click(await screen.findByRole('button', { name: 'Choose a file' }))
    const file = new File(['# Leave\n\n21 days a year.'], 'Staff handbook.pdf', { type: 'application/pdf' })
    fireEvent.change(container.querySelector('input[type="file"]') as HTMLInputElement, { target: { files: [file] } })
    expect(screen.getByText('Reading it now.')).toBeInTheDocument()

    await waitFor(() => expect(askApi.addADocumentForTheOrganisation).toHaveBeenCalledWith(file))
    expect(documentsApi.upload).not.toHaveBeenCalled()
    expect(await screen.findByText('I have added Staff handbook.pdf.')).toBeInTheDocument()
    expect(await screen.findByText(/I have read Staff handbook\. It has 3 parts\. They cover Leave, Expenses and Travel\./)).toBeInTheDocument()
    expect(screen.getByText(/Nothing is added yet\./)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Yes' }))
    expect(await screen.findByText(/I have added Staff handbook to Msingi Foods' handbook, in 3 parts\./)).toBeInTheDocument()
    expect(askApi.answer).toHaveBeenCalledWith('pr-hb', 'yes')
  })

  it('a refusal from the server is shown in its own words', async () => {
    vi.mocked(askApi.ask).mockResolvedValue({
      lane: 'add_a_document', composedBy: 'rules',
      blocks: [{ type: 'next_step', label: 'Choose a file', href: '/company', kind: 'upload_a_document', id: 'organisation' }],
    })
    vi.mocked(askApi.addADocumentForTheOrganisation).mockRejectedValue({ response: { data: { message: 'Only an admin of Msingi Foods can add a document for the whole organisation.' } } })
    const { container } = panel()
    await screen.findByPlaceholderText(GRACE.caption)
    fireEvent.change(screen.getByPlaceholderText(GRACE.caption), { target: { value: 'add a document' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Choose a file' }))
    fireEvent.change(container.querySelector('input[type="file"]') as HTMLInputElement, { target: { files: [new File(['x'], 'a.pdf')] } })
    expect(await screen.findByText('Only an admin of Msingi Foods can add a document for the whole organisation.')).toBeInTheDocument()
  })
})
