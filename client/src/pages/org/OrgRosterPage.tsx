import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { groundsApi, type GroundScenario, type GroundCadence } from '@/api/grounds'
import { useAuthStore } from '@/stores/auth'
import { toast } from 'sonner'

const SCENARIO_OPTIONS: { value: GroundScenario; label: string }[] = [
  { value: 'COHORT_CHECK', label: 'Cohort check-in' },
  { value: 'BOARD_STRATEGY', label: 'Board strategy' },
  { value: 'PULSE_CHECK', label: 'Pulse check' },
  { value: 'NEW_PROJECT', label: 'New project' },
  { value: 'REALIGN_TEAM', label: 'Other' },
]

const CADENCE_OPTIONS: { value: GroundCadence; label: string }[] = [
  { value: 'SEQUENTIAL', label: 'When the lead checks in' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'FORTNIGHTLY', label: 'Every 2 weeks' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'DAILY', label: 'Daily' },
]

function NewTeamPanel({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [leadEmail, setLeadEmail] = useState('')
  const [leadName, setLeadName] = useState('')
  const [label, setLabel] = useState('')
  const [scenario, setScenario] = useState<GroundScenario>('COHORT_CHECK')
  const [cadence, setCadence] = useState<GroundCadence>('SEQUENTIAL')
  const [brief, setBrief] = useState('')
  const [participantsText, setParticipantsText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function submit() {
    if (!leadEmail.includes('@') || !label.trim()) return
    setSubmitting(true)
    try {
      const participants = participantsText.split('\n').map(l => l.trim()).filter(Boolean).map(line => {
        const [email, role] = line.split(',').map(s => s.trim())
        return { email, roleAsDescribed: role || undefined }
      }).filter(p => p.email.includes('@'))
      await groundsApi.createForLead({
        leadEmail: leadEmail.trim(), leadName: leadName.trim() || undefined,
        label: label.trim(), scenario, moment: 'STARTING', cadence,
        brief: brief.trim() || undefined,
        participants: participants.length ? participants : undefined,
      })
      toast.success('Team created - the lead has been invited')
      onCreated()
    } catch {
      toast.error('Could not create this team. Check the details and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ background: 'var(--gw-blue-bg, #EEF4FB)', border: '1px solid var(--gw-blue-b, #B5D4F4)', borderRadius: 12, padding: '20px 22px', marginBottom: 24 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--gw-navy)', marginBottom: 12 }}>New team</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
        <input type="email" placeholder="Lead's email" value={leadEmail} onChange={e => setLeadEmail(e.target.value)}
          style={{ padding: '9px 12px', fontSize: 13, border: '1px solid var(--gw-border)', borderRadius: 8, fontFamily: 'inherit', outline: 'none' }} />
        <input type="text" placeholder="Lead's name (optional)" value={leadName} onChange={e => setLeadName(e.target.value)}
          style={{ padding: '9px 12px', fontSize: 13, border: '1px solid var(--gw-border)', borderRadius: 8, fontFamily: 'inherit', outline: 'none' }} />
      </div>
      <input type="text" placeholder="Team / ground name (e.g. Q3 engineering alignment)" value={label} onChange={e => setLabel(e.target.value)}
        style={{ width: '100%', padding: '9px 12px', fontSize: 13, border: '1px solid var(--gw-border)', borderRadius: 8, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', marginBottom: 8 }} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
        <select value={scenario} onChange={e => setScenario(e.target.value as GroundScenario)}
          style={{ padding: '9px 12px', fontSize: 13, border: '1px solid var(--gw-border)', borderRadius: 8, fontFamily: 'inherit', background: 'white' }}>
          {SCENARIO_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select value={cadence} onChange={e => setCadence(e.target.value as GroundCadence)}
          style={{ padding: '9px 12px', fontSize: 13, border: '1px solid var(--gw-border)', borderRadius: 8, fontFamily: 'inherit', background: 'white' }}>
          {CADENCE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
      <textarea placeholder="Context for the lead (e.g. review the codebase and development process this quarter)" value={brief} onChange={e => setBrief(e.target.value)} rows={2}
        style={{ width: '100%', padding: '9px 12px', fontSize: 13, border: '1px solid var(--gw-border)', borderRadius: 8, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', resize: 'vertical', marginBottom: 8 }} />
      <textarea placeholder={'Participants to add now (optional), one per line:\nemail@company.com, Role'} value={participantsText} onChange={e => setParticipantsText(e.target.value)} rows={3}
        style={{ width: '100%', padding: '9px 12px', fontSize: 12.5, border: '1px solid var(--gw-border)', borderRadius: 8, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', resize: 'vertical', marginBottom: 12 }} />
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={submit} disabled={submitting || !leadEmail.includes('@') || !label.trim()}
          style={{ padding: '9px 18px', borderRadius: 8, background: 'var(--gw-navy)', color: 'white', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'inherit', opacity: submitting || !leadEmail.includes('@') || !label.trim() ? 0.5 : 1 }}>
          {submitting ? 'Creating…' : 'Create and invite lead'}
        </button>
        <button onClick={onClose} style={{ padding: '9px 18px', borderRadius: 8, background: 'none', color: 'var(--gw-sub)', border: '1px solid var(--gw-border)', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>
          Cancel
        </button>
      </div>
    </div>
  )
}

/** Same derivation ReportPage uses - kept in sync deliberately rather than
 * duplicating the logic server-side, so there is one definition of what an
 * alignment label means. */
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
  const qc = useQueryClient()
  const isAdmin = user?.role === 'ADMIN'
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [showNewTeam, setShowNewTeam] = useState(false)

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
      <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--gw-navy)', marginBottom: 6, letterSpacing: '-.02em' }}>Teams</h1>
      <p style={{ fontSize: 14, color: 'var(--gw-sub)', marginBottom: 32, lineHeight: 1.6 }}>
        Every ground in your organization - who leads it, who is in it, and where alignment stands.
      </p>

      {!showNewTeam ? (
        <button onClick={() => setShowNewTeam(true)} style={{ marginBottom: 20, padding: '10px 18px', borderRadius: 8, background: 'var(--gw-navy)', color: 'white', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'inherit' }}>
          + New team
        </button>
      ) : (
        <NewTeamPanel
          onClose={() => setShowNewTeam(false)}
          onCreated={() => { setShowNewTeam(false); qc.invalidateQueries({ queryKey: ['org-roster'] }) }}
        />
      )}

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
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', background: 'var(--gw-card)', cursor: 'pointer', gap: 12 }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--gw-navy)', marginBottom: 2 }}>{g.label}</div>
                    <div style={{ fontSize: 12, color: 'var(--gw-sub)' }}>
                      Led by {g.lead.firstName || g.lead.email}
                      {g.createdByAdmin && <span style={{ marginLeft: 6, fontStyle: 'italic' }}>(set up by an admin)</span>}
                      {' · '}{g.memberCount} member{g.memberCount !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
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
