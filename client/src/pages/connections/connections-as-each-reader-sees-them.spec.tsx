import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { readFileSync } from 'fs'
import { join } from 'path'
import { useAuthStore } from '@/stores/auth'

/**
 * CONNECTIONS (F1, U.18), AS EACH PERSON SEES THEM: #/settings/connections and #/settings/whatsapp.
 * What each person is served is tested on the server
 * (api/src/modules/public-api/the-connections-as-each-reader-reads-them.spec.ts): only an admin gets
 * in. Here: what Grace, an admin, reads, in the prototype's words (connections.txt, whatsapp.txt);
 * that a lead, a member and a guest read only that an admin sets this up, and nothing is fetched for
 * them; that WhatsApp is mentioned only while it is switched on; and that nothing on the page is
 * pretend (no Paystack, no spreadsheet, no setup link, no sample drawing).
 */
vi.mock('@/api/integrations', () => ({
  integrationsApi: {
    atAGlance: vi.fn(), whatsapp: vi.fn(), listCredentials: vi.fn(), myApiAccess: vi.fn(), workspaceNotifiers: vi.fn(),
    testWhatsapp: vi.fn(), disconnectWhatsapp: vi.fn(), connectWorkspace: vi.fn(), testWorkspace: vi.fn(), turnWorkspace: vi.fn(),
    disconnectWorkspace: vi.fn(), connectWhatsapp: vi.fn(), setWhatsappEnabled: vi.fn(), whatsappTemplates: vi.fn(),
  },
}))
let whatsappOn = true
vi.mock('@/lib/whatsapp-is-on', () => ({ useWhatsAppIsOn: () => whatsappOn }))
/*
 * B-219 (REVIEW 4): THE "YOU CAN TURN WHATSAPP ON" SENTENCE NOW READS THE ORGANISATION'S OWN
 * ADD-ON (`billingApi.getWhatsApp().on`), NOT THE PLATFORM SWITCH ABOVE (`whatsappOn`) - see
 * ConnectionsPage.tsx's own note on `orgWhatsAppAddOnOff`. `undefined` (the minimal shape's real
 * shape while `release.planAndBillingNewParts` is off, checked live against the sweep bed) reads
 * as "unknown", not "off" - the tests below set it explicitly, per case.
 *
 * B-219 (REVIEW 5): `on` IS NEVER SENT BY THE MINIMAL SHAPE AT ALL (not merely sometimes
 * `undefined`) - `sending: false` is its own, real way of saying the add-on is off (checked live
 * against the bed, Mira at Riverbank). `billingWhatsAppSending` and `billingWhatsAppSays` let the
 * tests below set that shape explicitly, per case; `isWhatsAppBillingAdmin` is real, not mocked,
 * since ConnectionsPage now imports it to read the admin shape's own `says.onOrOff`.
 *
 * B-219 (REVIEW 6): THE "PLAN AND BILLING" LINK IS NOW GATED ON THE ADMIN SHAPE ITSELF
 * (`isWhatsAppBillingAdmin`), THE SAME CHECK PLAN AND BILLING USES TO DRAW ITS OWN WHATSAPP PART -
 * not shown at release, where the server serves every admin the minimal shape (no `says` object).
 * `billingWhatsAppAdminShape` lets a test ask for the full admin shape instead, to pin the one case
 * where the link is real.
 */
let billingWhatsAppOn: boolean | undefined = true
let billingWhatsAppSending = true
let billingWhatsAppSays: string | null = null
let billingWhatsAppAdminShape = false
const getWhatsAppMock = vi.fn(() => Promise.resolve(
  billingWhatsAppAdminShape
    ? {
        on: billingWhatsAppOn, sending: billingWhatsAppSending, plan: null, price: null, charged: false,
        freeTrial: null, onTheFreePlan: true, use: { month: '2026-10', sent: 0, limit: null, startsAgainOn: '2026-11-01' },
        heldBecause: null,
        says: { onOrOff: billingWhatsAppSays, price: null, charge: '', use: '', atTheLimit: null, reachedTheLimit: null, held: null },
      }
    : { sending: billingWhatsAppSending, says: billingWhatsAppSays, on: billingWhatsAppOn },
))
vi.mock('@/api/billing', async () => {
  const actual = await vi.importActual<typeof import('@/api/billing')>('@/api/billing')
  return { ...actual, billingApi: { getWhatsApp: () => getWhatsAppMock() } }
})
import { integrationsApi } from '@/api/integrations'
import { ConnectionsPage } from './ConnectionsPage'
import { WhatsAppSetupPage } from './WhatsAppSetupPage'

const api = integrationsApi as unknown as Record<string, ReturnType<typeof vi.fn>>

const GRACE = { id: 'u-g', firstName: 'Grace', role: 'ADMIN', organizationName: 'Baridi Appliances' }
const WAIRIMU = { id: 'u-w', firstName: 'Wairimu', role: 'LEAD', organizationName: 'Baridi Appliances' }
const MIRIAM = { id: 'u-m', firstName: 'Miriam', role: 'MEMBER', organizationName: 'Baridi Appliances' }
const TOMAS = { id: 'u-t', firstName: 'Tomas', role: 'GUEST', organizationName: 'Baridi Appliances' }

const CONNECTED = {
  phoneNumberId: '109822345561', businessAccountId: null, displayNumber: '+254 709 000 111', verifyToken: 'gwv_7f3a91c2',
  enabled: true, connectedAt: '2026-09-01T09:00:00Z', lastInboundAt: '2026-09-02T09:00:00Z', lastOutboundAt: '2026-09-02T09:05:00Z',
  webhookProvenAt: '2026-09-01T09:10:00Z', tokenEndsWith: '3f9a',
}

function serve(opts: { connection?: any; glance?: any; creds?: any[]; access?: any; notifiers?: any[]; wa?: any } = {}) {
  api.whatsapp.mockResolvedValue({
    connection: opts.connection === undefined ? null : opts.connection,
    webhookPath: '/api/v1/webhooks/whatsapp/org-baridi',
    canStartAConversation: false, theNamesToSubmit: ['gw_session_ready', 'gw_opening', 'gw_report'], approvedHere: [],
    languages: ['English', 'Swahili'], ...(opts.wa ?? {}),
  })
  api.atAGlance.mockResolvedValue(opts.glance ?? { whatsapp: opts.connection ? { people: 6, checkInsThisMonth: 212, failedThisWeek: 0 } : null, figures: { fromYourProduct: false } })
  api.listCredentials.mockResolvedValue(opts.creds ?? [])
  api.myApiAccess.mockResolvedValue(opts.access ?? { status: null, approved: false, whatFor: null, requestedAt: null, decidedAt: null, note: null, says: '' })
  api.workspaceNotifiers.mockResolvedValue(opts.notifiers ?? [])
}

function open(user: any, page: 'connections' | 'whatsapp' = 'connections') {
  useAuthStore.setState({ user, token: 't', isAuthenticated: true } as any)
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[`/settings/${page}`]}>{page === 'connections' ? <ConnectionsPage /> : <WhatsAppSetupPage />}</MemoryRouter>
    </QueryClientProvider>,
  )
}
const hrefOf = (el: HTMLElement, name: string) => within(el).getByRole('link', { name }).getAttribute('href')

beforeEach(() => { vi.clearAllMocks(); whatsappOn = true; billingWhatsAppOn = true; billingWhatsAppSending = true; billingWhatsAppSays = null; billingWhatsAppAdminShape = false })

describe('a lead, a member and a guest', () => {
  for (const [who, user] of [['Wairimu, a lead', WAIRIMU], ['Miriam, a member', MIRIAM], ['Tomas, a guest', TOMAS]] as const) {
    it(`${who} reads only that an admin sets this up, on both pages, and nothing is fetched`, () => {
      serve({ connection: CONNECTED })
      const { unmount } = open(user)
      expect(screen.getByText('Only an admin in your organisation can set this up. Ask whoever manages Groundwork for your organisation.')).toBeTruthy()
      expect(screen.queryByText('Your numbers')).toBeNull()
      expect(screen.queryByText(/WhatsApp/)).toBeNull()
      unmount()
      open(user, 'whatsapp')
      expect(screen.getByText('Only an admin in your organisation can set this up. Ask whoever manages Groundwork for your organisation.')).toBeTruthy()
      expect(screen.queryByText('Use your organisation’s own WhatsApp number')).toBeNull()
      for (const fn of Object.values(api)) expect(fn).not.toHaveBeenCalled()
    })
  }
})

describe('Grace, an admin, reads Connections', () => {
  it('opens with "Settings" and her organisation', async () => {
    serve()
    open(GRACE)
    expect(screen.getByRole('heading', { level: 1, name: 'Settings' })).toBeTruthy()
    /* "Baridi Appliances" also names the fictional business account inside the WhatsApp
       conversation illustration (group 1 re-review, fault A: connections.txt's own words), so
       this is now more than one text node with that exact name. */
    expect(screen.getAllByText('Baridi Appliances').length).toBeGreaterThan(0)
    await screen.findByRole('heading', { name: 'Your numbers' })
  })

  it('with her own number connected: the prototype’s sentence, the three counts, and the four actions', async () => {
    serve({ connection: CONNECTED })
    open(GRACE)
    const wa = await screen.findByRole('region', { name: 'WhatsApp' })
    await within(wa).findByText('Connected')
    /* SCREEN FAULT 5b, FIXED: "Baridi Appliances’s" was wrong English - a name already ending in
       "s" takes just an apostrophe (possessiveOf, client/src/lib/a-possessive.ts). This used to pin
       that mistake; it now reads "Baridi Appliances’". */
    expect(wa.textContent).toContain('Your people check in by replying to +254 709 000 111, Baridi Appliances’ WhatsApp Business number. A reply is their check-in, exactly as if typed here.')
  })

  it('a name ending in "s" ("Kijani Foods") takes just an apostrophe, not "\'s" (screen fault 5b)', async () => {
    serve({ connection: CONNECTED })
    open({ ...GRACE, organizationName: 'Kijani Foods' })
    const wa = await screen.findByRole('region', { name: 'WhatsApp' })
    await within(wa).findByText('Connected')
    expect(wa.textContent).toContain('Kijani Foods’ WhatsApp Business number')
    expect(wa.textContent).not.toContain('Kijani Foods’s')
    await within(wa).findByText('people checking in on WhatsApp')
    expect(within(wa).getByText('6')).toBeTruthy()
    expect(within(wa).getByText('212')).toBeTruthy()
    expect(within(wa).getByText('check-ins this month')).toBeTruthy()
    expect(within(wa).getByText('0')).toBeTruthy()
    expect(within(wa).getByText('failed messages this week')).toBeTruthy()
    expect(within(wa).getByRole('button', { name: 'Send a test message' })).toBeTruthy()
    expect(hrefOf(wa, 'Reminder messages')).toBe('/settings/whatsapp')
    expect(hrefOf(wa, 'Change the number')).toBe('/settings/whatsapp')
    expect(within(wa).getByRole('button', { name: 'Disconnect' })).toBeTruthy()
  })

  it('says one person, one check-in and one failed message as one', async () => {
    serve({ connection: CONNECTED, glance: { whatsapp: { people: 1, checkInsThisMonth: 1, failedThisWeek: 1 }, figures: { fromYourProduct: false } } })
    open(GRACE)
    const wa = await screen.findByRole('region', { name: 'WhatsApp' })
    await within(wa).findByText('person checking in on WhatsApp')
    expect(within(wa).getByText('check-in this month')).toBeTruthy()
    expect(within(wa).getByText('failed message this week')).toBeTruthy()
  })

  it('disconnecting asks first, then removes the connection', async () => {
    serve({ connection: CONNECTED })
    api.disconnectWhatsapp.mockResolvedValue({ disconnected: true })
    open(GRACE)
    const wa = await screen.findByRole('region', { name: 'WhatsApp' })
    fireEvent.click(await within(wa).findByRole('button', { name: 'Disconnect' }))
    expect(api.disconnectWhatsapp).not.toHaveBeenCalled()
    expect(within(wa).getByText('Remove the WhatsApp connection? Nothing sent or received is deleted.')).toBeTruthy()
    fireEvent.click(within(within(wa).getByRole('group')).getByRole('button', { name: 'Disconnect' }))
    await waitFor(() => expect(api.disconnectWhatsapp).toHaveBeenCalledTimes(1))
  })

  /*
   * A SEALED KEY THAT CANNOT BE OPENED (6 October, answers-from-engine.md: "an organisation's own
   * WhatsApp number, when its keys cannot be opened"). `keysNeedTypingAgain` and its sentence are
   * served on `connection`; the sentence is shown word for word, as a Note, at the top of the
   * WhatsApp section, with the token and app secret fields to retype it right there.
   */
  it('with her own keys sealed and unreadable: the served sentence, and the fields to type them again', async () => {
    serve({ connection: { ...CONNECTED, keysNeedTypingAgain: true, keysNeedTypingAgainSays: "Your number's keys need to be typed in again. Nothing is sent from your number until they are." } })
    api.connectWhatsapp.mockResolvedValue({ connection: CONNECTED, webhookPath: '/x' })
    open(GRACE)
    const wa = await screen.findByRole('region', { name: 'WhatsApp' })
    const note = await within(wa).findByRole('alert')
    expect(note.textContent).toBe("Your number's keys need to be typed in again. Nothing is sent from your number until they are.")
    fireEvent.change(within(wa).getByLabelText('Access token'), { target: { value: 'EAA-new-token' } })
    fireEvent.change(within(wa).getByLabelText('App secret'), { target: { value: 'new-secret' } })
    fireEvent.click(within(wa).getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(api.connectWhatsapp).toHaveBeenCalledWith(expect.objectContaining({
      phoneNumberId: CONNECTED.phoneNumberId, accessToken: 'EAA-new-token', appSecret: 'new-secret',
    })))
  })

  it('with keys sealed and readable, says nothing about retyping them', async () => {
    serve({ connection: CONNECTED })
    open(GRACE)
    const wa = await screen.findByRole('region', { name: 'WhatsApp' })
    expect(within(wa).queryByRole('alert')).toBeNull()
    expect(within(wa).queryByLabelText('Access token')).toBeNull()
    expect(within(wa).queryByLabelText('App secret')).toBeNull()
  })

  /*
   * DECISION 112, 7 October: with no number of her own, this section used to lead with "People
   * check in by replying to your organisation's WhatsApp number" and a "Set it up" button, which
   * read as though setting up an own number were the normal next step. It now leads with how
   * WhatsApp works on Groundwork's own number, and folds setting up her own number under
   * "Advanced", shut, with "Not set up" moved onto that fold.
   *
   * B-219 (said why in the commit): this test used to also assert a "Plan and billing" link
   * reading "An admin turns WhatsApp on for your organisation" - WHILE WhatsApp was already on
   * (`whatsappOn` defaults to `true` in this file). Grace is an admin (this whole page is
   * admin-only), reading that she herself needs to turn on a setting that is already on. That
   * sentence is now said only while the organisation's own add-on is confirmed off - see the two
   * tests below.
   */
  it('with WhatsApp on and no number of her own: Groundwork’s own number, and her own folded under "Advanced"', async () => {
    serve()
    open(GRACE)
    const wa = await screen.findByRole('region', { name: 'WhatsApp' })
    expect(within(wa).getByText('Your people check in by replying to Groundwork’s WhatsApp number. A reply is their check-in, exactly as if typed here.')).toBeTruthy()
    expect(within(wa).queryByText(/turns WhatsApp on|turn WhatsApp on/)).toBeNull()
    // B-231 (said why in the commit): "Advanced: ..." joined two pieces with a colon.
    const advanced = within(wa).getByText('Use your organisation’s own WhatsApp number').closest('details') as HTMLElement
    expect(advanced).toBeTruthy()
    expect(advanced.hasAttribute('open')).toBe(false)
    expect(within(advanced).getByText('Not set up')).toBeTruthy()
    expect(within(advanced).getByText('Most organisations never need this. Groundwork’s own number already works for everyone.')).toBeTruthy()
    expect(hrefOf(advanced, 'Set it up')).toBe('/settings/whatsapp')
  })

  /*
   * B-219 (REVIEW 4): THE PLATFORM SWITCH AND THE ORGANISATION'S OWN ADD-ON CAN DISAGREE, AND
   * DID. Walked live at Riverbank: the platform switch (`whatsappOn`, which still gates whether
   * this section shows at all) was on while Riverbank's own add-on (`billingApi.getWhatsApp().on`)
   * was off - so this state is real, not academic, and Mira read no way to turn WhatsApp on about
   * a setting that was genuinely off for her. An earlier note here called this state
   * "unreachable", reasoning from the old code that tied the sentence to the same `whatsappOn` the
   * section's own visibility already depends on - that reasoning no longer holds now that the
   * sentence reads a different, independent fact.
   */
  /*
   * B-219 (REVIEW 6): THE FIRST SENTENCE IS NOW SAID TO HER, AS THE ADMIN WHO CAN FIX IT - NOT THE
   * SERVER'S OWN SENTENCE FOR SETTINGS, WHERE A MEMBER READS IT ABOUT THEMSELVES. And the "Plan and
   * billing" link no longer shows here: at release the server serves every admin the minimal shape
   * (no `says` object - `billingWhatsAppAdminShape` stays false, its default), so Plan and billing's
   * own WhatsApp part - gated on that same admin shape - is not there for the link to go to, and
   * showing it would have sent Mira and Esther to a page with no WhatsApp section on it at all
   * (see the next test for the one case the link is real).
   */
  it('with WhatsApp on for Groundwork but the organisation’s own add-on off: told as hers to fix, with no dead link', async () => {
    billingWhatsAppOn = false
    billingWhatsAppSending = false
    billingWhatsAppSays = 'Your organisation has not turned on WhatsApp, so Groundwork does not send you reminders or summaries on WhatsApp.'
    serve()
    open(GRACE)
    const wa = await screen.findByRole('region', { name: 'WhatsApp' })
    await within(wa).findByText('Your organisation has not turned on WhatsApp, so Groundwork does not send your people reminders or summaries on WhatsApp.')
    expect(within(wa).queryByText('Your people check in by replying to Groundwork’s WhatsApp number. A reply is their check-in, exactly as if typed here.')).toBeNull()
    expect(within(wa).queryByText(/You can turn it on in/)).toBeNull()
    expect(within(wa).queryByRole('link', { name: 'Plan and billing' })).toBeNull()
  })

  /*
   * B-219 (REVIEW 5): MIRA'S ACTUAL SHAPE - `on` MISSING ENTIRELY (never `false`), `sending: false`.
   * The minimal shape an ordinary admin reads never sends `on` at all (`whatTheyRead`'s own branch
   * for everyone but a full admin read); only the test above forced `on: false` to pin the admin
   * shape's own case. This is what Mira, at Riverbank, actually got back, checked live against the
   * bed - the platform switch on, `on` undefined, `sending: false` - and (review 6) it must read
   * exactly the same as the test above: told as hers to fix, no dead "Plan and billing" link.
   */
  it('Mira’s real shape - `on` missing, `sending: false` - is read as off too, with no dead link', async () => {
    billingWhatsAppOn = undefined
    billingWhatsAppSending = false
    billingWhatsAppSays = 'Your organisation has not turned on WhatsApp, so Groundwork does not send you reminders or summaries on WhatsApp.'
    serve()
    open(GRACE)
    const wa = await screen.findByRole('region', { name: 'WhatsApp' })
    await within(wa).findByText('Your organisation has not turned on WhatsApp, so Groundwork does not send your people reminders or summaries on WhatsApp.')
    expect(within(wa).queryByText('Your people check in by replying to Groundwork’s WhatsApp number. A reply is their check-in, exactly as if typed here.')).toBeNull()
    expect(within(wa).queryByRole('link', { name: 'Plan and billing' })).toBeNull()
  })

  /*
   * B-219 (REVIEW 6): AND THE ONE CASE THE LINK IS REAL - PLAN AND BILLING HAS ACTUALLY TURNED ITS
   * OWN WHATSAPP PART ON. Once the server serves the full admin shape (`says` an object, the same
   * `isWhatsAppBillingAdmin` check BillingPage.tsx itself uses to draw that part), "You can turn it
   * on in Plan and billing" is true again, and the link goes somewhere real.
   */
  it('once Plan and billing actually shows its WhatsApp part: the link is there too', async () => {
    billingWhatsAppOn = false
    billingWhatsAppSending = false
    billingWhatsAppSays = 'Turn WhatsApp on for your organisation.'
    billingWhatsAppAdminShape = true
    serve()
    open(GRACE)
    const wa = await screen.findByRole('region', { name: 'WhatsApp' })
    await within(wa).findByText('Your organisation has not turned on WhatsApp, so Groundwork does not send your people reminders or summaries on WhatsApp.')
    await within(wa).findByText(/You can turn it on in/)
    expect(hrefOf(wa, 'Plan and billing')).toBe('/billing#billing-whatsapp')
  })

  /*
   * B-219 (REVIEW 4): AN ANSWER THE SERVER HAS NOT GIVEN YET IS NOT READ AS "OFF". The minimal
   * shape `GET /billing/whatsapp` serves while `release.planAndBillingNewParts` is off - every
   * admin in the sweep bed, checked live - carries no `on` field at all. Guessing "off" from its
   * absence would have been exactly as wrong as the bug this fixes, just for a different reason;
   * nothing is said until the server actually answers.
   */
  it('with no answer yet on the organisation’s own add-on: nothing extra is said', async () => {
    billingWhatsAppOn = undefined
    serve()
    open(GRACE)
    const wa = await screen.findByRole('region', { name: 'WhatsApp' })
    await waitFor(() => expect(getWhatsAppMock).toHaveBeenCalled())
    expect(within(wa).queryByText(/turn WhatsApp on/)).toBeNull()
  })

  it('while WhatsApp is not switched on, and she has no number of her own, the page does not mention it', async () => {
    whatsappOn = false
    serve()
    open(GRACE)
    await screen.findByRole('heading', { name: 'Your numbers' })
    await waitFor(() => expect(api.whatsapp).toHaveBeenCalled())
    expect(document.body.textContent).not.toMatch(/WhatsApp/)
  })

  it('a number of her own that she switched off stays, so she can switch it back on', async () => {
    whatsappOn = false
    serve({ connection: { ...CONNECTED, enabled: false } })
    open(GRACE)
    const wa = await screen.findByRole('region', { name: 'WhatsApp' })
    expect(within(wa).getByText('Switched off')).toBeTruthy()
  })

  it('"Your numbers", with only the rows something real stands behind', async () => {
    serve({ glance: { whatsapp: null, figures: { fromYourProduct: true } } })
    open(GRACE)
    const nums = await screen.findByRole('region', { name: 'Your numbers' })
    /* GROUP 1'S THIRD REVIEW: full plain sentences, not fragments. */
    expect(nums.textContent).toContain('Groundwork checks what people say against the numbers where the work shows up.')
    expect(nums.textContent).toContain('Your own product sends its numbers')
    expect(nums.textContent).toContain('Accounting or sales tools')
    expect(nums.textContent).toContain('Groundwork reads which invoices are paid and which deals are won.')
    await within(nums).findByText('Connected')
    expect(within(nums).getByText('Needs a key')).toBeTruthy()
    expect(nums.textContent).not.toMatch(/Paystack|Flutterwave|M-Pesa|spreadsheet|Upload|MarketView/)
  })

  /*
   * HAFSAH, 10 OCTOBER (B-144): ONE GROUPED BUTTON, NOT TWO, EACH OPENING A CHOICE INLINE.
   * This used to pin two separate buttons ("Set it up", "Connect"), both opening /settings/tools
   * with nothing to say which of the two somebody actually wanted. The second deep page audit
   * found all eleven of Connections' buttons collapsed into the one generic "Ask for access" page
   * that way. Hafsah's answer groups them as the prototype's own sections already are: one button
   * per group, opening the choice right there, which is then carried on to /settings/tools?want=.
   */
  it('"Your numbers" offers one "Connect" button, which opens a choice of the two things here', async () => {
    serve({ glance: { whatsapp: null, figures: { fromYourProduct: true } } })
    open(GRACE)
    const nums = await screen.findByRole('region', { name: 'Your numbers' })
    expect(within(nums).queryByRole('link', { name: 'Set it up' })).toBeNull()
    expect(within(nums).queryByRole('link', { name: 'Connect' })).toBeNull()
    fireEvent.click(within(nums).getByRole('button', { name: 'Connect' }))
    expect(within(nums).getByRole('radio', { name: /Your own product sends its numbers/ })).toBeTruthy()
    expect(within(nums).getByRole('radio', { name: /Accounting or sales tools/ })).toBeTruthy()
    const continueLink = within(nums).getByRole('button', { name: 'Continue' })
    expect(continueLink.hasAttribute('disabled')).toBe(true)
    fireEvent.click(within(nums).getByRole('radio', { name: /Accounting or sales tools/ }))
    expect(hrefOf(nums, 'Continue')).toBe('/settings/tools?want=accounting')
  })

  /* UPDATED 29 September, item 11: "Your own address" used to stay on the page as "Not set up",
     with nothing to press, on the reasoning that it "comes later". Hafsah's answer on item 11 asks
     for your own web address and logo to be left out entirely until they are built, so the section
     is gone rather than shown unset. */
  it('leaves out "Your own address" entirely - it is not built yet (item 11)', async () => {
    serve()
    open(GRACE)
    await screen.findByRole('region', { name: 'Your numbers' })
    expect(screen.queryByRole('region', { name: 'Your own address' })).toBeNull()
    expect(document.body.textContent).not.toMatch(/Your own address|Put Groundwork at an address on your own domain|Claude Code|Copy link|baridi\.co\.ke/)
  })

  it('notices in Slack or Teams: never what anyone said, arriving switched off, with the kind read from the address', async () => {
    serve()
    api.connectWorkspace.mockResolvedValue({ kind: 'SLACK', channelSaid: null, enabled: false })
    open(GRACE)
    const n = await screen.findByRole('region', { name: 'Notices in Slack or Teams' })
    expect(within(n).getByText('Not set up')).toBeTruthy()
    /* GROUP 1'S THIRD REVIEW: the notice sentence split in two, and "incoming-webhook" (jargon)
       is gone from both the placeholder and its label. */
    expect(n.textContent).toContain('Post a notice to a channel when a report is ready. A notice says something is ready and links to it. It never includes what anyone said, because more people read a channel than a check-in.')
    expect(n.textContent).toContain('It starts switched off. Send one test notice, check that it arrived, then switch it on.')
    fireEvent.change(within(n).getByRole('textbox', { name: 'The channel’s address from Slack or Teams' }), { target: { value: 'https://hooks.slack.com/services/T0/B0/x' } })
    fireEvent.click(within(n).getByRole('button', { name: 'Add it, switched off' }))
    await waitFor(() => expect(api.connectWorkspace).toHaveBeenCalledWith('slack', 'https://hooks.slack.com/services/T0/B0/x'))
  })

  /*
   * RESTORED (nothing-removed-screens.md item 3): live let an admin name the channel when
   * connecting it ("Channel, as you call it (optional)", sent as `channelSaid`); the connected
   * list already shows that name once saved, but there was no way to set one on a new connection.
   */
  it('naming the channel sends it alongside the address, and the list later shows it', async () => {
    serve()
    api.connectWorkspace.mockResolvedValue({ kind: 'SLACK', channelSaid: '#sales-leads', enabled: false })
    open(GRACE)
    const n = await screen.findByRole('region', { name: 'Notices in Slack or Teams' })
    fireEvent.change(within(n).getByRole('textbox', { name: 'The channel’s address from Slack or Teams' }), { target: { value: 'https://hooks.slack.com/services/T0/B0/x' } })
    fireEvent.change(within(n).getByRole('textbox', { name: 'The channel’s name (optional)' }), { target: { value: '#sales-leads' } })
    fireEvent.click(within(n).getByRole('button', { name: 'Add it, switched off' }))
    await waitFor(() => expect(api.connectWorkspace).toHaveBeenCalledWith('slack', 'https://hooks.slack.com/services/T0/B0/x', '#sales-leads'))
  })

  it('leaving the channel name blank connects with the address alone, same as before', async () => {
    serve()
    api.connectWorkspace.mockResolvedValue({ kind: 'SLACK', channelSaid: null, enabled: false })
    open(GRACE)
    const n = await screen.findByRole('region', { name: 'Notices in Slack or Teams' })
    fireEvent.change(within(n).getByRole('textbox', { name: 'The channel’s address from Slack or Teams' }), { target: { value: 'https://hooks.slack.com/services/T0/B0/x' } })
    fireEvent.click(within(n).getByRole('button', { name: 'Add it, switched off' }))
    await waitFor(() => expect(api.connectWorkspace).toHaveBeenCalledWith('slack', 'https://hooks.slack.com/services/T0/B0/x'))
  })

  it('a Teams address is added as Teams, and a connected channel can be tested, switched and removed', async () => {
    serve({ notifiers: [{ kind: 'TEAMS', channelSaid: null, enabled: false, lastPostedAt: null, lastError: null }] })
    api.connectWorkspace.mockResolvedValue({ kind: 'TEAMS', channelSaid: null, enabled: false })
    open(GRACE)
    const n = await screen.findByRole('region', { name: 'Notices in Slack or Teams' })
    await within(n).findByText('Teams')
    expect(within(n).getByRole('button', { name: 'Post a test' })).toBeTruthy()
    expect(within(n).getByRole('button', { name: 'Switch on' })).toBeTruthy()
    expect(within(n).getByRole('button', { name: 'Remove' })).toBeTruthy()
    fireEvent.change(within(n).getByRole('textbox', { name: 'The channel’s address from Slack or Teams' }), { target: { value: 'https://example.webhook.office.com/x' } })
    fireEvent.click(within(n).getByRole('button', { name: 'Add it, switched off' }))
    await waitFor(() => expect(api.connectWorkspace).toHaveBeenCalledWith('teams', 'https://example.webhook.office.com/x'))
  })

  it('"Figures from your other systems", before API access is asked for', async () => {
    serve()
    open(GRACE)
    const f = await screen.findByRole('region', { name: 'Figures from your other systems' })
    /* GROUP 1'S THIRD REVIEW: full sentences, and no "API". */
    expect(f.textContent).toContain('Send a number from your sales, billing or support system. It appears beside the goal it belongs to, marked as proven. A payment from your billing system, for example, fills in “sold”.')
    await within(f).findByText('This is for whoever runs your systems. Say what you want to use it for and accept the terms. Once we approve it, you can make keys and choose where we send updates.')
    expect(hrefOf(f, 'Ask to connect your own systems')).toBe('/settings/tools')
    expect(hrefOf(f, 'Read how it works')).toBe('/settings/tools')
  })

  it('"More you can connect": each one says whether a key allows it yet', async () => {
    serve({ creds: [{ id: 'k1', name: 'HR sync', clientId: 'gwc_1', sourceSystem: 'hr', scopes: ['graph:write'], lastUsedAt: null, revokedAt: null, replacedByClientId: null, createdAt: '' }] })
    open(GRACE)
    const more = await screen.findByRole('region', { name: 'More you can connect' })
    /* GROUP 1'S THIRD REVIEW: full sentences throughout. */
    expect(more.textContent).toContain('Each one means one less list you keep in two places.')
    const people = within(more).getByRole('region', { name: 'Your people come in' })
    expect(people.textContent).toContain('Your HR system tells Groundwork who works here and who they report to. People who join, change roles or leave are updated too.')
    await within(people).findByText('Connected')
    const brief = within(more).getByRole('region', { name: 'The brief before a hard conversation' })
    expect(brief.textContent).toContain('One page about one person, with what they said they would do, what they are waiting on, and what they raised. It never gives a score.')
    expect(within(brief).getByText('Needs a key')).toBeTruthy()
    const start = within(more).getByRole('region', { name: 'Start a check-in from your own system' })
    expect(within(start).getByText('Needs a key')).toBeTruthy()
    /*
     * GROUP 1 REVIEW: ONLY "START A CHECK-IN" AND "THE BRIEF" NEED A KEY. The other four cards here
     * are not backed by the credential system the way those two are - the prototype's own screen
     * (connections.txt) says "Not set up" for them, and saying "Needs a key" for every card here
     * was the fault sent back.
     */
    for (const name of ['Your goals come in', 'Roles and handovers', 'Your handbook']) {
      const region = within(more).getByRole('region', { name })
      expect(within(region).getByText('Not set up')).toBeTruthy()
      expect(within(region).queryByText('Needs a key')).toBeNull()
    }
  })

  /*
   * HAFSAH, 10 OCTOBER (B-144): ONE GROUPED "SET UP" BUTTON FOR THE WHOLE SECTION, NOT SIX.
   * This used to pin a "Set up" link on every card, each one opening /settings/tools with no way
   * to tell which of the six was meant. Grouped now, the same way as "Your numbers" above, with the
   * choice opening inline and carried on to /settings/tools?want=.
   */
  it('"More you can connect" offers one "Set up" button, which opens a choice of all six', async () => {
    serve()
    open(GRACE)
    const more = await screen.findByRole('region', { name: 'More you can connect' })
    expect(within(more).queryAllByRole('link', { name: 'Set up' })).toHaveLength(0)
    fireEvent.click(within(more).getByRole('button', { name: 'Set up' }))
    for (const title of ['Your people come in', 'Your goals come in', 'Roles and handovers', 'Your handbook', 'Start a check-in from your own system', 'The brief before a hard conversation']) {
      expect(within(more).getByRole('radio', { name: new RegExp(title) })).toBeTruthy()
    }
    fireEvent.click(within(more).getByRole('radio', { name: /Your handbook/ }))
    expect(hrefOf(more, 'Continue')).toBe('/settings/tools?want=handbook')
  })

  it('no label on a person anywhere on the page', async () => {
    serve({ connection: CONNECTED })
    open(GRACE)
    await screen.findByRole('region', { name: 'WhatsApp' })
    expect(document.body.textContent).not.toMatch(/\b(PIP|exit|at risk|score:|rating)\b/i)
  })

  /*
   * WALKTHROUGH PASS 2, ITEM 6: THE EXAMPLE CONSOLE'S PEOPLE ARE MADE UP, AND ITS CAPTIONS ARE FULL
   * SENTENCES. The tools page (IntegrationsPage.tsx) already warns that the people and companies in
   * its own examples are made up; the same two examples appear here, so the same warning applies.
   */
  it('says the people in the examples are made up, and reads the captions as full sentences', async () => {
    serve({ connection: CONNECTED })
    open(GRACE)
    const section = await screen.findByRole('region', { name: 'What these look like' })
    expect(within(section).getByText('Two examples. The people and companies in them are made up.')).toBeTruthy()
    expect(within(section).getByText('This is what it looks like on WhatsApp.')).toBeTruthy()
    expect(within(section).getByText('This is what it looks like inside your own tool.')).toBeTruthy()
  })

  it('names only one example when WhatsApp is not shown', async () => {
    whatsappOn = false
    serve({ connection: null })
    open(GRACE)
    const section = await screen.findByRole('region', { name: 'What these look like' })
    expect(within(section).getByText('One example. The people and companies in them are made up.')).toBeTruthy()
    expect(within(section).queryByText('This is what it looks like on WhatsApp.')).toBeNull()
    whatsappOn = true
  })
})

describe('Grace, an admin, connects WhatsApp step by step', () => {
  it('starts at step 2, with the prototype’s heading, lede and the three things to paste', async () => {
    serve()
    open(GRACE, 'whatsapp')
    /*
     * GROUP 1 REVIEW: THE PROTOTYPE'S OWN TITLE AREA (whatsapp.txt, whatsapp.jpg). "Settings" as
     * the title, the organisation's name as its subtitle, then a plain "Connections" link back -
     * never a "Settings / Connections" crumb joined with a slash.
     */
    expect(screen.getByRole('heading', { name: 'Settings' })).toBeTruthy()
    expect(screen.getByText('Baridi Appliances')).toBeTruthy()
    expect(screen.queryByText('Settings / Connections')).toBeNull()
    const connectionsLink = screen.getByRole('link', { name: 'Connections' })
    expect(connectionsLink.getAttribute('href')).toBe('/settings/connections')
    expect(connectionsLink.closest('nav')?.textContent).toBe('Connections')
    /* DECISION 112, 7 October: retitled, and its first sentence says it is optional and advanced,
       because Groundwork's own number already works for everyone without any of this. */
    expect(screen.getByRole('heading', { name: 'Use your organisation’s own WhatsApp number' })).toBeTruthy()
    expect(screen.getByText('This is optional and advanced. Groundwork’s own number already works for everyone, without any of this. Most of it happens in Meta’s settings. You can stop at any step, and what you have entered is kept.')).toBeTruthy()
    await screen.findByText('Paste three things from Meta')
    for (const [label, hint] of [
      ['Phone number ID', 'You find it in Meta, under WhatsApp, then API Setup.'],
      ['Access token', 'Use a permanent token from a system user, not the one that lasts 24 hours. You find it in Meta, under Business Settings, then System users.'],
      ['App secret', 'You find it in Meta, under your app, then Settings, then Basic.'],
    ]) {
      expect(screen.getByText(label)).toBeTruthy()
      expect(screen.getByText(hint)).toBeTruthy()
    }
    expect(screen.getByText(/A Meta Business account, a WhatsApp Business number on it, and a Meta app with WhatsApp added\./)).toBeTruthy()
    /* PLAIN WORDS, NOT "id" (group 1 review, CLAUDE.md's banned-jargon list). */
    expect(screen.getByText('Your WhatsApp Business account ID, if you have one')).toBeTruthy()
    expect(screen.queryByText('WhatsApp Business Account id (optional)')).toBeNull()
    /* GROUP 1 RE-REVIEW, FAULT F: this read as plain grey text, not a link, with nothing to show
       it was clickable. Underlined now, the same style "Read them" and other in-sentence links
       already use. */
    const howToGetThese = screen.getByRole('link', { name: 'How to get these' })
    expect(howToGetThese).toBeTruthy()
    expect(howToGetThese.className).toContain('gwui-plain-link')
    expect(screen.queryByText('Done')).toBeNull()
    /*
     * A STEP STILL TO COME IS PLAIN TEXT, NOT A BUTTON (Hafsah, 30 September, item 2: "no more
     * buttons than the prototype's own version of that screen has"). This used to render these
     * as a `<button>` that let somebody peek at a later step's body early - which the prototype's
     * own screen (whatsapp.txt) does not offer, and which put this page over the prototype's own
     * button count. Updated together with the fix, in WhatsAppSetupPage.tsx.
     */
    for (const later of ['Tell Meta where to send replies', 'Send yourself a test', 'Approve the reminder messages', 'Turn it on, and choose who uses it']) {
      expect(screen.getByText(later)).toBeTruthy()
      expect(screen.queryByRole('button', { name: later })).toBeNull()
    }
    /* THE STEPS SIT FLAT ON THE PAGE (group 1 review), not inside a white Panel whose left border
       used to run through the middle of each step's numbered circle. */
    expect(document.querySelector('.gwui-numsteps')?.closest('.gwui-panel')).toBeNull()
    expect(screen.getByText('Keep your number on your own system instead')).toBeTruthy()
    expect(screen.getByText('If your WhatsApp number already runs through your own customer system, it can pass check-in messages to us and send our replies back. Nothing moves to Meta. Whoever runs your systems sets this up with a key.')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Read how this works' }).getAttribute('href')).toBe('/settings/tools')
  })

  it('"Connect" needs all three the first time, and sends them to the server', async () => {
    serve()
    api.connectWhatsapp.mockResolvedValue({ connection: CONNECTED, webhookPath: '/x' })
    open(GRACE, 'whatsapp')
    const connect = await screen.findByRole('button', { name: 'Connect' })
    expect((connect as HTMLButtonElement).disabled).toBe(true)
    fireEvent.change(screen.getByRole('textbox', { name: 'Phone number ID' }), { target: { value: '109822345561' } })
    fireEvent.change(screen.getByLabelText('Access token'), { target: { value: 'EAA-token' } })
    fireEvent.change(screen.getByLabelText('App secret'), { target: { value: 'secret' } })
    fireEvent.click(connect)
    await waitFor(() => expect(api.connectWhatsapp).toHaveBeenCalledWith(expect.objectContaining({ phoneNumberId: '109822345561', accessToken: 'EAA-token', appSecret: 'secret' })))
  })

  it('once saved, step 3 shows the address and token to copy, and waits for Meta', async () => {
    serve({ connection: { ...CONNECTED, webhookProvenAt: null, lastOutboundAt: null } })
    open(GRACE, 'whatsapp')
    await screen.findByText('You find it in Meta, under WhatsApp, then Configuration, then Webhook. Paste these two, then subscribe to', { exact: false })
    expect((screen.getByRole('textbox', { name: 'Callback address' }) as HTMLInputElement).value).toContain('/api/v1/webhooks/whatsapp/org-baridi')
    expect((screen.getByRole('textbox', { name: 'Verify token' }) as HTMLInputElement).value).toBe('gwv_7f3a91c2')
    expect(screen.getAllByRole('button', { name: 'Copy' })).toHaveLength(2)
    expect(screen.getByText('Waiting for Meta to check the address. This page updates on its own.')).toBeTruthy()
    expect(screen.getByText('Not proven yet')).toBeTruthy()
    expect(screen.getAllByText('Done')).toHaveLength(2)
  })

  it('never shows the token or the app secret back', async () => {
    serve({ connection: CONNECTED })
    open(GRACE, 'whatsapp')
    await screen.findByText('Whoever sets up a check-in chooses whether people answer it here or on WhatsApp.')
    expect((screen.getByLabelText('Access token') as HTMLInputElement).value).toBe('')
    expect((screen.getByLabelText('App secret') as HTMLInputElement).value).toBe('')
  })

  it('with a sealed key that cannot be opened, the sentence shows at the top and step 2 reopens with the fields to retype it, even with everything else done', async () => {
    serve({
      connection: { ...CONNECTED, keysNeedTypingAgain: true, keysNeedTypingAgainSays: "Your number's keys need to be typed in again. Nothing is sent from your number until they are." },
      wa: { canStartAConversation: true, approvedHere: ['gw_session_ready', 'gw_opening', 'gw_report'] },
    })
    open(GRACE, 'whatsapp')
    const note = await screen.findByRole('alert')
    expect(note.textContent).toBe("Your number's keys need to be typed in again. Nothing is sent from your number until they are.")
    expect(screen.getByLabelText('Access token')).toBeTruthy()
    expect(screen.getByLabelText('App secret')).toBeTruthy()
    /* Every step, including step 2, is still marked done - a sealed key does not undo that - and
       step 2's own content keeps rendering regardless, which is what shows the fields. */
    await waitFor(() => expect(screen.getAllByText('Done')).toHaveLength(6))
  })

  it('with everything done, steps 5 and 6 carry today’s words and the switch', async () => {
    serve({ connection: CONNECTED, wa: { canStartAConversation: true, approvedHere: ['gw_session_ready', 'gw_opening', 'gw_report'] } })
    api.setWhatsappEnabled.mockResolvedValue({ connection: { ...CONNECTED, enabled: false } })
    open(GRACE, 'whatsapp')
    await screen.findByText('Save what Meta approved')
    expect(screen.getAllByText('Done')).toHaveLength(6)
    expect(screen.getByText('Whoever sets up a check-in chooses whether people answer it here or on WhatsApp.')).toBeTruthy()
    expect(screen.getByText('On WhatsApp the questions are short and in plain everyday words, one at a time, the way you would ask somebody in person. People can answer in 2 languages, and the check-in carries on in whichever they use: English, Swahili.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Switch off' }))
    await waitFor(() => expect(api.setWhatsappEnabled).toHaveBeenCalledWith(false))
  })
})

describe('the wording on these pages', () => {
  const read = (f: string) => readFileSync(join(__dirname, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
  it('joins no pieces with a spaced dash, an arrow or a dot', () => {
    for (const f of ['ConnectionsPage.tsx', 'WhatsAppSetupPage.tsx']) {
      const text = read(f)
      expect(text, f).not.toMatch(/ - [A-Za-z]| → | · /)
    }
  })
})
