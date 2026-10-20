import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { integrationsApi, type Credential } from '@/api/integrations'
import { billingApi, isWhatsAppBillingAdmin } from '@/api/billing'
import { useAuthStore } from '@/stores/auth'
import { useWhatsAppIsOn } from '@/lib/whatsapp-is-on'
import { possessiveOf } from '@/lib/a-possessive'
import { Confirm } from '@/components/gw/a-second-press-before-it-is-gone'
import { WhatsAppKeysNeedTypingAgainNote, WhatsAppKeysRetypeForm } from './WhatsAppKeysNeedTypingAgain'
import { THIS_IS_FOR_YOUR_OWN_NUMBER, WithPeopleAndSetupLinked } from './a-team-members-number-goes-on-people-and-setup'
import {
  Page, PageTitle, Section, Panel, Stack, SubHeading, FieldRows, FieldRow, Button, Tag, TextField, Note, Folded, OpsConsoleExample, WhatsAppConversationExample,
} from '@/components/gw/ui'

/**
 * B-144, HAFSAH, 10 OCTOBER: FEWER, GROUPED BUTTONS, NOT ELEVEN SEPARATE ONES.
 *
 * The second deep page audit found that "Your numbers" (2 buttons) and "More you can connect"
 * (6 buttons) all opened the same page, /settings/tools, which - before API access is approved -
 * offers only one plain "Ask for access" box, with nothing carried over to say which of the eight
 * things someone actually pressed. Grouped here as the prototype's own sections already are
 * ("Your numbers", "More you can connect"): one button per group opens a choice, right there,
 * of what inside that group to connect, and only then goes on to /settings/tools?want=<key> -
 * which the choice is carried forward to (see WANT below), so the specific thing somebody asked
 * for still reaches Groundwork, in `whatFor`, exactly where that free-text request already lived.
 * "Figures from your other systems" keeps its own two buttons: one asks, the other only reads -
 * two different actions, not eleven answers to the same question.
 */
export type WantKey = 'product' | 'accounting' | 'people' | 'goals' | 'roles' | 'handbook' | 'start' | 'brief'

export const SCOPE_FOR = {
  people: 'graph:write',
  goals: 'subjects:write',
  roles: 'handovers:read',
  handbook: 'knowledge:write',
  start: 'grounds:write',
  brief: 'handovers:read',
  figures: 'graph:write',
} as const

export const WANT: Record<WantKey, { title: string; sentence: string; scope?: string }> = {
  product: {
    title: 'Your own product sends its numbers',
    sentence: 'I want our own product to send Groundwork its usage numbers.',
  },
  accounting: {
    title: 'Accounting or sales tools',
    sentence: 'I want to connect our accounting or sales tools, so Groundwork reads which invoices are paid and which deals are won.',
    scope: SCOPE_FOR.figures,
  },
  people: {
    title: 'Your people come in',
    sentence: 'I want our people to come in from our HR system, with joiners, movers and leavers kept up to date.',
    scope: SCOPE_FOR.people,
  },
  goals: {
    title: 'Your goals come in',
    sentence: 'I want our goals, projects and decisions to come in from wherever we keep them.',
    scope: SCOPE_FOR.goals,
  },
  roles: {
    title: 'Roles and handovers',
    sentence: 'I want roles and handovers connected, so a handover leaves a written brief.',
    scope: SCOPE_FOR.roles,
  },
  handbook: {
    title: 'Your handbook',
    sentence: 'I want our handbook connected, so people can ask it questions in plain words.',
    scope: SCOPE_FOR.handbook,
  },
  start: {
    title: 'Start a check-in from your own system',
    sentence: 'I want to start a check-in from our own system.',
    scope: SCOPE_FOR.start,
  },
  brief: {
    title: 'The brief before a hard conversation',
    sentence: 'I want the brief before a hard conversation.',
    scope: SCOPE_FOR.brief,
  },
}

/**
 * One button that opens a choice inline, then carries it on to `/settings/tools?want=<key>`. The
 * choice stays open until "Continue" is pressed, so pressing the group's button is never itself a
 * commitment to one specific thing - only choosing one, and continuing, is.
 */
export function GroupedConnect({ label, groupName, options }: {
  label: string
  groupName: string
  options: { key: WantKey; title: string; status: ReactNode }[]
}) {
  const [open, setOpen] = useState(false)
  const [choice, setChoice] = useState<WantKey | null>(null)
  if (!open) {
    return <Button kind="secondary" size="small" onClick={() => setOpen(true)}>{label}</Button>
  }
  return (
    <Stack gap={10}>
      <fieldset className="gwui-check-list">
        <legend className="gwui-field-help">Choose what you want to connect.</legend>
        {options.map(o => (
          <label key={o.key} className="gwui-check-row">
            <input type="radio" name={groupName} checked={choice === o.key} onChange={() => setChoice(o.key)} />
            <span>{o.title} {o.status}</span>
          </label>
        ))}
      </fieldset>
      <div className="gwui-invite-actions">
        <Button kind="secondary" size="small" to={choice ? `/settings/tools?want=${choice}` : undefined} disabled={!choice}>Continue</Button>
        <button type="button" className="gwui-plain-link" onClick={() => { setOpen(false); setChoice(null) }}>Never mind</button>
      </div>
    </Stack>
  )
}

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
 * GROUNDWORK'S OWN NUMBER IS THE DEFAULT (decision 112, 7 October). This section leads with how
 * WhatsApp works on Groundwork's own number - people reply to it, and an admin turns it on for the
 * organisation in Plan and billing - and says so whether or not the organisation has connected a
 * number of its own. Setting up an organisation's own WhatsApp number is folded shut at the bottom,
 * under "Advanced", and stays shut unless an organisation already has one connected: then it is
 * shown plainly, as connected, the way it always has been. The keys-need-typing-again warning is
 * never folded, because it needs action.
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
type MoreKey = 'people' | 'goals' | 'roles' | 'handbook' | 'start' | 'brief'
const MORE: { key: MoreKey; title: string; line: string; needsKey?: boolean }[] = [
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
      <Section
        heading="Your numbers"
        note="Groundwork checks what people say against the numbers where the work shows up."
        action={(
          <GroupedConnect
            label="Connect"
            groupName="connect-your-numbers"
            options={[
              { key: 'product', title: WANT.product.title, status: <Tag tone={glance.data?.figures?.fromYourProduct ? 'proven' : 'plain'}>{glance.data?.figures?.fromYourProduct ? 'Connected' : 'Not set up'}</Tag> },
              { key: 'accounting', title: WANT.accounting.title, status: hasAKeyFor(creds.data, SCOPE_FOR.figures) ? <Tag tone="proven">Connected</Tag> : <Tag tone="plain">Needs a key</Tag> },
            ]}
          />
        )}
      >
        <FieldRows>
          <FieldRow
            label="Your own product sends its numbers"
            value={<span>Your own product sends Groundwork its usage numbers.</span>}
            action={<Tag tone={glance.data?.figures?.fromYourProduct ? 'proven' : 'plain'}>{glance.data?.figures?.fromYourProduct ? 'Connected' : 'Not set up'}</Tag>}
          />
          <FieldRow
            label="Accounting or sales tools"
            value={<span>Groundwork reads which invoices are paid and which deals are won.</span>}
            action={!hasAKeyFor(creds.data, SCOPE_FOR.figures) ? <Tag tone="plain">Needs a key</Tag> : undefined}
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

      <Section
        heading="More you can connect"
        note="Each one means one less list you keep in two places."
        action={(
          <GroupedConnect
            label="Set up"
            groupName="connect-more"
            options={MORE.map(m => ({
              key: m.key,
              title: m.title,
              status: hasAKeyFor(creds.data, SCOPE_FOR[m.key])
                ? <Tag tone="proven">Connected</Tag>
                : m.needsKey
                  ? <Tag tone="attention">Needs a key</Tag>
                  : <Tag tone="plain">Not set up</Tag>,
            }))}
          />
        )}
      >
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
  /*
   * B-219 (REVIEW 4): THE ORGANISATION'S OWN ADD-ON, NOT WHETHER WHATSAPP IS ON FOR GROUNDWORK AS
   * A WHOLE. `useWhatsAppIsOn` reads `GET /auth/whatsapp`, the platform switch every screen checks
   * before mentioning WhatsApp at all (it stays in `showWhatsApp`, above, for exactly that) - it is
   * not whether THIS organisation has paid for the add-on. Mira, at Riverbank (the add-on off),
   * read no way to turn it on, because the platform switch was on and this sentence asked that one
   * instead. Plan and billing's own switch reads the organisation's add-on from `GET
   * /billing/whatsapp` (`billingApi.getWhatsApp`, `.on`) - the same call and the same field Plan
   * and billing itself draws its switch from - so this reads that instead.
   *
   * `billingWhatsApp.on` CAN BE MISSING, NOT JUST FALSE. The minimal shape an ordinary admin reads
   * while `release.planAndBillingNewParts` is off (`whatsapp-add-on.service.ts`,
   * `whatTheyRead`) sends only `{ sending, says }` - no `on` field at all, checked live against this
   * bed, signed in as Mira and as Grace (whose organisation's add-on actually IS on): both got back
   * `on: undefined`.
   *
   * B-219 (REVIEW 5): `on: undefined` IS NOT THE ONLY THING THE MINIMAL SHAPE SAYS. It never sends
   * `on` by design (`whatTheyRead` above, the branch an ordinary admin reads), so waiting for
   * `on === false` meant this never fired for Mira at all: she is on the platform switch (this
   * section only renders while `showWhatsApp` is true), and `sending: false` is exactly the minimal
   * shape's own way of saying her organisation cannot send - checked live against the bed, Mira
   * reads `sending: false` where Grace (whose add-on is genuinely on) reads `sending: true`. So
   * "the platform switch is on and the server answers `sending: false`" is now also read as off,
   * alongside the admin shape's own explicit `on === false`, and Grace's `sending: true` still
   * shows nothing here, exactly as before.
   */
  const billingWhatsApp = useQuery({ queryKey: ['billing-whatsapp'], queryFn: billingApi.getWhatsApp })
  const orgWhatsAppAddOnOff = billingWhatsApp.data?.on === false || billingWhatsApp.data?.sending === false
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

  const whose = orgName ? `${possessiveOf(orgName)} WhatsApp Business number` : 'your WhatsApp Business number'
  /* Switched on but not finished (Drop Access, 21 October): the server says Groundwork's own number is in use, and this says so. */
  const notInUse = !!connection?.enabled && connection.inUse === false && !!connection.notInUseSays
  return (
    <Section heading="WhatsApp" action={connection ? <Tag tone={notInUse ? 'attention' : connection.enabled ? 'proven' : 'plain'}>{notInUse ? 'Not finished' : connection.enabled ? 'Connected' : 'Switched off'}</Tag> : undefined}>
      <Panel>
        {connection ? (
          <Stack gap={12}>
            <WhatsAppKeysNeedTypingAgainNote connection={connection} />
            {connection.keysNeedTypingAgain && <WhatsAppKeysRetypeForm connection={connection} />}
            {notInUse ? (
              <>
                <p className="gwui-panel-text-muted">{connection.notInUseSays}</p>
                <p className="gwui-panel-text-muted"><WithPeopleAndSetupLinked text={THIS_IS_FOR_YOUR_OWN_NUMBER} /></p>
              </>
            ) : (
            <p className="gwui-panel-text-muted">
              {connection.displayNumber
                ? <>Your people check in by replying to <b>{connection.displayNumber}</b>, {whose}. A reply is their check-in, exactly as if typed here.</>
                : <>Your people check in by replying to {whose}. A reply is their check-in, exactly as if typed here.</>}
            </p>
            )}
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
            {/*
             * GROUNDWORK'S OWN NUMBER IS THE DEFAULT (decision 112). While an organisation has not
             * connected a number of its own, this is what is true for it: people already check in
             * by replying to Groundwork's own number, and an admin turns WhatsApp on for the
             * organisation in Plan and billing - never a push towards setting up its own number.
             *
             * B-219: THAT SECOND SENTENCE WAS SAID WHETHER WHATSAPP WAS ON OR OFF, and (review 4)
             * by the wrong fact once it was gated at all - see `orgWhatsAppAddOnOff`'s own note,
             * above, for which switch this reads now and why "unknown" is treated as "on", not
             * "off". Said only while the organisation's own add-on is confirmed off, and as "you",
             * since this whole page is already admin-only (`ConnectionsPage`'s own
             * `if (!isAdmin) return <OnlyAnAdmin />` above). Nothing extra is said while it is on,
             * or while the server has not said either way; the first sentence already describes it
             * working.
             *
             * B-219 (REVIEW 5): AND THE FIRST SENTENCE ITSELF WAS UNTRUE ONCE THE ADD-ON WAS
             * CONFIRMED OFF. Mira, at Riverbank, read "Your people check in by replying to
             * Groundwork's WhatsApp number" - nobody's replies go anywhere, her organisation has
             * not turned WhatsApp on. While the add-on is off, this shows a sentence about it
             * instead, with the link to go turn it on right after it.
             *
             * B-219 (REVIEW 6): THE FIRST SENTENCE SPOKE TO HER AS A MEMBER, AND THE SECOND LINKED
             * TO A PART OF PLAN AND BILLING THAT ISN'T THERE AT RELEASE. `whatsAppOffSays` is the
             * server's own sentence for the Settings page (SettingsPage.tsx), where a lead or member
             * reads it about themselves ("does not send you reminders"); on this page the reader is
             * always an admin (`ConnectionsPage`'s own `if (!isAdmin) return <OnlyAnAdmin />` above),
             * so it is said as hers to fix, not as something that happens to her. And "You can turn
             * it on in Plan and billing" is only true once Plan and billing actually draws its own
             * WhatsApp part - gated there by the very same `isWhatsAppBillingAdmin(billingWhatsApp)`
             * read below, which is false while the release has not turned that part on. For Mira
             * and Esther, both WhatsApp off, that part was hidden and this link went nowhere.
             */}
            {orgWhatsAppAddOnOff ? (
              <>
                <p className="gwui-panel-text-muted">Your organisation has not turned on WhatsApp, so Groundwork does not send your people reminders or summaries on WhatsApp.</p>
                {isWhatsAppBillingAdmin(billingWhatsApp.data) && (
                  <p className="gwui-panel-text-muted">You can turn it on in <Link className="gwui-plain-link" to="/billing#billing-whatsapp">Plan and billing</Link>.</p>
                )}
              </>
            ) : (
              <p className="gwui-panel-text-muted">Your people check in by replying to Groundwork’s WhatsApp number. A reply is their check-in, exactly as if typed here.</p>
            )}
          </Stack>
        )}
      </Panel>

      {/*
       * B-231: "Advanced: use your organisation's own WhatsApp number" JOINED TWO PIECES WITH A
       * COLON - the wording rule rules that out wherever a person reads. The fold's own label
       * already marks this as the less-common path; the summary itself only needs to say what is
       * inside it.
       */}
      {!connection && (
        <Folded summary="Use your organisation’s own WhatsApp number" note={<Tag tone="plain">Not set up</Tag>}>
          <Stack gap={12}>
            <p className="gwui-panel-text-muted">Most organisations never need this. Groundwork’s own number already works for everyone.</p>
            <Button kind="secondary" size="small" to="/settings/whatsapp">Set it up</Button>
          </Stack>
        </Folded>
      )}
    </Section>
  )
}

function NoticesSection({ notifiers }: { notifiers: { kind: 'SLACK' | 'TEAMS'; channelSaid: string | null; enabled: boolean; lastPostedAt: string | null; lastError: string | null }[] }) {
  const qc = useQueryClient()
  const [url, setUrl] = useState('')
  /*
   * RESTORED (nothing-removed-screens.md item 3): live let an admin name the channel when
   * connecting it (IntegrationsPage.tsx line 930, "Channel, as you call it (optional)", sent as
   * `channelSaid`), and the connections list already shows that name once one is saved
   * ("Slack, #sales-leads" above) - but ours had no way to set it on a new connection. The API
   * already accepts a third argument (`integrationsApi.connectWorkspace`); only sent when
   * something was typed, so the call a reconnecting admin already relies on is unchanged.
   */
  const [channel, setChannel] = useState('')
  const refresh = () => qc.invalidateQueries({ queryKey: ['integrations', 'workspace'] })
  const add = useMutation({
    mutationFn: () => {
      const named = channel.trim()
      return named
        ? integrationsApi.connectWorkspace(kindOf(url), url.trim(), named)
        : integrationsApi.connectWorkspace(kindOf(url), url.trim())
    },
    onSuccess: () => { setUrl(''); setChannel(''); refresh(); toast.success('Connected, and switched off until you test it and turn it on.') },
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
            {/*
              B-236: AT 1024px THE PLACEHOLDERS WERE CUT OFF MID-WORD ("Paste the channel's addres",
              "The channel's name, if you") - the two fields share a row with the "Add it, switched
              off" button (`.gwui-invite-actions`), which leaves each field too narrow to show its
              full placeholder at this width. A visible help line above the row says the whole thing
              once, in full, and the placeholders themselves are shortened to short, complete
              phrases that are never cut off.
            */}
            <p className="gwui-fine">Paste the channel’s address from Slack or Teams, and name it if you want the name shown.</p>
            <div className="gwui-invite-actions">
              <TextField placeholder="Channel address" value={url} onChange={e => setUrl(e.target.value)} aria-label="The channel’s address from Slack or Teams" />
              <TextField placeholder="Channel name (optional)" value={channel} onChange={e => setChannel(e.target.value)} aria-label="The channel’s name (optional)" />
              <Button kind="secondary" size="small" type="submit" disabled={!url.trim().startsWith('https://') || add.isPending}>Add it, switched off</Button>
            </div>
          </form>
          <p className="gwui-fine">It starts switched off. Send one test notice, check that it arrived, then switch it on.</p>
        </Stack>
      </Panel>
    </Section>
  )
}
