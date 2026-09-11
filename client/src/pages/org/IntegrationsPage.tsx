import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { API_ORIGIN } from '@/lib/where-the-api-lives'
import { integrationsApi } from '@/api/integrations'
import { useAuthStore } from '@/stores/auth'
import { toast } from 'sonner'
import { useAreYouSure, Confirm } from '@/components/gw/a-second-press-before-it-is-gone'
import { copy } from '@/components/gw/copying-can-fail'

/**
 * WHERE AN ADMIN CONNECTS THEIR OWN SYSTEMS, WITHOUT TALKING TO US FIRST.
 *
 * An API nobody can turn on does not get sold, and the thing that decides whether it gets turned on
 * is not the endpoint list - it is whether an operations lead can read one page and decide whether
 * to involve their engineer. So the plain-language half comes FIRST and the reference is underneath
 * it, which is the opposite of how developer documentation is usually ordered and the right way
 * round for the person who actually approves the work.
 *
 * Everything here is a surface over the endpoints already built. No new backend, and no second
 * source of truth about what the API does - the reference link goes to the OpenAPI document
 * generated from the handlers themselves, because a spec maintained by hand drifts and a drifted
 * spec is worse than none.
 */
const S = {
  page: { maxWidth: 860, margin: '0 auto', padding: '28px 20px 80px' } as const,
  h1: { fontSize: 22, fontWeight: 800, color: 'var(--gw-text)', margin: '0 0 6px' } as const,
  lede: { fontSize: 14, color: 'var(--gw-sub)', lineHeight: 1.6, margin: '0 0 26px', maxWidth: '62ch' } as const,
  sec: { fontSize: 11, fontWeight: 700, letterSpacing: '.09em', textTransform: 'uppercase', color: 'var(--gw-muted)', margin: '32px 0 10px' } as const,
  card: { background: 'white', border: '1px solid var(--gw-border)', borderRadius: 10, padding: '16px 18px', marginBottom: 10 } as const,
  h3: { fontSize: 14, fontWeight: 700, color: 'var(--gw-text)', margin: '0 0 4px' } as const,
  body: { fontSize: 13, color: 'var(--gw-sub)', lineHeight: 1.6, margin: 0 } as const,
  btn: { fontSize: 13, fontWeight: 600, fontFamily: 'inherit', padding: '8px 14px', borderRadius: 7, border: 'none', background: 'var(--gw-navy)', color: 'white', cursor: 'pointer' } as const,
  ghost: { fontSize: 12, fontWeight: 600, fontFamily: 'inherit', padding: '6px 11px', borderRadius: 6, border: '1px solid var(--gw-border)', background: 'var(--gw-bg)', color: 'var(--gw-sub)', cursor: 'pointer' } as const,
  input: { fontSize: 13, fontFamily: 'inherit', padding: '8px 10px', borderRadius: 7, border: '1px solid var(--gw-border)', width: '100%' } as const,
  mono: { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 12 } as const,
  row: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '11px 0', borderBottom: '1px solid var(--gw-bg)' } as const,
}

/**
 * EVERY SCOPE THE API HAS, WITH WHAT IT ACTUALLY LETS THROUGH.
 *
 * The page offered three of eleven. So a customer could not grant the right to send their handbook,
 * open a check-in from their own system, read a handover brief, or ask a question from their own
 * app - all of which are built and none of which they could turn on. That is the sharpest version
 * of "either what we built is not complete or how we communicate is not complete": built, described
 * nowhere, and ungrantable.
 *
 * The wording of each is taken from what the scope guards in scopes.ts, not from its name. Two
 * pairs are deliberately separate there and stay separate here: opening a check-in is a different
 * power from linking one to an objective, and reading a report - everybody's account of a quarter -
 * is a different power from reading a finding.
 */
const SCOPES: { key: string; label: string; sub: string }[] = [
  { key: 'graph:write',    label: 'Send people',            sub: 'Who works here and who reports to whom' },
  /* Reading it back. The API has required this on GET /roles since it was written and the scope
     could not be granted by anybody, so the route was a permanent 403 — and a scope only somebody
     reading the source can turn on is not a capability the customer has. Sending people already
     holds it, so an existing integration needs nothing done. */
  { key: 'graph:read',     label: 'Read back the shape',    sub: 'The roles configured here, so a system can check what it sent arrived' },
  { key: 'subjects:write', label: 'Send objectives',        sub: 'Objectives, projects and decisions, with their measures and owners' },
  { key: 'knowledge:write',label: 'Send your handbook',     sub: 'Documents people can then ask in plain words' },
  { key: 'grounds:write',  label: 'Open check-ins',         sub: 'Start one from your own system' },
  { key: 'checkins:write', label: 'Link a check-in',        sub: 'Attach an existing one to an objective. Smaller than opening one' },
  { key: 'findings:read',  label: 'Read findings',          sub: 'What is missing, unowned, or described two ways' },
  { key: 'handovers:read', label: 'Read one person\'s desk',  sub: 'A handover brief, and what a lead should read before a conversation' },
  { key: 'reports:read',   label: 'Read reports',           sub: 'Everybody\'s account of a period, once released' },
  { key: 'proposals:read', label: 'Read proposed changes',  sub: 'Changes Groundwork suggests to an objective' },
  { key: 'proposals:write',label: 'Resolve proposed changes', sub: 'Accept or decline them from your side' },
  { key: 'chat:write',     label: 'Ask from your own app',  sub: 'The panel you embed, asking on behalf of one person' },
]

function Pill({ tone, children }: { tone: 'ok' | 'warn' | 'bad' | 'flat'; children: React.ReactNode }) {
  const c = {
    ok: { bg: 'var(--gw-green-bg)', fg: 'var(--gw-green-t)', bd: 'var(--gw-green-b-soft)' },
    warn: { bg: 'var(--gw-amber-bg)', fg: 'var(--gw-amber-t)', bd: 'var(--gw-amber-b)' },
    bad: { bg: 'var(--gw-clay-bg)', fg: 'var(--gw-red-t)', bd: 'var(--gw-clay-b)' },
    flat: { bg: 'var(--gw-bg)', fg: 'var(--gw-muted)', bd: 'var(--gw-border)' },
  }[tone]
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 20, background: c.bg, color: c.fg, border: `1px solid ${c.bd}` }}>
      {children}
    </span>
  )
}

export function IntegrationsPage() {
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const isAdmin = user?.role === 'ADMIN'

  const [credName, setCredName] = useState('')
  const [credScopes, setCredScopes] = useState<string[]>(['subjects:write', 'findings:read'])
  /* Held in component state and nowhere else: it is shown once and there is no path to read it back. */
  const [freshSecret, setFreshSecret] = useState<{ clientId: string; clientSecret: string } | null>(null)

  const [hookUrl, setHookUrl] = useState('')
  const [hookEvents, setHookEvents] = useState<string[]>(['round.completed'])
  const [freshHookSecret, setFreshHookSecret] = useState<string | null>(null)

  const creds = useQuery({ queryKey: ['integrations', 'credentials'], queryFn: integrationsApi.listCredentials, enabled: isAdmin })
  const access = useQuery({ queryKey: ['integrations', 'access'], queryFn: integrationsApi.myApiAccess, enabled: isAdmin, retry: false })
  const [whatFor, setWhatFor] = useState('')
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [engineerOpen, setEngineerOpen] = useState(false)
  const [termsOpen, setTermsOpen] = useState(false)
  const terms = useQuery({ queryKey: ['integrations', 'terms'], queryFn: integrationsApi.apiTerms, enabled: isAdmin })
  const openDocs = useMutation({
    mutationFn: integrationsApi.docsLink,
    onSuccess: (r) => { window.open(`${API_ORIGIN}${r.path}`, '_blank', 'noreferrer') },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'The reference could not be opened.'),
  })
  const askForAccess = useMutation({
    mutationFn: () => integrationsApi.askForApiAccess(whatFor, acceptedTerms),
    onSuccess: () => {
      setWhatFor('')
      qc.invalidateQueries({ queryKey: ['integrations', 'access'] })
    },
  })
  /*
   * The example below uses a real client id when there is one, so it is a command that runs rather
   * than a template to adapt. Revoked keys are skipped - pasting a dead id would be worse than a
   * placeholder, because it fails in a way that looks like the API is broken.
   */
  const firstClientId = (creds.data ?? []).find(c => !c.revokedAt)?.clientId ?? null
  const events = useQuery({ queryKey: ['integrations', 'events'], queryFn: integrationsApi.webhookEvents, enabled: isAdmin })
  const endpoints = useQuery({ queryKey: ['integrations', 'endpoints'], queryFn: integrationsApi.listEndpoints, enabled: isAdmin })
  const whatsapp = useQuery({ queryKey: ['integrations', 'whatsapp'], queryFn: integrationsApi.whatsapp, enabled: isAdmin })
  /*
   * SWITCH ON WHAT IS ALREADY BUILT. Slack and Teams notices were wired end to end and read a table
   * nothing in the console could write; the embedded panel had a served loader, a panel page and a
   * signing scheme reachable only by a database row written by hand, while this page's copy promised
   * "you can put the check-in inside your own product". Both get a section here.
   */
  const notifiers = useQuery({ queryKey: ['integrations', 'workspace'], queryFn: integrationsApi.workspaceNotifiers, enabled: isAdmin })
  const [wsKind, setWsKind] = useState<'slack' | 'teams'>('slack')
  const [wsUrl, setWsUrl] = useState('')
  const [wsChannel, setWsChannel] = useState('')
  const connectWs = useMutation({
    mutationFn: () => integrationsApi.connectWorkspace(wsKind, wsUrl.trim(), wsChannel.trim() || undefined),
    onSuccess: () => { setWsUrl(''); setWsChannel(''); qc.invalidateQueries({ queryKey: ['integrations', 'workspace'] }); toast.success('Connected, and switched off until you test it and turn it on.') },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Could not connect that address.'),
  })
  const testWs = useMutation({
    mutationFn: (kind: 'slack' | 'teams') => integrationsApi.testWorkspace(kind),
    onSuccess: (r) => { r.posted ? toast.success('Posted. Check the channel.') : toast.error(r.because ?? 'It did not post.'); qc.invalidateQueries({ queryKey: ['integrations', 'workspace'] }) },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'The test did not post.'),
  })
  const turnWs = useMutation({
    mutationFn: ({ kind, on }: { kind: 'slack' | 'teams'; on: boolean }) => integrationsApi.turnWorkspace(kind, on),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['integrations', 'workspace'] }),
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'That did not change.'),
  })
  const disconnectWs = useMutation({
    mutationFn: (kind: 'slack' | 'teams') => integrationsApi.disconnectWorkspace(kind),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['integrations', 'workspace'] }),
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Could not remove it.'),
  })
  const embed = useQuery({ queryKey: ['integrations', 'embed'], queryFn: integrationsApi.embedConfig, enabled: isAdmin })
  const [embedDomains, setEmbedDomains] = useState('')
  const [embedPlacement, setEmbedPlacement] = useState<'floating' | 'anchor'>('floating')
  const [embedOutOfScope, setEmbedOutOfScope] = useState('')
  const [embedSecret, setEmbedSecret] = useState<string | null>(null)
  const setUpEmbed = useMutation({
    mutationFn: () => integrationsApi.setUpEmbed({
      allowedDomains: embedDomains.split(/[\s,]+/).map(d => d.trim()).filter(Boolean),
      placement: embedPlacement,
      outOfScopeDepartments: embedOutOfScope.split(',').map(d => d.trim()).filter(Boolean),
    }),
    onSuccess: (r) => { setEmbedSecret(r.signingSecret); qc.invalidateQueries({ queryKey: ['integrations', 'embed'] }); toast.success('Saved. Copy the signing secret now - it is shown once.') },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Could not save the embed setup.'),
  })
  const [waNumberId, setWaNumberId] = useState('')
  const [waBusinessId, setWaBusinessId] = useState('')
  const [waDisplay, setWaDisplay] = useState('')
  const [waToken, setWaToken] = useState('')
  const [waSecret, setWaSecret] = useState('')
  const [waTestTo, setWaTestTo] = useState('')
  const connectWa = useMutation({
    mutationFn: () => integrationsApi.connectWhatsapp({ phoneNumberId: waNumberId, businessAccountId: waBusinessId || undefined, displayNumber: waDisplay || undefined, accessToken: waToken || undefined, appSecret: waSecret || undefined }),
    onSuccess: () => { setWaToken(''); setWaSecret(''); qc.invalidateQueries({ queryKey: ['integrations', 'whatsapp'] }); toast.success('Connected. Now point Meta at the webhook address below.') },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Could not connect.'),
  })
  const toggleWa = useMutation({
    mutationFn: (enabled: boolean) => integrationsApi.setWhatsappEnabled(enabled),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['integrations', 'whatsapp'] }),
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'That did not change. WhatsApp is as it was - try again.'),
  })
  const testWa = useMutation({
    mutationFn: () => integrationsApi.testWhatsapp(waTestTo),
    onSuccess: () => toast.success('Sent. Check that phone.'),
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Meta refused it.'),
  })
  const disconnectWa = useMutation({
    mutationFn: () => integrationsApi.disconnectWhatsapp(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['integrations', 'whatsapp'] }); toast.success('Removed.') },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'The connection was not removed. Try again.'),
  })

  /*
   * ASKING FOR A CALL. Read first so the page can say "we will be in touch" rather than offering
   * to ask again - clicking twice is somebody wondering whether the first click worked.
   */
  /*
   * ONE REQUEST, NOT TWO. This page had "Ask for a call" and "Ask for access" side by side, two
   * buttons for what is, to the person asking, one thing: I want to connect, talk to me. Asking for
   * access raises the call request behind it (see CredentialsController.askForAccess), so ops still
   * has one queue to ring back from.
   */
  const deliveries = useQuery({ queryKey: ['integrations', 'deliveries'], queryFn: () => integrationsApi.deliveries(), enabled: isAdmin })
  const imports = useQuery({ queryKey: ['integrations', 'imports'], queryFn: integrationsApi.listImports, enabled: isAdmin })

  /* Only the job somebody opened is fetched with its failures - see recentJobs for why the list
     carries counts alone. */
  const [openJob, setOpenJob] = useState<string | null>(null)
  const jobDetail = useQuery({
    queryKey: ['integrations', 'imports', openJob],
    queryFn: () => integrationsApi.importDetail(openJob!),
    enabled: !!openJob,
  })

  const issue = useMutation({
    mutationFn: () => integrationsApi.issueCredential(credName, credScopes),
    onSuccess: c => {
      setFreshSecret({ clientId: c.clientId, clientSecret: c.clientSecret })
      setCredName('')
      qc.invalidateQueries({ queryKey: ['integrations', 'credentials'] })
    },
    onError: (e: any) => toast.error(e?.message ?? 'Could not issue that key.'),
  })
  const revoke = useMutation({
    mutationFn: integrationsApi.revokeCredential,
    onSuccess: () => { toast.success('Revoked.'); sure.disarm(); qc.invalidateQueries({ queryKey: ['integrations', 'credentials'] }) },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Could not revoke it. The key still works.'),
  })
  /* One armed control at a time, keyed on what it would destroy. See a-second-press-before-it-is-gone.tsx. */
  const sure = useAreYouSure<string>()

  /**
   * REPLACING ONE IS WHAT ROTATING ACTUALLY IS.
   *
   * There is no rotate: the secret is hashed the moment it is made, so nothing can hand back a new
   * one for an existing pair. It is issue, deploy, revoke — and doing that by hand had a trap in
   * it, because the roster is keyed on the credential's source system, which is derived from its
   * NAME. A replacement called "Workday sync (new)" is a different system, and the next sync makes
   * a second copy of every person. The successor here inherits what the original spoke for.
   */
  const replace = useMutation({
    mutationFn: integrationsApi.replaceCredential,
    onSuccess: (issued) => {
      /* The same one-time panel the issue flow uses — a secret is shown once, whichever door it
         came through. */
      setFreshSecret({ clientId: issued.clientId, clientSecret: issued.clientSecret })
      qc.invalidateQueries({ queryKey: ['integrations', 'credentials'] })
      toast.success('New secret issued. The old one keeps working until you revoke it.')
    },
    onError: () => toast.error('Could not replace that — nothing was issued and the old one is unchanged.'),
  })
  const register = useMutation({
    mutationFn: () => integrationsApi.registerEndpoint(hookUrl, hookEvents),
    onSuccess: e => { setFreshHookSecret(e.secret); setHookUrl(''); qc.invalidateQueries({ queryKey: ['integrations', 'endpoints'] }) },
    onError: (e: any) => toast.error(e?.message ?? 'Could not register that endpoint.'),
  })
  const rotate = useMutation({
    mutationFn: integrationsApi.rotateSecret,
    onSuccess: r => { setFreshHookSecret(r.secret); sure.disarm(); qc.invalidateQueries({ queryKey: ['integrations', 'endpoints'] }) },
    /* A failed rotate used to look identical to a successful one. */
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Could not rotate the secret. The old one is unchanged.'),
  })
  const reactivate = useMutation({
    mutationFn: integrationsApi.reactivateEndpoint,
    onSuccess: () => { toast.success('Switched back on. New events flow to it again.'); qc.invalidateQueries({ queryKey: ['integrations', 'endpoints'] }) },
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
      toast.success(r.delivered ? 'Delivered.' : 'Tried again - it failed again.')
      qc.invalidateQueries({ queryKey: ['integrations', 'deliveries'] })
    },
  })

  if (!isAdmin) {
    return (
      <div style={S.page}>
        <h1 style={S.h1}>Connect your systems</h1>
        <p style={S.lede}>Only an admin in your organisation can set this up. Ask whoever manages Groundwork for your organisation.</p>
      </div>
    )
  }

  /* THE API IS BEHIND A REQUEST. Until it is approved the page is the plain description, the pictures
     and the form; nothing an engineer would copy from is drawn. */
  const approved = !!access.data?.approved

  const setupDone = {
    /* Named `key` like the screen. A field called `credential` behind a button called "key" is the
       same drift, one layer down, and it is where the second name came from in the first place. */
    key: (creds.data ?? []).some(c => !c.revokedAt),
    /* "Something arrived" is a stronger signal than "a credential exists" - it is the difference
       between having a key and having used it. */
    used: (creds.data ?? []).some(c => c.lastUsedAt),
    webhook: (endpoints.data ?? []).length > 0,
    delivered: (deliveries.data ?? []).some(d => d.status === 'DELIVERED'),
  }

  return (
    <div style={S.page}>
      <h1 style={S.h1}>Connect your systems</h1>
      {/*
        * WHAT THE PAGE IS, BEFORE WHAT THE PRODUCT CAN DO.
        *
        * The lede described Groundwork's capabilities and never said what this page is, so the
        * question somebody actually arrives with went unanswered: "does connect your system tell me
        * if I am setting up my API for my org's dashboard plug-in?" Yes - and it took reading four
        * cards and a numbered list to find that out.
        */}
      {/*
        * TWO THINGS, NOT ONE, AND THE SECOND ONE WAS INVISIBLE.
        *
        * This read as a data feed: send us your people and objectives, get results back. That is
        * half of what the page does, and the half nobody arrives wanting. The other half - putting
        * Groundwork's own check-in inside your product, so your users never leave it - was named
        * once, in the sub-label of a permission checkbox further down.
        *
        * A reader who only saw the first half concluded this was somewhere to hand over data and
        * wait, which is neither what it is nor what it costs them.
        */}
      <p style={S.lede}>
        <strong>Yes - this is the API page.</strong> Two separate things live here, and most teams
        want both.
      </p>
      <p style={S.lede}>
        <strong>Your data moves both ways.</strong> People and objectives come in from the tools you
        already use, and what check-ins produce goes back out to them. You are not handing anything
        over and waiting - you keep your systems as they are and Groundwork reads from them.
      </p>
      <p style={S.lede}>
        <strong>And you can put the check-in inside your own product.</strong> An embedded panel your
        users open without leaving your app, asking on behalf of the person already signed in to it.
        Your engineers get a key here for both.
      </p>

      {/*
        * WHAT THE PLAN ALLOWS, BEFORE ANY OF THE WORK.
        *
        * On the free plan you can read this whole page, issue a key, copy the secret and register a
        * webhook - and the first thing that fails is the token exchange, in your engineer's
        * terminal, with a 403. Everything up to that point behaves as though it worked.
        *
        * The gate sits on one route (`oauth/token`; the file that once held a plan gate, the-api-is-a-paid-thing.ts, is gone - approval is the gate now) and nothing
        * else, so this is precise about which half is affected: sending data IN needs a plan, being
        * TOLD about things does not. Saying "the API needs a plan" flatly would be simpler and
        * would be wrong about webhooks, which work either way.
        *
        * Nothing is disabled. Somebody evaluating this should be able to set it all up first and
        * subscribe when they are ready - the key they issue today starts working the day they do.
        */}
      {/*
        * SENDING DATA IN NEEDS TO BE ASKED FOR, and it used to need a plan.
        *
        * The banner is shown on the ACCESS REQUEST rather than on the
        * subscription, because that is what the API now checks. Getting this
        * wrong in the safe-looking direction — leaving the old plan warning up —
        * would tell somebody to go and pay for something that is free, which is
        * the worst version of a stale message.
        */}
      {/* A failed read of access used to strand the customer with nothing: the request form is gated on
          access.data, so no data meant no form and no explanation. Say which it is. */}
      {access.isLoading && (
        <div style={{ fontSize: 12, color: 'var(--gw-sub)', marginBottom: 12 }}>Checking whether your organisation has access...</div>
      )}
      {access.isError && (
        <div style={{ fontSize: 13, color: 'var(--gw-sub)', marginBottom: 12, lineHeight: 1.6 }}>We could not read whether your organisation has access. Reload, or email hello@myground.work.</div>
      )}
      {access.data && !access.data.approved && (
        <div style={{ background: 'var(--gw-amber-bg)', border: '1px solid var(--gw-amber-bd)', borderRadius: 10, padding: '14px 16px', marginBottom: 20 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--gw-amber-t)', marginBottom: 5 }}>
            Sending data in needs to be asked for
          </div>
          <div style={{ fontSize: 13, color: 'var(--gw-sub)', lineHeight: 1.6 }}>
            {access.data.says}{' '}
            One request covers the API, the panel on your own pages and your WhatsApp number. Using the API needs approval, not a plan: it is asked for here and read by a person. Once it is approved, this page shows the keys, the calls and the reference.
          </div>

          {access.data.status !== 'PENDING' && (
            <div style={{ marginTop: 12 }}>
              <textarea
                value={whatFor}
                onChange={(e) => setWhatFor(e.target.value)}
                placeholder="What do you want to build with it? Somebody reads this."
                aria-label="What do you want to build with it?"
                rows={3}
                style={{ width: '100%', padding: 8, fontSize: 13, borderRadius: 6, border: '1px solid var(--gw-border)', fontFamily: 'inherit' }}
              />
              {/* THE TERMS ARE READ HERE, NOT ON A PAGE OF THEIR OWN. Eight short points; the request
                  cannot be recorded until they are ticked, and the version ticked is written on it. */}
              <div style={{ marginTop: 10, fontSize: 13, color: 'var(--gw-sub)', lineHeight: 1.6 }}>
                <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', cursor: 'pointer' }}>
                  <input type="checkbox" checked={acceptedTerms} onChange={(e) => setAcceptedTerms(e.target.checked)} aria-label="I accept the API terms" style={{ marginTop: 3 }} />
                  <span>
                    I accept the API terms{terms.data ? ` (version ${terms.data.version})` : ''}.{' '}
                    <button type="button" onClick={() => setTermsOpen(o => !o)} style={{ background: 'none', border: 'none', padding: 0, color: 'var(--gw-navy)', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13 }}>
                      {termsOpen ? 'Hide them' : 'Read them'}
                    </button>
                  </span>
                </label>
                {termsOpen && terms.data && (
                  <ol style={{ margin: '10px 0 0', paddingLeft: 18 }}>
                    {terms.data.terms.map(t => (
                      <li key={t.heading} style={{ marginBottom: 6 }}>
                        <strong style={{ color: 'var(--gw-text)' }}>{t.heading}.</strong> {t.body}
                      </li>
                    ))}
                  </ol>
                )}
              </div>
              <button
                type="button"
                onClick={() => askForAccess.mutate()}
                disabled={askForAccess.isPending || !acceptedTerms || whatFor.trim().length < 20}
                style={{ marginTop: 8, fontSize: 13, padding: '6px 12px', borderRadius: 6, border: '1px solid var(--gw-border)', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                {askForAccess.isPending ? 'Asking…' : 'Ask for access'}
              </button>
              {askForAccess.isError && (
                <p style={{ fontSize: 12.5, color: 'var(--gw-red-t)', margin: '8px 0 0' }}>
                  {(askForAccess.error as { response?: { data?: { message?: string } } })?.response?.data?.message
                    ?? 'That could not be recorded.'}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* THE PLAIN-LANGUAGE HALF, FIRST. An operations lead should be able to read this and decide
          whether to involve their engineer, without reading a single JSON payload. */}
      <div style={S.sec}>What this does, in plain terms</div>
      <div style={S.card}>
        <div style={S.h3}>Your people and structure come in</div>
        <p style={S.body}>Who works here, what they are called, who they report to. Sent from your HR or identity system so you are not keeping a second list. When somebody joins, moves team or leaves, that arrives too.</p>
      </div>
      <div style={S.card}>
        {/*
          * IT SAID "OKR TOOL" AND THE API HAS NEVER BEEN OKR-SHAPED.
          *
          * Her reading: "you have okrs there but we are meant to be able to look at their crm etc
          * and all the tools they use", and "this is a lot more than okrs". Both true of what is
          * built - a subject is an objective, a project or a decision, with a measure, a target, an
          * owner, contributors, a parent and dates - and the page named one tool and one shape.
          *
          * What follows is the whole list of what the API accepts, because the page described two
          * of eight and the other six are the reason somebody would connect anything at all.
          */}
        <div style={S.h3}>What you are working towards comes in</div>
        <p style={S.body}>Objectives, projects and decisions - from your OKR tool, your project tracker, your CRM, wherever the work actually lives. Each one can carry what it is measured by, the target, who owns it, who else is on it, and what it sits under. Groundwork holds a pointer and the wording as it stood when you last sent it - never a second editable copy, because two versions that must agree is the problem this product exists to end. If it goes out of date, it says so rather than pretending.</p>
      </div>
      <div style={S.card}>
        <div style={S.h3}>Your people check in against it</div>
        <p style={S.body}>This is the part that is not a dashboard. The objectives you send become what each person is asked about, on the cadence you set - their own account of the work, in their own words, against the thing you said mattered. The report shows where those accounts agree and where they do not.</p>
      </div>
      <div style={S.card}>
        {/*
          * THE CRM ANSWER, DECIDED AND THEN FOUND TO BE ALREADY BUILT.
          *
          * "I think the CRM is evidence against objectives" - and that is exactly the shape the API
          * already had. A deal, a stage, an amount is not a thing to check in about; it is a number
          * that says how the thing you ARE checking in about is going. So there is no `deal` type
          * and there should not be: it arrives as evidence against an objective that already
          * exists, and lands in the check-in that asks about that objective.
          *
          * The page had never mentioned evidence at all, which is why a customer with a CRM had no
          * idea where it goes and reasonably concluded this was an OKR tool.
          */}
        <div style={S.h3}>Your numbers come in as evidence, not as more things to track</div>
        <p style={S.body}>Your CRM, your billing, your support desk, your analytics - whatever holds the number. It arrives against an objective that already exists rather than as another item on a list, so the person checking in is asked about the work with the current figure in front of them. Counts and short labels, never prose: "committed: 1.1m, stage: negotiation" against the objective it belongs to. We hold the last figure you sent and when you observed it, so a stale one says it is stale rather than pretending.</p>
      </div>
      <div style={S.card}>
        <div style={S.h3}>Roles, handovers and what each role turns on</div>
        <p style={S.body}>Who holds which role and since when, so a handover produces a brief rather than a gap. Each role can name the one action it lives or dies by and how often it is due - the visit, the review, the presentation - and Groundwork notices when somebody active has stopped doing it. Not before the period is half gone, and never as a verdict.</p>
      </div>
      <div style={S.card}>
        <div style={S.h3}>Your handbook and how you work</div>
        <p style={S.body}>Send the documents that say how things are done here and people can ask them in plain words. Answers quote what is written rather than paraphrasing it, and a policy that changed in March still explains a finding from March.</p>
      </div>
      <div style={S.card}>
        <div style={S.h3}>What a lead should read before a hard conversation</div>
        <p style={S.body}>For one named person: what they said they would do and what carried a date, what other people are waiting on them for and what they are waiting on, what the record raised, and what they are carrying - including any objective with no measure on it, because there is nothing to be doing well or badly against. Every section says where it came from. It is never a score, it always says what it does not know, and nothing here decides anything about anybody.</p>
      </div>
      <div style={S.card}>
        <div style={S.h3}>Invitations go out</div>
        <p style={S.body}>Groundwork gives you a link for a person to check in. Your system delivers it however it already reaches people. The link carries an invitation and nothing else.</p>
      </div>
      <div style={S.card}>
        <div style={S.h3}>Results come back</div>
        <p style={S.body}>When everybody in a session has checked in, your systems are told. The message says what happened and where to look - never what anybody said. To read the content, somebody signs in and it is governed by the same rules as everywhere else.</p>
      </div>

      {approved && (<>
      {/* GUIDED SETUP, and each step reports whether it actually happened rather than whether it was
          attempted. An admin who has finished step three should KNOW the connection works. */}
      <div style={S.sec}>Setting it up</div>
      <div style={S.card}>
        <Step done={setupDone.key} n={1} title="Issue a key" body="One per system you connect, so you can turn one off later without breaking the others." />
        <Step done={setupDone.used} n={2} title="Your system authenticates and sends something" body="Swap the key for a token, then push an objective or a person. This ticks when we have actually seen it used." />
        <Step done={setupDone.webhook} n={3} title="Register where to be told" body="An https address of yours. We sign every message so you can prove it came from us." />
        <Step done={setupDone.delivered} n={4} title="Receive one" body="This ticks the first time we deliver successfully. Until then the log below shows every attempt and what your server said back." last />
      </div>

      {/* ---------------------------------------------------------------- credentials */}
      {/*
        * ONE WORD FOR IT. The button said "key", this heading said "Credentials", and step one said
        * "credential" - three names on one screen for the thing somebody came here to get. "Key" is
        * what it gets called by the person asking for it. The API's own field names stay as they
        * are: `clientId` and `clientSecret` are what an engineer will type.
        */}
      <div style={S.sec}>Keys</div>
      <div style={S.card}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <input
            style={{ ...S.input, flex: '1 1 220px' }}
            placeholder="What is it for? e.g. Workday, our OKR tool"
            value={credName}
            onChange={e => setCredName(e.target.value)}
          />
          <button style={{ ...S.btn, opacity: !credName.trim() || issue.isPending ? 0.5 : 1 }} disabled={!credName.trim() || issue.isPending} onClick={() => issue.mutate()}>
            {issue.isPending ? 'Issuing…' : 'Issue a key'}
          </button>
        </div>
        {/*
          * A DISABLED BUTTON THAT DOES NOT SAY WHY IS A BROKEN BUTTON.
          *
          * "Issue" was disabled until a name was typed, at full opacity, with nothing saying so - so
          * pressing it did nothing at all and there was no way to find out what it wanted. Same
          * shape of fault as the org-setup form: a silent refusal reads as a dead product.
          */}
        {!credName.trim() && (
          <div style={{ fontSize: 12, color: 'var(--gw-sub)', marginTop: 8 }}>
            Name it first, so you can tell your keys apart and turn one off later without breaking the others.
          </div>
        )}
        <div style={{ display: 'flex', gap: 14, marginTop: 10, flexWrap: 'wrap' }}>
          {/* The scope name is still shown - an engineer needs the exact string - but it is no
              longer the only thing on screen, because the person choosing is usually not them. */}
          {SCOPES.map(sc => (
            <label key={sc.key} style={{ fontSize: 12, color: 'var(--gw-sub)', display: 'flex', gap: 8, alignItems: 'flex-start', flex: '1 1 240px' }}>
              <input
                type="checkbox"
                style={{ marginTop: 3 }}
                checked={credScopes.includes(sc.key)}
                onChange={e => setCredScopes(v => (e.target.checked ? [...v, sc.key] : v.filter(x => x !== sc.key)))}
              />
              <span>
                <span style={{ fontWeight: 600, color: 'var(--gw-text)' }}>{sc.label}</span>
                <span style={{ ...S.mono, marginLeft: 6, fontSize: 11, color: 'var(--gw-muted)' }}>{sc.key}</span>
                <span style={{ display: 'block', lineHeight: 1.45, marginTop: 1 }}>{sc.sub}</span>
              </span>
            </label>
          ))}
        </div>

        {freshSecret && (
          /* Shown once, said plainly. A secret a support engineer can recover is a secret an
             attacker can ask a support engineer to recover. */
          <div role="alert" tabIndex={-1} ref={(el) => el?.focus()} style={{ marginTop: 12, background: 'var(--gw-amber-bg)', border: '1px solid var(--gw-amber-b)', borderRadius: 8, padding: '12px 14px' }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--gw-amber-t)', marginBottom: 6 }}>Copy this now. It is not shown again.</div>
            <div style={{ ...S.mono, wordBreak: 'break-all', color: 'var(--gw-text)' }}>{freshSecret.clientId}</div>
            <div style={{ ...S.mono, wordBreak: 'break-all', color: 'var(--gw-text)', marginTop: 3 }}>{freshSecret.clientSecret}</div>
            <button style={{ ...S.ghost, marginTop: 9 }} onClick={async () => { (await copy(`${freshSecret.clientId}\n${freshSecret.clientSecret}`)) ? toast.success('Copied.') : toast.error('Copying is not available here. Select both lines and copy them yourself.') }}>Copy both</button>
            <button style={{ ...S.ghost, marginTop: 9, marginLeft: 8 }} onClick={() => setFreshSecret(null)}>I have saved it</button>
          </div>
        )}
      </div>

      {creds.data && creds.data.length === 0 && (
        <div style={S.card}><p style={S.body}>No keys yet. Issue one above for the system you are connecting; it is shown once.</p></div>
      )}
      {(creds.data ?? []).map(c => (
        <div key={c.id} style={{ ...S.card, paddingTop: 12, paddingBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{c.name} {c.revokedAt && <Pill tone="bad">revoked</Pill>}</div>
              <div style={{ ...S.mono, color: 'var(--gw-muted)', marginTop: 2 }}>{c.clientId}</div>
              <div style={{ fontSize: 11.5, color: 'var(--gw-muted)', marginTop: 3 }}>
                {c.scopes.join(', ')} · {c.lastUsedAt ? `last used ${new Date(c.lastUsedAt).toLocaleString()}` : 'never used'}
              </div>
              {/* THE SYSTEM IT SPEAKS FOR, said on screen because the roster is keyed on it and
                  nothing used to show it. Two credentials with different source systems are two
                  rosters, and until this line existed the only way to know was to read the code. */}
              <div style={{ fontSize: 11.5, color: 'var(--gw-muted)', marginTop: 2 }}>
                speaks for <span style={S.mono}>{c.sourceSystem}</span>
                {c.replacedByClientId && (
                  <> · replaced by <span style={S.mono}>{c.replacedByClientId}</span> — revoke this one once that is live</>
                )}
              </div>
            </div>
            {!c.revokedAt && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {!c.replacedByClientId && (
                  <button
                    style={S.ghost}
                    disabled={replace.isPending}
                    onClick={() => replace.mutate(c.clientId)}
                    title="Issue a new secret for the same integration. The old one keeps working until you revoke it."
                  >
                    Replace
                  </button>
                )}
                {/* Red, so it is not visually identical to Replace beside it; and a second press, because
                    the secret is hashed at issue and this cannot be brought back. */}
                <button style={{ ...S.ghost, color: 'var(--gw-red-t)' }} onClick={() => sure.arm(`revoke:${c.clientId}`)} disabled={revoke.isPending}>Revoke</button>
              </div>
            )}
            {sure.isArmed(`revoke:${c.clientId}`) && (
              <Confirm
                saying={`Revoke "${c.name}"? Anything using it stops working immediately, and it cannot be brought back.`}
                confirmLabel="Revoke it" keepLabel="Keep it" pending={revoke.isPending} pendingLabel="Revoking…"
                onConfirm={() => revoke.mutate(c.clientId)} onKeep={sure.disarm}
              />
            )}
          </div>
        </div>
      ))}

      {/* ---------------------------------------------------------------- imports */}
      {!!(imports.data?.jobs ?? []).length && (
        <>
          <div style={S.sec}>What your imports could not take</div>

          {imports.data?.detectionQuietUntil && (
            /*
              THE ANSWER TO "WHY AM I SEEING NOTHING", said before they have to ask.
              A new deployment that has just loaded a few thousand objectives is deliberately quiet,
              and silence with no explanation is indistinguishable from a broken product.
            */
            <div style={{ ...S.card, background: 'var(--gw-bg)' }}>
              <p style={S.body}>
                Your import started a quiet period, so Groundwork will not raise findings until{' '}
                <b>{new Date(imports.data.detectionQuietUntil).toLocaleDateString()}</b>. A first sync
                trips every check at once about work nobody has discussed yet, which is noise rather
                than news. Check-ins and reports carry on as normal.
              </p>
            </div>
          )}

          {(imports.data?.jobs ?? []).map(j => {
            const open = openJob === j.id
            return (
              <div key={j.id} style={S.card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>
                      <span style={S.mono}>{j.sourceSystem}</span>{' '}
                      {j.failed > 0
                        ? <Pill tone="warn">{j.failed} skipped</Pill>
                        : j.state === 'ABANDONED' ? <Pill tone="bad">stopped</Pill> : <Pill tone="ok">all in</Pill>}
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--gw-muted)', marginTop: 3 }}>
                      {j.succeeded} of {j.total} stored · {new Date(j.createdAt).toLocaleString()}
                      {j.error ? ` · ${j.error}` : ''}
                    </div>
                  </div>
                  {j.failed > 0 && (
                    <button style={S.ghost} onClick={() => setOpenJob(open ? null : j.id)}>
                      {open ? 'Hide' : `Show the ${j.failed} we skipped`}
                    </button>
                  )}
                </div>

                {open && (
                  <div style={{ marginTop: 12, borderTop: '1px solid var(--gw-bg)', paddingTop: 10 }}>
                    {jobDetail.isPending && <p style={S.body}>Loading…</p>}
                    {/*
                      EVERY ROW, NOT A SAMPLE. The position AND the id, because either alone is not
                      enough: a file whose rows have no ids yet cannot use the id, and reordered
                      rows cannot use the position. The message is the one they need to fix it.
                    */}
                    {(jobDetail.data?.failures ?? []).map(f => (
                      <div key={`${f.index}`} style={{ padding: '8px 0', borderBottom: '1px solid var(--gw-bg)' }}>
                        {/*
                          THE SAME NUMBER THE API RETURNS, NOT A FRIENDLIER ONE.
                          This was `f.index + 1` for about a minute, on the reasoning that a person
                          counts from one. But the field is documented as zero-based, and the
                          engineer who has to fix this reads the API - so a screen saying "row 148"
                          about what the API calls 147 is two places that must agree, disagreeing,
                          in the one place somebody is already confused. The id leads, because it is
                          the handle that survives a reordered file.
                        */}
                        <div style={{ fontSize: 12.5, fontWeight: 600 }}>
                          {f.externalId
                            ? <span style={S.mono}>{f.externalId}</span>
                            : <span style={{ color: 'var(--gw-muted)' }}>no id was sent</span>}
                          <span style={{ ...S.mono, color: 'var(--gw-muted)', fontWeight: 400 }}> · index {f.index}</span>
                        </div>
                        <div style={{ fontSize: 12.5, color: 'var(--gw-sub)', marginTop: 2 }}>{f.message}</div>
                      </div>
                    ))}
                    {!!(jobDetail.data?.failures ?? []).length && (
                      <p style={{ ...S.body, marginTop: 10, fontSize: 12.5 }}>
                        Everything else in this batch was stored. Fix these and send them again -
                        re-sending the whole batch is safe, because each row updates what is already
                        there rather than adding a second copy.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </>
      )}

      {/* ---------------------------------------------------------------- webhooks */}
      <div style={S.sec}>Where we tell you</div>
      <div style={S.card}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input style={{ ...S.input, flex: '1 1 260px' }} placeholder="https://your-system.example.com/groundwork" value={hookUrl} onChange={e => setHookUrl(e.target.value)} />
          <button style={{ ...S.btn, opacity: !hookUrl.trim() || register.isPending ? 0.5 : 1 }} disabled={!hookUrl.trim() || register.isPending} onClick={() => register.mutate()}>
            {register.isPending ? 'Adding…' : 'Add'}
          </button>
        </div>
        {/* Same silent refusal as the credential button had - dimmed and explained, not just dead. */}
        {!hookUrl.trim() && (
          <div style={{ fontSize: 12, color: 'var(--gw-sub)', marginTop: 8 }}>
            Paste the https address on your side that should receive these. We sign every message so you can prove it came from us.
          </div>
        )}
        <div style={{ display: 'flex', gap: 14, marginTop: 10, flexWrap: 'wrap' }}>
          {(events.data?.available ?? []).map(ev => (
            <label key={ev} style={{ fontSize: 12, color: 'var(--gw-sub)', display: 'flex', gap: 6, alignItems: 'center' }}>
              <input type="checkbox" checked={hookEvents.includes(ev)} onChange={e => setHookEvents(v => (e.target.checked ? [...v, ev] : v.filter(x => x !== ev)))} />
              <span style={S.mono}>{ev}</span>
            </label>
          ))}
        </div>
        {!!(events.data?.notYetEmitted ?? []).length && (
          /* Said out loud rather than hidden. An admin who has read the contract and cannot find
             `blocker.raised` here should learn why from this page, not from a support thread. */
          <p style={{ ...S.body, marginTop: 10, fontSize: 12.5 }}>
            Not offered yet, because nothing sends them: <span style={S.mono}>{(events.data?.notYetEmitted ?? []).join(', ')}</span>. They are in the contract and will appear here when the parts that raise them are built.
          </p>
        )}
        {freshHookSecret && (
          <div role="alert" tabIndex={-1} ref={(el) => el?.focus()} style={{ marginTop: 12, background: 'var(--gw-amber-bg)', border: '1px solid var(--gw-amber-b)', borderRadius: 8, padding: '12px 14px' }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--gw-amber-t)', marginBottom: 6 }}>Signing secret. Copy it now.</div>
            <div style={{ ...S.mono, wordBreak: 'break-all' }}>{freshHookSecret}</div>
            <button style={{ ...S.ghost, marginTop: 9 }} onClick={() => setFreshHookSecret(null)}>I have saved it</button>
          </div>
        )}
      </div>

      {(endpoints.data ?? []).map(e => (
        <div key={e.id} style={{ ...S.card, paddingTop: 12, paddingBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div>
              <div style={{ ...S.mono, fontWeight: 600, wordBreak: 'break-all' }}>{e.url}</div>
              <div style={{ fontSize: 11.5, color: 'var(--gw-muted)', marginTop: 3 }}>
                {e.events.join(', ')}{e.rotatedAt ? ` · secret rotated ${new Date(e.rotatedAt).toLocaleDateString()}` : ''}
                {/* Switched off by us after seven failed attempts, and said so here rather than left looking live. */}
                {!e.active && <span style={{ color: 'var(--gw-amber-t)', fontWeight: 600 }}> · switched off: we could not reach it</span>}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {!e.active && <button style={S.ghost} onClick={() => reactivate.mutate(e.id)} disabled={reactivate.isPending}>Switch back on</button>}
              <button style={S.ghost} onClick={() => sure.arm(`rotate:${e.id}`)} disabled={rotate.isPending}>Rotate secret</button>
              <button style={{ ...S.ghost, color: 'var(--gw-red-t)' }} onClick={() => sure.arm(`remove:${e.id}`)} disabled={removeEndpoint.isPending}>Remove</button>
            </div>
          </div>
          {sure.isArmed(`rotate:${e.id}`) && (
            <Confirm danger={false}
              saying={`Rotate the signing secret for ${e.url}? The old one keeps working until the next rotation; the new one is shown once.`}
              confirmLabel="Rotate it" keepLabel="Keep the current one" pending={rotate.isPending} pendingLabel="Rotating…"
              onConfirm={() => rotate.mutate(e.id)} onKeep={sure.disarm}
            />
          )}
          {sure.isArmed(`remove:${e.id}`) && (
            <Confirm
              saying={`Remove ${e.url}? Nothing more is delivered to it, and its delivery log stays.`}
              confirmLabel="Remove it" keepLabel="Keep it" pending={removeEndpoint.isPending} pendingLabel="Removing…"
              onConfirm={() => removeEndpoint.mutate(e.id)} onKeep={sure.disarm}
            />
          )}
        </div>
      ))}

      {/* ---------------------------------------------------------------- where we tell you */}
      <div style={S.sec}>Where we tell you</div>
      <div style={S.card}>
        <div style={S.h3}>A report is ready, a handoff is stuck, an integration cannot be reached: said in the channel your team lives in</div>
        <p style={S.body}>Paste an incoming-webhook address from Slack or Teams. It arrives switched off; post one test notice, see it land, then turn it on. A notice says that something is ready and links to it - never what is in it, because a channel is read by more people than a check-in.</p>
        {(notifiers.data ?? []).map(n => (
          <div key={n.kind} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--gw-border)' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{n.kind === 'SLACK' ? 'Slack' : 'Teams'}{n.channelSaid ? ` · ${n.channelSaid}` : ''} <Pill tone={n.enabled ? 'ok' : 'flat'}>{n.enabled ? 'on' : 'off'}</Pill></div>
              <div style={{ fontSize: 11.5, color: n.lastError ? 'var(--gw-amber-t)' : 'var(--gw-muted)', marginTop: 3 }}>
                {n.lastError ? `Last post failed: ${n.lastError}` : n.lastPostedAt ? `Last posted ${new Date(n.lastPostedAt).toLocaleDateString()}` : 'Nothing posted yet'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button style={S.ghost} onClick={() => testWs.mutate(n.kind === 'SLACK' ? 'slack' : 'teams')} disabled={testWs.isPending}>Post a test</button>
              <button style={S.ghost} onClick={() => turnWs.mutate({ kind: n.kind === 'SLACK' ? 'slack' : 'teams', on: !n.enabled })}>{n.enabled ? 'Switch off' : 'Switch on'}</button>
              <button style={S.ghost} onClick={() => { if (window.confirm('Forget this address? Nothing already posted is deleted.')) disconnectWs.mutate(n.kind === 'SLACK' ? 'slack' : 'teams') }}>Remove</button>
            </div>
          </div>
        ))}
        <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 1fr auto', gap: 8, marginTop: 14, alignItems: 'center' }}>
          <select style={S.input} value={wsKind} onChange={e => setWsKind(e.target.value as 'slack' | 'teams')} aria-label="Slack or Teams">
            <option value="slack">Slack</option>
            <option value="teams">Teams</option>
          </select>
          <input style={S.input} placeholder="https://hooks.slack.com/services/…" value={wsUrl} onChange={e => setWsUrl(e.target.value)} aria-label="Incoming webhook address" />
          <input style={S.input} placeholder="Channel, as you call it (optional)" value={wsChannel} onChange={e => setWsChannel(e.target.value)} aria-label="Channel name" />
          <button style={S.btn} onClick={() => connectWs.mutate()} disabled={!wsUrl.trim().startsWith('https://') || connectWs.isPending}>Connect</button>
        </div>
      </div>

      {/* ---------------------------------------------------------------- embed the panel */}
      <div style={S.sec}>Embed the panel</div>
      <div style={S.card}>
        <div style={S.h3}>{embed.data ? `Set up for ${embed.data.allowedDomains.length} domain${embed.data.allowedDomains.length === 1 ? '' : 's'}` : 'Put the check-in inside your own product'}</div>
        <p style={S.body}>Your people check in from a panel on your own pages, signed in as themselves by your login. Say which domains may load it, where it sits, and which departments should see nothing at all - not a disabled launcher, nothing. Saving issues a signing secret your server uses to mint identity tokens; it is shown once.</p>
        <div style={{ display: 'grid', gap: 8, marginTop: 14 }}>
          <input style={S.input} placeholder={embed.data?.allowedDomains.join(', ') || 'app.yourcompany.com, intranet.yourcompany.com'} value={embedDomains} onChange={e => setEmbedDomains(e.target.value)} aria-label="Allowed domains" />
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <select style={{ ...S.input, width: 'auto' }} value={embedPlacement} onChange={e => setEmbedPlacement(e.target.value as 'floating' | 'anchor')} aria-label="Placement">
              <option value="floating">Floating launcher</option>
              <option value="anchor">Anchored to an element</option>
            </select>
            <input style={S.input} placeholder={embed.data?.outOfScopeDepartments.join(', ') || 'Departments that see nothing (optional, comma-separated)'} value={embedOutOfScope} onChange={e => setEmbedOutOfScope(e.target.value)} aria-label="Out-of-scope departments" />
          </div>
          <div><button style={S.btn} onClick={() => setUpEmbed.mutate()} disabled={!embedDomains.trim() || setUpEmbed.isPending}>{embed.data ? 'Save and issue a new signing secret' : 'Save and issue the signing secret'}</button></div>
        </div>
        {embedSecret && (
          <div style={{ marginTop: 12, padding: '10px 12px', background: 'var(--gw-amber-bg)', border: '1px solid var(--gw-amber-b-soft)', borderRadius: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--gw-amber-t)' }}>Signing secret - shown once</div>
            <div style={{ ...S.mono, wordBreak: 'break-all', marginTop: 4 }}>{embedSecret}</div>
          </div>
        )}
        {embed.data && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 6 }}>Paste on the pages that should carry it</div>
            <pre style={{ ...S.mono, background: 'var(--gw-bg)', padding: '10px 12px', borderRadius: 8, overflowX: 'auto', margin: 0 }}>{`<script src="${API_ORIGIN}/embed.js" data-mode="${embed.data.placement}" data-token="TOKEN_YOUR_SERVER_MINTS"${embed.data.placement === 'anchor' ? ' data-anchor="#groundwork"' : ''}></script>`}</pre>
            <p style={{ ...S.body, marginTop: 6 }}>Your server signs a short-lived token for the signed-in person with the secret above (HS256, their id in <span style={S.mono}>sub</span>) and puts it in <span style={S.mono}>data-token</span>. The panel then knows who they are without a second login.</p>
          </div>
        )}
      </div>

      {/* ---------------------------------------------------------------- whatsapp */}
      <div style={S.sec}>Your WhatsApp number</div>
      <div style={S.card}>
        <div style={S.h3}>{whatsapp.data?.connection ? `Connected${whatsapp.data.connection.displayNumber ? `: ${whatsapp.data.connection.displayNumber}` : ''}` : 'Check in by WhatsApp, on your own number'}</div>
        <p style={S.body}>
          Your people reply to a message on your organisation's WhatsApp number and that reply is their check-in, exactly as if typed here. With no check-in open, the same message goes to the assistant: what is due, what they committed to, a note for their list. Phone numbers come from your roster: SCIM <span style={S.mono}>phoneNumbers[]</span>, <span style={S.mono}>phone</span> on <span style={S.mono}>POST /people</span>, or what each person enters under Settings.
        </p>
        {whatsapp.data?.connection ? (
          <>
            <div style={{ ...S.row, flexWrap: 'wrap' }}>
              <div style={{ fontSize: 12.5, color: 'var(--gw-sub)' }}>
                Number id <span style={S.mono}>{whatsapp.data.connection.phoneNumberId}</span> · token ending <span style={S.mono}>{whatsapp.data.connection.tokenEndsWith}</span>
                {whatsapp.data.connection.lastInboundAt ? ` · last message in ${new Date(whatsapp.data.connection.lastInboundAt).toLocaleString()}` : ' · nothing received yet'}
                {whatsapp.data.connection.lastOutboundAt ? ` · last sent ${new Date(whatsapp.data.connection.lastOutboundAt).toLocaleString()}` : ''}
              </div>
              <Pill tone={whatsapp.data.connection.enabled ? 'ok' : 'warn'}>{whatsapp.data.connection.enabled ? 'on' : 'off'}</Pill>
            </div>
            <div style={{ marginTop: 12, background: 'var(--gw-bg)', border: '1px solid var(--gw-border)', borderRadius: 8, padding: '12px 14px' }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 6 }}>In Meta Business, under WhatsApp, Configuration, set the webhook to</div>
              <div style={{ ...S.mono, wordBreak: 'break-all' }}>{API_ORIGIN}{whatsapp.data.webhookPath}</div>
              <div style={{ fontSize: 12.5, fontWeight: 700, margin: '10px 0 6px' }}>with this verify token, and subscribe to messages</div>
              <div style={{ ...S.mono, wordBreak: 'break-all' }}>{whatsapp.data.connection.verifyToken}</div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <input style={{ ...S.input, maxWidth: 220 }} placeholder="+2348012345678" value={waTestTo} onChange={e => setWaTestTo(e.target.value)} aria-label="Number to send a test to" />
              <button style={S.btn} onClick={() => testWa.mutate()} disabled={!waTestTo.trim() || testWa.isPending}>{testWa.isPending ? 'Sending…' : 'Send a test message'}</button>
              <button style={S.ghost} onClick={() => toggleWa.mutate(!whatsapp.data!.connection!.enabled)}>{whatsapp.data.connection.enabled ? 'Switch off' : 'Switch on'}</button>
              <button style={S.ghost} onClick={() => { if (window.confirm('Remove the WhatsApp connection? Nothing sent or received is deleted.')) disconnectWa.mutate() }}>Remove</button>
            </div>
            <details style={{ marginTop: 12 }}>
              <summary style={{ fontSize: 12.5, cursor: 'pointer', color: 'var(--gw-navy)' }}>Change the number id or rotate the token</summary>
              <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
                <input style={S.input} placeholder="Phone number id (digits)" value={waNumberId} onChange={e => setWaNumberId(e.target.value)} aria-label="Phone number id" />
                <input style={S.input} placeholder="New permanent access token (leave blank to keep)" value={waToken} onChange={e => setWaToken(e.target.value)} aria-label="Access token" type="password" />
                <input style={S.input} placeholder="New app secret (leave blank to keep)" value={waSecret} onChange={e => setWaSecret(e.target.value)} aria-label="App secret" type="password" />
                <button style={S.btn} onClick={() => connectWa.mutate()} disabled={!waNumberId.trim() || connectWa.isPending}>Save</button>
              </div>
            </details>
          </>
        ) : (
          <div style={{ display: 'grid', gap: 8, marginTop: 6 }}>
            <p style={{ ...S.body, marginBottom: 0 }}>You need a Meta Business account with a WhatsApp number and a Meta app. From WhatsApp, API Setup, copy the phone number id and a permanent system-user token; from the app's Basic Settings, the App Secret. Paste them here, then set the webhook Meta asks for with the address and token this page shows next.</p>
            <input style={S.input} placeholder="Phone number id (digits, from API Setup)" value={waNumberId} onChange={e => setWaNumberId(e.target.value)} aria-label="Phone number id" />
            <input style={S.input} placeholder="WhatsApp Business Account id (optional)" value={waBusinessId} onChange={e => setWaBusinessId(e.target.value)} aria-label="Business account id" />
            <input style={S.input} placeholder="The number, as people will see it (optional)" value={waDisplay} onChange={e => setWaDisplay(e.target.value)} aria-label="Display number" />
            <input style={S.input} placeholder="Permanent access token" value={waToken} onChange={e => setWaToken(e.target.value)} aria-label="Access token" type="password" />
            <input style={S.input} placeholder="App secret" value={waSecret} onChange={e => setWaSecret(e.target.value)} aria-label="App secret" type="password" />
            <div><button style={S.btn} onClick={() => connectWa.mutate()} disabled={!waNumberId.trim() || !waToken.trim() || !waSecret.trim() || connectWa.isPending}>{connectWa.isPending ? 'Connecting…' : 'Connect'}</button></div>
          </div>
        )}
      </div>

      {/* ---------------------------------------------------------------- delivery log */}
      <div style={S.sec}>Every message we tried to send</div>
      {!(deliveries.data ?? []).length && (
        <div style={S.card}><p style={S.body}>Nothing yet. This fills in as sessions complete.</p></div>
      )}
      {!!(deliveries.data ?? []).length && (
        <div style={S.card}>
          {(deliveries.data ?? []).map(d => (
            <div key={d.id} style={S.row}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>
                  <span style={S.mono}>{d.eventType}</span>{' '}
                  <Pill tone={d.status === 'DELIVERED' ? 'ok' : d.status === 'DEAD' ? 'bad' : d.status === 'FAILED' ? 'warn' : 'flat'}>{d.status.toLowerCase()}</Pill>
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--gw-muted)', marginTop: 3 }}>
                  {d.attempts} attempt{d.attempts === 1 ? '' : 's'}
                  {d.responseCode != null && ` · your server said ${d.responseCode}`}
                  {d.responseBody ? ` · ${d.responseBody.slice(0, 80)}` : ''}
                  {d.nextAttemptAt && ` · next try ${new Date(d.nextAttemptAt).toLocaleTimeString()}`}
                </div>
              </div>
              <button style={S.ghost} onClick={() => replay.mutate(d.id)} disabled={replay.isPending && replay.variables === d.id}>{replay.isPending && replay.variables === d.id ? 'Sending…' : 'Send again'}</button>
            </div>
          ))}
        </div>
      )}

      </>)}

      {/* ---------------------------------------------------------------- the security page */}
      {/* ---------------------------------------------------------------- what it looks like */}
      <div style={S.sec}>What it looks like</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
        {[
          { src: '/connect/panel.png', title: 'The panel on your own page', body: 'One script tag. Your people see what is due and do their check-in without leaving your system.' },
          { src: '/connect/ops-panel.png', title: 'An organisation\'s own panel in its back office', body: 'The same assistant, embedded where the work is managed: what is due, who is waiting, what came of it.' },
          { src: '/connect/whatsapp.png', title: 'A check-in over WhatsApp', body: 'On your number. A reply is an answer; a photo is a document; the report comes back as a message.' },
        ].map((c) => (
          <div key={c.src} style={{ ...S.card, padding: 0, overflow: 'hidden' }}>
            <img src={c.src} alt={c.title} style={{ display: 'block', width: '100%', aspectRatio: '4 / 3', objectFit: 'cover', objectPosition: 'top', borderBottom: '1px solid var(--gw-border)', background: 'var(--gw-bg)' }} />
            <div style={{ padding: '12px 14px' }}>
              <div style={S.h3}>{c.title}</div>
              <p style={{ ...S.body, marginBottom: 0 }}>{c.body}</p>
            </div>
          </div>
        ))}
      </div>

      {approved && (<>
      {/* FOLDED BY DEFAULT. The page reads as the product first; the calls are one click away for the
          person who needs them. */}
      <div style={{ ...S.sec, display: 'flex', alignItems: 'baseline', gap: 12 }}>
        <span>For your engineer</span>
        <button type="button" onClick={() => setEngineerOpen(o => !o)} style={{ fontSize: 12.5, fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: 'var(--gw-navy)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
          {engineerOpen ? 'Hide the calls' : 'Show the calls'}
        </button>
      </div>
      {engineerOpen && (<>
      <div style={S.card}>
        {/*
          * THE FIRST TWO REQUESTS, WRITTEN OUT.
          *
          * Step 2 above says "exchange the credential for a token, then push an objective or a
          * person" and stops there. Somebody who has just pressed Issue has a key in their hand and
          * no idea what to do with it, and the only way to find out was to read a generated
          * reference and work out that it is two calls rather than one.
          *
          * The client id is the real one when a credential exists, so this is a command that runs
          * rather than a template to adapt. The secret cannot be - it is shown once, at issue time,
          * and is not stored anywhere we could read it back from.
          *
          * BOTH OF THESE WERE RUN AGAINST THE API BEFORE BEING PUT ON THE SCREEN, and the second one
          * was wrong when it was written: it omitted `type`, which is required, and the push came
          * back 400. An example that does not run is worse than no example - the person following it
          * has no way to tell whether the API is broken or the instructions are.
          */}
        <p style={{ ...S.body, marginBottom: 10 }}>
          Two requests. The first swaps your key for a token that lasts an hour; the second uses it.
        </p>
        <pre style={{ ...S.mono, background: 'var(--gw-paper-2)', border: '1px solid var(--gw-border)', borderRadius: 8, padding: '12px 14px', overflowX: 'auto', fontSize: 12, lineHeight: 1.65, margin: '0 0 10px' }}>
{`curl -X POST ${API_ORIGIN || 'https://api.myground.work'}/api/org/v1/oauth/token \\
  -H 'content-type: application/json' \\
  -d '{"grant_type":"client_credentials",
       "client_id":"${firstClientId ?? 'gwc_your_client_id'}",
       "client_secret":"gws_the_secret_shown_when_you_issued_it"}'`}
        </pre>
        <p style={{ ...S.body, marginBottom: 10, fontSize: 12.5 }}>
          That answers with <span style={S.mono}>access_token</span>. Send it as a bearer token on
          everything after it - here is an objective arriving from your system:
        </p>
        <pre style={{ ...S.mono, background: 'var(--gw-paper-2)', border: '1px solid var(--gw-border)', borderRadius: 8, padding: '12px 14px', overflowX: 'auto', fontSize: 12, lineHeight: 1.65, margin: '0 0 12px' }}>
{`curl -X POST ${API_ORIGIN || 'https://api.myground.work'}/api/org/v1/subjects \\
  -H 'authorization: Bearer $ACCESS_TOKEN' \\
  -H 'content-type: application/json' \\
  -d '{"externalId":"OKR-142",
       "sourceSystem":"your-okr-tool",
       "type":"objective",
       "title":"Ship the billing rewrite",
       "ownerExternalId":"priya@yourcompany.com"}'`}
        </pre>
        {/*
          * AND THE BULK PUSH, WHICH IS THE ONE A REAL INTEGRATION USES.
          *
          * Nobody sends five hundred objectives one at a time, and the page documented only the
          * single push - so the first thing anybody does after following it is guess at the batch
          * shape. It is NOT the single body in an array: `sourceSystem` moves to the batch, and a
          * batch answers with a job id rather than the rows.
          *
          * I got this wrong myself while testing, by copying the single push into an array and
          * putting sourceSystem on each row. It answers "sourceSystem is required on the batch."
          */}
        <p style={{ ...S.body, marginBottom: 10, fontSize: 12.5 }}>
          Sending more than a handful? Post them together. The system is named once for the batch,
          not on each row, and you get a job id back rather than the rows:
        </p>
        <pre style={{ ...S.mono, background: 'var(--gw-paper-2)', border: '1px solid var(--gw-border)', borderRadius: 8, padding: '12px 14px', overflowX: 'auto', fontSize: 12, lineHeight: 1.65, margin: '0 0 10px' }}>
{`curl -X POST ${API_ORIGIN || 'https://api.myground.work'}/api/org/v1/subjects/bulk \\
  -H 'authorization: Bearer $ACCESS_TOKEN' \\
  -H 'content-type: application/json' \\
  -d '{"sourceSystem":"your-okr-tool",
       "subjects":[
         {"externalId":"OKR-142","type":"objective","title":"Ship the billing rewrite"},
         {"externalId":"OKR-143","type":"objective","title":"Cut onboarding to a week"}
       ]}'`}
        </pre>
        <p style={{ ...S.body, marginBottom: 10, fontSize: 12.5 }}>
          One bad row does not stop the rest. The others are stored, and what was skipped appears
          above with the row and the reason, so you can fix those and send them again.
        </p>
        {/*
          * AND THE CRM PATH, WHICH IS THE ONE PEOPLE ASK ABOUT AND THE PAGE NEVER SHOWED.
          *
          * Evidence goes against an objective that already exists. It is a PUT rather than a POST
          * because it is the current state of something rather than another entry in a log - a
          * nightly push replaces yesterday's figure and does not stack up beside it.
          *
          * `matched: false` for an objective that is not on any check-in, rather than an error: a
          * nightly push covering the whole org will name objectives nobody is checking in about,
          * and failing the batch for that would make the integration useless. Run before it was
          * written down, including that case.
          */}
        <p style={{ ...S.body, marginBottom: 10, fontSize: 12.5 }}>
          Numbers from your CRM or anywhere else go against an objective that already exists, and
          arrive in the check-in that asks about it:
        </p>
        <pre style={{ ...S.mono, background: 'var(--gw-paper-2)', border: '1px solid var(--gw-border)', borderRadius: 8, padding: '12px 14px', overflowX: 'auto', fontSize: 12, lineHeight: 1.65, margin: '0 0 10px' }}>
{`curl -X PUT ${API_ORIGIN || 'https://api.myground.work'}/api/org/v1/evidence \\
  -H 'authorization: Bearer $ACCESS_TOKEN' \\
  -H 'content-type: application/json' \\
  -d '{"evidence":[
        {"objectiveExternalId":"OKR-9",
         "observedAt":"2026-08-28T09:00:00Z",
         "state":{"committed":"1.1m","stage":"negotiation","deals":"7"}}
      ]}'`}
        </pre>
        <p style={{ ...S.body, marginBottom: 12, fontSize: 12.5 }}>
          It answers <span style={S.mono}>matched: true</span> per item, or{' '}
          <span style={S.mono}>matched: false</span> for an objective nobody is checking in about -
          not an error, so a nightly push covering everything does not fail on the parts nobody is
          discussing. Send <span style={S.mono}>observedAt</span> and we hold your observation time
          rather than ours, so a figure that is three days old says so instead of looking current.
        </p>
        {/*
          * OPENING A CHECK-IN, the call an embedded integration makes most and the last one with no
          * example.
          *
          * THE SITUATION AND MOMENT ARE SPELLED OUT because they are fixed values with no obvious
          * names, and a first guess at them is wrong. Driving this myself, "performance" and
          * "underway" both looked right and neither exists. The full list is in the reference; the
          * three here are the ones an integration opens by far the most.
          *
          * `actingPersonExternalId` is explained rather than listed. A machine token carries an
          * organisation and nobody in particular, and a check-in has a real initiator whose name
          * appears in the report - so the caller has to say who is opening it. That is a rule worth
          * one sentence here rather than a 404 later.
          */}
        <p style={{ ...S.body, marginBottom: 10, fontSize: 12.5 }}>
          Opening a check-in from inside your product:
        </p>
        <pre style={{ ...S.mono, background: 'var(--gw-paper-2)', border: '1px solid var(--gw-border)', borderRadius: 8, padding: '12px 14px', overflowX: 'auto', fontSize: 12, lineHeight: 1.65, margin: '0 0 10px' }}>
{`curl -X POST ${API_ORIGIN || 'https://api.myground.work'}/api/org/v1/grounds \\
  -H 'authorization: Bearer $ACCESS_TOKEN' \\
  -H 'content-type: application/json' \\
  -d '{"actingPersonExternalId":"ADA-1",
       "label":"Q4 pipeline",
       "scenario":"OKR_ALIGNMENT",
       "moment":"STARTING",
       "participants":[{"personExternalId":"SAM-1",
                        "roleAsDescribed":"Runs the pipeline"}]}'`}
        </pre>
        <p style={{ ...S.body, marginBottom: 12, fontSize: 12.5 }}>
          <span style={S.mono}>scenario</span> and <span style={S.mono}>moment</span> are fixed
          values, and the common ones are <span style={S.mono}>NEW_HIRE</span>,{' '}
          <span style={S.mono}>NEW_PROJECT</span> and <span style={S.mono}>OKR_ALIGNMENT</span>, each
          with a moment of <span style={S.mono}>STARTING</span>,{' '}
          <span style={S.mono}>RECOGNITION</span> or <span style={S.mono}>RESOLUTION</span>. Send one
          we do not have and you get a list of the ones we do. Somebody has to be named as opening
          it: a key belongs to your organisation and nobody in particular, and a check-in has a real
          person as its initiator, whose name appears in the report.
        </p>
        <p style={{ ...S.body, marginBottom: 12, fontSize: 12.5 }}>
          Back come the check-in id and one invitation link per person, addressed by your own ids
          rather than by email, so you deliver them inside the product those people already have
          open. We email them as well.
        </p>

        {/*
          * AND THE READ, which the plain list above describes and the engineer had no example of.
          *
          * A GET, and the only example here that returns something about a NAMED PERSON. So it is
          * the one that has to show what comes back as well as how to ask - `refusal` and
          * `completeness` are not decoration, they are the terms this is served on, and an
          * integrator who does not know they are in the payload will render the sections and drop
          * them. Run against the live API before it was written down, including the empty case.
          */}
        <p style={{ ...S.body, marginBottom: 10, fontSize: 12.5 }}>
          And what a lead should read before a hard conversation, for one named person:
        </p>
        <pre style={{ ...S.mono, background: 'var(--gw-paper-2)', border: '1px solid var(--gw-border)', borderRadius: 8, padding: '12px 14px', overflowX: 'auto', fontSize: 12, lineHeight: 1.65, margin: '0 0 10px' }}>
{`curl ${API_ORIGIN || 'https://api.myground.work'}/api/org/v1/people/SAM-1/before-a-conversation \\
  -H 'authorization: Bearer $ACCESS_TOKEN'`}
        </pre>
        <p style={{ ...S.body, marginBottom: 12, fontSize: 12.5 }}>
          It needs the read-one-person's-desk permission, not the findings one - this is a great deal
          more than a finding and no integration should get it by accident. What comes back carries{' '}
          <span style={S.mono}>sections</span> with where each came from, a{' '}
          <span style={S.mono}>completeness</span> band saying how much of a picture this is, and a{' '}
          <span style={S.mono}>refusal</span> stating that it is not an assessment. Show all three.
          Where the record holds nothing you get that said plainly rather than an empty page, so a
          lead is never handed a blank screen about a person and left to read it as a verdict.
        </p>
        <p style={{ ...S.body, marginBottom: 8, fontSize: 12.5 }}>
          The full reference is generated from the running code rather than written by hand, so it
          cannot drift from what the API actually does.
        </p>
        <button type="button" onClick={() => openDocs.mutate()} disabled={openDocs.isPending} style={{ ...S.mono, color: 'var(--gw-navy)', fontWeight: 600, background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
          {openDocs.isPending ? 'Opening…' : 'Open the API reference →'}
        </button>
      </div>
      </>)}
      </>)}
    </div>
  )
}

function Step({ n, title, body, done, last }: { n: number; title: string; body: string; done: boolean; last?: boolean }) {
  return (
    <div style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: last ? 'none' : '1px solid var(--gw-bg)' }}>
      <div style={{
        flexShrink: 0, width: 22, height: 22, borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, fontWeight: 700,
        background: done ? 'var(--gw-green-bg)' : 'var(--gw-bg)', color: done ? 'var(--gw-green-t)' : 'var(--gw-muted)',
        border: `1px solid ${done ? 'var(--gw-green-b-soft)' : 'var(--gw-border)'}`,
      }}>{done ? '✓' : n}</div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gw-text)' }}>{title}</div>
        <div style={{ fontSize: 12.5, color: 'var(--gw-sub)', lineHeight: 1.55, marginTop: 2 }}>{body}</div>
      </div>
    </div>
  )
}
