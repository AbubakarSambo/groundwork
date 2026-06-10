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
          <div style={{ background: 'white', border: '1px solid #E2E0DB', borderRadius: 6, padding: '40px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: 14, color: 'var(--gw-muted)', marginBottom: 8 }}>No grounds yet.</div>
            <div style={{ fontSize: 12, color: 'var(--gw-muted)', marginBottom: 16 }}>
              Open one when something starts — a hire, a cofounder, a project.
            </div>
            <Link to="/grounds/new">
              <button className="gw-btn" style={{ width: 'auto', display: 'inline-block', padding: '10px 20px' }}>
                Open your first ground
              </button>
            </Link>
          </div>
        )}

        {grounds?.map((g) => (
          <Link key={g.id} to={`/grounds/${g.id}`} style={{ textDecoration: 'none', display: 'block', marginBottom: 8 }}>
            <div style={{ background: 'white', border: '1px solid #E2E0DB', borderRadius: 6, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#1A1916', marginBottom: 3 }}>{g.label}</div>
                <div style={{ fontSize: 12, color: 'var(--gw-sub)' }}>
                  {g.scenario.replace(/_/g, ' ').toLowerCase()} · {g.participants?.length ?? 0} part{(g.participants?.length ?? 0) === 1 ? 'y' : 'ies'}
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
