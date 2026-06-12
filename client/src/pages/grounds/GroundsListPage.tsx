import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { groundsApi } from '@/api'
import { useAuthStore } from '@/stores/auth'
import { StatusPill, ConfidenceDots } from '@/components/gw'

export function GroundsListPage() {
  const navigate = useNavigate()
  const logout = useAuthStore((s) => s.logout)
  const user = useAuthStore((s) => s.user)
  const { data: grounds, isLoading } = useQuery({ queryKey: ['grounds'], queryFn: groundsApi.list })

  const isAdmin = user?.role === 'ADMIN'

  // Admin stats bar
  const activeGrounds = grounds?.filter(g => g.status !== 'CLOSED' && g.status !== 'RESOLVED').length ?? 0
  const checkInsToday = grounds?.reduce((n, g) => n + (g.checkInsToday ?? 0), 0) ?? 0
  const reportsReady = grounds?.filter(g => g.status === 'REPORT_READY').length ?? 0

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gw-bg)', display: 'flex', flexDirection: 'column' }}>
      <div className="gw-hdr">
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div>
            <div className="gw-logo">{user?.organizationName ?? 'Groundwork'}</div>
            <div style={{ fontSize: 11, color: 'var(--gw-muted)', marginTop: 1 }}>{user?.email}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
          {/* Role pill */}
          <span style={{
            fontSize: 11, fontWeight: 600, color: '#0C447C',
            background: '#EEF4FB', border: '0.5px solid #B5D4F4',
            borderRadius: 20, padding: '3px 10px',
          }}>
            {isAdmin ? 'Admin' : 'Team member'}
          </span>
          {isAdmin && (
            <button className="gw-back" onClick={() => navigate('/alignment-feed')}>Alignment feed</button>
          )}
          {isAdmin && (
            <button className="gw-back" onClick={() => navigate('/dashboard')}>Dashboard</button>
          )}
          {isAdmin && (
            <button className="gw-back" onClick={() => navigate('/billing')}>Billing</button>
          )}
          {user?.isPlatformAdmin && (
            <button className="gw-back" onClick={() => navigate('/prompts')}>Prompts</button>
          )}
          <button className="gw-back" onClick={() => navigate('/profile')}>Profile</button>
          <button className="gw-back" onClick={() => { logout(); navigate('/login') }}>Sign out</button>
        </div>
      </div>

      <div className="gw-bd" style={{ maxWidth: 640, margin: '0 auto', width: '100%' }}>

        {/* Admin stats bar */}
        {isAdmin && (
          <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
            {[
              { val: activeGrounds, label: 'Active grounds' },
              { val: checkInsToday, label: 'Check-ins today' },
              { val: reportsReady, label: 'Reports ready' },
            ].map(s => (
              <div key={s.label} style={{
                background: '#F5F3EF', border: '0.5px solid #E2E0DB',
                borderRadius: 8, padding: '10px 14px', flex: 1, minWidth: 100,
              }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#0C447C' }}>{s.val}</div>
                <div style={{ fontSize: 11, color: 'var(--gw-sub)', marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div className="gw-sec" style={{ margin: 0 }}>Your grounds</div>
          <Link to="/grounds/new">
            <button className="gw-btn" style={{ width: 'auto', padding: '10px 18px' }}>
              {isAdmin ? 'Open a ground +' : 'Open a ground'}
            </button>
          </Link>
        </div>

        {isLoading && <div style={{ fontSize: 13, color: 'var(--gw-muted)', padding: '12px 0' }}>Loading…</div>}

        {!isLoading && grounds?.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 24px' }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#1A1916', marginBottom: 8 }}>
              {isAdmin ? 'Your first ground is one tap away.' : 'No active grounds yet.'}
            </div>
            <div style={{ fontSize: 13, color: 'var(--gw-muted)', marginBottom: 20, lineHeight: 1.65, maxWidth: 320, margin: '0 auto 20px' }}>
              {isAdmin
                ? 'Open a ground for a new hire, a cofounder conversation, or a team that needs alignment.'
                : 'When someone opens a ground with you, it will appear here.'}
            </div>
            {isAdmin && (
              <Link to="/grounds/new">
                <button className="gw-btn" style={{ display: 'inline-block', width: 'auto', padding: '10px 24px' }}>Open your first ground</button>
              </Link>
            )}
          </div>
        )}

        {grounds?.map((g) => {
          const sessionNum = g.checkIns?.reduce((max, c) => Math.max(max, c.sessionNumber ?? 0), 0) ?? 0
          const sessionOpen = g.checkIns?.some(c => c.status === 'NOT_STARTED' || c.status === 'IN_PROGRESS') ?? false

          return (
            <Link key={g.id} to={`/grounds/${g.id}`} style={{ textDecoration: 'none', display: 'block', marginBottom: 10 }}>
              <div style={{
                background: 'white', border: '0.5px solid #E2E0DB', borderRadius: 10,
                padding: '14px 16px', cursor: 'pointer', transition: 'all .15s',
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = '#B5D4F4'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-1px)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = '#E2E0DB'; (e.currentTarget as HTMLDivElement).style.transform = 'none' }}
              >
                {/* Top row */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#1A1916', marginBottom: 3, display: 'flex', alignItems: 'center', gap: 6 }}>
                      {g.label}
                      {sessionOpen && (
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#5DCAA5', display: 'inline-block', flexShrink: 0 }} />
                      )}
                      {g.scenario && (
                        <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--gw-muted)', background: '#F5F3EF', border: '1px solid #E2E0DB', borderRadius: 4, padding: '1px 6px' }}>
                          {g.scenario.replace(/_/g, ' ')}
                        </span>
                      )}
                    </div>
                    {isAdmin && g.resolutionState && (
                      <div style={{ fontSize: 10, fontWeight: 600, color: '#0C447C', background: '#EEF4FB', border: '0.5px solid #B5D4F4', borderRadius: 20, padding: '2px 8px', display: 'inline-block', marginBottom: 4 }}>
                        {g.resolutionState}
                      </div>
                    )}
                    {isAdmin && g.brief && (
                      <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.5, maxWidth: 380 }}>
                        {g.brief.length > 90 ? g.brief.slice(0, 90) + '…' : g.brief}
                      </div>
                    )}
                    {!isAdmin && (
                      <div style={{ fontSize: 12, color: 'var(--gw-sub)' }}>
                        {g.participants?.length ?? 0} part{(g.participants?.length ?? 0) === 1 ? 'y' : 'ies'}
                      </div>
                    )}
                  </div>
                  {/* Confidence dots (admin only) */}
                  {isAdmin && g.confidence != null && g.confidence > 0 ? (
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <ConfidenceDots score={g.confidence} />
                      <div style={{ fontSize: 10, color: 'var(--gw-sub)', marginTop: 3 }}>{g.confidence}/5</div>
                    </div>
                  ) : (
                    <StatusPill status={g.status} />
                  )}
                </div>

                {/* Bottom row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  {isAdmin ? (
                    <div style={{ fontSize: 11, color: 'var(--gw-sub)' }}>
                      {g.participants?.length ?? 0} participant{(g.participants?.length ?? 0) !== 1 ? 's' : ''}
                      {sessionNum > 0 ? ` · Session ${sessionNum}` : ''}
                    </div>
                  ) : (
                    <div style={{ fontSize: 11, color: 'var(--gw-sub)' }}>
                      {sessionNum > 0 ? `Session ${sessionNum}` : 'Not started'}
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {isAdmin && (g.overdue ?? 0) > 0 && (
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#8A5C1A', background: '#FDF3E3', borderRadius: 20, padding: '2px 8px' }}>
                        {g.overdue} overdue
                      </span>
                    )}
                    {g.status === 'REPORT_READY' && (
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#085041', background: '#E1F5EE', borderRadius: 20, padding: '2px 8px' }}>
                        Report ready
                      </span>
                    )}
                    {isAdmin && g.confidence == null && <StatusPill status={g.status} />}
                    {isAdmin && (g.daysLeft ?? 0) > 0 && (
                      <span style={{ fontSize: 11, color: 'var(--gw-sub)' }}>{g.daysLeft}d left</span>
                    )}
                  </div>
                </div>

                {/* Participant CTA when session is open */}
                {!isAdmin && sessionOpen && (
                  <button style={{
                    width: '100%', padding: 11, borderRadius: 7,
                    background: '#0C447C', color: 'white',
                    fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer',
                    fontFamily: 'inherit', marginTop: 8,
                  }}
                    onClick={e => { e.preventDefault(); navigate(`/grounds/${g.id}`) }}
                  >
                    Session {sessionNum || 1} is open. Check in now
                  </button>
                )}
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
