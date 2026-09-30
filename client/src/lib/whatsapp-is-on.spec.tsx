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
    /* UPDATED, GROUP 1 REBUILD: the WhatsApp field is a `FieldRow` inside "You"'s panel now, not
       its own `<section>` with kit.tsx's `Sec` - the same gate (`whatsappOn &&`), on the row that
       carries the number. */
    expect(settings).toMatch(/\{whatsappOn && \(\s*<FieldRow\s*\n\s*label="WhatsApp"/)
    /*
     * REBUILT (design-audit.md item 9): the number now sits behind the same "Change" every other
     * field on this page uses, in `EditableField`, not the old always-editable `gw-one-field` /
     * `gw-one-label` box - those classes are gone from the page entirely.
     */
    expect(people).toMatch(/\{whatsappOn && \(\s*<EditableField\s*\n\s*label="WhatsApp"/)
  })
})
