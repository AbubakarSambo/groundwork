import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { promptsApi, UsageFunnelData, PlatformDashboardData, OrgListItem, UsageStatsData, FeedbackSummaryData, PANEL_RANGES, type PanelRange, type Rate, type ActivationFunnel, type ActivationStage, type ActivationNowBucket, type ActivationEmailOutcome, type ParticipantActivation, type ParticipantReachedStep, type ParticipantStuckBucket } from '@/api/prompts'
import { adminApi, type PricingPlanRow, type InboundMessage, type CallRequestRow, type CoachingBatch } from '@/api/admin'
import { useAuthStore } from '@/stores/auth'
import { toast } from 'sonner'
import { coachApi, type CoachRequestRow } from '@/api/coach'
import { feedbackApi } from '@/api/feedback'
import { formatMonthlyPrice, formatDollars, type SubscriptionPlan } from '@/api/billing'
import { SectionFailed } from './a-section-that-failed-says-so'
import { whenItWas } from '@/lib/a-date-reads-the-same-everywhere'

// ── helpers ──────────────────────────────────────────────────────────────────

function fmt(str: string) {
  return str.replace(/_/g, ' ').replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
}

function timeAgo(date: string | Date): string {
  const ms = Date.now() - new Date(date).getTime()
  const mins = Math.floor(ms / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

// ── shared tokens ─────────────────────────────────────────────────────────────

const C: React.CSSProperties = { background: 'white', border: '1px solid var(--gw-border)', borderRadius: 8, padding: '10px 14px' }
const SL: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: 'var(--gw-muted)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 10 }

/* A RATE CARRIES ITS DENOMINATOR. "62%" is a number with no size; "62% of 34" is a finding. `of` is
   printed beside any value that is a share of something, and a share of nothing prints as "–". */
function Stat({ val, label, accent, of }: { val: string | number; label: string; accent?: boolean; of?: number | null }) {
  return (
    <div style={{ ...C, flex: 1, minWidth: 100 }}>
      <div style={{ fontSize: 22, fontWeight: 800, color: accent ? 'var(--gw-navy)' : 'var(--gw-navy)' }}>
        {val}{of != null && <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--gw-muted)', marginLeft: 5 }}>of {of}</span>}
      </div>
      <div style={{ fontSize: 11, color: 'var(--gw-sub)', marginTop: 3 }}>{label}</div>
    </div>
  )
}

/** A rate as text: "62%" with its "of N" beside it, or "–" over nothing. */
function rateText(r: Rate): string {
  return r.pct == null ? ' - ' : `${r.pct}%`
}

function Bar({ pct, color = 'var(--gw-navy)' }: { pct: number; color?: string }) {
  return (
    <div style={{ flex: 1, background: 'rgba(12,68,124,0.08)', borderRadius: 4, height: 8, overflow: 'hidden' }}>
      <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', background: color, borderRadius: 4, transition: 'width .3s' }} />
    </div>
  )
}

// ── System tab ────────────────────────────────────────────────────────────────

function WhatsAppToggle() {
  const qc = useQueryClient()
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['admin-whatsapp'], queryFn: adminApi.getWhatsAppStatus })
  const toggle = useMutation({
    mutationFn: (enabled: boolean) => adminApi.setWhatsAppEnabled(enabled),
    onSuccess: (updated) => qc.setQueryData(['admin-whatsapp'], updated),
  })
  /* Was `return null` on a failed fetch, which is indistinguishable from the feature not
     existing. See a-section-that-failed-says-so.tsx. */
  if (isLoading) return null
  if (error || !data) return <SectionFailed what="WhatsApp" error={error} retry={() => refetch()} />
  return (
    <div style={{ ...C, padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700 }}>WhatsApp check-ins</div>
          <div style={{ fontSize: 12, color: 'var(--gw-muted)', marginTop: 2, lineHeight: 1.5 }}>
            Single Groundwork number, shared across every org. {data.credentialsConfigured
              ? 'Credentials are configured.'
              : 'Waiting on WhatsApp Business API credentials - toggling this on will have no effect until those are set.'}
          </div>
        </div>
        <button className="gwui-tap-target"
          onClick={() => toggle.mutate(!data.adminEnabled)}
          disabled={toggle.isPending}
          style={{
            width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
            background: data.adminEnabled ? 'var(--gw-navy)' : 'var(--gw-border)',
            position: 'relative', flexShrink: 0, marginLeft: 16,
          }}
          aria-label={data.adminEnabled ? 'Turn off WhatsApp' : 'Turn on WhatsApp'}
        >
          <span style={{ position: 'absolute', top: 3, left: data.adminEnabled ? 23 : 3, width: 18, height: 18, borderRadius: '50%', background: 'white', boxShadow: 'var(--gw-hairline)' }} />
        </button>
      </div>
      <div style={{ fontSize: 11, marginTop: 8, fontWeight: 700, color: data.live ? 'var(--gw-green-t)' : 'var(--gw-muted)' }}>
        {data.live ? 'Live' : data.adminEnabled ? 'On, but not live (credentials missing)' : 'Off'}
      </div>
      <Link to="/admin/whatsapp" style={{ display: 'inline-block', fontSize: 12.5, marginTop: 8, color: 'var(--gw-navy)' }}>
        Set Groundwork's WhatsApp number, its keys and the webhook
      </Link>
    </div>
  )
}

/**
 * THE COACHING BLOCK, AND THE SWITCH THAT LETS IT REACH A PROMPT.
 *
 * The setting existed, the read-before-you-decide route existed, and neither had a page: the switch
 * could only be thrown in SQL, and the batch it says to read first could only be read with curl
 * (fix plan B12). The rows come first, the switch second, in the order the route's own summary
 * gives them.
 */
function CoachingSwitch() {
  const qc = useQueryClient()
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['admin-coaching'], queryFn: adminApi.getCoaching })
  const [open, setOpen] = useState(false)
  const toggle = useMutation({
    mutationFn: (live: boolean) => adminApi.setCoachingLive(live),
    onSuccess: (r) => qc.setQueryData(['admin-coaching'], (old: CoachingBatch | undefined) => old ? { ...old, live: r.live } : old),
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'That could not be changed.'),
  })
  if (isLoading) return null
  if (error || !data) return <SectionFailed what="Coaching" error={error} retry={() => refetch()} />
  return (
    <div style={{ ...C, padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700 }}>Coaching in the session</div>
          <div style={{ fontSize: 12, color: 'var(--gw-muted)', marginTop: 2, lineHeight: 1.5 }}>
            The coach's read of where each person is, and what it would say next. {data.count === 0
              ? 'Nothing has been read yet.'
              : `${data.count} ${data.count === 1 ? 'read' : 'reads'} so far. Read them before turning this on.`}
          </div>
        </div>
        <button className="gwui-tap-target"
          type="button"
          onClick={() => toggle.mutate(!data.live)}
          disabled={toggle.isPending}
          style={{
            width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
            background: data.live ? 'var(--gw-navy)' : 'var(--gw-border)',
            position: 'relative', flexShrink: 0, marginLeft: 16,
          }}
          aria-label={data.live ? 'Turn off coaching' : 'Turn on coaching'}
        >
          <span style={{ position: 'absolute', top: 3, left: data.live ? 23 : 3, width: 18, height: 18, borderRadius: '50%', background: 'white', boxShadow: 'var(--gw-hairline)' }} />
        </button>
      </div>
      <div style={{ fontSize: 11, marginTop: 8, fontWeight: 700, color: data.live ? 'var(--gw-green-t)' : 'var(--gw-muted)' }}>
        {data.live ? 'Live: the block reaches the prompt' : 'Off: read, never said'}
      </div>
      {data.count > 0 && (
        <div style={{ marginTop: 10 }}>
          <button type="button" onClick={() => setOpen(o => !o)} style={{ background: 'none', border: 'none', padding: 0, font: 'inherit', fontSize: 12, color: 'var(--gw-navy)', textDecoration: 'underline', cursor: 'pointer' }}>
            {open ? 'Hide the reads' : 'Show the reads'}
          </button>
          {open && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
              {(data.rows ?? []).map(r => (
                <div key={r.participantId} style={{ fontSize: 12, borderTop: '1px solid var(--gw-border)', paddingTop: 8 }}>
                  <div style={{ fontWeight: 700 }}>{r.who}{r.organisation ? ` · ${r.organisation}` : ''}{r.ground ? ` · ${r.ground}` : ''}</div>
                  <div style={{ color: 'var(--gw-muted)' }}>{r.roleAsDescribed ?? r.detectedFunction ?? 'Role not described'}{r.currentStep ? ` · next: ${r.currentStep}` : ''}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * WHERE THE DAILY DELIVERY ALERT GOES (api engagement/the-daily-delivery-alert.ts). One address, Groundwork's own. Empty means nothing is
 * sent. Saved here wins over the server setting DELIVERY_ALERT_EMAIL; clearing it here falls back to that setting.
 */
function DeliveryAlertRow() {
  const qc = useQueryClient()
  const { data } = useQuery({ queryKey: ['admin-delivery-alert'], queryFn: adminApi.getDeliveryAlert })
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const save = useMutation({
    mutationFn: () => adminApi.setDeliveryAlert(value.trim()),
    onSuccess: (res) => {
      qc.setQueryData(['admin-delivery-alert'], res)
      setEditing(false)
      setErr(null)
      toast.success(res.email ? `The daily delivery alert now goes to ${res.email}.` : 'No address is set now, so the daily delivery alert is not sent.')
    },
    onError: (e: any) => setErr(e?.response?.data?.message ?? e.message),
  })
  if (!data) return null
  const now = data.email
    ? (data.from === 'server' ? `It goes to ${data.email}, which is set on the server. An address saved here is used instead.` : `It goes to ${data.email}.`)
    : 'No address is set, so nothing is sent.'
  return (
    <div style={{ ...C, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700 }}>Daily delivery alert</div>
        <div style={{ fontSize: 12, color: 'var(--gw-muted)', marginTop: 2, lineHeight: 1.5 }}>Every morning at half past seven in Nairobi (East Africa Time), this address is sent a list of the openings, reminders and morning summaries that did not go out the day before, for every client. Nothing is sent on a day when nothing went wrong. {now}</div>
        {err && <div role="alert" style={{ fontSize: 12, color: 'var(--gw-red-t)', marginTop: 4 }}>{err}</div>}
      </div>
      {editing ? (
        <form onSubmit={(e) => { e.preventDefault(); save.mutate() }} style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <input className="gwui-input" type="email" value={value} onChange={e => setValue(e.target.value)} placeholder="ops@myground.work" aria-label="Address for the daily delivery alert" style={{ width: 220, maxWidth: '100%' }} />
          <button className="btn pri sm" type="submit" disabled={save.isPending} >Save</button>
          <button type="button" onClick={() => { setEditing(false); setErr(null) }} style={{ padding: '5px 10px', borderRadius: 6, background: 'none', color: 'var(--gw-muted)', fontSize: 12, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
        </form>
      ) : (
        <button className="btn sec sm" type="button" onClick={() => { setValue(data.from === 'here' ? data.email ?? '' : ''); setEditing(true) }} style={{ flexShrink: 0 }}>{data.email ? 'Change' : 'Set an address'}</button>
      )}
    </div>
  )
}

/**
 * HOW LONG SOMEBODY HAS TO CORRECT THEIR OWN RECORD after a report is released. Read by the report
 * and by the conversation, written by nothing but SQL until now. Zero is allowed on purpose: it means
 * a released report is final the moment it is released.
 */
function CorrectionWindowRow() {
  const qc = useQueryClient()
  const { data } = useQuery({ queryKey: ['admin-correction-window'], queryFn: adminApi.getCorrectionWindow })
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const save = useMutation({
    mutationFn: () => {
      const n = Number(value)
      if (!value.trim() || !Number.isInteger(n) || n < 0 || (data && n > data.max)) {
        throw new Error(`That needs to be a whole number of days, 0 to ${data?.max ?? 90}.`)
      }
      return adminApi.setCorrectionWindow(n)
    },
    onSuccess: (res) => {
      qc.setQueryData(['admin-correction-window'], res)
      setEditing(false)
      setErr(null)
      toast.success(res.days === 0 ? 'A released report is now final the moment it is released.' : `People now have ${res.days} ${res.days === 1 ? 'day' : 'days'} to correct their record after a report is released.`)
    },
    onError: (e: any) => setErr(e?.response?.data?.message ?? e.message),
  })
  if (!data) return null
  return (
    <div style={{ ...C, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700 }}>Days to correct a record after release</div>
        <div style={{ fontSize: 12, color: 'var(--gw-muted)', marginTop: 2, lineHeight: 1.5 }}>Zero means a released report is final at once. The default is {data.default}.</div>
        {err && <div role="alert" style={{ fontSize: 12, color: 'var(--gw-red-t)', marginTop: 4 }}>{err}</div>}
      </div>
      {editing ? (
        <form onSubmit={(e) => { e.preventDefault(); save.mutate() }} style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <input type="number" min={0} max={data.max} step={1} value={value} onChange={e => setValue(e.target.value)} aria-label="Days to correct a record" style={{ width: 70, padding: '5px 8px', fontSize: 13, borderRadius: 6, border: '1px solid var(--gw-border)', fontFamily: 'inherit' }} />
          <button className="btn pri sm" type="submit" disabled={save.isPending} >Save</button>
          <button type="button" onClick={() => { setEditing(false); setErr(null) }} style={{ padding: '5px 10px', borderRadius: 6, background: 'none', color: 'var(--gw-muted)', fontSize: 12, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
        </form>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--gw-navy)' }}>{data.days}</span>
          <button className="btn sec sm" type="button" onClick={() => { setValue(String(data.days)); setEditing(true) }} >Edit</button>
        </div>
      )}
    </div>
  )
}

/**
 * WHETHER THIS DEPLOYMENT CAN TAKE MONEY.
 *
 * The Pricing section right below this one lets somebody set what we charge,
 * which reads as a promise that charging works. With no STRIPE_SECRET_KEY it
 * does not — and the only way to find that out was for a customer to press Pay
 * and get a 500. Sits with the WhatsApp card because it is the same kind of
 * fact: a thing that is built and waiting on a credential.
 */
function StripeStatus() {
  const { data } = useQuery({ queryKey: ['admin-stripe'], queryFn: adminApi.getStripeStatus })
  if (!data) return null
  return (
    <div style={{ ...C, padding: '14px 16px' }}>
      <div style={{ fontSize: 13, fontWeight: 700 }}>Taking payment</div>
      <div style={{ fontSize: 12, color: 'var(--gw-muted)', marginTop: 2, lineHeight: 1.5 }}>
        {data.says}
      </div>
      <div
        style={{
          fontSize: 11,
          marginTop: 8,
          fontWeight: 700,
          color: data.keyKind === 'live' || data.keyKind === 'test' ? 'var(--gw-green-t)' : 'var(--gw-muted)',
        }}
      >
        {data.badge ?? (data.isConfigured ? 'Test or live' : 'No key set')}
      </div>
    </div>
  )
}

/**
 * FOR THE EDIT FIELD ONLY - NEVER FOR DISPLAY. W-UX-7.
 *
 * "$1650/mo" on this page while every other surface said "$1,650/mo". `formatMonthlyPrice` in
 * `api/billing` is the one formatter and its own comment says so; this page had a second one, and
 * the second one won on the only page where a four-figure price is edited.
 *
 * It still exists, and deliberately: a thousands separator inside a number input breaks the value a
 * person is typing. So the name now says which of the two jobs it has, and the display below uses
 * the shared formatter.
 */
function centsForEditing(cents: number): string {
  return (cents / 100).toFixed(2).replace(/\.00$/, '')
}

/**
 * AN EXTRA SEAT AND WHATSAPP PER PERSON, EDITED BESIDE THE PRICE (fix list item 6: "the plan prices, included seats,
 * extra-seat price and WhatsApp price can be changed without code"). Dollars a month; empty takes it off sale on this plan.
 */
function PlanCentsField({ row, field, what }: { row: PricingPlanRow; field: 'extraSeatCents' | 'whatsappPersonCents'; what: string }) {
  const qc = useQueryClient()
  const cents = row[field] ?? null
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(cents === null ? '' : centsForEditing(cents))
  const save = useMutation({
    mutationFn: (next: number | null) => adminApi.setPlanLimits(row.plan, { [field]: next }),
    onSuccess: rows => {
      qc.setQueryData(['admin-pricing'], rows)
      qc.invalidateQueries({ queryKey: ['public-pricing'] })
      setEditing(false)
      toast.success(value.trim() === '' ? `${what} is no longer sold on ${row.label}.` : `${what} on ${row.label} is now $${value.trim()} a month.`)
    },
    onError: () => toast.error(`${what} did not change. Try again.`),
  })
  function submit() {
    const raw = value.trim()
    if (raw === '') { save.mutate(null); return }
    const dollars = parseFloat(raw)
    if (!Number.isFinite(dollars) || dollars < 0.5) { toast.error('Enter an amount of at least $0.50, or leave it empty.'); return }
    save.mutate(Math.round(dollars * 100))
  }
  if (row.amountCents === null) return null
  return (
    <div style={{ fontSize: 11, color: 'var(--gw-sub)', marginTop: 3, display: 'flex', alignItems: 'center', gap: 6 }}>
      {editing ? (
        <>
          <span>{what} $</span>
          <input autoFocus aria-label={`${what} on ${row.label}, dollars a month`} value={value} placeholder="not sold" onChange={e => setValue(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') setEditing(false) }}
            style={{ width: 60, padding: '3px 6px', borderRadius: 6, border: '1px solid var(--gw-border)', fontSize: 11, fontFamily: 'inherit' }} />
          <button className="btn pri sm" onClick={submit} disabled={save.isPending} >Save</button>
          <button onClick={() => setEditing(false)} style={{ padding: '3px 8px', borderRadius: 6, background: 'none', color: 'var(--gw-muted)', fontSize: 11, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
        </>
      ) : (
        <>
          <span>{cents === null ? `${what} is not sold on this plan.` : `${what}: ${formatDollars(cents)} a month.`}</span>
          <button className="btn sec sm" onClick={() => { setValue(cents === null ? '' : centsForEditing(cents)); setEditing(true) }}
            >
            Edit
          </button>
        </>
      )}
    </div>
  )
}

function PricingRow({ row }: { row: PricingPlanRow }) {
  const qc = useQueryClient()
  const [editing, setEditing] = useState(false)
  /** Enterprise has no amount; the price editor is hidden for it, so 0 is never shown. */
  const [value, setValue] = useState(centsForEditing(row.amountCents ?? 0))

  const [editingCap, setEditingCap] = useState(false)
  const [capValue, setCapValue] = useState(row.memberCap === null ? '' : String(row.memberCap))

  const save = useMutation({
    mutationFn: (amountCents: number) => adminApi.setPlanLimits(row.plan, { amountCents }),
    onSuccess: rows => {
      qc.setQueryData(['admin-pricing'], rows)
      setEditing(false)
      /* The public pricing page is built from fixed figures and is frozen; the table and the page disagree until it is rebuilt (A15). */
      toast.success(`${row.label} updated. Existing subscribers keep their current price until they change plans. The public pricing page still shows the figure it was built with until the site is rebuilt.`)
    },
    onError: () => toast.error('The price did not change - try again.'),
  })

  function submit() {
    const dollars = parseFloat(value)
    if (!Number.isFinite(dollars) || dollars <= 0) {
      toast.error('Enter a valid amount greater than 0.')
      return
    }
    save.mutate(Math.round(dollars * 100))
  }

  /**
   * THE SEAT CAP, EDITABLE BESIDE THE PRICE.
   *
   * The caps moved into `pricing_plans` with the prices, and a cap that can only be changed by SQL
   * is a cap that drifts - which is how Scale came to advertise 1,000 people in three places. An
   * empty field means unlimited, which is what Enterprise is: a value, not a missing answer.
   */
  const saveCap = useMutation({
    mutationFn: (memberCap: number | null) => adminApi.setPlanLimits(row.plan, { memberCap }),
    onSuccess: rows => {
      qc.setQueryData(['admin-pricing'], rows)
      /** The public pricing page reads these, so it has to be told to re-read them. */
      qc.invalidateQueries({ queryKey: ['public-pricing'] })
      setEditingCap(false)
      toast.success(`${row.label} now seats ${capValue.trim() === '' ? 'an unlimited number of' : capValue.trim()} people.`)
    },
    onError: () => toast.error('The seat cap did not change - try again.'),
  })

  function submitCap() {
    const raw = capValue.trim()
    if (raw === '') { saveCap.mutate(null); return }
    const n = Number(raw)
    if (!Number.isInteger(n) || n < 1) {
      toast.error('Enter a whole number of people, or leave it empty for unlimited.')
      return
    }
    saveCap.mutate(n)
  }

  return (
    <div style={{ ...C, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gw-navy)' }}>{row.label}</div>
        <div style={{ fontSize: 11, color: 'var(--gw-muted)', marginTop: 2 }}>
          {row.amountCents === null
            ? 'Contact sales. No Stripe price, by design.'
            : row.hasStripePrice ? 'Live Stripe price cached' : 'Will create a Stripe price on next checkout'}
        </div>
        <div style={{ fontSize: 11, color: 'var(--gw-sub)', marginTop: 3, display: 'flex', alignItems: 'center', gap: 6 }}>
          {editingCap ? (
            <>
              <input
                autoFocus
                value={capValue}
                placeholder="unlimited"
                onChange={e => setCapValue(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') submitCap(); if (e.key === 'Escape') setEditingCap(false) }}
                style={{ width: 74, padding: '3px 6px', borderRadius: 6, border: '1px solid var(--gw-border)', fontSize: 11, fontFamily: 'inherit' }}
              />
              <span>people</span>
              <button className="btn pri sm" onClick={submitCap} disabled={saveCap.isPending} >Save</button>
              <button onClick={() => setEditingCap(false)} style={{ padding: '3px 8px', borderRadius: 6, background: 'none', color: 'var(--gw-muted)', fontSize: 11, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
            </>
          ) : (
            <>
              <span>{row.memberCap === null ? 'Unlimited people' : `Up to ${row.memberCap.toLocaleString('en-US')} people`}</span>
              <button className="btn sec sm"
                onClick={() => { setCapValue(row.memberCap === null ? '' : String(row.memberCap)); setEditingCap(true) }}
              >
                Edit cap
              </button>
            </>
          )}
        </div>
        <PlanCentsField row={row} field="extraSeatCents" what="An extra seat" />
        <PlanCentsField row={row} field="whatsappPersonCents" what="WhatsApp for each person who uses it" />
      </div>
      {editing && row.amountCents !== null ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <span style={{ fontSize: 13, color: 'var(--gw-muted)' }}>$</span>
          <input
            autoFocus
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') setEditing(false) }}
            style={{ width: 70, padding: '5px 7px', borderRadius: 6, border: '1px solid var(--gw-border)', fontSize: 13, fontFamily: 'inherit' }}
          />
          <span style={{ fontSize: 11, color: 'var(--gw-muted)' }}>/mo</span>
          <button className="btn pri sm"
            onClick={submit}
            disabled={save.isPending}
          >
            Save
          </button>
          <button
            onClick={() => setEditing(false)}
            style={{ padding: '5px 10px', borderRadius: 6, background: 'none', color: 'var(--gw-muted)', fontSize: 12, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            Cancel
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--gw-navy)' }}>
            {row.amountCents === null ? 'Contact us' : formatMonthlyPrice(row.amountCents)}
          </span>
          <button className="btn sec sm"
            hidden={row.amountCents === null}
            onClick={() => { setValue(centsForEditing(row.amountCents ?? 0)); setEditing(true) }}
          >
            Edit
          </button>
        </div>
      )}
    </div>
  )
}

/**
 * HOW MANY PEOPLE A FREE ORGANISATION MAY HAVE.
 *
 * The second free limit, and the one the pricing page now advertises: "10 free check-ins, for
 * teams of 5 or fewer". It lives in `platform_settings` beside the check-in limit because it is
 * the same decision and the same shape, one number for the whole platform.
 *
 * THE COUNT INCLUDES THE ACCOUNT CREATOR. Said on this screen as well as in the refusal message,
 * because an admin setting "5" here will otherwise assume it means five invitations.
 *
 * Lowering it never removes anybody. The limit is only consulted when somebody NEW is invited, so
 * an organisation already above it keeps every member and is simply unable to add more.
 */
function FreeMemberLimitRow() {
  const qc = useQueryClient()
  const { data } = useQuery({ queryKey: ['admin-free-member-limit'], queryFn: adminApi.getFreeMemberLimit })
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState('')
  const [err, setErr] = useState<string | null>(null)

  const save = useMutation({
    mutationFn: () => {
      const n = Number(value)
      if (!value.trim() || !Number.isInteger(n) || n < 1) {
        throw new Error('That needs to be a whole number of people, at least 1.')
      }
      return adminApi.setFreeMemberLimit(n)
    },
    onSuccess: (res) => {
      qc.setQueryData(['admin-free-member-limit'], res)
      /** Every surface that quotes the free team size reads this through the pricing endpoint. */
      qc.invalidateQueries({ queryKey: ['public-pricing'] })
      setEditing(false)
      setErr(null)
      toast.success(`Free accounts now cover ${res.freeMemberLimit} people, the creator included. Nobody already on an account is removed.`)
    },
    onError: (e: Error) => setErr(e.message),
  })

  if (!data) return null

  return (
    <div style={{ ...C, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gw-navy)' }}>Free team size</div>
        <div style={{ fontSize: 11, color: 'var(--gw-muted)', marginTop: 2 }}>
          People allowed on a free account, counting the person who created it
        </div>
        {err && <div style={{ fontSize: 11, color: 'var(--gw-red-t)', marginTop: 3 }}>{err}</div>}
      </div>
      {editing ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <input
            autoFocus
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') save.mutate(); if (e.key === 'Escape') { setEditing(false); setErr(null) } }}
            style={{ width: 64, padding: '5px 7px', borderRadius: 6, border: '1px solid var(--gw-border)', fontSize: 13, fontFamily: 'inherit' }}
          />
          <span style={{ fontSize: 11, color: 'var(--gw-muted)' }}>people</span>
          <button className="btn pri sm"
            onClick={() => save.mutate()}
            disabled={save.isPending}
          >
            Save
          </button>
          <button
            onClick={() => { setEditing(false); setErr(null) }}
            style={{ padding: '5px 10px', borderRadius: 6, background: 'none', color: 'var(--gw-muted)', fontSize: 12, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            Cancel
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--gw-navy)' }}>{data.freeMemberLimit}</span>
          <button className="btn sec sm"
            onClick={() => { setValue(String(data.freeMemberLimit)); setEditing(true) }}
          >
            Edit
          </button>
        </div>
      )}
    </div>
  )
}

/**
 * HOW MANY GROUNDS BEFORE SOMEBODY HAS TO PAY.
 *
 * The other half of pricing, and it was the harder one to change: a hardcoded 10 in the API, a
 * second hardcoded 10 in the client, and the words "10 Grounds" written out across three builds.
 * It sits with the plan prices because it is the same decision - what the free tier is worth.
 */
function FreeGroundLimitRow() {
  const qc = useQueryClient()
  const { data } = useQuery({ queryKey: ['admin-free-ground-limit'], queryFn: adminApi.getFreeGroundLimit })
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState('')
  const [err, setErr] = useState<string | null>(null)

  const save = useMutation({
    mutationFn: () => {
      const n = Number(value)
      if (!value.trim() || !Number.isInteger(n)) throw new Error('That needs to be a whole number of check-ins.')
      return adminApi.setFreeGroundLimit(n)
    },
    onSuccess: (res) => {
      qc.setQueryData(['admin-free-ground-limit'], res)
      /** The pricing page reads this too, so it must not keep showing the old number. */
      qc.invalidateQueries({ queryKey: ['public-pricing'] })
      setEditing(false); setErr(null)
    },
    onError: (e: any) => setErr(e?.response?.data?.message ?? e?.message ?? 'Could not save.'),
  })

  if (!data) return null
  return (
    <div style={{ ...C, padding: '11px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 700 }}>Free check-ins</div>
        <div style={{ fontSize: 11.5, color: 'var(--gw-muted)', marginTop: 1 }}>
          Before an organisation needs a subscription. Zero means no free tier.
        </div>
        {err && <div style={{ fontSize: 11.5, color: 'var(--gw-red-b)', marginTop: 4 }}>{err}</div>}
      </div>
      {editing ? (
        <>
          <input
            aria-label="Free check-in limit"
            value={value}
            inputMode="numeric"
            onChange={e => setValue(e.target.value)}
            style={{ width: 62, padding: '5px 8px', fontSize: 13, borderRadius: 6, border: '1px solid var(--gw-border)', fontFamily: 'inherit' }}
          />
          <button className="btn pri sm"
            onClick={() => save.mutate()}
            disabled={save.isPending}
          >
            {save.isPending ? 'Saving...' : 'Save'}
          </button>
          <button className="btn sec sm"
            onClick={() => { setEditing(false); setErr(null) }}
          >
            Cancel
          </button>
        </>
      ) : (
        <>
          <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--gw-navy)' }}>{data.freeGroundLimit}</span>
          <button className="btn sec sm"
            onClick={() => { setValue(String(data.freeGroundLimit)); setEditing(true) }}
          >
            Change
          </button>
        </>
      )}
    </div>
  )
}

/**
 * THE PRICES RAN OUT OF ORDER. W-UX-7.
 *
 * Scale ($1,650) was listed AFTER Enterprise, because this rendered whatever order the endpoint
 * happened to return - and a price list out of order is the one kind of table a person reads as
 * broken instantly.
 *
 * DERIVED, not hand-written. `PLAN_ORDER` is built from the SubscriptionPlan union in `api/billing`,
 * which is the single place the ladder is defined, so a new tier cannot appear here in the wrong
 * place. A row whose plan is not in the union sorts to the end rather than vanishing.
 */
const PLAN_ORDER: SubscriptionPlan[] = ['STARTER', 'SMALL_TEAM', 'GROWTH', 'BUSINESS', 'SCALE', 'ENTERPRISE']
const rankOf = (plan: string) => {
  const i = PLAN_ORDER.indexOf(plan as SubscriptionPlan)
  return i === -1 ? PLAN_ORDER.length : i
}

function PricingPanel() {
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['admin-pricing'], queryFn: adminApi.getPricing })
  if (isLoading) return null
  if (error || !data) return <SectionFailed what="Pricing" error={error} retry={() => refetch()} />
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {[...data].sort((a, b) => rankOf(a.plan) - rankOf(b.plan)).map(row => <PricingRow key={row.plan} row={row} />)}
      <FreeGroundLimitRow />
      <FreeMemberLimitRow />
      <FreeTrialRow />
      <AnchorTrialRow />
    </div>
  )
}

/**
 * THE REGULAR FREE TRIAL'S OWN SWITCH (`GET`/`PATCH /admin/pricing/free-trial`). Only `on` is
 * changed from here - every free run is one month now (decision 78), so the screen does not offer
 * to change the months, and the team size stays the server's own setting. The sentence is built
 * from the served numbers, never hardcoded, so it never promises what the switch does not do.
 */
export function FreeTrialRow() {
  const qc = useQueryClient()
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['admin-free-trial'], queryFn: adminApi.getFreeTrial })
  const [err, setErr] = useState<string | null>(null)
  const toggle = useMutation({
    mutationFn: (on: boolean) => adminApi.setFreeTrial(on),
    onSuccess: (res) => {
      qc.setQueryData(['admin-free-trial'], res)
      qc.invalidateQueries({ queryKey: ['public-pricing'] })
      setErr(null)
    },
    onError: (e: any) => setErr(e?.response?.data?.message ?? e?.message ?? 'That did not save.'),
  })
  if (isLoading) return null
  if (error || !data) return <SectionFailed what="The free trial" error={error} retry={() => refetch()} />
  const length = data.months === 1 ? '1 month' : `${data.months} months`
  return (
    <div style={{ ...C, padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700 }}>The free trial</div>
          <div style={{ fontSize: 12, color: 'var(--gw-muted)', marginTop: 2, lineHeight: 1.5 }}>
            Teams of fewer than {data.teamsUnder} people get {length} free.
          </div>
          {err && <div role="alert" style={{ fontSize: 12, color: 'var(--gw-red-t)', marginTop: 4 }}>{err}</div>}
        </div>
        <button className="gwui-tap-target"
          type="button"
          onClick={() => toggle.mutate(!data.on)}
          disabled={toggle.isPending}
          style={{
            width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
            background: data.on ? 'var(--gw-navy)' : 'var(--gw-border)',
            position: 'relative', flexShrink: 0, marginLeft: 16,
          }}
          aria-label={data.on ? 'Turn off the free trial' : 'Turn on the free trial'}
        >
          <span style={{ position: 'absolute', top: 3, left: data.on ? 23 : 3, width: 18, height: 18, borderRadius: '50%', background: 'white', boxShadow: 'var(--gw-hairline)' }} />
        </button>
      </div>
      <div style={{ fontSize: 11, marginTop: 8, fontWeight: 700, color: data.on ? 'var(--gw-green-t)' : 'var(--gw-muted)' }}>
        {data.on ? 'On' : 'Off'}
      </div>
    </div>
  )
}

/**
 * THE ANCHOR'S OWN TRIAL (anchor piece 34; `GET`/`PATCH /admin/pricing/anchor-trial`). Its own
 * setting, separate from the regular free trial above - only on or off, its one month for up to 20
 * people (the lead included) is fixed and never offered as a field here.
 */
export function AnchorTrialRow() {
  const qc = useQueryClient()
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['admin-anchor-trial'], queryFn: adminApi.getAnchorTrial })
  const [err, setErr] = useState<string | null>(null)
  const toggle = useMutation({
    mutationFn: (on: boolean) => adminApi.setAnchorTrial(on),
    onSuccess: (res) => {
      qc.setQueryData(['admin-anchor-trial'], res)
      qc.invalidateQueries({ queryKey: ['public-pricing'] })
      setErr(null)
    },
    onError: (e: any) => setErr(e?.response?.data?.message ?? e?.message ?? 'That did not save.'),
  })
  if (isLoading) return null
  if (error || !data) return <SectionFailed what="The anchor trial" error={error} retry={() => refetch()} />
  return (
    <div style={{ ...C, padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700 }}>The anchor trial</div>
          <div style={{ fontSize: 12, color: 'var(--gw-muted)', marginTop: 2, lineHeight: 1.5 }}>
            A check-in started from the anchor link gives the organisation 1 month on the plan for up to 20 people besides the lead.
          </div>
          {err && <div role="alert" style={{ fontSize: 12, color: 'var(--gw-red-t)', marginTop: 4 }}>{err}</div>}
        </div>
        <button className="gwui-tap-target"
          type="button"
          onClick={() => toggle.mutate(!data.on)}
          disabled={toggle.isPending}
          style={{
            width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
            background: data.on ? 'var(--gw-navy)' : 'var(--gw-border)',
            position: 'relative', flexShrink: 0, marginLeft: 16,
          }}
          aria-label={data.on ? 'Turn off the anchor trial' : 'Turn on the anchor trial'}
        >
          <span style={{ position: 'absolute', top: 3, left: data.on ? 23 : 3, width: 18, height: 18, borderRadius: '50%', background: 'white', boxShadow: 'var(--gw-hairline)' }} />
        </button>
      </div>
      <div style={{ fontSize: 11, marginTop: 8, fontWeight: 700, color: data.on ? 'var(--gw-green-t)' : 'var(--gw-muted)' }}>
        {data.on ? 'On' : 'Off'}
      </div>
    </div>
  )
}

/**
 * ONE MONTH ON THE HOUSE.
 *
 * Her words, 19 September 2026: "us to give free 3 month usage for orgs tied to some accounts. So we
 * put in someone's email and their org gets free use for three months, when they sign-up, they see
 * it." She later decided one month (decision 78), so the form now defaults to one.
 *
 * One field does the work, because one field is the whole idea: an address. Months and plan are
 * here because somebody will want four months or a bigger plan one day, and both default to what
 * she asked for. The list says which state each promise is in, because "promised" and "running" and
 * "finished" are three different things to a person deciding whether to chase somebody.
 */
function FreeRunsPanel() {
  const qc = useQueryClient()
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['admin-free-runs'], queryFn: adminApi.listFreeRuns })
  const [email, setEmail] = useState('')
  const [months, setMonths] = useState(1)
  const [plan, setPlan] = useState('GROWTH')
  const [note, setNote] = useState('')
  const [said, setSaid] = useState('')

  const grant = useMutation({
    mutationFn: () => adminApi.grantFreeRun({ email: email.trim(), months, plan, note: note.trim() || undefined }),
    onSuccess: (row) => {
      /* Every free run defaults to one month now (decision 78), so this reads "1 month", never
         "1 months" - the same singular/plural check the list below already makes. */
      setSaid(`${row.email} has ${row.months} ${row.months === 1 ? 'month' : 'months'} waiting. It starts the day they sign up.`)
      setEmail(''); setNote('')
      qc.invalidateQueries({ queryKey: ['admin-free-runs'] })
    },
    onError: (err: any) => setSaid(err?.response?.data?.message ?? 'That did not save.'),
  })
  const withdraw = useMutation({
    mutationFn: (id: string) => adminApi.withdrawFreeRun(id),
    onSuccess: () => { setSaid('Withdrawn. Nothing is waiting for that address now.'); qc.invalidateQueries({ queryKey: ['admin-free-runs'] }) },
    /* A withdrawal that silently fails leaves somebody believing a promise is gone when it is not. */
    onError: (err: any) => setSaid(err?.response?.data?.message ?? 'That did not withdraw. Try again.'),
  })

  if (isLoading) return null
  if (error || !data) return <SectionFailed what="Free runs" error={error} retry={() => refetch()} />

  const field: React.CSSProperties = {
    /* The kit's field (app.css .input). */
    padding: '12px 16px', fontSize: 16, border: '1.5px solid var(--gw-rule-2)', borderRadius: 10, background: 'var(--gw-card)', color: 'var(--gw-text)', fontFamily: 'inherit',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <input id="free-run-email" value={email} onChange={e => setEmail(e.target.value)}
               placeholder="their email" style={{ ...field, flex: '1 1 220px' }} />
        <input id="free-run-months" type="number" min={1} max={24} value={months}
               onChange={e => setMonths(Number(e.target.value))} style={{ ...field, width: 74 }} />
        <select id="free-run-plan" value={plan} onChange={e => setPlan(e.target.value)} style={{ ...field }}>
          {PLAN_ORDER.filter(p => p !== 'ENTERPRISE').map(p => <option key={p} value={p}>{p.replace('_', ' ').toLowerCase()}</option>)}
        </select>
        <input id="free-run-note" value={note} onChange={e => setNote(e.target.value)}
               placeholder="why, for us" style={{ ...field, flex: '1 1 160px' }} />
        <button className="btn pri sm"
          onClick={() => grant.mutate()}
          disabled={!email.trim() || grant.isPending}
        >{grant.isPending ? 'Saving...' : 'Give them the months'}</button>
      </div>
      {said && <div style={{ fontSize: 12.5, color: 'var(--gw-sub)' }}>{said}</div>}
      <div style={{ fontSize: 12, color: 'var(--gw-muted)' }}>
        Months start when they sign up, not now. They see it on the sign-up screen and on their billing page.
      </div>

      {data.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
          {data.map(r => (
            <div key={r.id} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '7px 10px',
                                     border: '1px solid var(--gw-border)', borderRadius: 7, fontSize: 12.5, flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 600 }}>{r.email}</span>
              <span style={{ color: 'var(--gw-sub)' }}>{r.months} {r.months === 1 ? 'month' : 'months'}, {r.plan.replace('_', ' ').toLowerCase()}</span>
              <span style={{ color: r.state === 'running' ? 'var(--gw-green-t)' : 'var(--gw-muted)' }}>
                {r.state === 'waiting' ? 'waiting for them to sign up'
                  : r.state === 'running' ? `running until ${whenItWas(r.endsAt!, 'day')}`
                    : r.state === 'finished' ? `finished ${whenItWas(r.endsAt!, 'day')}`
                      : 'withdrawn'}
              </span>
              {r.note && <span style={{ color: 'var(--gw-muted)' }}>{r.note}</span>}
              {r.state === 'waiting' && (
                <button onClick={() => withdraw.mutate(r.id)}
                        style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--gw-sub)',
                                 textDecoration: 'underline', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}>
                  Withdraw
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function SystemTab({ dash }: { dash: PlatformDashboardData }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

      <section>
        <div style={SL}>Integrations</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <WhatsAppToggle />
          <CoachingSwitch />
          <StripeStatus />
        </div>
      </section>

      <section>
        <div style={SL}>Delivery</div>
        <DeliveryAlertRow />
      </section>

      <section>
        <div style={SL}>The record</div>
        <CorrectionWindowRow />
      </section>

      <section>
        <div style={SL}>Pricing</div>
        <PricingPanel />
      </section>

      <section>
        <div style={SL}>Free runs</div>
        <FreeRunsPanel />
      </section>

      <section>
        <div style={SL}>At a glance</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Stat val={dash.orgs.total} label="Total orgs" />
          <Stat val={dash.orgs.withActiveCareFee} label="Active billing" accent />
          <Stat val={dash.grounds.total} label="Check-ins created" />
          <Stat val={dash.checkIns.totalCompleted} label="Sessions completed" />
          <Stat val={rateText(dash.checkIns.session2RateOfThoseDue)} of={dash.checkIns.session2RateOfThoseDue.of} label="Came back for session 2, of those whose session 2 was due" />
        </div>
      </section>

      <section>
        <div style={SL}>Last 7 days</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Stat val={dash.orgs.createdLast30Days} label="New orgs (30d)" />
          <Stat val={dash.grounds.openedLast7Days} label="Check-ins opened" />
          <Stat val={dash.checkIns.completedLast7Days} label="Sessions completed" />
          <Stat val={dash.grounds.resolvedLast30Days} label="Resolved (30d)" />
        </div>
      </section>

      <section>
        <div style={SL}>Check-in status</div>
        <div style={C}>
          {Object.entries(dash.grounds.byStatus).sort((a, b) => b[1] - a[1]).map(([status, count]) => {
            const total = dash.grounds.byStatusOf
            const pct = total > 0 ? (count / total) * 100 : 0
            return (
              <div key={status} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div style={{ fontSize: 12, color: 'var(--gw-text)', minWidth: 160, flexShrink: 0 }}>{fmt(status)}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gw-navy)', minWidth: 28, textAlign: 'right', flexShrink: 0 }}>{count}</div>
                <Bar pct={pct} />
                <div style={{ fontSize: 11, color: 'var(--gw-muted)', minWidth: 70, textAlign: 'right', flexShrink: 0 }}>{pct.toFixed(0)}% of {total}</div>
              </div>
            )
          })}
        </div>
      </section>

      <section>
        <div style={SL}>Recent activity</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {dash.recentActivity.map((ev, i) => (
            <div key={i} style={{ ...C, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: 'var(--gw-blue-bg)', color: 'var(--gw-navy)', textTransform: 'uppercase', letterSpacing: '.04em', whiteSpace: 'nowrap' }}>
                  {ev.type.replace(/_/g, ' ')}
                </span>
                <span style={{ fontSize: 12, color: 'var(--gw-text)' }}>{ev.groundLabel}</span>
                <span style={{ fontSize: 11, color: 'var(--gw-muted)' }}>{ev.orgSlug}</span>
              </div>
              <span style={{ fontSize: 11, color: 'var(--gw-muted)', whiteSpace: 'nowrap', marginLeft: 12 }}>{timeAgo(ev.at)}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

// ── Drop-offs tab ─────────────────────────────────────────────────────────────

/* Exported so the activation funnel (a served payload's own section of this tab) can be rendered
   and checked on its own, without standing up the whole back-office page and its dozen other
   queries - see activation-funnel-on-the-usage-tab.spec.tsx. */
export function DropoffsTab({ data }: { data: UsageFunnelData }) {
  const sessions = data.funnelBySession
  let lastNonZero = 0
  for (let i = 0; i < sessions.length; i++) { if (sessions[i].completed > 0) lastNonZero = i }
  const visible = sessions.slice(0, lastNonZero + 1)
  const s1 = sessions[0]?.completed ?? 1

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

      <ActivationSection activation={data.activation} />
      <ParticipantsSection participants={data.activation?.participants} />

      <section>
        <div style={SL}>Session retention</div>
        <div style={{ ...C, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {visible.map(row => (
            <div key={row.session} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'white', background: 'var(--gw-navy)', borderRadius: 4, padding: '2px 6px', minWidth: 26, textAlign: 'center', flexShrink: 0 }}>S{row.session}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gw-navy)', minWidth: 32, textAlign: 'right', flexShrink: 0 }}>{row.completed}</div>
              <Bar pct={s1 > 0 ? (row.completed / s1) * 100 : 0} />
              <div style={{ fontSize: 11, color: 'var(--gw-muted)', minWidth: 60, textAlign: 'right', flexShrink: 0 }}>
                {row.session === 1 ? 'baseline' : row.dropOffRate != null ? `−${Math.round(row.dropOffRate * 100)}% of ${row.of}` : ' - '}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div style={SL}>Party engagement</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Stat val={data.bothEngaged} label="Everybody engaged" />
          <Stat val={data.oneEngaged} label="One-sided (initiator only)" />
          <Stat val={data.stalledCheckIns} label="Stalled check-ins (>7d)" accent={data.stalledCheckIns > 0} />
        </div>
      </section>

      <section>
        {/* B-147 follow-up: `avgDaysToFirstCheckin` measures days from an organisation signing up
            to its first check-in being CREATED (an activation metric, like every other stat in
            this section) - a fact about the check-in as an entity, not about a session within
            one, so this was never the word B-147 was about. Reverted after a full run caught it. */}
        <div style={SL}>Avg days to first check-in</div>
        <div style={{ ...C, display: 'inline-block' }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--gw-navy)' }}>{data.avgDaysToFirstCheckin.value ?? ' - '}</div>
          <div style={{ fontSize: 11, color: 'var(--gw-sub)', marginTop: 2 }}>days, over {data.avgDaysToFirstCheckin.n} first sessions</div>
        </div>
      </section>

      {(data.avgSessionMinutes ?? []).length > 0 && (
        <section>
          <div style={SL}>Avg session duration (min)</div>
          <div style={C}>
            <table style={{ borderCollapse: 'collapse', width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ fontSize: 10, fontWeight: 700, color: 'var(--gw-muted)', textAlign: 'left', paddingBottom: 6, textTransform: 'uppercase', letterSpacing: '.06em' }}>Session</th>
                  <th style={{ fontSize: 10, fontWeight: 700, color: 'var(--gw-muted)', textAlign: 'right', paddingBottom: 6, textTransform: 'uppercase', letterSpacing: '.06em' }}>Avg min</th>
                  <th style={{ fontSize: 10, fontWeight: 700, color: 'var(--gw-muted)', textAlign: 'right', paddingBottom: 6, textTransform: 'uppercase', letterSpacing: '.06em' }}>Over</th>
                </tr>
              </thead>
              <tbody>
                {(data.avgSessionMinutes ?? []).map(row => (
                  <tr key={row.session}>
                    <td style={{ fontSize: 12, color: 'var(--gw-text)', padding: '4px 0', borderTop: '1px solid var(--gw-border)' }}>S{row.session}</td>
                    <td style={{ fontSize: 13, fontWeight: 600, color: 'var(--gw-navy)', textAlign: 'right', padding: '4px 0', borderTop: '1px solid var(--gw-border)' }}>{row.avgMinutes ?? ' - '}</td>
                    <td style={{ fontSize: 12, color: 'var(--gw-muted)', textAlign: 'right', padding: '4px 0', borderTop: '1px solid var(--gw-border)' }}>{row.n}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section>
        <div style={SL}>Check-in scenarios</div>
        <div style={{ ...C, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[...data.byScenario].sort((a, b) => b.count - a.count).map(row => (
            <div key={row.scenario} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ fontSize: 12, color: 'var(--gw-text)', minWidth: 160, flexShrink: 0 }}>{fmt(row.scenario)}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gw-navy)', minWidth: 28, textAlign: 'right', flexShrink: 0 }}>{row.count}</div>
              <Bar pct={row.pct} />
              <div style={{ fontSize: 11, color: 'var(--gw-muted)', minWidth: 70, textAlign: 'right', flexShrink: 0 }}>{row.pct.toFixed(0)}% of {row.of}</div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div style={SL}>Check-in status distribution</div>
        <div style={{ ...C, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[...data.byStatus].sort((a, b) => b.count - a.count).map(row => {
            const pct = row.pct
            return (
              <div key={row.status} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ fontSize: 12, color: 'var(--gw-text)', minWidth: 160, flexShrink: 0 }}>{fmt(row.status)}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gw-navy)', minWidth: 28, textAlign: 'right', flexShrink: 0 }}>{row.count}</div>
                <Bar pct={pct} />
                <div style={{ fontSize: 11, color: 'var(--gw-muted)', minWidth: 70, textAlign: 'right', flexShrink: 0 }}>{pct.toFixed(0)}% of {row.of}</div>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}

/**
 * THE ACTIVATION FUNNEL (docs/answers-from-engine.md, 8 October, "the engagement work", point 1;
 * decision 109). Staff-only, counts over customers' check-ins only, never a person or a word
 * anybody said. `activation` is null when it could not be read - this whole section draws nothing
 * then, and the rest of the Drop-offs tab is unaffected.
 */
const ACTIVATION_STAGE_LABELS: Record<ActivationStage, string> = {
  created: 'Created',
  peopleAdded: 'Somebody besides the lead was added',
  firstResponse: 'Somebody besides the lead finished a session',
  enoughToReport: 'A report was made',
  firstInsight: 'The report went out',
  leadActed: 'The lead acted on it',
  secondRound: 'A second session finished',
}
const ACTIVATION_STAGE_ORDER: ActivationStage[] = ['created', 'peopleAdded', 'firstResponse', 'enoughToReport', 'firstInsight', 'leadActed', 'secondRound']

const ACTIVATION_NOW_LABELS: Record<ActivationNowBucket, string> = {
  test: 'Test (a week old or more, nobody but the lead ever added)',
  abandonedBeforeValue: 'Abandoned before a report (over a fortnight old, nothing moving for a fortnight)',
  abandonedAfterValue: 'Abandoned after the report (the report went out over a fortnight ago, nothing moved since)',
  active: 'Active (a session started or finished in the last fortnight)',
}
const ACTIVATION_NOW_ORDER: ActivationNowBucket[] = ['test', 'abandonedBeforeValue', 'abandonedAfterValue', 'active']

/* The engine's own suggested words (docs/answers-from-engine.md): the last two were never
   delivered, so they must not be drawn as mail nobody answered. */
const ACTIVATION_EMAIL_LABELS: Record<ActivationEmailOutcome, string> = {
  delivered: 'Sent',
  failed: 'Could not be sent',
  held: 'Kept for the morning',
  notSentOnPurpose: 'Not sent, because the person asked us not to or had already had their one for the day',
}
const ACTIVATION_EMAIL_ORDER: ActivationEmailOutcome[] = ['delivered', 'failed', 'held', 'notSentOnPurpose']

function ActivationSection({ activation }: { activation: ActivationFunnel | null }) {
  if (!activation) return null
  const top = activation.reached.created || 1

  return (
    <>
      <section>
        <div style={SL}>How far check-ins get</div>
        <div style={{ ...C, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {ACTIVATION_STAGE_ORDER.map((stage) => (
            <div key={stage} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gw-navy)', minWidth: 36, textAlign: 'right', flexShrink: 0 }}>{activation.reached[stage]}</div>
              <Bar pct={top > 0 ? (activation.reached[stage] / top) * 100 : 0} />
              <div style={{ fontSize: 12, color: 'var(--gw-text)', minWidth: 230, flexShrink: 0 }}>{ACTIVATION_STAGE_LABELS[stage]}</div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div style={SL}>Where check-ins stand now</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {ACTIVATION_NOW_ORDER.map((bucket) => (
            <Stat key={bucket} val={activation.now[bucket]} label={ACTIVATION_NOW_LABELS[bucket]} />
          ))}
        </div>
      </section>

      <section>
        <div style={SL}>Leads who came back</div>
        <div style={{ ...C, display: 'inline-block' }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--gw-navy)' }}>{activation.leadsWhoCameBack}</div>
          <div style={{ fontSize: 11, color: 'var(--gw-sub)', marginTop: 2 }}>leads with a second session</div>
        </div>
      </section>

      <section>
        <div style={SL}>Mail Groundwork decided to send</div>
        <div style={{ ...C, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {ACTIVATION_EMAIL_ORDER.map((outcome) => (
            <div key={outcome} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
              <div style={{ fontSize: 12, color: 'var(--gw-text)' }}>{ACTIVATION_EMAIL_LABELS[outcome]}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gw-navy)' }}>{activation.emails[outcome].toLocaleString()}</div>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}

/**
 * THE BACK OFFICE FUNNEL: PEOPLE, NOT ONLY CHECK-INS (docs/answers-from-engine.md, 8 October, point
 * 2; beside the check-in funnel built in 5bdfc442). Staff-only, counts only - no name and no
 * address is served. `participants` is missing on a server that has not shipped it yet, so this
 * whole part of the tab draws nothing then, and the rest of the Drop-offs tab is unaffected.
 */
const PARTICIPANT_REACHED_LABELS: Record<ParticipantReachedStep, string> = {
  added: 'Added to a check-in',
  invited: 'Sent an invitation',
  reached: 'The invitation arrived',
  verified: 'Opened it and signed in',
  engaged: 'Started a check-in',
  inAHabit: 'Finished two or more, the latest in the last two weeks',
}
const PARTICIPANT_REACHED_ORDER: ParticipantReachedStep[] = ['added', 'invited', 'reached', 'verified', 'engaged', 'inAHabit']

const PARTICIPANT_STUCK_LABELS: Record<ParticipantStuckBucket, string> = {
  notInvited: 'Added and never sent an invitation',
  invitedNotVerified: 'Invited and has not signed in',
  verifiedNeverStarted: 'Signed in and has not started',
  startedNotFinished: 'Started and not finished',
  answeredOnceNotReturned: 'Answered once and has not come back',
  wentQuiet: 'Answered twice or more and has gone quiet',
}
const PARTICIPANT_STUCK_ORDER: ParticipantStuckBucket[] = ['notInvited', 'invitedNotVerified', 'verifiedNeverStarted', 'startedNotFinished', 'answeredOnceNotReturned', 'wentQuiet']

function ParticipantsSection({ participants }: { participants: ParticipantActivation | undefined }) {
  if (!participants) return null
  const top = participants.reached.added || 1

  return (
    <>
      <section>
        <div style={SL}>How far people get</div>
        <div style={{ ...C, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {PARTICIPANT_REACHED_ORDER.map((step) => (
            <div key={step} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gw-navy)', minWidth: 36, textAlign: 'right', flexShrink: 0 }}>{participants.reached[step]}</div>
              <Bar pct={top > 0 ? (participants.reached[step] / top) * 100 : 0} />
              <div style={{ fontSize: 12, color: 'var(--gw-text)', minWidth: 260, flexShrink: 0 }}>{PARTICIPANT_REACHED_LABELS[step]}</div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div style={SL}>Where the people who stopped are standing</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {PARTICIPANT_STUCK_ORDER.map((bucket) => (
            <Stat key={bucket} val={participants.stuck[bucket]} label={PARTICIPANT_STUCK_LABELS[bucket]} />
          ))}
        </div>
      </section>
    </>
  )
}

// ── Orgs tab ──────────────────────────────────────────────────────────────────

/**
 * WHO IS ACTUALLY IN AN ORGANISATION.
 *
 * The row said "11 users" and could not say who one of them was, so support could not answer "did
 * the invitation reach Musa" without asking the customer. Names, addresses and phone numbers - the
 * phone because somebody who joined over WhatsApp may never have given an address, and an operator
 * who cannot reach them is the reason this exists.
 *
 * NEVER THEIR WORK. No check-in, no record entry, no report, not a line anybody wrote. That wall is
 * held by its own guard on the server and nothing here goes near it.
 *
 * Fetched when the row is opened rather than with the list: most of the time nobody is looking, and
 * loading every organisation's roster to render a count is a lot of somebody's data moved for
 * nothing.
 */
function PeopleInOrg({ organizationId }: { organizationId: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['org-people', organizationId],
    queryFn: () => promptsApi.peopleIn(organizationId),
  })

  if (isLoading) return <div style={{ fontSize: 11.5, color: 'var(--gw-muted)', padding: '8px 0' }}>Loading the people…</div>
  /* Said, not swallowed: an empty panel where a list should be reads as nobody being there. */
  if (error) return <div style={{ fontSize: 11.5, color: 'var(--gw-red-t)', padding: '8px 0' }}>Could not load the people in this organisation.</div>
  if (!data?.people?.length) return <div style={{ fontSize: 11.5, color: 'var(--gw-muted)', padding: '8px 0' }}>Nobody has a login here yet.</div>

  return (
    <div style={{ display: 'grid', gap: 6, paddingTop: 10, marginTop: 10, borderTop: '1px solid var(--gw-border)' }}>
      {(data.people ?? []).map((p) => (
        <div key={p.id} style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap', fontSize: 12 }}>
          <span style={{ fontWeight: 600, color: 'var(--gw-text)', minWidth: 110 }}>{p.name ?? '(no name given)'}</span>
          <a href={`mailto:${p.email}`} style={{ color: 'var(--gw-navy)' }}>{p.email}</a>
          {p.phoneNumber && <span style={{ color: 'var(--gw-sub)' }}>{p.phoneNumber}</span>}
          <span style={{ color: 'var(--gw-muted)', fontSize: 11 }}>{p.role.toLowerCase()}</span>
          {p.isPlatformAdmin && <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 20, background: 'var(--gw-blue-bg)', color: 'var(--gw-blue-t)' }}>platform</span>}
          {/* Whether the address works is the first thing support needs and the easiest to miss. */}
          {!p.isEmailVerified && <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 20, background: 'var(--gw-amber-bg)', color: 'var(--gw-amber-t)' }}>email not verified</span>}
        </div>
      ))}
    </div>
  )
}

/**
 * RELEASE 1'S SALES BOARD, ONE ORGANISATION AT A TIME (release plan, Part 0: test organisations first, then staging, then real
 * clients one at a time once Hafsah says so). Off returns the organisation to its previous board with nothing lost.
 */
export function ReleaseOneSalesBoardSwitch({ org }: { org: Pick<OrgListItem, 'id' | 'name' | 'release1SalesBoardOn'> }) {
  const qc = useQueryClient()
  const on = org.release1SalesBoardOn === true
  const toggle = useMutation({
    mutationFn: (next: boolean) => adminApi.setReleaseOneSalesBoard(org.id, next),
    onSuccess: (r) => {
      qc.setQueryData(['platform-org-list'], (old: OrgListItem[] | undefined) => (old ?? []).map((o) => (o.id === r.id ? { ...o, release1SalesBoardOn: r.release1SalesBoardOn } : o)))
      qc.invalidateQueries({ queryKey: ['platform-org-list'] })
      toast.success(r.says)
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'That could not be changed. Try again.'),
  })
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingTop: 10, marginTop: 10, borderTop: '1px solid var(--gw-border)' }}>
      <div>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--gw-text)' }}>The new sales board</div>
        <div style={{ fontSize: 12, color: 'var(--gw-sub)', marginTop: 2, lineHeight: 1.5 }}>
          {on
            ? `${org.name} has the new sales board. Switching it off returns them to their previous board, and nothing is lost.`
            : `${org.name} has its previous board. Switch the new sales board on for a test organisation first, and for a real client only once Hafsah says so.`}
        </div>
      </div>
      <button className="gwui-tap-target"
        type="button"
        onClick={() => toggle.mutate(!on)}
        disabled={toggle.isPending}
        style={{ width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', background: on ? 'var(--gw-navy)' : 'var(--gw-border)', position: 'relative', flexShrink: 0 }}
        aria-label={on ? `Switch the new sales board off for ${org.name}` : `Switch the new sales board on for ${org.name}`}
        aria-pressed={on}
      >
        <span style={{ position: 'absolute', top: 3, left: on ? 23 : 3, width: 18, height: 18, borderRadius: '50%', background: 'white', boxShadow: 'var(--gw-hairline)' }} />
      </button>
    </div>
  )
}

/**
 * RELEASE 1B'S NEW CHECK-IN TABS, ONE ORGANISATION AT A TIME (Hafsah, 18 October 2026: test organisations first, then real
 * clients one at a time once she says so). Off returns the organisation to the tabs it had, with nothing lost.
 */
export function Release1bTabsSwitch({ org }: { org: Pick<OrgListItem, 'id' | 'name' | 'release1bTabsOn'> }) {
  const qc = useQueryClient()
  const on = org.release1bTabsOn === true
  const toggle = useMutation({
    mutationFn: (next: boolean) => adminApi.setRelease1bTabs(org.id, next),
    onSuccess: (r) => {
      qc.setQueryData(['platform-org-list'], (old: OrgListItem[] | undefined) => (old ?? []).map((o) => (o.id === r.id ? { ...o, release1bTabsOn: r.release1bTabsOn } : o)))
      qc.invalidateQueries({ queryKey: ['platform-org-list'] })
      toast.success(r.says)
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'That could not be changed. Try again.'),
  })
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingTop: 10, marginTop: 10, borderTop: '1px solid var(--gw-border)' }}>
      <div>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--gw-text)' }}>The new check-in tabs</div>
        <div style={{ fontSize: 12, color: 'var(--gw-sub)', marginTop: 2, lineHeight: 1.5 }}>
          {on
            ? `${org.name} has the new People and setup tab. Switching it off returns them to the tab they had, and no setting changes.`
            : `${org.name} has the People and setup tab it had before. Switch the new tabs on for a test organisation first, and for a real client only once Hafsah says so.`}
        </div>
      </div>
      <button className="gwui-tap-target"
        type="button"
        onClick={() => toggle.mutate(!on)}
        disabled={toggle.isPending}
        style={{ width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', background: on ? 'var(--gw-navy)' : 'var(--gw-border)', position: 'relative', flexShrink: 0 }}
        aria-label={on ? `Switch the new check-in tabs off for ${org.name}` : `Switch the new check-in tabs on for ${org.name}`}
        aria-pressed={on}
      >
        <span style={{ position: 'absolute', top: 3, left: on ? 23 : 3, width: 18, height: 18, borderRadius: '50%', background: 'white', boxShadow: 'var(--gw-hairline)' }} />
      </button>
    </div>
  )
}

/**
 * RELEASE 2, COLLECT WHAT'S OWED, ONE ORGANISATION AT A TIME (release plan, Release 2: test organisations first, then Muchemi &
 * Co once Hafsah says so). Off returns the organisation to what it had, with nothing lost.
 */
export function Release2CollectionsSwitch({ org }: { org: Pick<OrgListItem, 'id' | 'name' | 'release2CollectionsOn'> }) {
  const qc = useQueryClient()
  const on = org.release2CollectionsOn === true
  const toggle = useMutation({
    mutationFn: (next: boolean) => adminApi.setRelease2Collections(org.id, next),
    onSuccess: (r) => {
      qc.setQueryData(['platform-org-list'], (old: OrgListItem[] | undefined) => (old ?? []).map((o) => (o.id === r.id ? { ...o, release2CollectionsOn: r.release2CollectionsOn } : o)))
      qc.invalidateQueries({ queryKey: ['platform-org-list'] })
      toast.success(r.says)
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'That could not be changed. Try again.'),
  })
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingTop: 10, marginTop: 10, borderTop: '1px solid var(--gw-border)' }}>
      <div>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--gw-text)' }}>Collect what’s owed</div>
        <div style={{ fontSize: 12, color: 'var(--gw-sub)', marginTop: 2, lineHeight: 1.5 }}>
          {on
            ? `${org.name} can start a check-in to collect what is owed. Switching it off returns them to what they had, and nothing is lost.`
            : `${org.name} cannot start a check-in to collect what is owed. Switch it on for a test organisation first, and for a real client only once Hafsah says so.`}
        </div>
      </div>
      <button className="gwui-tap-target"
        type="button"
        onClick={() => toggle.mutate(!on)}
        disabled={toggle.isPending}
        style={{ width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', background: on ? 'var(--gw-navy)' : 'var(--gw-border)', position: 'relative', flexShrink: 0 }}
        aria-label={on ? `Switch collecting what is owed off for ${org.name}` : `Switch collecting what is owed on for ${org.name}`}
        aria-pressed={on}
      >
        <span style={{ position: 'absolute', top: 3, left: on ? 23 : 3, width: 18, height: 18, borderRadius: '50%', background: 'white', boxShadow: 'var(--gw-hairline)' }} />
      </button>
    </div>
  )
}

/**
 * EVERY SWITCH OF ONE ORGANISATION, FOR GROUNDWORK'S OPS TEAM ONLY (Hafsah, 25 October 2026). Releases 1 to 9, direct language and the
 * lead's read of each person, read and set here and nowhere a client can reach (the admin route, refused on the server to anyone
 * who is not Groundwork staff).
 */
export function EverySwitchOf({ org }: { org: Pick<OrgListItem, 'id' | 'name'> }) {
  const qc = useQueryClient()
  const q = useQuery({ queryKey: ['org-switches', org.id], queryFn: () => adminApi.theSwitchesOf(org.id) })
  const set = useMutation({
    mutationFn: ({ key, on }: { key: string; on: boolean }) => adminApi.setASwitch(org.id, key, on),
    onSuccess: (r) => { qc.setQueryData(['org-switches', org.id], r); qc.invalidateQueries({ queryKey: ['platform-org-list'] }) },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'That could not be changed. Try again.'),
  })
  if (!q.data) return null
  return (
    <div style={{ paddingTop: 10, marginTop: 10, borderTop: '1px solid var(--gw-border)' }}>
      <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--gw-text)', marginBottom: 6 }}>Every switch for {org.name}</div>
      {q.data.switches.map((s) => (
        <label key={s.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '4px 0', fontSize: 12.5 }}>
          <span>{s.name}</span>
          <input type="checkbox" checked={s.on} disabled={set.isPending} onChange={(e) => set.mutate({ key: s.key, on: e.target.checked })} aria-label={`${s.name} for ${org.name}`} />
        </label>
      ))}
    </div>
  )
}

function OrgsTab({ orgs }: { orgs: OrgListItem[] }) {
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState<string | null>(null)
  const filtered = orgs.filter(o =>
    !search || o.name.toLowerCase().includes(search.toLowerCase()) || o.slug.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <input className="gwui-input"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search orgs…"
        style={{ width: '100%', marginBottom: 14 }}
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {filtered.map(org => (
          <div key={org.id} style={{ ...C }}>
           <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <button
                onClick={() => setOpen(open === org.id ? null : org.id)}
                aria-expanded={open === org.id}
                style={{ background: 'none', border: 'none', padding: 0, fontFamily: 'inherit', cursor: 'pointer', textAlign: 'left', fontSize: 13, fontWeight: 700, color: 'var(--gw-navy)', marginBottom: 2 }}
              >
                {org.name}
                {org.isInternal && <span style={{ fontSize: 10, fontWeight: 700, marginLeft: 6, padding: '1px 6px', borderRadius: 20, background: 'var(--gw-bg)', color: 'var(--gw-muted)', border: '1px solid var(--gw-border)' }}>ours - not counted</span>}
              </button>
              <div style={{ fontSize: 11, color: 'var(--gw-muted)' }}>
                {org.groundCount} check-in{org.groundCount !== 1 ? 's' : ''} · {org.userCount} user{org.userCount !== 1 ? 's' : ''}
                {org.lastActivity ? ` · last active ${timeAgo(org.lastActivity)}` : ' · no activity yet'}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                background: org.billingActive ? 'var(--gw-green-bg)' : 'var(--gw-bg)',
                color: org.billingActive ? 'var(--gw-green-t)' : 'var(--gw-muted)',
                border: '1px solid var(--gw-border)',
              }}>
                {org.billingActive ? 'Billing active' : 'Free'}
              </span>
              <span style={{ fontSize: 10, color: 'var(--gw-muted)' }}>
                {whenItWas(org.createdAt, 'day')}
              </span>
            </div>
           </div>
           {open === org.id && <ReleaseOneSalesBoardSwitch org={org} />}
           {open === org.id && <Release1bTabsSwitch org={org} />}
           {open === org.id && <Release2CollectionsSwitch org={org} />}
           {open === org.id && <EverySwitchOf org={org} />}
           {open === org.id && <PeopleInOrg organizationId={org.id} />}
          </div>
        ))}
        {filtered.length === 0 && (
          <div style={{ fontSize: 13, color: 'var(--gw-muted)', textAlign: 'center', padding: 24 }}>No orgs found.</div>
        )}
      </div>
    </div>
  )
}

// ── Usage tab ─────────────────────────────────────────────────────────────────

function UsageTab({ data }: { data: UsageStatsData }) {
  const sessionsLast14Days = data.sessionsLast14Days ?? []
  const maxCount = Math.max(...sessionsLast14Days.map(d => d.count), 1)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

      <section>
        <div style={SL}>Platform totals</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {/* Three objects, three words: a session is what one person gives, a check-in is the thing
              they give it on, a report is what comes out. These three tiles used to say "check-ins"
              over two different tables. */}
          <Stat val={data.sessionsCompleted} label="Sessions completed" accent />
          <Stat val={data.checkInsCreated} label="Check-ins created" />
          <Stat val={data.reportsReleased} label="Reports released" />
        </div>
      </section>

      <section>
        <div style={SL}>Sessions - last 14 days</div>
        <div style={{ ...C, paddingBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 80 }}>
            {sessionsLast14Days.map(({ date, count }) => (
              <div key={date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                <div
                  title={`${count} session${count !== 1 ? 's' : ''}`}
                  style={{
                    width: '100%', borderRadius: '3px 3px 0 0',
                    height: `${Math.max((count / maxCount) * 60, count > 0 ? 4 : 2)}px`,
                    background: count > 0 ? 'var(--gw-navy)' : 'var(--gw-border)',
                    transition: 'height .3s',
                  }}
                />
                <div style={{ fontSize: 8, color: 'var(--gw-muted)', textAlign: 'center', lineHeight: 1.2, whiteSpace: 'nowrap' }}>
                  {date.split(' ')[0]}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {Object.keys(data.eventTotals).length > 0 && (
        <section>
          <div style={SL}>Usage events</div>
          <div style={{ ...C, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {Object.entries(data.eventTotals).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
              <div key={type} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 12, color: 'var(--gw-text)' }}>{fmt(type)}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gw-navy)' }}>{count.toLocaleString()}</div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

// ── Feedback tab ──────────────────────────────────────────────────────────────

/**
 * WHAT PEOPLE WROTE IN THE FEEDBACK BUTTON, WHICH NOTHING HAS EVER SHOWN. W-UX-C.
 *
 * This tab showed OUTCOME feedback - "did this check-in feel fair" - and that is a different thing
 * from the floating Feedback button, whose submissions had no reader anywhere in the product.
 * `feedbackApi.list` and `feedbackApi.updateStatus` were both live on the server, both guarded to
 * platform admins, and both called by nothing.
 *
 * So the loop was open at both ends: submissions were rejected on the way in (fixed in AppShell) and
 * unreadable if they had arrived. Marking one handled is the other half - a list with no way to
 * clear a row is a list nobody keeps looking at.
 */
function InAppFeedback() {
  const qc = useQueryClient()
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['in-app-feedback'], queryFn: feedbackApi.list, retry: false })
  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => feedbackApi.updateStatus(id, status),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['in-app-feedback'] }) },
    onError: () => toast.error('That did not change - try again.'),
  })
  if (isLoading) return null
  if (error) return <SectionFailed what="Feedback" error={error} retry={() => refetch()} />

  const rows = data ?? []
  const open = rows.filter(r => r.status === 'new')
  return (
    <div>
      <div style={SL}>From the feedback button{open.length > 0 ? ` · ${open.length} unread` : ''}</div>
      {rows.length === 0 ? (
        <div style={{ ...C, fontSize: 12, color: 'var(--gw-muted)' }}>
          Nothing sent through the in-app feedback button yet.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {rows.map(f => (
            <div key={f.id} style={{ ...C, borderLeft: `3px solid ${f.status === 'new' ? 'var(--gw-navy)' : 'var(--gw-border)'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--gw-text)' }}>{f.pill}</div>
                  <div style={{ fontSize: 11, color: 'var(--gw-muted)', marginTop: 1 }}>
                    {f.tab.replace(/_/g, ' ')} · {timeAgo(f.createdAt)}
                  </div>
                </div>
                {f.status === 'new' ? (
                  <button className="btn sec sm"
                    onClick={() => setStatus.mutate({ id: f.id, status: 'reviewed' })}
                    disabled={setStatus.isPending}
                    style={{ flexShrink: 0 }}
                  >
                    Mark read
                  </button>
                ) : (
                  <span style={{ flexShrink: 0, fontSize: 11, color: 'var(--gw-muted)' }}>{f.status}</span>
                )}
              </div>
              {f.text && (
                <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.6, marginTop: 6, whiteSpace: 'pre-wrap' }}>{f.text}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function FeedbackTab({ data }: { data: FeedbackSummaryData }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      <InAppFeedback />

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <Stat val={data.total} label="Fairness responses" />
        <Stat val={data.fairRate != null ? `${data.fairRate}%` : ' - '} label="Felt fair" accent={!!data.fairRate && data.fairRate >= 70} />
      </div>

      {(data.recent ?? []).length === 0 ? (
        <div style={{ fontSize: 13, color: 'var(--gw-muted)', textAlign: 'center', padding: 32 }}>Nobody has answered "did this feel fair" yet.</div>
      ) : (
        <div>
          {/*
            TWO DIFFERENT FEEDBACKS ON ONE TAB, AND BOTH WERE CALLED "FEEDBACK". W-UX-C.
            
            Seen on the running page the moment the in-app list was added above: this half said
            "Feedback responses 0" and "No feedback submitted yet" directly under a section holding a
            submission. They are genuinely different things - this one is "did this check-in feel
            fair", asked of a party after it resolves - so each now says which it is.
          */}
          <div style={SL}>Did it feel fair · recent answers</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {(data.recent ?? []).map(f => (
              <div key={f.id} style={{ ...C, borderLeft: `3px solid ${f.feltFair ? 'var(--gw-green-b)' : 'var(--gw-amber-b)'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: f.note ? 5 : 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20,
                      background: f.feltFair ? 'var(--gw-green-bg)' : 'var(--gw-amber-bg)',
                      color: f.feltFair ? 'var(--gw-green-t)' : 'var(--gw-amber-t)',
                    }}>
                      {f.feltFair ? 'Felt fair' : 'Didn\'t feel fair'}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--gw-text)' }}>{f.groundLabel}</span>
                    <span style={{ fontSize: 11, color: 'var(--gw-muted)' }}>{f.orgSlug}</span>
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--gw-muted)', whiteSpace: 'nowrap', marginLeft: 12 }}>{timeAgo(f.createdAt)}</span>
                </div>
                {f.note && (
                  <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.6, fontStyle: 'italic', marginTop: 4 }}>"{f.note}"</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Errors tab ────────────────────────────────────────────────────────────────

function ErrorsTab() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ ...C, borderLeft: '3px solid var(--gw-amber-b)' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gw-text)', marginBottom: 4 }}>No error sink connected</div>
        <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.6 }}>
          Connect Sentry or add a <code style={{ fontSize: 11, background: 'var(--gw-bg)', padding: '1px 5px', borderRadius: 3 }}>POST /ops/errors</code> endpoint to surface recent exceptions here.
          The API already logs to console via NestJS Logger - redirect that output to a sink and expose it through the prompts controller.
        </div>
      </div>
      <div style={{ ...C }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gw-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>What to wire</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {[
            { label: 'Sentry DSN', detail: 'Set SENTRY_DSN in api/.env and import @sentry/nestjs in main.ts' },
            { label: 'Error log endpoint', detail: 'Add GET /prompts/errors to PromptsController - query a database error_logs table' },
            { label: 'AI failure rate', detail: 'Log AnthropicService 4xx/5xx calls to the usage_events table with type ERROR' },
            { label: 'Webhook failures', detail: 'Log Stripe webhook errors to a separate stripe_errors table - query it here' },
          ].map(item => (
            <div key={item.label} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--gw-navy)', minWidth: 160, flexShrink: 0 }}>{item.label}</span>
              <span style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.5 }}>{item.detail}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Prompts tab ───────────────────────────────────────────────────────────────

function PromptsTab({ navigate }: { navigate: (path: string) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ fontSize: 13, color: 'var(--gw-sub)', lineHeight: 1.65 }}>
        Conversation prompts are versioned and stored in the database. Changes are logged with a summary and activation is deliberate - deactivating a version does not delete it. Outcome data is tracked per version so you can compare fairness rates across prompt iterations.
      </div>
      <button className="btn pri"
        onClick={() => navigate('/prompts')}
        style={{ alignSelf: 'flex-start' }}
      >
        Open prompt management →
      </button>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

/**
 * COACH REQUESTS. NOT FEEDBACK, AND NOT A GROUND.
 *
 * Somebody asked to speak to a coach before opening anything. Nothing was created for them, nobody on
 * their team was contacted, and the only thing they were promised is an email - so the one column that
 * must never be guessed at is whether that email actually went.
 *
 * The intention is shown IN FULL. It is the whole reason the form asks for two written lines, and
 * truncating it here would make that friction pointless.
 */
function CoachTab({ rows, onChanged }: { rows: CoachRequestRow[]; onChanged: () => void }) {
  const NEXT: Record<string, string[]> = {
    new: ['contacted', 'declined'],
    contacted: ['booked', 'declined'],
    booked: ['done'],
    done: [],
    declined: [],
  }
  if (rows.length === 0) {
    return <div style={{ fontSize: 13, color: 'var(--gw-muted)', textAlign: 'center', padding: 32 }}>Nobody has asked to speak to a coach yet.</div>
  }
  const chip = (text: string, bg: string, fg: string) => (
    <span style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', padding: '2px 7px', borderRadius: 4, background: bg, color: fg }}>{text}</span>
  )
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {rows.map(r => (
        <div key={r.id} style={{ ...C, borderLeft: `3px solid ${r.status === 'new' ? 'var(--gw-navy)' : r.status === 'declined' ? 'var(--gw-border)' : 'var(--gw-green-b)'}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginBottom: 5 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700 }}>
              {r.name} &middot; {r.orgName}
              {/* The public form stopped asking, so this row can be empty and " . people" is not a fact. */}
              {r.teamSize?.trim() && <span style={{ fontWeight: 500, color: 'var(--gw-sub)' }}> &middot; {r.teamSize} people</span>}
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              {/*
                * WHEN THEY ASKED TO TALK, ON THE CARD RATHER THAN BURIED.
                *
                * The request now carries a time, and it is the whole reason for asking it here:
                * the conversation is meant to happen BEFORE they set the check-in up. A coach
                * reading this queue has to be able to see which ones are running out of time
                * without opening each one.
                *
                * "asked for" and never "booked" - nothing has been agreed with anybody yet.
                */}
              {r.preferredAt && chip(
                `asked for ${whenItWas(r.preferredAt, 'dayAndTime')}`,
                new Date(r.preferredAt) < new Date() ? 'var(--gw-red-bg)' : 'var(--gw-blue-bg)',
                new Date(r.preferredAt) < new Date() ? 'var(--gw-red-t)' : 'var(--gw-navy)',
              )}
              {chip(r.status, 'var(--gw-paper-2)', 'var(--gw-sub)')}
              {/* Marked, never refused: a founder on a personal address is a real prospect. */}
              {r.isFreeMail && chip('personal email', 'var(--gw-amber-bg)', 'var(--gw-amber-t)')}
              {r.askedAgainAt && chip('asked again', 'var(--gw-blue-bg)', 'var(--gw-navy)')}
              {/* The one thing they were promised. Loud when it did not happen. */}
              {!r.confirmationSentAt && chip('no email sent', 'var(--gw-red-bg)', 'var(--gw-red-t)')}
            </div>
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--gw-sub)', marginBottom: 6 }}>
            <a href={`mailto:${r.email}`} style={{ color: 'var(--gw-navy)' }}>{r.email}</a>
            {r.triedAlready === true && <span> &middot; has already tried opening a check-in</span>}
            {r.triedAlready === false && <span> &middot; has not tried the product yet</span>}
            <span> &middot; {whenItWas(r.createdAt, 'day')}</span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--gw-text)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{r.intention}</div>
          {NEXT[r.status] && NEXT[r.status].length > 0 && (
            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              {NEXT[r.status].map(next => (
                <button className="btn sec sm"
                  key={next}
                  type="button"
                  onClick={async () => { await coachApi.setStatus(r.id, next); onChanged() }}
                >
                  Mark {next}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

/**
 * MAIL SENT TO US.
 *
 * `hello@myground.work` is on the marketing site, in the footer, and beside "Ask about Guided" on
 * the pricing page - so it is the address a prospect writes to, and it went to one person's inbox
 * where nobody else could see it and nothing could be picked up if she were away for a week.
 *
 * NOT A MAILBOX AND MUST NOT GROW INTO ONE. No replying, no threads, no assignment: replying
 * happens in whatever mail client somebody already uses. This makes a message reaching the company
 * visible to the company, which is the only part that was broken.
 */
function InboxTab({ data, onRead }: {
  data: { messages: InboundMessage[]; unread: number }
  onRead: (id: string) => void
}) {
  const messages = data.messages ?? []
  if (!messages.length) {
    return (
      <div style={{ fontSize: 13, color: 'var(--gw-sub)', lineHeight: 1.7 }}>
        Nothing has come in yet. Mail to hello@myground.work lands here once Resend is forwarding it
        to the webhook - until then it only reaches whoever owns the mailbox.
      </div>
    )
  }

  return (
    <div>
      <div style={{ fontSize: 12.5, color: 'var(--gw-sub)', marginBottom: 12 }}>
        {data.unread} unread of {messages.length}. Reply from your own mail - this is here so
        nothing sits unseen.
      </div>
      <div style={{ display: 'grid', gap: 8 }}>
        {messages.map(m => (
          <div key={m.id} style={{
            border: '1px solid var(--gw-border)', borderRadius: 10, padding: '12px 14px',
            background: m.readAt ? 'var(--gw-bg)' : 'white',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 3 }}>
              <div style={{ fontSize: 13, fontWeight: m.readAt ? 600 : 800, color: 'var(--gw-navy)' }}>
                {m.subject?.trim() || '(no subject)'}
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--gw-muted)', whiteSpace: 'nowrap' }}>
                {whenItWas(m.receivedAt, 'dayAndTime')}
              </div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--gw-sub)', marginBottom: 7 }}>
              {m.fromName ? `${m.fromName} · ` : ''}
              <a href={`mailto:${m.fromAddress}?subject=${encodeURIComponent(`Re: ${m.subject ?? ''}`)}`}
                 style={{ color: 'var(--gw-navy)' }}>{m.fromAddress}</a>
              {' → '}{m.toAddress}
            </div>
            {m.body && (
              /* Their words, as text. The sender's HTML is never stored and never rendered. */
              <div style={{ fontSize: 12.5, color: 'var(--gw-text)', lineHeight: 1.65, whiteSpace: 'pre-wrap', marginBottom: 8 }}>
                {m.body}
              </div>
            )}
            {!m.readAt && (
              <button className="btn sec sm"
                type="button"
                onClick={() => onRead(m.id)}
              >Mark read</button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * EVERY CALL SOMEBODY HAS ASKED FOR.
 *
 * Coaching, setup help and integration support are the same request with a different subject:
 * somebody asks, our team rings back, and what they agree is invoiced by hand. One queue, because a
 * second one is a queue nobody opens - which is exactly what happened to the mail at hello@.
 *
 * WHETHER THEY PAY US IS SHOWN AND GATES NOTHING. The request is deliberately open to anybody,
 * including somebody still deciding whether to subscribe - that is the call most likely to end in
 * one. It is here because a call to a free account is a different conversation, and whoever picks
 * it up should not have to go and look it up.
 */
const WHAT_IT_IS_ABOUT: Record<CallRequestRow['about'], string> = {
  COACHING: 'A coach in the room',
  HANDS_ON: 'Setting them up, training the team',
  INTEGRATION: 'Connecting to their systems',
  CALL: 'Something else',
}

function CallRequestsTab({ data, onAnswered }: {
  data: { requests: CallRequestRow[] }
  onAnswered: (id: string) => void
}) {
  const requests = data.requests ?? []
  if (!requests.length) {
    return (
      <div style={{ fontSize: 13, color: 'var(--gw-sub)', lineHeight: 1.7 }}>
        Nobody is waiting on a call. Requests arrive here from the pricing page, the Connect page and
        the coach card, and stay until somebody marks them answered.
      </div>
    )
  }

  return (
    <div>
      <div style={{ fontSize: 12.5, color: 'var(--gw-sub)', marginBottom: 12 }}>
        {requests.length} waiting. Ring them, agree what it costs, and invoice it afterwards -
        nothing here charges anybody.
      </div>
      <div style={{ display: 'grid', gap: 8 }}>
        {requests.map(r => (
          <div key={r.id} style={{ border: '1px solid var(--gw-border)', borderRadius: 10, padding: '12px 14px', background: 'white' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 3 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--gw-navy)' }}>
                {WHAT_IT_IS_ABOUT[r.about] ?? 'Something else'}
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--gw-muted)', whiteSpace: 'nowrap' }}>
                {whenItWas(r.askedAt, 'dayAndTime')}
              </div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--gw-sub)', marginBottom: 7 }}>
              {r.who}{r.email ? ' · ' : ''}
              {r.email && <a href={`mailto:${r.email}`} style={{ color: 'var(--gw-navy)' }}>{r.email}</a>}
              {' · '}{r.orgName}
              <span style={{
                marginLeft: 8, fontSize: 10.5, fontWeight: 700, letterSpacing: '.04em',
                textTransform: 'uppercase', padding: '2px 6px', borderRadius: 4,
                background: r.paying ? 'var(--gw-green-bg)' : 'var(--gw-bg)',
                color: r.paying ? 'var(--gw-green-t)' : 'var(--gw-sub)',
                border: `1px solid ${r.paying ? 'var(--gw-green-b)' : 'var(--gw-border)'}`,
              }}>{r.paying ? 'Paying' : 'Free plan'}</span>
            </div>
            {r.note && (
              <div style={{ fontSize: 12.5, color: 'var(--gw-text)', lineHeight: 1.65, whiteSpace: 'pre-wrap', marginBottom: 8 }}>
                {r.note}
              </div>
            )}
            <button className="btn sec sm"
              type="button"
              onClick={() => onAnswered(r.id)}
            >Mark answered</button>
          </div>
        ))}
      </div>
    </div>
  )
}

type Tab = 'system' | 'dropoffs' | 'prompts' | 'orgs' | 'usage' | 'calls' | 'inbox' | 'feedback' | 'coach' | 'errors'

const TABS: { id: Tab; label: string }[] = [
  { id: 'system',   label: 'System' },
  { id: 'dropoffs', label: 'Drop-offs' },
  { id: 'prompts',  label: 'Prompts' },
  { id: 'orgs',     label: 'Orgs' },
  { id: 'usage',    label: 'Usage' },
  /* Both of these are somebody waiting on us, so they sit above the reporting tabs. */
  { id: 'calls',    label: 'Call requests' },
  { id: 'inbox',    label: 'Inbox' },
  { id: 'feedback', label: 'Feedback' },
  /**
   * Beside feedback, not inside it. A coach request has a person, an organisation, a team size, a
   * stated intention and a lifecycle; filed as feedback all of that becomes a text blob.
   */
  { id: 'coach',    label: 'Coach requests' },
  { id: 'errors',   label: 'Errors' },
]

export function AdminPage() {
  const navigate = useNavigate()
  const user = useAuthStore(s => s.user)
  const [tab, setTab] = useState<Tab>('system')
  /* ONE DATE RANGE FOR THE WHOLE PANEL. Every query below respects it; nothing on the panel is a
     percentage over an unnamed period any more. */
  const [range, setRange] = useState<PanelRange>('all')

  const { data: dash, isLoading: dashLoading } = useQuery({
    queryKey: ['platform-dashboard', range],
    queryFn: () => promptsApi.platformDashboard(range),
    enabled: !!user?.isPlatformAdmin,
    staleTime: 2 * 60 * 1000,
  })

  const { data: funnel, isLoading: funnelLoading } = useQuery({
    queryKey: ['platform-funnel', range],
    queryFn: () => promptsApi.platformFunnel(range),
    enabled: !!user?.isPlatformAdmin && tab === 'dropoffs',
    staleTime: 5 * 60 * 1000,
  })

  const { data: orgs, isLoading: orgsLoading } = useQuery({
    queryKey: ['platform-org-list'],
    queryFn: promptsApi.orgList,
    enabled: !!user?.isPlatformAdmin && tab === 'orgs',
    staleTime: 2 * 60 * 1000,
  })

  const { data: usage, isLoading: usageLoading } = useQuery({
    queryKey: ['platform-usage', range],
    queryFn: () => promptsApi.usageStats(range),
    enabled: !!user?.isPlatformAdmin && tab === 'usage',
    staleTime: 2 * 60 * 1000,
  })

  const { data: coachRequests, isLoading: coachLoading, refetch: refetchCoach } = useQuery({
    queryKey: ['coach-requests'],
    queryFn: () => coachApi.list(),
    enabled: !!user?.isPlatformAdmin && tab === 'coach',
    staleTime: 60 * 1000,
  })

  const { data: calls, isLoading: callsLoading } = useQuery({
    queryKey: ['platform-call-requests'],
    queryFn: adminApi.getCallRequests,
    enabled: !!user?.isPlatformAdmin && tab === 'calls',
    staleTime: 30 * 1000,
  })

  const { data: inbox, isLoading: inboxLoading } = useQuery({
    queryKey: ['platform-inbox'],
    queryFn: adminApi.getInbox,
    enabled: !!user?.isPlatformAdmin && tab === 'inbox',
    /* Shorter than the rest: somebody writing to hello@ is waiting, and a five minute cache is a
       five minute delay before anybody in the company can see they wrote. */
    staleTime: 30 * 1000,
  })
  const pageQc = useQueryClient()
  const markAnswered = useMutation({
    mutationFn: (id: string) => adminApi.markCallAnswered(id),
    onSuccess: () => pageQc.invalidateQueries({ queryKey: ['platform-call-requests'] }),
  })
  const markRead = useMutation({
    mutationFn: (id: string) => adminApi.markInboundRead(id),
    onSuccess: () => pageQc.invalidateQueries({ queryKey: ['platform-inbox'] }),
  })

  const { data: feedback, isLoading: feedbackLoading } = useQuery({
    queryKey: ['platform-feedback'],
    queryFn: promptsApi.feedbackSummary,
    enabled: !!user?.isPlatformAdmin && tab === 'feedback',
    staleTime: 5 * 60 * 1000,
  })

  if (!user?.isPlatformAdmin) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--gw-page)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: 13, color: 'var(--gw-muted)' }}>Platform admin access required.</div>
      </div>
    )
  }

  const loading = tab === 'system' ? dashLoading
    : tab === 'dropoffs' ? funnelLoading
    : tab === 'orgs' ? orgsLoading
    : tab === 'usage' ? usageLoading
    : tab === 'coach' ? coachLoading
    : tab === 'feedback' ? feedbackLoading
    : tab === 'inbox' ? inboxLoading
    : tab === 'calls' ? callsLoading
    : false

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--gw-page)' }}>

      {/* Nav */}
      <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'var(--gw-bg)', borderBottom: '1px solid var(--gw-border)' }}>
        <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px' }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--gw-navy)', letterSpacing: '-.01em' }}>Groundwork ops</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {/*
              * THE OTHER HALF OF THE BACK OFFICE, WHICH NOTHING LINKED TO.
              *
              * `/admin/dashboard` holds the destructive, OTP-gated actions - adding a platform
              * admin among them - and the only way to reach it was to know the URL and type it.
              * So a capability that has been built and working sat unreachable, and the way to add
              * a super admin was to ask somebody to run a database write.
              */}
            <button onClick={() => navigate('/admin/dashboard')} style={{ fontSize: 12, fontWeight: 700, color: 'var(--gw-navy)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Admins and codes →</button>
            {/*
              * THE THIRD SURFACE, WHICH ALSO NOTHING LINKED TO.
              *
              * "Groundwork ops" here is the PLATFORM console — prompts, orgs, usage, pricing. The
              * team's own operating system — targets, the pipeline, commitments, spend, the moat —
              * lives at /ops and had no link from anywhere, which is half of why it read as missing.
              * The other half was that nobody's account could open it; that is fixed on the
              * dashboard.
              */}
            <button onClick={() => navigate('/ops')} style={{ fontSize: 12, fontWeight: 700, color: 'var(--gw-navy)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Our own system →</button>
            <button onClick={() => navigate('/grounds')} style={{ fontSize: 12, color: 'var(--gw-muted)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>← App</button>
          </div>
        </div>

        {/* Tab bar, and the one range control every number on the panel respects */}
        <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', alignItems: 'center', overflowX: 'auto', borderTop: '1px solid var(--gw-border)' }}>
          <select
            aria-label="Date range for every number on this panel"
            value={range}
            onChange={(e) => setRange(e.target.value as PanelRange)}
            style={{ fontSize: 12, padding: '4px 8px', margin: '0 8px 0 4px', borderRadius: 6, border: '1px solid var(--gw-border)', background: 'white', fontFamily: 'inherit', color: 'var(--gw-navy)' }}
          >
            {PANEL_RANGES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
          </select>
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              style={{
                flex: '0 0 auto', padding: '9px 16px', fontSize: 12,
                fontWeight: tab === id ? 700 : 500,
                color: tab === id ? 'var(--gw-navy)' : 'var(--gw-muted)',
                background: 'none', border: 'none',
                borderBottom: tab === id ? '2px solid var(--gw-navy)' : '2px solid transparent',
                cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 760, margin: '0 auto', width: '100%', padding: '20px 16px 64px' }}>
        {loading && (
          <div style={{ fontSize: 13, color: 'var(--gw-muted)', padding: 32, textAlign: 'center' }}>Loading…</div>
        )}

        {tab === 'system'   && !dashLoading  && dash     && <SystemTab dash={dash} />}
        {tab === 'dropoffs' && !funnelLoading && funnel   && <DropoffsTab data={funnel} />}
        {tab === 'prompts'  && <PromptsTab navigate={navigate} />}
        {tab === 'orgs'     && !orgsLoading  && orgs     && <OrgsTab orgs={orgs} />}
        {tab === 'usage'    && !usageLoading && usage    && <UsageTab data={usage} />}
        {tab === 'calls' && !callsLoading && calls && (
          <CallRequestsTab data={calls} onAnswered={(id) => markAnswered.mutate(id)} />
        )}
        {tab === 'inbox' && !inboxLoading && inbox && (
          <InboxTab data={inbox} onRead={(id) => markRead.mutate(id)} />
        )}
        {tab === 'feedback' && !feedbackLoading && feedback && <FeedbackTab data={feedback} />}
        {tab === 'coach' && !coachLoading && <CoachTab rows={coachRequests ?? []} onChanged={refetchCoach} />}
        {tab === 'errors'   && <ErrorsTab />}
      </div>
    </div>
  )
}
