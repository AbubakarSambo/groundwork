import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { promptsApi } from '@/api'
import { useAuthStore } from '@/stores/auth'

const GROUND_STATUS_ORDER = ['OPEN', 'AWAITING_PARTIES', 'ACTIVE', 'REPORT_READY', 'RESOLVED', 'STALLED', 'CLOSED']
const STATUS_LABEL: Record<string, string> = {
  OPEN: 'Open',
  AWAITING_PARTIES: 'Awaiting parties',
  ACTIVE: 'Active',
  REPORT_READY: 'Report ready',
  RESOLVED: 'Resolved',
  STALLED: 'Stalled',
  CLOSED: 'Closed',
}
const STATUS_COLOR: Record<string, string> = {
  OPEN: '#9B9590',
  AWAITING_PARTIES: '#8A5C1A',
  ACTIVE: '#085041',
  REPORT_READY: '#0C447C',
  RESOLVED: '#085041',
  STALLED: '#791F1F',
  CLOSED: '#9B9590',
}

const ACTIVITY_LABEL: Record<string, string> = {
  checkin_completed: 'Check-in completed',
  ground_created: 'Ground opened',
  ground_resolved: 'Ground resolved',
}
const ACTIVITY_DOT: Record<string, string> = {
  checkin_completed: '#0C447C',
  ground_created: '#085041',
  ground_resolved: '#8A5C1A',
}

function fmt(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function PlatformDashboardPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['platform-dashboard'],
    queryFn: promptsApi.platformDashboard,
    enabled: !!user?.isPlatformAdmin,
    refetchInterval: 60_000,
  })

  if (!user?.isPlatformAdmin) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--gw-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: 13, color: 'var(--gw-muted)' }}>Platform admin access required.</div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gw-bg)', display: 'flex', flexDirection: 'column' }}>
      <div className="gw-hdr">
        <div className="gw-logo">Usage dashboard</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="gw-back" onClick={() => navigate('/prompts')}>Prompt management</button>
          <button className="gw-back" onClick={() => navigate('/')}>← Grounds</button>
        </div>
      </div>

      <div className="gw-bd" style={{ maxWidth: 800, margin: '0 auto', width: '100%' }}>
        {isLoading && <div style={{ fontSize: 13, color: 'var(--gw-muted)', padding: '20px 0' }}>Loading…</div>}
        {isError && <div style={{ fontSize: 13, color: 'var(--gw-muted)', padding: '20px 0' }}>Could not load dashboard.</div>}

        {data && (
          <>
            {/* Orgs */}
            <Section label="Organisations">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                <Stat label="Total" value={data.orgs.total} />
                <Stat label="Active care fee" value={data.orgs.withActiveCareFee} color="#085041" />
                <Stat label="New last 30 days" value={data.orgs.createdLast30Days} color="#0C447C" />
              </div>
            </Section>

            {/* Grounds */}
            <Section label="Grounds">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 16 }}>
                <Stat label="Total" value={data.grounds.total} />
                <Stat label="Opened last 7 days" value={data.grounds.openedLast7Days} color="#0C447C" />
                <Stat label="Resolved last 30 days" value={data.grounds.resolvedLast30Days} color="#085041" />
                <Stat
                  label="Session-2 rate"
                  value={data.checkIns.session2Rate === null ? '—' : `${data.checkIns.session2Rate}%`}
                  color={data.checkIns.session2Rate !== null && data.checkIns.session2Rate < 60 ? '#791F1F' : '#085041'}
                  sub={data.checkIns.session2Rate !== null && data.checkIns.session2Rate < 60 ? 'Below 60% — needs attention' : undefined}
                />
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {GROUND_STATUS_ORDER.map((s) => {
                  const count = data.grounds.byStatus[s] ?? 0
                  if (count === 0) return null
                  return (
                    <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', background: 'var(--gw-bg)', border: '1px solid #E2E0DB', borderRadius: 20, fontSize: 12 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_COLOR[s] ?? '#9B9590', flexShrink: 0 }} />
                      <span style={{ color: 'var(--gw-sub)' }}>{STATUS_LABEL[s] ?? s}</span>
                      <span style={{ fontWeight: 700, color: '#1A1916' }}>{count}</span>
                    </div>
                  )
                })}
              </div>
            </Section>

            {/* Check-ins */}
            <Section label="Check-ins (completed)">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                <Stat label="Total" value={data.checkIns.totalCompleted} />
                <Stat label="Last 7 days" value={data.checkIns.completedLast7Days} color="#0C447C" />
                <Stat label="Last 30 days" value={data.checkIns.completedLast30Days} color="#0C447C" />
              </div>
            </Section>

            {/* Prompt performance */}
            <Section label="Prompt version performance">
              <div style={{ fontSize: 12, color: 'var(--gw-sub)', marginBottom: 12, lineHeight: 1.6 }}>
                Every prompt change is versioned against outcome data. This is the learning loop.
              </div>
              {data.promptPerformance.length === 0 ? (
                <div style={{ fontSize: 13, color: 'var(--gw-muted)' }}>No prompt versions yet.</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #E2E0DB' }}>
                      {['Version', 'Status', 'Activated', 'Grounds', 'Resolved', 'Felt fair'].map((h) => (
                        <th key={h} style={{ textAlign: 'left', padding: '6px 8px 6px 0', fontWeight: 600, fontSize: 11, color: 'var(--gw-muted)', textTransform: 'uppercase', letterSpacing: '.04em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.promptPerformance.map((pv, i) => (
                      <tr key={pv.id} style={{ borderBottom: i < data.promptPerformance.length - 1 ? '1px solid #E2E0DB' : 'none' }}>
                        <td style={{ padding: '9px 8px 9px 0', fontWeight: 600 }}>{pv.key} <span style={{ fontWeight: 400, color: 'var(--gw-muted)' }}>v{pv.version}</span></td>
                        <td style={{ padding: '9px 8px 9px 0' }}>
                          {pv.isActive
                            ? <span className="gw-pill gw-pill-green">Active</span>
                            : <span style={{ fontSize: 12, color: 'var(--gw-muted)' }}>Inactive</span>}
                        </td>
                        <td style={{ padding: '9px 8px 9px 0', color: 'var(--gw-sub)', fontSize: 12 }}>{fmtDate(pv.activatedAt)}</td>
                        <td style={{ padding: '9px 8px 9px 0' }}>{pv.groundsUsingIt}</td>
                        <td style={{ padding: '9px 8px 9px 0' }}>{pv.outcomesResolved}</td>
                        <td style={{ padding: '9px 8px 9px 0' }}>
                          {pv.fairnessRate === null
                            ? <span style={{ color: 'var(--gw-muted)' }}>—</span>
                            : <span style={{ color: pv.fairnessRate >= 70 ? '#085041' : '#791F1F', fontWeight: 600 }}>{pv.fairnessRate}%</span>}
                          {pv.feedbackResponses > 0 && (
                            <span style={{ fontSize: 11, color: 'var(--gw-muted)', marginLeft: 4 }}>({pv.feedbackResponses})</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Section>

            {/* Recent activity */}
            <Section label="Recent activity">
              {data.recentActivity.length === 0 ? (
                <div style={{ fontSize: 13, color: 'var(--gw-muted)' }}>No activity yet.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {data.recentActivity.map((a, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '9px 0', borderBottom: i < data.recentActivity.length - 1 ? '1px solid #E2E0DB' : 'none' }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: ACTIVITY_DOT[a.type] ?? '#9B9590', flexShrink: 0, marginTop: 4 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, color: '#1A1916' }}>
                          <span style={{ fontWeight: 600 }}>{ACTIVITY_LABEL[a.type]}</span>
                          {' · '}
                          <span style={{ color: 'var(--gw-sub)' }}>{a.groundLabel}</span>
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--gw-muted)', marginTop: 2 }}>
                          {a.orgSlug}
                          {a.detail && <span> · {a.detail}</span>}
                          <span> · {fmt(a.at)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Section>
          </>
        )}
      </div>
    </div>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'white', border: '1px solid #E2E0DB', borderRadius: 6, padding: '16px', marginBottom: 8 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gw-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 14 }}>
        {label}
      </div>
      {children}
    </div>
  )
}

function Stat({ label, value, color, sub }: { label: string; value: number | string; color?: string; sub?: string }) {
  return (
    <div>
      <div style={{ fontSize: 26, fontWeight: 700, color: color ?? '#1A1916', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 12, color: 'var(--gw-sub)', marginTop: 4 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: color ?? 'var(--gw-muted)', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}
