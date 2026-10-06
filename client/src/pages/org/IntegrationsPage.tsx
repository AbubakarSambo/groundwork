import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { API_ORIGIN } from '@/lib/where-the-api-lives'
import { integrationsApi } from '@/api/integrations'
import { useAuthStore } from '@/stores/auth'
import { useWhatsAppIsOn } from '@/lib/whatsapp-is-on'
import { useAreYouSure, Confirm } from '@/components/gw/a-second-press-before-it-is-gone'
import { copy } from '@/components/gw/copying-can-fail'
import { whenItWas } from '@/lib/a-date-reads-the-same-everywhere'
import { OnlyAnAdmin } from '@/pages/connections/ConnectionsPage'
import {
  Page, PageTitle, Section, Panel, Stack, FieldRows, FieldRow, Folded, Steps, Step,
  Button, Tag, TextField, TextArea, Select, FieldLabel, Note, OpsConsoleExample, EmbedWidgetExample, WhatsAppConversationExample,
} from '@/components/gw/ui'

/**
 * CONNECT YOUR OWN TOOLS (F1, #/settings/tools, group 1 of the screens rebuilt from the shared
 * parts). Wording copied from docs/prototype/screens/F1-connections/tools.txt; the prototype's own
 * JS (s5.js/s14.js/s33.js/s34.js) is read only for structure and which button is which kind, never
 * for wording (CLAUDE.md).
 *
 * Admins only, on the server (every endpoint read here is @Roles(ADMIN)) and at the door (App.tsx).
 *
 * REBUILT FROM THE SHARED PARTS: `Page`/`PageTitle` for the frame and crumb back to Connections,
 * `Section`/`Panel`/`FieldRows` for every block, `Folded` for the two things this page does that
 * the prototype's own screen has no place for (see below), and the standard
 * `Button`/`Tag`/`TextField`/`TextArea`/`Note`.
 *
 * ONE PRIMARY BUTTON ON THE WHOLE PAGE (Hafsah, 30 September, item 3): the prototype's own screen
 * actually draws TWO navy buttons ("Describe it" and "Make a key", s34.js's `buildOnSec`/
 * `ownScreensSec`) - but neither of those two sections has anything real behind it in this product
 * (see the note on them below), so the question does not arise here: every button this page keeps
 * is the prototype's own secondary or quiet weight ("Create a key", "Open the developer docs",
 * "Copy", "Add", "Rotate secret", "Remove", "Replay", "Change" are all `btn sec` or `btn quiet` in
 * the prototype's own source), and this page carries no primary button at all.
 *
 * LEFT OUT, BECAUSE NOTHING REAL STANDS BEHIND THEM (matching the standard ConnectionsPage.tsx
 * already sets for this kind of gap):
 *  - "Add your own" (a field, a board or a suite, built from a plain-English description) and
 *    "Build your own screens" / "Make a key" (a read-and-chat key for a customer's own app) are
 *    both drawn in tools.txt, but neither has any backing API in this product today - there is no
 *    endpoint that stores a described field/board/suite, and no "read and chat" key kind
 *    alongside the credential scopes this page already offers. Drawing them would be exactly the
 *    pretend feature not-to-build.md rules out. Not built here; flagged for whoever picks up that
 *    backend work.
 *  - "Hand this to your developer, or to Claude Code" (a setup link plus ready-made Claude Code
 *    instructions, s33.js) has no generated link or instructions text anywhere in the product
 *    either. Left out for the same reason.
 *
 * KEPT, BUT IN THE PROTOTYPE'S OWN STYLE ("a quiet link, or a folded section", Hafsah's own words
 * for this task), because tools.txt has no place for them at all:
 *  - "What your imports could not take" sits in a `Folded` panel, closed until there is something
 *    to show.
 *  - The curl examples for an engineer - two requests, the bulk push, the CRM evidence push,
 *    opening a check-in, and the before-a-conversation read - sit under "For your engineer", a
 *    `Folded` panel too.
 *  - The embed setup's placement (floating or anchored) and the departments it should never show
 *    to, which tools.txt's own "Show Groundwork inside your own tool" does not picture, sit under
 *    a `Folded` "More options" inside that section, so the fields stay reachable without adding
 *    visible controls the prototype's own screen does not have.
 *
 * "Terms accepted by Grace Achieng" (tools.txt) is not shown: nothing this API returns records who
 * accepted the terms, only when and for what. Said plainly rather than invented.
 */

const SCOPES: { key: string; label: string; sub: string }[] = [
  { key: 'graph:write', label: 'Send people', sub: 'Who works here and who reports to whom' },
  { key: 'graph:read', label: 'Read back your roles', sub: 'The roles configured here, so a system can check what it sent arrived' },
  { key: 'subjects:write', label: 'Send objectives', sub: 'Objectives, projects and decisions, with their measures and owners' },
  { key: 'knowledge:write', label: 'Send your handbook', sub: 'Documents people can then ask in plain words' },
  { key: 'grounds:write', label: 'Open check-ins', sub: 'Start one from your own system' },
  { key: 'checkins:write', label: 'Link a check-in', sub: 'Attach an existing one to an objective. This does less than opening one.' },
  { key: 'findings:read', label: 'Read findings', sub: 'Read what Groundwork found missing, with no owner, or described two different ways' },
  { key: 'handovers:read', label: 'Read the brief about one person', sub: 'A handover brief, and what a lead should read before a conversation' },
  { key: 'reports:read', label: 'Read reports', sub: 'Everybody’s account of a period, once released' },
  { key: 'proposals:read', label: 'Read proposed changes', sub: 'Changes Groundwork suggests to an objective' },
  { key: 'proposals:write', label: 'Resolve proposed changes', sub: 'Accept or decline them from your side' },
  { key: 'chat:write', label: 'Ask from your own app', sub: 'The panel you embed, asking on behalf of one person' },
]

/** A plain sentence saying what a key can do, from the scopes it was granted. */
function whatItCanDo(scopes: string[]): string {
  const verbs = SCOPES.filter(s => scopes.includes(s.key)).map(s => s.label[0].toLowerCase() + s.label.slice(1))
  return verbs.length ? `Can ${verbs.join(', ')}.` : 'Cannot do anything yet.'
}

const EVENTS: { key: string; sentence: string }[] = [
  { key: 'report.shared', sentence: 'A report is shared' },
  { key: 'checkin.completed', sentence: 'Someone finishes a check-in' },
  { key: 'blocker.raised', sentence: 'A blocker is raised' },
  { key: 'commitment.due', sentence: 'A commitment is due' },
]

export function IntegrationsPage() {
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const isAdmin = user?.role === 'ADMIN'
  const orgName = user?.organization?.name?.trim() || user?.organizationName || ''
  const whatsappOn = useWhatsAppIsOn()
  const sure = useAreYouSure<string>()

  const [creatingKey, setCreatingKey] = useState(false)
  const [credName, setCredName] = useState('')
  const [credScopes, setCredScopes] = useState<string[]>(['subjects:write', 'findings:read'])
  const [freshSecret, setFreshSecret] = useState<{ clientId: string; clientSecret: string } | null>(null)

  const [hookUrl, setHookUrl] = useState('')
  const [hookEvents, setHookEvents] = useState<string[]>(['checkin.completed'])
  const [freshHookSecret, setFreshHookSecret] = useState<string | null>(null)

  const [whatFor, setWhatFor] = useState('')
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [termsOpen, setTermsOpen] = useState(false)

  const [retentionDays, setRetentionDays] = useState('')
  const [changingRetention, setChangingRetention] = useState(false)

  const [embedDomains, setEmbedDomains] = useState('')
  const [embedPlacement, setEmbedPlacement] = useState<'floating' | 'anchor'>('floating')
  const [embedOutOfScope, setEmbedOutOfScope] = useState('')
  const [embedSecret, setEmbedSecret] = useState<string | null>(null)

  const [openJob, setOpenJob] = useState<string | null>(null)

  const creds = useQuery({ queryKey: ['integrations', 'credentials'], queryFn: integrationsApi.listCredentials, enabled: isAdmin })
  const access = useQuery({ queryKey: ['integrations', 'access'], queryFn: integrationsApi.myApiAccess, enabled: isAdmin, retry: false })
  const terms = useQuery({ queryKey: ['integrations', 'terms'], queryFn: integrationsApi.apiTerms, enabled: isAdmin })
  const events = useQuery({ queryKey: ['integrations', 'events'], queryFn: integrationsApi.webhookEvents, enabled: isAdmin })
  const endpoints = useQuery({ queryKey: ['integrations', 'endpoints'], queryFn: integrationsApi.listEndpoints, enabled: isAdmin })
  const deliveries = useQuery({ queryKey: ['integrations', 'deliveries'], queryFn: () => integrationsApi.deliveries(), enabled: isAdmin })
  const embed = useQuery({ queryKey: ['integrations', 'embed'], queryFn: integrationsApi.embedConfig, enabled: isAdmin })
  const retention = useQuery({ queryKey: ['integrations', 'retention'], queryFn: integrationsApi.retention, enabled: isAdmin })
  const imports = useQuery({ queryKey: ['integrations', 'imports'], queryFn: integrationsApi.listImports, enabled: isAdmin })
  const jobDetail = useQuery({
    queryKey: ['integrations', 'imports', openJob],
    queryFn: () => integrationsApi.importDetail(openJob!),
    enabled: !!openJob,
  })

  const firstClientId = (creds.data ?? []).find(c => !c.revokedAt)?.clientId ?? null

  const openDocs = useMutation({
    mutationFn: integrationsApi.docsLink,
    onSuccess: (r) => { window.open(`${API_ORIGIN}${r.path}`, '_blank', 'noreferrer') },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'The reference could not be opened.'),
  })
  const askForAccess = useMutation({
    mutationFn: () => integrationsApi.askForApiAccess(whatFor, acceptedTerms),
    onSuccess: () => { setWhatFor(''); qc.invalidateQueries({ queryKey: ['integrations', 'access'] }) },
  })
  const issue = useMutation({
    mutationFn: () => integrationsApi.issueCredential(credName, credScopes),
    onSuccess: c => {
      setFreshSecret({ clientId: c.clientId, clientSecret: c.clientSecret })
      setCredName('')
      setCreatingKey(false)
      qc.invalidateQueries({ queryKey: ['integrations', 'credentials'] })
    },
    onError: (e: any) => toast.error(e?.message ?? 'Could not issue that key.'),
  })
  const revoke = useMutation({
    mutationFn: integrationsApi.revokeCredential,
    onSuccess: () => { toast.success('Revoked.'); sure.disarm(); qc.invalidateQueries({ queryKey: ['integrations', 'credentials'] }) },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Could not revoke it. The key still works.'),
  })
  const replace = useMutation({
    mutationFn: integrationsApi.replaceCredential,
    onSuccess: (issued) => {
      setFreshSecret({ clientId: issued.clientId, clientSecret: issued.clientSecret })
      qc.invalidateQueries({ queryKey: ['integrations', 'credentials'] })
      toast.success('New secret issued. The old one keeps working until you revoke it.')
    },
    onError: () => toast.error('Could not replace that. Nothing was issued, and the old one is unchanged.'),
  })
  const register = useMutation({
    mutationFn: () => integrationsApi.registerEndpoint(hookUrl, hookEvents),
    onSuccess: e => { setFreshHookSecret(e.secret); setHookUrl(''); qc.invalidateQueries({ queryKey: ['integrations', 'endpoints'] }) },
    onError: (e: any) => toast.error(e?.message ?? 'That address could not be added. Check it and try again.'),
  })
  const rotate = useMutation({
    mutationFn: integrationsApi.rotateSecret,
    onSuccess: r => { setFreshHookSecret(r.secret); sure.disarm(); qc.invalidateQueries({ queryKey: ['integrations', 'endpoints'] }) },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Could not rotate the secret. The old one is unchanged.'),
  })
  const reactivate = useMutation({
    mutationFn: integrationsApi.reactivateEndpoint,
    onSuccess: () => { toast.success('Switched back on. New updates are sent to it again.'); qc.invalidateQueries({ queryKey: ['integrations', 'endpoints'] }) },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Could not switch it back on.'),
  })
  const removeEndpoint = useMutation({
    mutationFn: integrationsApi.removeEndpoint,
    onSuccess: () => { sure.disarm(); qc.invalidateQueries({ queryKey: ['integrations', 'endpoints'] }) },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Could not remove it. It is still registered.'),
  })
  const replay = useMutation({
    mutationFn: integrationsApi.replay,
    onSuccess: r => {
      toast.success(r.delivered ? 'Delivered.' : 'Tried again. It failed again.')
      qc.invalidateQueries({ queryKey: ['integrations', 'deliveries'] })
    },
  })
  const saveRetention = useMutation({
    mutationFn: () => integrationsApi.setRetention(Number(retentionDays)),
    onSuccess: (r) => { qc.setQueryData(['integrations', 'retention'], r); setRetentionDays(''); setChangingRetention(false); toast.success(`Kept for ${r.turnRetentionDays} days after somebody leaves.`) },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'That could not be saved.'),
  })
  const setUpEmbed = useMutation({
    mutationFn: () => integrationsApi.setUpEmbed({
      allowedDomains: embedDomains.split('\n').map(d => d.trim()).filter(Boolean),
      placement: embedPlacement,
      outOfScopeDepartments: embedOutOfScope.split(',').map(d => d.trim()).filter(Boolean),
    }),
    onSuccess: (r) => { setEmbedSecret(r.signingSecret); qc.invalidateQueries({ queryKey: ['integrations', 'embed'] }); toast.success('Saved. Copy the signing secret now. It is shown once.') },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Your settings for showing Groundwork inside your tool were not saved.'),
  })

  async function copyText(text: string, done?: string) {
    (await copy(text)) ? toast.success(done ?? 'Copied.') : toast.error('Copying is not available here. Select it and copy it yourself.')
  }

  if (!isAdmin) return <OnlyAnAdmin />

  const approved = !!access.data?.approved

  const setupDone = {
    key: (creds.data ?? []).some(c => !c.revokedAt),
    /* "Something arrived" is a stronger signal than "a credential exists" - it is the difference
       between having a key and having used it. */
    used: (creds.data ?? []).some(c => c.lastUsedAt),
    webhook: (endpoints.data ?? []).length > 0,
    delivered: (deliveries.data ?? []).some(d => d.status === 'DELIVERED'),
  }

  return (
    <Page>
      {/*
       * THE PROTOTYPE'S OWN TITLE AREA (tools.txt, tools.jpg; group 1 review): "Settings" as the
       * title, the organisation name as its subtitle, then a plain "Connections" link back - never
       * a "Settings / Connections" crumb joined with a slash, which read as a small nav row rather
       * than the prototype's own two stacked headings.
       */}
      <PageTitle title="Settings" subtitle={orgName} />
      <PageTitle
        crumbs={[{ label: 'Connections', to: '/settings/connections' }]}
        title="Connect your own tools"
        subtitle={`For whoever runs ${orgName ? `${orgName}’s` : 'your'} systems. Everything here is off until you turn it on, and nothing sends what anyone said in a check-in unless you choose an event that carries it.`}
      />

      {access.isError && <Note tone="error">We could not read whether your organisation has access. Reload, or email hello@myground.work.</Note>}

      {!approved && (
        <Section heading="Put check-ins inside your own product">
          <Panel>
            <Stack gap={12}>
              <p className="gwui-panel-text-muted">
                Your people can check in from inside your own system, in a panel on your own page or
                on screens your developer builds. You ask for it rather than buy it. Say what you
                want to build. Someone at Groundwork reads it, and the keys appear on this page once
                it is approved.
                {access.data?.status === 'PENDING' && ' You have asked and we have not answered yet.'}
                {access.data?.status === 'DECLINED' && ' This was declined. Ask again, saying what has changed.'}
                {access.data?.status === 'WITHDRAWN' && ' This was approved and has since been withdrawn.'}
              </p>
              {access.data?.status !== 'PENDING' && (
                <form onSubmit={e => { e.preventDefault(); if (acceptedTerms && whatFor.trim().length >= 20) askForAccess.mutate() }}>
                  <Stack gap={10}>
                    <TextArea
                      value={whatFor}
                      onChange={e => setWhatFor(e.target.value)}
                      placeholder="What do you want to build with it? Somebody reads this."
                      aria-label="What do you want to build with it?"
                      rows={3}
                    />
                    <label className="gwui-check-row">
                      <input type="checkbox" checked={acceptedTerms} onChange={e => setAcceptedTerms(e.target.checked)} aria-label="I accept the terms for connecting your own tools" />
                      <span>
                        I accept the terms for connecting your own tools.{' '}
                        <button type="button" className="gwui-plain-link" onClick={() => setTermsOpen(o => !o)}>{termsOpen ? 'Hide them' : 'Read them'}</button>
                      </span>
                    </label>
                    {termsOpen && terms.data && (
                      <ol>
                        {(terms.data.terms ?? []).map(t => (
                          <li key={t.heading} className="gwui-panel-text-muted"><b className="gwui-panel-text">{t.heading}.</b> {t.body}</li>
                        ))}
                      </ol>
                    )}
                    <div>
                      <Button kind="secondary" size="small" type="submit" disabled={askForAccess.isPending || !acceptedTerms || whatFor.trim().length < 20}>
                        {askForAccess.isPending ? 'Asking…' : 'Ask for access'}
                      </Button>
                    </div>
                    {askForAccess.isError && (
                      <Note tone="error">
                        {(askForAccess.error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'That could not be recorded.'}
                      </Note>
                    )}
                  </Stack>
                </form>
              )}
            </Stack>
          </Panel>
        </Section>
      )}

      {approved && (<>
        <Section heading="Setting it up">
          <Panel>
            {/*
             * A STEP TICKS ON WHAT HAPPENED, NEVER ON WHAT WAS ATTEMPTED (the-console-tells-the-
             * truth-about-setup.spec.ts). `used` and `delivered` read the difference between having
             * a key and having used it, and between having an address and having reached it - never
             * a mutation's own `isSuccess`, which only says the browser tried.
             */}
            <Steps>
              <Step done={setupDone.key}>Create a key. One per system you connect, so you can turn one off later without breaking the others.</Step>
              <Step done={setupDone.used}>Your system signs in and sends something. This ticks once we have actually seen it come through.</Step>
              <Step done={setupDone.webhook}>Tell us where you want to be told. We sign every message, so you can prove it came from us.</Step>
              <Step done={setupDone.delivered}>Receive one. This ticks the first time we deliver successfully.</Step>
            </Steps>
          </Panel>
        </Section>

        <Section
          heading="Keys"
          action={!creatingKey && <Button kind="secondary" size="small" onClick={() => setCreatingKey(true)}>Create a key</Button>}
        >
          <Panel>
            <Stack gap={12}>
              {access.data?.decidedAt && (
                <div className="gwui-sentence-row">
                  <p className="gwui-panel-text-muted">
                    API access approved on {whenItWas(access.data.decidedAt, 'dayAndMonthLong')}
                    {access.data.whatFor ? `, for “${access.data.whatFor}”.` : '.'}
                  </p>
                  <Button kind="quiet" size="small" onClick={() => setTermsOpen(o => !o)}>{termsOpen ? 'Hide the terms' : 'Read the terms'}</Button>
                </div>
              )}
              {termsOpen && terms.data && (
                <ol>
                  {(terms.data.terms ?? []).map(t => (
                    <li key={t.heading} className="gwui-panel-text-muted"><b className="gwui-panel-text">{t.heading}.</b> {t.body}</li>
                  ))}
                </ol>
              )}

              {freshSecret && (
                <div role="alert" tabIndex={-1} ref={(el) => el?.focus()} className="gwui-secret-box">
                  <p className="gwui-secret-box-label">Copy this now. It is not shown again.</p>
                  <p className="gwui-secret-box-value">{freshSecret.clientId}</p>
                  <p className="gwui-secret-box-value">{freshSecret.clientSecret}</p>
                  <div className="gwui-invite-actions">
                    <Button kind="secondary" size="small" onClick={() => copyText(`${freshSecret.clientId}\n${freshSecret.clientSecret}`)}>Copy</Button>
                    <Button kind="quiet" size="small" onClick={() => setFreshSecret(null)}>I have saved it</Button>
                  </div>
                </div>
              )}

              {creds.data && creds.data.length === 0 && <p className="gwui-panel-text-muted">No keys yet. Create one above for the system you are connecting. It is shown only once.</p>}
              {(creds.data ?? []).map(c => (
                <div key={c.id}>
                  <div className="gwui-sentence-row">
                    <p className="gwui-panel-text">
                      <b>{c.name}</b>{c.revokedAt && <> <Tag tone="concern">Revoked</Tag></>}
                      <span className="gwui-field-help">
                        {whatItCanDo(c.scopes)} {c.lastUsedAt ? `Last used ${whenItWas(c.lastUsedAt, 'dayAndTime')}.` : 'Never used.'}
                        {c.replacedByClientId && ' This key has been replaced. Revoke it once the new one is live.'}
                      </span>
                    </p>
                    {!c.revokedAt && (
                      <div className="gwui-invite-actions">
                        {!c.replacedByClientId && <Button kind="secondary" size="small" disabled={replace.isPending} onClick={() => replace.mutate(c.clientId)}>Replace</Button>}
                        <Button kind="quiet" size="small" onClick={() => sure.arm(`revoke:${c.clientId}`)} disabled={revoke.isPending}>Revoke</Button>
                      </div>
                    )}
                  </div>
                  {sure.isArmed(`revoke:${c.clientId}`) && (
                    <Confirm
                      saying={`Revoke "${c.name}"? Anything using it stops working immediately, and it cannot be brought back.`}
                      confirmLabel="Revoke it" keepLabel="Keep it" pending={revoke.isPending} pendingLabel="Revoking…"
                      onConfirm={() => revoke.mutate(c.clientId)} onKeep={sure.disarm}
                    />
                  )}
                </div>
              ))}

              {creatingKey && (
                <form onSubmit={e => { e.preventDefault(); if (credName.trim()) issue.mutate() }}>
                  <Stack gap={10}>
                    <div>
                      <FieldLabel htmlFor="tools-key-name">What is it for?</FieldLabel>
                      <TextField id="tools-key-name" placeholder="For example, your billing system" value={credName} onChange={e => setCredName(e.target.value)} />
                    </div>
                    <div className="gwui-check-list">
                      {SCOPES.map(sc => (
                        <label key={sc.key} className="gwui-check-row">
                          <input type="checkbox" checked={credScopes.includes(sc.key)} onChange={e => setCredScopes(v => (e.target.checked ? [...v, sc.key] : v.filter(x => x !== sc.key)))} />
                          <span>
                            {sc.label}
                            <span className="gwui-check-row-sub">{sc.sub}</span>
                          </span>
                        </label>
                      ))}
                    </div>
                    <div className="gwui-invite-actions">
                      <Button kind="secondary" size="small" type="submit" disabled={!credName.trim() || issue.isPending}>{issue.isPending ? 'Creating…' : 'Create a key'}</Button>
                      <button type="button" className="gwui-plain-link" onClick={() => setCreatingKey(false)}>Never mind</button>
                    </div>
                  </Stack>
                </form>
              )}
            </Stack>
          </Panel>
        </Section>

        {!!(imports.data?.jobs ?? []).length && (
          <Folded summary="What your imports could not take" note="What an import could not take in, so nothing sent is lost without you knowing">
            <Stack gap={12}>
              {imports.data?.detectionQuietUntil && (
                <p className="gwui-panel-text-muted">
                  Your import started a quiet period, so Groundwork will not raise findings until{' '}
                  {whenItWas(imports.data.detectionQuietUntil, 'day')}. Check-ins and reports carry on as normal.
                </p>
              )}
              {(imports.data?.jobs ?? []).map(j => {
                const open = openJob === j.id
                return (
                  <div key={j.id}>
                    <div className="gwui-sentence-row">
                      <p className="gwui-panel-text">
                        <b>{j.sourceSystem}</b>{' '}
                        {j.failed > 0 ? <Tag tone="attention">{j.failed} skipped</Tag> : j.state === 'ABANDONED' ? <Tag tone="concern">Stopped</Tag> : <Tag tone="proven">All in</Tag>}
                        <span className="gwui-field-help">{j.succeeded} of {j.total} stored, {whenItWas(j.createdAt, 'dayAndTime')}.{j.error ? ` ${j.error}` : ''}</span>
                      </p>
                      {j.failed > 0 && <Button kind="quiet" size="small" onClick={() => setOpenJob(open ? null : j.id)}>{open ? 'Hide' : `Show the ${j.failed} we skipped`}</Button>}
                    </div>
                    {open && (
                      <Stack gap={10}>
                        {jobDetail.isPending && <p className="gwui-panel-text-muted">Loading…</p>}
                        {(jobDetail.data?.failures ?? []).map(f => (
                          <p key={f.index} className="gwui-panel-text-muted">
                            {f.externalId
                              ? <>Row {f.index + 1} (<span className="gwui-mono">{f.externalId}</span>) was skipped.</>
                              : `Row ${f.index + 1} had no ID, so it was skipped.`}
                            <span className="gwui-field-help">{f.message}</span>
                          </p>
                        ))}
                        {!!(jobDetail.data?.failures ?? []).length && (
                          <p className="gwui-panel-text-muted">Everything else in this batch was stored. Fix these and send them again. Re-sending the whole batch is safe, because each row updates what is already there rather than adding a second copy.</p>
                        )}
                      </Stack>
                    )}
                  </div>
                )
              })}
            </Stack>
          </Folded>
        )}

        <Section heading="Send figures" action={<Button kind="secondary" size="small" onClick={() => openDocs.mutate()} disabled={openDocs.isPending}>{openDocs.isPending ? 'Opening…' : 'Open the developer docs'}</Button>}>
          <Stack gap={12}>
            <p className="gwui-panel-text-muted">A figure from another system sits beside the goal it belongs to, as proven. A paid invoice fills in “sold” for that deal.</p>
            <pre className="gwui-code-block">{`POST ${API_ORIGIN || 'https://api.myground.work'}/v1/figures
Authorization: Bearer ${firstClientId ? 'gw_live_••••' : 'gw_live_••••'}

{
  "goal": "sales-q3",
  "figure": "sold",
  "value": 1,
  "about": "Nyama Choma Palace",
  "source": "Invoice INV-2291, paid"
}`}</pre>
            <p className="gwui-fine">This shows what a request looks like. The exact address and fields are in the developer docs, which open from a link that expires after a short while.</p>
          </Stack>
        </Section>

        <Section heading="Be told when something happens" action={<Tag tone={(endpoints.data ?? []).some(e => e.active) ? 'proven' : 'plain'}>{(endpoints.data ?? []).some(e => e.active) ? 'On' : 'Not set up'}</Tag>}>
          <Panel>
            <Stack gap={18}>
              <div className="gwui-field-pair">
                <form onSubmit={e => { e.preventDefault(); if (hookUrl.trim()) register.mutate() }}>
                  <Stack gap={10}>
                    <div>
                      <FieldLabel htmlFor="tools-hook-url">Send to</FieldLabel>
                      <TextField id="tools-hook-url" placeholder="https://your-system.example.com/groundwork" value={hookUrl} onChange={e => setHookUrl(e.target.value)} />
                      <p className="gwui-field-help">We sign every delivery. Check it with the secret below.</p>
                    </div>
                    <div><Button kind="secondary" size="small" type="submit" disabled={!hookUrl.trim() || register.isPending}>{register.isPending ? 'Adding…' : 'Add'}</Button></div>
                  </Stack>
                </form>
                <div className="gwui-check-list">
                  <p className="gwui-panel-text"><b>Events</b></p>
                  {EVENTS.filter(ev => (events.data?.available ?? []).includes(ev.key)).map(ev => (
                    <label key={ev.key} className="gwui-check-row">
                      <input type="checkbox" checked={hookEvents.includes(ev.key)} onChange={e => setHookEvents(v => (e.target.checked ? [...v, ev.key] : v.filter(x => x !== ev.key)))} />
                      <span>{ev.sentence} <span className="gwui-mono">{ev.key}</span></span>
                    </label>
                  ))}
                  <p className="gwui-fine">The list comes from Groundwork, so new events appear here.</p>
                  {!!(events.data?.notYetEmitted ?? []).length && (
                    /* Said out loud rather than hidden. An admin who has read the contract and cannot
                       find blocker.raised here should learn why from this page, not a support thread.
                       NEVER THE PROTOTYPE'S "can be ticked now": these are not shown as checkboxes at
                       all (only the `available` events above are), so ticking them is not something a
                       person here can actually do yet. */
                    <p className="gwui-fine">
                      {(() => { const n = (events.data?.notYetEmitted ?? []).length; const w = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'][n] ?? String(n); return n === 1 ? 'One more is coming.' : `${w} more are coming.` })()} Nothing sends them yet, so they will appear here once Groundwork can.
                    </p>
                  )}
                </div>
              </div>

              {freshHookSecret && (
                <div role="alert" tabIndex={-1} ref={(el) => el?.focus()} className="gwui-secret-box">
                  <p className="gwui-secret-box-label">Signing secret. Copy it now.</p>
                  <p className="gwui-secret-box-value">{freshHookSecret}</p>
                  <div className="gwui-invite-actions"><Button kind="secondary" size="small" onClick={() => copyText(freshHookSecret)}>Copy</Button><Button kind="quiet" size="small" onClick={() => setFreshHookSecret(null)}>I have saved it</Button></div>
                </div>
              )}

              {(endpoints.data ?? []).map(e => (
                <div key={e.id}>
                  <div className="gwui-sentence-row">
                    <p className="gwui-panel-text">
                      <span className="gwui-mono">{e.url}</span>
                      <span className="gwui-field-help">
                        {e.events.join(', ')}{e.rotatedAt ? `, secret rotated ${whenItWas(e.rotatedAt, 'day')}` : ''}
                        {!e.active && ' Switched off: we could not reach it.'}
                      </span>
                    </p>
                    <div className="gwui-invite-actions">
                      {!e.active && <Button kind="quiet" size="small" onClick={() => reactivate.mutate(e.id)} disabled={reactivate.isPending}>Switch back on</Button>}
                      <Button kind="quiet" size="small" onClick={() => sure.arm(`rotate:${e.id}`)} disabled={rotate.isPending}>Rotate secret</Button>
                      <Button kind="quiet" size="small" onClick={() => sure.arm(`remove:${e.id}`)} disabled={removeEndpoint.isPending}>Remove</Button>
                    </div>
                  </div>
                  {sure.isArmed(`rotate:${e.id}`) && (
                    <Confirm saying={`Rotate the signing secret for ${e.url}? The old one keeps working until you replace it again. The new one is shown only once.`} confirmLabel="Rotate it" keepLabel="Keep the current one" pending={rotate.isPending} pendingLabel="Rotating…" onConfirm={() => rotate.mutate(e.id)} onKeep={sure.disarm} />
                  )}
                  {sure.isArmed(`remove:${e.id}`) && (
                    <Confirm saying={`Remove ${e.url}? Nothing more is delivered to it, and its delivery log stays.`} confirmLabel="Remove it" keepLabel="Keep it" pending={removeEndpoint.isPending} pendingLabel="Removing…" onConfirm={() => removeEndpoint.mutate(e.id)} onKeep={sure.disarm} />
                  )}
                </div>
              ))}
            </Stack>
          </Panel>
        </Section>

        <Section heading="Recent deliveries">
          {!(deliveries.data ?? []).length && <Panel><p className="gwui-panel-text-muted">Nothing yet. This fills in as check-ins finish.</p></Panel>}
          {!!(deliveries.data ?? []).length && (
            <Panel>
              <Stack gap={10}>
                {(deliveries.data ?? []).map(d => (
                  <div key={d.id} className="gwui-sentence-row">
                    <p className="gwui-panel-text">
                      {whenItWas(d.createdAt, 'time')} <span className="gwui-mono">{d.eventType}</span>{' '}
                      <Tag tone={d.status === 'DELIVERED' ? 'proven' : d.status === 'DEAD' ? 'concern' : d.status === 'FAILED' ? 'attention' : 'plain'}>{d.status === 'DELIVERED' ? 'Delivered' : d.status === 'DEAD' ? 'Gave up' : d.status === 'FAILED' ? 'Failed' : 'Waiting'}</Tag>
                      <span className="gwui-field-help">
                        {d.attempts} attempt{d.attempts === 1 ? '' : 's'}{d.responseCode != null ? `, your server said ${d.responseCode}` : ''}{d.nextAttemptAt ? `, next try ${whenItWas(d.nextAttemptAt, 'time')}` : ''}
                      </span>
                    </p>
                    {d.status !== 'DELIVERED' && <Button kind="quiet" size="small" onClick={() => replay.mutate(d.id)} disabled={replay.isPending && replay.variables === d.id}>{replay.isPending && replay.variables === d.id ? 'Sending…' : 'Replay'}</Button>}
                  </div>
                ))}
              </Stack>
            </Panel>
          )}
        </Section>
      </>)}

      {/* SHOWN WHETHER OR NOT ACCESS IS APPROVED, like the same section on Connections: this is what
          the product already does, not a call to make against the API. */}
      <Section heading="How it looks inside your tool" note={`${whatsappOn ? 'Three examples' : 'Two examples'}. The people and companies in them are made up.`}>
        <div className="gwui-two-up">
          <Panel pad={false}>
            <figure>
              <div className="gwui-console-frame"><EmbedWidgetExample /></div>
              <figcaption className="gwui-panel-row"><b>The panel on your own page</b></figcaption>
            </figure>
          </Panel>
          <Panel pad={false}>
            <figure>
              <div className="gwui-console-frame"><OpsConsoleExample /></div>
              <figcaption className="gwui-panel-row"><b>A panel inside an organisation’s own office system</b></figcaption>
            </figure>
          </Panel>
          {whatsappOn && (
            <Panel pad={false}>
              <figure>
                <div className="gwui-console-frame"><WhatsAppConversationExample /></div>
                <figcaption className="gwui-panel-row"><b>A check-in over WhatsApp</b></figcaption>
              </figure>
            </Panel>
          )}
        </div>
      </Section>

      {approved && (<>
        <Section heading="Show Groundwork inside your own tool">
          <Panel>
            <Stack gap={12}>
              <div>
                <FieldLabel htmlFor="tools-embed-domains">Sites allowed to show it</FieldLabel>
                <TextArea id="tools-embed-domains" rows={2} placeholder={embed.data?.allowedDomains?.join('\n') || 'app.yourcompany.com\nintranet.yourcompany.com'} value={embedDomains} onChange={e => setEmbedDomains(e.target.value)} />
                <p className="gwui-field-help">One address per line. People see only what they’d see here, signed in as themselves.</p>
              </div>

              <Folded summary="More options" note="Choose where it appears, and who never sees it.">
                <Stack gap={10}>
                  <div>
                    <FieldLabel htmlFor="tools-embed-placement">Where it sits</FieldLabel>
                    <Select id="tools-embed-placement" value={embedPlacement} onChange={e => setEmbedPlacement(e.target.value as 'floating' | 'anchor')}>
                      <option value="floating">A floating launcher</option>
                      <option value="anchor">Anchored to a place on your page</option>
                    </Select>
                  </div>
                  <div>
                    <FieldLabel htmlFor="tools-embed-out">Departments that should see nothing at all</FieldLabel>
                    <TextField id="tools-embed-out" placeholder={embed.data?.outOfScopeDepartments?.join(', ') || 'You can leave this empty. Put a comma between names.'} value={embedOutOfScope} onChange={e => setEmbedOutOfScope(e.target.value)} />
                  </div>
                </Stack>
              </Folded>

              <div><Button kind="secondary" size="small" onClick={() => setUpEmbed.mutate()} disabled={!embedDomains.trim() || setUpEmbed.isPending}>{setUpEmbed.isPending ? 'Saving…' : embed.data ? 'Save and issue a new signing secret' : 'Save and issue the signing secret'}</Button></div>

              {embedSecret && (
                <div className="gwui-secret-box">
                  <p className="gwui-secret-box-label">Signing secret. Copy it now, because it is shown only once.</p>
                  <p className="gwui-secret-box-value">{embedSecret}</p>
                  <Button kind="secondary" size="small" onClick={() => copyText(embedSecret)}>Copy</Button>
                </div>
              )}
              {embed.data && !embedSecret && (
                <p className="gwui-fine">Your site uses it to sign people in. Save again to see it once more.</p>
              )}
              {embed.data && (
                <pre className="gwui-code-block-light">{`<script src="${API_ORIGIN}/embed.js" data-mode="${embed.data.placement}" data-token="TOKEN_YOUR_SERVER_MINTS"${embed.data.placement === 'anchor' ? ' data-anchor="#groundwork"' : ''}></script>`}</pre>
              )}
            </Stack>
          </Panel>
        </Section>

        <Section heading="How long conversations are kept">
          <FieldRows>
            <FieldRow
              label="Word-for-word check-ins"
              value={retention.data ? `Kept for ${retention.data.turnRetentionDays} days, then deleted. The history and the reports built from it stay.` : 'Loading…'}
              action={retention.data && !changingRetention && <Button kind="quiet" size="small" onClick={() => setChangingRetention(true)}>Change</Button>}
            />
          </FieldRows>
          {changingRetention && retention.data && (
            <Panel>
              <form onSubmit={e => { e.preventDefault(); if (retentionDays.trim()) saveRetention.mutate() }}>
                <Stack gap={10}>
                  <p className="gwui-panel-text-muted">When your people list tells us somebody has left, we delete what they said word for word after this many days. That is always after any handover brief has been built, never before. Choose a number between {retention.data.floor} and {retention.data.ceiling} days.</p>
                  <div className="gwui-invite-actions">
                    <TextField type="number" min={retention.data.floor} max={retention.data.ceiling} step={1} placeholder={String(retention.data.turnRetentionDays)} value={retentionDays} onChange={e => setRetentionDays(e.target.value)} aria-label="Days to keep a departed person's words" />
                    <Button kind="secondary" size="small" type="submit" disabled={!retentionDays.trim() || saveRetention.isPending}>{saveRetention.isPending ? 'Saving…' : 'Save'}</Button>
                    <button type="button" className="gwui-plain-link" onClick={() => setChangingRetention(false)}>Never mind</button>
                  </div>
                </Stack>
              </form>
            </Panel>
          )}
        </Section>

        <Folded summary="For your engineer" note="The calls your developer can send directly, if this page’s own buttons are not enough">
          <Stack gap={12}>
            <p className="gwui-panel-text-muted">Your developer sends two requests. The first swaps your key for a pass that lasts an hour, and the second uses it.</p>
            <pre className="gwui-code-block-light">{`curl -X POST ${API_ORIGIN || 'https://api.myground.work'}/api/org/v1/oauth/token \\
  -H 'content-type: application/json' \\
  -d '{"grant_type":"client_credentials",
       "client_id":"${firstClientId ?? 'gwc_your_client_id'}",
       "client_secret":"gws_the_secret_shown_when_you_issued_it"}'`}</pre>
            <p className="gwui-panel-text-muted">That answers with <span className="gwui-mono">access_token</span>. Send it on everything else you call after that. Here is an objective arriving from your system:</p>
            <pre className="gwui-code-block-light">{`curl -X POST ${API_ORIGIN || 'https://api.myground.work'}/api/org/v1/subjects \\
  -H 'authorization: Bearer $ACCESS_TOKEN' \\
  -H 'content-type: application/json' \\
  -d '{"externalId":"OKR-142",
       "sourceSystem":"your-okr-tool",
       "type":"objective",
       "title":"Ship the billing rewrite",
       "ownerExternalId":"priya@yourcompany.com"}'`}</pre>
            <p className="gwui-panel-text-muted">Sending more than a handful? Post them together. The system is named once for the batch, not on each row, and you get a job id back rather than the rows:</p>
            <pre className="gwui-code-block-light">{`curl -X POST ${API_ORIGIN || 'https://api.myground.work'}/api/org/v1/subjects/bulk \\
  -H 'authorization: Bearer $ACCESS_TOKEN' \\
  -H 'content-type: application/json' \\
  -d '{"sourceSystem":"your-okr-tool",
       "subjects":[
         {"externalId":"OKR-142","type":"objective","title":"Ship the billing rewrite"},
         {"externalId":"OKR-143","type":"objective","title":"Cut onboarding to a week"}
       ]}'`}</pre>
            <p className="gwui-panel-text-muted">One bad row does not stop the rest. The others are stored, and what was skipped appears above with the row and the reason, so you can fix those and send them again.</p>
            <p className="gwui-panel-text-muted">Numbers from your CRM or anywhere else go against an objective that already exists, and arrive in the check-in that asks about it:</p>
            <pre className="gwui-code-block-light">{`curl -X PUT ${API_ORIGIN || 'https://api.myground.work'}/api/org/v1/evidence \\
  -H 'authorization: Bearer $ACCESS_TOKEN' \\
  -H 'content-type: application/json' \\
  -d '{"evidence":[
        {"objectiveExternalId":"OKR-9",
         "observedAt":"2026-08-28T09:00:00Z",
         "state":{"committed":"1.1m","stage":"negotiation","deals":"7"}}
      ]}'`}</pre>
            <p className="gwui-panel-text-muted">
              It answers <span className="gwui-mono">matched: true</span> per item, or <span className="gwui-mono">matched: false</span> for an
              objective nobody is checking in about. That is not an error, so a nightly push covering everything does not fail on the parts nobody is discussing.
              Send <span className="gwui-mono">observedAt</span> and we hold your observation time rather than ours, so a figure that is three days old says so instead of looking current.
            </p>
            <p className="gwui-panel-text-muted">Opening a check-in from inside your product:</p>
            <pre className="gwui-code-block-light">{`curl -X POST ${API_ORIGIN || 'https://api.myground.work'}/api/org/v1/grounds \\
  -H 'authorization: Bearer $ACCESS_TOKEN' \\
  -H 'content-type: application/json' \\
  -d '{"actingPersonExternalId":"ADA-1",
       "label":"Q4 pipeline",
       "scenario":"OKR_ALIGNMENT",
       "moment":"STARTING",
       "participants":[{"personExternalId":"SAM-1",
                        "roleAsDescribed":"Runs the pipeline"}]}'`}</pre>
            <p className="gwui-panel-text-muted">
              <span className="gwui-mono">scenario</span> and <span className="gwui-mono">moment</span> are fixed values, and the common ones are{' '}
              <span className="gwui-mono">NEW_HIRE</span>, <span className="gwui-mono">NEW_PROJECT</span> and <span className="gwui-mono">OKR_ALIGNMENT</span>, each with a moment of{' '}
              <span className="gwui-mono">STARTING</span>, <span className="gwui-mono">RECOGNITION</span> or <span className="gwui-mono">RESOLUTION</span>. Send one we do not have and you get a
              list of the ones we do. Somebody has to be named as opening it. A key belongs to your organisation and nobody in particular, but a check-in has a real person as its initiator, and that
              person's name appears in the report.
            </p>
            <p className="gwui-panel-text-muted">Back come the check-in id and one invitation link per person, addressed by your own ids rather than by email, so you deliver them inside the product those people already have open. We email them as well.</p>
            <p className="gwui-panel-text-muted">And what a lead should read before a hard conversation, for one named person:</p>
            <pre className="gwui-code-block-light">{`curl ${API_ORIGIN || 'https://api.myground.work'}/api/org/v1/people/SAM-1/before-a-conversation \\
  -H 'authorization: Bearer $ACCESS_TOKEN'`}</pre>
            <p className="gwui-panel-text-muted">
              It needs the same permission as reading one person’s desk, not the findings one. This is a great deal more than a finding, and no integration should get it by accident.
              What comes back carries <span className="gwui-mono">sections</span> with where each came from, a <span className="gwui-mono">completeness</span> reading saying how much of a picture this is, and a{' '}
              <span className="gwui-mono">refusal</span> stating that it is not an assessment. Show all three. Where the record holds nothing, you get that said plainly rather than an empty page,
              so a lead is never handed a blank screen about a person and left to read it as a verdict.
            </p>
            <p className="gwui-fine">The full reference is generated from the running code rather than written by hand, so it cannot drift from what the API actually does.</p>
            <div><Button kind="quiet" size="small" onClick={() => openDocs.mutate()} disabled={openDocs.isPending}>{openDocs.isPending ? 'Opening…' : 'Open the developer docs'}</Button></div>
          </Stack>
        </Folded>
      </>)}
    </Page>
  )
}
