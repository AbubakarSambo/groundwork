import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { groundsApi } from '@/api/grounds'
import { billingApi } from '@/api/billing'
import { authApi } from '@/api/auth'
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
          {g.status === 'ACTIVE' && g.participants.length > 1 && !(g.checkIns ?? []).some(c => c.status === 'COMPLETED') && (g.overdue ?? 0) === 0 && <span style={{ fontSize: 11, fontWeight: 600, color: '#7A5200', background: '#FFF8EC', borderRadius: 20, padding: '2px 8px' }}>No check-ins yet</span>}
          {(g.overdue ?? 0) > 0 && <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--gw-amber-t)', background: 'var(--gw-amber-bg)', borderRadius: 20, padding: '2px 8px' }}>{g.overdue} overdue</span>}
          {g.status === 'REPORT_READY' && <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--gw-green-t)', background: 'var(--gw-green-bg)', borderRadius: 20, padding: '2px 8px' }}>Report ready</span>}
          {g.status === 'AWAITING_LEAD' && <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--gw-amber-t)', background: 'var(--gw-amber-bg)', borderRadius: 20, padding: '2px 8px' }}>Awaiting lead</span>}
          {g.daysLeft != null && <span style={{ fontSize: 11, color: 'var(--gw-sub)' }}>{g.daysLeft}d left</span>}
        </div>
      </div>
    </div>
  )
}

export function GroundsListPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const user = useAuthStore(s => s.user)
  const isAdmin = user?.role === 'ADMIN'
  const justSetUp = searchParams.get('welcome') === '1'
  const [showInviteColleague, setShowInviteColleague] = useState(false)
  const [colleagueEmail, setColleagueEmail] = useState('')

  const teamInviteMut = useMutation({
    mutationFn: (email: string) => authApi.teamInvite(email),
    onSuccess: () => {
      toast.success('Invite sent.')
      setColleagueEmail('')
      setShowInviteColleague(false)
    },
    onError: () => toast.error('Could not send invite. Please try again.'),
  })

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

  const checkoutMut = { mutate: () => navigate('/billing/checkout'), isPending: false }
  const active = grounds.filter(g => g.status !== 'CLOSED' && g.status !== 'RESOLVED')
  const checkInsToday = grounds.reduce((n, g) => n + (g.checkInsToday ?? 0), 0)
  const reportsReady = grounds.filter(g => g.status === 'REPORT_READY').length
  const billingActive = (billing?.activeGrounds?.length ?? 0) > 0
  // Only show unlock-insights banner when there are completed grounds that have actually generated a report
  const hasCompletedGrounds = grounds.some(g => g.status === 'REPORT_READY' || (g.confidence ?? 0) >= 2)
  const needsAttention = grounds.filter(g => g.status === 'REPORT_READY' || (g.overdue ?? 0) > 0)
  const sortedGrounds = [...grounds].sort((a, b) => {
    const urgency = (g: typeof a) => (g.status === 'REPORT_READY' ? 10 : (g.overdue ?? 0) > 0 ? 5 : 0)
    return urgency(b) - urgency(a)
  })

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
          {user?.isPlatformAdmin && <span onClick={() => navigate('/admin')} style={{ fontSize: 13, color: 'var(--gw-sub)', cursor: 'pointer' }}>Admin</span>}
          <span onClick={() => navigate('/settings')} style={{ fontSize: 13, color: 'var(--gw-sub)', cursor: 'pointer' }}>Settings</span>
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
                { val: checkInsToday,    label: 'Participant sessions today' },
                { val: reportsReady,     label: 'Reports ready' },
              ].map(s => (
                <div key={s.label} style={{ background: 'var(--gw-bg)', border: '0.5px solid var(--gw-border)', borderRadius: 8, padding: '10px 14px', flex: 1, minWidth: 100 }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--gw-navy)' }}>{s.val}</div>
                  <div style={{ fontSize: 11, color: 'var(--gw-sub)', marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Unlock insights CTA - only after first completed ground pair, not on empty/new accounts */}
            {!billingActive && hasCompletedGrounds && (
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
                  {checkoutMut.isPending ? 'Opening…' : 'Unlock insights'}
                </button>
              </div>
            )}

            {/* Open ground CTA */}
            <button
              onClick={() => navigate('/grounds/new')}
              style={{ width: '100%', padding: '13px 16px', borderRadius: 8, background: 'var(--gw-navy)', color: 'white', fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit', marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
            >
              <span>Open a new ground</span>
              <span style={{ fontSize: 18, fontWeight: 300 }}>+</span>
            </button>

            {/* Invite a colleague - admin only, matches the backend guard on POST /auth/team-invite */}
            {isAdmin && (!showInviteColleague ? (
              <button
                onClick={() => setShowInviteColleague(true)}
                style={{ width: '100%', padding: '11px 16px', borderRadius: 8, background: 'var(--gw-navy)', color: 'white', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit', marginBottom: 20, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              >
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><circle cx="7" cy="7" r="3" stroke="white" strokeWidth="1.5"/><path d="M1 16c0-2.21 2.686-4 6-4s6 1.79 6 4" stroke="white" strokeWidth="1.5" strokeLinecap="round"/><path d="M15 8v4M13 10h4" stroke="white" strokeWidth="1.5" strokeLinecap="round"/></svg>
                Invite a team member
              </button>
            ) : (
              <div style={{ background: 'var(--gw-blue-bg)', border: '1px solid var(--gw-blue-b)', borderRadius: 10, padding: '14px 16px', marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gw-navy)', marginBottom: 4 }}>Invite a colleague</div>
                <div style={{ fontSize: 12, color: 'var(--gw-blue-t)', lineHeight: 1.5, marginBottom: 12 }}>
                  They will receive an email with a link to set up their own Groundwork account. They can then open and manage their own grounds.
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    type="email"
                    placeholder="colleague@company.com"
                    value={colleagueEmail}
                    onChange={e => setColleagueEmail(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && colleagueEmail.includes('@')) teamInviteMut.mutate(colleagueEmail.trim()) }}
                    style={{ flex: 1, padding: '9px 12px', fontSize: 13, border: '1px solid var(--gw-blue-b)', borderRadius: 6, fontFamily: 'inherit', outline: 'none', background: 'white' }}
                    autoFocus
                  />
                  <button
                    onClick={() => { if (colleagueEmail.includes('@')) teamInviteMut.mutate(colleagueEmail.trim()) }}
                    disabled={teamInviteMut.isPending || !colleagueEmail.includes('@')}
                    style={{ padding: '9px 16px', borderRadius: 6, background: 'var(--gw-navy)', color: 'white', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'inherit', flexShrink: 0 }}
                  >
                    {teamInviteMut.isPending ? 'Sending…' : 'Send invite'}
                  </button>
                  <button
                    onClick={() => { setShowInviteColleague(false); setColleagueEmail('') }}
                    style={{ padding: '9px 10px', borderRadius: 6, background: 'none', color: 'var(--gw-sub)', border: '1px solid var(--gw-border)', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit', flexShrink: 0 }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ))}

            {/* Needs attention banner */}
            {!isLoading && needsAttention.length > 0 && (
              <div style={{ background: '#FDF3E3', border: '1px solid #E8A94A', borderRadius: 10, padding: '12px 14px', marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#8A5C1A', marginBottom: 6 }}>Needs your attention</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {needsAttention.map(g => (
                    <div key={g.id} onClick={() => navigate(`/grounds/${g.id}`)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: '4px 0' }}>
                      <span style={{ fontSize: 13, color: '#1A1916', fontWeight: 600 }}>{g.label}</span>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: g.status === 'REPORT_READY' ? 'var(--gw-green-bg)' : 'var(--gw-amber-bg)', color: g.status === 'REPORT_READY' ? 'var(--gw-green-t)' : 'var(--gw-amber-t)' }}>
                        {g.status === 'REPORT_READY' ? 'Report ready' : `${g.overdue} overdue`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

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
              {sortedGrounds.map(g => <GroundCard key={g.id} g={g} onClick={() => navigate(`/grounds/${g.id}`)} />)}
            </div>
          </>
        ) : (
          <>
            {/* Welcome banner after password setup */}
            {justSetUp && (
              <div style={{ background: '#E7F6EF', border: '1px solid #B6E8D4', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#085041', marginBottom: 3 }}>Your account is live.</div>
                <div style={{ fontSize: 12, color: '#3A7A60', lineHeight: 1.5 }}>You will see your grounds and reports here. Open a ground to start contributing.</div>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>
                {grounds.length > 0 ? `Your grounds (${grounds.length})` : 'Your grounds'}
              </div>
              <button
                onClick={() => navigate('/start')}
                style={{ padding: '8px 14px', borderRadius: 7, background: 'var(--gw-navy)', color: 'white', fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                + Open a ground
              </button>
            </div>

            {/* Unlock insights CTA for contributors - only shown after first report is available */}
            {!billingActive && grounds.some(g => g.status === 'REPORT_READY') && (
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
                  {checkoutMut.isPending ? 'Opening…' : 'Unlock insights'}
                </button>
              </div>
            )}

            {isLoading && <div style={{ fontSize: 13, color: 'var(--gw-muted)', textAlign: 'center', padding: 24 }}>Loading…</div>}
            {!isLoading && grounds.length === 0 && (
              <div style={{ textAlign: 'center', padding: '48px 20px' }}>
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Nothing here yet.</div>
                <div style={{ fontSize: 13, color: 'var(--gw-sub)', lineHeight: 1.65, maxWidth: 300, margin: '0 auto 8px' }}>
                  A ground is a shared space where two or more parties check in privately. The report releases when everyone has checked in.
                </div>
                <div style={{ fontSize: 12, color: 'var(--gw-muted)', lineHeight: 1.5, maxWidth: 280, margin: '0 auto 24px' }}>
                  You will see grounds here when someone invites you, or when you open one yourself.
                </div>
                <button
                  onClick={() => navigate('/start')}
                  style={{ padding: '12px 24px', borderRadius: 8, background: 'var(--gw-navy)', color: 'white', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  Open a ground
                </button>
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {grounds.map(g => (
                // A non-admin who is themselves the initiator (or a lead admin
                // assigned to run this ground) still needs the admin view - the
                // participant page has no confirm-lead / add-participant / release
                // actions. Only route to /p when they are genuinely a participant.
                <GroundCard key={g.id} g={g} onClick={() => navigate(g.initiatorId === user?.id ? `/grounds/${g.id}` : `/grounds/${g.id}/p`)} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
