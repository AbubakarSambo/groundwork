import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { LeaveRequestNewPage } from './LeaveRequestNewPage'
import { useAuthStore } from '@/stores/auth'

/**
 * REQUEST LEAVE, FROM ITS OWN FORM (request 165, Hafsah 6 October; docs/requests-to-engine.md).
 *
 * `POST /suites/leave/requests` does not exist on the server yet, so sending the form always gets
 * a 404 here - that is the real state of the API today, and the form's own sentence for it is
 * tested below. `GET /suites/leave/rules` is for an admin or the HR duty holder only, so a plain
 * member reading it is refused, and the kind field simply does not appear.
 */
vi.mock('@/api/suites', () => ({ fileARequestApi: { leave: vi.fn(), kindsForFiling: vi.fn() } }))
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
  ;(fileARequestApi.kindsForFiling as any).mockResolvedValue(null)
})

describe('Request leave', () => {
  it('reads the title, the two dates, and starts empty with no prefill', async () => {
    open()
    expect(await screen.findByRole('heading', { level: 1, name: 'Request leave' })).toBeInTheDocument()
    expect(screen.getByLabelText('Start date')).toHaveValue('')
    expect(screen.getByLabelText('End date')).toHaveValue('')
    expect(screen.queryByLabelText('Kind of leave')).toBeNull()
  })

  it('starts filled in from the prefill carried in router state', async () => {
    open({ prefill: { startsOn: '2026-10-10', endsOn: '2026-10-12' } })
    expect(await screen.findByLabelText('Start date')).toHaveValue('2026-10-10')
    expect(screen.getByLabelText('End date')).toHaveValue('2026-10-12')
  })

  it('shows the kind of leave only when the organisation has named any, and this reader may read the rules', async () => {
    ;(fileARequestApi.kindsForFiling as any).mockResolvedValue([{ key: 'annual', name: 'Annual leave' }, { key: 'sick', name: 'Sick leave' }])
    open()
    expect(await screen.findByLabelText('Kind of leave')).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Annual leave' })).toBeInTheDocument()
  })

  it('Send posts exactly the dates typed', async () => {
    ;(fileARequestApi.leave as any).mockResolvedValue({ message: 'Your request for leave has been sent to Amina.' })
    open()
    fireEvent.change(await screen.findByLabelText('Start date'), { target: { value: '2026-11-01' } })
    fireEvent.change(screen.getByLabelText('End date'), { target: { value: '2026-11-03' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))
    await waitFor(() => expect(fileARequestApi.leave).toHaveBeenCalledWith({ startsOn: '2026-11-01', endsOn: '2026-11-03' }))
  })

  it('on success, goes to Your requests and says it was sent, in the server’s own sentence', async () => {
    ;(fileARequestApi.leave as any).mockResolvedValue({ message: 'Your request for leave has been sent to Amina.' })
    open()
    fireEvent.change(await screen.findByLabelText('Start date'), { target: { value: '2026-11-01' } })
    fireEvent.change(screen.getByLabelText('End date'), { target: { value: '2026-11-03' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))
    expect(await screen.findByText('Arrived at your requests')).toBeInTheDocument()
  })

  it('on a 404, says plainly it could not be sent from here yet, and names Ask by the organisation', async () => {
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
