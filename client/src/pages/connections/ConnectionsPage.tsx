import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { integrationsApi, type Credential } from '@/api/integrations'
import { useAuthStore } from '@/stores/auth'
import { useWhatsAppIsOn } from '@/lib/whatsapp-is-on'
import { Button, Tag } from '@/components/gw/kit'
import { Confirm } from '@/components/gw/a-second-press-before-it-is-gone'

/**
 * CONNECTIONS (F1, #/settings/connections, U.18). The wording is copied from
 * docs/prototype/screens/F1-connections/connections.txt.
 *
 * Admins only, on the server (every endpoint read here is @Roles(ADMIN)) and at the door (App.tsx).
 * Each section is read from the endpoint that manages that connection; the three WhatsApp counts
 * and whether your product's numbers arrived come from GET /integrations/connections.
 *
 * WHATSAPP IS SHOWN ONLY WHILE IT IS SWITCHED ON (Hafsah, 26 September): on in Groundwork, or through
 * the organisation's own number. An organisation that has connected its own number and switched it
 * off still sees it here, or it could never switch it back on.
 *
 * LEFT OUT, because nothing real stands behind them (docs/morning-report-ui.md, item 29):
 * "Paystack, Flutterwave or M-Pesa" and "A weekly spreadsheet" (no such connection exists, and
 * not-to-build.md rules out pretend ones); the line under "Your numbers" ("Totals only…"), which
 * promises a rule nothing enforces; "Hand it to your developer, or to Claude Code" (no setup link
 * exists); the sample drawings under "What these look like", which are replaced by the product's own
 * pictures.
 *
 * "YOUR OWN ADDRESS" IS LEFT OUT ENTIRELY, NOT SHOWN AS "NOT SET UP" (Hafsah, 29 September, item 11).
 * It used to stay on the page with nothing to press, on the reasoning that it "comes later" - but
 * item 11 asks for it to be left out until it is actually built, the same as your own logo, so
 * nobody is offered a door that leads nowhere. Nothing here builds the feature; this only stops
 * mentioning it.
 *
 * WORDING NO SCREEN SHOWS, in the fewest plain words (item 29): "Switched off"; "Needs a key" on
 * "Accounting or sales tools"; "Usage numbers, sent by your own product."; "Waiting for an answer";
 * the singular counts; and "Connections did not load."
 */

/** Anybody but an admin, whatever door they came in by. Today's words from the Connect page. */
export function OnlyAnAdmin() {
  return (
    <div className="gw-you gw-conn">
      <h1 className="gw-t-title gw-suites-h1">Connections</h1>
      <p className="gw-you-sub">Only an admin in your organisation can set this up. Ask whoever manages Groundwork for your organisation.</p>
    </div>
  )
}

const SCOPE_FOR = {
  people: 'graph:write',
  goals: 'subjects:write',
  roles: 'handovers:read',
  handbook: 'knowledge:write',
  start: 'grounds:write',
  brief: 'handovers:read',
  figures: 'graph:write',
} as const

export function hasAKeyFor(creds: Credential[] | undefined, scope: string): boolean {
  return (creds ?? []).some(c => !c.revokedAt && c.scopes.includes(scope))
}

/** Slack's incoming webhooks live at one address; anything else pasted here is taken as Teams. */
export function kindOf(url: string): 'slack' | 'teams' {
  return /^https:\/\/hooks\.slack\.com\//i.test(url.trim()) ? 'slack' : 'teams'
}

export function ConnectionsPage() {
  const user = useAuthStore(s => s.user)
  const isAdmin = user?.role === 'ADMIN'
  const orgName = user?.organization?.name?.trim() || user?.organizationName || ''
  const whatsappOn = useWhatsAppIsOn()

  const glance = useQuery({ queryKey: ['integrations', 'glance'], queryFn: integrationsApi.atAGlance, enabled: isAdmin, retry: false })
  const whatsapp = useQuery({ queryKey: ['integrations', 'whatsapp'], queryFn: integrationsApi.whatsapp, enabled: isAdmin })
  const creds = useQuery({ queryKey: ['integrations', 'credentials'], queryFn: integrationsApi.listCredentials, enabled: isAdmin })
  const access = useQuery({ queryKey: ['integrations', 'access'], queryFn: integrationsApi.myApiAccess, enabled: isAdmin, retry: false })
  const notifiers = useQuery({ queryKey: ['integrations', 'workspace'], queryFn: integrationsApi.workspaceNotifiers, enabled: isAdmin })

  const connection = whatsapp.data?.connection ?? null
  const showWhatsApp = whatsappOn || !!connection

  if (!isAdmin) return <OnlyAnAdmin />

  return (
    <div className="gw-you gw-conn">
      <h1 className="gw-t-title gw-suites-h1">Settings</h1>
      {orgName && <p className="gw-suites-org">{orgName}</p>}

      {glance.isError && (
        <p role="alert" className="gw-t-body gw-you-quiet">Connections did not load.</p>
      )}

      {showWhatsApp && <WhatsAppSection orgName={orgName} glance={glance.data?.whatsapp ?? null} />}

      <section className="gw-conn-sec" aria-labelledby="conn-numbers">
        <div className="gw-you-section-head">
          <h2 id="conn-numbers" className="gw-t-h2">Your numbers</h2>
          <span className="gw-t-tiny">So what people say is checked against where the work shows up</span>
        </div>
        <ul className="gw-you-card gw-conn-rows">
          <li>
            <b>Your own product sends its numbers</b>
            <span>Usage numbers, sent by your own product.</span>
            <Tag tone={glance.data?.figures.fromYourProduct ? 'proven' : 'plain'}>{glance.data?.figures.fromYourProduct ? 'Connected' : 'Not set up'}</Tag>
            <Button kind="secondary" size="small" to="/settings/tools">Set it up</Button>
          </li>
          <li>
            <b>Accounting or sales tools</b>
            <span>Invoices paid, deals won.</span>
            {hasAKeyFor(creds.data, SCOPE_FOR.figures) ? <span /> : <Tag tone="plain">Needs a key</Tag>}
            <Button kind="secondary" size="small" to="/settings/tools">Connect</Button>
          </li>
        </ul>
      </section>

      <NoticesSection notifiers={notifiers.data ?? []} />

      <section className="gw-conn-sec" aria-labelledby="conn-figures">
        <div className="gw-you-section-head">
          <h2 id="conn-figures" className="gw-t-h2">Figures from your other systems</h2>
          <Tag tone={access.data?.approved ? 'proven' : 'plain'}>
            {access.data?.approved ? 'Approved' : access.data?.status === 'PENDING' ? 'Waiting for an answer' : 'Not set up'}
          </Tag>
        </div>
        <div className="gw-you-card">
          <p>Send a figure from your CRM, billing or support desk, and it sits beside the goal it belongs to, as proven. A payment from your billing system, for example, fills in “sold”.</p>
          <div className="gw-conn-actions">
            {!access.data?.approved && <Button kind="secondary" size="small" to="/settings/tools">Ask for API access</Button>}
            <Button kind="quiet" size="small" to="/settings/tools">Read how it works</Button>
          </div>
          {!access.data?.approved && (
            <p className="gw-t-tiny gw-you-quiet">For whoever runs your systems. Say what it’s for and accept the terms; keys, webhooks and delivery logs open once access is approved.</p>
          )}
        </div>
      </section>

      <section className="gw-conn-sec" aria-labelledby="conn-more">
        <div className="gw-you-section-head">
          <h2 id="conn-more" className="gw-t-h2">More you can connect</h2>
          <span className="gw-t-tiny">Each one means one less list to keep in two places</span>
        </div>
        <div className="gw-you-grid">
          {MORE.map(m => (
            <section key={m.key} className="gw-you-card" aria-labelledby={`conn-more-${m.key}`}>
              <h3 id={`conn-more-${m.key}`} className="gw-t-h3">{m.title}</h3>
              <p>{m.line}</p>
              <div className="gw-conn-actions gw-conn-spread">
                {hasAKeyFor(creds.data, SCOPE_FOR[m.key]) ? <Tag tone="proven">Connected</Tag> : <Tag tone="attention">Needs a key</Tag>}
                <Button kind="quiet" size="small" to="/settings/tools">Set up</Button>
              </div>
            </section>
          ))}
        </div>
      </section>

      <section className="gw-conn-sec" aria-labelledby="conn-look">
        <h2 id="conn-look" className="gw-t-h2">What these look like</h2>
        <div className="gw-you-grid gw-conn-pictures">
          {showWhatsApp && (
            <figure>
              <figcaption className="gw-t-small"><b>On WhatsApp</b></figcaption>
              <img src="/connect/whatsapp.png" alt="A check-in over WhatsApp" />
            </figure>
          )}
          <figure>
            <figcaption className="gw-t-small"><b>Inside your own tool</b></figcaption>
            <img src="/connect/ops-panel.png" alt="Groundwork inside an organisation’s own tool" />
          </figure>
        </div>
      </section>
    </div>
  )
}

const MORE: { key: keyof typeof SCOPE_FOR; title: string; line: string }[] = [
  { key: 'people', title: 'Your people come in', line: 'Who works here and who they report to, from your HR system. Joiners, movers and leavers arrive too.' },
  { key: 'goals', title: 'Your goals come in', line: 'Goals, projects and decisions from wherever you keep them. Groundwork points at yours instead of copying them.' },
  { key: 'roles', title: 'Roles and handovers', line: 'Who holds which role and since when, so a handover leaves a written brief.' },
  { key: 'handbook', title: 'Your handbook', line: 'Documents people can ask in plain words; the answer quotes the page it came from.' },
  { key: 'start', title: 'Start a check-in from your own system', line: 'Your system opens one, sends people the link, and is told when it’s done. Never what anyone said.' },
  { key: 'brief', title: 'The brief before a hard conversation', line: 'One page on one person: what they said they’d do, what they’re waiting on, what they raised. Never a score.' },
]

/** The counts, said as a person would say them, one or many. */
export function countLines(g: { people: number; checkInsThisMonth: number; failedThisWeek: number }) {
  return [
    { n: g.people, says: g.people === 1 ? 'person checking in on WhatsApp' : 'people checking in on WhatsApp' },
    { n: g.checkInsThisMonth, says: g.checkInsThisMonth === 1 ? 'check-in this month' : 'check-ins this month' },
    { n: g.failedThisWeek, says: g.failedThisWeek === 1 ? 'failed message this week' : 'failed messages this week' },
  ]
}

function WhatsAppSection({ orgName, glance }: { orgName: string; glance: { people: number; checkInsThisMonth: number; failedThisWeek: number } | null }) {
  const qc = useQueryClient()
  const whatsapp = useQuery({ queryKey: ['integrations', 'whatsapp'], queryFn: integrationsApi.whatsapp })
  const connection = whatsapp.data?.connection ?? null
  const [testing, setTesting] = useState(false)
  const [to, setTo] = useState('')
  const [sure, setSure] = useState(false)
  const test = useMutation({
    mutationFn: () => integrationsApi.testWhatsapp(to),
    onSuccess: () => { toast.success('Sent. Check that phone.'); setTesting(false); setTo('') },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Meta refused it.'),
  })
  const disconnect = useMutation({
    mutationFn: () => integrationsApi.disconnectWhatsapp(),
    onSuccess: () => { setSure(false); qc.invalidateQueries({ queryKey: ['integrations'] }); qc.invalidateQueries({ queryKey: ['whatsapp-is-on'] }); toast.success('Removed.') },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'The connection was not removed. Try again.'),
  })

  const whose = orgName ? `${orgName}’s WhatsApp Business number` : 'your WhatsApp Business number'
  return (
    <section className="gw-conn-sec" aria-labelledby="conn-whatsapp">
      <div className="gw-you-section-head">
        <h2 id="conn-whatsapp" className="gw-t-h2">WhatsApp</h2>
        {connection ? <Tag tone={connection.enabled ? 'proven' : 'plain'}>{connection.enabled ? 'Connected' : 'Switched off'}</Tag> : <Tag tone="plain">Not set up</Tag>}
      </div>
      <div className="gw-you-card">
        {connection ? (
          <>
            <p>
              {connection.displayNumber
                ? <>Your people check in by replying to <b>{connection.displayNumber}</b>, {whose}. A reply is their check-in, exactly as if typed here.</>
                : <>Your people check in by replying to {whose}. A reply is their check-in, exactly as if typed here.</>}
            </p>
            {glance && (
              <dl className="gw-conn-counts">
                {countLines(glance).map(c => (
                  <div key={c.says}><dt className="gw-t-h3">{c.n}</dt><dd className="gw-t-tiny">{c.says}</dd></div>
                ))}
              </dl>
            )}
            {testing && (
              <form className="gw-conn-actions" onSubmit={e => { e.preventDefault(); if (to.trim()) test.mutate() }}>
                <input className="gw-input" placeholder="+2348012345678" value={to} onChange={e => setTo(e.target.value)} aria-label="Number to send a test to" />
                <Button kind="primary" size="small" type="submit" disabled={!to.trim() || test.isPending}>{test.isPending ? 'Sending…' : 'Send a test message'}</Button>
              </form>
            )}
            <div className="gw-conn-actions">
              {!testing && <Button kind="secondary" size="small" onClick={() => setTesting(true)}>Send a test message</Button>}
              <Button kind="quiet" size="small" to="/settings/whatsapp">Reminder messages</Button>
              <Button kind="quiet" size="small" to="/settings/whatsapp">Change the number</Button>
              <button type="button" className="gw-b gw-b-quiet gw-b-small gw-conn-danger" onClick={() => setSure(true)}>Disconnect</button>
            </div>
            {sure && (
              <Confirm
                saying="Remove the WhatsApp connection? Nothing sent or received is deleted."
                confirmLabel="Disconnect" keepLabel="Keep it" pending={disconnect.isPending} pendingLabel="Removing…"
                onConfirm={() => disconnect.mutate()} onKeep={() => setSure(false)}
              />
            )}
          </>
        ) : (
          <>
            <p>People check in by replying to your organisation’s WhatsApp number.</p>
            <div className="gw-conn-actions">
              <Button kind="secondary" size="small" to="/settings/whatsapp">Set it up</Button>
            </div>
          </>
        )}
      </div>
    </section>
  )
}

function NoticesSection({ notifiers }: { notifiers: { kind: 'SLACK' | 'TEAMS'; channelSaid: string | null; enabled: boolean; lastPostedAt: string | null; lastError: string | null }[] }) {
  const qc = useQueryClient()
  const [url, setUrl] = useState('')
  const refresh = () => qc.invalidateQueries({ queryKey: ['integrations', 'workspace'] })
  const add = useMutation({
    mutationFn: () => integrationsApi.connectWorkspace(kindOf(url), url.trim()),
    onSuccess: () => { setUrl(''); refresh(); toast.success('Connected, and switched off until you test it and turn it on.') },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Could not connect that address.'),
  })
  const test = useMutation({
    mutationFn: (kind: 'slack' | 'teams') => integrationsApi.testWorkspace(kind),
    onSuccess: (r) => { r.posted ? toast.success('Posted. Check the channel.') : toast.error(r.because ?? 'It did not post.'); refresh() },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'The test did not post.'),
  })
  const turn = useMutation({
    mutationFn: ({ kind, on }: { kind: 'slack' | 'teams'; on: boolean }) => integrationsApi.turnWorkspace(kind, on),
    onSuccess: refresh,
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'That did not change.'),
  })
  const remove = useMutation({
    mutationFn: (kind: 'slack' | 'teams') => integrationsApi.disconnectWorkspace(kind),
    onSuccess: refresh,
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Could not remove it.'),
  })
  const [sure, setSure] = useState<'slack' | 'teams' | null>(null)
  const anyOn = notifiers.some(n => n.enabled)

  return (
    <section className="gw-conn-sec" aria-labelledby="conn-notices">
      <div className="gw-you-section-head">
        <h2 id="conn-notices" className="gw-t-h2">Notices in Slack or Teams</h2>
        {notifiers.length === 0 ? <Tag tone="plain">Not set up</Tag> : <Tag tone={anyOn ? 'proven' : 'plain'}>{anyOn ? 'Connected' : 'Switched off'}</Tag>}
      </div>
      <div className="gw-you-card">
        <p>Post a notice to a channel when a report is ready. A notice says something is ready and links to it; it never includes what anyone said, because a channel is read by more people than a check-in.</p>
        {notifiers.map(n => {
          const kind = n.kind === 'SLACK' ? 'slack' : 'teams'
          return (
            <div key={n.kind} className="gw-conn-notifier">
              <div>
                <b>{n.kind === 'SLACK' ? 'Slack' : 'Teams'}{n.channelSaid ? `, ${n.channelSaid}` : ''}</b>{' '}
                <Tag tone={n.enabled ? 'proven' : 'plain'}>{n.enabled ? 'On' : 'Off'}</Tag>
              </div>
              <div className="gw-conn-actions">
                <Button kind="secondary" size="small" onClick={() => test.mutate(kind)} disabled={test.isPending}>Post a test</Button>
                <Button kind="quiet" size="small" onClick={() => turn.mutate({ kind, on: !n.enabled })}>{n.enabled ? 'Switch off' : 'Switch on'}</Button>
                <Button kind="quiet" size="small" onClick={() => setSure(kind)}>Remove</Button>
              </div>
              {sure === kind && (
                <Confirm
                  saying="Forget this address? Nothing already posted is deleted."
                  confirmLabel="Remove it" keepLabel="Keep it" pending={remove.isPending} pendingLabel="Removing…"
                  onConfirm={() => { remove.mutate(kind); setSure(null) }} onKeep={() => setSure(null)}
                />
              )}
            </div>
          )
        })}
        <form className="gw-conn-actions" onSubmit={e => { e.preventDefault(); if (url.trim().startsWith('https://')) add.mutate() }}>
          <input className="gw-input gw-conn-grow" placeholder="Paste the channel’s incoming-webhook address" value={url} onChange={e => setUrl(e.target.value)} aria-label="The channel’s incoming-webhook address" />
          <Button kind="secondary" size="small" type="submit" disabled={!url.trim().startsWith('https://') || add.isPending}>Add it, switched off</Button>
        </form>
        <p className="gw-t-tiny gw-you-quiet">It arrives switched off. Send one test notice, see it land, then turn it on.</p>
      </div>
    </section>
  )
}
