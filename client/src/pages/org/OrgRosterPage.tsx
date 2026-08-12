import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { groundsApi } from '@/api/grounds'
import { useAuthStore } from '@/stores/auth'


function deriveAlignmentLabel(agreements: string[], divergences: unknown[], contributedParties: number): string {
  const a = agreements.length
  const d = divergences.length
  if (contributedParties < 2) {
    if (a > 0 && d <= 1) return 'Clear'
    if (a > 0 && d <= 2) return 'Emerging'
    if (a > 0 || d > 0) return 'Mixed'
    return 'Unresolved'
  }
  if (a > 0 && d === 0) return 'Aligned'
  if (a > 0 && d <= 1) return 'Clear'
  if (a > 0 && d <= 2) return 'Emerging'
  if (a > 0 || d > 0) return 'Mixed'
  return 'Unresolved'
}

const STATUS_LABELS: Record<string, string> = {
  AWAITING_LEAD: 'Awaiting lead',
  OPEN: 'Open',
  AWAITING_PARTIES: 'Awaiting parties',
  REPORT_READY: 'Report ready',
  ACTIVE: 'Active',
  PAUSED: 'Paused',
  RESOLVED: 'Resolved',
  STALLED: 'Stalled',
  CLOSED: 'Closed',
}

export function OrgRosterPage() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const isAdmin = user?.role === 'ADMIN'
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const { data: roster = [], isLoading } = useQuery({
    queryKey: ['org-roster'],
    queryFn: groundsApi.getOrgRoster,
    enabled: isAdmin,
  })

  if (!isAdmin) {
    return (
      <div style={{ padding: '48px 32px', maxWidth: 560 }}>
        <div style={{ fontSize: 15, color: 'var(--gw-sub)' }}>You need admin access to view the team roster.</div>
      </div>
    )
  }

  function toggle(id: string) {
    setExpanded(v => { const n = new Set(v); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  return (
    <div style={{ padding: '40px 32px', maxWidth: 920 }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--gw-navy)', marginBottom: 6, letterSpacing: '-.02em' }}>Roster</h1>
      <p style={{ fontSize: 14, color: 'var(--gw-sub)', marginBottom: 32, lineHeight: 1.6 }}>
        Every ground in your organization - who leads it, who is in it, and where alignment stands.
      </p>

      {/* ONE WAY TO OPEN A GROUND.
          This page used to carry its own creation form. It could name a lead but
          offered five of the seventeen situations and never asked how long the
          ground runs - so a three-month onboarding created here silently became a
          thirty-day one. The main flow now asks who runs it, which was the only
          thing this form could do that it could not. */}
      <button onClick={() => navigate('/grounds/new')} style={{ marginBottom: 20, padding: '10px 18px', borderRadius: 8, background: 'var(--gw-navy)', color: 'white', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'inherit' }}>
        + New ground
      </button>
      <div style={{ fontSize: 12, color: 'var(--gw-sub)', marginBottom: 20, marginTop: -12, lineHeight: 1.5 }}>
        You can lead it yourself or hand it to someone else - that is one of the questions in the flow.
      </div>

      {isLoading ? (
        <div style={{ color: 'var(--gw-sub)', fontSize: 14 }}>Loading…</div>
      ) : roster.length === 0 ? (
        <div style={{ color: 'var(--gw-sub)', fontSize: 14 }}>No grounds yet.</div>
      ) : (
        <div style={{ border: '1px solid var(--gw-border)', borderRadius: 12, overflow: 'hidden' }}>
          {roster.map((g, i) => {
            const isOpen = expanded.has(g.id)
            const alignmentLabel = g.report?.releasedAt ? deriveAlignmentLabel(g.report.agreements, g.report.divergences, g.contributedParties) : null
            return (
              <div key={g.id} style={{ borderBottom: i < roster.length - 1 ? '1px solid var(--gw-border)' : 'none' }}>
                <div
                  onClick={() => toggle(g.id)}
                  style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', background: 'var(--gw-card)', cursor: 'pointer', gap: '4px 12px' }}
                >
                  <div style={{ minWidth: 0, flex: '1 1 200px' }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--gw-navy)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.label}</div>
                    <div style={{ fontSize: 12, color: 'var(--gw-sub)' }}>
                      Led by {g.lead.firstName || g.lead.email}
                      {g.createdByAdmin && <span style={{ marginLeft: 6, fontStyle: 'italic' }}>(set up by an admin)</span>}
                      {' · '}{g.memberCount} member{g.memberCount !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                    <span style={{
                      fontSize: 11, fontWeight: 600, borderRadius: 20, padding: '2px 10px',
                      background: g.status === 'AWAITING_LEAD' ? 'var(--gw-amber-bg)' : g.status === 'REPORT_READY' ? 'var(--gw-green-bg)' : 'var(--gw-blue-bg, #EEF4FB)',
                      color: g.status === 'AWAITING_LEAD' ? 'var(--gw-amber-t)' : g.status === 'REPORT_READY' ? 'var(--gw-green-t)' : 'var(--gw-navy)',
                    }}>
                      {STATUS_LABELS[g.status] ?? g.status}
                    </span>
                    {alignmentLabel && (
                      <span style={{ fontSize: 11, fontWeight: 600, color: alignmentLabel === 'Aligned' ? '#085041' : 'var(--gw-sub)' }}>{alignmentLabel}</span>
                    )}
                    {!g.report?.releasedAt && (
                      <span style={{ fontSize: 11, color: 'var(--gw-sub)' }}>{g.report ? 'not released' : 'no report yet'}</span>
                    )}
                    <span style={{ color: 'var(--gw-sub)', fontSize: 12 }}>{isOpen ? '▲' : '▼'}</span>
                  </div>
                </div>
                {isOpen && (
                  <div style={{ padding: '4px 18px 16px', background: 'white' }}>
                    <div style={{ fontSize: 11, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--gw-sub)', fontWeight: 700, marginBottom: 8 }}>Members</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                      {g.members.map((m, j) => (
                        <div key={j} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13, padding: '6px 0', borderBottom: j < g.members.length - 1 ? '1px solid var(--gw-border)' : 'none' }}>
                          <div>
                            <span style={{ fontWeight: 600 }}>{m.email}</span>
                            {m.roleAsDescribed && <span style={{ color: 'var(--gw-sub)', marginLeft: 8 }}>{m.roleAsDescribed}</span>}
                            {m.partyType === 'INITIATOR' && <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 700, color: 'var(--gw-navy)' }}>LEAD</span>}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {!m.accepted && <span style={{ fontSize: 11, color: 'var(--gw-amber-t, #8A5C1A)' }}>invite pending</span>}
                            {m.latestSpecificity && <span style={{ fontSize: 11, color: 'var(--gw-sub)' }}>{m.latestSpecificity} specificity</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                    <button onClick={() => navigate(`/grounds/${g.id}`)} style={{ fontSize: 12, color: 'var(--gw-navy)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontFamily: 'inherit', padding: 0 }}>
                      Open ground →
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
