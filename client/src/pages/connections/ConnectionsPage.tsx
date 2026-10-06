import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { integrationsApi, type Credential } from '@/api/integrations'
import { useAuthStore } from '@/stores/auth'
import { useWhatsAppIsOn } from '@/lib/whatsapp-is-on'
import { Confirm } from '@/components/gw/a-second-press-before-it-is-gone'
import {
  Page, PageTitle, Section, Panel, Stack, SubHeading, FieldRows, FieldRow, Button, Tag, TextField, Note, OpsConsoleExample, WhatsAppConversationExample,
} from '@/components/gw/ui'

/**
 * CONNECTIONS (F1, #/settings/connections, group 1 of the screens rebuilt from the shared parts).
 * The wording is copied from docs/prototype/screens/F1-connections/connections.txt.
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
 * Nothing here builds the feature; this only stops mentioning it.
 *
 * REBUILT FROM THE SHARED PARTS: `Page`/`PageTitle` for the frame, `Section`/`Panel` for each block,
 * `FieldRows`/`FieldRow` for "Your numbers", `Tag` for every state ("Connected", "Not set up",
 * "Needs a key"…), and the standard `Button`/`Note`. The two pictures under "What these look like"
 * keep the product's own screenshots (not the prototype's sample drawings, already a documented
 * decision above), inside a plain two-up grid.
 */

/** Anybody but an admin, whatever door they came in by. Today's words from the Connect page. */
export function OnlyAnAdmin() {
  return (
    <Page>
      <PageTitle title="Connections" subtitle="Only an admin in your organisation can set this up. Ask whoever manages Groundwork for your organisation." />
    </Page>
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

/**
 * "NEEDS A KEY" ONLY WHERE A KEY IS THE NEXT STEP (group 1 review): every card here used to say
 * "Needs a key" - true of "Start a check-in from your own system" and "The brief before a hard
 * conversation", the two backed directly by a credential on "Connect your own tools", but not of
 * the other four, which the prototype's own screen (connections.txt) says are simply "Not set up".
 */
const MORE: { key: keyof typeof SCOPE_FOR; title: string; line: string; needsKey?: boolean }[] = [
  { key: 'people', title: 'Your people come in', line: 'Your HR system tells Groundwork who works here and who they report to. People who join, change roles or leave are updated too.' },
  { key: 'goals', title: 'Your goals come in', line: 'Groundwork reads your goals, projects and decisions from wherever you keep them. Groundwork points at yours instead of copying them.' },
  { key: 'roles', title: 'Roles and handovers', line: 'Groundwork knows who holds each role and since when, so a handover leaves a written brief.' },
  { key: 'handbook', title: 'Your handbook', line: 'People can ask your documents questions in plain words. Each answer quotes the page it came from.' },
  { key: 'start', title: 'Start a check-in from your own system', line: 'Your system opens a check-in and sends people the link. It is told when the check-in is done, but never what anyone said.', needsKey: true },
  { key: 'brief', title: 'The brief before a hard conversation', line: 'One page about one person, with what they said they would do, what they are waiting on, and what they raised. It never gives a score.', needsKey: true },
]

/** The counts, said as a person would say them, one or many. */
export function countLines(g: { people: number; checkInsThisMonth: number; failedThisWeek: number }) {
  return [
    { n: g.people, says: g.people === 1 ? 'person checking in on WhatsApp' : 'people checking in on WhatsApp' },
    { n: g.checkInsThisMonth, says: g.checkInsThisMonth === 1 ? 'check-in this month' : 'check-ins this month' },
    { n: g.failedThisWeek, says: g.failedThisWeek === 1 ? 'failed message this week' : 'failed messages this week' },
  ]
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
    <Page>
      <PageTitle title="Settings" subtitle={orgName} />

      {glance.isError && <Note tone="error">Connections did not load.</Note>}

      {showWhatsApp && <WhatsAppSection orgName={orgName} glance={glance.data?.whatsapp ?? null} />}

      {/* FIELDROWS SIT FLAT (Hafsah, 30 September, the setting row): `srow` in the prototype has
          no side padding and sits on the page, not inside a white Panel - see FieldRow.tsx. */}
      <Section heading="Your numbers" note="Groundwork checks what people say against the numbers where the work shows up.">
        <FieldRows>
          <FieldRow
            label="Your own product sends its numbers"
            value={<span>Your own product sends Groundwork its usage numbers.</span>}
            action={(
              <span className="gwui-invite-actions">
                <Tag tone={glance.data?.figures.fromYourProduct ? 'proven' : 'plain'}>{glance.data?.figures.fromYourProduct ? 'Connected' : 'Not set up'}</Tag>
                <Button kind="secondary" size="small" to="/settings/tools">Set it up</Button>
              </span>
            )}
          />
          <FieldRow
            label="Accounting or sales tools"
            value={<span>Groundwork reads which invoices are paid and which deals are won.</span>}
            action={(
              <span className="gwui-invite-actions">
                {!hasAKeyFor(creds.data, SCOPE_FOR.figures) && <Tag tone="plain">Needs a key</Tag>}
                <Button kind="secondary" size="small" to="/settings/tools">Connect</Button>
              </span>
            )}
          />
        </FieldRows>
      </Section>

      <NoticesSection notifiers={notifiers.data ?? []} />

      <Section
        heading="Figures from your other systems"
        action={<Tag tone={access.data?.approved ? 'proven' : 'plain'}>{access.data?.approved ? 'Approved' : access.data?.status === 'PENDING' ? 'Waiting for an answer' : 'Not set up'}</Tag>}
      >
        <Panel>
          <Stack gap={10}>
            <p className="gwui-panel-text-muted">Send a number from your sales, billing or support system. It appears beside the goal it belongs to, marked as proven. A payment from your billing system, for example, fills in “sold”.</p>
            <div className="gwui-invite-actions">
              {!access.data?.approved && <Button kind="secondary" size="small" to="/settings/tools">Ask to connect your own systems</Button>}
              <Button kind="quiet" size="small" to="/settings/tools">Read how it works</Button>
            </div>
            {!access.data?.approved && (
              <p className="gwui-fine">This is for whoever runs your systems. Say what you want to use it for and accept the terms. Once we approve it, you can make keys and choose where we send updates.</p>
            )}
          </Stack>
        </Panel>
      </Section>

      <Section heading="More you can connect" note="Each one means one less list you keep in two places.">
        <div className="gwui-two-up">
          {MORE.map(m => (
            <Panel key={m.key} role="region" aria-label={m.title}>
              <Stack gap={10}>
                <SubHeading>{m.title}</SubHeading>
                <p className="gwui-panel-text-muted">{m.line}</p>
                <div className="gwui-sentence-row">
                  {hasAKeyFor(creds.data, SCOPE_FOR[m.key])
                    ? <Tag tone="proven">Connected</Tag>
                    : m.needsKey
                      ? <Tag tone="attention">Needs a key</Tag>
                      : <Tag tone="plain">Not set up</Tag>}
                  <Button kind="quiet" size="small" to="/settings/tools">Set up</Button>
                </div>
              </Stack>
            </Panel>
          ))}
        </div>
      </Section>

      {/*
        * WALKTHROUGH PASS 2, ITEM 6: THE PEOPLE IN THE EXAMPLE CONSOLE ARE MADE UP, SAID HERE TOO.
        * The tools page already says this (IntegrationsPage.tsx, "How it looks inside your own
        * tool"); the same examples appear here, so the same warning applies, in its own words.
        */}
      <Section heading="What these look like" note={`${showWhatsApp ? 'Two examples' : 'One example'}. The people and companies in them are made up.`}>
        <div className="gwui-two-up">
          {showWhatsApp && (
            <Panel pad={false}>
              <figure>
                <div className="gwui-console-frame"><WhatsAppConversationExample /></div>
                <figcaption className="gwui-panel-row"><b>This is what it looks like on WhatsApp.</b></figcaption>
              </figure>
            </Panel>
          )}
          <Panel pad={false}>
            <figure>
              <div className="gwui-console-frame"><OpsConsoleExample /></div>
              <figcaption className="gwui-panel-row"><b>This is what it looks like inside your own tool.</b></figcaption>
            </figure>
          </Panel>
        </div>
      </Section>
    </Page>
  )
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
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Meta did not send it. Check the number and try again.'),
  })
  const disconnect = useMutation({
    mutationFn: () => integrationsApi.disconnectWhatsapp(),
    onSuccess: () => { setSure(false); qc.invalidateQueries({ queryKey: ['integrations'] }); qc.invalidateQueries({ queryKey: ['whatsapp-is-on'] }); toast.success('Removed.') },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'The connection was not removed. Try again.'),
  })

  const whose = orgName ? `${orgName}’s WhatsApp Business number` : 'your WhatsApp Business number'
  return (
    <Section heading="WhatsApp" action={connection ? <Tag tone={connection.enabled ? 'proven' : 'plain'}>{connection.enabled ? 'Connected' : 'Switched off'}</Tag> : <Tag tone="plain">Not set up</Tag>}>
      <Panel>
        {connection ? (
          <Stack gap={12}>
            <p className="gwui-panel-text-muted">
              {connection.displayNumber
                ? <>Your people check in by replying to <b>{connection.displayNumber}</b>, {whose}. A reply is their check-in, exactly as if typed here.</>
                : <>Your people check in by replying to {whose}. A reply is their check-in, exactly as if typed here.</>}
            </p>
            {glance && (
              <div className="gwui-stat-row">
                {countLines(glance).map(c => (
                  <div key={c.says}><p className="gwui-stat-num">{c.n}</p><p className="gwui-stat-label">{c.says}</p></div>
                ))}
              </div>
            )}
            {testing && (
              <form onSubmit={e => { e.preventDefault(); if (to.trim()) test.mutate() }}>
                <div className="gwui-invite-actions">
                  <TextField placeholder="+2348012345678" value={to} onChange={e => setTo(e.target.value)} aria-label="Number to send a test to" />
                  <Button kind="primary" size="small" type="submit" disabled={!to.trim() || test.isPending}>{test.isPending ? 'Sending…' : 'Send a test message'}</Button>
                </div>
              </form>
            )}
            <div className="gwui-invite-actions">
              {!testing && <Button kind="secondary" size="small" onClick={() => setTesting(true)}>Send a test message</Button>}
              <Button kind="quiet" size="small" to="/settings/whatsapp">Reminder messages</Button>
              <Button kind="quiet" size="small" to="/settings/whatsapp">Change the number</Button>
              <Button kind="quiet" size="small" onClick={() => setSure(true)}>Disconnect</Button>
            </div>
            {sure && (
              <Confirm
                saying="Remove the WhatsApp connection? Nothing sent or received is deleted."
                confirmLabel="Disconnect" keepLabel="Keep it" pending={disconnect.isPending} pendingLabel="Removing…"
                onConfirm={() => disconnect.mutate()} onKeep={() => setSure(false)}
              />
            )}
          </Stack>
        ) : (
          <Stack gap={12}>
            <p className="gwui-panel-text-muted">People check in by replying to your organisation’s WhatsApp number.</p>
            <Button kind="secondary" size="small" to="/settings/whatsapp">Set it up</Button>
          </Stack>
        )}
      </Panel>
    </Section>
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
    <Section heading="Notices in Slack or Teams" action={notifiers.length === 0 ? <Tag tone="plain">Not set up</Tag> : <Tag tone={anyOn ? 'proven' : 'plain'}>{anyOn ? 'Connected' : 'Switched off'}</Tag>}>
      <Panel>
        <Stack gap={12}>
          <p className="gwui-panel-text-muted">Post a notice to a channel when a report is ready. A notice says something is ready and links to it. It never includes what anyone said, because more people read a channel than a check-in.</p>
          {notifiers.map(n => {
            const kind = n.kind === 'SLACK' ? 'slack' : 'teams'
            return (
              <div key={n.kind}>
                <div className="gwui-sentence-row">
                  <p className="gwui-panel-text">
                    <b>{n.kind === 'SLACK' ? 'Slack' : 'Teams'}{n.channelSaid ? `, ${n.channelSaid}` : ''}</b>{' '}
                    <Tag tone={n.enabled ? 'proven' : 'plain'}>{n.enabled ? 'On' : 'Off'}</Tag>
                  </p>
                  <div className="gwui-invite-actions">
                    <Button kind="secondary" size="small" onClick={() => test.mutate(kind)} disabled={test.isPending}>Post a test</Button>
                    <Button kind="quiet" size="small" onClick={() => turn.mutate({ kind, on: !n.enabled })}>{n.enabled ? 'Switch off' : 'Switch on'}</Button>
                    <Button kind="quiet" size="small" onClick={() => setSure(kind)}>Remove</Button>
                  </div>
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
          <form onSubmit={e => { e.preventDefault(); if (url.trim().startsWith('https://')) add.mutate() }}>
            <div className="gwui-invite-actions">
              <TextField placeholder="Paste the channel’s address from Slack or Teams" value={url} onChange={e => setUrl(e.target.value)} aria-label="The channel’s address from Slack or Teams" />
              <Button kind="secondary" size="small" type="submit" disabled={!url.trim().startsWith('https://') || add.isPending}>Add it, switched off</Button>
            </div>
          </form>
          <p className="gwui-fine">It starts switched off. Send one test notice, check that it arrived, then switch it on.</p>
        </Stack>
      </Panel>
    </Section>
  )
}
