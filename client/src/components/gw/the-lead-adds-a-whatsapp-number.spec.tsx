import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TheirWhatsAppNumber } from './WhosInItRoster'
import { groundsApi } from '@/api/grounds'

vi.mock('@/api/grounds', () => ({ groundsApi: { addTheirWhatsAppNumber: vi.fn(), whereEachPersonIsOnWhatsApp: vi.fn() } }))

/**
 * D1 AND D2 (Hafsah, 13 October 2026, evening): "add your phone number, or your lead can." Changed 14 October (pilots on
 * WhatsApp): the control lists each person's number and where they are on WhatsApp, read from the record, and the lead can
 * add, change or remove a number. It used to be one "Add somebody's WhatsApp number" form that could only add.
 */
const PEOPLE = [{ id: 'p-brian', name: 'Brian Kiptoo' }, { id: 'p-aisha', name: 'Aisha Hassan' }]
const draw = () => {
  cleanup()
  const r = render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <TheirWhatsAppNumber groundId="g-lit" people={PEOPLE} />
    </QueryClientProvider>,
  )
  fireEvent.click(within(r.container).getByRole('button', { name: 'WhatsApp numbers' }))
  return r
}

describe('the lead sees and sets each person’s WhatsApp number', () => {
  beforeEach(() => {
    ;(groundsApi.whereEachPersonIsOnWhatsApp as any).mockResolvedValue([
      { participantId: 'p-brian', phone: '+254722000202', whatsapp: 'waiting', says: 'They have not written on WhatsApp yet.' },
      { participantId: 'p-aisha', phone: null, whatsapp: 'no-number', says: 'No WhatsApp number yet.' },
    ])
  })

  it('reads each person’s number and where they are, in full sentences', async () => {
    draw()
    await waitFor(() => expect(screen.getByText(/Brian Kiptoo's WhatsApp number is \+254722000202\. They have not written on WhatsApp yet\./)).toBeTruthy())
    expect(screen.getByText(/Aisha Hassan has no WhatsApp number yet\./)).toBeTruthy()
  })

  it('Njeri adds Aisha’s number typed the local way, and reads it was kept', async () => {
    ;(groundsApi.addTheirWhatsAppNumber as any).mockResolvedValue({ said: "Aisha Hassan's WhatsApp number is kept. Groundwork will write to them there as well as by email." })
    draw()
    await waitFor(() => screen.getByText(/Brian Kiptoo's WhatsApp number is/))
    fireEvent.click(screen.getByRole('button', { name: 'Add a number' }))
    fireEvent.change(screen.getByLabelText('WhatsApp number for Aisha Hassan'), { target: { value: '0722 000 203' } })
    fireEvent.click(screen.getByRole('button', { name: 'Keep the number' }))
    await waitFor(() => expect(screen.getByText("Aisha Hassan's WhatsApp number is kept. Groundwork will write to them there as well as by email.")).toBeTruthy())
    expect(groundsApi.addTheirWhatsAppNumber).toHaveBeenCalledWith('g-lit', 'p-aisha', '0722 000 203')
  })

  it('she can remove Brian’s, and a refusal is said in the server’s words', async () => {
    ;(groundsApi.addTheirWhatsAppNumber as any).mockRejectedValue({ response: { data: { message: 'That number is already on somebody else’s sign-in.' } } })
    draw()
    await waitFor(() => screen.getByText(/Brian Kiptoo's WhatsApp number is/))
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }))
    await waitFor(() => expect(screen.getByText('That number is already on somebody else’s sign-in.')).toBeTruthy())
    expect(groundsApi.addTheirWhatsAppNumber).toHaveBeenCalledWith('g-lit', 'p-brian', '')
  })
})
