import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { readFileSync } from 'fs'
import { join } from 'path'
import { useWhatsAppIsOn } from './whatsapp-is-on'
import { apiClient } from '@/api/client'
import { useAuthStore } from '@/stores/auth'

/**
 * NOTHING MENTIONS WHATSAPP WHILE IT IS OFF (U.3, Hafsah, 26 September).
 */
function Probe() {
  const on = useWhatsAppIsOn()
  return <p>{on ? 'WhatsApp shown' : 'WhatsApp hidden'}</p>
}
function open(on: boolean | 'fails') {
  if (on === 'fails') vi.spyOn(apiClient, 'get').mockRejectedValue(new Error('offline'))
  else vi.spyOn(apiClient, 'get').mockResolvedValue({ data: { success: true, data: { on } } } as any)
  useAuthStore.setState({ isAuthenticated: true } as any)
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={qc}><Probe /></QueryClientProvider>)
}
beforeEach(() => { vi.restoreAllMocks() })

describe('whether WhatsApp is mentioned', () => {
  it('only when the server says it is on', async () => {
    open(true)
    expect(await screen.findByText('WhatsApp shown')).toBeTruthy()
  })
  it('not when it is off', async () => {
    open(false)
    expect(await screen.findByText('WhatsApp hidden')).toBeTruthy()
  })
  it('and not when the server cannot say', async () => {
    open('fails')
    expect(await screen.findByText('WhatsApp hidden')).toBeTruthy()
  })
  it('the Settings section and the People page\'s number box both ask it', () => {
    const settings = readFileSync(join(__dirname, '../pages/settings/SettingsPage.tsx'), 'utf8')
    /* U.4: the number box moved to one person's page. */
    const people = readFileSync(join(__dirname, '../pages/org/OnePersonPage.tsx'), 'utf8')
    /* CHANGED (Hafsah, 30 October 2026): the phone number row is always there, whether WhatsApp is on or off. What is
       said about WhatsApp - "You can check in by replying on WhatsApp." - is what waits for `whatsappOn`. */
    expect(settings).toMatch(/label="Phone number"/)
    expect(settings).toMatch(/\{whatsappOn && <span className="gwui-field-help">You can check in by replying on WhatsApp\.<\/span>\}/)
    /* One person's page: the number is always there to add or change; the line saying where they are on WhatsApp waits. */
    expect(people).toMatch(/\{whatsappOn && m\.whatsappSays && <FieldRow label="On WhatsApp"/)
  })
})
