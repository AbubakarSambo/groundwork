import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { promptsApi, UsageFunnelData, PlatformDashboardData } from '@/api/prompts'
import { useAuthStore } from '@/stores/auth'

// ─── helpers ─────────────────────────────────────────────────────────────────

function toTitleCase(str: string) {
  return str
    .replace(/_/g, ' ')
    .replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
}

// ─── shared style tokens ──────────────────────────────────────────────────────

const CARD: React.CSSProperties = {
  background: 'white',
  border: '0.5px solid var(--gw-border)',
  borderRadius: 8,
  padding: '10px 14px',
}

const SEC_LABEL: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: 'var(--gw-muted)',
  textTransform: 'uppercase',
  letterSpacing: '.08em',
  marginBottom: 10,
}

// ─── Funnel tab ───────────────────────────────────────────────────────────────

function FunnelTab({ data }: { data: UsageFunnelData }) {
  // Determine max non-zero session to trim trailing zeros
  const sessions = data.funnelBySession
  let lastNonZero = 0
  for (let i = 0; i < sessions.length; i++) {
    if (sessions[i].completed > 0) lastNonZero = i
  }
  const visibleSessions = sessions.slice(0, lastNonZero + 1)

  const s1Count = sessions[0]?.completed ?? 1

  // Status totals for percentage bar (scenarios use server-provided pct)
  const statusTotal = data.byStatus.reduce((acc, s) => acc + s.count, 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

      {/* ── 1. Session waterfall ── */}
      <section>
        <div style={SEC_LABEL}>Session retention</div>
        <div style={{ ...CARD, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {visibleSessions.map((row) => {
            const barPct = s1Count > 0 ? Math.min((row.completed / s1Count) * 100, 100) : 0
            const isS1 = row.session === 1
            const isS5 = row.session === 5
            return (
              <div
                key={row.session}
                style={{ display: 'flex', alignItems: 'center', gap: 10 }}
              >
                {/* badge */}
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: 'white',
                    background: '#0C447C',
                    borderRadius: 4,
                    padding: '2px 6px',
                    minWidth: 26,
                    textAlign: 'center',
                    flexShrink: 0,
                  }}
                >
                  S{row.session}
                </div>

                {/* paywall label */}
                {isS5 && (
                  <span
                    style={{
                      fontSize: 10,
                      color: 'var(--gw-muted)',
                      fontStyle: 'italic',
                      flexShrink: 0,
                    }}
                  >
                    (paywall)
                  </span>
                )}

                {/* count */}
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--gw-navy)',
                    minWidth: 32,
                    textAlign: 'right',
                    flexShrink: 0,
                  }}
                >
                  {row.completed}
                </div>

                {/* bar track */}
                <div
                  style={{
                    flex: 1,
                    background: 'rgba(12,68,124,0.1)',
                    borderRadius: 4,
                    height: 8,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${barPct}%`,
                      height: '100%',
                      background: '#0C447C',
                      borderRadius: 4,
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>

                {/* drop-off */}
                <div
                  style={{
                    fontSize: 11,
                    color: 'var(--gw-muted)',
                    minWidth: 60,
                    textAlign: 'right',
                    flexShrink: 0,
                  }}
                >
                  {isS1
                    ? 'baseline'
                    : row.dropOffRate != null
                    ? `−${Math.round(row.dropOffRate * 100)}%`
                    : '–'}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── 2. Engagement split ── */}
      <section>
        <div style={SEC_LABEL}>Party engagement</div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ ...CARD, flex: 1, minWidth: 100 }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--gw-navy)' }}>
              {data.bothEngaged}
            </div>
            <div style={{ fontSize: 11, color: 'var(--gw-sub)', marginTop: 2 }}>
              Both parties engaged
            </div>
          </div>
          <div style={{ ...CARD, flex: 1, minWidth: 100 }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--gw-navy)' }}>
              {data.oneEngaged}
            </div>
            <div style={{ fontSize: 11, color: 'var(--gw-sub)', marginTop: 2 }}>
              One-sided (initiator only)
            </div>
          </div>
          <div
            style={{
              ...CARD,
              flex: 1,
              minWidth: 100,
              borderColor: data.stalledCheckIns > 0 ? '#D97706' : undefined,
            }}
          >
            <div
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: data.stalledCheckIns > 0 ? '#D97706' : 'var(--gw-navy)',
              }}
            >
              {data.stalledCheckIns}
            </div>
            <div style={{ fontSize: 11, color: 'var(--gw-sub)', marginTop: 2 }}>
              Stalled check-ins (&gt;7d)
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. Avg days to first check-in ── */}
      <section>
        <div style={SEC_LABEL}>Avg days from ground creation to first check-in</div>
        <div style={{ ...CARD, display: 'inline-block' }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--gw-navy)' }}>
            {data.avgDaysToFirstCheckin != null
              ? data.avgDaysToFirstCheckin.toFixed(1)
              : '–'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--gw-sub)', marginTop: 2 }}>days</div>
        </div>
      </section>

      {/* ── 4. Avg session duration ── */}
      <section>
        <div style={SEC_LABEL}>Avg session duration (minutes)</div>
        <div style={CARD}>
          {data.avgSessionMinutes.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--gw-muted)' }}>No data yet</div>
          ) : (
            <table style={{ borderCollapse: 'collapse', width: '100%' }}>
              <thead>
                <tr>
                  <th
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: 'var(--gw-muted)',
                      textAlign: 'left',
                      paddingBottom: 6,
                      textTransform: 'uppercase',
                      letterSpacing: '.06em',
                    }}
                  >
                    Session
                  </th>
                  <th
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: 'var(--gw-muted)',
                      textAlign: 'right',
                      paddingBottom: 6,
                      textTransform: 'uppercase',
                      letterSpacing: '.06em',
                    }}
                  >
                    Avg min
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.avgSessionMinutes.map((row) => (
                  <tr key={row.session}>
                    <td
                      style={{
                        fontSize: 12,
                        color: 'var(--gw-text)',
                        padding: '4px 0',
                        borderTop: '0.5px solid var(--gw-border)',
                      }}
                    >
                      S{row.session}
                    </td>
                    <td
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: 'var(--gw-navy)',
                        textAlign: 'right',
                        padding: '4px 0',
                        borderTop: '0.5px solid var(--gw-border)',
                      }}
                    >
                      {row.avgMinutes.toFixed(1)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* ── 5. Scenario breakdown ── */}
      <section>
        <div style={SEC_LABEL}>Ground scenarios</div>
        <div style={{ ...CARD, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[...data.byScenario]
            .sort((a, b) => b.count - a.count)
            .map((row) => (
              <div key={row.scenario} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    fontSize: 12,
                    color: 'var(--gw-text)',
                    minWidth: 160,
                    flexShrink: 0,
                  }}
                >
                  {toTitleCase(row.scenario)}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--gw-navy)',
                    minWidth: 32,
                    textAlign: 'right',
                    flexShrink: 0,
                  }}
                >
                  {row.count}
                </div>
                <div
                  style={{
                    flex: 1,
                    maxWidth: 400,
                    background: 'rgba(12,68,124,0.1)',
                    borderRadius: 4,
                    height: 8,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${row.pct}%`,
                      height: '100%',
                      background: '#0C447C',
                      borderRadius: 4,
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: 'var(--gw-muted)',
                    minWidth: 36,
                    textAlign: 'right',
                    flexShrink: 0,
                  }}
                >
                  {row.pct.toFixed(0)}%
                </div>
              </div>
            ))}
        </div>
      </section>

      {/* ── 6. Status breakdown ── */}
      <section>
        <div style={SEC_LABEL}>Ground status</div>
        <div style={{ ...CARD, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[...data.byStatus]
            .sort((a, b) => b.count - a.count)
            .map((row) => {
              const pct = statusTotal > 0 ? (row.count / statusTotal) * 100 : 0
              return (
                <div key={row.status} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div
                    style={{
                      fontSize: 12,
                      color: 'var(--gw-text)',
                      minWidth: 160,
                      flexShrink: 0,
                    }}
                  >
                    {toTitleCase(row.status)}
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: 'var(--gw-navy)',
                      minWidth: 32,
                      textAlign: 'right',
                      flexShrink: 0,
                    }}
                  >
                    {row.count}
                  </div>
                  <div
                    style={{
                      flex: 1,
                      maxWidth: 400,
                      background: 'rgba(12,68,124,0.1)',
                      borderRadius: 4,
                      height: 8,
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${pct}%`,
                        height: '100%',
                        background: '#0C447C',
                        borderRadius: 4,
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: 'var(--gw-muted)',
                      minWidth: 36,
                      textAlign: 'right',
                      flexShrink: 0,
                    }}
                  >
                    {pct.toFixed(0)}%
                  </div>
                </div>
              )
            })}
        </div>
      </section>
    </div>
  )
}

// ─── Overview tab (unchanged content) ────────────────────────────────────────

function OverviewTab({ dash }: { dash: PlatformDashboardData }) {
  return (
    <>
      {/* Orgs */}
      <div className="gw-sec">Organisations</div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
        {[
          { val: dash.orgs.total, label: 'Total orgs' },
          { val: dash.orgs.withActiveCareFee, label: 'Active subscriptions' },
          { val: dash.orgs.createdLast30Days, label: 'New last 30d' },
        ].map((s) => (
          <div
            key={s.label}
            style={{ background: 'white', border: '0.5px solid var(--gw-border)', borderRadius: 8, padding: '10px 14px', flex: 1, minWidth: 100 }}
          >
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--gw-navy)' }}>{s.val}</div>
            <div style={{ fontSize: 11, color: 'var(--gw-sub)', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Grounds */}
      <div className="gw-sec">Grounds</div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
        {[
          { val: dash.grounds.total, label: 'Total grounds' },
          { val: dash.grounds.openedLast7Days, label: 'Opened last 7d' },
          { val: dash.grounds.resolvedLast30Days, label: 'Resolved last 30d' },
        ].map((s) => (
          <div
            key={s.label}
            style={{ background: 'white', border: '0.5px solid var(--gw-border)', borderRadius: 8, padding: '10px 14px', flex: 1, minWidth: 100 }}
          >
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--gw-navy)' }}>{s.val}</div>
            <div style={{ fontSize: 11, color: 'var(--gw-sub)', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Check-ins */}
      <div className="gw-sec">Check-ins</div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
        {[
          { val: dash.checkIns.totalCompleted, label: 'Total completed' },
          { val: dash.checkIns.completedLast7Days, label: 'Last 7 days' },
          {
            val:
              dash.checkIns.session2Rate != null
                ? `${(dash.checkIns.session2Rate * 100).toFixed(0)}%`
                : '–',
            label: 'Session 2 rate',
          },
        ].map((s) => (
          <div
            key={s.label}
            style={{ background: 'white', border: '0.5px solid var(--gw-border)', borderRadius: 8, padding: '10px 14px', flex: 1, minWidth: 100 }}
          >
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--gw-navy)' }}>{s.val}</div>
            <div style={{ fontSize: 11, color: 'var(--gw-sub)', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Recent activity */}
      <div className="gw-sec">Recent activity</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {dash.recentActivity.map((ev, i) => (
          <div
            key={i}
            style={{
              background: 'white',
              border: '0.5px solid var(--gw-border)',
              borderRadius: 8,
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '2px 6px',
                  borderRadius: 4,
                  background: 'var(--gw-blue-bg)',
                  color: 'var(--gw-navy)',
                  marginRight: 8,
                  textTransform: 'uppercase',
                  letterSpacing: '.04em',
                }}
              >
                {ev.type.replace(/_/g, ' ')}
              </span>
              <span style={{ fontSize: 12, color: 'var(--gw-text)' }}>{ev.groundLabel}</span>
              <span style={{ fontSize: 11, color: 'var(--gw-muted)', marginLeft: 8 }}>{ev.orgSlug}</span>
            </div>
            <span style={{ fontSize: 11, color: 'var(--gw-muted)' }}>
              {new Date(ev.at).toLocaleDateString()}
            </span>
          </div>
        ))}
      </div>
    </>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type Tab = 'overview' | 'funnel' | 'prompts' | 'orgs' | 'feedback' | 'errors'

export function AdminPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const [activeTab, setActiveTab] = useState<Tab>('overview')

  const { data: dash } = useQuery({
    queryKey: ['platform-dashboard'],
    queryFn: promptsApi.platformDashboard,
    enabled: !!user?.isPlatformAdmin,
  })

  const { data: funnel } = useQuery({
    queryKey: ['platform-funnel'],
    queryFn: promptsApi.platformFunnel,
    enabled: !!user?.isPlatformAdmin && activeTab === 'funnel',
    staleTime: 5 * 60 * 1000,
  })

  if (!user?.isPlatformAdmin) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: 'var(--gw-bg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ fontSize: 13, color: 'var(--gw-muted)' }}>
          Platform admin access required.
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--gw-bg)' }}>
      {/* Nav */}
      <div className="gw-hdr">
        <div className="gw-logo">Groundwork ops</div>
        <button className="gw-back" onClick={() => navigate('/grounds')}>← App</button>
      </div>

      <div className="gw-bd" style={{ maxWidth: 720, margin: '0 auto', width: '100%' }}>
        <div className="gw-ttl">Platform dashboard</div>
        <div className="gw-sub-t">System health, activity, and prompt performance.</div>

        {/* Tab strip */}
        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--gw-border)', marginBottom: 24, overflowX: 'auto' }}>
          {([
            { id: 'overview',  label: 'Overview' },
            { id: 'funnel',    label: 'Drop-offs' },
            { id: 'prompts',   label: 'Prompts' },
            { id: 'orgs',      label: 'Orgs' },
            { id: 'feedback',  label: 'Feedback' },
            { id: 'errors',    label: 'Errors' },
          ] as { id: Tab; label: string }[]).map(({ id: tab, label }) => {
            const active = activeTab === tab
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  background: 'none', border: 'none',
                  borderBottom: active ? '2px solid #0C447C' : '2px solid transparent',
                  padding: '8px 16px', fontSize: 13,
                  fontWeight: active ? 700 : 500,
                  color: active ? '#0C447C' : 'var(--gw-muted)',
                  cursor: 'pointer', marginBottom: -1,
                  transition: 'color 0.15s, border-color 0.15s',
                  whiteSpace: 'nowrap',
                }}
              >
                {label}
              </button>
            )
          })}
        </div>

        {/* Tab content */}
        {activeTab === 'overview' && (
          <>
            {!dash && <div style={{ fontSize: 13, color: 'var(--gw-muted)' }}>Loading…</div>}
            {dash && <OverviewTab dash={dash} />}
          </>
        )}

        {activeTab === 'funnel' && (
          <>
            {!funnel && <div style={{ fontSize: 13, color: 'var(--gw-muted)' }}>Loading…</div>}
            {funnel && <FunnelTab data={funnel} />}
          </>
        )}

        {activeTab === 'prompts' && (
          <div>
            <div style={{ fontSize: 13, color: 'var(--gw-sub)', marginBottom: 16, lineHeight: 1.6 }}>
              Manage and version conversation prompts. Changes are versioned and can be rolled back.
            </div>
            <button
              onClick={() => navigate('/prompts')}
              style={{ padding: '10px 18px', borderRadius: 7, background: 'var(--gw-navy)', color: 'white', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Open prompt management →
            </button>
          </div>
        )}

        {activeTab === 'orgs' && (
          <div>
            {dash?.orgs ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(dash.orgs as unknown as any[]).map((org: any) => (
                  <div key={org.id} style={{ background: 'white', border: '0.5px solid var(--gw-border)', borderRadius: 8, padding: '11px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{org.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--gw-muted)', marginTop: 2 }}>{org.groundCount ?? 0} grounds · {org.participantCount ?? 0} participants</div>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: org.billingActive ? 'var(--gw-green-bg)' : 'var(--gw-bg)', color: org.billingActive ? 'var(--gw-green-t)' : 'var(--gw-muted)', border: '0.5px solid var(--gw-border)' }}>
                      {org.billingActive ? 'Billing active' : 'Free'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: 13, color: 'var(--gw-muted)', textAlign: 'center', padding: 24 }}>Loading orgs…</div>
            )}
          </div>
        )}

        {activeTab === 'feedback' && (
          <div style={{ fontSize: 13, color: 'var(--gw-muted)', textAlign: 'center', padding: 48 }}>
            User feedback collection not yet wired. Add a <code>/ops/feedback</code> endpoint to surface this.
          </div>
        )}

        {activeTab === 'errors' && (
          <div style={{ fontSize: 13, color: 'var(--gw-muted)', textAlign: 'center', padding: 48 }}>
            Error log not yet wired. Connect Sentry or add a <code>/ops/errors</code> endpoint to surface recent exceptions here.
          </div>
        )}
      </div>
    </div>
  )
}
