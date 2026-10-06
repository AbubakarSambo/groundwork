import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import { InvitePeople } from './InvitePeople'
import { WhoCanOpenACheckIn } from './WhoCanOpenACheckIn'

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }))
const wrap = (ui: any) => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{ui}</QueryClientProvider>)
beforeEach(() => { vi.restoreAllMocks() })

describe('invite people (A4 people.txt)', () => {
  it('a clean list goes in one press, with the role chosen', async () => {
    const post = vi.spyOn(apiClient, 'post').mockImplementation(async (_u: string, body: any) => ({
      data: { preview: body.preview, seatsLeft: 70, rows: [{ email: 'faith@baridi.co.ke', result: 'invited' }], summary: body.preview ? '1 person will be invited.' : '1 person was invited.' },
    }) as any)
    wrap(<InvitePeople />)
    fireEvent.change(screen.getByLabelText('One per line: a name and an email. Or paste a list from a spreadsheet.'), { target: { value: 'Faith Kerubo, faith@baridi.co.ke' } })
    fireEvent.change(screen.getByLabelText('Role'), { target: { value: 'ADMIN' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send their invitations' }))
    await waitFor(() => expect(post).toHaveBeenCalledWith('/users/invitations', { pasted: 'Faith Kerubo, faith@baridi.co.ke', preview: false, role: 'ADMIN' }))
    expect(post).toHaveBeenCalledWith('/users/invitations', { pasted: 'Faith Kerubo, faith@baridi.co.ke', preview: true, role: 'ADMIN' })
    expect(await screen.findByText('Invited')).toBeTruthy()
    /* The server's sentence, in the panel and in the toast. */
    expect(screen.getByText('1 person was invited.')).toBeTruthy()
    const { toast } = await import('sonner')
    expect(toast.success).toHaveBeenCalledWith('1 person was invited.')
  })

  it('a list with a problem shows what would happen to each line, and sends only the ones that can go, after that is read', async () => {
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({
      data: { preview: true, seatsLeft: 1, rows: [{ email: 'oops', result: 'not an email' }, { email: 'b@x.com', result: 'invited' }, { email: 'c@x.com', result: 'no seat' }], summary: '1 person will be invited. 1 line is not an email address. 1 person has no seat on your plan.' },
    } as any)
    wrap(<InvitePeople />)
    fireEvent.change(screen.getByLabelText('One per line: a name and an email. Or paste a list from a spreadsheet.'), { target: { value: 'oops, b@x.com, c@x.com' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send their invitations' }))
    expect(await screen.findByText('Not an email address')).toBeTruthy()
    expect(screen.getByText('Will be invited')).toBeTruthy()
    expect(screen.getByText('No seat on your plan')).toBeTruthy()
    expect(screen.getByText('Your plan has room for 1 more person.')).toBeTruthy()
    expect(screen.getByText('1 person will be invited. 1 line is not an email address. 1 person has no seat on your plan.')).toBeTruthy()
    expect(post).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: 'Send 1 invitation' })).toBeTruthy()
  })

  it('offers the three roles an invitation can give, and never a guest', () => {
    wrap(<InvitePeople />)
    const options = Array.from((screen.getByLabelText('Role') as HTMLSelectElement).options).map((o) => o.textContent)
    expect(options).toEqual(['Takes part', 'Can open check-ins', 'Admin'])
  })
})

describe('who can open a check-in (A4 people.txt, moved from Settings)', () => {
  it('shows the stricter of each before the server answers, then what the server says', async () => {
    let answer: any = null
    vi.spyOn(apiClient, 'get').mockImplementation(() => new Promise((r) => { answer = r }) as any)
    wrap(<WhoCanOpenACheckIn orgName="Baridi Appliances" />)
    expect(screen.getByRole('switch', { name: 'Check-ins wait for an admin' })).toHaveAttribute('aria-checked', 'true')
    answer({ data: { whoMayOpen: 'EVERYONE', needsApproval: false } })
    await waitFor(() => expect(screen.getByRole('switch', { name: 'Check-ins wait for an admin' })).toHaveAttribute('aria-checked', 'false'))
    expect(screen.getAllByText('Anyone at Baridi Appliances can start a check-in.').length).toBe(2)
    expect(screen.getByRole('radio', { name: /Anybody signed in here/ })).toHaveAttribute('aria-checked', 'true')
  })

  it('each control writes its own setting, to the one endpoint', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue({ data: { whoMayOpen: 'NAMED_LEADS', needsApproval: false } } as any)
    const patch = vi.spyOn(apiClient, 'patch').mockResolvedValue({ data: {} } as any)
    wrap(<WhoCanOpenACheckIn orgName="Baridi Appliances" />)
    await screen.findByText('Start straight away. Turn this on to review each one before invitations go out.')
    fireEvent.click(screen.getByRole('switch', { name: 'Check-ins wait for an admin' }))
    await waitFor(() => expect(patch).toHaveBeenCalledWith('/users/organization/check-ins', { needsApproval: true }))
    fireEvent.click(screen.getByRole('radio', { name: /Anybody signed in here/ }))
    await waitFor(() => expect(patch).toHaveBeenCalledWith('/users/organization/check-ins', { whoMayOpen: 'EVERYONE' }))
  })
})
