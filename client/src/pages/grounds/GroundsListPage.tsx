import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { groundsApi } from '@/api'
import { useAuthStore } from '@/stores/auth'
import { StatusPill } from '@/components/gw'

export function GroundsListPage() {
  const navigate = useNavigate()
  const logout = useAuthStore((s) => s.logout)
  const user = useAuthStore((s) => s.user)
  const { data: grounds, isLoading } = useQuery({ queryKey: ['grounds'], queryFn: groundsApi.list })

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gw-bg)', display: 'flex', flexDirection: 'column' }}>
      <div className="gw-hdr">
        <div>
          <div className="gw-logo">{user?.organizationName ?? 'Groundwork'}</div>
          <div style={{ fontSize: 11, color: 'var(--gw-muted)', marginTop: 1 }}>{user?.email}</div>
        </div>
        <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
          {user?.role === 'ADMIN' && (
            <button className="gw-back" onClick={() => navigate('/alignment-feed')}>Alignment feed</button>
          )}
          {user?.role === 'ADMIN' && (
            <button className="gw-back" onClick={() => navigate('/dashboard')}>Dashboard</button>
          )}
          {user?.role === 'ADMIN' && (
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div className="gw-sec" style={{ margin: 0 }}>Your grounds</div>
          <Link to="/grounds/new">
            <button className="gw-btn" style={{ width: 'auto', padding: '10px 18px' }}>
              Open a ground
            </button>
          </Link>
        </div>

        {isLoading && <div style={{ fontSize: 13, color: 'var(--gw-muted)', padding: '12px 0' }}>Loading…</div>}

        {!isLoading && grounds?.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 24px' }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--gw-text)', marginBottom: 8 }}>No grounds open yet</div>
            <div style={{ fontSize: 13, color: 'var(--gw-muted)', marginBottom: 20, lineHeight: 1.6, maxWidth: 360, margin: '0 auto 20px' }}>
              A ground is a structured process for two people to build a shared record. Start one when a situation needs clarity.
            </div>
            <Link to="/grounds/new"><button className="gw-btn" style={{ display: 'inline-block', width: 'auto', padding: '10px 24px' }}>Open a ground</button></Link>
          </div>
        )}

        {grounds?.map((g) => (
          <Link key={g.id} to={`/grounds/${g.id}`} style={{ textDecoration: 'none', display: 'block', marginBottom: 8 }}>
            <div style={{ background: 'white', border: '1px solid #E2E0DB', borderRadius: 6, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#1A1916', marginBottom: 3, display: 'flex', alignItems: 'center' }}>
                  {g.label}
                  {g.scenario && (
                    <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--gw-muted)', background: '#F5F3EF', border: '1px solid #E2E0DB', borderRadius: 4, padding: '1px 6px', marginLeft: 8 }}>
                      {g.scenario.replace(/_/g, ' ')}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: 'var(--gw-sub)' }}>
                  {g.participants?.length ?? 0} part{(g.participants?.length ?? 0) === 1 ? 'y' : 'ies'}
                </div>
              </div>
              <StatusPill status={g.status} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
