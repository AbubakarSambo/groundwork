import { useState, useRef } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth'
import { apiClient } from '@/api/client'
import { groundsApi } from '@/api/grounds'
import { useEntryStore } from '@/stores/entry'
import type { Ground } from '@/types'

const NAV_ITEMS = [
  {
    label: 'Grounds',
    to: '/grounds',
    icon: (active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <rect x="2" y="2" width="7" height="7" rx="1.5" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" />
        <rect x="11" y="2" width="7" height="7" rx="1.5" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" />
        <rect x="2" y="11" width="7" height="7" rx="1.5" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" />
        <rect x="11" y="11" width="7" height="7" rx="1.5" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    label: 'Feed',
    to: '/feed',
    icon: (active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M3 5h14M3 10h10M3 15h7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        {active && <circle cx="16" cy="10" r="2.5" fill="currentColor" />}
        {!active && <circle cx="16" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5" />}
      </svg>
    ),
  },
  {
    label: 'Billing',
    to: '/billing',
    adminOnly: true,
    icon: (active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <rect x="2" y="5" width="16" height="11" rx="2" stroke="currentColor" strokeWidth="1.5" fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.12 : 0} />
        <path d="M2 8.5h16" stroke="currentColor" strokeWidth="1.5" />
        <rect x="4" y="11" width="3" height="2" rx="0.5" fill="currentColor" />
      </svg>
    ),
  },
  {
    label: 'Profile',
    to: '/profile',
    icon: (active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="7" r="3.5" stroke="currentColor" strokeWidth="1.5" fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.15 : 0} />
        <path d="M3 17c0-3.314 3.134-6 7-6s7 2.686 7 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
]

type FbTab = 'reaction' | 'build' | 'wrong'

const REACTION_OPTIONS = ['This clicked', 'I could see myself using this', 'Interesting but I am not sure', 'Not for me']
const BUILD_OPTIONS    = ['Reminder / email nudge', 'Mobile app', 'Slack integration', 'Better reports', 'More templates', 'Team analytics']

function FeedbackWidget() {
  const location = useLocation()
  const isChatPage = location.pathname.startsWith('/chat/') || location.pathname.startsWith('/checkin/')
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<FbTab>('reaction')
  const [reaction, setReaction] = useState('')
  const [buildPick, setBuildPick] = useState('')
  const [buildDetail, setBuildDetail] = useState('')
  const [wrongText, setWrongText] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [sent, setSent] = useState(false)

  function valid() {
    if (tab === 'reaction') return !!reaction
    if (tab === 'build')    return !!buildPick
    if (tab === 'wrong')    return wrongText.trim().length > 4
    return false
  }

  async function submit() {
    const payload = {
      tab,
      reaction: tab === 'reaction' ? reaction : undefined,
      buildPick: tab === 'build' ? buildPick : undefined,
      buildDetail: tab === 'build' ? buildDetail : undefined,
      wrongText: tab === 'wrong' ? wrongText : undefined,
      contactEmail: contactEmail || undefined,
    }
    try { await apiClient.post('/feedback', payload) } catch { /* swallow — best effort */ }
    setSent(true)
    setTimeout(() => { setOpen(false); setSent(false); setReaction(''); setBuildPick(''); setBuildDetail(''); setWrongText(''); setContactEmail('') }, 1800)
  }

  const tabLabel = { reaction: 'Reaction', build: 'Build request', wrong: 'Something went wrong' }

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          position: 'fixed',
          ...(isChatPage ? { top: 12, right: 16 } : { bottom: 20, right: 20 }),
          zIndex: 100,
          background: 'var(--gw-navy)', color: 'white', border: 'none',
          borderRadius: 20, padding: '8px 14px', fontSize: 12, fontWeight: 600,
          cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6,
          boxShadow: '0 2px 8px rgba(0,0,0,.2)',
        }}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M7 1C3.686 1 1 3.462 1 6.5c0 1.41.56 2.694 1.48 3.662L1.5 13l2.98-1.334A6.2 6.2 0 0 0 7 12c3.314 0 6-2.462 6-5.5S10.314 1 7 1Z" stroke="white" strokeWidth="1.3" fill="none"/>
        </svg>
        Feedback
      </button>

      {/* Overlay */}
      {open && (
        <div
          onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 0 }}
        >
          <div style={{ background: 'white', borderRadius: '12px 12px 0 0', padding: 20, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto' }}>
            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--gw-border)', marginBottom: 16 }}>
              {(['reaction', 'build', 'wrong'] as FbTab[]).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  style={{
                    flex: 1, padding: '10px 4px', background: 'none', border: 'none',
                    borderBottom: tab === t ? '2px solid var(--gw-navy)' : '2px solid transparent',
                    fontSize: 11, fontWeight: 600,
                    color: tab === t ? 'var(--gw-text)' : 'rgba(0,0,0,.38)',
                    cursor: 'pointer', fontFamily: 'inherit', textAlign: 'center', lineHeight: 1.3,
                  }}
                >
                  {tabLabel[t]}
                </button>
              ))}
            </div>

            {sent ? (
              <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--gw-green-t)', fontWeight: 600, fontSize: 14 }}>
                Thanks — noted ✓
              </div>
            ) : (
              <>
                {tab === 'reaction' && (
                  <>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                      {REACTION_OPTIONS.map(o => (
                        <button
                          key={o}
                          onClick={() => setReaction(o)}
                          style={{
                            padding: '6px 11px', borderRadius: 20, fontSize: 12,
                            border: '1px solid rgba(0,0,0,.14)', background: reaction === o ? 'var(--gw-navy)' : 'none',
                            color: reaction === o ? 'white' : 'rgba(0,0,0,.55)',
                            cursor: 'pointer', fontFamily: 'inherit', lineHeight: 1.3,
                          }}
                        >
                          {o}
                        </button>
                      ))}
                    </div>
                    <input type="email" placeholder="Email (optional — if you want a reply)" value={contactEmail} onChange={e => setContactEmail(e.target.value)}
                      style={{ width: '100%', border: '1px solid var(--gw-border)', borderRadius: 6, padding: '10px 12px', fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: 10, outline: 'none' }} />
                  </>
                )}

                {tab === 'build' && (
                  <>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                      {BUILD_OPTIONS.map(o => (
                        <button
                          key={o}
                          onClick={() => setBuildPick(o)}
                          style={{
                            padding: '6px 11px', borderRadius: 20, fontSize: 12,
                            border: '1px solid rgba(0,0,0,.14)', background: buildPick === o ? 'var(--gw-navy)' : 'none',
                            color: buildPick === o ? 'white' : 'rgba(0,0,0,.55)',
                            cursor: 'pointer', fontFamily: 'inherit', lineHeight: 1.3,
                          }}
                        >
                          {o}
                        </button>
                      ))}
                    </div>
                    <textarea placeholder="Any detail on what you need" value={buildDetail} onChange={e => setBuildDetail(e.target.value)}
                      style={{ width: '100%', border: '1px solid var(--gw-border)', borderRadius: 6, padding: '10px 12px', fontSize: 13, fontFamily: 'inherit', resize: 'vertical', minHeight: 60, boxSizing: 'border-box', marginBottom: 10, outline: 'none' }} />
                  </>
                )}

                {tab === 'wrong' && (
                  <>
                    <textarea placeholder="Tell us what happened" value={wrongText} onChange={e => setWrongText(e.target.value)}
                      style={{ width: '100%', border: '1px solid var(--gw-border)', borderRadius: 6, padding: '10px 12px', fontSize: 13, fontFamily: 'inherit', resize: 'vertical', minHeight: 100, boxSizing: 'border-box', marginBottom: 10, outline: 'none' }} />
                    <input type="email" placeholder="Email (optional — if you want a reply)" value={contactEmail} onChange={e => setContactEmail(e.target.value)}
                      style={{ width: '100%', border: '1px solid var(--gw-border)', borderRadius: 6, padding: '10px 12px', fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: 10, outline: 'none' }} />
                  </>
                )}

                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <button onClick={() => setOpen(false)}
                    style={{ padding: '11px 16px', background: 'none', color: 'var(--gw-sub)', border: '1px solid var(--gw-border)', borderRadius: 6, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>
                    Cancel
                  </button>
                  <button onClick={submit} disabled={!valid()}
                    style={{ flex: 1, padding: 11, background: 'var(--gw-navy)', color: 'white', border: 'none', borderRadius: 6, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: valid() ? 1 : 0.38 }}>
                    Send
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}

function NavItem({ item, compact }: { item: typeof NAV_ITEMS[0]; compact?: boolean }) {
  const location = useLocation()
  const active = location.pathname.startsWith(item.to)
  const user = useAuthStore(s => s.user)
  if (item.adminOnly && user?.role !== 'ADMIN') return null

  if (compact) {
    return (
      <NavLink
        to={item.to}
        style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
          padding: '6px 12px', borderRadius: 10, color: active ? '#93C5FD' : 'rgba(255,255,255,.45)',
          textDecoration: 'none', fontSize: 10, fontWeight: active ? 700 : 500,
          background: active ? 'rgba(147,197,253,.1)' : 'transparent', flex: 1,
        }}
      >
        {item.icon(active)}
        {item.label}
      </NavLink>
    )
  }

  return (
    <NavLink
      to={item.to}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '9px 14px', borderRadius: 10, color: active ? '#085041' : '#374151',
        textDecoration: 'none', fontSize: 14, fontWeight: active ? 700 : 500,
        background: active ? 'rgba(8,80,65,0.09)' : 'transparent', transition: 'background 0.15s, color 0.15s',
      }}
      onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'rgba(8,80,65,0.05)' }}
      onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
    >
      {item.icon(active)}
      {item.label}
    </NavLink>
  )
}

function GroundStatusBadge({ status }: { status: string }) {
  const isReady = status === 'REPORT_READY'
  const isActive = status === 'ACTIVE'
  const color = isReady ? '#065f46' : isActive ? '#085041' : '#6B7280'
  const bg = isReady ? 'rgba(6,95,70,.1)' : isActive ? 'rgba(8,80,65,.08)' : 'rgba(107,114,128,.08)'
  const label = isReady ? 'Report ready' : isActive ? 'Active' : status.charAt(0) + status.slice(1).toLowerCase().replace(/_/g, ' ')
  return (
    <span style={{ fontSize: 10, fontWeight: 600, color, background: bg, borderRadius: 4, padding: '2px 6px' }}>
      {label}
    </span>
  )
}

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const renameRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const qc = useQueryClient()
  const user = useAuthStore(s => s.user)
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  const { data: grounds = [] } = useQuery<Ground[]>({
    queryKey: ['grounds'],
    queryFn: groundsApi.list,
    staleTime: 30_000,
    enabled: isAuthenticated,
  })

  const location = useLocation()
  const isEntryPage = !isAuthenticated && location.pathname === '/start'
  const { groundName, setGroundName, sessions } = useEntryStore()
  const [renamingEntry, setRenamingEntry] = useState(false)
  const [entryRenameVal, setEntryRenameVal] = useState('')
  const entryRenameRef = useRef<HTMLInputElement>(null)

  const marketingUrl = import.meta.env.VITE_MARKETING_URL ?? 'https://myground.work'
  const initials = user ? (user.firstName?.[0] ?? user.email?.[0] ?? 'U').toUpperCase() : 'U'

  function startRename(g: Ground) {
    setRenamingId(g.id)
    setRenameValue(g.label)
    setTimeout(() => renameRef.current?.select(), 50)
  }

  async function commitRename(id: string) {
    const val = renameValue.trim()
    if (val) {
      await groundsApi.update(id, { label: val })
      qc.invalidateQueries({ queryKey: ['grounds'] })
    }
    setRenamingId(null)
  }

  const sidebarWidth = collapsed ? 60 : 240

  return (
    <>
      <aside
        className="gw-sidebar-desktop"
        style={{
          position: 'fixed', top: 0, left: 0, width: sidebarWidth, height: '100vh',
          background: '#0D1A2B', borderRight: '1px solid rgba(255,255,255,.07)',
          display: 'flex', flexDirection: 'column', zIndex: 40,
          transition: 'width .2s ease', overflow: 'hidden',
        }}
      >
        {/* Logo + collapse */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 14px 12px', flexShrink: 0 }}>
          {!collapsed && (
            <a href={marketingUrl} style={{ fontSize: 15, fontWeight: 800, color: 'rgba(255,255,255,.92)', letterSpacing: '-0.3px', textDecoration: 'none', whiteSpace: 'nowrap' }}>
              Groundwork
            </a>
          )}
          <button
            onClick={() => setCollapsed(v => !v)}
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,.35)', cursor: 'pointer', fontSize: 14, padding: '2px 4px', fontFamily: 'inherit', marginLeft: collapsed ? 'auto' : 0, marginRight: collapsed ? 'auto' : 0 }}
            title={collapsed ? 'Expand menu' : 'Collapse menu'}
          >
            {collapsed ? '»' : '«'}
          </button>
        </div>

        {/* New ground button */}
        <div style={{ padding: collapsed ? '0 8px 10px' : '0 10px 10px', flexShrink: 0 }}>
          <button
            onClick={() => navigate('/grounds/new')}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 7,
              padding: collapsed ? '8px' : '8px 12px', borderRadius: 8,
              background: 'rgba(26,86,219,.18)', border: '1px solid rgba(26,86,219,.3)',
              color: '#93C5FD', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              fontFamily: 'inherit', justifyContent: collapsed ? 'center' : 'flex-start',
            }}
          >
            <span style={{ fontSize: 16, lineHeight: 1 }}>+</span>
            {!collapsed && <span>New ground</span>}
          </button>
        </div>

        {/* Grounds list */}
        {!collapsed && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px' }}>
            {/* Entry ground shown when unauthenticated on /start */}
            {isEntryPage && (
              <div style={{ padding: '9px 10px', borderRadius: 8, background: 'rgba(255,255,255,.09)', marginBottom: 6 }}>
                {renamingEntry ? (
                  <input
                    ref={entryRenameRef}
                    value={entryRenameVal}
                    onChange={e => setEntryRenameVal(e.target.value)}
                    onBlur={() => { setGroundName(entryRenameVal.trim() || groundName); setRenamingEntry(false) }}
                    onKeyDown={e => {
                      if (e.key === 'Enter') { setGroundName(entryRenameVal.trim() || groundName); setRenamingEntry(false) }
                      if (e.key === 'Escape') setRenamingEntry(false)
                    }}
                    autoFocus
                    style={{ width: '100%', background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.2)', borderRadius: 4, color: 'rgba(255,255,255,.92)', fontSize: 13, fontWeight: 600, padding: '3px 7px', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
                  />
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,.92)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{groundName}</span>
                    <button
                      onClick={() => { setEntryRenameVal(groundName); setRenamingEntry(true); setTimeout(() => entryRenameRef.current?.select(), 40) }}
                      style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,.25)', cursor: 'pointer', fontSize: 11, padding: '0 2px', fontFamily: 'inherit' }}
                      title="Rename"
                    >✎</button>
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,.4)' }}>1/{sessions} sessions</span>
                  <span style={{ fontSize: 10, fontWeight: 600, color: '#34d399', background: 'rgba(52,211,153,.12)', borderRadius: 4, padding: '2px 6px' }}>In progress</span>
                </div>
              </div>
            )}
            {!isEntryPage && grounds.length === 0 && (
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,.3)', padding: '8px 6px' }}>No grounds yet</div>
            )}
            {grounds.map(g => {
              const sessions = g.checkIns?.length ?? 0
              const maxSessions = (g as any).maxSessions ?? (g.timelineDays ? Math.ceil(g.timelineDays / 14) : null)
              return (
                <div key={g.id} style={{ marginBottom: 2, borderRadius: 8, overflow: 'hidden' }}>
                  <NavLink
                    to={`/grounds/${g.id}`}
                    style={({ isActive }) => ({
                      display: 'block', padding: renamingId === g.id ? '6px 10px 4px' : '9px 10px 6px', borderRadius: 8,
                      textDecoration: 'none',
                      background: isActive ? 'rgba(255,255,255,.09)' : 'transparent',
                    })}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,.07)')}
                    onMouseLeave={e => {
                      const loc = window.location.pathname
                      if (!loc.includes(g.id)) e.currentTarget.style.background = 'transparent'
                    }}
                  >
                    {/* Label row with rename */}
                    {renamingId === g.id ? (
                      <input
                        ref={renameRef}
                        value={renameValue}
                        onChange={e => setRenameValue(e.target.value)}
                        onBlur={() => commitRename(g.id)}
                        onKeyDown={e => { if (e.key === 'Enter') commitRename(g.id); if (e.key === 'Escape') setRenamingId(null) }}
                        onClick={e => e.preventDefault()}
                        style={{ width: '100%', background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.2)', borderRadius: 4, color: 'rgba(255,255,255,.92)', fontSize: 13, fontWeight: 600, padding: '3px 7px', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
                      />
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,.88)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                          {g.label}
                        </span>
                        <button
                          onClick={e => { e.preventDefault(); e.stopPropagation(); startRename(g) }}
                          title="Rename"
                          style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,.2)', cursor: 'pointer', padding: '0 2px', fontSize: 11, lineHeight: 1, flexShrink: 0, fontFamily: 'inherit' }}
                        >✎</button>
                      </div>
                    )}

                    {/* Confidence + sessions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                      {g.confidence != null && (
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,.45)' }}>
                          {Math.round(g.confidence * 100)}% · {sessions}{maxSessions ? `/${maxSessions}` : ''} sessions
                        </span>
                      )}
                      {g.confidence == null && (
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,.35)' }}>{sessions}{maxSessions ? `/${maxSessions}` : ''} sessions</span>
                      )}
                      <GroundStatusBadge status={g.status} />
                    </div>
                  </NavLink>
                </div>
              )
            })}
          </div>
        )}

        {/* Collapsed: nav icons */}
        {collapsed && (
          <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '4px 0' }}>
            {NAV_ITEMS.map(item => {
              const active = window.location.pathname.startsWith(item.to)
              return (
                <NavLink key={item.to} to={item.to} title={item.label}
                  style={{ color: active ? '#93C5FD' : 'rgba(255,255,255,.4)', padding: '8px', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  {item.icon(active)}
                </NavLink>
              )
            })}
          </nav>
        )}

        {/* Nav items — always visible in expanded sidebar */}
        {!collapsed && (
          <nav style={{ padding: '6px 8px', borderTop: '1px solid rgba(255,255,255,.07)', flexShrink: 0 }}>
            {NAV_ITEMS.filter(item => !item.adminOnly).map(item => {
              const active = location.pathname.startsWith(item.to)
              const canNav = isAuthenticated
              return (
                <NavLink
                  key={item.to}
                  to={canNav ? item.to : '/auth'}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 10px', borderRadius: 8, textDecoration: 'none',
                    color: active ? '#93C5FD' : canNav ? 'rgba(255,255,255,.55)' : 'rgba(255,255,255,.25)',
                    background: active ? 'rgba(147,197,253,.08)' : 'transparent',
                    fontSize: 13, fontWeight: active ? 600 : 400,
                    pointerEvents: canNav ? 'auto' : 'none',
                  }}
                >
                  {item.icon(active)}
                  <span>{item.label}</span>
                </NavLink>
              )
            })}
          </nav>
        )}

        {/* User profile / sign in */}
        <div style={{ padding: collapsed ? '10px 8px' : '10px 12px', borderTop: '1px solid rgba(255,255,255,.07)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
          {isAuthenticated ? (
            <>
              <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#1A56DB', color: 'white', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {initials}
              </div>
              {!collapsed && (
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,.88)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user?.firstName ? `${user.firstName} ${user.lastName ?? ''}`.trim() : user?.email ?? ''}
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,.38)', textTransform: 'capitalize' }}>{(user?.role ?? '').toLowerCase()}</div>
                </div>
              )}
            </>
          ) : (
            !collapsed && (
              <button
                onClick={() => navigate('/auth')}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.12)', color: 'rgba(255,255,255,.7)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}
              >
                Sign in →
              </button>
            )
          )}
        </div>
      </aside>

      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, height: 60,
        background: '#0D1A2B', borderTop: '1px solid rgba(255,255,255,.07)',
        display: 'flex', alignItems: 'center', zIndex: 40,
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
        className="gw-sidebar-mobile"
      >
        {NAV_ITEMS.map(item => <NavItem key={item.to} item={item} compact />)}
      </nav>
    </>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  const location = useLocation()
  const showSidebar = isAuthenticated || location.pathname === '/start'

  if (!showSidebar) return <>{children}</>

  return (
    <>
      <AppSidebar />
      <div className="gw-main-content">
        {children}
      </div>
      <FeedbackWidget />

      <style>{`
        @media (max-width: 640px) {
          .gw-sidebar-desktop { display: none !important; }
          .gw-sidebar-mobile  { display: flex !important; }
          .gw-main-content    { margin-left: 0 !important; padding-bottom: calc(60px + env(safe-area-inset-bottom)); }
        }
        @media (min-width: 641px) {
          .gw-sidebar-desktop { display: flex !important; }
          .gw-sidebar-mobile  { display: none !important; }
          .gw-main-content    { margin-left: 240px; min-height: 100vh; }
        }
      `}</style>
    </>
  )
}
