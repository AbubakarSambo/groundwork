/**
 * GROUNDWORK'S WHATSAPP NUMBER, AS A MEMBER OF STAFF READS THE PAGE (5 Oct 2026).
 *
 * Renders the page with the API's own answers and reads what is on screen: each secret reads "Set"
 * or "Not set" and never its value, the webhook address is the one to give Meta, and somebody who is
 * not staff reads who the page is for. The guard itself is on the API (PlatformAdminGuard); this
 * only checks what is read.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const api = vi.hoisted(() => ({ get: vi.fn(), save: vi.fn(), connection: vi.fn(), sendTest: vi.fn() }))
vi.mock('@/api/whatsapp-settings', () => ({ whatsAppSettingsApi: api }))

import { WhatsAppSettingsPage } from './WhatsAppSettingsPage'

const PAGE = {
  fields: {
    displayNumber: { value: '+44 7700 900123', from: 'here', saying: 'The WhatsApp number was saved here.' },
    phoneNumberId: { value: '222222222', from: 'here', saying: 'The phone number ID was saved here.' },
    businessAccountId: { value: null, from: null, saying: 'The business account ID is not set.' },
  },
  secrets: {
    accessToken: { state: 'set', saying: 'The access token is set. It was saved here and is kept encrypted.' },
    appSecret: { state: 'set', saying: "The app secret is set in the server's settings. Anything you save here replaces it." },
    verifyToken: { state: 'not set', saying: 'The verify token is not set.' },
  },
  canSaveSecrets: true,
  canSaveSecretsSaying: 'Secrets you type here are kept encrypted. Once saved, they are never shown again.',
  webhook: { address: 'https://api.groundwork.test/api/v1/webhooks/whatsapp', path: '/api/v1/webhooks/whatsapp', saying: 'The webhook address to give Meta is https://api.groundwork.test/api/v1/webhooks/whatsapp.' },
  switch: { credentialsConfigured: true, adminEnabled: false, live: false, saying: 'WhatsApp is switched off. Nothing goes from this number until you switch it on in the System tab.' },
}

function open() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={qc}><MemoryRouter><WhatsAppSettingsPage /></MemoryRouter></QueryClientProvider>)
}

beforeEach(() => {
  api.get.mockReset(); api.save.mockReset(); api.connection.mockReset(); api.sendTest.mockReset()
  api.get.mockResolvedValue(PAGE)
  api.connection.mockResolvedValue({ connected: true, saying: 'Connected. Meta has this number as +44 7700 900123, under the name Groundwork.' })
})

describe('a member of staff reads', () => {
  it('the switch, the connection, set or not set for each secret, and the webhook address', async () => {
    open()
    expect(await screen.findByText("Groundwork's WhatsApp number")).toBeTruthy()
    expect(await screen.findByText('WhatsApp is switched off. Nothing goes from this number until you switch it on in the System tab.')).toBeTruthy()
    expect(await screen.findByText(/Meta has this number as \+44 7700 900123, under the name Groundwork\./)).toBeTruthy()
    expect(screen.getAllByText('Set')).toHaveLength(2)
    expect(screen.getAllByText('Not set')).toHaveLength(1)
    expect(screen.getByText('The webhook address to give Meta is https://api.groundwork.test/api/v1/webhooks/whatsapp.')).toBeTruthy()
    /* Every secret box is a password box and starts empty. */
    for (const name of ['Access token', 'App secret', 'Verify token']) {
      const box = screen.getByLabelText(new RegExp(`^${name}`)) as HTMLInputElement
      expect(box.type).toBe('password')
      expect(box.value).toBe('')
    }
  })

  it('a secret typed in is sent once and the box is emptied after saving', async () => {
    api.save.mockResolvedValue({ ...PAGE, saved: 'Your changes are saved.' })
    open()
    const box = (await screen.findByLabelText(/^Verify token/)) as HTMLInputElement
    fireEvent.change(box, { target: { value: 'made-up-verify-word' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await screen.findByText('Your changes are saved.')
    expect(api.save).toHaveBeenCalledWith({ displayNumber: '+44 7700 900123', phoneNumberId: '222222222', businessAccountId: '', verifyToken: 'made-up-verify-word' })
    expect(((await screen.findByLabelText(/^Verify token/)) as HTMLInputElement).value).toBe('')
  })

  it('the test message goes to the number typed, and the page says where it went', async () => {
    api.sendTest.mockResolvedValue({ sent: true, to: '+447700900123', saying: 'The test message went to +447700900123. Check that phone to see that it arrived.' })
    open()
    const box = await screen.findByLabelText('The number to send the test message to')
    fireEvent.change(box, { target: { value: '+44 7700 900123' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send a test message' }))
    expect(await screen.findByText('The test message went to +447700900123. Check that phone to see that it arrived.')).toBeTruthy()
    expect(api.sendTest).toHaveBeenCalledWith('+44 7700 900123')
  })
})

describe('somebody who is not staff', () => {
  it('reads who the page is for, never the settings', async () => {
    api.get.mockRejectedValue({ response: { status: 403, data: { message: 'Platform admin access required' } } })
    api.connection.mockRejectedValue({ response: { status: 403, data: { message: 'Platform admin access required' } } })
    open()
    await waitFor(() => expect(screen.getByText('This page is for Groundwork staff only. Being an admin in your own organisation does not include it.')).toBeTruthy())
    expect(screen.queryByText('The webhook address to give Meta')).toBeNull()
    expect(screen.queryByLabelText(/^Access token/)).toBeNull()
    expect(screen.queryByText(/Platform admin access required/)).toBeNull()
  })
})
