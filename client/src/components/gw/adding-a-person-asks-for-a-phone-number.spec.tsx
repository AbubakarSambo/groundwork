import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

/**
 * A LEAD ADDING PEOPLE TO A CHECK-IN GIVES THEIR PHONE NUMBERS WITH THEM (Hafsah, 30 October 2026; this replaces decision 106 item 6).
 * Rewritten 31 October 2026 (Hafsah: "Make adding a team the top pattern ... without repeating themselves"): the one-at-a-time form is
 * now the one team box, one person per line, so these check the same things of it. The add itself carries no number; once each person
 * is on the check-in, their number goes through PATCH /grounds/:id/participants/:participantId/whatsapp-number, the one writer for a
 * lead's number. WhatsApp is named only while it is on.
 */
let whatsappOn = false
vi.mock('@/lib/whatsapp-is-on', () => ({ useWhatsAppIsOn: () => whatsappOn }))
vi.mock('@/components/gw/this-adds-a-seat', () => ({ ThisAddsASeat: () => null, useTheNextSeat: () => null }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }))
vi.mock('@/api/grounds', () => ({ groundsApi: {
  addTheirWhatsAppNumber: vi.fn(async () => ({ said: 'kept' })),
  addParticipant: vi.fn(async (_g: string, body: any) => ({ id: 'p-amani', email: body.email })),
} }))
/* The server's one reader of a line (POST /entry/people-on-lines), as it reads Amani's line. */
vi.mock('@/api/entry', () => ({ entryApi: { peopleOnLines: vi.fn(async () => [{ name: 'Amani Otieno', email: 'amani@kito.test', phone: '+254 712 345 678' }]) } }))

import { groundsApi } from '@/api/grounds'
import { toast } from 'sonner'
import { AddPeopleForm } from './WhosInItRoster'

const at = (node: React.ReactNode) => (
  <QueryClientProvider client={new QueryClient()}>
    <MemoryRouter initialEntries={['/grounds/g1']}><Routes><Route path="/grounds/:id" element={node} /></Routes></MemoryRouter>
  </QueryClientProvider>
)
const Form = () => <AddPeopleForm isOrgAdmin colleagues={[]} participants={[]} seats={{ cap: 10 }} seatsFull={false} addManyParticipants={() => undefined} />

describe('Add people to this check-in, with WhatsApp off and on', () => {
  beforeEach(() => { vi.mocked(groundsApi.addTheirWhatsAppNumber).mockClear(); vi.mocked(groundsApi.addParticipant).mockClear(); vi.mocked(toast.error).mockClear() })

  it('asks for a phone number on each line, and says nothing about WhatsApp while it is off', () => {
    whatsappOn = false
    render(at(<Form />))
    expect(screen.getByText(/One per line: a name, an email and a phone number\./)).toBeTruthy()
    expect(screen.queryByText(/WhatsApp/)).toBeNull()
  })

  it('says what a phone number does with WhatsApp on', () => {
    whatsappOn = true
    render(at(<Form />))
    expect(screen.getByText(/With a phone number, their check-ins can also reach them on WhatsApp\./)).toBeTruthy()
  })

  it('adds the person with their name, then saves their number through the number endpoint, in one press', async () => {
    whatsappOn = false
    render(at(<Form />))
    fireEvent.change(screen.getByLabelText('Your team, one per line'), { target: { value: 'Amani Otieno, amani@kito.test, +254 712 345 678' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add' }) /* setup.txt's one "Add" (22 November 2026) */)
    await waitFor(() => expect(groundsApi.addTheirWhatsAppNumber).toHaveBeenCalledWith('g1', 'p-amani', '+254 712 345 678'))
    expect(groundsApi.addParticipant).toHaveBeenCalledWith('g1', { email: 'amani@kito.test', displayName: 'Amani Otieno' })
  })

  it('a number that does not save says so, without WhatsApp while it is off, and the add stands', async () => {
    whatsappOn = false
    vi.mocked(groundsApi.addTheirWhatsAppNumber).mockRejectedValueOnce({ response: { data: { message: 'The WhatsApp number could not be saved.' } } })
    render(at(<Form />))
    fireEvent.change(screen.getByLabelText('Your team, one per line'), { target: { value: 'Amani Otieno, amani@kito.test, 0712' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add' }) /* setup.txt's one "Add" (22 November 2026) */)
    await waitFor(() => expect(toast.error).toHaveBeenCalled())
    expect(String(vi.mocked(toast.error).mock.calls[0][0])).toMatch(/phone number did not save, but .* is on the check-in/)
    expect(String(vi.mocked(toast.error).mock.calls[0][0])).not.toMatch(/WhatsApp/)
  })
})
