import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { promptsApi, UsageFunnelData, PlatformDashboardData, OrgCohortRow } from '@/api/prompts'
import { feedbackApi, FeedbackSubmission } from '@/api/feedback'
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

// ─── Orgs tab ─────────────────────────────────────────────────────────────────

function OrgsTab({ rows }: { rows: OrgCohortRow[] }) {
  const STAGE_STYLE: Record<string, React.CSSProperties> = {
    paid:        { background: '#D1FAE5', color: '#065F46' },
    s4_plus:     { background: '#DBEAFE', color: '#1E40AF' },
    s3:          { background: '#EDE9FE', color: '#5B21B6' },
    s2:          { background: '#FEF3C7', color: '#92400E' },
    s1_only:     { background: '#FEE2E2', color: '#991B1B' },
    no_activity: { background: '#F3F4F6', color: '#6B7280' },
  }
  const STAGE_LABEL: Record<string, string> = {
    paid:        'Paid',
    s4_plus:     'S4+',
    s3:          'S3',
    s2:          'S2',
    s1_only:     'S1 only',
    no_activity: 'No activity',
  }

  if (rows.length === 0) {
    return <div style={{ fontSize: 13, color: 'var(--gw-muted)' }}>No orgs yet.</div>
  }

  const TH: React.CSSProperties = {
    fontSize: 10,
    fontWeight: 700,
    color: 'var(--gw-muted)',
    textAlign: 'left',
    padding: '0 12px 8px 0',
    textTransform: 'uppercase',
    letterSpacing: '.06em',
    whiteSpace: 'nowrap',
    borderBottom: '1px solid var(--gw-border)',
  }
  const TD: React.CSSProperties = {
    padding: '10px 12px 10px 0',
    verticalAlign: 'top',
    borderBottom: '0.5px solid var(--gw-border)',
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 12 }}>
        <thead>
          <tr>
            <th style={TH}>Org</th>
            <th style={TH}>Admin</th>
            <th style={{ ...TH, textAlign: 'right' }}>Signed up</th>
            <th style={{ ...TH, textAlign: 'right' }}>Users</th>
            <th style={{ ...TH, textAlign: 'right' }}>Grounds</th>
            <th style={{ ...TH, textAlign: 'right' }}>Max S</th>
            <th style={{ ...TH, textAlign: 'right' }}>Last activity</th>
            <th style={TH}>Stage</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td style={TD}>
                <div style={{ fontWeight: 600, color: 'var(--gw-navy)' }}>{row.name}</div>
                <div style={{ fontSize: 11, color: 'var(--gw-muted)' }}>{row.slug}</div>
              </td>
              <td style={TD}>
                <div>{row.adminName ?? '—'}</div>
                <div style={{ fontSize: 11, color: 'var(--gw-muted)' }}>{row.adminEmail ?? ''}</div>
              </td>
              <td style={{ ...TD, textAlign: 'right', color: 'var(--gw-text)', whiteSpace: 'nowrap' }}>
                {new Date(row.createdAt).toLocaleDateString()}
              </td>
              <td style={{ ...TD, textAlign: 'right', fontWeight: 600, color: 'var(--gw-navy)' }}>
                {row.userCount}
              </td>
              <td style={{ ...TD, textAlign: 'right', fontWeight: 600, color: 'var(--gw-navy)' }}>
                {row.groundCount}
              </td>
              <td style={{ ...TD, textAlign: 'right', fontWeight: 600, color: 'var(--gw-navy)' }}>
                {row.maxSession > 0 ? `S${row.maxSession}` : '—'}
              </td>
              <td style={{ ...TD, textAlign: 'right', color: 'var(--gw-muted)', whiteSpace: 'nowrap' }}>
                {row.lastActivity ? new Date(row.lastActivity).toLocaleDateString() : '—'}
              </td>
              <td style={{ ...TD, paddingRight: 0 }}>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '2px 7px',
                    borderRadius: 4,
                    whiteSpace: 'nowrap',
                    ...(STAGE_STYLE[row.stage] ?? {}),
                  }}
                >
                  {STAGE_LABEL[row.stage] ?? row.stage}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
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

// ─── Feedback tab ─────────────────────────────────────────────────────────────

type FeedbackSubTab = 'reaction' | 'build_request' | 'something_went_wrong'

const REACTION_PILLS = [
  'This is exactly what I needed.',
  'This could work for me.',
  'Interesting but not sure yet.',
  'Not built for my situation.',
  'Too much to take in.',
  'I do not trust it yet.',
  'This feels like it matters.',
  'I would not use this.',
  'Other.',
]

const STATUS_CYCLE: Record<string, string> = {
  new: 'reviewed',
  reviewed: 'resolved',
  resolved: 'new',
}
const STATUS_LABEL: Record<string, string> = {
  new: 'New',
  reviewed: 'Reviewed',
  resolved: 'Resolved',
}
const STATUS_COLOR: Record<string, string> = {
  new: '#0C447C',
  reviewed: '#7c5c0c',
  resolved: '#1a7c3c',
}

function FeedbackTab({ submissions }: { submissions: FeedbackSubmission[] }) {
  const [subTab, setSubTab] = useState<FeedbackSubTab>('reaction')
  const [buildView, setBuildView] = useState<'grouped' | 'chrono'>('grouped')
  const qc = useQueryClient()

  const { mutate: cycleStatus } = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      feedbackApi.updateStatus(id, STATUS_CYCLE[status] ?? 'new'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['platform-feedback'] }),
  })

  const reactions = submissions.filter(s => s.tab === 'reaction')
  const builds = submissions.filter(s => s.tab === 'build_request')
  const bugs = submissions.filter(s => s.tab === 'something_went_wrong')

  const SUB_TABS: FeedbackSubTab[] = ['reaction', 'build_request', 'something_went_wrong']
  const SUB_LABELS: Record<FeedbackSubTab, string> = {
    reaction: `Reaction (${reactions.length})`,
    build_request: `Build request (${builds.length})`,
    something_went_wrong: `Something went wrong (${bugs.length})`,
  }

  const pillCounts = REACTION_PILLS.reduce<Record<string, number>>((acc, p) => {
    acc[p] = reactions.filter(r => r.pill === p).length
    return acc
  }, {})
  const reactionTotal = reactions.length

  const buildByPill = builds.reduce<Record<string, FeedbackSubmission[]>>((acc, b) => {
    if (!acc[b.pill]) acc[b.pill] = []
    acc[b.pill].push(b)
    return acc
  }, {})

  const rowStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: '8px 0',
    borderBottom: '1px solid var(--gw-border)',
    fontSize: 12,
    gap: 8,
  }

  const subTabStyle = (active: boolean): React.CSSProperties => ({
    background: 'none',
    border: 'none',
    borderBottom: active ? '2px solid #0C447C' : '2px solid transparent',
    padding: '6px 12px',
    fontSize: 12,
    fontWeight: active ? 700 : 500,
    color: active ? '#0C447C' : 'var(--gw-muted)',
    cursor: 'pointer',
    marginBottom: -1,
    fontFamily: 'inherit',
  })

  return (
    <div>
      {/* Sub-tab strip */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--gw-border)', marginBottom: 20 }}>
        {SUB_TABS.map(t => (
          <button key={t} style={subTabStyle(subTab === t)} onClick={() => setSubTab(t)}>
            {SUB_LABELS[t]}
          </button>
        ))}
      </div>

      {/* Reaction sub-tab */}
      {subTab === 'reaction' && (
        <div>
          {/* Summary distribution row */}
          <div style={{ ...CARD, marginBottom: 16 }}>
            <div style={SEC_LABEL}>Distribution</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {REACTION_PILLS.map(p => {
                const count = pillCounts[p] ?? 0
                const pct = reactionTotal > 0 ? Math.round((count / reactionTotal) * 100) : 0
                return (
                  <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                    <span style={{ flex: 1, color: 'var(--gw-text)' }}>{p}</span>
                    <div style={{ width: 80, height: 6, background: 'var(--gw-border)', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: '#0C447C', borderRadius: 4 }} />
                    </div>
                    <span style={{ width: 32, textAlign: 'right', color: 'var(--gw-muted)' }}>{count}</span>
                  </div>
                )
              })}
            </div>
          </div>
          {/* Individual rows */}
          <div>
            {reactions.length === 0 && (
              <div style={{ fontSize: 12, color: 'var(--gw-muted)' }}>No reactions yet.</div>
            )}
            {reactions.map(r => (
              <div key={r.id} style={rowStyle}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, marginBottom: 2 }}>{r.pill}</div>
                  {r.text && <div style={{ color: 'var(--gw-muted)' }}>{r.text}</div>}
                </div>
                <div style={{ color: 'var(--gw-muted)', whiteSpace: 'nowrap', fontSize: 11 }}>
                  {new Date(r.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Build request sub-tab */}
      {subTab === 'build_request' && (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {(['grouped', 'chrono'] as const).map(v => (
              <button
                key={v}
                onClick={() => setBuildView(v)}
                style={{
                  padding: '4px 10px',
                  borderRadius: 20,
                  border: '1px solid var(--gw-border)',
                  background: buildView === v ? '#0C447C' : 'white',
                  color: buildView === v ? 'white' : 'var(--gw-text)',
                  fontSize: 11,
                  fontWeight: 500,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {v === 'grouped' ? 'Grouped' : 'Chronological'}
              </button>
            ))}
          </div>
          {builds.length === 0 && (
            <div style={{ fontSize: 12, color: 'var(--gw-muted)' }}>No build requests yet.</div>
          )}
          {buildView === 'grouped' && (
            <div>
              {Object.entries(buildByPill).map(([pill, items]) => (
                <div key={pill} style={{ marginBottom: 20 }}>
                  <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 8 }}>
                    {pill} <span style={{ fontWeight: 400, color: 'var(--gw-muted)' }}>({items.length})</span>
                  </div>
                  {items.map(b => (
                    <div key={b.id} style={rowStyle}>
                      <div style={{ flex: 1, color: 'var(--gw-text)' }}>{b.text ?? '—'}</div>
                      <div style={{ color: 'var(--gw-muted)', fontSize: 11, whiteSpace: 'nowrap' }}>
                        {new Date(b.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
          {buildView === 'chrono' && (
            <div>
              {[...builds].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(b => (
                <div key={b.id} style={rowStyle}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, marginBottom: 2 }}>{b.pill}</div>
                    <div style={{ color: 'var(--gw-muted)' }}>{b.text ?? '—'}</div>
                  </div>
                  <div style={{ color: 'var(--gw-muted)', fontSize: 11, whiteSpace: 'nowrap' }}>
                    {new Date(b.createdAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Something went wrong sub-tab */}
      {subTab === 'something_went_wrong' && (
        <div>
          {bugs.length === 0 && (
            <div style={{ fontSize: 12, color: 'var(--gw-muted)' }}>No bug reports yet.</div>
          )}
          {bugs.map(b => (
            <div key={b.id} style={rowStyle}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, marginBottom: 2 }}>{b.pill}</div>
                {b.text && <div style={{ color: 'var(--gw-muted)' }}>{b.text}</div>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  onClick={() => cycleStatus({ id: b.id, status: b.status })}
                  style={{
                    padding: '3px 9px',
                    borderRadius: 20,
                    border: `1px solid ${STATUS_COLOR[b.status] ?? '#0C447C'}`,
                    background: 'white',
                    color: STATUS_COLOR[b.status] ?? '#0C447C',
                    fontSize: 10,
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {STATUS_LABEL[b.status] ?? b.status}
                </button>
                <span style={{ fontSize: 11, color: 'var(--gw-muted)', whiteSpace: 'nowrap' }}>
                  {new Date(b.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type Tab = 'overview' | 'funnel' | 'orgs' | 'feedback'

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

  const { data: orgRows } = useQuery({
    queryKey: ['platform-org-cohorts'],
    queryFn: promptsApi.orgCohorts,
    enabled: !!user?.isPlatformAdmin && activeTab === 'orgs',
    staleTime: 5 * 60 * 1000,
  })

  const { data: feedbackSubmissions } = useQuery({
    queryKey: ['platform-feedback'],
    queryFn: feedbackApi.list,
    enabled: !!user?.isPlatformAdmin && activeTab === 'feedback',
    staleTime: 60 * 1000,
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
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="gw-back" onClick={() => navigate('/prompts')}>
            Prompt management
          </button>
          <button className="gw-back" onClick={() => navigate('/grounds')}>
            ← App
          </button>
        </div>
      </div>

      <div className="gw-bd" style={{ maxWidth: 720, margin: '0 auto', width: '100%' }}>
        <div className="gw-ttl">Platform dashboard</div>
        <div className="gw-sub-t">System health, activity, and prompt performance.</div>

        {/* Tab strip */}
        <div
          style={{
            display: 'flex',
            gap: 0,
            borderBottom: '1px solid var(--gw-border)',
            marginBottom: 24,
          }}
        >
          {(['overview', 'funnel', 'orgs', 'feedback'] as Tab[]).map((tab) => {
            const active = activeTab === tab
            const label = tab.charAt(0).toUpperCase() + tab.slice(1)
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  background: 'none',
                  border: 'none',
                  borderBottom: active ? '2px solid #0C447C' : '2px solid transparent',
                  padding: '8px 16px',
                  fontSize: 13,
                  fontWeight: active ? 700 : 500,
                  color: active ? '#0C447C' : 'var(--gw-muted)',
                  cursor: 'pointer',
                  marginBottom: -1,
                  transition: 'color 0.15s, border-color 0.15s',
                  fontFamily: 'inherit',
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
            {!dash && (
              <div style={{ fontSize: 13, color: 'var(--gw-muted)' }}>Loading…</div>
            )}
            {dash && <OverviewTab dash={dash} />}
          </>
        )}

        {activeTab === 'funnel' && (
          <>
            {!funnel && (
              <div style={{ fontSize: 13, color: 'var(--gw-muted)' }}>Loading…</div>
            )}
            {funnel && <FunnelTab data={funnel} />}
          </>
        )}

        {activeTab === 'orgs' && (
          <>
            {!orgRows && (
              <div style={{ fontSize: 13, color: 'var(--gw-muted)' }}>Loading…</div>
            )}
            {orgRows && <OrgsTab rows={orgRows} />}
          </>
        )}

        {activeTab === 'feedback' && (
          <>
            {!feedbackSubmissions && (
              <div style={{ fontSize: 13, color: 'var(--gw-muted)' }}>Loading…</div>
            )}
            {feedbackSubmissions && <FeedbackTab submissions={feedbackSubmissions} />}
          </>
        )}
      </div>
    </div>
  )
}
