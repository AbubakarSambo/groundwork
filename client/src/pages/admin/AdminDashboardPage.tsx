import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth'

// ── Design tokens (mirrors AdminPage) ────────────────────────────────────────

const C: React.CSSProperties = { background: 'white', border: '0.5px solid var(--gw-border)', borderRadius: 8, padding: '10px 14px' }
const SL: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: 'var(--gw-muted)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 10 }

function Stat({ val, label, accent }: { val: string | number; label: string; accent?: boolean }) {
  return (
    <div style={{ ...C, flex: 1, minWidth: 100 }}>
      <div style={{ fontSize: 22, fontWeight: 800, color: accent ? '#0C447C' : 'var(--gw-navy)' }}>{val}</div>
      <div style={{ fontSize: 11, color: 'var(--gw-sub)', marginTop: 3 }}>{label}</div>
    </div>
  )
}

function Bar({ pct, color = '#0C447C' }: { pct: number; color?: string }) {
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

interface AdminDashboardData {
  overview: AdminOverview
  codes: AdminCode[]
  freeReasonBreakdown: FreeReasonBreakdown
  feedback: AdminFeedback[]
  userUsage: UserUsage[]
}

// ── API helpers ───────────────────────────────────────────────────────────────

async function apiFetch(path: string, opts?: RequestInit) {
  const token = useAuthStore.getState().token
  const res = await fetch(`/api${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts?.headers ?? {}),
    },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body?.message ?? `HTTP ${res.status}`)
  }
  return res.json()
}

const adminApi = {
  dashboard: (): Promise<AdminDashboardData> => apiFetch('/admin/dashboard'),
  requestOtp: (): Promise<void> => apiFetch('/admin/otp/request', { method: 'POST' }),
  disableCode: (codeId: string, otp: string): Promise<void> =>
    apiFetch(`/admin/codes/${codeId}/disable`, {
      method: 'POST',
      headers: { 'X-Admin-OTP': otp },
    }),
  addAdmin: (email: string, otp: string): Promise<void> =>
    apiFetch('/admin/admins', {
      method: 'POST',
      body: JSON.stringify({ email }),
      headers: { 'X-Admin-OTP': otp },
    }),
}

// ── OTP Challenge Modal ───────────────────────────────────────────────────────

interface OtpModalProps {
  title: string
  description: string
  onConfirm: (otp: string) => Promise<void>
  onClose: () => void
}

function OtpModal({ title, description, onConfirm, onClose }: OtpModalProps) {
  const [step, setStep] = useState<'request' | 'enter'>('request')
  const [otp, setOtp] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleRequestOtp() {
    setLoading(true)
    setError('')
    try {
      await adminApi.requestOtp()
      setStep('enter')
    } catch (e: any) {
      setError(e.message ?? 'Failed to send OTP')
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
      onClose()
    } catch (e: any) {
      setError(e.message ?? 'Action failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
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
                onClick={handleRequestOtp}
                disabled={loading}
                style={{ flex: 1, padding: '10px 0', borderRadius: 7, background: 'var(--gw-navy)', color: 'white', fontSize: 13, fontWeight: 700, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, fontFamily: 'inherit' }}
              >
                {loading ? 'Sending…' : 'Send code'}
              </button>
              <button
                onClick={onClose}
                style={{ padding: '10px 16px', borderRadius: 7, background: 'var(--gw-bg)', color: 'var(--gw-text)', fontSize: 13, border: '0.5px solid var(--gw-border)', cursor: 'pointer', fontFamily: 'inherit' }}
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
              onFocus={e => { e.target.style.borderColor = '#0C447C' }}
              onBlur={e => { e.target.style.borderColor = 'var(--gw-border)' }}
              onKeyDown={e => { if (e.key === 'Enter') handleConfirm() }}
            />
            {error && <div style={{ fontSize: 12, color: '#c0392b', marginBottom: 10 }}>{error}</div>}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={handleConfirm}
                disabled={loading || otp.length < 6}
                style={{ flex: 1, padding: '10px 0', borderRadius: 7, background: '#c0392b', color: 'white', fontSize: 13, fontWeight: 700, border: 'none', cursor: (loading || otp.length < 6) ? 'not-allowed' : 'pointer', opacity: (loading || otp.length < 6) ? 0.7 : 1, fontFamily: 'inherit' }}
              >
                {loading ? 'Confirming…' : 'Confirm'}
              </button>
              <button
                onClick={onClose}
                style={{ padding: '10px 16px', borderRadius: 7, background: 'var(--gw-bg)', color: 'var(--gw-text)', fontSize: 13, border: '0.5px solid var(--gw-border)', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Cancel
              </button>
            </div>
          </>
        )}

        {step === 'request' && error && <div style={{ fontSize: 12, color: '#c0392b', marginTop: 10 }}>{error}</div>}
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
        <Stat val={overview.totalGrounds} label="Total grounds" />
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
      <div style={SL}>Code Management</div>
      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Filter by code or creator…"
        style={{ width: '100%', padding: '8px 12px', borderRadius: 7, border: '0.5px solid var(--gw-border)', fontSize: 13, fontFamily: 'inherit', background: 'white', marginBottom: 10, boxSizing: 'border-box' }}
      />
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--gw-border)' }}>
              {['Code', 'Creator', 'Created', 'Expires', 'Days Left', 'Status', 'Allow Create', 'Redemptions', 'Actions'].map(h => (
                <th key={h} style={{ fontSize: 10, fontWeight: 700, color: 'var(--gw-muted)', textAlign: 'left', padding: '6px 10px', textTransform: 'uppercase', letterSpacing: '.06em', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => {
              const dl = daysLeft(c.expiresAt)
              const expired = dl === 'Expired'
              return (
                <tr key={c.id} style={{ borderBottom: '0.5px solid var(--gw-border)', background: !c.active ? 'rgba(0,0,0,0.02)' : 'white' }}>
                  <td style={{ padding: '8px 10px', fontWeight: 700, color: 'var(--gw-navy)', fontFamily: 'monospace', fontSize: 13 }}>{c.code}</td>
                  <td style={{ padding: '8px 10px', color: 'var(--gw-text)' }}>{c.creatorEmail}</td>
                  <td style={{ padding: '8px 10px', color: 'var(--gw-sub)', whiteSpace: 'nowrap' }}>{new Date(c.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })}</td>
                  <td style={{ padding: '8px 10px', color: 'var(--gw-sub)', whiteSpace: 'nowrap' }}>{c.expiresAt ? new Date(c.expiresAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' }) : '—'}</td>
                  <td style={{ padding: '8px 10px', fontWeight: 600, color: expired ? '#c0392b' : dl === '∞' ? 'var(--gw-muted)' : Number(dl) <= 7 ? '#E8A94A' : 'var(--gw-text)' }}>{dl}</td>
                  <td style={{ padding: '8px 10px' }}>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: c.active ? 'var(--gw-green-bg)' : 'var(--gw-bg)', color: c.active ? 'var(--gw-green-t)' : 'var(--gw-muted)', border: '0.5px solid var(--gw-border)' }}>
                      {c.active ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td style={{ padding: '8px 10px' }}>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: c.allowCodeCreation ? '#EEF3FB' : 'var(--gw-bg)', color: c.allowCodeCreation ? '#0C447C' : 'var(--gw-muted)', border: '0.5px solid var(--gw-border)' }}>
                      {c.allowCodeCreation ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td style={{ padding: '8px 10px', fontWeight: 600, color: 'var(--gw-navy)', textAlign: 'right' }}>{c.redemptionCount}</td>
                  <td style={{ padding: '8px 10px' }}>
                    {c.active && (
                      <button
                        onClick={() => onDisable(c.id)}
                        style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 5, background: '#fff0f0', color: '#c0392b', border: '0.5px solid #f5c6cb', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}
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
    { label: 'First ground (free)', key: 'FIRST_GROUND', color: '#5DCAA5' },
    { label: 'Access code', key: 'ACCESS_CODE', color: '#0C447C' },
    { label: 'Paid', key: 'paid', color: '#E8A94A' },
  ]
  const total = Object.values(breakdown).reduce((a, b) => a + b, 0)

  return (
    <section>
      <div style={SL}>Usage Breakdown</div>
      <div style={{ ...C, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {entries.map(({ label, key, color }) => {
          const count = breakdown[key]
          const pct = total > 0 ? (count / total) * 100 : 0
          return (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ fontSize: 12, color: 'var(--gw-text)', minWidth: 160, flexShrink: 0 }}>{label}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gw-navy)', minWidth: 28, textAlign: 'right', flexShrink: 0 }}>{count}</div>
              <Bar pct={pct} color={color} />
              <div style={{ fontSize: 11, color: 'var(--gw-muted)', minWidth: 36, textAlign: 'right', flexShrink: 0 }}>{pct.toFixed(0)}%</div>
            </div>
          )
        })}
        <div style={{ borderTop: '0.5px solid var(--gw-border)', paddingTop: 8, display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, color: 'var(--gw-muted)' }}>Total sessions</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--gw-navy)' }}>{total}</span>
        </div>
      </div>
    </section>
  )
}

// ── Feedback section ──────────────────────────────────────────────────────────

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
            <div key={f.id} style={{ ...C, borderLeft: `3px solid ${f.feltFair === true ? '#5DCAA5' : f.feltFair === false ? '#E8A94A' : 'var(--gw-border)'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: f.note ? 5 : 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  {f.feltFair != null && (
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20,
                      background: f.feltFair ? 'var(--gw-green-bg)' : '#FDF3E3',
                      color: f.feltFair ? 'var(--gw-green-t)' : '#8A5C1A',
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

function AdminManagementSection({ onAdd }: { onAdd: (email: string, otp: string) => Promise<void> }) {
  const [email, setEmail] = useState('')
  const [showOtp, setShowOtp] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setShowOtp(true)
  }

  return (
    <section>
      <div style={SL}>Admin Management</div>
      <div style={C}>
        <div style={{ fontSize: 13, color: 'var(--gw-sub)', marginBottom: 14 }}>
          Add another platform admin by email. An OTP challenge is required.
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="admin@example.com"
            required
            style={{ flex: 1, padding: '9px 12px', borderRadius: 7, border: '0.5px solid var(--gw-border)', fontSize: 13, fontFamily: 'inherit', background: 'white', outline: 'none' }}
            onFocus={e => { e.target.style.borderColor = '#0C447C' }}
            onBlur={e => { e.target.style.borderColor = 'var(--gw-border)' }}
          />
          <button
            type="submit"
            style={{ padding: '9px 18px', borderRadius: 7, background: 'var(--gw-navy)', color: 'white', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}
          >
            Add admin
          </button>
        </form>
      </div>
      {showOtp && (
        <OtpModal
          title="Add platform admin"
          description={`Grant platform admin access to ${email}. This cannot be undone from the UI.`}
          onConfirm={otp => onAdd(email, otp)}
          onClose={() => { setShowOtp(false); setEmail('') }}
        />
      )}
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
      <div style={SL}>Per-user Usage Patterns</div>
      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Filter by email…"
        style={{ width: '100%', padding: '8px 12px', borderRadius: 7, border: '0.5px solid var(--gw-border)', fontSize: 13, fontFamily: 'inherit', background: 'white', marginBottom: 10, boxSizing: 'border-box' }}
      />
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--gw-border)' }}>
              {['User', 'Grounds', 'Codes created', 'Code redemptions', 'Last active'].map(h => (
                <th key={h} style={{ fontSize: 10, fontWeight: 700, color: 'var(--gw-muted)', textAlign: 'left', padding: '6px 10px', textTransform: 'uppercase', letterSpacing: '.06em', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map(u => (
              <tr key={u.userId} style={{ borderBottom: '0.5px solid var(--gw-border)' }}>
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
      <div style={{ minHeight: '100vh', background: 'var(--gw-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--gw-bg)' }}>

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
              style={{ fontSize: 12, padding: '7px 14px', borderRadius: 6, background: 'white', border: '0.5px solid var(--gw-border)', color: 'var(--gw-text)', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Ops →
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
          <div style={{ ...C, borderLeft: '3px solid #c0392b', fontSize: 13, color: '#c0392b' }}>
            {(error as Error).message ?? 'Failed to load dashboard data.'}
          </div>
        )}

        {data && (
          <>
            <OverviewSection overview={data.overview} />

            <CodeManagementSection
              codes={data.codes}
              onDisable={id => setDisablingCodeId(id)}
            />

            <UsageBreakdownSection breakdown={data.freeReasonBreakdown} />

            <FeedbackSection feedback={data.feedback} />

            <AdminManagementSection onAdd={handleAddAdmin} />

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
