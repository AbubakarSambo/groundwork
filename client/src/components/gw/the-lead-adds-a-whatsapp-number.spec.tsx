import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { TheirWhatsAppNumber } from './WhosInItRoster'
import { groundsApi } from '@/api/grounds'

vi.mock('@/api/grounds', () => ({ groundsApi: { addTheirWhatsAppNumber: vi.fn() } }))

/**
 * D1 AND D2 (Hafsah, 13 October 2026, evening): "add your phone number, or your lead can." Njeri adds Brian's number on
 * her check-in's people, and reads back what was kept, or why not, in the server's own words.
 */
describe('the lead adds somebody’s WhatsApp number', () => {
  it('Njeri opens it, picks Brian, keeps his number, and reads it was kept', async () => {
    ;(groundsApi.addTheirWhatsAppNumber as any).mockResolvedValue({ said: "Brian Kiptoo's WhatsApp number is kept. Groundwork will write to them there as well as by email." })
    render(<TheirWhatsAppNumber groundId="g-lit" people={[{ id: 'p-brian', name: 'Brian Kiptoo' }, { id: 'p-aisha', name: 'Aisha Hassan' }]} />)
    fireEvent.click(screen.getByRole('button', { name: 'Add somebody’s WhatsApp number' }))
    expect(screen.getByText('Groundwork will write to them on WhatsApp as well as by email, and they can answer there.')).toBeTruthy()
    fireEvent.change(screen.getByLabelText('Their WhatsApp number'), { target: { value: '+254 712 345 678' } })
    fireEvent.click(screen.getByRole('button', { name: 'Keep the number' }))
    await waitFor(() => expect(screen.getByText("Brian Kiptoo's WhatsApp number is kept. Groundwork will write to them there as well as by email.")).toBeTruthy())
    expect(groundsApi.addTheirWhatsAppNumber).toHaveBeenCalledWith('g-lit', 'p-brian', '+254 712 345 678')
  })

  it('a refusal is said in the server’s words', async () => {
    ;(groundsApi.addTheirWhatsAppNumber as any).mockRejectedValue({ response: { data: { message: 'Brian Kiptoo already has a WhatsApp number. Only they, in Settings, or an administrator, on People, can change it.' } } })
    render(<TheirWhatsAppNumber groundId="g-lit" people={[{ id: 'p-brian', name: 'Brian Kiptoo' }]} />)
    fireEvent.click(screen.getByRole('button', { name: 'Add somebody’s WhatsApp number' }))
    fireEvent.change(screen.getByLabelText('Their WhatsApp number'), { target: { value: '+254 712 345 678' } })
    fireEvent.click(screen.getByRole('button', { name: 'Keep the number' }))
    await waitFor(() => expect(screen.getByText('Brian Kiptoo already has a WhatsApp number. Only they, in Settings, or an administrator, on People, can change it.')).toBeTruthy())
  })
})
