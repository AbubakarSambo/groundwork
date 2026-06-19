import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth'
import { groundsApi } from '@/api/grounds'
import { ConfDots } from '@/components/ConfDots'
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

function groundNotif(g: Ground): 'report-ready' | 'overdue' | 'submitted' | null {
  if (g.status === 'REPORT_READY') return 'report-ready'
  if ((g.overdue ?? 0) > 0) return 'overdue'
  const nonInitiatorIds = new Set(
    g.participants.filter(p => p.partyType !== 'INITIATOR').map(p => p.id)
  )
  if (nonInitiatorIds.size > 0 && (g.checkIns ?? []).some(
    c => nonInitiatorIds.has(c.participantId) && c.status === 'COMPLETED'
  )) return 'submitted'
  return null
}

const NOTIF_COLOR: Record<string, string> = {
  'report-ready': 'var(--gw-green-b)',
  'overdue': 'var(--gw-amber-b)',
  'submitted': 'var(--gw-navy)',
}

export function AppShell({ children }: AppShellProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const user = useAuthStore(s => s.user)
  const isAdmin = user?.role === 'ADMIN'
  const isPlatformAdmin = user?.isPlatformAdmin
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    document.body.classList.toggle('gw-sb-collapsed', collapsed)
    return () => document.body.classList.remove('gw-sb-collapsed')
  }, [collapsed])

  const { data: grounds = [] } = useQuery<Ground[]>({
    queryKey: ['grounds'],
    queryFn: groundsApi.list,
  })

  const path = location.pathname

  const suppressMobileTabs =
    /^\/grounds\/[^/]+$/.test(path) || /^\/(chat|checkin)\//.test(path)

  const initials = user
    ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase() || '?'
    : '?'

  const roleLabel = isAdmin ? 'Admin' : 'Contributor'

  const parties = (g: Ground) => {
    const emails = g.participants
      .filter(p => p.partyType !== 'INITIATOR')
      .map(p => p.email.split('@')[0])
    if (emails.length === 0) {
      return g.participants.map(p => p.email.split('@')[0]).slice(0, 2).join(' + ')
    }
    return emails.slice(0, 2).join(' + ')
  }

  return (
    <div style={{ height: '100vh', background: 'var(--gw-bg)' }}>

      {/* Sidebar — fixed, slides off-screen when collapsed */}
      <div
        className="gw-sidebar"
        style={{
          background: 'white',
          borderRight: '0.5px solid var(--gw-border)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Logo + collapse toggle */}
        <div style={{ padding: '16px 14px 12px', borderBottom: '0.5px solid var(--gw-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <button
            onClick={() => navigate('/grounds')}
            style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}
          >
            <GroundworkMark size={18} />
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--gw-navy)', letterSpacing: '-.02em' }}>Groundwork</span>
          </button>
          <button className="gw-sb-collapse" onClick={() => setCollapsed(true)} title="Collapse sidebar">«</button>
        </div>

        {/* New ground button */}
        {isAdmin && (
          <div style={{ padding: '10px 10px 6px', flexShrink: 0 }}>
            <button
              onClick={() => navigate('/grounds/new')}
              style={{ width: '100%', padding: '7px 12px', borderRadius: 6, background: 'var(--gw-navy)', color: 'white', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
            >
              <span>New ground</span>
              <span>+</span>
            </button>
          </div>
        )}

        {/* Ground list — scrolls within the sidebar */}
        <nav style={{ flex: 1, padding: '4px 8px', display: 'flex', flexDirection: 'column', gap: 1, overflowY: 'auto', minHeight: 0 }}>
          {grounds.length === 0 && (
            <div style={{ fontSize: 12, color: 'var(--gw-muted)', padding: '12px 8px', lineHeight: 1.5 }}>
              No grounds yet.
            </div>
          )}
          {grounds.map(g => {
            const isInitiator = g.participants.some(p => p.userId === user?.id && p.partyType === 'INITIATOR')
            const groundUrl = isInitiator ? `/grounds/${g.id}` : `/grounds/${g.id}/p`
            const active = path.startsWith(`/grounds/${g.id}`)
            const notif = groundNotif(g)
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
                  flexShrink: 0,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
                      <div style={{ fontSize: 12, fontWeight: active ? 600 : 400, color: active ? 'var(--gw-navy)' : 'var(--gw-text)', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.3 }}>
                        {g.label}
                      </div>
                      {notif && (
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: NOTIF_COLOR[notif], flexShrink: 0 }} />
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--gw-muted)', marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {parties(g)}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <ConfDots score={g.confidence} />
                      <span style={{ fontSize: 10, color: 'var(--gw-muted)' }}>{STATUS_WORD[g.status] ?? g.status.toLowerCase()}</span>
                    </div>
                  </div>
                </div>
              </button>
            )
          })}

          {/* Platform admin tools */}
          {isPlatformAdmin && (
            <div style={{ marginTop: 8, paddingTop: 8, borderTop: '0.5px solid var(--gw-border)' }}>
              {[{ label: 'Platform', href: '/admin' }, { label: 'Prompts', href: '/prompts' }].map(item => {
                const itemActive = path.startsWith(item.href)
                return (
                  <button
                    key={item.href}
                    onClick={() => navigate(item.href)}
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '7px 10px',
                      borderRadius: 6,
                      background: itemActive ? 'var(--gw-blue-bg)' : 'transparent',
                      color: itemActive ? 'var(--gw-navy)' : 'var(--gw-sub)',
                      fontSize: 12,
                      fontWeight: itemActive ? 600 : 400,
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
          )}
        </nav>

        {/* Profile footer — links to billing */}
        <div style={{ padding: '10px 12px', borderTop: '0.5px solid var(--gw-border)', flexShrink: 0 }}>
          <button
            onClick={() => navigate('/billing')}
            style={{ display: 'flex', alignItems: 'center', gap: 9, width: '100%', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0, marginBottom: 8, textAlign: 'left' }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: 'var(--gw-navy)',
                color: 'white',
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
            <div style={{ overflow: 'hidden', minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--gw-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.firstName} {user?.lastName}
              </div>
              <div style={{ fontSize: 10, color: 'var(--gw-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {roleLabel}
              </div>
            </div>
            {isAdmin && (
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--gw-amber-b)', flexShrink: 0 }} />
            )}
          </button>
          <button
            onClick={() => { useAuthStore.getState().logout(); navigate('/') }}
            style={{ width: '100%', padding: '6px 8px', borderRadius: 6, background: 'transparent', color: 'var(--gw-sub)', fontSize: 12, border: '0.5px solid var(--gw-border)', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'center' }}
          >
            Sign out
          </button>
        </div>
      </div>

      {/* Reopen button — fades in when sidebar is collapsed */}
      <button className="gw-sb-reopen" onClick={() => setCollapsed(false)} title="Open sidebar">»</button>

      {/* Main content */}
      <div className="gw-main">
        {children}
      </div>

      {/* Mobile bottom tab bar */}
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
