import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { API_DOCS_URL, API_ORIGIN } from '@/lib/where-the-api-lives'
import { integrationsApi } from '@/api/integrations'
import { useAuthStore } from '@/stores/auth'
import { toast } from 'sonner'

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
  /* Null for anybody who has never paid, which is what "on the free plan" means. */
  const plan = user?.organization?.subscriptionPlan ?? null

  const [credName, setCredName] = useState('')
  const [credScopes, setCredScopes] = useState<string[]>(['subjects:write', 'findings:read'])
  /* Held in component state and nowhere else: it is shown once and there is no path to read it back. */
  const [freshSecret, setFreshSecret] = useState<{ clientId: string; clientSecret: string } | null>(null)

  const [hookUrl, setHookUrl] = useState('')
  const [hookEvents, setHookEvents] = useState<string[]>(['round.completed'])
  const [freshHookSecret, setFreshHookSecret] = useState<string | null>(null)

  const creds = useQuery({ queryKey: ['integrations', 'credentials'], queryFn: integrationsApi.listCredentials, enabled: isAdmin })
  /*
   * The example below uses a real client id when there is one, so it is a command that runs rather
   * than a template to adapt. Revoked keys are skipped - pasting a dead id would be worse than a
   * placeholder, because it fails in a way that looks like the API is broken.
   */
  const firstClientId = (creds.data ?? []).find(c => !c.revokedAt)?.clientId ?? null
  const events = useQuery({ queryKey: ['integrations', 'events'], queryFn: integrationsApi.webhookEvents, enabled: isAdmin })
  const endpoints = useQuery({ queryKey: ['integrations', 'endpoints'], queryFn: integrationsApi.listEndpoints, enabled: isAdmin })
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
    onSuccess: () => { toast.success('Revoked.'); qc.invalidateQueries({ queryKey: ['integrations', 'credentials'] }) },
  })
  const register = useMutation({
    mutationFn: () => integrationsApi.registerEndpoint(hookUrl, hookEvents),
    onSuccess: e => { setFreshHookSecret(e.secret); setHookUrl(''); qc.invalidateQueries({ queryKey: ['integrations', 'endpoints'] }) },
    onError: (e: any) => toast.error(e?.message ?? 'Could not register that endpoint.'),
  })
  const rotate = useMutation({
    mutationFn: integrationsApi.rotateSecret,
    onSuccess: r => { setFreshHookSecret(r.secret); qc.invalidateQueries({ queryKey: ['integrations', 'endpoints'] }) },
  })
  const removeEndpoint = useMutation({
    mutationFn: integrationsApi.removeEndpoint,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['integrations', 'endpoints'] }),
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
        <p style={S.lede}>Only an admin in your organisation can set this up. Ask whoever manages your Groundwork account.</p>
      </div>
    )
  }

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
      <p style={S.lede}>
        <strong>Yes - this is the API page.</strong> Get a key here, point your systems at Groundwork,
        and send events back out. Your people and objectives come in from the tools you already use;
        check-in results go back to them.
      </p>

      {/*
        * WHAT THE PLAN ALLOWS, BEFORE ANY OF THE WORK.
        *
        * On the free plan you can read this whole page, issue a key, copy the secret and register a
        * webhook - and the first thing that fails is the token exchange, in your engineer's
        * terminal, with a 403. Everything up to that point behaves as though it worked.
        *
        * The gate sits on one route (`oauth/token`, see the-api-is-a-paid-thing.ts) and nothing
        * else, so this is precise about which half is affected: sending data IN needs a plan, being
        * TOLD about things does not. Saying "the API needs a plan" flatly would be simpler and
        * would be wrong about webhooks, which work either way.
        *
        * Nothing is disabled. Somebody evaluating this should be able to set it all up first and
        * subscribe when they are ready - the key they issue today starts working the day they do.
        */}
      {!plan && (
        <div style={{ background: 'var(--gw-amber-bg)', border: '1px solid var(--gw-amber-bd)', borderRadius: 10, padding: '14px 16px', marginBottom: 20 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--gw-amber-t)', marginBottom: 5 }}>
            Sending data in needs a paid plan
          </div>
          <div style={{ fontSize: 13, color: 'var(--gw-sub)', lineHeight: 1.6 }}>
            You can set all of this up now. Issue a key, register where to be told, and it will be
            waiting - the key starts working the moment you subscribe. Until then the token request
            answers 403, and nothing else on this page is affected: we can already tell your systems
            when something happens here.{' '}
            <a href="/billing" style={{ color: 'var(--gw-navy)', fontWeight: 600 }}>See the plans →</a>
          </div>
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
        <p style={S.body}>When everybody in a round has checked in, your systems are told. The message says what happened and where to look - never what anybody said. To read the content, somebody signs in and it is governed by the same rules as everywhere else.</p>
      </div>

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
          <div style={{ marginTop: 12, background: 'var(--gw-amber-bg)', border: '1px solid var(--gw-amber-b)', borderRadius: 8, padding: '12px 14px' }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--gw-amber-t)', marginBottom: 6 }}>Copy this now. It is not shown again.</div>
            <div style={{ ...S.mono, wordBreak: 'break-all', color: 'var(--gw-text)' }}>{freshSecret.clientId}</div>
            <div style={{ ...S.mono, wordBreak: 'break-all', color: 'var(--gw-text)', marginTop: 3 }}>{freshSecret.clientSecret}</div>
            <button style={{ ...S.ghost, marginTop: 9 }} onClick={() => { navigator.clipboard?.writeText(`${freshSecret.clientId}\n${freshSecret.clientSecret}`); toast.success('Copied.') }}>Copy both</button>
            <button style={{ ...S.ghost, marginTop: 9, marginLeft: 8 }} onClick={() => setFreshSecret(null)}>I have saved it</button>
          </div>
        )}
      </div>

      {(creds.data ?? []).map(c => (
        <div key={c.id} style={{ ...S.card, paddingTop: 12, paddingBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{c.name} {c.revokedAt && <Pill tone="bad">revoked</Pill>}</div>
              <div style={{ ...S.mono, color: 'var(--gw-muted)', marginTop: 2 }}>{c.clientId}</div>
              <div style={{ fontSize: 11.5, color: 'var(--gw-muted)', marginTop: 3 }}>
                {c.scopes.join(', ')} · {c.lastUsedAt ? `last used ${new Date(c.lastUsedAt).toLocaleString()}` : 'never used'}
              </div>
            </div>
            {!c.revokedAt && (
              <button style={S.ghost} onClick={() => revoke.mutate(c.clientId)}>Revoke</button>
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
          <div style={{ marginTop: 12, background: 'var(--gw-amber-bg)', border: '1px solid var(--gw-amber-b)', borderRadius: 8, padding: '12px 14px' }}>
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
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button style={S.ghost} onClick={() => rotate.mutate(e.id)}>Rotate secret</button>
              <button style={S.ghost} onClick={() => removeEndpoint.mutate(e.id)}>Remove</button>
            </div>
          </div>
        </div>
      ))}

      {/* ---------------------------------------------------------------- delivery log */}
      <div style={S.sec}>Every message we tried to send</div>
      {!(deliveries.data ?? []).length && (
        <div style={S.card}><p style={S.body}>Nothing yet. This fills in as rounds complete.</p></div>
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
              <button style={S.ghost} onClick={() => replay.mutate(d.id)}>Send again</button>
            </div>
          ))}
        </div>
      )}

      {/* ---------------------------------------------------------------- the security page */}
      <div style={S.sec}>What this API never returns</div>
      <div style={S.card}>
        <p style={{ ...S.body, marginBottom: 10 }}>
          This is here so you can answer your own security review without opening a ticket with us.
          These are not settings. They are enforced in the code that builds every response, and a
          test blocks the build if any of them stops being true.
        </p>
        {[
          ['Any score of how clearly a person writes or speaks', 'Or anything derived from one. We measure the record, not the person’s articulacy.'],
          ['What a named person said about a colleague', 'Attributed testimony never leaves. A finding describes the work, not who reported whom.'],
          ['How often somebody took part, presented as a measure of their contribution', 'Turning up is not contributing, and a count that looks like a score gets used as one.'],
          ['Any recommended verdict about a person', 'Evidence about the work goes out. The judgement stays with the human who has to make it.'],
        ].map(([t, b]) => (
          <div key={t} style={{ padding: '9px 0', borderTop: '1px solid var(--gw-bg)' }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{t}</div>
            <div style={{ fontSize: 12.5, color: 'var(--gw-sub)', marginTop: 2, lineHeight: 1.55 }}>{b}</div>
          </div>
        ))}
        <p style={{ ...S.body, marginTop: 12, fontSize: 12.5 }}>
          Two more things hold for every request: nothing you send is ever readable by another
          organisation, and no text imported from your systems can cause a write here - an objective
          titled like an instruction is data, not a command. Both have standing tests.
        </p>
      </div>

      <div style={S.sec}>For your engineer</div>
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
        <a href={API_DOCS_URL} target="_blank" rel="noreferrer" style={{ ...S.mono, color: 'var(--gw-navy)', fontWeight: 600 }}>Open the API reference →</a>
      </div>
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
