import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { promptsApi } from '@/api/prompts'
import { useAuthStore } from '@/stores/auth'

export function AdminPage() {
  const navigate = useNavigate()
  const user = useAuthStore(s => s.user)

  const { data: dash } = useQuery({
    queryKey: ['platform-dashboard'],
    queryFn: promptsApi.platformDashboard,
    enabled: !!user?.isPlatformAdmin,
  })

  if (!user?.isPlatformAdmin) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--gw-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: 13, color: 'var(--gw-muted)' }}>Platform admin access required.</div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--gw-bg)' }}>
      <div className="gw-hdr">
        <div className="gw-logo">Groundwork ops</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="gw-back" onClick={() => navigate('/prompts')}>Prompt management</button>
          <button className="gw-back" onClick={() => navigate('/grounds')}>← App</button>
        </div>
      </div>

      <div className="gw-bd" style={{ maxWidth: 720, margin: '0 auto', width: '100%' }}>
        <div className="gw-ttl">Platform dashboard</div>
        <div className="gw-sub-t">System health, activity, and prompt performance.</div>

        {!dash && <div style={{ fontSize: 13, color: 'var(--gw-muted)' }}>Loading…</div>}

        {dash && (
          <>
            {/* Orgs */}
            <div className="gw-sec">Organisations</div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
              {[
                { val: dash.orgs.total, label: 'Total orgs' },
                { val: dash.orgs.withActiveCareFee, label: 'Active subscriptions' },
                { val: dash.orgs.createdLast30Days, label: 'New last 30d' },
              ].map(s => (
                <div key={s.label} style={{ background: 'white', border: '0.5px solid var(--gw-border)', borderRadius: 8, padding: '10px 14px', flex: 1, minWidth: 100 }}>
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
              ].map(s => (
                <div key={s.label} style={{ background: 'white', border: '0.5px solid var(--gw-border)', borderRadius: 8, padding: '10px 14px', flex: 1, minWidth: 100 }}>
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
                { val: dash.checkIns.session2Rate != null ? `${(dash.checkIns.session2Rate * 100).toFixed(0)}%` : '–', label: 'Session 2 rate' },
              ].map(s => (
                <div key={s.label} style={{ background: 'white', border: '0.5px solid var(--gw-border)', borderRadius: 8, padding: '10px 14px', flex: 1, minWidth: 100 }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--gw-navy)' }}>{s.val}</div>
                  <div style={{ fontSize: 11, color: 'var(--gw-sub)', marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Recent activity */}
            <div className="gw-sec">Recent activity</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {dash.recentActivity.map((ev, i) => (
                <div key={i} style={{ background: 'white', border: '0.5px solid var(--gw-border)', borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: 'var(--gw-blue-bg)', color: 'var(--gw-navy)', marginRight: 8, textTransform: 'uppercase', letterSpacing: '.04em' }}>{ev.type.replace(/_/g, ' ')}</span>
                    <span style={{ fontSize: 12, color: 'var(--gw-text)' }}>{ev.groundLabel}</span>
                    <span style={{ fontSize: 11, color: 'var(--gw-muted)', marginLeft: 8 }}>{ev.orgSlug}</span>
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--gw-muted)' }}>{new Date(ev.at).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
