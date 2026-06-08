import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth'

const ROUTES = [
  { label: '/', path: '/' },
  { label: '/login', path: '/login' },
  { label: '/register', path: '/register' },
  { label: '/verify', path: '/verify-email?token=demo' },
  { label: '/grounds', path: '/' },
  { label: '/new ground', path: '/grounds/new' },
  { label: '/checkin', path: '/checkin/demo' },
  { label: '/alignment', path: '/alignment-feed' },
  { label: '/report', path: '/report/demo' },
  { label: '/dashboard', path: '/dashboard' },
  { label: '/prompts', path: '/prompts' },
  { label: '/invite', path: '/invite?token=demo' },
  { label: '/billing', path: '/billing/callback?status=success' },
]

const DEMO_ADMIN: import('@/types').User = {
  id: 'dev-admin',
  email: 'admin@demo.com',
  firstName: 'Dev',
  lastName: 'Admin',
  role: 'ADMIN',
  organizationId: 'demo-org',
  organizationName: 'Demo Org',
  isPlatformAdmin: true,
}

const DEMO_MEMBER: import('@/types').User = {
  id: 'dev-member',
  email: 'member@demo.com',
  firstName: 'Dev',
  lastName: 'Member',
  role: 'MEMBER',
  organizationId: 'demo-org',
  organizationName: 'Demo Org',
}

export function DevSkipPanel() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { setAuth, logout, user } = useAuthStore()

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          position: 'fixed', bottom: 12, right: 12, zIndex: 9999,
          background: '#0A1628', color: '#93C5FD', border: '1px solid #1e3a5f',
          borderRadius: 6, padding: '4px 10px', fontSize: 11, cursor: 'pointer',
          fontFamily: 'monospace', letterSpacing: '.05em',
        }}
      >
        DEV ↑
      </button>
    )
  }

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9999,
      background: '#0A1628', borderTop: '1px solid #1e3a5f',
      padding: '8px 12px', display: 'flex', alignItems: 'center',
      gap: 6, flexWrap: 'wrap', fontSize: 11, fontFamily: 'monospace',
    }}>
      {/* Routes */}
      <span style={{ color: '#4a6a8a', marginRight: 2 }}>JUMP→</span>
      {ROUTES.map(r => (
        <button
          key={r.path}
          onClick={() => navigate(r.path)}
          style={{
            background: location.pathname === r.path.split('?')[0] ? '#0C447C' : '#0f2035',
            color: location.pathname === r.path.split('?')[0] ? 'white' : '#93C5FD',
            border: '1px solid #1e3a5f',
            borderRadius: 4, padding: '2px 7px', cursor: 'pointer',
            fontSize: 11, fontFamily: 'monospace', whiteSpace: 'nowrap',
          }}
        >
          {r.label}
        </button>
      ))}

      {/* Divider */}
      <span style={{ color: '#1e3a5f', margin: '0 2px' }}>│</span>

      {/* Role */}
      <span style={{ color: '#4a6a8a' }}>ROLE→</span>
      <button
        onClick={() => user ? logout() : undefined}
        style={{
          background: !user ? '#0C447C' : '#0f2035',
          color: !user ? 'white' : '#93C5FD',
          border: '1px solid #1e3a5f', borderRadius: 4, padding: '2px 7px',
          cursor: 'pointer', fontSize: 11, fontFamily: 'monospace',
        }}
        title="No auth"
      >
        none
      </button>
      <button
        onClick={() => setAuth(DEMO_ADMIN, 'dev-token')}
        style={{
          background: user?.role === 'ADMIN' ? '#0C447C' : '#0f2035',
          color: user?.role === 'ADMIN' ? 'white' : '#93C5FD',
          border: '1px solid #1e3a5f', borderRadius: 4, padding: '2px 7px',
          cursor: 'pointer', fontSize: 11, fontFamily: 'monospace',
        }}
        title="Set admin"
      >
        admin
      </button>
      <button
        onClick={() => setAuth(DEMO_MEMBER, 'dev-token')}
        style={{
          background: user?.role === 'MEMBER' ? '#085041' : '#0f2035',
          color: user?.role === 'MEMBER' ? 'white' : '#5DCAA5',
          border: '1px solid #1e3a5f', borderRadius: 4, padding: '2px 7px',
          cursor: 'pointer', fontSize: 11, fontFamily: 'monospace',
        }}
        title="Set member"
      >
        member
      </button>

      {/* Status */}
      <span style={{ color: '#4a6a8a', fontSize: 10, marginLeft: 2 }}>
        {user ? `${user.email} (${user.role})` : 'no auth'}
      </span>

      {/* Collapse */}
      <button
        onClick={() => setOpen(false)}
        style={{
          marginLeft: 'auto', background: 'none', border: 'none',
          color: '#4a6a8a', cursor: 'pointer', fontSize: 12, fontFamily: 'monospace',
        }}
      >
        ×
      </button>
    </div>
  )
}
