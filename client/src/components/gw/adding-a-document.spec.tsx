import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AddADocument } from './AddADocument'
import { documentsApi } from '@/api/documents'

vi.mock('@/api/documents', () => ({
  documentsApi: { list: vi.fn(), setNote: vi.fn(async () => ({})), setVisibility: vi.fn(async () => ({})), remove: vi.fn(async () => ({})) },
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

/*
 * ADD A DOCUMENT, AS THE PERSON ADDING IT READS IT (U.7, B2 Context).
 *
 * Words from docs/prototype/screens/B2-context/upload.txt: the file's name, "Choose a different
 * file", "What should it be used for? One line is enough; you can skip it.", "What it took from the
 * document", "What it left out", "Who can read it", "Only you", "Everyone in this check-in", "They
 * can open it from References and resources.", "Add it to References and resources" and "Cancel" (the tab
 * and page renamed "References and resources" so its name says what it now holds).
 */
const readDoc = {
  id: 'd1', name: 'Q3 price list.pdf', uploadedAt: '2026-09-23T10:00:00Z', visibility: 'OWN', mine: true,
  assessment: { suggests: ['List prices run from KES 62,000 to KES 110,000.', 'Delivery is free in Nairobi.'], willDo: [] },
  holds: { forOnePerson: [], forEverybody: [], dates: [], unmatched: [] },
}
const draw = (props: Partial<React.ComponentProps<typeof AddADocument>> = {}) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const onClose = vi.fn()
  const onChooseAnother = vi.fn()
  render(
    <QueryClientProvider client={qc}>
      <AddADocument groundId="g1" docId="d1" fileName="Q3 price list.pdf" contextEnabled onClose={onClose} onChooseAnother={onChooseAnother} {...props} />
    </QueryClientProvider>,
  )
  return { onClose, onChooseAnother }
}

beforeEach(() => vi.clearAllMocks())

describe('while the file is being read', () => {
  it('names the file and says it is reading it', async () => {
    ;(documentsApi.list as any).mockResolvedValue([{ ...readDoc, assessment: null, holds: null, stillReading: true }])
    draw()
    expect(screen.getByText('Q3 price list.pdf')).toBeTruthy()
    expect(screen.getByText('Reading it now.')).toBeTruthy()
    expect(screen.getByText('Choose a different file')).toBeTruthy()
    expect(screen.queryByText('What it took from the document')).toBeNull()
  })
})

describe('once it is read', () => {
  it('says what the check-in will use, from what the read found', async () => {
    ;(documentsApi.list as any).mockResolvedValue([readDoc])
    draw()
    expect(await screen.findByText('Read just now. Here’s what the check-in will use.')).toBeTruthy()
    expect(screen.getByText('What it took from the document')).toBeTruthy()
    expect(screen.getByText('List prices run from KES 62,000 to KES 110,000.')).toBeTruthy()
    expect(screen.getByText('What should it be used for?')).toBeTruthy()
    expect(screen.getByText(/One line is enough; you can skip it\./)).toBeTruthy()
    /* Nothing the read did not send: no pages, no left-out list, no mismatch question. */
    expect(screen.queryByText('What it left out')).toBeNull()
    expect(screen.queryByText(/doesn’t match/)).toBeNull()
  })

  it('and, when the engine sends the read item by item, the pages and what it left out', async () => {
    ;(documentsApi.list as any).mockResolvedValue([{ ...readDoc, read: {
      pages: 4,
      took: [{ what: 'List prices', detail: 'KES 62,000 to KES 110,000', page: 1 }],
      leftOut: [{ what: 'Bank account details', page: 4, why: 'Never kept, in any document.' }],
    } }])
    draw()
    expect(await screen.findByText('4 pages, read just now. Here’s what the check-in will use, and what it won’t.')).toBeTruthy()
    expect(screen.getByText('List prices')).toBeTruthy()
    expect(screen.getByText('KES 62,000 to KES 110,000')).toBeTruthy()
    expect(screen.getByText('Page 1')).toBeTruthy()
    expect(screen.getByText('What it left out')).toBeTruthy()
    expect(screen.getByText('Bank account details')).toBeTruthy()
    expect(screen.getByText('Never kept, in any document.')).toBeTruthy()
  })
})

describe('who can read it, and keeping it', () => {
  it('starts private, says so truthfully, and offers everyone in the check-in', async () => {
    ;(documentsApi.list as any).mockResolvedValue([readDoc])
    draw()
    await screen.findByText('What it took from the document')
    expect(screen.getByText('Who can read it')).toBeTruthy()
    expect((screen.getByRole('radio', { name: /Only you/ }) as HTMLInputElement).checked).toBe(true)
    /* U.7 review: plainer, and says what the document does for its uploader. */
    expect(screen.getByText('Only you can open it. It shapes the questions in your own check-in.')).toBeTruthy()
    expect(screen.getByText('Everyone in this check-in')).toBeTruthy()
    expect(screen.getByText('They can open it from References and resources.')).toBeTruthy()
    /* The prototype's sentence is not true today: a private document shapes only its uploader's questions. */
    expect(screen.queryByText(/uses it for everyone/)).toBeNull()
  })

  it('Add it to References and resources saves what it is for and opens it to everyone when chosen', async () => {
    ;(documentsApi.list as any).mockResolvedValue([readDoc])
    const { onClose } = draw()
    await screen.findByText('What it took from the document')
    await userEvent.type(screen.getByLabelText(/What should it be used for/), 'Checks price objections')
    await userEvent.click(screen.getByRole('radio', { name: /Everyone in this check-in/ }))
    await userEvent.click(screen.getByText('Add it to References and resources'))
    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(documentsApi.setNote).toHaveBeenCalledWith('g1', 'd1', 'Checks price objections')
    expect(documentsApi.setVisibility).toHaveBeenCalledWith('g1', 'd1', 'OPEN')
    expect(documentsApi.remove).not.toHaveBeenCalled()
  })

  it('kept private, nothing is opened to anyone', async () => {
    ;(documentsApi.list as any).mockResolvedValue([readDoc])
    const { onClose } = draw()
    await screen.findByText('What it took from the document')
    await userEvent.click(screen.getByText('Add it to References and resources'))
    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(documentsApi.setVisibility).not.toHaveBeenCalled()
  })

  it('Cancel removes the file that was uploaded', async () => {
    ;(documentsApi.list as any).mockResolvedValue([readDoc])
    const { onClose } = draw()
    await userEvent.click(screen.getByText('Cancel'))
    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(documentsApi.remove).toHaveBeenCalledWith('g1', 'd1')
  })

  it('Choose a different file removes this one and opens the picker again', async () => {
    ;(documentsApi.list as any).mockResolvedValue([readDoc])
    const { onChooseAnother } = draw()
    await userEvent.click(screen.getByText('Choose a different file'))
    await waitFor(() => expect(onChooseAnother).toHaveBeenCalled())
    expect(documentsApi.remove).toHaveBeenCalledWith('g1', 'd1')
  })

  it('with sharing switched off for the whole product, there is no choice to offer', async () => {
    ;(documentsApi.list as any).mockResolvedValue([readDoc])
    draw({ contextEnabled: false })
    await screen.findByText('What it took from the document')
    expect(screen.queryByRole('radio')).toBeNull()
    expect(screen.getByText('Only you can open it.')).toBeTruthy()
  })
})
