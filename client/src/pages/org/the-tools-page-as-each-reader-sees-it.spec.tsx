import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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
    /*
     * GROUP 1 REVIEW: THE PROTOTYPE'S OWN TITLE AREA (tools.txt, tools.jpg). "Settings" as the
     * title, the organisation's name as its subtitle, then a plain "Connections" link back - never
     * a "Settings / Connections" crumb joined with a slash.
     */
    expect(screen.getByRole('heading', { name: 'Settings' })).toBeTruthy()
    expect(screen.getByText('Baridi Appliances')).toBeTruthy()
    expect(screen.queryByText('Settings / Connections')).toBeNull()
    const connectionsLink = screen.getByRole('link', { name: 'Connections' })
    expect(connectionsLink.getAttribute('href')).toBe('/settings/connections')
    expect(connectionsLink.closest('nav')?.textContent).toBe('Connections')
    expect(screen.getByRole('heading', { level: 1, name: 'Connect your own tools' })).toBeTruthy()
    /* FIXED (30 September, the rebuild from the shared parts): this used to pin the OLD page's
       truncated sentence, missing tools.txt's own last clause ("unless you choose an event that
       carries it") - a real difference in meaning, not decoration: it says data only ever leaves
       because an admin chose an event that carries it, not merely that nothing sends today. Now
       copied in full from docs/prototype/screens/F1-connections/tools.txt.
       SCREEN FAULT 5b, FIXED: "Baridi Appliances’s" was wrong English - a name already ending in
       "s" takes just an apostrophe. This test used to pin that mistake; it now reads "Baridi
       Appliances’" (possessiveOf, client/src/lib/a-possessive.ts). The tests just below cover a
       name that does not end in "s" ("’s" kept), and a second name that does. */
    expect(screen.getByText('For whoever runs Baridi Appliances’ systems. Everything here is off until you turn it on, and nothing sends what anyone said in a check-in unless you choose an event that carries it.')).toBeTruthy()
    expect(await screen.findByText('Keys')).toBeTruthy()
    expect(screen.getByText('Be told when something happens')).toBeTruthy()
    expect(screen.getByText('Show Groundwork inside your own tool')).toBeTruthy()
    expect(screen.getByText('Recent deliveries')).toBeTruthy()
    expect(screen.getByText('How it looks inside your tool')).toBeTruthy()
  })

  /* SCREEN FAULT 5b: an organisation's name ending in "s" ("Kijani Foods") took just an apostrophe;
     one that does not ("Nyali Traders") keeps the usual "'s". */
  it('"Kijani Foods’ systems", for a name already ending in "s"', async () => {
    open({ id: 'u-g', role: 'ADMIN', organizationName: 'Kijani Foods' })
    expect(await screen.findByText(/For whoever runs/)).toBeTruthy()
    expect(screen.getByText(/^For whoever runs Kijani Foods’ systems\./)).toBeTruthy()
  })

  it('"Nyali Metal’s systems" keeps the usual "\'s" for a name not ending in "s"', async () => {
    open({ id: 'u-g', role: 'ADMIN', organizationName: 'Nyali Metal' })
    expect(await screen.findByText(/For whoever runs/)).toBeTruthy()
    expect(screen.getByText(/^For whoever runs Nyali Metal’s systems\./)).toBeTruthy()
  })

  it('reads nothing about WhatsApp, or Slack and Teams, here', async () => {
    whatsappOn = true
    open({ id: 'u-g', role: 'ADMIN', organizationName: 'Baridi Appliances' })
    await screen.findByText('Keys')
    expect(screen.queryByText(/Your WhatsApp number|Phone number id|incoming-webhook address from Slack/)).toBeNull()
    expect(calls).not.toContain('whatsapp')
    expect(calls).not.toContain('workspaceNotifiers')
  })

  /*
   * UPDATED (group 1 re-review, fault A): the real screenshot `/connect/whatsapp.png` is gone,
   * replaced by `WhatsAppConversationExample`, drawn in markup from the prototype's own made-up
   * exchange - so this is a `role="img"` with its own accessible name now, not an `<img alt=...>`.
   */
  it('sees the WhatsApp picture only while WhatsApp is switched on', async () => {
    const { unmount } = open({ id: 'u-g', role: 'ADMIN', organizationName: 'Baridi Appliances' })
    await screen.findByText('Keys')
    expect(screen.queryByRole('img', { name: 'A check-in over WhatsApp' })).toBeNull()
    unmount()
    whatsappOn = true
    open({ id: 'u-g', role: 'ADMIN', organizationName: 'Baridi Appliances' })
    await screen.findByText('Keys')
    expect(screen.getByRole('img', { name: 'A check-in over WhatsApp' })).toBeTruthy()
  })
})

/**
 * GROUP 1 FIX: THE APPROVED STATE, READ AS PLAIN SENTENCES. The reviewer sent this page back
 * because several lines a customer reads were developer notes ("Not on the prototype's own
 * screen..."), jargon ("Register where to be told.", "Your system authenticates..."), or pieces
 * joined with a dash instead of a sentence ("Replaced - revoke this one..."). This checks the
 * fixed wording renders, with mocked data, and that nothing on the page still says "prototype".
 */
describe('the approved state, with keys, webhooks, deliveries, embed and retention', () => {
  beforeEach(() => {
    served.myApiAccess = { status: 'APPROVED', approved: true, whatFor: 'syncing sales', requestedAt: null, decidedAt: '2026-09-12T00:00:00Z', note: null, says: '' }
    served.listCredentials = [
      { id: 'c1', clientId: 'gwc_billing', name: 'Billing system', scopes: ['subjects:write'], revokedAt: null, lastUsedAt: '2026-09-29T10:00:00Z', replacedByClientId: null },
      { id: 'c2', clientId: 'gwc_old', name: 'Old HR feed', scopes: ['graph:write'], revokedAt: null, lastUsedAt: null, replacedByClientId: 'gwc_new' },
    ]
    served.webhookEvents = { available: ['report.shared', 'checkin.completed'], notYetEmitted: ['blocker.raised', 'commitment.due'] }
    served.listEndpoints = [{ id: 'e1', url: 'https://crm.example.com/hooks/groundwork', events: ['checkin.completed'], active: true, rotatedAt: null }]
    served.deliveries = [{ id: 'd1', createdAt: '2026-09-29T10:42:00Z', eventType: 'report.shared', status: 'DELIVERED', attempts: 1, responseCode: 200, nextAttemptAt: null }]
    served.embedConfig = { allowedDomains: ['intranet.baridi.co.ke'], placement: 'floating', outOfScopeDepartments: [] }
    served.retention = { turnRetentionDays: 90, floor: 30, ceiling: 365 }
    served.issueCredential = { clientId: 'gwc_new123', clientSecret: 'gws_supersecret456' }
  })

  it('names what an import could not take in, in a plain sentence, with no developer note and no mention of "the prototype"', async () => {
    served.listImports = { jobs: [{ id: 'j1', sourceSystem: 'HubSpot', total: 10, succeeded: 8, failed: 2, state: 'DONE', createdAt: '2026-09-20T00:00:00Z', error: null }], detectionQuietUntil: null }
    const { container } = open({ id: 'u-g', role: 'ADMIN', organizationName: 'Baridi Appliances' })
    await screen.findByText('Keys')
    expect(screen.getByText('What an import could not take in, so nothing sent is lost without you knowing')).toBeTruthy()
    expect(container.textContent).not.toMatch(/prototype/i)
  })

  it('says plainly that two more events are coming, without claiming they can be ticked', async () => {
    open({ id: 'u-g', role: 'ADMIN', organizationName: 'Baridi Appliances' })
    await screen.findByText('Keys')
    expect(screen.getByText('The list comes from Groundwork, so new events appear here.')).toBeTruthy()
    expect(screen.getByText(/Two more are coming\. Nothing sends them yet, so they will appear here once Groundwork can\./)).toBeTruthy()
    expect(screen.queryByText(/can be ticked now/)).toBeNull()
  })

  it('says a key was replaced as a full sentence, never joined with a dash', async () => {
    open({ id: 'u-g', role: 'ADMIN', organizationName: 'Baridi Appliances' })
    await screen.findByText('Old HR feed')
    expect(screen.getByText(/This key has been replaced\. Revoke it once the new one is live\./)).toBeTruthy()
  })

  it('never says "authenticates" or "Register" for the setup steps', async () => {
    const { container } = open({ id: 'u-g', role: 'ADMIN', organizationName: 'Baridi Appliances' })
    await screen.findByText('Keys')
    expect(screen.getByText(/Your system signs in and sends something\./)).toBeTruthy()
    expect(screen.getByText(/Tell us where you want to be told\./)).toBeTruthy()
    expect(container.textContent).not.toMatch(/authenticates/)
    expect(container.textContent).not.toMatch(/Register where/)
  })

  it('reads the webhook, its recent delivery, and the retention sentence as full sentences, with no dash join', async () => {
    open({ id: 'u-g', role: 'ADMIN', organizationName: 'Baridi Appliances' })
    await screen.findByText('Keys')
    expect(screen.getByText('https://crm.example.com/hooks/groundwork')).toBeTruthy()
    expect(screen.getByText('Recent deliveries')).toBeTruthy()
    expect(screen.getAllByText('report.shared').length).toBeGreaterThan(0)
    await userEvent.click(screen.getByRole('button', { name: 'Change' }))
    /* UPDATED (group 1 re-review): "roster" and "raw words" were both jargon; the sentence now
       reads "your people list" and "what they said word for word". */
    expect(screen.getByText(/When your people list tells us somebody has left, we delete what they said word for word after this many days\./)).toBeTruthy()
    expect(screen.getByText(/That is always after any handover brief has been built, never before\./)).toBeTruthy()
  })

  it('a new key’s value is shown once and gone once you say you have saved it', async () => {
    open({ id: 'u-g', role: 'ADMIN', organizationName: 'Baridi Appliances' })
    await screen.findByText('Keys')
    await userEvent.click(screen.getByRole('button', { name: 'Create a key' }))
    await userEvent.type(screen.getByLabelText('What is it for?'), 'A new system')
    const form = screen.getByLabelText('What is it for?').closest('form') as HTMLElement
    await userEvent.click(within(form).getByRole('button', { name: 'Create a key' }))
    expect(await screen.findByText('gwc_new123')).toBeTruthy()
    expect(screen.getByText('gws_supersecret456')).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: 'I have saved it' }))
    expect(screen.queryByText('gws_supersecret456')).toBeNull()
  })

  it('the engineer reference is introduced in a plain sentence, with no mention of "the prototype"', async () => {
    const { container } = open({ id: 'u-g', role: 'ADMIN', organizationName: 'Baridi Appliances' })
    await screen.findByText('Keys')
    expect(screen.getByText('The calls your developer can send directly, if this page’s own buttons are not enough')).toBeTruthy()
    expect(container.textContent).not.toMatch(/prototype/i)
  })
})

/**
 * GROUP 1 FIX: BEFORE APPROVAL. The old sentence said "your own build against the API" (jargon)
 * and the terms checkbox showed the version number on screen, which nobody reading it needs.
 */
describe('before access is approved', () => {
  beforeEach(() => {
    served.myApiAccess = { status: null, approved: false, whatFor: null, requestedAt: null, decidedAt: null, note: null, says: '' }
    served.apiTerms = { version: '3', title: '', says: '', terms: [{ heading: 'Privacy', body: 'Everything stays private.' }] }
  })

  it('says people can check in from a panel on your own page or on screens your developer builds, never "the API"', async () => {
    const { container } = open({ id: 'u-g', role: 'ADMIN', organizationName: 'Baridi Appliances' })
    await screen.findByText('Put check-ins inside your own product')
    expect(screen.getByText(/Your people can check in from inside your own system, in a panel on your own page or on screens your developer builds\./)).toBeTruthy()
    expect(container.textContent).not.toMatch(/against the API/)
  })

  it('accepts the terms for connecting your own tools, with no version number shown on screen', async () => {
    const { container } = open({ id: 'u-g', role: 'ADMIN', organizationName: 'Baridi Appliances' })
    await screen.findByText('Put check-ins inside your own product')
    expect(screen.getByText(/I accept the terms for connecting your own tools\./)).toBeTruthy()
    expect(container.textContent).not.toMatch(/\(version/)
    expect(screen.getByRole('button', { name: 'Read them' })).toBeTruthy()
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
