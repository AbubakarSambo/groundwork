import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth'
import { patternAccuracyApi } from '@/api/prompts'
import { apiClient } from '@/api/client'
import { whenItWas } from '@/lib/a-date-reads-the-same-everywhere'

// ── Design tokens (mirrors AdminPage) ────────────────────────────────────────

const C: React.CSSProperties = { background: 'white', border: '1px solid var(--gw-border)', borderRadius: 8, padding: '10px 14px' }
const SL: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: 'var(--gw-muted)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 10 }

function Stat({ val, label, accent }: { val: string | number; label: string; accent?: boolean }) {
  return (
    <div style={{ ...C, flex: 1, minWidth: 100 }}>
      <div style={{ fontSize: 22, fontWeight: 800, color: accent ? 'var(--gw-navy)' : 'var(--gw-navy)' }}>{val}</div>
      <div style={{ fontSize: 11, color: 'var(--gw-sub)', marginTop: 3 }}>{label}</div>
    </div>
  )
}

function Bar({ pct, color = 'var(--gw-navy)' }: { pct: number; color?: string }) {
  return (
    <div style={{ flex: 1, background: 'rgba(12,68,124,0.08)', borderRadius: 4, height: 8, overflow: 'hidden' }}>
      <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', background: color, borderRadius: 4, transition: 'width .3s' }} />
    </div>
  )
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface AdminOverview {
  totalOrgs: number
  totalGrounds: number
  totalCodes: number
  totalRedemptions: number
  totalSubscribedOrgs?: number
  totalSessionsBalance?: number
}

interface AdminCode {
  id: string
  code: string
  creatorEmail: string
  createdAt: string
  expiresAt: string | null
  active: boolean
  allowCodeCreation: boolean
  redemptionCount: number
}

interface FreeReasonBreakdown {
  FIRST_GROUND: number
  FREE_TIER: number
  ACCESS_CODE: number
  paid: number
}

interface AdminFeedback {
  id: string
  note: string | null
  feltFair: boolean | null
  createdAt: string
  groundLabel: string
  orgSlug: string
}

interface UserUsage {
  userId: string
  email: string
  groundCount: number
  codeCount: number
  redemptionCount: number
  lastActive: string | null
}

interface PlatformAdmin {
  id: string
  email: string
  firstName: string
  lastName: string
  createdAt: string
}

interface OpsDoorState {
  isSetUp: boolean
  nobodyCanOpenIt: boolean
  people: Array<{
    key: string
    displayName: string
    functionalRole: string
    active: boolean
    linkedAccount: string | null
    /** Further addresses that open the back office as the same person. */
    otherAccounts: string[]
  }>
}

interface AdminDashboardData {
  overview: AdminOverview
  codes: AdminCode[]
  freeReasonBreakdown: FreeReasonBreakdown
  feedback: AdminFeedback[]
  userUsage: UserUsage[]
}

// ── API helpers ───────────────────────────────────────────────────────────────

/**
 * THIS PAGE HAD ITS OWN FETCH, AND IT POINTED AT THE WRONG PLACE.
 *
 * It called `fetch('/api' + path)` — one segment short of the `/api/v1` that
 * `apiClient` uses, and relative, so on staging the request went to the site
 * rather than the API and came back as this page's own HTML:
 *
 *   Unexpected token '<', "<!doctype "... is not valid JSON
 *
 * Underneath that, three of its four routes did not exist at all: there was no
 * `GET /admin/dashboard`, disabling a code is a PATCH not a POST, and adding an
 * admin is `add-admin` not `admins`. The wrong prefix hid all of it behind one
 * parse error. Everything now goes through the shared client, which carries the
 * base URL, the token and the error handling that every other page relies on.
 */
const adminApi = {
  /** Zero-row detection: which writers have never written. */
  writers: () =>
    apiClient.get<{ checkedAt: string; flaggedCount: number; rows: { table: string; writer: string; count: number | null; lastWrite: string | null; shippedAt: string | null; flagged: boolean; needs?: string; error?: string }[] }>('/admin/writers').then(r => r.data),
  dashboard: (): Promise<AdminDashboardData> =>
    apiClient.get<AdminDashboardData>('/admin/dashboard').then(r => r.data),
  requestOtp: (): Promise<void> => apiClient.post('/admin/otp/request').then(() => undefined),
  disableCode: (codeId: string, otp: string): Promise<void> =>
    apiClient
      .patch(`/admin/codes/${codeId}/disable`, {}, { headers: { 'X-Admin-OTP': otp } })
      .then(() => undefined),
  addAdmin: (email: string, otp: string): Promise<void> =>
    apiClient.post('/admin/add-admin', { email }, { headers: { 'X-Admin-OTP': otp } }).then(() => undefined),

  /** Who can reach this console. Readable without a code, because a list nobody checks is not a control. */
  admins: (): Promise<PlatformAdmin[]> =>
    apiClient.get<PlatformAdmin[]>('/admin/admins').then(r => r.data),
  removeAdmin: (userId: string, otp: string): Promise<void> =>
    apiClient
      .post(`/admin/admins/${userId}/remove`, {}, { headers: { 'X-Admin-OTP': otp } })
      .then(() => undefined),

  /** The door into the team's own operating system. */
  opsDoor: (): Promise<OpsDoorState> => apiClient.get<OpsDoorState>('/admin/ops').then(r => r.data),
  setUpOps: (): Promise<OpsDoorState> => apiClient.post<OpsDoorState>('/admin/ops/setup').then(r => r.data),
  linkOpsAccount: (personKey: string, email: string): Promise<OpsDoorState> =>
    apiClient.post<OpsDoorState>(`/admin/ops/${personKey}/account`, { email }).then(r => r.data),
  unlinkOpsAccount: (personKey: string, email?: string): Promise<OpsDoorState> =>
    apiClient.post<OpsDoorState>(`/admin/ops/${personKey}/account/remove`, email ? { email } : undefined).then(r => r.data),
}

// ── OTP Challenge Modal ───────────────────────────────────────────────────────

interface OtpModalProps {
  title: string
  description: string
  onConfirm: (otp: string) => Promise<void>
  onClose: () => void
  /** Only when onConfirm resolved. onClose fires on Cancel too, and callers were clearing their form in it. */
  onSuccess?: () => void
}

function OtpModal({ title, description, onConfirm, onClose, onSuccess }: OtpModalProps) {
  const [step, setStep] = useState<'request' | 'enter'>('request')
  const [otp, setOtp] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  /* A dialog is a room you can leave: focus moves in on open, Escape closes, and focus goes back to the
     button that opened it - it used to drop to the top of the document after a code disable. */
  const opener = useRef<HTMLElement | null>(null)
  const first = useRef<HTMLButtonElement | null>(null)
  useEffect(() => {
    opener.current = document.activeElement as HTMLElement | null
    first.current?.focus()
    return () => { opener.current?.focus?.() }
  }, [])

  async function handleRequestOtp() {
    setLoading(true)
    setError('')
    try {
      await adminApi.requestOtp()
      setStep('enter')
    } catch (e: any) {
      setError(e.message ?? 'Could not send the code - try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleConfirm() {
    if (!otp.trim()) { setError('Enter the 6-digit code'); return }
    setLoading(true)
    setError('')
    try {
      await onConfirm(otp.trim())
      onSuccess?.()
      onClose()
    } catch (e: any) {
      setError(e.message ?? 'Action failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      role="dialog" aria-modal="true" aria-label={title}
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      onKeyDown={e => { if (e.key === 'Escape' && !loading) onClose() }}
    >
      <div style={{ background: 'white', borderRadius: 10, padding: '24px 24px 20px', maxWidth: 400, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--gw-navy)', marginBottom: 6 }}>{title}</div>
        <div style={{ fontSize: 13, color: 'var(--gw-sub)', lineHeight: 1.6, marginBottom: 20 }}>{description}</div>

        {step === 'request' ? (
          <>
            <div style={{ fontSize: 13, color: 'var(--gw-text)', marginBottom: 16 }}>
              A 6-digit verification code will be sent to your email address.
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                ref={first}
                onClick={handleRequestOtp}
                disabled={loading}
                style={{ flex: 1, padding: '10px 0', borderRadius: 7, background: 'var(--gw-navy)', color: 'white', fontSize: 13, fontWeight: 700, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, fontFamily: 'inherit' }}
              >
                {loading ? 'Sending…' : 'Send code'}
              </button>
              <button
                onClick={onClose}
                style={{ padding: '10px 16px', borderRadius: 7, background: 'var(--gw-bg)', color: 'var(--gw-text)', fontSize: 13, border: '1px solid var(--gw-border)', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Cancel
              </button>
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--gw-muted)', marginBottom: 6 }}>
              Enter the 6-digit code sent to your email
            </div>
            <input
              value={otp}
              onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              maxLength={6}
              autoFocus
              style={{ width: '100%', padding: '10px 12px', borderRadius: 7, border: '1px solid var(--gw-border)', fontSize: 20, letterSpacing: '.2em', fontFamily: 'monospace', textAlign: 'center', boxSizing: 'border-box', marginBottom: 14, outline: 'none' }}
              onFocus={e => { e.target.style.borderColor = 'var(--gw-navy)' }}
              onBlur={e => { e.target.style.borderColor = 'var(--gw-border)' }}
              onKeyDown={e => { if (e.key === 'Enter') handleConfirm() }}
            />
            {error && <div style={{ fontSize: 12, color: 'var(--gw-danger)', marginBottom: 10 }}>{error}</div>}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={handleConfirm}
                disabled={loading || otp.length < 6}
                style={{ flex: 1, padding: '10px 0', borderRadius: 7, background: 'var(--gw-danger)', color: 'white', fontSize: 13, fontWeight: 700, border: 'none', cursor: (loading || otp.length < 6) ? 'not-allowed' : 'pointer', opacity: (loading || otp.length < 6) ? 0.7 : 1, fontFamily: 'inherit' }}
              >
                {loading ? 'Confirming…' : 'Confirm'}
              </button>
              <button
                onClick={onClose}
                style={{ padding: '10px 16px', borderRadius: 7, background: 'var(--gw-bg)', color: 'var(--gw-text)', fontSize: 13, border: '1px solid var(--gw-border)', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Cancel
              </button>
            </div>
          </>
        )}

        {step === 'request' && error && <div style={{ fontSize: 12, color: 'var(--gw-danger)', marginTop: 10 }}>{error}</div>}
      </div>
    </div>
  )
}

// ── Overview section ──────────────────────────────────────────────────────────

function OverviewSection({ overview }: { overview: AdminOverview }) {
  return (
    <section>
      <div style={SL}>Overview</div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <Stat val={overview.totalOrgs} label="Total orgs" />
        <Stat val={overview.totalGrounds} label="Total check-ins" />
        <Stat val={overview.totalCodes} label="Access codes" accent />
        <Stat val={overview.totalRedemptions} label="Redemptions" />
        {overview.totalSubscribedOrgs !== undefined && (
          <Stat val={overview.totalSubscribedOrgs} label="Subscribed orgs" accent />
        )}
        {overview.totalSessionsBalance !== undefined && (
          <Stat val={overview.totalSessionsBalance} label="Sessions in balance" />
        )}
      </div>
    </section>
  )
}

// ── Code Management section ───────────────────────────────────────────────────

function daysLeft(expiresAt: string | null): string {
  if (!expiresAt) return '∞'
  const diff = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000)
  if (diff < 0) return 'Expired'
  return String(diff)
}

function CodeManagementSection({ codes, onDisable }: { codes: AdminCode[]; onDisable: (id: string) => void }) {
  const [search, setSearch] = useState('')
  const filtered = codes.filter(c =>
    !search || c.code.toLowerCase().includes(search.toLowerCase()) || c.creatorEmail.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <section>
      <div style={SL}>Access codes</div>
      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Filter by code or creator…"
        style={{ width: '100%', padding: '8px 12px', borderRadius: 7, border: '1px solid var(--gw-border)', fontSize: 13, fontFamily: 'inherit', background: 'white', marginBottom: 10, boxSizing: 'border-box' }}
      />
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--gw-border)' }}>
              {['Code', 'Creator', 'Created', 'Expires', 'Days left', 'Status', 'Can create codes', 'Redemptions', 'Actions'].map(h => (
                <th key={h} style={{ fontSize: 10, fontWeight: 700, color: 'var(--gw-muted)', textAlign: 'left', padding: '6px 10px', textTransform: 'uppercase', letterSpacing: '.06em', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => {
              const dl = daysLeft(c.expiresAt)
              const expired = dl === 'Expired'
              return (
                <tr key={c.id} style={{ borderBottom: '1px solid var(--gw-border)', background: !c.active ? 'rgba(0,0,0,0.02)' : 'white' }}>
                  <td style={{ padding: '8px 10px', fontWeight: 700, color: 'var(--gw-navy)', fontFamily: 'monospace', fontSize: 13 }}>{c.code}</td>
                  <td style={{ padding: '8px 10px', color: 'var(--gw-text)' }}>{c.creatorEmail}</td>
                  <td style={{ padding: '8px 10px', color: 'var(--gw-sub)', whiteSpace: 'nowrap' }}>{whenItWas(c.createdAt, 'day')}</td>
                  <td style={{ padding: '8px 10px', color: 'var(--gw-sub)', whiteSpace: 'nowrap' }}>{c.expiresAt ? whenItWas(c.expiresAt, 'day') : '-'}</td>
                  <td style={{ padding: '8px 10px', fontWeight: 600, color: expired ? 'var(--gw-danger)' : dl === '∞' ? 'var(--gw-muted)' : Number(dl) <= 7 ? 'var(--gw-amber-b)' : 'var(--gw-text)' }}>{dl}</td>
                  <td style={{ padding: '8px 10px' }}>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: c.active ? 'var(--gw-green-bg)' : 'var(--gw-bg)', color: c.active ? 'var(--gw-green-t)' : 'var(--gw-muted)', border: '1px solid var(--gw-border)' }}>
                      {c.active ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td style={{ padding: '8px 10px' }}>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: c.allowCodeCreation ? '#EEF3FB' : 'var(--gw-bg)', color: c.allowCodeCreation ? 'var(--gw-navy)' : 'var(--gw-muted)', border: '1px solid var(--gw-border)' }}>
                      {c.allowCodeCreation ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td style={{ padding: '8px 10px', fontWeight: 600, color: 'var(--gw-navy)', textAlign: 'right' }}>{c.redemptionCount}</td>
                  <td style={{ padding: '8px 10px' }}>
                    {c.active && (
                      <button
                        onClick={() => onDisable(c.id)}
                        style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 5, background: '#fff0f0', color: 'var(--gw-danger)', border: '1px solid #f5c6cb', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}
                      >
                        Disable
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} style={{ padding: '24px 10px', textAlign: 'center', color: 'var(--gw-muted)', fontSize: 13 }}>No codes found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}

// ── Usage Breakdown section ───────────────────────────────────────────────────

function UsageBreakdownSection({ breakdown }: { breakdown: FreeReasonBreakdown }) {
  const entries: { label: string; key: keyof FreeReasonBreakdown; color: string }[] = [
    { label: 'Free tier', key: 'FREE_TIER', color: 'var(--gw-green-b)' },
    { label: 'First check-in (legacy)', key: 'FIRST_GROUND', color: '#A8DDD0' },
    { label: 'Access code', key: 'ACCESS_CODE', color: 'var(--gw-navy)' },
    { label: 'Paid', key: 'paid', color: 'var(--gw-amber-b)' },
  ]
  const total = Object.values(breakdown).reduce((a, b) => a + b, 0)

  return (
    <section>
      <div style={SL}>Where check-ins came from</div>
      <div style={{ ...C, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {entries.map(({ label, key, color }) => {
          const count = breakdown[key]
          const pct = total > 0 ? (count / total) * 100 : 0
          return (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {/* Not minWidth 160 on a plain flex row outside any scroll container: it produced horizontal page scroll. */}
              <div style={{ fontSize: 12, color: 'var(--gw-text)', flex: '0 1 160px', minWidth: 0 }}>{label}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gw-navy)', minWidth: 28, textAlign: 'right', flexShrink: 0 }}>{count}</div>
              <Bar pct={pct} color={color} />
              <div style={{ fontSize: 11, color: 'var(--gw-muted)', minWidth: 36, textAlign: 'right', flexShrink: 0 }}>{pct.toFixed(0)}%</div>
            </div>
          )
        })}
        <div style={{ borderTop: '1px solid var(--gw-border)', paddingTop: 8, display: 'flex', justifyContent: 'space-between' }}>
          {/* These are ground-creation reasons, so the sum is check-ins created - not sessions. */}
          <span style={{ fontSize: 12, color: 'var(--gw-muted)' }}>Check-ins created</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--gw-navy)' }}>{total}</span>
        </div>
      </div>
    </section>
  )
}

// ── Feedback section ──────────────────────────────────────────────────────────

/**
 * IS THE DETECTION ANY GOOD?
 *
 * Admins have been rating pattern detections for accuracy all along, and the
 * endpoint that summarises those ratings was never called - so the ratings went
 * into a table nobody read. A code that fires often and rates badly is a prompt
 * that needs work, and this is the only place that becomes visible.
 *
 * Internal, and it stays internal: the summary aggregates across every org, so
 * it lives on the platform dashboard and must never reach a customer surface.
 * Sorted worst-first, because the bad ones are the reason to look.
 */
function DetectionAccuracySection() {
  const { data = [], isLoading } = useQuery({
    queryKey: ['pattern-accuracy'],
    queryFn: patternAccuracyApi.summary,
    staleTime: 5 * 60 * 1000,
  })

  // Unrated codes last: "no rating yet" is not a bad score, it is no score.
  const rows = [...data].sort((a, b) => {
    if (a.accuracyRate == null && b.accuracyRate == null) return b.surfaced - a.surfaced
    if (a.accuracyRate == null) return 1
    if (b.accuracyRate == null) return -1
    return a.accuracyRate - b.accuracyRate
  })

  return (
    <section>
      <div style={SL}>Detection accuracy{rows.length > 0 ? ` (${rows.length} codes)` : ''}</div>
      {isLoading ? (
        <div style={{ ...C, fontSize: 13, color: 'var(--gw-muted)', textAlign: 'center', padding: 24 }}>Loading…</div>
      ) : rows.length === 0 ? (
        <div style={{ ...C, fontSize: 13, color: 'var(--gw-muted)', textAlign: 'center', padding: 24 }}>
          No detections have been surfaced yet.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {rows.map(r => {
            const pct = r.accuracyRate == null ? null : Math.round(r.accuracyRate * 100)
            return (
              <div key={r.code} style={{ ...C, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 12, fontFamily: 'ui-monospace, monospace', color: 'var(--gw-text)' }}>{r.code}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 10, whiteSpace: 'nowrap' }}>
                  <span style={{ fontSize: 11, color: 'var(--gw-muted)' }}>
                    surfaced {r.surfaced} · rated {r.rated}
                  </span>
                  {pct == null ? (
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: 'var(--gw-border)', color: 'var(--gw-muted)' }}>
                      Not rated yet
                    </span>
                  ) : (
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20,
                      background: pct >= 75 ? 'var(--gw-green-bg)' : pct >= 50 ? 'var(--gw-amber-bg)' : 'var(--gw-clay-bg)',
                      color: pct >= 75 ? 'var(--gw-green-t)' : pct >= 50 ? 'var(--gw-amber-t)' : 'var(--gw-red-t)',
                    }}>
                      {pct}% accurate
                    </span>
                  )}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

function FeedbackSection({ feedback }: { feedback: AdminFeedback[] }) {
  function timeAgo(date: string): string {
    const ms = Date.now() - new Date(date).getTime()
    const mins = Math.floor(ms / 60000)
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  }

  return (
    <section>
      <div style={SL}>Feedback ({feedback.length})</div>
      {feedback.length === 0 ? (
        <div style={{ ...C, fontSize: 13, color: 'var(--gw-muted)', textAlign: 'center', padding: 24 }}>No feedback yet.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {feedback.map(f => (
            <div key={f.id} style={{ ...C, borderLeft: `3px solid ${f.feltFair === true ? 'var(--gw-green-b)' : f.feltFair === false ? 'var(--gw-amber-b)' : 'var(--gw-border)'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: f.note ? 5 : 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  {f.feltFair != null && (
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20,
                      background: f.feltFair ? 'var(--gw-green-bg)' : 'var(--gw-amber-bg)',
                      color: f.feltFair ? 'var(--gw-green-t)' : 'var(--gw-amber-t)',
                    }}>
                      {f.feltFair ? 'Felt fair' : 'Did not feel fair'}
                    </span>
                  )}
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
      )}
    </section>
  )
}

// ── Admin Management section ──────────────────────────────────────────────────

/**
 * WHO CAN REACH THIS CONSOLE.
 *
 * There was a way to add somebody and no way to see the list, so "platform ops
 * is only the people I added" was a belief rather than something anybody could
 * check. There are two ways onto this list and no more: the one-time bootstrap
 * variable, which only fires while no admin exists at all, and the form below —
 * platform admin plus an emailed code. Nothing else in the codebase writes the
 * flag.
 */
function AdminManagementSection({
  onAdd,
  onRemove,
}: {
  onAdd: (email: string, otp: string) => Promise<void>
  onRemove: (userId: string, otp: string) => Promise<void>
}) {
  const [email, setEmail] = useState('')
  const [showOtp, setShowOtp] = useState(false)
  const [removing, setRemoving] = useState<PlatformAdmin | null>(null)
  const admins = useQuery({ queryKey: ['platform-admins'], queryFn: adminApi.admins })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setShowOtp(true)
  }

  return (
    <section>
      <div style={SL}>Who can reach this console</div>
      <div style={C}>
        <div style={{ fontSize: 13, color: 'var(--gw-sub)', marginBottom: 14 }}>
          Two ways onto this list and no more: the one-time bootstrap on a brand new install, and
          this form. Everyone on it sees every organisation, every usage figure and the pricing.
        </div>

        {admins.isError && (
          <div style={{ fontSize: 13, color: 'var(--gw-red-t)', marginBottom: 12 }}>
            Could not load the list.
          </div>
        )}

        {(admins.data ?? []).map(a => (
          <div
            key={a.id}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '8px 0', borderTop: '1px solid var(--gw-border)' }}
          >
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{a.email}</div>
              <div style={{ fontSize: 11.5, color: 'var(--gw-sub)' }}>
                {[a.firstName, a.lastName].filter(Boolean).join(' ') || 'no name on the account'}
              </div>
            </div>
            <button
              onClick={() => setRemoving(a)}
              style={{ fontSize: 12, padding: '6px 12px', borderRadius: 6, background: 'white', border: '1px solid var(--gw-border)', color: 'var(--gw-sub)', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Take off
            </button>
          </div>
        ))}

        {admins.data?.length === 0 && (
          <div style={{ fontSize: 13, color: 'var(--gw-sub)', padding: '8px 0' }}>
            Nobody - which should be impossible, since you are reading this.
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 14 }}>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="them@example.com"
            required
            style={{ flex: 1, padding: '9px 12px', borderRadius: 7, border: '1px solid var(--gw-border)', fontSize: 13, fontFamily: 'inherit', background: 'white', outline: 'none' }}
            onFocus={e => { e.target.style.borderColor = 'var(--gw-navy)' }}
            onBlur={e => { e.target.style.borderColor = 'var(--gw-border)' }}
          />
          <button
            type="submit"
            style={{ padding: '9px 18px', borderRadius: 7, background: 'var(--gw-navy)', color: 'white', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}
          >
            Add them
          </button>
        </form>
        <div style={{ fontSize: 11.5, color: 'var(--gw-sub)', marginTop: 8 }}>
          They have to have a Groundwork account already - this promotes one, it does not create one.
        </div>
      </div>

      {showOtp && (
        <OtpModal
          title="Add platform admin"
          description={`${email} will see every organisation, every usage figure and the pricing. You can take them off again here.`}
          onConfirm={otp => onAdd(email, otp)}
          /* The address is cleared when the promotion happened, not when the modal closed for any reason. */
          onSuccess={() => setEmail('')}
          onClose={() => { setShowOtp(false); admins.refetch() }}
        />
      )}

      {removing && (
        <OtpModal
          title="Take them off the list"
          description={`${removing.email} will lose the platform console. Their Groundwork account and their own organisation are untouched.`}
          onConfirm={otp => onRemove(removing.id, otp)}
          onClose={() => { setRemoving(null); admins.refetch() }}
        />
      )}
    </section>
  )
}

/**
 * THE DOOR INTO THE TEAM'S OWN OPERATING SYSTEM.
 *
 * Every route under `/ops` needs an OpsPerson behind the signed-in account, and
 * the only place to create or link one is itself inside `/ops`. So the first
 * person could never get in, and the back office answered "This is not your
 * system" to the person who owns it.
 *
 * This is the way in, and it is the only place it can be: a surface guarded by
 * the platform-admin list, which is a stronger gate than the one it opens.
 */
/**
 * ZERO-ROW DETECTION, WHERE IT WILL BE SEEN.
 * Three subsystems were wired and never fired for the life of the codebase, found by reading. Every
 * writer that should fill a table: rows, last write, when the table shipped. Zero since it shipped
 * is flagged and sorted to the top.
 */
function WritersSection() {
  const { data, isLoading, error } = useQuery({ queryKey: ['admin-writers'], queryFn: adminApi.writers, staleTime: 60 * 1000 })
  /* A health check that renders nothing on failure reads as a clean bill of health. Say which it is. */
  if (isLoading) return <div style={{ ...C, marginTop: 16, fontSize: 12, color: 'var(--gw-sub)' }}>Reading the writers...</div>
  if (error || !data) return <div style={{ ...C, marginTop: 16, fontSize: 12, color: 'var(--gw-sub)' }}>The writers check could not run. Reload to try it again.</div>
  const rows = [...data.rows].sort((a, b) => Number(b.flagged) - Number(a.flagged) || a.table.localeCompare(b.table))
  return (
    <div style={{ ...C, marginTop: 16 }}>
      <div style={SL}>Writers · {data.flaggedCount} at zero</div>
      <div style={{ fontSize: 12, color: 'var(--gw-sub)', marginBottom: 10, lineHeight: 1.5 }}>
        Every table a writer should fill in normal operation. A zero means nothing has reached it
        yet - which is a fault where the writer runs on our own machinery, and simply news where it
        waits on a customer or on a check-in ending. What each one waits for is in the last column.
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ textAlign: 'left', color: 'var(--gw-muted)' }}>
              <th style={{ padding: '4px 6px' }}>Table</th><th style={{ padding: '4px 6px' }}>Written by</th><th style={{ padding: '4px 6px', textAlign: 'right' }}>Rows</th><th style={{ padding: '4px 6px' }}>Last write</th><th style={{ padding: '4px 6px' }}>Shipped</th><th style={{ padding: '4px 6px' }}>Waits for</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.table} style={{ borderTop: '1px solid var(--gw-border)', background: r.flagged ? 'var(--gw-amber-bg)' : undefined }}>
                <td style={{ padding: '5px 6px', fontFamily: 'ui-monospace, Menlo, monospace', color: r.flagged ? 'var(--gw-amber-t)' : 'var(--gw-text)' }}>{r.table}</td>
                <td style={{ padding: '5px 6px', color: 'var(--gw-sub)' }}>{r.writer}{r.error ? ` · ${r.error}` : ''}</td>
                <td style={{ padding: '5px 6px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: r.flagged ? 700 : 400 }}>{r.count ?? '?'}</td>
                <td style={{ padding: '5px 6px', color: 'var(--gw-sub)' }}>{r.lastWrite ? whenItWas(r.lastWrite, 'day') : r.flagged ? 'never' : ''}</td>
                <td style={{ padding: '5px 6px', color: 'var(--gw-muted)' }}>{r.shippedAt ?? ''}</td>
                <td style={{ padding: '5px 6px', color: 'var(--gw-muted)', maxWidth: 280 }}>{r.needs ?? (r.flagged ? 'nothing named - worth a look' : '')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function OpsAccessSection() {
  const door = useQuery({ queryKey: ['ops-door'], queryFn: adminApi.opsDoor })
  const [linking, setLinking] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState('')

  async function run(work: () => Promise<unknown>) {
    setBusy(true)
    setProblem('')
    try {
      await work()
      await door.refetch()
      setLinking(null)
      setEmail('')
    } catch (e: any) {
      setProblem(e?.response?.data?.message ?? e?.message ?? 'That did not work.')
    } finally {
      setBusy(false)
    }
  }

  const state = door.data

  return (
    <section>
      <div style={SL}>The team's operating system</div>
      <div style={C}>
        <div style={{ fontSize: 13, color: 'var(--gw-sub)', marginBottom: 12 }}>
          Targets, the pipeline, commitments, spend, the moat. Everybody on the platform-admin list
          above is on this team - your account is admitted the first time you open it. Connect the
          rest of the team below.
        </div>

        {state?.isSetUp && (
          <a
            href="/ops"
            style={{ display: 'inline-block', fontSize: 13, fontWeight: 700, color: 'var(--gw-navy)', textDecoration: 'none', marginBottom: 14 }}
          >
            Open the operating system →
          </a>
        )}

        {state && !state.isSetUp && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 13, marginBottom: 10 }}>
              It has not been set up here yet. This writes the periods, the workstreams and the six
              people, and is safe to run twice.
            </div>
            <button
              onClick={() => run(adminApi.setUpOps)}
              disabled={busy}
              style={{ padding: '9px 16px', borderRadius: 7, background: 'var(--gw-navy)', color: 'white', fontSize: 13, fontWeight: 700, border: 'none', cursor: busy ? 'wait' : 'pointer', fontFamily: 'inherit' }}
            >
              Set it up
            </button>
          </div>
        )}

        {/* The state this whole section exists for: it is set up and nobody's
            account opens it, so /ops turns everybody away including its owner. */}
        {state?.nobodyCanOpenIt && state.isSetUp && (
          /* Not an alarm any more: yours opens it whether or not it is listed
             here, because you are on the platform-admin list. It still says so,
             because a team where nobody but the admins can get in is worth
             seeing. */
          <div style={{ fontSize: 13, color: 'var(--gw-sub)', marginBottom: 12 }}>
            Nobody on the team has an account connected yet. Yours opens it regardless.
          </div>
        )}

        {(state?.people ?? []).map(p => (
          <div key={p.key} style={{ padding: '9px 0', borderTop: '1px solid var(--gw-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>
                  {p.displayName}
                  {!p.active && <span style={{ fontWeight: 400, color: 'var(--gw-sub)' }}> · not active</span>}
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--gw-sub)' }}>
                  {p.functionalRole.replace(/_/g, ' ').toLowerCase()}
                  {!p.linkedAccount && ' · no account connected'}
                </div>
                {/* ONE PERSON, SEVERAL ADDRESSES. Each one is its own way in and comes off on its own. */}
                {[p.linkedAccount, ...(p.otherAccounts ?? [])].filter((a): a is string => !!a).map(a => (
                  <div key={a} style={{ fontSize: 11.5, color: 'var(--gw-sub)', display: 'flex', gap: 8, alignItems: 'baseline' }}>
                    <span>{a}</span>
                    <button
                      onClick={() => run(() => adminApi.unlinkOpsAccount(p.key, a))}
                      disabled={busy}
                      style={{ fontSize: 11, color: 'var(--gw-muted)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}
                    >
                      disconnect
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setLinking(p.key)}
                disabled={busy}
                style={{ fontSize: 12, padding: '6px 12px', borderRadius: 6, background: 'white', border: '1px solid var(--gw-border)', color: 'var(--gw-sub)', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                {p.linkedAccount ? 'Connect another' : 'Connect an account'}
              </button>
            </div>

            {linking === p.key && (
              <form
                onSubmit={e => {
                  e.preventDefault()
                  run(() => adminApi.linkOpsAccount(p.key, email))
                }}
                style={{ display: 'flex', gap: 8, marginTop: 8 }}
              >
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="the Groundwork account they sign in with"
                  required
                  autoFocus
                  style={{ flex: 1, padding: '8px 11px', borderRadius: 7, border: '1px solid var(--gw-border)', fontSize: 13, fontFamily: 'inherit', background: 'white', outline: 'none' }}
                />
                <button
                  type="submit"
                  disabled={busy}
                  style={{ padding: '8px 16px', borderRadius: 7, background: 'var(--gw-navy)', color: 'white', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  Connect
                </button>
              </form>
            )}
          </div>
        ))}

        {problem && (
          <div style={{ fontSize: 13, color: 'var(--gw-red-t)', marginTop: 12 }}>{problem}</div>
        )}
      </div>
    </section>
  )
}

// ── Per-user Usage section ────────────────────────────────────────────────────

function UserUsageSection({ users }: { users: UserUsage[] }) {
  const [search, setSearch] = useState('')
  const filtered = users.filter(u => !search || u.email.toLowerCase().includes(search.toLowerCase()))
  const sorted = [...filtered].sort((a, b) => b.groundCount - a.groundCount)

  function timeAgo(date: string | null): string {
    if (!date) return 'never'
    const ms = Date.now() - new Date(date).getTime()
    const mins = Math.floor(ms / 60000)
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  }

  return (
    <section>
      <div style={SL}>What each person has done</div>
      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Filter by email…"
        style={{ width: '100%', padding: '8px 12px', borderRadius: 7, border: '1px solid var(--gw-border)', fontSize: 13, fontFamily: 'inherit', background: 'white', marginBottom: 10, boxSizing: 'border-box' }}
      />
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--gw-border)' }}>
              {['User', 'Check-ins', 'Codes created', 'Code redemptions', 'Last active'].map(h => (
                <th key={h} style={{ fontSize: 10, fontWeight: 700, color: 'var(--gw-muted)', textAlign: 'left', padding: '6px 10px', textTransform: 'uppercase', letterSpacing: '.06em', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map(u => (
              <tr key={u.userId} style={{ borderBottom: '1px solid var(--gw-border)' }}>
                <td style={{ padding: '8px 10px', color: 'var(--gw-text)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</td>
                <td style={{ padding: '8px 10px', fontWeight: 600, color: 'var(--gw-navy)', textAlign: 'right' }}>{u.groundCount}</td>
                <td style={{ padding: '8px 10px', fontWeight: 600, color: 'var(--gw-navy)', textAlign: 'right' }}>{u.codeCount}</td>
                <td style={{ padding: '8px 10px', fontWeight: 600, color: 'var(--gw-navy)', textAlign: 'right' }}>{u.redemptionCount}</td>
                <td style={{ padding: '8px 10px', color: 'var(--gw-muted)', whiteSpace: 'nowrap' }}>{timeAgo(u.lastActive)}</td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: '24px 10px', textAlign: 'center', color: 'var(--gw-muted)', fontSize: 13 }}>No users found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function AdminDashboardPage() {
  const navigate = useNavigate()
  const user = useAuthStore(s => s.user)

  const [disablingCodeId, setDisablingCodeId] = useState<string | null>(null)
  const [_showAddAdmin, _setShowAddAdmin] = useState(false)

  const { data, isLoading, error, refetch } = useQuery<AdminDashboardData>({
    queryKey: ['admin-dashboard'],
    queryFn: adminApi.dashboard,
    enabled: !!user?.isPlatformAdmin,
    staleTime: 2 * 60 * 1000,
  })

  if (!user?.isPlatformAdmin) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--gw-page)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: 13, color: 'var(--gw-muted)' }}>Platform admin access required.</div>
      </div>
    )
  }

  async function handleDisableCode(otp: string) {
    if (!disablingCodeId) return
    await adminApi.disableCode(disablingCodeId, otp)
    await refetch()
  }

  async function handleAddAdmin(email: string, otp: string) {
    await adminApi.addAdmin(email, otp)
  }

  async function handleRemoveAdmin(userId: string, otp: string) {
    await adminApi.removeAdmin(userId, otp)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--gw-page)' }}>

      {/* Nav */}
      <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'var(--gw-bg)', borderBottom: '1px solid var(--gw-border)' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--gw-navy)', letterSpacing: '-.01em' }}>Admin Dashboard</div>
            <div style={{ fontSize: 11, color: 'var(--gw-muted)', marginTop: 1 }}>Codes · Billing · Users · Feedback</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => navigate('/admin')}
              style={{ fontSize: 12, padding: '7px 14px', borderRadius: 6, background: 'white', border: '1px solid var(--gw-border)', color: 'var(--gw-text)', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Platform console →
            </button>
            <button
              onClick={() => navigate('/ops')}
              style={{ fontSize: 12, padding: '7px 14px', borderRadius: 6, background: 'white', border: '1px solid var(--gw-border)', color: 'var(--gw-text)', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Our own system →
            </button>
            {/* Access to the API is granted here rather than bought. Our own
                organisation appears on that list like anybody else's. */}
            <button
              onClick={() => navigate('/admin/api-access')}
              style={{ fontSize: 12, padding: '7px 14px', borderRadius: 6, background: 'white', border: '1px solid var(--gw-border)', color: 'var(--gw-text)', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              API access →
            </button>
            <button
              onClick={() => navigate('/grounds')}
              style={{ fontSize: 12, color: 'var(--gw-muted)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              ← App
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', width: '100%', padding: '24px 16px 80px', display: 'flex', flexDirection: 'column', gap: 36 }}>

        {isLoading && (
          <div style={{ fontSize: 13, color: 'var(--gw-muted)', padding: 32, textAlign: 'center' }}>Loading…</div>
        )}

        {error && (
          <div style={{ ...C, borderLeft: '3px solid var(--gw-danger)', fontSize: 13, color: 'var(--gw-danger)' }}>
            {(error as Error).message ?? 'Could not load the dashboard - try again.'}
          </div>
        )}

        {data && (
          <>
            <OverviewSection overview={data.overview} />

            <CodeManagementSection
              codes={data.codes}
              onDisable={id => setDisablingCodeId(id)}
            />

            <WritersSection />

            <UsageBreakdownSection breakdown={data.freeReasonBreakdown} />

            <FeedbackSection feedback={data.feedback} />

            <DetectionAccuracySection />

            <OpsAccessSection />

            <AdminManagementSection onAdd={handleAddAdmin} onRemove={handleRemoveAdmin} />

            <UserUsageSection users={data.userUsage} />
          </>
        )}
      </div>

      {/* OTP modal for disabling a code */}
      {disablingCodeId && (
        <OtpModal
          title="Disable access code"
          description="This will immediately prevent new redemptions. Existing redeemed sessions are unaffected. An OTP challenge is required."
          onConfirm={handleDisableCode}
          onClose={() => setDisablingCodeId(null)}
        />
      )}
    </div>
  )
}
