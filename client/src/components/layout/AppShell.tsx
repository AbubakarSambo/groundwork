import { useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth'

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

export function AppShell({ children }: AppShellProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const user = useAuthStore(s => s.user)
  const isAdmin = user?.role === 'ADMIN'
  const isPlatformAdmin = user?.isPlatformAdmin

  const path = location.pathname

  function navItem(label: string, href: string, exact = false) {
    const active = exact ? path === href : path.startsWith(href)
    return (
      <button
        onClick={() => navigate(href)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          width: '100%',
          padding: '8px 12px',
          borderRadius: 6,
          background: active ? 'var(--gw-blue-bg)' : 'transparent',
          color: active ? 'var(--gw-navy)' : 'var(--gw-sub)',
          fontSize: 13,
          fontWeight: active ? 600 : 400,
          border: 'none',
          cursor: 'pointer',
          fontFamily: 'inherit',
          textAlign: 'left',
          transition: 'all 0.12s',
        }}
      >
        {label}
      </button>
    )
  }

  const initials = user
    ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase() || '?'
    : '?'

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--gw-bg)' }}>
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
        <div style={{ padding: '16px 14px 12px', borderBottom: '0.5px solid var(--gw-border)' }}>
          <button
            onClick={() => navigate('/grounds')}
            style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}
          >
            <GroundworkMark size={18} />
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--gw-navy)', letterSpacing: '-.02em' }}>Groundwork</span>
          </button>
        </div>

        <nav style={{ flex: 1, padding: '10px 8px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
          {navItem('My grounds', '/grounds', true)}
          {isAdmin && navItem('New ground', '/grounds/new')}
          {navItem('Billing', '/billing')}
          {navItem('Profile', '/profile')}
          {isPlatformAdmin && navItem('Platform', '/admin')}
          {isPlatformAdmin && navItem('Prompts', '/prompts')}
        </nav>

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

      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>
    </div>
  )
}
