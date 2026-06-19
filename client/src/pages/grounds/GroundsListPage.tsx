import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { groundsApi } from '@/api/grounds'
import { useAuthStore } from '@/stores/auth'
import { ConfDots } from '@/components/ConfDots'
import type { Ground } from '@/types'

const MODE_COLORS: Record<string, { bg: string; color: string }> = {
  Starting:       { bg: '#E8F8F5', color: '#085041' },
  Recognition:    { bg: '#FDF3E3', color: '#8A5C1A' },
  Resolution:     { bg: '#EEF4FB', color: '#0C447C' },
  'Multi-party':  { bg: '#EEF4FB', color: '#0C447C' },
  Accountability: { bg: '#FCEBEB', color: '#791F1F' },
}

function GroundCard({ g, onClick }: { g: Ground; onClick: () => void }) {
  const mc = MODE_COLORS[g.label] ?? { bg: '#EEF4FB', color: '#0C447C' }
  return (
    <div className="gw-ground-card" onClick={onClick}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 3 }}>{g.label}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: mc.bg, color: mc.color }}>{g.moment}</span>
            {g.status === 'ACTIVE' && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--gw-green-b)', display: 'inline-block' }} />}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <ConfDots score={g.confidence} />
          <div style={{ fontSize: 10, color: 'var(--gw-sub)', marginTop: 3 }}>{g.confidence ?? 0}/5</div>
        </div>
      </div>
      {g.brief && <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.5, marginBottom: 10 }}>{g.brief}</div>}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 11, color: 'var(--gw-sub)' }}>
          {g.participants.length} participant{g.participants.length !== 1 ? 's' : ''}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {(g.overdue ?? 0) > 0 && <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--gw-amber-t)', background: 'var(--gw-amber-bg)', borderRadius: 20, padding: '2px 8px' }}>{g.overdue} overdue</span>}
          {g.status === 'REPORT_READY' && <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--gw-green-t)', background: 'var(--gw-green-bg)', borderRadius: 20, padding: '2px 8px' }}>Report ready</span>}
          {g.daysLeft != null && <span style={{ fontSize: 11, color: 'var(--gw-sub)' }}>{g.daysLeft}d left</span>}
        </div>
      </div>
    </div>
  )
}

export function GroundsListPage() {
  const navigate = useNavigate()
  const user = useAuthStore(s => s.user)
  const isAdmin = user?.role === 'ADMIN'

  const { data: grounds = [], isLoading } = useQuery({
    queryKey: ['grounds'],
    queryFn: groundsApi.list,
    enabled: !!user,
  })

  const active = grounds.filter(g => g.status !== 'CLOSED' && g.status !== 'RESOLVED')
  const checkInsToday = grounds.reduce((n, g) => n + (g.checkInsToday ?? 0), 0)
  const reportsReady = grounds.filter(g => g.status === 'REPORT_READY').length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, background: 'var(--gw-bg)' }}>
      <div style={{ padding: '14px 20px', borderBottom: '0.5px solid var(--gw-border)', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--gw-text)' }}>
          {isAdmin ? 'Grounds' : 'My grounds'}
        </div>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--gw-navy)', background: 'var(--gw-blue-bg)', border: '0.5px solid var(--gw-blue-b)', borderRadius: 20, padding: '3px 10px' }}>
          {isAdmin ? 'Admin' : 'Contributor'}
        </span>
      </div>

      <div className="gw-bd" style={{ paddingTop: 8, maxWidth: 640, margin: '0 auto', width: '100%' }}>
        {isAdmin ? (
          <>
            {/* Stats */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
              {[
                { val: active.length, label: 'Active grounds' },
                { val: checkInsToday, label: 'Check-ins today' },
                { val: reportsReady, label: 'Reports ready' },
              ].map(s => (
                <div key={s.label} style={{ background: 'var(--gw-bg)', border: '0.5px solid var(--gw-border)', borderRadius: 8, padding: '10px 14px', flex: 1, minWidth: 100 }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--gw-navy)' }}>{s.val}</div>
                  <div style={{ fontSize: 11, color: 'var(--gw-sub)', marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Open ground CTA */}
            <button
              onClick={() => navigate('/grounds/new')}
              style={{ width: '100%', padding: '13px 16px', borderRadius: 8, background: 'var(--gw-navy)', color: 'white', fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
            >
              <span>Open a new ground</span>
              <span style={{ fontSize: 18, fontWeight: 300 }}>+</span>
            </button>

            {isLoading && <div style={{ fontSize: 13, color: 'var(--gw-muted)', textAlign: 'center', padding: 24 }}>Loading…</div>}

            {!isLoading && grounds.length === 0 && (
              <div style={{ textAlign: 'center', padding: '48px 20px' }}>
                <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, letterSpacing: '-.01em' }}>Your first ground is one tap away.</div>
                <div style={{ fontSize: 13, color: 'var(--gw-sub)', lineHeight: 1.65, maxWidth: 280, margin: '0 auto 24px' }}>Open a ground for a new hire, a cofounder conversation, or a team that needs alignment.</div>
                <button onClick={() => navigate('/grounds/new')} style={{ padding: '13px 28px', borderRadius: 8, background: 'var(--gw-navy)', color: 'white', fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Open your first ground</button>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {grounds.map(g => <GroundCard key={g.id} g={g} onClick={() => navigate(`/grounds/${g.id}`)} />)}
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Your grounds</div>
            {isLoading && <div style={{ fontSize: 13, color: 'var(--gw-muted)', textAlign: 'center', padding: 24 }}>Loading…</div>}
            {!isLoading && grounds.length === 0 && (
              <div style={{ textAlign: 'center', padding: '48px 20px' }}>
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>No active grounds yet.</div>
                <div style={{ fontSize: 13, color: 'var(--gw-sub)', lineHeight: 1.65, maxWidth: 280, margin: '0 auto' }}>When someone opens a ground with you, it will appear here.</div>
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {grounds.map(g => (
                <GroundCard key={g.id} g={g} onClick={() => navigate(`/grounds/${g.id}/p`)} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
