import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'

/**
 * AN ADMIN INVITING PEOPLE IS ASKED FOR EACH PERSON'S PHONE NUMBER ON THEIR LINE (Hafsah, 30 October 2026: "phone numbers are always
 * shown and editable, whether WhatsApp is on or off"; this replaces decision 106 item 6). The first version had one "Phone number"
 * field that saved only when one person was invited; round 1 of the first experience showed three of four leads adding each number
 * one by one afterwards. Now the number goes on each person's line, as A4 people.txt:224 draws it, and the server saves it to them
 * once their invitation has gone (api putting-a-whole-company-on.ts numbersIn, a-phone-number-comes-with-the-pasted-line.spec.ts).
 */
let whatsappOn = false
vi.mock('@/lib/whatsapp-is-on', () => ({ useWhatsAppIsOn: () => whatsappOn }))
/* The form also reads whether a new seat needs a yes first (Hafsah, 21 November 2026); none here. */
vi.mock('@/components/gw/this-adds-a-seat', () => ({ ThisAddsASeat: () => null, useTheNextSeat: () => ({ data: undefined }) }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }))
vi.mock('@/api/client', () => ({ apiClient: { post: vi.fn(), get: vi.fn(), patch: vi.fn() } }))

import { apiClient } from '@/api/client'
import { InvitePeople } from './InvitePeople'

const wrap = () => render(<QueryClientProvider client={new QueryClient()}><MemoryRouter><InvitePeople /></MemoryRouter></QueryClientProvider>)
const LINE = 'Faith Kerubo, faith@kito.test, +254 712 345 678'

describe('Invite people, with WhatsApp off and on', () => {
  beforeEach(() => {
    vi.mocked(apiClient.post).mockImplementation(async (_u: string, b: any) => ({ data: { preview: b.preview, seatsLeft: 4, rows: [{ email: 'faith@kito.test', name: 'Faith Kerubo', phone: '+254 712 345 678', result: 'invited' }], summary: b.preview ? '1 will be invited.' : '1 invited.' } }) as any)
  })

  for (const on of [false, true]) {
    it(`asks for each person's phone number on their line, with WhatsApp ${on ? 'on' : 'off'}, and says nothing about WhatsApp`, () => {
      whatsappOn = on
      wrap()
      const box = screen.getByRole('textbox', { name: /Write one person on each line, with their name, their email and their phone number/ })
      expect((box as HTMLTextAreaElement).placeholder).toMatch(/faith@yourcompany\.com, \+254 712 345 678/)
      expect(screen.queryByLabelText('Phone number')).toBeNull()
      expect(document.body.textContent).not.toMatch(/WhatsApp/)
    })
  }

  it('sends the lines as typed, numbers and all, so the server saves each number with its person', async () => {
    wrap()
    fireEvent.change(screen.getByRole('textbox', { name: /Write one person on each line/ }), { target: { value: LINE } })
    fireEvent.click(screen.getByRole('button', { name: 'Send their invitations' }))
    await waitFor(() => expect(apiClient.post).toHaveBeenCalledWith('/users/invitations', { pasted: LINE, preview: false, role: 'MEMBER' }))
    expect(apiClient.patch).not.toHaveBeenCalled()
  })
})
