import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WhoCanJoin } from './WhoCanJoin'
import { apiClient } from '@/api/client'

/** "WHO CAN JOIN" (A4 people.txt), AS AN ADMIN READS IT ON THE PEOPLE PAGE. */
function open(answer: any, link: any = { on: false, code: null }) {
  vi.spyOn(apiClient, 'get').mockImplementation(async (url: string) => ({ data: { success: true, data: url.endsWith('/invite-link') ? link : answer } }) as any)
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={qc}><WhoCanJoin orgName="Baridi Appliances" /></QueryClientProvider>)
}
beforeEach(() => { vi.restoreAllMocks() })

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

  it('an admin at a public mail service is told why there is no switch', async () => {
    open({ on: false, domain: null, whyNot: 'Your email address is at a public mail service, so there is no company domain for people to join by.' })
    expect(await screen.findByText('Your email address is at a public mail service, so there is no company domain for people to join by.')).toBeTruthy()
    expect(screen.queryByRole('switch', { name: /Anyone with/ })).toBeNull()
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
