import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import { InvitePeople } from './InvitePeople'
import { WhoCanOpenACheckIn } from './WhoCanOpenACheckIn'

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }))
const wrap = (ui: any) => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{ui}</QueryClientProvider>)
/* The roles offered are the server's own answer (Hafsah, 21 November 2026): an admin under the defaults, unless a test says otherwise. */
const ADMIN_UNDER_THE_DEFAULTS = { guestsMayJoin: false, whoMayAddPeople: 'ADMINS', rolesYouMayGive: ['MEMBER', 'LEAD', 'ADMIN'] }
function theServerSays(adding: any) {
  vi.spyOn(apiClient, 'get').mockImplementation(async (url: string) => ({ data: url === '/users/organization/adding-people' ? adding : {} }) as any)
}
beforeEach(() => { vi.restoreAllMocks(); theServerSays(ADMIN_UNDER_THE_DEFAULTS) })

describe('invite people (A4 people.txt)', () => {
  it('a clean list goes in one press, with the role chosen', async () => {
    const post = vi.spyOn(apiClient, 'post').mockImplementation(async (_u: string, body: any) => ({
      data: { preview: body.preview, seatsLeft: 70, rows: [{ email: 'faith@baridi.co.ke', result: 'invited' }], summary: body.preview ? '1 person will be invited.' : '1 person was invited.' },
    }) as any)
    wrap(<InvitePeople />)
    fireEvent.change(screen.getByLabelText('Write one person on each line, with their name, their email and their phone number. Or paste a list from a spreadsheet.'), { target: { value: 'Faith Kerubo, faith@baridi.co.ke' } })
    fireEvent.change(await screen.findByLabelText('Role'), { target: { value: 'ADMIN' } })
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
    fireEvent.change(screen.getByLabelText('Write one person on each line, with their name, their email and their phone number. Or paste a list from a spreadsheet.'), { target: { value: 'oops, b@x.com, c@x.com' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send their invitations' }))
    expect(await screen.findByText('Not an email address')).toBeTruthy()
    expect(screen.getByText('Will be invited')).toBeTruthy()
    expect(screen.getByText('No seat on your plan')).toBeTruthy()
    expect(screen.getByText('Your plan has room for 1 more person.')).toBeTruthy()
    expect(screen.getByText('1 person will be invited. 1 line is not an email address. 1 person has no seat on your plan.')).toBeTruthy()
    expect(post).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: 'Send 1 invitation' })).toBeTruthy()
  })

  /* SCREEN FAULT 5a: "Your plan has room for 0 more people." read as if nobody was allowed to be
     invited, when really nobody at all fits any more. */
  it('with no seats left, says so plainly instead of "0 more people" (screen fault 5a)', async () => {
    vi.spyOn(apiClient, 'post').mockResolvedValue({
      data: { preview: true, seatsLeft: 0, rows: [{ email: 'c@x.com', result: 'no seat' }], summary: '1 person has no seat on your plan.' },
    } as any)
    wrap(<InvitePeople />)
    fireEvent.change(screen.getByLabelText('Write one person on each line, with their name, their email and their phone number. Or paste a list from a spreadsheet.'), { target: { value: 'c@x.com' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send their invitations' }))
    expect(await screen.findByText('Your plan has no room for anyone else.')).toBeTruthy()
    expect(screen.queryByText(/0 more people/)).toBeNull()
  })

  /*
   * RESTORED (8 October, night note item 4, B-128). Each row of the preview now carries the name
   * read beside the address, when one was typed - this used to show only the address, with the
   * name read nowhere even though the invitation itself begins "Hi Дмитрий,".
   */
  it('shows the name read beside each address, when one was typed', async () => {
    vi.spyOn(apiClient, 'post').mockResolvedValue({
      data: {
        preview: true, seatsLeft: 70,
        rows: [
          { email: 'p01@fieldnote.test', name: 'Дмитрий Иванов', result: 'invited' },
          { email: 'ada@x.com', name: 'Ada Obi', result: 'invited' },
          { email: 'no-name@x.com', result: 'invited' },
        ],
        summary: '3 people will be invited.',
      },
    } as any)
    wrap(<InvitePeople />)
    fireEvent.change(
      screen.getByLabelText('Write one person on each line, with their name, their email and their phone number. Or paste a list from a spreadsheet.'),
      { target: { value: 'Дмитрий Иванов <p01@fieldnote.test>\nAda Obi, ada@x.com\nno-name@x.com' } },
    )
    fireEvent.click(screen.getByRole('button', { name: 'Send their invitations' }))
    expect(await screen.findByText('Дмитрий Иванов, p01@fieldnote.test')).toBeTruthy()
    expect(screen.getByText('Ada Obi, ada@x.com')).toBeTruthy()
    expect(screen.getByText('no-name@x.com')).toBeTruthy()
    expect(screen.queryByText(/^no-name@x\.com,/)).toBeNull()
  })

  /*
   * CHANGED WITH THE NEW SETTING (Hafsah, 21 November 2026). This said an organisation invitation never offers a guest. It still
   * never does while "Guests can join" is off, which is every organisation's default; once an admin turns it on, it does.
   */
  it('offers the three roles an invitation can give, and never a guest while guests cannot join', async () => {
    wrap(<InvitePeople />)
    const options = Array.from(((await screen.findByLabelText('Role')) as HTMLSelectElement).options).map((o) => o.textContent)
    expect(options).toEqual(['Takes part', 'Can open check-ins', 'Admin'])
  })

  it('offers "Guest" once guests can join, and says what a guest sees when it is chosen', async () => {
    theServerSays({ guestsMayJoin: true, whoMayAddPeople: 'ADMINS', rolesYouMayGive: ['MEMBER', 'LEAD', 'ADMIN', 'GUEST'] })
    const post = vi.spyOn(apiClient, 'post').mockImplementation(async (_u: string, body: any) => ({
      data: { preview: body.preview, seatsLeft: 70, rows: [{ email: 'kofi@ouma.co.ke', result: 'invited' }], summary: '1 person was invited.' },
    }) as any)
    wrap(<InvitePeople />)
    const select = await screen.findByLabelText('Role') as HTMLSelectElement
    await waitFor(() => expect(Array.from(select.options).map((o) => o.textContent)).toEqual(['Takes part', 'Can open check-ins', 'Admin', 'Guest']))
    fireEvent.change(select, { target: { value: 'GUEST' } })
    expect(screen.getByText('Guests only see the check-ins they are added to.')).toBeTruthy()
    fireEvent.change(screen.getByLabelText('Write one person on each line, with their name, their email and their phone number. Or paste a list from a spreadsheet.'), { target: { value: 'kofi@ouma.co.ke' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send their invitations' }))
    await waitFor(() => expect(post).toHaveBeenCalledWith('/users/invitations', { pasted: 'kofi@ouma.co.ke', preview: false, role: 'GUEST' }))
  })

  it('a member the organisation lets add people reads no choice of role, only that they join as "Takes part"', async () => {
    theServerSays({ guestsMayJoin: true, whoMayAddPeople: 'ANYONE', rolesYouMayGive: ['MEMBER'] })
    const post = vi.spyOn(apiClient, 'post').mockImplementation(async (_u: string, body: any) => ({
      data: { preview: body.preview, seatsLeft: 70, rows: [{ email: 'faith@baridi.co.ke', result: 'invited' }], summary: '1 person was invited.' },
    }) as any)
    wrap(<InvitePeople />)
    expect(await screen.findByText('They will join as “Takes part”.')).toBeTruthy()
    expect(screen.queryByLabelText('Role')).toBeNull()
    expect(screen.queryByText('Admin')).toBeNull()
    fireEvent.change(screen.getByLabelText('Write one person on each line, with their name, their email and their phone number. Or paste a list from a spreadsheet.'), { target: { value: 'faith@baridi.co.ke' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send their invitations' }))
    await waitFor(() => expect(post).toHaveBeenCalledWith('/users/invitations', { pasted: 'faith@baridi.co.ke', preview: false, role: 'MEMBER' }))
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
