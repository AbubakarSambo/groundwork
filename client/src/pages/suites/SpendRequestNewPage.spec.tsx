import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SpendRequestNewPage } from './SpendRequestNewPage'
import { useAuthStore } from '@/stores/auth'

/**
 * CREATE A PAYMENT REQUEST, FROM ITS OWN FORM (request 165, Hafsah 6 October;
 * docs/requests-to-engine.md; docs/answers-from-engine.md, "request 165, the forms for leave and
 * spending"). `GET /suites/spend/form` answers the currency, what the organisation calls a
 * category, and the categories themselves - never a limit of the form's own. `POST
 * /suites/spend/requests` answers `{ id, says }` on success.
 */
vi.mock('@/api/suites', () => ({ fileARequestApi: { spending: vi.fn(), spendForm: vi.fn() } }))
import { fileARequestApi } from '@/api/suites'

const BARAKA = { id: 'u-b', firstName: 'Baraka', role: 'MEMBER', organizationName: 'Sokoni Fresh' }

function open(initialState?: { prefill?: { amount?: number; what?: string } } | null) {
  useAuthStore.setState({ user: BARAKA, token: 't', isAuthenticated: true } as any)
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[{ pathname: '/suite/spend/new', state: initialState }]}>
        <Routes>
          <Route path="/suite/spend/new" element={<SpendRequestNewPage />} />
          <Route path="/suite/mine" element={<ArrivedAtMine />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}
function ArrivedAtMine() {
  return <div>Arrived at your requests</div>
}
const refusal = (status: number, message?: string) => Object.assign(new Error(String(status)), { response: { status, data: message ? { message } : {} } })

beforeEach(() => {
  vi.clearAllMocks()
  ;(fileARequestApi.spendForm as any).mockResolvedValue({ currency: null, categoryCalled: 'category', categories: [] })
})

describe('Create a payment request', () => {
  it('reads the title and the two fields, and starts empty with no prefill', async () => {
    open()
    expect(await screen.findByRole('heading', { level: 1, name: 'Create a payment request' })).toBeInTheDocument()
    expect(screen.getByLabelText('Amount')).toHaveValue(null)
    expect(screen.getByLabelText('What it is for')).toHaveValue('')
    expect(screen.queryByLabelText('Category')).toBeNull()
  })

  it('starts filled in from the prefill carried in router state', async () => {
    open({ prefill: { amount: 4000, what: 'the workshop' } })
    expect(await screen.findByLabelText('Amount')).toHaveValue(4000)
    expect(screen.getByLabelText('What it is for')).toHaveValue('the workshop')
  })

  it('draws the served currency beside the amount, and writes none of its own', async () => {
    ;(fileARequestApi.spendForm as any).mockResolvedValue({ currency: 'KES', categoryCalled: 'category', categories: [] })
    open()
    expect(await screen.findByLabelText('Amount (KES)')).toBeInTheDocument()
  })

  it('shows a category choice, labelled with categoryCalled, only when the form serves any', async () => {
    ;(fileARequestApi.spendForm as any).mockResolvedValue({ currency: 'KES', categoryCalled: 'project', categories: ['Fuel', 'Repairs'] })
    ;(fileARequestApi.spending as any).mockResolvedValue({ id: 'r1', says: 'Sent.' })
    open()
    const category = await screen.findByLabelText('Project')
    expect(screen.getByRole('option', { name: 'Fuel' })).toBeInTheDocument()
    fireEvent.change(category, { target: { value: 'Repairs' } })
    fireEvent.change(screen.getByLabelText('Amount (KES)'), { target: { value: '4000' } })
    fireEvent.change(screen.getByLabelText('What it is for'), { target: { value: 'the workshop' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))
    await waitFor(() => expect(fileARequestApi.spending).toHaveBeenCalledWith({ amount: 4000, what: 'the workshop', category: 'Repairs' }))
  })

  it('Send posts exactly the amount and what it is for, with no category when none is picked', async () => {
    ;(fileARequestApi.spending as any).mockResolvedValue({ id: 'r1', says: 'Your payment request has been sent to Amina.' })
    open()
    fireEvent.change(await screen.findByLabelText('Amount'), { target: { value: '4000' } })
    fireEvent.change(screen.getByLabelText('What it is for'), { target: { value: 'the workshop' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))
    await waitFor(() => expect(fileARequestApi.spending).toHaveBeenCalledWith({ amount: 4000, what: 'the workshop' }))
  })

  it('on success, goes to Your requests and says it was sent, in the server’s own sentence', async () => {
    ;(fileARequestApi.spending as any).mockResolvedValue({ id: 'r1', says: 'Your payment request has been sent to Amina.' })
    open()
    fireEvent.change(await screen.findByLabelText('Amount'), { target: { value: '4000' } })
    fireEvent.change(screen.getByLabelText('What it is for'), { target: { value: 'the workshop' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))
    expect(await screen.findByText('Arrived at your requests')).toBeInTheDocument()
  })

  it('with the suite off, shows the board’s own off sentence and no fields', async () => {
    ;(fileARequestApi.spendForm as any).mockRejectedValue(refusal(404, 'The spending suite is not switched on in your organisation.'))
    open()
    expect(await screen.findByText('The spending suite is not switched on in your organisation.')).toBeInTheDocument()
    expect(screen.queryByLabelText('Amount')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Send' })).toBeNull()
  })

  it('on a 404 with no message, says plainly it could not be sent from here yet, and names Ask by the organisation', async () => {
    ;(fileARequestApi.spending as any).mockRejectedValue(refusal(404))
    open()
    fireEvent.change(await screen.findByLabelText('Amount'), { target: { value: '4000' } })
    fireEvent.change(screen.getByLabelText('What it is for'), { target: { value: 'the workshop' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))
    expect(await screen.findByText('This request could not be sent from here yet. You can ask for it in Ask Sokoni Fresh instead.')).toBeInTheDocument()
  })

  it('on another failure, shows the server’s own message', async () => {
    ;(fileARequestApi.spending as any).mockRejectedValue(refusal(400, 'Give an amount of more than nothing.'))
    open()
    fireEvent.change(await screen.findByLabelText('Amount'), { target: { value: '4000' } })
    fireEvent.change(screen.getByLabelText('What it is for'), { target: { value: 'the workshop' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))
    expect(await screen.findByText('Give an amount of more than nothing.')).toBeInTheDocument()
  })
})
