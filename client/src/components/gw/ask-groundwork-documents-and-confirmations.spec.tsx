import { describe, it, expect, vi, beforeEach } from 'vitest'
import { askIsReady } from '@/test/ask-is-ready'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AskGroundwork } from './AskGroundwork'
import type { AskPage as AskPageData } from '@/api/ask'
import type { GroundDocument } from '@/api/documents'

/**
 * ASK GROUNDWORK, THE SCREENS FOR DOCUMENTS AND FOR CONFIRMING THINGS (decision 50,
 * docs/answers-from-engine.md, "30 September: what Ask Groundwork's screens need to show, so the old
 * context chat can be switched off", and the section after it on a document's numbers). These are the
 * shapes the old context chat covered, all served through the one `POST /ask` and `POST /ask/answer`.
 * What each reader sees, and that questions stay private, are the server's own rules
 * (api/src/modules/ask, api/src/modules/assistant) - here is only what the panel draws from what it
 * is served.
 */
vi.mock('@/api/ask', () => ({ askApi: { mine: vi.fn(), ask: vi.fn(), answer: vi.fn() } }))
vi.mock('@/api/documents', () => ({ documentsApi: { upload: vi.fn(), list: vi.fn() } }))
import { askApi } from '@/api/ask'
import { documentsApi } from '@/api/documents'

const ABOUT: AskPageData = {
  canAsk: true,
  about: [{ id: 'g-sales', label: 'Sales team, Q3' }],
  turns: [],
  askName: 'Ask Groundwork',
  caption: 'Ask about the company, your work or your check-ins.',
  addLine: 'You can also add context or documents to your check-ins here.',
  welcome: null,
  starters: [],
}

function panel(extraProps: Partial<Parameters<typeof AskGroundwork>[0]> = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/grounds/g-sales/board']}>
        <AskGroundwork onClose={() => {}} pollIntervalMs={1} pollTimeoutMs={30} {...extraProps} />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(askApi.mine).mockResolvedValue(ABOUT)
})

describe('a text block', () => {
  it('is shown exactly as served, with no buttons', async () => {
    vi.mocked(askApi.ask).mockResolvedValue({
      lane: 'what_is_stuck', composedBy: 'rules',
      blocks: [{ type: 'text', body: 'Nothing is recorded as waiting on you.' }],
    })
    panel()
    await askIsReady()
    fireEvent.change(screen.getByPlaceholderText(/^Ask (a question|about this check-in)$/), { target: { value: 'what is stuck' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))
    expect(await screen.findByText('Nothing is recorded as waiting on you.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Yes' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'No' })).toBeNull()
  })
})

describe('a proposal', () => {
  const OFFER = 'Shall I add "we will drop the pilot" to this check-in’s context as a decision?'

  it('draws the summary with Yes and No, and Yes calls POST /ask/answer', async () => {
    vi.mocked(askApi.ask).mockResolvedValue({
      lane: 'add_context', composedBy: 'rules',
      blocks: [{ type: 'proposal', proposalId: 'pr-1', summary: OFFER }],
    })
    vi.mocked(askApi.answer).mockResolvedValue({
      lane: 'add_context', composedBy: 'rules',
      blocks: [{ type: 'text', body: 'Added.' }],
    })
    panel()
    await askIsReady()
    fireEvent.change(screen.getByPlaceholderText(/^Ask (a question|about this check-in)$/), { target: { value: 'decision: we will drop the pilot' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))
    expect(await screen.findByText(OFFER)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Yes' }))
    expect(await screen.findByText('Added.')).toBeInTheDocument()
    expect(askApi.answer).toHaveBeenCalledWith('pr-1', 'yes')
    expect(screen.queryByRole('button', { name: 'Yes' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'No' })).toBeNull()
  })

  it('loses its buttons once a newer proposal arrives, and only the newest can be answered', async () => {
    vi.mocked(askApi.ask)
      .mockResolvedValueOnce({
        lane: 'add_context', composedBy: 'rules',
        blocks: [{ type: 'proposal', proposalId: 'pr-old', summary: 'Shall I add the first line?' }],
      })
      .mockResolvedValueOnce({
        lane: 'add_context', composedBy: 'rules',
        blocks: [{ type: 'proposal', proposalId: 'pr-new', summary: 'Shall I add the second line?' }],
      })
    panel()
    await askIsReady()
    const input = screen.getByPlaceholderText(/^Ask (a question|about this check-in)$/)

    fireEvent.change(input, { target: { value: 'note about the first line' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))
    await screen.findByText('Shall I add the first line?')
    expect(screen.getAllByRole('button', { name: 'Yes' })).toHaveLength(1)

    fireEvent.change(input, { target: { value: 'note about the second line' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))
    await screen.findByText('Shall I add the second line?')

    // Only one Yes and one No on the screen now: the newest proposal's.
    expect(screen.getAllByRole('button', { name: 'Yes' })).toHaveLength(1)
    expect(screen.getAllByRole('button', { name: 'No' })).toHaveLength(1)
    expect(askApi.answer).not.toHaveBeenCalled()
  })

  it('shows a 409’s plain sentence, as it is, when an old proposal is pressed anyway', async () => {
    vi.mocked(askApi.ask).mockResolvedValue({
      lane: 'add_context', composedBy: 'rules',
      blocks: [{ type: 'proposal', proposalId: 'pr-1', summary: 'Shall I add this line?' }],
    })
    vi.mocked(askApi.answer).mockRejectedValue({
      response: { status: 409, data: { message: 'Something newer is waiting on you now, so this one is closed.' } },
    })
    panel()
    await askIsReady()
    fireEvent.change(screen.getByPlaceholderText(/^Ask (a question|about this check-in)$/), { target: { value: 'add a line' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))
    await screen.findByText('Shall I add this line?')
    fireEvent.click(screen.getByRole('button', { name: 'Yes' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Something newer is waiting on you now, so this one is closed.')
  })
})

describe('a refusal', () => {
  it('is shown as a plain text block, as it is', async () => {
    vi.mocked(askApi.ask).mockResolvedValue({
      lane: 'confirm_a_question', composedBy: 'rules',
      blocks: [{ type: 'text', body: 'Only the lead who runs this check-in can confirm a question for someone on it.' }],
    })
    panel()
    await askIsReady()
    fireEvent.change(screen.getByPlaceholderText(/^Ask (a question|about this check-in)$/), { target: { value: 'confirm the question for Ben' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))
    expect(await screen.findByText('Only the lead who runs this check-in can confirm a question for someone on it.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Yes' })).toBeNull()
  })
})

describe('a question that is not yes or no', () => {
  it('is drawn as text, with no buttons, and the reply goes in the ordinary box', async () => {
    vi.mocked(askApi.ask).mockResolvedValue({
      lane: 'setup', composedBy: 'rules',
      blocks: [{ type: 'text', body: 'How long should it run?' }],
    })
    panel()
    await askIsReady()
    fireEvent.change(screen.getByPlaceholderText(/^Ask (a question|about this check-in)$/), { target: { value: 'setting up context for the sales check-in' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))
    expect(await screen.findByText('How long should it run?')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Yes' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'No' })).toBeNull()

    // Answered by typing, in the same box - not a picker, not a proposal.
    fireEvent.change(screen.getByPlaceholderText(/^Ask (a question|about this check-in)$/), { target: { value: '12 weeks' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))
    expect(askApi.ask).toHaveBeenLastCalledWith('12 weeks', 'g-sales')
  })
})

describe('the upload next step', () => {
  const uploadReply = {
    lane: 'add_a_document', composedBy: 'rules' as const,
    blocks: [
      { type: 'text' as const, body: 'It will go on "Sales team, Q3", and only you will be able to see it until you say otherwise.' },
      {
        type: 'next_step' as const, label: 'Choose a file', href: '/grounds', kind: 'upload_a_document',
        id: 'g-sales', context: { groundId: 'g-sales', label: 'Sales team, Q3' },
      },
    ],
  }

  function fileInputEl(container: HTMLElement) {
    return container.querySelector('input[type="file"]') as HTMLInputElement
  }

  it('opens the file picker, uploads, waits while it reads, then sends "I’ve uploaded it."', async () => {
    vi.mocked(askApi.ask)
      .mockResolvedValueOnce(uploadReply)
      .mockResolvedValueOnce({
        lane: 'add_a_document', composedBy: 'rules',
        blocks: [{ type: 'proposal', proposalId: 'pr-nums', summary: 'Here is what I took from Q4 targets.xlsx. Shall I record these numbers on this check-in?' }],
      })
    vi.mocked(documentsApi.upload).mockResolvedValue({ id: 'doc-1', name: 'Q4 targets.xlsx', mimeType: 'application/vnd.ms-excel', uploadedAt: '2026-09-30T00:00:00Z' } as GroundDocument)
    vi.mocked(documentsApi.list).mockResolvedValue([
      { id: 'doc-1', name: 'Q4 targets.xlsx', mimeType: 'application/vnd.ms-excel', uploadedAt: '2026-09-30T00:00:00Z', assessment: null, holds: { forOnePerson: [], forEverybody: [], dates: [], unmatched: [], waiting: [{ name: 'Renewals', target: 20, ownerParticipantId: null }] } } as GroundDocument,
    ])

    const { container } = panel()
    await askIsReady()
    fireEvent.change(screen.getByPlaceholderText(/^Ask (a question|about this check-in)$/), { target: { value: 'I want to add the Q4 targets sheet' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))

    const button = await screen.findByRole('button', { name: 'Choose a file' })
    fireEvent.click(button)

    const file = new File(['numbers'], 'Q4 targets.xlsx', { type: 'application/vnd.ms-excel' })
    fireEvent.change(fileInputEl(container), { target: { files: [file] } })
    /* Checked synchronously, before the upload's own promise gets a turn: React commits "reading"
       true as part of handling the change event, ahead of anything the upload does. */
    expect(screen.getByText('Reading it now.')).toBeInTheDocument()

    await waitFor(() => expect(documentsApi.upload).toHaveBeenCalledWith('g-sales', file))
    await waitFor(() => expect(askApi.ask).toHaveBeenLastCalledWith("I've uploaded it.", 'g-sales'))
    expect(await screen.findByText(/Here is what I took from Q4 targets\.xlsx/)).toBeInTheDocument()
    expect(screen.queryByText('Reading it now.')).toBeNull()
  })

  it('stops waiting after the time given, and still sends the message', async () => {
    vi.mocked(askApi.ask)
      .mockResolvedValueOnce(uploadReply)
      .mockResolvedValueOnce({ lane: 'add_a_document', composedBy: 'rules', blocks: [{ type: 'text', body: "I did not find a document to check." }] })
    vi.mocked(documentsApi.upload).mockResolvedValue({ id: 'doc-2', name: 'notes.pdf', mimeType: 'application/pdf', uploadedAt: '2026-09-30T00:00:00Z' } as GroundDocument)
    vi.mocked(documentsApi.list).mockResolvedValue([
      { id: 'doc-2', name: 'notes.pdf', mimeType: 'application/pdf', uploadedAt: '2026-09-30T00:00:00Z', holds: null } as GroundDocument,
    ])

    const { container } = panel({ pollIntervalMs: 1, pollTimeoutMs: 5 })
    await askIsReady()
    fireEvent.change(screen.getByPlaceholderText(/^Ask (a question|about this check-in)$/), { target: { value: 'add a document' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Choose a file' }))
    const file = new File(['x'], 'notes.pdf', { type: 'application/pdf' })
    fireEvent.change(fileInputEl(container), { target: { files: [file] } })

    await waitFor(() => expect(askApi.ask).toHaveBeenLastCalledWith("I've uploaded it.", 'g-sales'))
    expect(await screen.findByText('I did not find a document to check.')).toBeInTheDocument()
  })
})
