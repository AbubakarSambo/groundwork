import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth'
import { groundsApi } from '@/api/grounds'
import { reportsApi } from '@/api/reports'
import { documentsApi } from '@/api/documents'
import { conversationApi } from '@/api/conversation'
import { participantRequestsApi } from '@/api/participantRequests'
import type { ParticipantRequest } from '@/api/participantRequests'
import { toast } from 'sonner'

const BANDS = ['', 'Unresolved', 'Mixed', 'Emerging', 'Clear', 'Aligned']
function bandLabel(score?: number) { return BANDS[score ?? 1] ?? 'Unresolved' }

const CONF_DESC: Record<number, string> = {
  1: 'One account only. The other party is needed.',
  2: 'Two accounts. Picture is forming.',
  3: 'Three sessions. Pattern visible but not confirmed.',
  4: 'Four sessions. Evidence strong. Recommendation defensible.',
  5: 'Five sessions. Full picture. High confidence.',
}

type Tab = 'overview' | 'checkins' | 'docs' | 'report' | 'settings'
type ReportSession = 's1' | 's2' | 'closing'

export function GroundAdminPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const user = useAuthStore(s => s.user)
  const [tab, setTab] = useState<Tab>('overview')
  const [reportSession, setReportSession] = useState<ReportSession>('s1')
  const [ctxNote, setCtxNote] = useState('')
  const [groundLabel, setGroundLabel] = useState('')
  const [showReleaseConfirm, setShowReleaseConfirm] = useState(false)
  const [addingParticipant, setAddingParticipant] = useState(false)
  const [newParticipantEmail, setNewParticipantEmail] = useState('')
  const [newParticipantNote, setNewParticipantNote] = useState('')

  const { data: ground, isLoading } = useQuery({
    queryKey: ['ground', id],
    queryFn: () => groundsApi.get(id!),
    enabled: !!id,
  })

  const { data: report } = useQuery({
    queryKey: ['report', id],
    queryFn: () => reportsApi.get(id!),
    enabled: !!id && tab === 'report',
    retry: false,
  })

  const { data: activationStatus } = useQuery({
    queryKey: ['report-activation', id],
    queryFn: () => reportsApi.activationStatus(id!),
    enabled: !!id && tab === 'report' && !!report?.releasedAt,
    retry: false,
  })

  const { data: docs = [] } = useQuery({
    queryKey: ['docs', id],
    queryFn: () => documentsApi.list(id!),
    enabled: !!id && tab === 'docs',
  })

  const releaseReport = useMutation({
    mutationFn: () => reportsApi.release(id!),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['report', id] }),
    onError: () => toast.error('Could not release report.'),
  })

  const uploadDoc = useMutation({
    mutationFn: (file: File) => documentsApi.upload(id!, file),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['docs', id] }),
    onError: () => toast.error('Upload failed.'),
  })

  const deleteDoc = useMutation({
    mutationFn: (docId: string) => documentsApi.remove(id!, docId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['docs', id] }),
  })

  const { data: pendingRequests = [] } = useQuery({
    queryKey: ['participant-requests', id],
    queryFn: () => participantRequestsApi.list(id!),
    enabled: !!id,
    retry: false,
  })

  const approveRequest = useMutation({
    mutationFn: async (req: ParticipantRequest) => {
      await participantRequestsApi.update(id!, req.id, 'APPROVED')
      await groundsApi.addParticipant(id!, { email: req.requestedEmail })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['participant-requests', id] })
      qc.invalidateQueries({ queryKey: ['ground', id] })
      toast.success('Participant added')
    },
    onError: () => toast.error('Could not add participant.'),
  })

  const dismissRequest = useMutation({
    mutationFn: (reqId: string) => participantRequestsApi.update(id!, reqId, 'DISMISSED'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['participant-requests', id] }),
  })

  const remind = useMutation({
    mutationFn: (checkInId: string) => conversationApi.remind(checkInId),
    onSuccess: () => toast.success('Reminder sent'),
  })

  const addNote = useMutation({
    mutationFn: (note: string) => groundsApi.update(id!, { contextNote: note }),
    onSuccess: () => { setCtxNote(''); qc.invalidateQueries({ queryKey: ['ground', id] }) },
    onError: () => toast.error('Could not save note.'),
  })

  const addParticipantMut = useMutation({
    mutationFn: () => groundsApi.addParticipant(id!, { email: newParticipantEmail.trim(), note: newParticipantNote.trim() || undefined }),
    onSuccess: () => {
      setAddingParticipant(false)
      setNewParticipantEmail('')
      setNewParticipantNote('')
      qc.invalidateQueries({ queryKey: ['ground', id] })
      toast.success('Contributor invited')
    },
    onError: () => toast.error('Could not add contributor.'),
  })

  useEffect(() => {
    if (ground?.label) setGroundLabel(prev => prev || ground.label)
  }, [ground?.label])

  if (isLoading) return <Shell><div style={{ padding: 24, fontSize: 13, color: 'var(--gw-muted)' }}>Loading…</div></Shell>
  if (!ground) return <Shell><div style={{ padding: 24, fontSize: 13, color: 'var(--gw-muted)' }}>Ground not found.</div></Shell>

  const conf = ground.confidence ?? 1
  const bl = bandLabel(conf)

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--gw-bg)' }}>
      {/* Sticky header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'var(--gw-bg)', borderBottom: '0.5px solid var(--gw-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span onClick={() => navigate('/grounds')} style={{ fontSize: 13, color: 'var(--gw-sub)', cursor: 'pointer' }}>← Grounds</span>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.2 }}>{ground.label}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 7px', borderRadius: 20, background: 'var(--gw-blue-bg)', color: 'var(--gw-navy)' }}>{ground.moment}</span>
                {ground.status === 'ACTIVE' && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--gw-green-b)', display: 'inline-block' }} />}
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--gw-navy)' }}>{conf}/5</div>
            <div style={{ fontSize: 11, color: 'var(--gw-sub)' }}>{bl}</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, padding: '0 16px 10px', fontSize: 11, color: 'var(--gw-sub)', flexWrap: 'wrap', alignItems: 'center' }}>
          {ground.resolutionState && (
            <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: 'var(--gw-blue-bg)', color: 'var(--gw-navy)' }}>{ground.resolutionState}</span>
          )}
          {ground.daysLeft != null && <span>{ground.daysLeft} days remaining</span>}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderTop: '0.5px solid var(--gw-border)', overflowX: 'auto' }}>
          {(['overview', 'checkins', 'docs', 'report', 'settings'] as Tab[]).map(t => (
            <button key={t} className={`gw-tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>
              {{ overview: 'Overview', checkins: 'Check-ins', docs: 'Documents', report: 'Report', settings: 'Settings' }[t]}
            </button>
          ))}
        </div>
      </div>

      <div className="gw-bd" style={{ paddingTop: 12, maxWidth: 600, margin: '0 auto', width: '100%' }}>

        {/* OVERVIEW */}
        {tab === 'overview' && (
          <div>
            {/* Fix 10: Report ready CTA */}
            {ground.status === 'REPORT_READY' && (
              <div style={{ background: '#E7F6EF', border: '1px solid #B6E8D4', borderRadius: 10, padding: '14px 16px', marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#085041', marginBottom: 3 }}>Your session is complete. Want to keep this ground going?</div>
                  <div style={{ fontSize: 12, color: '#3A7A60', lineHeight: 1.5 }}>Add another session any time. The report updates each time your team checks in.</div>
                </div>
                <button onClick={() => navigate('/billing/payment', { state: { groundId: ground.id, groundName: ground.label } })} style={{ flexShrink: 0, padding: '8px 14px', borderRadius: 7, background: '#085041', color: 'white', fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                  Add a session ($5)
                </button>
              </div>
            )}

            {/* Fix 8: Cadence miss recovery */}
            {(ground.overdue ?? 0) > 0 && (
              <div style={{ fontSize: 12, color: '#0C447C', background: '#EEF4FB', border: '1px solid #C5D9EF', borderRadius: 8, padding: '10px 12px', marginBottom: 14, lineHeight: 1.5 }}>
                <strong>{ground.overdue} {ground.overdue === 1 ? 'participant is' : 'participants are'} overdue.</strong> A missed session is not a lost session — use Remind to get them back on track. Their next check-in picks up where they left off.
              </div>
            )}

            <div style={{ background: 'var(--gw-blue-bg)', border: '0.5px solid var(--gw-blue-b)', borderRadius: 10, padding: '14px 16px', marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gw-navy)', letterSpacing: '.04em', textTransform: 'uppercase', marginBottom: 8 }}>Ground summary</div>
              <div style={{ fontSize: 13, lineHeight: 1.65 }}>{ground.brief ?? 'Waiting for first session pair to complete.'}</div>
            </div>

            {(() => {
              const myParticipant = ground.participants.find((p: any) => p.userId === user?.id)
              const myOpenCheckIn = myParticipant
                ? ground.checkIns?.find((c: any) => c.participantId === myParticipant.id && c.status !== 'COMPLETED')
                : null
              if (!myOpenCheckIn) return null
              return (
                <div style={{ background: '#E7F6EF', border: '1px solid #B6E8D4', borderRadius: 10, padding: '13px 16px', marginBottom: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#085041', marginBottom: 4 }}>
                    Session {myOpenCheckIn.sessionNumber} is ready for you
                  </div>
                  <div style={{ fontSize: 12, color: '#3A7A60', lineHeight: 1.6, marginBottom: 10 }}>
                    Your check-in is open. Start when you are ready.
                  </div>
                  <button
                    onClick={() => navigate(`/checkin/${myOpenCheckIn.id}`, {
                      state: { sessionNumber: myOpenCheckIn.sessionNumber, groundLabel: ground.label, groundId: id, isInitiator: true }
                    })}
                    style={{ width: '100%', padding: '11px 16px', borderRadius: 8, background: '#5DCAA5', color: '#0A1628', fontSize: 14, fontWeight: 800, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    Start session {myOpenCheckIn.sessionNumber}
                  </button>
                </div>
              )
            })()}

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Participants</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {ground.participants.map((p, i) => {
                  const myCheckIn = ground.checkIns?.find(c => c.participantId === p.id)
                  const status = myCheckIn?.status ?? 'NOT_STARTED'
                  const statusColor = status === 'COMPLETED' ? 'var(--gw-green-b)' : status === 'IN_PROGRESS' ? 'var(--gw-amber-b)' : 'var(--gw-border)'
                  const statusLabel = status === 'COMPLETED' ? 'Completed' : status === 'IN_PROGRESS' ? 'In progress' : 'Not started'
                  return (
                    <div key={p.id} className="ga-participant-row">
                      <div className="ga-status-dot" style={{ background: statusColor }} title={statusLabel} />
                      <div className={`gw-av gw-av-${i % 6}`}>{(p.email || '?').charAt(0).toUpperCase()}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{p.email}</div>
                        {p.roleAsDescribed && <div style={{ fontSize: 11, color: 'var(--gw-sub)', marginTop: 1 }}>{p.roleAsDescribed}</div>}
                        <div style={{ fontSize: 11, color: 'var(--gw-muted)' }}>{status.replace(/_/g, ' ').toLowerCase()}</div>
                      </div>
                      {myCheckIn && status !== 'COMPLETED' && (
                        <button onClick={() => remind.mutate(myCheckIn.id)} style={{ fontSize: 11, color: 'var(--gw-navy)', background: 'none', border: 'none', cursor: 'pointer' }}>Remind</button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {(() => {
              const pending = ground.participants.filter((p: any) => {
                const ci = ground.checkIns?.find((c: any) => c.participantId === p.id)
                return !ci || ci.status !== 'COMPLETED'
              })
              return pending.length > 0 ? (
                <div style={{ fontSize: 12, color: '#8A5C1A', background: '#FDF3E3', border: '1px solid #E8A94A', borderRadius: 8, padding: '8px 12px', marginBottom: 16, lineHeight: 1.5 }}>
                  {pending.length === 1
                    ? `1 participant has not yet checked in. Your report cannot cross-reference accounts until their account is in.`
                    : `${pending.length} participants have not yet checked in. Your report cannot cross-reference accounts until all accounts are in.`}
                  <span style={{ marginLeft: 6, fontWeight: 600 }}>Use Remind to chase them.</span>
                </div>
              ) : null
            })()}

            {pendingRequests.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#8A5C1A', background: '#FDF3E3', border: '1px solid #E8A94A', borderRadius: 8, padding: '8px 12px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#E8A94A', flexShrink: 0, display: 'inline-block' }} />
                  Pending participant requests ({pendingRequests.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {pendingRequests.map(req => (
                    <div key={req.id} style={{ background: 'white', border: '1px solid #E2E0DB', borderRadius: 10, padding: '13px 14px' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#1A1916', marginBottom: 2 }}>
                        {req.requestedName ? `${req.requestedName} (${req.requestedEmail})` : req.requestedEmail}
                      </div>
                      <div style={{ fontSize: 11, color: '#6B6560', marginBottom: 8 }}>Requested by {req.requestedByEmail}</div>
                      <div style={{ fontSize: 13, color: '#1A1916', lineHeight: 1.55, marginBottom: 12 }}>{req.reason}</div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => approveRequest.mutate(req)}
                          disabled={approveRequest.isPending}
                          style={{ flex: 1, padding: '8px 12px', borderRadius: 7, background: '#0A1628', color: 'white', fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit', opacity: approveRequest.isPending ? 0.6 : 1 }}
                        >
                          Add participant
                        </button>
                        <button
                          onClick={() => dismissRequest.mutate(req.id)}
                          disabled={dismissRequest.isPending}
                          style={{ padding: '8px 14px', borderRadius: 7, background: 'none', color: '#6B6560', fontSize: 12, fontWeight: 600, border: '1px solid #E2E0DB', cursor: 'pointer', fontFamily: 'inherit', opacity: dismissRequest.isPending ? 0.6 : 1 }}
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(ground.signals ?? []).length > 0 && (() => {
              const sigs = ground.signals ?? []
              const convergences = sigs.filter(s => s.type === 'Convergence').length
              const divergences = sigs.filter(s => s.type === 'Divergence').length
              const trendLabel = convergences > divergences ? 'Trending toward alignment' : divergences > convergences ? 'Active divergence — needs attention' : 'Mixed signals'
              const trendColor = convergences > divergences ? '#085041' : divergences > convergences ? '#791F1F' : '#8A5C1A'
              const trendBg = convergences > divergences ? '#E7F6EF' : divergences > convergences ? '#FCEBEB' : '#FDF3E3'
              return (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>Alignment feed</span>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: trendBg, color: trendColor }}>{trendLabel}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {sigs.map(sig => (
                      <div key={sig.id} style={{ background: 'var(--gw-bg)', border: '0.5px solid var(--gw-border)', borderRadius: 8, padding: '11px 13px' }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: sig.type === 'Convergence' ? 'var(--gw-green-bg)' : sig.type === 'Divergence' ? 'var(--gw-red-bg)' : 'var(--gw-amber-bg)', color: sig.type === 'Convergence' ? 'var(--gw-green-t)' : sig.type === 'Divergence' ? 'var(--gw-red-t)' : 'var(--gw-amber-t)' }}>{sig.type}</span>
                          <span style={{ fontSize: 11, color: 'var(--gw-muted)' }}>Session {sig.sessionNum}</span>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--gw-text)', lineHeight: 1.55 }}>{sig.text}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })()}

            {/* Fix 12: Add contributor */}
            <div style={{ marginTop: 20 }}>
              {!addingParticipant ? (
                <button onClick={() => setAddingParticipant(true)} style={{ width: '100%', padding: '11px 16px', borderRadius: 8, background: 'none', color: 'var(--gw-navy)', fontSize: 13, fontWeight: 600, border: '1px dashed var(--gw-blue-b)', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <span style={{ fontSize: 16, fontWeight: 300 }}>+</span> Add a contributor
                </button>
              ) : (
                <div style={{ border: '1px solid var(--gw-border)', borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Add a contributor</div>
                  <input type="email" placeholder="name@company.com" value={newParticipantEmail} onChange={e => setNewParticipantEmail(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--gw-border)', fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: 8, outline: 'none' }} />
                  <input type="text" placeholder="What do you want them to account for? (optional)" value={newParticipantNote} onChange={e => setNewParticipantNote(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--gw-border)', fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: 10, outline: 'none' }} />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => { setAddingParticipant(false); setNewParticipantEmail(''); setNewParticipantNote('') }}
                      style={{ padding: '9px 14px', borderRadius: 7, background: 'none', border: '1px solid var(--gw-border)', color: 'var(--gw-sub)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
                    <button onClick={() => addParticipantMut.mutate()} disabled={!newParticipantEmail.includes('@') || addParticipantMut.isPending}
                      style={{ flex: 1, padding: '9px 14px', borderRadius: 7, background: 'var(--gw-navy)', color: 'white', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit', opacity: newParticipantEmail.includes('@') ? 1 : 0.4 }}>
                      {addParticipantMut.isPending ? 'Inviting…' : 'Send invite'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* CHECK-INS */}
        {tab === 'checkins' && (
          <div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(ground.checkIns ?? []).length === 0 && (
                <div style={{ fontSize: 13, color: 'var(--gw-muted)', textAlign: 'center', padding: 24 }}>No check-ins yet.</div>
              )}
              {ground.checkIns?.map(ci => (
                <div key={ci.id} style={{ background: 'white', border: '0.5px solid var(--gw-border)', borderRadius: 8, padding: '12px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>Session {ci.sessionNumber}</div>
                    <span className={`gw-pill ${ci.status === 'COMPLETED' ? 'gw-pill-green' : ci.status === 'IN_PROGRESS' ? 'gw-pill-amber' : 'gw-pill-gray'}`}>
                      {ci.status.replace(/_/g, ' ').toLowerCase()}
                    </span>
                  </div>
                  {ci.completedAt && <div style={{ fontSize: 11, color: 'var(--gw-muted)', marginTop: 4 }}>{new Date(ci.completedAt).toLocaleDateString()}</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* DOCUMENTS */}
        {tab === 'docs' && (
          <div>
            <div
              style={{ border: '1.5px dashed var(--gw-border)', borderRadius: 8, padding: 20, textAlign: 'center', cursor: 'pointer', marginBottom: 16, background: 'var(--gw-bg)' }}
              onClick={() => document.getElementById('ga-doc-upload')?.click()}
            >
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gw-navy)', marginBottom: 4 }}>Upload a document</div>
              <div style={{ fontSize: 12, color: 'var(--gw-sub)' }}>PDF, DOCX, JPEG, PNG, CSV, XLSX</div>
              <input type="file" id="ga-doc-upload" style={{ display: 'none' }} accept=".pdf,.docx,.jpeg,.jpg,.png,.csv,.xlsx"
                onChange={e => { const f = e.target.files?.[0]; if (f) uploadDoc.mutate(f); e.target.value = '' }} />
            </div>

            {docs.length === 0 && <div style={{ fontSize: 13, color: 'var(--gw-muted)', textAlign: 'center', padding: 16 }}>No documents uploaded yet.</div>}
            {docs.map(doc => (
              <div key={doc.id} style={{ background: 'white', border: '0.5px solid var(--gw-border)', borderRadius: 8, padding: '11px 14px', marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{doc.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--gw-muted)' }}>{new Date(doc.uploadedAt).toLocaleDateString()}</div>
                </div>
                <button onClick={() => deleteDoc.mutate(doc.id)} style={{ fontSize: 12, color: 'var(--gw-red-t)', background: 'none', border: 'none', cursor: 'pointer' }}>Delete</button>
              </div>
            ))}

            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Context notes</div>
              <div className="gw-fld">
                <textarea className="gw-ta" rows={3} value={ctxNote} onChange={e => setCtxNote(e.target.value)} placeholder="Add a context note: changed scope, revised goal, new constraint…" />
              </div>
              <button onClick={() => { if (ctxNote.trim()) addNote.mutate(ctxNote.trim()) }}
                disabled={addNote.isPending}
                style={{ padding: '8px 16px', borderRadius: 6, background: 'var(--gw-navy)', color: 'white', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer', fontFamily: 'inherit', marginBottom: 14 }}>
                {addNote.isPending ? 'Saving…' : 'Add note'}
              </button>
              {(ground.contextNotes ?? []).map((n, i) => (
                <div key={i} style={{ background: 'white', border: '0.5px solid var(--gw-border)', borderRadius: 8, padding: '10px 12px', fontSize: 13, color: 'var(--gw-sub)', marginBottom: 8, lineHeight: 1.6 }}>{n}</div>
              ))}
            </div>
          </div>
        )}

        {/* REPORT */}
        {tab === 'report' && (
          <div>
            {/* Confidence band header */}
            <div style={{ textAlign: 'center', padding: '20px 0 16px' }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--gw-navy)' }}>{conf}/5</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--gw-sub)', marginTop: 2 }}>{bl}</div>
              <div style={{ fontSize: 12, color: 'var(--gw-sub)', marginTop: 4 }}>{CONF_DESC[conf] ?? ''}</div>
            </div>

            {/* Session switcher */}
            {report?.releasedAt && (
              <div style={{ display: 'flex', gap: 6, marginBottom: 16, background: 'var(--gw-bg)', border: '0.5px solid var(--gw-border)', borderRadius: 8, padding: 4 }}>
                {(['s1', 's2', 'closing'] as ReportSession[]).map(s => (
                  <button
                    key={s}
                    onClick={() => setReportSession(s)}
                    style={{ flex: 1, padding: '7px 0', borderRadius: 6, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 600, background: reportSession === s ? 'white' : 'transparent', color: reportSession === s ? 'var(--gw-navy)' : 'var(--gw-sub)', boxShadow: reportSession === s ? '0 1px 3px rgba(0,0,0,.08)' : 'none', transition: 'all .15s' }}
                  >
                    {{ s1: 'Session 1', s2: 'Session 2', closing: 'Closing' }[s]}
                  </button>
                ))}
              </div>
            )}

            {report?.releasedAt && activationStatus && (
              <div style={{ background: 'var(--gw-bg)', border: '0.5px solid var(--gw-border)', borderRadius: 9, padding: '12px 14px', marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gw-sub)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 8 }}>
                  Report reveal status {activationStatus.allActivated ? '· Both activated' : '· Waiting'}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {activationStatus.parties.map((p, i) => (
                    <div key={p.participantId} style={{ flex: 1, padding: '8px 10px', borderRadius: 7, background: p.activated ? 'rgba(8,80,65,0.07)' : 'white', border: `1px solid ${p.activated ? '#085041' : 'var(--gw-border)'}`, textAlign: 'center' }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: p.activated ? '#085041' : 'var(--gw-sub)' }}>
                        {p.activated ? 'Revealed' : 'Not yet'}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--gw-sub)', marginTop: 2 }}>Party {i + 1}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {report?.releasedAt ? (
              <div>
                {/* Pattern */}
                {report.pattern && (
                  <div style={{ background: 'var(--gw-navy)', color: 'white', borderRadius: 10, padding: 16, marginBottom: 14 }}>
                    <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,.55)', marginBottom: 8 }}>What Groundwork saw</div>
                    <div style={{ fontSize: 14, lineHeight: 1.65 }}>{report.pattern}</div>
                  </div>
                )}

                {/* Reached */}
                {report.reached && report.reached.length > 0 && (
                  <ReportSection title="Reached" open>
                    {report.reached.map((r: any, i: number) => (
                      <div key={i} style={{ marginBottom: 10 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{r.title}</div>
                        <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.55 }}>{r.note}</div>
                      </div>
                    ))}
                  </ReportSection>
                )}

                {/* Areas */}
                {report.areas && report.areas.length > 0 && (
                  <ReportSection title="Areas">
                    {report.areas.map((a: any, i: number) => (
                      <div key={i} style={{ marginBottom: 14 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 3 }}>{a.title}</div>
                        <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.55, marginBottom: 4 }}>{a.observation}</div>
                        {a.recommendation && <div style={{ fontSize: 12, color: 'var(--gw-navy)', lineHeight: 1.55 }}>{a.recommendation}</div>}
                      </div>
                    ))}
                  </ReportSection>
                )}

                {/* Agreements (closing) */}
                {report.agreed && report.agreed.length > 0 && (
                  <ReportSection title="Agreed">
                    <ul style={{ listStyle: 'disc', paddingLeft: 18 }}>{report.agreed.map((a: string, i: number) => <li key={i} style={{ marginBottom: 4, fontSize: 13 }} dangerouslySetInnerHTML={{ __html: a }} />)}</ul>
                  </ReportSection>
                )}

                {/* Honest close */}
                {report.close && (
                  <ReportSection title="Honest close">
                    {[
                      { label: 'Aligned', text: report.close.aligned },
                      { label: 'Still open', text: report.close.open },
                      { label: 'To revisit', text: report.close.revisit },
                      { label: 'Risk', text: report.close.risk },
                    ].filter(r => r.text).map(r => (
                      <div key={r.label} style={{ marginBottom: 10 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gw-sub)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 3 }}>{r.label}</div>
                        <div style={{ fontSize: 13, lineHeight: 1.55 }}>{r.text}</div>
                      </div>
                    ))}
                  </ReportSection>
                )}

                {/* Legacy flat fields */}
                {!report.pattern && report.sharedPicture && (
                  <div style={{ background: 'var(--gw-navy)', color: 'white', borderRadius: 10, padding: 16, marginBottom: 14 }}>
                    <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,.55)', marginBottom: 8 }}>Resolution summary</div>
                    <div style={{ fontSize: 14, lineHeight: 1.65 }}>{report.sharedPicture}</div>
                    <button onClick={() => navigator.clipboard?.writeText(report.sharedPicture).then(() => toast.success('Copied'))}
                      style={{ marginTop: 12, fontSize: 12, fontWeight: 600, color: 'white', background: 'rgba(255,255,255,.15)', border: 'none', cursor: 'pointer', padding: '7px 12px', borderRadius: 6, fontFamily: 'inherit' }}>
                      Copy
                    </button>
                  </div>
                )}
                {!report.areas && report.divergences?.length > 0 && (
                  <ReportSection title="Divergences">
                    {report.divergences.map((d: any, i: number) => (
                      <div key={i} style={{ marginBottom: 12 }}>
                        <div style={{ fontWeight: 600, marginBottom: 6 }}>{d.topic}</div>
                        {d.positions.map((pos: any) => (
                          <div key={pos.participantLabel} style={{ fontSize: 12, color: 'var(--gw-sub)', marginBottom: 4 }}>
                            <strong>{pos.participantLabel}:</strong> {pos.view}
                          </div>
                        ))}
                      </div>
                    ))}
                  </ReportSection>
                )}

                {/* Fix 17: Post-report offboarding */}
                <div style={{ marginTop: 16, background: 'var(--gw-bg)', border: '0.5px solid var(--gw-border)', borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--gw-sub)', marginBottom: 10 }}>What now?</div>
                  {[
                    { title: 'Share the report', body: 'Both parties can now view the full report. Use the report link or a shared doc to talk through it together.' },
                    { title: 'Act on the areas requiring alignment', body: 'Pick the highest-priority gap and set a concrete next step. Name who owns it and by when.' },
                    { title: 'Open a follow-up ground', body: 'If there is ongoing work to track, open a new ground to keep the record current as things develop.' },
                  ].map(s => (
                    <div key={s.title} style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{s.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.55 }}>{s.body}</div>
                    </div>
                  ))}
                  <button onClick={() => navigate('/grounds/new')} style={{ marginTop: 4, fontSize: 13, fontWeight: 700, color: 'var(--gw-navy)', background: 'none', border: '1px solid var(--gw-blue-b)', borderRadius: 7, padding: '8px 14px', cursor: 'pointer', fontFamily: 'inherit' }}>
                    Open a follow-up ground →
                  </button>
                </div>
              </div>
            ) : report?.createdAt ? (
              <div>
                <div style={{ background: 'var(--gw-bg)', border: '0.5px solid var(--gw-border)', borderRadius: 10, padding: 16, marginBottom: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Report is ready</div>
                  <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.6, marginBottom: 14 }}>Both parties have completed their sessions. When you release the report, both parties see it simultaneously — neither reads it before the other. Billing activates on release.</div>
                  {!showReleaseConfirm ? (
                    <button onClick={() => setShowReleaseConfirm(true)}
                      style={{ width: '100%', padding: 12, borderRadius: 7, background: 'var(--gw-navy)', color: 'white', fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                      Release report to both parties
                    </button>
                  ) : (
                    <div style={{ background: '#FDF3E3', border: '1px solid #E8A94A', borderRadius: 8, padding: '14px 16px' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#8A5C1A', marginBottom: 6 }}>Release report?</div>
                      <div style={{ fontSize: 12, color: '#6B6560', lineHeight: 1.6, marginBottom: 14 }}>Both parties will see the report simultaneously. This cannot be undone. Billing activates on release.</div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => setShowReleaseConfirm(false)}
                          style={{ flex: 1, padding: '9px 12px', borderRadius: 7, background: 'none', border: '1px solid #E2E0DB', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', color: 'var(--gw-sub)' }}>
                          Cancel
                        </button>
                        <button onClick={() => { releaseReport.mutate(); setShowReleaseConfirm(false) }} disabled={releaseReport.isPending}
                          style={{ flex: 1, padding: '9px 12px', borderRadius: 7, background: 'var(--gw-navy)', color: 'white', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                          {releaseReport.isPending ? 'Releasing…' : 'Confirm release'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ background: 'var(--gw-bg)', border: '0.5px solid var(--gw-border)', borderRadius: 10, padding: 16, marginBottom: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Waiting for sessions</div>
                <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.6, marginBottom: 12 }}>The report generates after both parties complete their sessions.</div>
                <button onClick={() => setTab('checkins')} style={{ fontSize: 12, color: 'var(--gw-navy)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit', fontWeight: 600, textDecoration: 'underline' }}>
                  View check-in progress
                </button>
              </div>
            )}
          </div>
        )}

        {/* SETTINGS */}
        {tab === 'settings' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="gw-fld">
              <label className="gw-label">Ground name</label>
              <input className="gw-input" value={groundLabel} onChange={e => setGroundLabel(e.target.value)} />
              <button
                disabled={!groundLabel.trim() || groundLabel === ground.label}
                onClick={() => { if (groundLabel.trim() && groundLabel !== ground.label) groundsApi.update(id!, { label: groundLabel.trim() }).then(() => qc.invalidateQueries({ queryKey: ['ground', id] })).catch(() => toast.error('Could not update name.')) }}
                style={{ marginTop: 6, fontSize: 12, color: 'var(--gw-navy)', background: 'none', border: '0.5px solid var(--gw-blue-b)', borderRadius: 5, padding: '4px 10px', cursor: 'pointer', fontFamily: 'inherit', opacity: (groundLabel.trim() && groundLabel !== ground.label) ? 1 : 0.4 }}
              >
                Save name
              </button>
            </div>
            <button onClick={() => navigate('/billing')}
              style={{ width: '100%', padding: 11, borderRadius: 7, background: 'none', color: 'var(--gw-navy)', fontSize: 13, fontWeight: 600, border: '1px solid var(--gw-blue-b)', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Billing and seats</span><span style={{ color: 'var(--gw-sub)' }}>→</span>
            </button>
            <div style={{ padding: 14, background: 'var(--gw-red-bg)', border: '0.5px solid var(--gw-red-b)', borderRadius: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gw-red-t)', marginBottom: 6 }}>Close ground</div>
              <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.6, marginBottom: 10 }}>Closing the ground writes the final resolution record. Both parties keep their record permanently.</div>
              <button style={{ fontSize: 13, fontWeight: 600, color: 'var(--gw-red-t)', background: 'none', border: '1px solid var(--gw-red-b)', padding: '8px 14px', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit' }}>
                Close this ground
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div style={{ minHeight: '100vh', background: 'var(--gw-bg)' }}>{children}</div>
}

function ReportSection({ title, children, open: initialOpen = false }: { title: string; children: React.ReactNode; open?: boolean }) {
  const [open, setOpen] = useState(initialOpen)
  return (
    <div className={`gw-report-section${open ? ' open' : ''}`} style={{ marginBottom: 10 }}>
      <div className="gw-report-section-hdr" onClick={() => setOpen(o => !o)}>
        <span>{title}</span>
        <span style={{ color: 'var(--gw-muted)', fontSize: 12 }}>{open ? '▲' : '▼'}</span>
      </div>
      <div className="gw-report-section-body">{children}</div>
    </div>
  )
}
