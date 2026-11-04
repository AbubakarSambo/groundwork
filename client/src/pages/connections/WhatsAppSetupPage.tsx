import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { integrationsApi, type WhatsAppConnection } from '@/api/integrations'
import { API_ORIGIN } from '@/lib/where-the-api-lives'
import { useAuthStore } from '@/stores/auth'
import { copy } from '@/components/gw/copying-can-fail'
import { OnlyAnAdmin } from './ConnectionsPage'
import { WhatsAppKeysNeedTypingAgainNote } from './WhatsAppKeysNeedTypingAgain'
import { THIS_IS_FOR_YOUR_OWN_NUMBER, WithPeopleAndSetupLinked } from './a-team-members-number-goes-on-people-and-setup'
import {
  Page, PageTitle, Section, Panel, Stack, Button, Tag, TextField, FieldLabel, Note,
} from '@/components/gw/ui'

/**
 * USE YOUR ORGANISATION'S OWN WHATSAPP NUMBER (F1, #/settings/whatsapp, group 1 of the screens
 * rebuilt from the shared parts). Wording copied from docs/prototype/screens/F1-connections/
 * whatsapp.txt, and, where that screen shows nothing (the bodies of steps 4 to 6, and a connected
 * number), from what the product's Connect page said before (docs/morning-report-ui.md, item 29).
 *
 * RETITLED, AND ITS FIRST SENTENCE CHANGED (decision 112, 7 October): this page used to be called
 * "Connect WhatsApp", as though setting it up were the normal next step. It is optional and
 * advanced - Groundwork's own number already works for everyone without it - so the title and the
 * lede say that before anything else. Its steps are unchanged.
 *
 * The real connection, never a pretend one (not-to-build.md): each step is done only when the server
 * says so. Step 2 when the number is saved; step 3 when Meta's handshake answered or a message came
 * in through the address (webhookProvenAt); step 4 when a message went out on the number; step 5
 * when the reminder messages are recorded as approved; step 6 when the connection is on.
 *
 * Secrets go in and are never read back: the token and the app secret are write-only on the server.
 * Admins only, on the server (@Roles(ADMIN)) and at the door (App.tsx).
 *
 * REBUILT FROM THE SHARED PARTS: `Page`/`PageTitle` for the frame (with the "Connections" crumb),
 * `Panel` holds the numbered steps, each one a `.gwui-numstep` (design-audit.md's stepper has no
 * exact match in `components/gw/ui`, since `Steps`/`Step` is a closed done/not-done checklist, not a
 * set of steps each carrying its own open body and number - see the comment on that class in
 * gw-ui.css), and every field, button, tag and note below it is the standard part.
 */

const HOW_TO_GET_THESE = 'https://developers.facebook.com/docs/whatsapp/cloud-api/get-started'

type StepInfo = { n: number; title: string; done: boolean }

export function stepsFor(c: WhatsAppConnection | null, canStart: boolean): StepInfo[] {
  return [
    { n: 1, title: 'What you need first', done: !!c },
    /* Five, not the prototype's three (Drop Access, 21 October): a connection is saved only with every key, so it is never half set up. */
    { n: 2, title: 'Paste five things from Meta', done: !!c },
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
  /*
   * Step 1 has nothing to press, so before anything is saved the step to do is 2, and 1 stays open
   * above it. STEP 2 ITSELF IS "DONE" AS SOON AS A CONNECTION EXISTS (`stepsFor` above), SO IT STAYS
   * OPEN EVEN ONCE EVERYTHING ELSE IS DONE TOO - a done step's own content keeps rendering (`open`
   * below), which is exactly what a sealed key that cannot be opened needs (6 October,
   * answers-from-engine.md): the fields to retype the token and the app secret must stay visible,
   * not behind a step the connection's own age could otherwise close.
   */
  const current = c ? steps.find(s => !s.done)?.n ?? 0 : 2
  const refresh = () => { qc.invalidateQueries({ queryKey: ['integrations'] }); qc.invalidateQueries({ queryKey: ['whatsapp-is-on'] }) }

  const [numberId, setNumberId] = useState('')
  const [token, setToken] = useState('')
  const [secret, setSecret] = useState('')
  const [display, setDisplay] = useState('')
  const [business, setBusiness] = useState('')
  const [to, setTo] = useState('')
  /* Why nothing was saved, on the page and not only in a toast that goes (Drop Access, 21 October). */
  const [refused, setRefused] = useState<string | null>(null)
  const save = useMutation({
    mutationFn: () => integrationsApi.connectWhatsapp({
      phoneNumberId: numberId.trim() || c?.phoneNumberId || '',
      businessAccountId: business.trim() || c?.businessAccountId || undefined,
      displayNumber: display.trim() || c?.displayNumber || undefined,
      accessToken: token.trim() || undefined,
      appSecret: secret.trim() || undefined,
    }),
    onSuccess: () => { setToken(''); setSecret(''); setRefused(null); refresh(); toast.success('Connected. Now point Meta at the webhook address below.') },
    onError: (e: any) => setRefused(e?.response?.data?.message ?? `Nothing was saved. ${THIS_IS_FOR_YOUR_OWN_NUMBER}`),
  })
  const test = useMutation({
    mutationFn: () => integrationsApi.testWhatsapp(to),
    onSuccess: () => { toast.success('Sent. Check that phone.'); refresh() },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Meta did not send it. Check the number and try again.'),
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
  /* Anything typed may be sent: the server says what is missing, in a sentence on the page, rather than a button that stays grey with no reason. */
  const mayConnect = firstTime ? [numberId, token, secret, display, business].some(v => !!v.trim()) : true

  if (!isAdmin) return <OnlyAnAdmin />

  function body(n: number) {
    switch (n) {
      case 1:
        return (
          <p className="gwui-panel-text-muted">
            A Meta Business account, a WhatsApp Business number on it, and a Meta app with WhatsApp added.{' '}
            <a className="gwui-plain-link" href={HOW_TO_GET_THESE} target="_blank" rel="noreferrer">How to get these</a>
          </p>
        )
      case 2:
        return (
          <form onSubmit={e => { e.preventDefault(); if (mayConnect) save.mutate() }}>
            <Stack gap={12}>
              <p className="gwui-panel-text-muted"><WithPeopleAndSetupLinked text={THIS_IS_FOR_YOUR_OWN_NUMBER} /></p>
              <div>
                <FieldLabel htmlFor="wa-number-id">Phone number ID</FieldLabel>
                <TextField id="wa-number-id" value={numberId} onChange={e => setNumberId(e.target.value)} placeholder={c?.phoneNumberId ?? ''} inputMode="numeric" />
                <p className="gwui-field-help">You find it in Meta, under WhatsApp, then API Setup.</p>
              </div>
              <div>
                <FieldLabel htmlFor="wa-token">Access token</FieldLabel>
                <TextField id="wa-token" type="password" value={token} onChange={e => setToken(e.target.value)} placeholder={c ? 'New permanent access token (leave blank to keep)' : ''} />
                <p className="gwui-field-help">Use a permanent token from a system user, not the one that lasts 24 hours. You find it in Meta, under Business Settings, then System users.</p>
              </div>
              <div>
                <FieldLabel htmlFor="wa-secret">App secret</FieldLabel>
                <TextField id="wa-secret" type="password" value={secret} onChange={e => setSecret(e.target.value)} placeholder={c ? 'New app secret (leave blank to keep)' : ''} />
                <p className="gwui-field-help">You find it in Meta, under your app, then Settings, then Basic.</p>
              </div>
              <div>
                <FieldLabel htmlFor="wa-display">The number, as people will see it</FieldLabel>
                <TextField id="wa-display" value={display} onChange={e => setDisplay(e.target.value)} placeholder={c?.displayNumber ?? ''} />
              </div>
              <div>
                <FieldLabel htmlFor="wa-business">Your WhatsApp Business account ID</FieldLabel>
                <TextField id="wa-business" value={business} onChange={e => setBusiness(e.target.value)} placeholder={c?.businessAccountId ?? ''} inputMode="numeric" />
                <p className="gwui-field-help">You find it in Meta Business, under WhatsApp accounts.</p>
              </div>
              {refused && <Note tone="error" role="alert"><WithPeopleAndSetupLinked text={refused} /></Note>}
              <Button kind="primary" type="submit" disabled={!mayConnect || save.isPending}>{save.isPending ? 'Connecting…' : firstTime ? 'Connect' : 'Save'}</Button>
            </Stack>
          </form>
        )
      case 3:
        if (!c) return null
        return (
          <Stack gap={12}>
            <p className="gwui-panel-text-muted">You find it in Meta, under WhatsApp, then Configuration, then Webhook. Paste these two, then subscribe to <b>messages</b>.</p>
            <CopyField label="Callback address" value={callback} />
            <CopyField label="Verify token" value={c.verifyToken} />
            {!c.webhookProvenAt && (
              <div className="gwui-sentence-row" role="status">
                <p className="gwui-panel-text-muted">Waiting for Meta to check the address. This page updates on its own.</p>
                <Tag tone="attention">Not proven yet</Tag>
              </div>
            )}
          </Stack>
        )
      case 4:
        if (!c) return null
        return (
          <form onSubmit={e => { e.preventDefault(); if (to.trim()) test.mutate() }}>
            <div className="gwui-invite-actions">
              <TextField placeholder="+2348012345678" value={to} onChange={e => setTo(e.target.value)} aria-label="Number to send a test to" />
              <Button kind="secondary" type="submit" disabled={!to.trim() || test.isPending}>{test.isPending ? 'Sending…' : 'Send a test message'}</Button>
            </div>
          </form>
        )
      case 5:
        if (!c) return null
        return (
          <Stack gap={12}>
            {data?.canStartAConversation === false && (
              <p className="gwui-panel-text-muted">Your team messages the number first. Share it with them, or send them the link to it, and ask them to say anything at all; hello will do. From that moment everything happens on WhatsApp: their check-in, their reminders and their report.</p>
            )}
            <p className="gwui-panel-text-muted">If you want Groundwork to message first, WhatsApp allows it with wording Meta has approved. On your own number, that approval is yours to ask for, because it is your Meta app. Submit these names in Meta Business under Message Templates, say the message is for people your organisation has signed up to this, and tick them here when they come back approved.</p>
            <div className="gwui-check-list">
              {(data?.theNamesToSubmit ?? []).map(name => (
                <label key={name} className="gwui-check-row">
                  <input type="checkbox" checked={approved.includes(name)} onChange={e => setPicked(e.target.checked ? [...approved, name] : approved.filter(x => x !== name))} />
                  <span className="gwui-mono">{name}</span>
                </label>
              ))}
            </div>
            <Button kind="secondary" onClick={() => saveTemplates.mutate()} disabled={saveTemplates.isPending || picked === null}>{saveTemplates.isPending ? 'Saving…' : 'Save what Meta approved'}</Button>
          </Stack>
        )
      case 6:
        if (!c) return null
        return (
          <Stack gap={12}>
            <p className="gwui-panel-text-muted">Whoever sets up a check-in chooses whether people answer it here or on WhatsApp.</p>
            {(data?.languages?.length ?? 0) > 0 && (
              <p className="gwui-panel-text-muted">On WhatsApp the questions are short and in plain everyday words, one at a time, the way you would ask somebody in person. People can answer in {data!.languages!.length} languages, and the check-in carries on in whichever they use: {data!.languages!.join(', ')}.</p>
            )}
            <div className="gwui-invite-actions">
              <Tag tone={c.enabled ? 'proven' : 'plain'}>{c.enabled ? 'On' : 'Off'}</Tag>
              <Button kind={c.enabled ? 'quiet' : 'primary'} onClick={() => turn.mutate(!c.enabled)} disabled={turn.isPending}>{c.enabled ? 'Switch off' : 'Switch on'}</Button>
            </div>
          </Stack>
        )
    }
    return null
  }

  return (
    <Page>
      {/*
       * THE PROTOTYPE'S OWN TITLE AREA (whatsapp.txt, whatsapp.jpg; group 1 review): "Settings" as
       * the title, the organisation name as its subtitle, then a plain "Connections" link back -
       * never a "Settings / Connections" crumb joined with a slash.
       */}
      <PageTitle title="Settings" subtitle={orgName} />
      <PageTitle
        crumbs={[{ label: 'Connections', to: '/settings/connections' }]}
        title="Use your organisation’s own WhatsApp number"
        subtitle="This is optional and advanced. Groundwork’s own number already works for everyone, without any of this. Most of it happens in Meta’s settings. You can stop at any step, and what you have entered is kept."
      />

      {whatsapp.isError && <Note tone="error">Connections did not load.</Note>}
      <WhatsAppKeysNeedTypingAgainNote connection={c} />

      {/*
       * THE STEPS SIT FLAT ON THE PAGE (whatsapp.jpg; group 1 review), not inside a white `Panel` -
       * a panel's own left border ran straight through the middle of each step's numbered circle,
       * which the prototype's own screen does not draw at all: there, the steps sit directly under
       * the title, separated only by the thin rule `.gwui-numstep` already puts between them.
       */}
      <ol className="gwui-numsteps">
        {steps.map(s => {
            const state = s.done ? 'done' : s.n === current || (s.n === 1 && !c) ? 'now' : 'later'
            /*
             * ALWAYS THE PROTOTYPE'S OWN SHAPE (whatsapp.txt): a step still to come shows its
             * number and its title, in plain text, and nothing else - never a button that lets
             * somebody peek at a later step's content early. This used to draw that title as a
             * `<button>` that toggled the body open, which the prototype's own screen does not
             * have, and which pushed this page past the prototype's own button count (Hafsah, 30
             * September, item 2: "no more buttons than the prototype's own version of that screen
             * has"). Every step still opens as soon as it becomes the current one, or is done.
             */
            const open = state !== 'later'
            const content = open ? body(s.n) : null
            return (
              <li key={s.n} className="gwui-numstep">
                <span className={`gwui-numstep-num${state === 'done' ? ' gwui-numstep-num-done' : state === 'now' ? ' gwui-numstep-num-now' : ''}`} aria-hidden>{s.done ? '✓' : s.n}</span>
                <div className="gwui-numstep-body">
                  <div className="gwui-numstep-head">
                    <p className="gwui-numstep-title">{s.title}</p>
                    {s.done && <Tag tone="proven">Done</Tag>}
                  </div>
                  {content && <div className="gwui-numstep-content">{content}</div>}
                </div>
              </li>
            )
          })}
      </ol>

      <Section heading="Keep your number on your own system instead">
        <Panel>
          <Stack gap={12}>
            <p className="gwui-panel-text-muted">If your WhatsApp number already runs through your own customer system, it can pass check-in messages to us and send our replies back. Nothing moves to Meta. Whoever runs your systems sets this up with a key.</p>
            <Button kind="quiet" to="/settings/tools">Read how this works</Button>
          </Stack>
        </Panel>
      </Section>
    </Page>
  )
}

function CopyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <FieldLabel htmlFor={`wa-copy-${label}`}>{label}</FieldLabel>
      <div className="gwui-invite-link-row">
        <TextField id={`wa-copy-${label}`} readOnly value={value} />
        <Button kind="secondary" onClick={async () => { (await copy(value)) ? toast.success('Copied.') : toast.error('Copying is not available here. Select it and copy it yourself.') }}>Copy</Button>
      </div>
    </div>
  )
}
