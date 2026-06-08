import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { alignmentApi } from '@/api'
import { useAuthStore } from '@/stores/auth'
import { StatusPill } from '@/components/gw'

export function AlignmentFeedPage() {
  const navigate = useNavigate()
  const user = useAuthStore(s => s.user)
  const logout = useAuthStore(s => s.logout)
  const [teamOpen, setTeamOpen] = useState(false)

  const { data: feed, isLoading } = useQuery({ queryKey: ['alignment-feed'], queryFn: alignmentApi.feed })

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--gw-bg)' }}>
      {/* Header */}
      <div className="gw-hdr">
        <div>
          <div className="gw-logo">{user?.organizationName ?? 'Groundwork'}</div>
          <div style={{ fontSize: 11, color: 'var(--gw-muted)', marginTop: 1 }}>Alignment feed</div>
        </div>
        <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
          <button className="gw-back" onClick={() => setTeamOpen(o => !o)}>
            👥 Team
          </button>
          <Link to="/grounds/new">
            <button className="gw-back" style={{ color: '#0C447C', borderColor: '#B5D4F4' }}>+ New ground</button>
          </Link>
          <button className="gw-back" onClick={() => navigate('/')}>← Grounds</button>
          <button className="gw-back" onClick={() => { logout(); navigate('/') }}>Sign out</button>
        </div>
      </div>

      {/* Team panel */}
      {teamOpen && (
        <div style={{ position: 'fixed', top: 0, right: 0, width: '100%', maxWidth: 340, height: '100%', background: 'white', borderLeft: '1px solid #E2E0DB', zIndex: 20, overflowY: 'auto', padding: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>Team engagement</div>
            <button className="gw-back" onClick={() => setTeamOpen(false)}>Close</button>
          </div>
          <div className="gw-box gw-box-blue">
            You see engagement quality only. Reports require team member approval.
          </div>
          {feed?.map((g) => (
            <div key={g.groundId} style={{ marginBottom: 10, padding: '10px 12px', background: '#EDECEA', borderRadius: 6, border: '1px solid #E2E0DB' }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{g.label}</div>
              <div style={{ fontSize: 12, color: 'var(--gw-sub)' }}>
                {g.completeness.checkedInCount} of {g.completeness.totalCount} checked in
              </div>
              {g.completeness.awaiting.length > 0 && (
                <div style={{ fontSize: 11, color: 'var(--gw-muted)', marginTop: 3 }}>
                  Awaiting: {g.completeness.awaiting.join(', ')}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Feed */}
      <div className="gw-bd" style={{ maxWidth: 640, margin: '0 auto', width: '100%' }}>
        <div className="gw-sec">Alignment feed · state and completeness only</div>
        <div className="gw-box gw-box-blue" style={{ marginBottom: 16 }}>
          This view never shows what anyone said. You see ground status, session completeness, and observations from the record — not content.
        </div>

        {isLoading && <div style={{ fontSize: 13, color: 'var(--gw-muted)', padding: '20px 0' }}>Loading…</div>}

        {!isLoading && feed?.length === 0 && (
          <div style={{ background: 'white', border: '1px solid #E2E0DB', borderRadius: 6, padding: '40px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: 13, color: 'var(--gw-muted)', marginBottom: 12 }}>No grounds open yet.</div>
            <Link to="/grounds/new">
              <button className="gw-btn" style={{ width: 'auto', display: 'inline-block', padding: '10px 20px' }}>
                Open your first ground
              </button>
            </Link>
          </div>
        )}

        {feed?.map((g) => (
          <div key={g.groundId} style={{ background: 'white', border: '1px solid #E2E0DB', borderRadius: 6, padding: '14px 16px', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
              <div>
                <Link to={`/grounds/${g.groundId}`} style={{ fontSize: 14, fontWeight: 600, color: '#1A1916', textDecoration: 'none' }}>
                  {g.label}
                </Link>
                <div style={{ fontSize: 12, color: 'var(--gw-sub)', marginTop: 2 }}>
                  Period {g.currentPeriod} · {g.completeness.checkedInCount}/{g.completeness.totalCount} checked in
                  {g.completeness.awaiting.length > 0 && ` · Awaiting: ${g.completeness.awaiting.join(', ')}`}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0, marginLeft: 12 }}>
                {g.stalled && <span className="gw-pill gw-pill-amber">Stalled</span>}
                <StatusPill status={g.status} />
              </div>
            </div>

            {g.patternSignals?.length > 0 && (
              <div style={{ borderTop: '1px solid #E2E0DB', paddingTop: 10, marginTop: 6 }}>
                <div style={{ fontSize: 11, color: 'var(--gw-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>
                  Patterns worth naming
                </div>
                {g.patternSignals.map((s: any, i: number) => (
                  <div key={i} style={{ fontSize: 12, color: 'var(--gw-text)', padding: '5px 0', borderBottom: i < g.patternSignals.length - 1 ? '1px solid #E2E0DB' : 'none' }}>
                    {s.observation}
                  </div>
                ))}
                <div style={{ fontSize: 11, color: 'var(--gw-muted)', marginTop: 6 }}>
                  Observations, not verdicts. What the record describes — not who said what.
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
