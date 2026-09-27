import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { integrationsApi, type WhatsAppConnection } from '@/api/integrations'
import { API_ORIGIN } from '@/lib/where-the-api-lives'
import { useAuthStore } from '@/stores/auth'
import { Button, Tag } from '@/components/gw/kit'
import { copy } from '@/components/gw/copying-can-fail'
import { OnlyAnAdmin } from './ConnectionsPage'

/**
 * CONNECT WHATSAPP (F1, #/settings/whatsapp, U.18). The wording is copied from
 * docs/prototype/screens/F1-connections/whatsapp.txt, and, where that screen shows nothing (the
 * bodies of steps 4 to 6, and a connected number), from what the product's Connect page said
 * before (docs/morning-report-ui.md, item 29).
 *
 * The real connection, never a pretend one (not-to-build.md): each step is done only when the server
 * says so. Step 2 when the number is saved; step 3 when Meta's handshake answered or a message came
 * in through the address (webhookProvenAt, U.18); step 4 when a message went out on the number; step
 * 5 when the reminder messages are recorded as approved; step 6 when the connection is on.
 *
 * Secrets go in and are never read back: the token and the app secret are write-only on the server.
 * Admins only, on the server (@Roles(ADMIN)) and at the door (App.tsx).
 */

const HOW_TO_GET_THESE = 'https://developers.facebook.com/docs/whatsapp/cloud-api/get-started'

type Step = { n: number; title: string; done: boolean }

export function stepsFor(c: WhatsAppConnection | null, canStart: boolean): Step[] {
  return [
    { n: 1, title: 'What you need first', done: !!c },
    { n: 2, title: 'Paste three things from Meta', done: !!c },
    { n: 3, title: 'Tell Meta where to send replies', done: !!c?.webhookProvenAt },
    { n: 4, title: 'Send yourself a test', done: !!c?.lastOutboundAt },
    { n: 5, title: 'Approve the reminder messages', done: !!c && canStart },
    { n: 6, title: 'Turn it on, and choose who uses it', done: !!c?.enabled && !!c?.webhookProvenAt },
  ]
}

export function WhatsAppSetupPage() {
  const user = useAuthStore(s => s.user)
  const isAdmin = user?.role === 'ADMIN'
  const orgName = user?.organization?.name?.trim() || user?.organizationName || ''
  const qc = useQueryClient()
  const whatsapp = useQuery({
    queryKey: ['integrations', 'whatsapp'],
    queryFn: integrationsApi.whatsapp,
    enabled: isAdmin,
    /* "This page updates on its own": while the address is not proven, ask again every ten seconds. */
    refetchInterval: (q) => {
      const c = (q.state.data as { connection: WhatsAppConnection | null } | undefined)?.connection
      return c && !c.webhookProvenAt ? 10_000 : false
    },
  })
  const data = whatsapp.data as (NonNullable<typeof whatsapp.data> & {
    canStartAConversation?: boolean; theNamesToSubmit?: string[]; approvedHere?: string[]; languages?: string[]
  }) | undefined
  const c = data?.connection ?? null
  const steps = stepsFor(c, data?.canStartAConversation === true)
  /* Step 1 has nothing to press, so before anything is saved the step to do is 2, and 1 stays open above it. */
  const current = c ? steps.find(s => !s.done)?.n ?? 0 : 2
  const [opened, setOpened] = useState<number[]>([])
  const refresh = () => { qc.invalidateQueries({ queryKey: ['integrations'] }); qc.invalidateQueries({ queryKey: ['whatsapp-is-on'] }) }

  const [numberId, setNumberId] = useState('')
  const [token, setToken] = useState('')
  const [secret, setSecret] = useState('')
  const [display, setDisplay] = useState('')
  const [business, setBusiness] = useState('')
  const [to, setTo] = useState('')
  const save = useMutation({
    mutationFn: () => integrationsApi.connectWhatsapp({
      phoneNumberId: numberId.trim() || c?.phoneNumberId || '',
      businessAccountId: business.trim() || c?.businessAccountId || undefined,
      displayNumber: display.trim() || c?.displayNumber || undefined,
      accessToken: token.trim() || undefined,
      appSecret: secret.trim() || undefined,
    }),
    onSuccess: () => { setToken(''); setSecret(''); refresh(); toast.success('Connected. Now point Meta at the webhook address below.') },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Could not connect.'),
  })
  const test = useMutation({
    mutationFn: () => integrationsApi.testWhatsapp(to),
    onSuccess: () => { toast.success('Sent. Check that phone.'); refresh() },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Meta refused it.'),
  })
  const turn = useMutation({
    mutationFn: (enabled: boolean) => integrationsApi.setWhatsappEnabled(enabled),
    onSuccess: refresh,
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'That did not change. WhatsApp is as it was. Try again.'),
  })
  const [picked, setPicked] = useState<string[] | null>(null)
  const approved = picked ?? data?.approvedHere ?? []
  const saveTemplates = useMutation({
    mutationFn: () => integrationsApi.whatsappTemplates(approved),
    onSuccess: () => { setPicked(null); refresh(); toast.success('Saved. Anything we start now goes as an approved message.') },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'That did not save.'),
  })

  const callback = `${API_ORIGIN}${data?.webhookPath ?? ''}`
  const firstTime = !c
  const mayConnect = firstTime ? !!numberId.trim() && !!token.trim() && !!secret.trim() : true

  if (!isAdmin) return <OnlyAnAdmin />

  function body(n: number) {
    switch (n) {
      case 1:
        return <p>A Meta Business account, a WhatsApp Business number on it, and a Meta app with WhatsApp added. <a href={HOW_TO_GET_THESE} target="_blank" rel="noreferrer">How to get these</a></p>
      case 2:
        return (
          <form onSubmit={e => { e.preventDefault(); if (mayConnect) save.mutate() }}>
            <Field label="Phone number ID" hint="In Meta: WhatsApp, API Setup.">
              <input className="gw-input" value={numberId} onChange={e => setNumberId(e.target.value)} placeholder={c?.phoneNumberId ?? ''} aria-label="Phone number ID" inputMode="numeric" />
            </Field>
            <Field label="Access token" hint="A permanent system-user token, not the 24-hour one. In Meta: Business Settings, System users.">
              <input className="gw-input" type="password" value={token} onChange={e => setToken(e.target.value)} placeholder={c ? 'New permanent access token (leave blank to keep)' : ''} aria-label="Access token" />
            </Field>
            <Field label="App secret" hint="In Meta: your app, Settings, Basic.">
              <input className="gw-input" type="password" value={secret} onChange={e => setSecret(e.target.value)} placeholder={c ? 'New app secret (leave blank to keep)' : ''} aria-label="App secret" />
            </Field>
            <Field label="The number, as people will see it (optional)">
              <input className="gw-input" value={display} onChange={e => setDisplay(e.target.value)} placeholder={c?.displayNumber ?? ''} aria-label="The number, as people will see it" />
            </Field>
            <Field label="WhatsApp Business Account id (optional)">
              <input className="gw-input" value={business} onChange={e => setBusiness(e.target.value)} placeholder={c?.businessAccountId ?? ''} aria-label="WhatsApp Business Account id" />
            </Field>
            <div className="gw-conn-actions">
              <Button kind="primary" size="small" type="submit" disabled={!mayConnect || save.isPending}>{save.isPending ? 'Connecting…' : firstTime ? 'Connect' : 'Save'}</Button>
            </div>
          </form>
        )
      case 3:
        if (!c) return null
        return (
          <>
            <p>In Meta: WhatsApp, Configuration, Webhook. Paste these two, then subscribe to <b>messages</b>.</p>
            <CopyField label="Callback address" value={callback} />
            <CopyField label="Verify token" value={c.verifyToken} />
            {!c.webhookProvenAt && (
              <div className="gw-wa-wait" role="status">
                <span>Waiting for Meta to check the address. This page updates on its own.</span>
                <Tag tone="attention">Not proven yet</Tag>
              </div>
            )}
          </>
        )
      case 4:
        if (!c) return null
        return (
          <form className="gw-conn-actions" onSubmit={e => { e.preventDefault(); if (to.trim()) test.mutate() }}>
            <input className="gw-input" placeholder="+2348012345678" value={to} onChange={e => setTo(e.target.value)} aria-label="Number to send a test to" />
            <Button kind="secondary" size="small" type="submit" disabled={!to.trim() || test.isPending}>{test.isPending ? 'Sending…' : 'Send a test message'}</Button>
          </form>
        )
      case 5:
        if (!c) return null
        return (
          <>
            {data?.canStartAConversation === false && (
              <p>Your team messages the number first. Share it with them, or send them the link to it, and ask them to say anything at all; hello will do. From that moment everything happens on WhatsApp: their check-in, their reminders and their report.</p>
            )}
            <p>If you want Groundwork to message first, WhatsApp allows it with wording Meta has approved. On your own number, that approval is yours to ask for, because it is your Meta app. Submit these names in Meta Business under Message Templates, say the message is for people your organisation has signed up to this, and tick them here when they come back approved.</p>
            {(data?.theNamesToSubmit ?? []).map(name => (
              <label key={name} className="gw-wa-template">
                <input type="checkbox" checked={approved.includes(name)} onChange={e => setPicked(e.target.checked ? [...approved, name] : approved.filter(x => x !== name))} />{' '}
                <code>{name}</code>
              </label>
            ))}
            <div className="gw-conn-actions">
              <Button kind="secondary" size="small" onClick={() => saveTemplates.mutate()} disabled={saveTemplates.isPending || picked === null}>{saveTemplates.isPending ? 'Saving…' : 'Save what Meta approved'}</Button>
            </div>
          </>
        )
      case 6:
        if (!c) return null
        return (
          <>
            <p>Whoever sets up a check-in chooses whether people answer it here or on WhatsApp.</p>
            {(data?.languages?.length ?? 0) > 0 && (
              <p>On WhatsApp the questions are short and in plain everyday words, one at a time, the way you would ask somebody in person. People can answer in {data!.languages!.length} languages, and the check-in carries on in whichever they use: {data!.languages!.join(', ')}.</p>
            )}
            <div className="gw-conn-actions">
              <Tag tone={c.enabled ? 'proven' : 'plain'}>{c.enabled ? 'On' : 'Off'}</Tag>
              <Button kind={c.enabled ? 'quiet' : 'primary'} size="small" onClick={() => turn.mutate(!c.enabled)} disabled={turn.isPending}>{c.enabled ? 'Switch off' : 'Switch on'}</Button>
            </div>
          </>
        )
    }
    return null
  }

  return (
    <div className="gw-you gw-conn">
      <h1 className="gw-t-title gw-suites-h1">Settings</h1>
      {orgName && <p className="gw-suites-org">{orgName}</p>}
      <Link to="/settings/connections" className="gw-conn-back">Connections</Link>
      <h2 className="gw-t-title gw-suites-h1">Connect WhatsApp</h2>
      <p className="gw-you-sub">People check in by replying to your organisation’s WhatsApp number. Most of it happens in Meta’s settings. You can stop at any step; what you’ve entered is kept.</p>

      {whatsapp.isError && <p role="alert" className="gw-t-body gw-you-quiet">Connections did not load.</p>}

      <ol className="gw-wa-steps">
        {steps.map(s => {
          const state = s.done ? 'done' : s.n === current || (s.n === 1 && !c) ? 'now' : 'later'
          const open = state !== 'later' || opened.includes(s.n)
          const content = open ? body(s.n) : null
          return (
            <li key={s.n} className={`gw-wa-step ${state}`}>
              <span className="gw-wa-num" aria-hidden>{s.done ? '✓' : s.n}</span>
              <div className="gw-wa-body">
                <div className="gw-wa-head">
                  {state === 'later' ? (
                    <h2 className="gw-t-h3">
                      <button type="button" className="gw-wa-open" aria-expanded={open} onClick={() => setOpened(o => o.includes(s.n) ? o.filter(x => x !== s.n) : [...o, s.n])}>{s.title}</button>
                    </h2>
                  ) : <h2 className="gw-t-h3">{s.title}</h2>}
                  {s.done && <Tag tone="proven">Done</Tag>}
                </div>
                {content}
              </div>
            </li>
          )
        })}
      </ol>

      <section className="gw-you-card gw-conn-sec" aria-labelledby="wa-relay">
        <h3 id="wa-relay" className="gw-t-h3">Keep your number on your own system instead</h3>
        <p>If your WhatsApp number already runs through your own customer system, it can pass check-in messages to us and send our replies back. Nothing moves to Meta. Whoever runs your systems sets this up with a key.</p>
        <Button kind="quiet" size="small" to="/settings/tools">Read how the relay works</Button>
      </section>
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="gw-wa-field">
      <b>{label}</b>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  )
}

function CopyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="gw-wa-field">
      <b>{label}</b>
      <div className="gw-wa-copy">
        <input className="gw-input" readOnly value={value} aria-label={label} />
        <Button kind="secondary" size="small" onClick={async () => { (await copy(value)) ? toast.success('Copied.') : toast.error('Copying is not available here. Select it and copy it yourself.') }}>Copy</Button>
      </div>
    </div>
  )
}
