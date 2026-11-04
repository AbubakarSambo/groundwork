import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'

/**
 * AN ADMIN INVITING PEOPLE IS ASKED FOR A PHONE NUMBER (Hafsah, 30 October 2026: "phone numbers are always shown and editable,
 * whether WhatsApp is on or off ... Label it plainly 'Phone number'. Only wording that mentions WhatsApp itself stays hidden while
 * WhatsApp is off"). This replaces decision 106 item 6. The number is saved to the one person invited, through PATCH /users/:id.
 */
let whatsappOn = false
vi.mock('@/lib/whatsapp-is-on', () => ({ useWhatsAppIsOn: () => whatsappOn }))
vi.mock('@/components/gw/this-adds-a-seat', () => ({ ThisAddsASeat: () => null }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }))
vi.mock('@/api/client', () => ({ apiClient: { post: vi.fn(), get: vi.fn(), patch: vi.fn() } }))

import { apiClient } from '@/api/client'
import { toast } from 'sonner'
import { InvitePeople } from './InvitePeople'

const wrap = () => render(<QueryClientProvider client={new QueryClient()}><MemoryRouter><InvitePeople /></MemoryRouter></QueryClientProvider>)
const FAITH = { email: 'faith@kito.test', name: 'Faith Kerubo', result: 'invited' }

describe('Invite people, with WhatsApp off and on', () => {
  beforeEach(() => {
    vi.mocked(apiClient.post).mockImplementation(async (_u: string, b: any) => ({ data: { preview: b.preview, seatsLeft: 4, rows: [FAITH], summary: b.preview ? '1 will be invited.' : '1 invited.' } }) as any)
    vi.mocked(apiClient.get).mockResolvedValue({ data: { data: [{ id: 'u-faith', email: 'faith@kito.test', isActive: true }], meta: { total: 1 } } } as any)
    vi.mocked(apiClient.patch).mockReset()
  })

  it('shows "Phone number" with WhatsApp off, and says nothing about WhatsApp', () => {
    whatsappOn = false
    wrap()
    expect(screen.getByLabelText('Phone number')).toBeTruthy()
    expect((screen.getByLabelText('Phone number') as HTMLInputElement).placeholder).toBe('+254 712 345 678')
    expect(document.body.textContent).not.toMatch(/WhatsApp/)
  })

  it('shows the same field with WhatsApp on, with its sentence about WhatsApp', () => {
    whatsappOn = true
    wrap()
    expect(screen.getByLabelText('Phone number')).toBeTruthy()
    expect(screen.getByText('Optional. With it, their check-ins can also reach them on WhatsApp.')).toBeTruthy()
  })

  it('saves a typed number to the one person invited, through PATCH /users/:id', async () => {
    whatsappOn = false
    wrap()
    fireEvent.change(screen.getByRole('textbox', { name: /Write one person on each line/ }), { target: { value: 'Faith Kerubo, faith@kito.test' } })
    fireEvent.change(screen.getByLabelText('Phone number'), { target: { value: '+254 712 345 678' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send their invitations' }))
    await waitFor(() => expect(apiClient.patch).toHaveBeenCalledWith('/users/u-faith', { phoneNumber: '+254 712 345 678' }))
  })

  it('a number that does not save says so, and the invitation stands', async () => {
    whatsappOn = false
    vi.mocked(apiClient.patch).mockRejectedValue({})
    wrap()
    fireEvent.change(screen.getByRole('textbox', { name: /Write one person on each line/ }), { target: { value: 'Faith Kerubo, faith@kito.test' } })
    fireEvent.change(screen.getByLabelText('Phone number'), { target: { value: '+254 712 345 678' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send their invitations' }))
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Faith Kerubo’s phone number did not save. Their invitation went out. Add the number on People.'))
    expect(toast.success).toHaveBeenCalledWith('1 invited.')
  })
})
