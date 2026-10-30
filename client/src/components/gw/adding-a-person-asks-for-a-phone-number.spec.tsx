import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

/**
 * A LEAD ADDING SOMEBODY TO A CHECK-IN IS ASKED FOR A PHONE NUMBER (Hafsah, 30 October 2026; this replaces decision 106 item 6).
 * The add itself carries no number (api a-lead-cannot-add-a-number-when-inviting.spec.ts); once the person is on the check-in, the
 * number goes through PATCH /grounds/:id/participants/:participantId/whatsapp-number, the one writer for a lead's number.
 */
let whatsappOn = false
vi.mock('@/lib/whatsapp-is-on', () => ({ useWhatsAppIsOn: () => whatsappOn }))
vi.mock('@/components/gw/this-adds-a-seat', () => ({ ThisAddsASeat: () => null, useTheNextSeat: () => null }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }))
vi.mock('@/api/grounds', () => ({ groundsApi: { addTheirWhatsAppNumber: vi.fn(async () => ({ said: 'kept' })) } }))

import { groundsApi } from '@/api/grounds'
import { toast } from 'sonner'
import { AddPeopleForm } from './WhosInItRoster'

function Form({ participants, add = vi.fn() }: { participants: any[]; add?: () => void }) {
  return (
    <AddPeopleForm
      isOrgAdmin colleagues={[]} participants={participants} seats={{ cap: 10 }} seatsFull={false} addingMany={false} addManyParticipants={() => undefined}
      newParticipantEmail="amani@kito.test" setNewParticipantEmail={() => undefined} newParticipantNote="" setNewParticipantNote={() => undefined}
      newParticipantDepartment="" setNewParticipantDepartment={() => undefined} addParticipantMut={{ mutate: add, isPending: false }}
      queuedToAdd={[]} setQueuedToAdd={() => undefined} inviteTheQueue={{ mutate: () => undefined, isPending: false }}
      lastInvitedEmail={null} whyItWaits={null} lastInviteWaits={false} onShareCode={() => undefined}
    />
  )
}
const at = (node: React.ReactNode) => (
  <QueryClientProvider client={new QueryClient()}>
    <MemoryRouter initialEntries={['/grounds/g1']}><Routes><Route path="/grounds/:id" element={node} /></Routes></MemoryRouter>
  </QueryClientProvider>
)

describe('Add a person to this check-in, with WhatsApp off and on', () => {
  beforeEach(() => { vi.mocked(groundsApi.addTheirWhatsAppNumber).mockClear(); vi.mocked(toast.error).mockClear() })

  it('shows "Phone number" with WhatsApp off, and says nothing about WhatsApp', () => {
    whatsappOn = false
    render(at(<Form participants={[]} />))
    expect(screen.getByLabelText('Phone number')).toBeTruthy()
    expect(screen.getByText('Optional.')).toBeTruthy()
    expect(screen.queryByText(/WhatsApp/)).toBeNull()
  })

  it('shows the same field with WhatsApp on, with its sentence about WhatsApp', () => {
    whatsappOn = true
    render(at(<Form participants={[]} />))
    expect(screen.getByLabelText('Phone number')).toBeTruthy()
    expect(screen.getByText('Optional. With it, their check-ins can also reach them on WhatsApp.')).toBeTruthy()
  })

  it('saves the typed number to the person once they are on the check-in, through the number endpoint', async () => {
    whatsappOn = false
    const add = vi.fn()
    const r = render(at(<Form participants={[]} add={add} />))
    fireEvent.change(screen.getByLabelText('Phone number'), { target: { value: '+254 712 345 678' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send invite' }))
    expect(add).toHaveBeenCalled()
    expect(groundsApi.addTheirWhatsAppNumber).not.toHaveBeenCalled()
    /* The add succeeds and the check-in is read again: Amani is on it. */
    r.rerender(at(<Form participants={[{ id: 'p-amani', email: 'amani@kito.test', displayName: 'Amani Otieno' }]} add={add} />))
    await waitFor(() => expect(groundsApi.addTheirWhatsAppNumber).toHaveBeenCalledWith('g1', 'p-amani', '+254 712 345 678'))
  })

  it('a number that does not save says so, without WhatsApp while it is off, and the add stands', async () => {
    whatsappOn = false
    vi.mocked(groundsApi.addTheirWhatsAppNumber).mockRejectedValueOnce({ response: { data: { message: 'The WhatsApp number could not be saved.' } } })
    const r = render(at(<Form participants={[]} />))
    fireEvent.change(screen.getByLabelText('Phone number'), { target: { value: '0712' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send invite' }))
    r.rerender(at(<Form participants={[{ id: 'p-amani', email: 'amani@kito.test', displayName: 'Amani' }]} />))
    await waitFor(() => expect(toast.error).toHaveBeenCalled())
    expect(String(vi.mocked(toast.error).mock.calls[0][0])).toMatch(/phone number did not save, but .* is on the check-in/)
    expect(String(vi.mocked(toast.error).mock.calls[0][0])).not.toMatch(/WhatsApp/)
  })
})
