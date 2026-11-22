import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WhoCanJoin } from './WhoCanJoin'
import { apiClient } from '@/api/client'
import { useAuthStore } from '@/stores/auth'

/** "WHO CAN JOIN" (A4 people.txt), AS AN ADMIN READS IT ON THE PEOPLE PAGE. */
const THE_DEFAULTS = { guestsMayJoin: false, whoMayAddPeople: 'ADMINS', rolesYouMayGive: ['MEMBER', 'LEAD', 'ADMIN'] }
function open(answer: any, link: any = { on: false, code: null }, adding: any = THE_DEFAULTS) {
  vi.spyOn(apiClient, 'get').mockImplementation(async (url: string) => ({ data: { success: true, data: url.endsWith('/invite-link') ? link : url.endsWith('/adding-people') ? adding : answer } }) as any)
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={qc}><WhoCanJoin orgName="Baridi Appliances" /></QueryClientProvider>)
}
beforeEach(() => {
  vi.restoreAllMocks()
  useAuthStore.setState({ user: { id: 'u1', email: 'amina@baridi.co.ke', firstName: 'Amina', lastName: 'Otieno', role: 'ADMIN', organizationId: 'o1' } as any })
})

describe('who can join', () => {
  it('the prototype\'s switch, off, with the admin\'s own domain', async () => {
    open({ on: false, domain: 'baridi.co.ke', whyNot: null })
    expect(await screen.findByText('Anyone with an @baridi.co.ke email')).toBeTruthy()
    expect(screen.getByText('They can join Baridi Appliances without an invitation, as “Takes part”. You can change their role after.')).toBeTruthy()
    expect(screen.getByRole('switch', { name: 'Anyone with an @baridi.co.ke email' })).toHaveAttribute('aria-checked', 'false')
  })

  it('switching it on asks the server, and shows what it says', async () => {
    open({ on: false, domain: 'baridi.co.ke', whyNot: null })
    const patch = vi.spyOn(apiClient, 'patch').mockResolvedValue({ data: { success: true, data: { on: true, domain: 'baridi.co.ke', whyNot: null } } } as any)
    fireEvent.click(await screen.findByRole('switch', { name: 'Anyone with an @baridi.co.ke email' }))
    await waitFor(() => expect(patch).toHaveBeenCalledWith('/users/organization/joining', { on: true }))
    await waitFor(() => expect(screen.getByRole('switch', { name: 'Anyone with an @baridi.co.ke email' })).toHaveAttribute('aria-checked', 'true'))
  })

  it('a refusal is the server\'s own sentence', async () => {
    open({ on: false, domain: 'baridi.co.ke', whyNot: null })
    vi.spyOn(apiClient, 'patch').mockRejectedValue({ response: { data: { message: 'Another organisation on Groundwork already lets people with an @baridi.co.ke email join it, so this one cannot. Talk to us if it is your company\'s domain.' } } })
    fireEvent.click(await screen.findByRole('switch', { name: 'Anyone with an @baridi.co.ke email' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Another organisation on Groundwork already lets people with an @baridi.co.ke email join it')
  })

  it('an admin at a public mail service is told why there is no switch, and can name one', async () => {
    open({ on: false, domain: null, whyNot: 'Your organisation’s email address is at a public mail service, so there is no company domain for people to join by, until an admin names one.' })
    expect(await screen.findByText('Your organisation’s email address is at a public mail service, so there is no company domain for people to join by, until an admin names one.')).toBeTruthy()
    expect(screen.queryByRole('switch', { name: /Anyone with/ })).toBeNull()
    expect(screen.getByRole('button', { name: 'Name it' })).toBeTruthy()
  })

  it('"Change" only opens a way to choose the domain - it does not call the server by itself (screen fault 1)', async () => {
    open({ on: true, domain: 'baridi.co.ke', whyNot: null })
    const patch = vi.spyOn(apiClient, 'patch').mockResolvedValue({ data: { success: true, data: { on: true, domain: 'newco.com', whyNot: null } } } as any)
    /* The first "Change" is the domain's; "Who can add people" has its own below it (21 November 2026). */
    fireEvent.click((await screen.findAllByRole('button', { name: 'Change' }))[0])
    expect(await screen.findByRole('dialog')).toBeTruthy()
    expect(patch).not.toHaveBeenCalled()
  })

  it('already on: confirming "Change" names the one domain it will use, without saying this turns it on', async () => {
    open({ on: true, domain: 'baridi.co.ke', whyNot: null })
    const patch = vi.spyOn(apiClient, 'patch').mockResolvedValue({ data: { success: true, data: { on: true, domain: 'baridi.co.ke', whyNot: null } } } as any)
    /* The first "Change" is the domain's; "Who can add people" has its own below it (21 November 2026). */
    fireEvent.click((await screen.findAllByRole('button', { name: 'Change' }))[0])
    expect(await screen.findByText('People will join Baridi Appliances with an email address at baridi.co.ke, the same as yours. Use this domain?')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Change it' }))
    await waitFor(() => expect(patch).toHaveBeenCalledWith('/users/organization/joining/domain', {}))
    expect(await screen.findByText('Anyone with an @baridi.co.ke email')).toBeTruthy()
  })

  it('off: confirming "Change" warns this turns joining on, in the engine\'s own side effect (request 179)', async () => {
    open({ on: false, domain: 'baridi.co.ke', whyNot: null })
    const patch = vi.spyOn(apiClient, 'patch').mockResolvedValue({ data: { success: true, data: { on: true, domain: 'baridi.co.ke', whyNot: null } } } as any)
    /* The first "Change" is the domain's; "Who can add people" has its own below it (21 November 2026). */
    fireEvent.click((await screen.findAllByRole('button', { name: 'Change' }))[0])
    expect(await screen.findByText('Anyone with an email address at baridi.co.ke will be able to join Baridi Appliances. Turn this on?')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Turn this on' }))
    await waitFor(() => expect(patch).toHaveBeenCalledWith('/users/organization/joining/domain', {}))
  })

  it('"Cancel" closes the confirmation and calls nothing', async () => {
    open({ on: false, domain: 'baridi.co.ke', whyNot: null })
    const patch = vi.spyOn(apiClient, 'patch').mockResolvedValue({} as any)
    /* The first "Change" is the domain's; "Who can add people" has its own below it (21 November 2026). */
    fireEvent.click((await screen.findAllByRole('button', { name: 'Change' }))[0])
    fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(patch).not.toHaveBeenCalled()
  })

  it('naming a domain also asks first, since there is nothing yet to turn off', async () => {
    open({ on: false, domain: null, whyNot: 'Your organisation’s email address is at a public mail service, so there is no company domain for people to join by, until an admin names one.' })
    const patch = vi.spyOn(apiClient, 'patch').mockResolvedValue({ data: { success: true, data: { on: true, domain: 'baridi.co.ke', whyNot: null } } } as any)
    fireEvent.click(await screen.findByRole('button', { name: 'Name it' }))
    expect(await screen.findByText('Anyone with an email address at baridi.co.ke will be able to join Baridi Appliances. Turn this on?')).toBeTruthy()
    expect(patch).not.toHaveBeenCalled()
  })

  it('naming a domain is the server\'s own refusal, in a sentence', async () => {
    open({ on: false, domain: null, whyNot: 'Your organisation’s email address is at a public mail service, so there is no company domain for people to join by, until an admin names one.' })
    vi.spyOn(apiClient, 'patch').mockRejectedValue({ response: { data: { message: 'Your email address is at a public mail service, so it cannot be the domain people join by.' } } })
    fireEvent.click(await screen.findByRole('button', { name: 'Name it' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Turn this on' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Your email address is at a public mail service, so it cannot be the domain people join by.')
  })
})

describe('the organisation\'s invite link, under it', () => {
  it('when on: the link and "Copy"', async () => {
    open({ on: false, domain: 'baridi.co.ke', whyNot: null }, { on: true, code: 'baridi-appliances-7k2p' })
    expect(await screen.findByText('The invite link for Baridi Appliances')).toBeTruthy()
    expect(screen.getByText(`${window.location.host}/j/baridi-appliances-7k2p`)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Copy' })).toBeTruthy()
    expect(screen.getByText('Anyone with this link can join as “Takes part”. Turning it off closes it at once.')).toBeTruthy()
  })

  it('when off: says turning it on makes a new link', async () => {
    open({ on: false, domain: 'baridi.co.ke', whyNot: null }, { on: false, code: null })
    expect(await screen.findByText('The link is off. Turning it on makes a new link, so any old one stays closed.')).toBeTruthy()
    const patch = vi.spyOn(apiClient, 'patch').mockResolvedValue({ data: { success: true, data: { on: true, code: 'baridi-appliances-9x3m' } } } as any)
    fireEvent.click(screen.getByRole('switch', { name: 'The invite link for Baridi Appliances' }))
    await waitFor(() => expect(patch).toHaveBeenCalledWith('/users/organization/invite-link', { on: true }))
    expect(await screen.findByText(`${window.location.host}/j/baridi-appliances-9x3m`)).toBeTruthy()
  })
})

/*
 * GUESTS, AND WHO CAN ADD PEOPLE (Hafsah, 21 November 2026): two rows under the invite link, each its name, one sentence saying
 * how it is now, and its switch or a quiet "Change". Off by default; the server decides with them on every invitation.
 */
describe('guests, and who can add people', () => {
  it('reads as every organisation starts: guests cannot join, and only admins add people', async () => {
    open({ on: false, domain: 'baridi.co.ke', whyNot: null })
    expect(await screen.findByText('Guests cannot join. A lead can still add a guest to one check-in.')).toBeTruthy()
    expect(screen.getByRole('switch', { name: 'Guests can join' })).toHaveAttribute('aria-checked', 'false')
    expect(screen.getByText('Who can add people')).toBeTruthy()
    expect(screen.getByText('Only admins can invite people to Baridi Appliances.')).toBeTruthy()
  })

  it('turning guests on asks the server, and then says what a guest sees', async () => {
    open({ on: false, domain: 'baridi.co.ke', whyNot: null })
    const patch = vi.spyOn(apiClient, 'patch').mockResolvedValue({ data: { success: true, data: { ...THE_DEFAULTS, guestsMayJoin: true, rolesYouMayGive: ['MEMBER', 'LEAD', 'ADMIN', 'GUEST'] } } } as any)
    await screen.findByText('Guests cannot join. A lead can still add a guest to one check-in.')
    await waitFor(() => expect(screen.getByRole('switch', { name: 'Guests can join' })).not.toBeDisabled())
    fireEvent.click(screen.getByRole('switch', { name: 'Guests can join' }))
    await waitFor(() => expect(patch).toHaveBeenCalledWith('/users/organization/adding-people', { guestsMayJoin: true }))
    expect(await screen.findByText('Guests can join. They only see the check-ins they are added to.')).toBeTruthy()
  })

  it('"Change" beside who can add people offers the two, and choosing one asks the server', async () => {
    open({ on: false, domain: 'baridi.co.ke', whyNot: null })
    const patch = vi.spyOn(apiClient, 'patch').mockResolvedValue({ data: { success: true, data: { ...THE_DEFAULTS, whoMayAddPeople: 'ANYONE' } } } as any)
    await screen.findByText('Only admins can invite people to Baridi Appliances.')
    const changes = screen.getAllByRole('button', { name: 'Change' })
    fireEvent.click(changes[changes.length - 1])
    fireEvent.click(await screen.findByRole('radio', { name: /Anyone here/ }))
    await waitFor(() => expect(patch).toHaveBeenCalledWith('/users/organization/adding-people', { whoMayAddPeople: 'ANYONE' }))
    expect(await screen.findByText('Anyone at Baridi Appliances can invite people, as “Takes part”. Only an admin can give someone another role.')).toBeTruthy()
  })

  it('the invite link offers "Guest" only once guests can join', async () => {
    open({ on: false, domain: null, whyNot: 'No domain is set yet.' }, { on: true, code: 'baridi-7k2p', role: 'MEMBER', guestsMayJoin: false })
    expect(await screen.findByText('Anyone with this link can join as “Takes part”. Turning it off closes it at once.')).toBeTruthy()
    /* The one "Change" is the one beside who can add people; the link has none. */
    expect(screen.getAllByRole('button', { name: 'Change' })).toHaveLength(1)
    expect(screen.queryByRole('radio', { name: /Guest/ })).toBeNull()
  })

  it('with guests on, the link\'s "Change" sets it to give "Guest", and it says so', async () => {
    open({ on: false, domain: null, whyNot: 'No domain is set yet.' }, { on: true, code: 'baridi-7k2p', role: 'MEMBER', guestsMayJoin: true }, { ...THE_DEFAULTS, guestsMayJoin: true })
    const patch = vi.spyOn(apiClient, 'patch').mockResolvedValue({ data: { success: true, data: { on: true, code: 'baridi-7k2p', role: 'GUEST', guestsMayJoin: true } } } as any)
    await screen.findByText('Anyone with this link can join as “Takes part”. Turning it off closes it at once.', { exact: false })
    fireEvent.click(screen.getAllByRole('button', { name: 'Change' })[0])
    fireEvent.click(await screen.findByRole('radio', { name: /Guest/ }))
    await waitFor(() => expect(patch).toHaveBeenCalledWith('/users/organization/invite-link', { role: 'GUEST' }))
    expect(await screen.findByText('Anyone with this link can join as a guest. They only see the check-ins they are added to. Turning it off closes it at once.', { exact: false })).toBeTruthy()
  })
})
