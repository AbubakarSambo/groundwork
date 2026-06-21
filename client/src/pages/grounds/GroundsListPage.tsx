import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { groundsApi } from '@/api/grounds'
import { billingApi } from '@/api/billing'
import { useAuthStore } from '@/stores/auth'
import type { Ground } from '@/types'
import { toast } from 'sonner'

const BANDS = ['', 'Unresolved', 'Mixed', 'Emerging', 'Clear', 'Aligned']
function bandLabel(score?: number) { return BANDS[score ?? 1] ?? 'Unresolved' }

const MODE_COLORS: Record<string, { bg: string; color: string }> = {
  Starting:       { bg: '#E8F8F5', color: '#085041' },
  Recognition:    { bg: '#FDF3E3', color: '#8A5C1A' },
  Resolution:     { bg: '#EEF4FB', color: '#0C447C' },
  'Multi-party':  { bg: '#EEF4FB', color: '#0C447C' },
  Accountability: { bg: '#FCEBEB', color: '#791F1F' },
  Contract:       { bg: '#F0EAF8', color: '#5B2EA6' },
  Urgent:         { bg: '#FCEBEB', color: '#791F1F' },
}

function GroundCard({ g, onClick }: { g: Ground; onClick: () => void }) {
  const score = g.confidence ?? 1
  const bl = bandLabel(score)
  const mc = MODE_COLORS[g.moment ?? ''] ?? MODE_COLORS['Resolution']
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
        <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--gw-navy)' }}>{score}/5</div>
          <div style={{ fontSize: 11, color: 'var(--gw-sub)' }}>{bl}</div>
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

  const { data: billing } = useQuery({
    queryKey: ['billing-status'],
    queryFn: billingApi.status,
    enabled: !!user,
    retry: false,
  })

  const checkoutMut = useMutation({
    mutationFn: () => billingApi.createCareFeeCheckout(),
    onSuccess: (url) => { window.location.href = url },
    onError: () => toast.error('Could not start checkout — please try again.'),
  })

  const active = grounds.filter(g => g.status !== 'CLOSED' && g.status !== 'RESOLVED')
  const checkInsToday = grounds.reduce((n, g) => n + (g.checkInsToday ?? 0), 0)
  const reportsReady = grounds.filter(g => g.status === 'REPORT_READY').length
  const billingActive = billing?.careFeeActive ?? false

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--gw-bg)' }}>
      <div className="gw-hdr">
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <svg width="18" height="14" viewBox="0 0 22 17" fill="none">
            <rect x="5" y="0" width="12" height="3" rx="1.5" fill="#0C447C" opacity="0.45" />
            <rect x="2" y="6" width="18" height="3" rx="1.5" fill="#0C447C" opacity="0.72" />
            <rect x="0" y="12" width="22" height="3" rx="1.5" fill="#0C447C" />
          </svg>
          <a href="https://myground.work" target="_blank" rel="noopener noreferrer" style={{ fontSize: 15, fontWeight: 700, color: 'var(--gw-navy)', letterSpacing: '-.02em', textDecoration: 'none' }}>Groundwork</a>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--gw-navy)', background: 'var(--gw-blue-bg)', border: '0.5px solid var(--gw-blue-b)', borderRadius: 20, padding: '3px 10px' }}>
            {isAdmin ? 'Admin' : 'Team member'}
          </span>
          <span onClick={() => navigate('/billing')} style={{ fontSize: 13, color: 'var(--gw-sub)', cursor: 'pointer' }}>Settings</span>
          <span onClick={() => { useAuthStore.getState().logout(); navigate('/') }} style={{ fontSize: 13, color: 'var(--gw-sub)', cursor: 'pointer' }}>Sign out</span>
        </div>
      </div>

      <div className="gw-bd" style={{ paddingTop: 8, maxWidth: 600, margin: '0 auto', width: '100%' }}>
        {isAdmin ? (
          <>
            {/* Stats bar */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
              {[
                { val: active.length,    label: 'Active grounds' },
                { val: checkInsToday,    label: 'Check-ins today' },
                { val: reportsReady,     label: 'Reports ready' },
              ].map(s => (
                <div key={s.label} style={{ background: 'var(--gw-bg)', border: '0.5px solid var(--gw-border)', borderRadius: 8, padding: '10px 14px', flex: 1, minWidth: 100 }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--gw-navy)' }}>{s.val}</div>
                  <div style={{ fontSize: 11, color: 'var(--gw-sub)', marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Unlock insights CTA — only if not yet subscribed */}
            {!billingActive && (
              <div style={{ background: '#EEF4FB', border: '1px solid #C5D9EF', borderRadius: 10, padding: '14px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0C447C', marginBottom: 2 }}>Unlock full insights</div>
                  <div style={{ fontSize: 12, color: '#3A6090', lineHeight: 1.5 }}>Specificity trends, confidence scores, and pattern observations across every ground.</div>
                </div>
                <button
                  onClick={() => checkoutMut.mutate()}
                  disabled={checkoutMut.isPending}
                  style={{ padding: '8px 16px', borderRadius: 7, background: '#0C447C', color: 'white', fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', flexShrink: 0 }}
                >
                  {checkoutMut.isPending ? 'Opening…' : 'Subscribe — $25/mo'}
                </button>
              </div>
            )}

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
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 10, marginBottom: 24, height: 44 }}>
                  <div style={{ width: 10, height: 32, borderRadius: 5, background: 'var(--gw-border)', opacity: .5 }} />
                  <div style={{ width: 14, height: 44, borderRadius: 7, background: 'var(--gw-blue-b)' }} />
                  <div style={{ width: 10, height: 28, borderRadius: 5, background: 'var(--gw-border)', opacity: .5 }} />
                </div>
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

            {/* Unlock insights CTA for contributors */}
            {!billingActive && (
              <div style={{ background: '#EEF4FB', border: '1px solid #C5D9EF', borderRadius: 10, padding: '14px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0C447C', marginBottom: 2 }}>See your full record</div>
                  <div style={{ fontSize: 12, color: '#3A6090', lineHeight: 1.5 }}>Specificity trend, confidence score, and observations from your account over time.</div>
                </div>
                <button
                  onClick={() => checkoutMut.mutate()}
                  disabled={checkoutMut.isPending}
                  style={{ padding: '8px 16px', borderRadius: 7, background: '#0C447C', color: 'white', fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', flexShrink: 0 }}
                >
                  {checkoutMut.isPending ? 'Opening…' : 'Unlock — $25/mo'}
                </button>
              </div>
            )}

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
