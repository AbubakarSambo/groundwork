import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TheirNumberInTheRow } from './their-number'

/**
 * A ROW'S PHONE LINE IS ONE PLAIN LINE (Hafsah, 21 November 2026, after a browser test): the number, whether it is connected, and
 * WhatsApp, as the server writes it (can-they-check-in-on-whatsapp.ts theirPhoneLine), with "Change" beside it.
 */
const row = (m: any) => render(<QueryClientProvider client={new QueryClient()}><TheirNumberInTheRow m={m} first="Imani" whatsappOn /></QueryClientProvider>)

describe('the phone line in a row on People', () => {
  it('reads the one line, and none of the three sentences it replaces', () => {
    const { container } = row({ id: 'imani', phoneNumber: '+254700100008', whatsappSays: 'Not connected yet. Nothing has been sent to this number.', phoneLine: '+254700100008, not connected yet. Can check in on WhatsApp in The new stock system, four depots.' })
    expect(container.textContent).toBe(' +254700100008, not connected yet. Can check in on WhatsApp in The new stock system, four depots. Change')
    expect(container.textContent).not.toMatch(/Their phone number is|Nothing has been sent|Checks in/)
  })
})
