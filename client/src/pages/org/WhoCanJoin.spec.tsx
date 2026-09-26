import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WhoCanJoin } from './WhoCanJoin'
import { apiClient } from '@/api/client'

/** "WHO CAN JOIN" (A4 people.txt), AS AN ADMIN READS IT ON THE PEOPLE PAGE. */
function open(answer: any) {
  vi.spyOn(apiClient, 'get').mockResolvedValue({ data: { success: true, data: answer } } as any)
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
    fireEvent.click(await screen.findByRole('switch'))
    await waitFor(() => expect(patch).toHaveBeenCalledWith('/users/organization/joining', { on: true }))
    await waitFor(() => expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true'))
  })

  it('a refusal is the server\'s own sentence', async () => {
    open({ on: false, domain: 'baridi.co.ke', whyNot: null })
    vi.spyOn(apiClient, 'patch').mockRejectedValue({ response: { data: { message: 'Another organisation on Groundwork already lets people with an @baridi.co.ke email join it, so this one cannot. Talk to us if it is your company\'s domain.' } } })
    fireEvent.click(await screen.findByRole('switch'))
    expect(await screen.findByRole('alert')).toHaveTextContent('Another organisation on Groundwork already lets people with an @baridi.co.ke email join it')
  })

  it('an admin at a public mail service is told why there is no switch', async () => {
    open({ on: false, domain: null, whyNot: 'Your email address is at a public mail service, so there is no company domain for people to join by.' })
    expect(await screen.findByText('Your email address is at a public mail service, so there is no company domain for people to join by.')).toBeTruthy()
    expect(screen.queryByRole('switch')).toBeNull()
  })
})
