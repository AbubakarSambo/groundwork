import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { whatsAppSettingsApi, type OurWhatsAppSettings, type SaveOurWhatsAppSettings } from '@/api/whatsapp-settings'

/**
 * GROUNDWORK'S OWN WHATSAPP NUMBER, SET BY GROUNDWORK STAFF (5 Oct 2026, Hafsah).
 *
 * The number, its two IDs and its three secrets used to be server settings only. Here a member of
 * staff types them in. A secret goes in and never comes back: the page reads "set" or "not set".
 * The webhook address to give Meta, whether Meta accepts the keys, and a test message to one number
 * are on the same page, so the whole setup is done in one place. Staff only, on the API as well as
 * here (RequirePlatformAdmin, and PlatformAdminGuard on every route behind it).
 */

const small = { fontSize: 12, color: 'var(--gw-sub)', lineHeight: '19px' } as const
const label = { fontSize: 13, fontWeight: 700, display: 'block', marginBottom: 4 } as const
/* The kit's field (app.css .input). */
const input = { width: '100%', boxSizing: 'border-box', padding: '12px 16px', fontSize: 16, border: '1px solid var(--rule2-crisp)', borderRadius: 10, background: 'var(--gw-card)', color: 'var(--gw-text)', fontFamily: 'inherit' } as const
const card = { border: '1px solid var(--gw-border)', borderRadius: 8, padding: 16, marginTop: 16, background: 'var(--gw-card)' } as const

type Plain = 'displayNumber' | 'phoneNumberId' | 'businessAccountId'
type Secret = 'accessToken' | 'appSecret' | 'verifyToken'

const PLAIN: { key: Plain; name: string; hint: string }[] = [
  { key: 'displayNumber', name: 'WhatsApp number', hint: 'The number people see and reply to, with its country code, for example +44 7700 900123.' },
  { key: 'phoneNumberId', name: 'Phone number ID', hint: "Meta's own ID for the number. It is on the WhatsApp API Setup page in Meta, beside the number." },
  { key: 'businessAccountId', name: 'Business account ID', hint: 'The WhatsApp business account the number belongs to. It is on the same page in Meta.' },
]
const SECRETS: { key: Secret; name: string; hint: string }[] = [
  { key: 'accessToken', name: 'Access token', hint: 'The permanent token of a system user in Meta Business settings. Do not use the temporary token, which stops working after 24 hours.' },
  { key: 'appSecret', name: 'App secret', hint: "In Meta, under the app's settings, on the Basic page. Groundwork uses it to check that each incoming message really comes from Meta." },
  { key: 'verifyToken', name: 'Verify token', hint: "A long word you make up. Type the same word into Meta's webhook settings, beside the webhook address below." },
]

function said(e: unknown, otherwise: string): string {
  const r = (e as { response?: { status?: number; data?: { message?: string | string[] } } })?.response
  /* The API's own 403 is written for developers. Say who the page is for. */
  if (r?.status === 403) return 'This page is for Groundwork staff only. Being an admin in your own organisation does not include it.'
  const m = r?.data?.message
  return Array.isArray(m) ? m.join(' ') : m || otherwise
}

function TheForm({ page }: { page: OurWhatsAppSettings }) {
  const qc = useQueryClient()
  const [plain, setPlain] = useState<Record<Plain, string>>({
    displayNumber: page.fields.displayNumber.from === 'here' ? page.fields.displayNumber.value ?? '' : '',
    phoneNumberId: page.fields.phoneNumberId.from === 'here' ? page.fields.phoneNumberId.value ?? '' : '',
    businessAccountId: page.fields.businessAccountId.from === 'here' ? page.fields.businessAccountId.value ?? '' : '',
  })
  const [secrets, setSecrets] = useState<Record<Secret, string>>({ accessToken: '', appSecret: '', verifyToken: '' })
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  const save = useMutation({
    mutationFn: (body: SaveOurWhatsAppSettings) => whatsAppSettingsApi.save(body),
    onSuccess: (updated) => {
      /* A secret never stays in the page once it is saved. */
      setSecrets({ accessToken: '', appSecret: '', verifyToken: '' })
      setMessage({ ok: true, text: updated.saved ?? 'Your changes are saved.' })
      qc.setQueryData(['admin', 'whatsapp-settings'], updated)
      qc.invalidateQueries({ queryKey: ['admin', 'whatsapp-settings', 'connection'] })
      qc.invalidateQueries({ queryKey: ['admin-whatsapp'] })
    },
    onError: (e) => setMessage({ ok: false, text: said(e, 'Your changes could not be saved. Try again.') }),
  })

  /* Forget one saved secret. The API's own sentence then says what the server uses instead. */
  const remove = useMutation({
    mutationFn: (key: Secret) => whatsAppSettingsApi.save({ remove: [key] }).then((updated) => ({ key, updated })),
    onSuccess: ({ key, updated }) => {
      const name = SECRETS.find((s) => s.key === key)!.name.toLowerCase()
      setMessage({ ok: true, text: `The saved ${name} is removed. ${updated.secrets[key].saying}` })
      qc.setQueryData(['admin', 'whatsapp-settings'], updated)
      qc.invalidateQueries({ queryKey: ['admin', 'whatsapp-settings', 'connection'] })
      qc.invalidateQueries({ queryKey: ['admin-whatsapp'] })
    },
    onError: (e) => setMessage({ ok: false, text: said(e, 'The secret could not be removed. Try again.') }),
  })

  const submit = () => {
    const body: SaveOurWhatsAppSettings = { ...plain }
    for (const s of SECRETS) if (secrets[s.key].trim()) body[s.key] = secrets[s.key].trim()
    setMessage(null)
    save.mutate(body)
  }

  return (
    <div style={card}>
      <h2 style={{ fontSize: 15, margin: 0 }}>The number</h2>
      {PLAIN.map(({ key, name, hint }) => {
        const f = page.fields[key]
        return (
          <div key={key} style={{ marginTop: 14 }}>
            <label htmlFor={`wa-${key}`} style={label}>{name}</label>
            <input
              id={`wa-${key}`}
              value={plain[key]}
              onChange={(e) => setPlain((p) => ({ ...p, [key]: e.target.value }))}
              placeholder={f.from === 'server' ? f.value ?? '' : ''}
              style={input}
              autoComplete="off"
            />
            <div style={{ ...small, marginTop: 4 }}>{hint} {f.saying}</div>
          </div>
        )
      })}

      <h2 style={{ fontSize: 15, margin: '24px 0 0' }}>The secrets</h2>
      <p style={{ ...small, margin: '6px 0 0' }}>{page.canSaveSecretsSaying}</p>
      {SECRETS.map(({ key, name, hint }) => {
        const s = page.secrets[key]
        return (
          <div key={key} style={{ marginTop: 14 }}>
            <label htmlFor={`wa-${key}`} style={label}>
              {name}{' '}
              <span style={{ fontWeight: 700, color: s.state === 'set' ? 'var(--gw-green-t)' : 'var(--gw-sub)' }}>{s.state === 'set' ? 'Set' : 'Not set'}</span>
            </label>
            <input
              id={`wa-${key}`}
              type="password"
              value={secrets[key]}
              onChange={(e) => setSecrets((p) => ({ ...p, [key]: e.target.value }))}
              placeholder={s.state === 'set' ? 'Type a new one only to replace it.' : ''}
              disabled={!page.canSaveSecrets}
              style={input}
              autoComplete="new-password"
            />
            <div style={{ ...small, marginTop: 4 }}>{hint} {s.saying}</div>
            {s.from === 'here' && (
              <button type="button" className="btn sec sm" style={{ marginTop: 6 }} onClick={() => remove.mutate(key)} disabled={remove.isPending}>
                Remove the saved {name.toLowerCase()}
              </button>
            )}
          </div>
        )
      })}

      <div style={{ marginTop: 18, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <button type="button" className="btn pri sm" onClick={submit} disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Save'}</button>
        {message && <span style={{ fontSize: 13, color: message.ok ? 'var(--gw-green-t)' : 'var(--gw-red-t)' }}>{message.text}</span>}
      </div>
    </div>
  )
}

function TheConnection() {
  const connection = useQuery({ queryKey: ['admin', 'whatsapp-settings', 'connection'], queryFn: whatsAppSettingsApi.connection, retry: false })
  return (
    <div style={card}>
      <h2 style={{ fontSize: 15, margin: 0 }}>Is it connected?</h2>
      {connection.isLoading && <p style={small}>Asking Meta…</p>}
      {connection.error && <p style={{ ...small, color: 'var(--gw-red-t)' }}>{said(connection.error, 'Groundwork could not check the connection. Try again.')}</p>}
      {connection.data && (
        <p style={{ fontSize: 14, margin: '8px 0 0', lineHeight: '22px', color: connection.data.connected ? 'var(--gw-green-t)' : 'var(--gw-text)' }}>
          <strong>{connection.data.connected ? 'Connected' : 'Not connected'}.</strong> {connection.data.saying.replace(/^(Connected|Not connected)\.\s*/, '')}
        </p>
      )}
      <button type="button" className="btn sec sm" style={{ marginTop: 10 }} onClick={() => connection.refetch()} disabled={connection.isFetching}>Check again</button>
    </div>
  )
}

function TheTest() {
  const [to, setTo] = useState('')
  const [failed, setFailed] = useState<string | null>(null)
  const test = useMutation({
    mutationFn: (n: string) => whatsAppSettingsApi.sendTest(n),
    onMutate: () => setFailed(null),
    onError: (e) => setFailed(said(e, 'The test message could not be sent. Try again.')),
  })
  return (
    <div style={card}>
      <h2 style={{ fontSize: 15, margin: 0 }}>Send a test message</h2>
      <p style={{ ...small, margin: '6px 0 0' }}>
        The test message goes from Groundwork's number to the one number you type here, and to nobody else.
        It goes even while WhatsApp is switched off, so you can check the keys first.
      </p>
      <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <input
          value={to}
          onChange={(e) => setTo(e.target.value)}
          placeholder="+44 7700 900123"
          aria-label="The number to send the test message to"
          style={{ ...input, flex: '1 1 220px', width: 'auto' }}
        />
        <button type="button" className="btn pri sm" onClick={() => test.mutate(to)} disabled={test.isPending || !to.trim()}>
          {test.isPending ? 'Sending…' : 'Send a test message'}
        </button>
      </div>
      {test.data && <p style={{ fontSize: 13, margin: '8px 0 0', color: test.data.sent ? 'var(--gw-green-t)' : 'var(--gw-text)' }}>{test.data.saying}</p>}
      {failed && <p style={{ fontSize: 13, margin: '8px 0 0', color: 'var(--gw-red-t)' }}>{failed}</p>}
    </div>
  )
}

export function WhatsAppSettingsPage() {
  const navigate = useNavigate()
  const settings = useQuery({ queryKey: ['admin', 'whatsapp-settings'], queryFn: whatsAppSettingsApi.get, retry: false })
  const [copied, setCopied] = useState(false)
  useEffect(() => { if (!copied) return; const t = setTimeout(() => setCopied(false), 2000); return () => clearTimeout(t) }, [copied])
  const page = settings.data

  return (
    <section style={{ maxWidth: 820, margin: '0 auto', padding: '24px 16px 80px' }}>
      <button
        type="button"
        onClick={() => navigate('/admin')}
        style={{ fontSize: 12, color: 'var(--gw-muted)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}
      >
        ← Back office
      </button>
      <h1 style={{ fontSize: 24, margin: '10px 0 0' }}>Groundwork's WhatsApp number</h1>
      <p style={{ fontSize: 14, color: 'var(--gw-sub)', lineHeight: '22px', marginTop: 8 }}>
        This is the one WhatsApp number every organisation uses, unless it has connected a number of its own.
        Type in the number and its keys from Meta, give Meta the webhook address below, check that it is
        connected, and send yourself a test message. Nothing goes to anybody until WhatsApp is switched on
        in the System tab.
      </p>

      {settings.isLoading && <p style={small}>Reading…</p>}
      {settings.error && <p style={{ ...small, color: 'var(--gw-red-t)' }}>{said(settings.error, 'This page could not be read. Try again.')}</p>}

      {page && (
        <>
          <div style={card}>
            <h2 style={{ fontSize: 15, margin: 0 }}>Is WhatsApp on?</h2>
            <p style={{ fontSize: 14, margin: '8px 0 0', lineHeight: '22px' }}>{page.switch.saying}</p>
          </div>

          <TheConnection />
          <TheForm key={JSON.stringify(page.fields)} page={page} />

          <div style={card}>
            <h2 style={{ fontSize: 15, margin: 0 }}>The webhook address to give Meta</h2>
            <p style={{ fontSize: 14, margin: '8px 0 0', lineHeight: '22px', wordBreak: 'break-all' }}>{page.webhook.saying}</p>
            {page.webhook.address && (
              <button
                type="button"
                className="btn sec sm" style={{ marginTop: 10 }}
                onClick={() => { navigator.clipboard?.writeText(page.webhook.address ?? '').then(() => setCopied(true)).catch(() => undefined) }}
              >{copied ? 'Copied' : 'Copy the address'}</button>
            )}
            <p style={{ ...small, margin: '10px 0 0' }}>
              In Meta, open the app's WhatsApp settings, then Configuration, then Webhook. Paste this address as the
              callback address, type the same verify token you saved above, and subscribe to messages.
            </p>
          </div>

          <TheTest />
        </>
      )}
    </section>
  )
}
