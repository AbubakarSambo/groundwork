import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth'

/**
 * "CONNECT YOUR OWN TOOLS" (F1, #/settings/tools, U.18), AS EACH PERSON SEES IT. The page that was
 * "Connect your systems", with the prototype's heading (tools.txt). WhatsApp moved to its own page and
 * Slack or Teams to Connections, so neither is here; only an admin gets in, on the server
 * (api/src/modules/public-api/the-connections-as-each-reader-reads-them.spec.ts) and on the page.
 */
const served: Record<string, unknown> = {
  myApiAccess: { status: 'APPROVED', approved: true, whatFor: 'syncing sales', requestedAt: null, decidedAt: null, note: null, says: '' },
  listCredentials: [], apiTerms: { version: '1', title: '', says: '', terms: [] }, webhookEvents: { available: ['session.completed'], notYetEmitted: [] },
  listEndpoints: [], embedConfig: null, retention: null, deliveries: [], listImports: { jobs: [], detectionQuietUntil: null },
}
const calls: string[] = []
vi.mock('@/api/integrations', () => ({
  integrationsApi: new Proxy({}, { get: (_t, name: string) => () => { calls.push(name); return Promise.resolve(served[name] ?? null) } }),
}))
let whatsappOn = false
vi.mock('@/lib/whatsapp-is-on', () => ({ useWhatsAppIsOn: () => whatsappOn }))
import { IntegrationsPage } from './IntegrationsPage'

function open(user: any) {
  useAuthStore.setState({ user, token: 't', isAuthenticated: true } as any)
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={qc}><MemoryRouter><IntegrationsPage /></MemoryRouter></QueryClientProvider>)
}

beforeEach(() => { calls.length = 0; whatsappOn = false })

describe('Grace, an admin', () => {
  it('reads the prototype’s heading and opening sentence, and the way back to Connections', async () => {
    open({ id: 'u-g', role: 'ADMIN', organizationName: 'Baridi Appliances' })
    expect(screen.getByText('Settings')).toBeTruthy()
    expect(screen.getByText('Baridi Appliances')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Connections' }).getAttribute('href')).toBe('/settings/connections')
    expect(screen.getByRole('heading', { level: 1, name: 'Connect your own tools' })).toBeTruthy()
    expect(screen.getByText('For whoever runs Baridi Appliances’s systems. Everything here is off until you turn it on, and nothing sends what anyone said in a check-in.')).toBeTruthy()
    expect(await screen.findByText('Keys')).toBeTruthy()
    expect(screen.getByText('Be told when something happens')).toBeTruthy()
    expect(screen.getByText('Show Groundwork inside your own tool')).toBeTruthy()
    expect(screen.getByText('Recent deliveries')).toBeTruthy()
    expect(screen.getByText('How it looks inside your tool')).toBeTruthy()
  })

  it('reads nothing about WhatsApp, or Slack and Teams, here', async () => {
    whatsappOn = true
    open({ id: 'u-g', role: 'ADMIN', organizationName: 'Baridi Appliances' })
    await screen.findByText('Keys')
    expect(screen.queryByText(/Your WhatsApp number|Phone number id|incoming-webhook address from Slack/)).toBeNull()
    expect(calls).not.toContain('whatsapp')
    expect(calls).not.toContain('workspaceNotifiers')
  })

  it('sees the WhatsApp picture only while WhatsApp is switched on', async () => {
    const { unmount } = open({ id: 'u-g', role: 'ADMIN', organizationName: 'Baridi Appliances' })
    await screen.findByText('Keys')
    expect(screen.queryByAltText('A check-in over WhatsApp')).toBeNull()
    unmount()
    whatsappOn = true
    open({ id: 'u-g', role: 'ADMIN', organizationName: 'Baridi Appliances' })
    await screen.findByText('Keys')
    expect(screen.getByAltText('A check-in over WhatsApp')).toBeTruthy()
  })
})

describe('a lead, a member and a guest', () => {
  for (const role of ['LEAD', 'MEMBER', 'GUEST']) {
    it(`as ${role}, reads only that an admin sets this up, and nothing is fetched`, () => {
      open({ id: 'u-x', role, organizationName: 'Baridi Appliances' })
      expect(screen.getByText('Only an admin in your organisation can set this up. Ask whoever manages Groundwork for your organisation.')).toBeTruthy()
      expect(screen.queryByText('Keys')).toBeNull()
      expect(calls).toEqual([])
    })
  }
})
