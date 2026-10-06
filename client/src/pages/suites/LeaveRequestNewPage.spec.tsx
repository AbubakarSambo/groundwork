import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { LeaveRequestNewPage } from './LeaveRequestNewPage'
import { useAuthStore } from '@/stores/auth'

/**
 * REQUEST LEAVE, FROM ITS OWN FORM (request 165, Hafsah 6 October; docs/requests-to-engine.md;
 * docs/answers-from-engine.md, "request 165, the forms for leave and spending").
 *
 * `GET /suites/leave/form` answers the kinds of leave and who could stand in, open to anybody in
 * the organisation who is not a guest - never the rules themselves, which stay admin/HR-only on
 * `/suites/leave/rules`. With the suite off, that read refuses with the board's own off sentence,
 * and the page shows it with no fields at all. `POST /suites/leave/requests` answers `{ id, says
 * }` on success, and refuses in its own full sentences otherwise.
 */
vi.mock('@/api/suites', () => ({ fileARequestApi: { leave: vi.fn(), leaveForm: vi.fn() } }))
import { fileARequestApi } from '@/api/suites'

const RUKIA = { id: 'u-r', firstName: 'Rukia', role: 'MEMBER', organizationName: 'Sokoni Fresh' }

function open(initialState?: { prefill?: { startsOn?: string; endsOn?: string } } | null) {
  useAuthStore.setState({ user: RUKIA, token: 't', isAuthenticated: true } as any)
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[{ pathname: '/suite/leave/new', state: initialState }]}>
        <Routes>
          <Route path="/suite/leave/new" element={<LeaveRequestNewPage />} />
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
  ;(fileARequestApi.leaveForm as any).mockResolvedValue({ kinds: [], standIns: [] })
})

describe('Request leave', () => {
  it('reads the title, the two dates, and starts empty with no prefill', async () => {
    open()
    expect(await screen.findByRole('heading', { level: 1, name: 'Request leave' })).toBeInTheDocument()
    expect(screen.getByLabelText('Start date')).toHaveValue('')
    expect(screen.getByLabelText('End date')).toHaveValue('')
    expect(screen.queryByLabelText('Kind of leave')).toBeNull()
    expect(screen.queryByLabelText('Who covers for you?')).toBeNull()
  })

  it('starts filled in from the prefill carried in router state', async () => {
    open({ prefill: { startsOn: '2026-10-10', endsOn: '2026-10-12' } })
    expect(await screen.findByLabelText('Start date')).toHaveValue('2026-10-10')
    expect(screen.getByLabelText('End date')).toHaveValue('2026-10-12')
  })

  it('shows the kind of leave only when the form serves any', async () => {
    ;(fileARequestApi.leaveForm as any).mockResolvedValue({
      kinds: [{ key: 'annual', name: 'Annual leave' }, { key: 'sick', name: 'Sick leave' }],
      standIns: [],
    })
    open()
    expect(await screen.findByLabelText('Kind of leave')).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Annual leave' })).toBeInTheDocument()
  })

  it('shows who covers for you, by name, only when the form serves any stand-ins, and sends the id picked', async () => {
    ;(fileARequestApi.leaveForm as any).mockResolvedValue({
      kinds: [],
      standIns: [{ userId: 'u-miriam', name: 'Miriam' }, { userId: 'u-tomas', name: 'Tomas' }],
    })
    ;(fileARequestApi.leave as any).mockResolvedValue({ id: 'r1', says: 'Sent.' })
    open()
    const standIn = await screen.findByLabelText('Who covers for you?')
    expect(screen.getByRole('option', { name: 'Miriam' })).toBeInTheDocument()
    fireEvent.change(standIn, { target: { value: 'u-tomas' } })
    fireEvent.change(screen.getByLabelText('Start date'), { target: { value: '2026-11-01' } })
    fireEvent.change(screen.getByLabelText('End date'), { target: { value: '2026-11-03' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))
    await waitFor(() => expect(fileARequestApi.leave).toHaveBeenCalledWith({ startsOn: '2026-11-01', endsOn: '2026-11-03', standInUserId: 'u-tomas' }))
  })

  it('Send posts exactly the dates typed, with no kind and no stand-in when neither is picked', async () => {
    ;(fileARequestApi.leave as any).mockResolvedValue({ id: 'r1', says: 'Your request for leave has been sent to Amina.' })
    open()
    fireEvent.change(await screen.findByLabelText('Start date'), { target: { value: '2026-11-01' } })
    fireEvent.change(screen.getByLabelText('End date'), { target: { value: '2026-11-03' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))
    await waitFor(() => expect(fileARequestApi.leave).toHaveBeenCalledWith({ startsOn: '2026-11-01', endsOn: '2026-11-03' }))
  })

  it('on success, goes to Your requests and says it was sent, in the server’s own sentence', async () => {
    ;(fileARequestApi.leave as any).mockResolvedValue({ id: 'r1', says: 'Your request for leave has been sent to Amina.' })
    open()
    fireEvent.change(await screen.findByLabelText('Start date'), { target: { value: '2026-11-01' } })
    fireEvent.change(screen.getByLabelText('End date'), { target: { value: '2026-11-03' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))
    expect(await screen.findByText('Arrived at your requests')).toBeInTheDocument()
  })

  it('with the suite off, shows the board’s own off sentence and no fields', async () => {
    ;(fileARequestApi.leaveForm as any).mockRejectedValue(refusal(404, 'The leave suite is not switched on in your organisation.'))
    open()
    expect(await screen.findByText('The leave suite is not switched on in your organisation.')).toBeInTheDocument()
    expect(screen.queryByLabelText('Start date')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Send' })).toBeNull()
  })

  it('on a 404 with no message, says plainly it could not be sent from here yet, and names Ask by the organisation', async () => {
    ;(fileARequestApi.leave as any).mockRejectedValue(refusal(404))
    open()
    fireEvent.change(await screen.findByLabelText('Start date'), { target: { value: '2026-11-01' } })
    fireEvent.change(screen.getByLabelText('End date'), { target: { value: '2026-11-03' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))
    expect(await screen.findByText('This request could not be sent from here yet. You can ask for it in Ask Sokoni Fresh instead.')).toBeInTheDocument()
  })

  it('on another failure, shows the server’s own message', async () => {
    ;(fileARequestApi.leave as any).mockRejectedValue(refusal(400, 'The end date is before the start date.'))
    open()
    fireEvent.change(await screen.findByLabelText('Start date'), { target: { value: '2026-11-03' } })
    fireEvent.change(screen.getByLabelText('End date'), { target: { value: '2026-11-01' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))
    expect(await screen.findByText('The end date is before the start date.')).toBeInTheDocument()
  })
})
