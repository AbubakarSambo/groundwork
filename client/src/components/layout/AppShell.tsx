import { useNavigate, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth'
import { groundsApi } from '@/api/grounds'
import type { Ground } from '@/types'

interface AppShellProps {
  children: React.ReactNode
}

function GroundworkMark({ size = 18 }: { size?: number }) {
  const h = Math.round(size * 14 / 18)
  return (
    <svg width={size} height={h} viewBox="0 0 22 17" fill="none">
      <rect x="5" y="0" width="12" height="3" rx="1.5" fill="#0C447C" opacity="0.45" />
      <rect x="2" y="6" width="18" height="3" rx="1.5" fill="#0C447C" opacity="0.72" />
      <rect x="0" y="12" width="22" height="3" rx="1.5" fill="#0C447C" />
    </svg>
  )
}

function ConfDots({ score }: { score?: number }) {
  const n = score ?? 0
  return (
    <div className="gw-conf-dots">
      {[1,2,3,4,5].map(i => (
        <div key={i} className={`gw-conf-dot${n >= i ? ` f${i}` : ''}`} />
      ))}
    </div>
  )
}

const STATUS_WORD: Record<string, string> = {
  OPEN: 'open',
  AWAITING_PARTIES: 'pending',
  REPORT_READY: 'report ready',
  ACTIVE: 'active',
  RESOLVED: 'resolved',
  STALLED: 'stalled',
  PAUSED: 'paused',
  CLOSED: 'closed',
}

export function AppShell({ children }: AppShellProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const user = useAuthStore(s => s.user)
  const isAdmin = user?.role === 'ADMIN'
  const isPlatformAdmin = user?.isPlatformAdmin

  const { data: grounds = [] } = useQuery<Ground[]>({
    queryKey: ['grounds'],
    queryFn: groundsApi.list,
  })

  const path = location.pathname
  // Ground detail pages render their own panel-switching tab bar
  const suppressMobileTabs = /^\/grounds\/[^/]+$/.test(path)

  const initials = user
    ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase() || '?'
    : '?'

  const parties = (g: Ground) => {
    const emails = g.participants.map(p => p.email.split('@')[0])
    return emails.slice(0, 2).join(' + ')
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--gw-bg)' }}>
      {/* Sidebar */}
      <div
        className="gw-sidebar"
        style={{
          width: 220,
          minWidth: 220,
          background: 'white',
          borderRight: '0.5px solid var(--gw-border)',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
        }}
      >
        {/* Logo */}
        <div style={{ padding: '16px 14px 12px', borderBottom: '0.5px solid var(--gw-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button
            onClick={() => navigate('/grounds')}
            style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}
          >
            <GroundworkMark size={18} />
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--gw-navy)', letterSpacing: '-.02em' }}>Groundwork</span>
          </button>
        </div>

        {/* New ground button */}
        {isAdmin && (
          <div style={{ padding: '10px 10px 6px' }}>
            <button
              onClick={() => navigate('/grounds/new')}
              style={{ width: '100%', padding: '7px 12px', borderRadius: 6, background: 'var(--gw-navy)', color: 'white', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'center' }}
            >
              + New ground
            </button>
          </div>
        )}

        {/* Ground list */}
        <nav style={{ flex: 1, padding: '4px 8px', display: 'flex', flexDirection: 'column', gap: 1, overflowY: 'auto' }}>
          {grounds.length === 0 && (
            <div style={{ fontSize: 12, color: 'var(--gw-muted)', padding: '12px 8px', lineHeight: 1.5 }}>
              No grounds yet.
            </div>
          )}
          {grounds.map(g => {
            const isInitiator = g.participants.some(p => p.userId === user?.id && p.partyType === 'INITIATOR')
            const groundUrl = isInitiator ? `/grounds/${g.id}` : `/grounds/${g.id}/p`
            const active = path.startsWith(`/grounds/${g.id}`)
            return (
              <button
                key={g.id}
                onClick={() => navigate(groundUrl)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: 6,
                  background: active ? 'var(--gw-blue-bg)' : 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  textAlign: 'left',
                  transition: 'background 0.1s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: active ? 600 : 400, color: active ? 'var(--gw-navy)' : 'var(--gw-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.3 }}>
                      {g.label}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--gw-muted)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {parties(g)}
                    </div>
                    <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 5 }}>
                      <ConfDots score={g.confidence} />
                      <span style={{ fontSize: 10, color: 'var(--gw-muted)' }}>{STATUS_WORD[g.status] ?? g.status.toLowerCase()}</span>
                    </div>
                  </div>
                </div>
              </button>
            )
          })}

          {/* Extra nav items */}
          <div style={{ marginTop: 8, paddingTop: 8, borderTop: '0.5px solid var(--gw-border)' }}>
            {[
              { label: 'Billing', href: '/billing' },
              { label: 'Profile', href: '/profile' },
              ...(isPlatformAdmin ? [{ label: 'Platform', href: '/admin' }, { label: 'Prompts', href: '/prompts' }] : []),
            ].map(item => {
              const active = path.startsWith(item.href)
              return (
                <button
                  key={item.href}
                  onClick={() => navigate(item.href)}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '7px 10px',
                    borderRadius: 6,
                    background: active ? 'var(--gw-blue-bg)' : 'transparent',
                    color: active ? 'var(--gw-navy)' : 'var(--gw-sub)',
                    fontSize: 12,
                    fontWeight: active ? 600 : 400,
                    border: 'none',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    textAlign: 'left',
                    transition: 'all 0.12s',
                  }}
                >
                  {item.label}
                </button>
              )
            })}
          </div>
        </nav>

        {/* Profile / sign out */}
        <div style={{ padding: '10px 12px', borderTop: '0.5px solid var(--gw-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 8 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: 'var(--gw-blue-bg)',
                color: 'var(--gw-navy)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 10,
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {initials}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--gw-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.firstName} {user?.lastName}
              </div>
              <div style={{ fontSize: 10, color: 'var(--gw-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.email}
              </div>
            </div>
          </div>
          <button
            onClick={() => { useAuthStore.getState().logout(); navigate('/') }}
            style={{ width: '100%', padding: '6px 8px', borderRadius: 6, background: 'transparent', color: 'var(--gw-sub)', fontSize: 12, border: '0.5px solid var(--gw-border)', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'center' }}
          >
            Sign out
          </button>
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>

      {/* Mobile bottom tab bar (shown below 640px, suppressed on ground detail pages) */}
      <div className="gw-mobile-tabs" style={suppressMobileTabs ? { display: 'none' } : {}}>
        <button
          onClick={() => navigate('/grounds')}
          className={path === '/grounds' ? 'gw-mobile-tab active' : 'gw-mobile-tab'}
        >
          <span style={{ fontSize: 18 }}>&#9776;</span>
          <span>Grounds</span>
        </button>
        {isAdmin && (
          <button
            onClick={() => navigate('/grounds/new')}
            className={path === '/grounds/new' ? 'gw-mobile-tab active' : 'gw-mobile-tab'}
          >
            <span style={{ fontSize: 20 }}>+</span>
            <span>New</span>
          </button>
        )}
        <button
          onClick={() => navigate('/profile')}
          className={path.startsWith('/profile') ? 'gw-mobile-tab active' : 'gw-mobile-tab'}
        >
          <span style={{ fontSize: 14, fontWeight: 700 }}>{initials}</span>
          <span>Profile</span>
        </button>
      </div>
    </div>
  )
}
