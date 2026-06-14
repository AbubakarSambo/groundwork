import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { groundsApi } from '@/api/grounds'
import { reportsApi } from '@/api/reports'
import { documentsApi } from '@/api/documents'
import { conversationApi } from '@/api/conversation'
import { billingApi } from '@/api/billing'
import { useAuthStore } from '@/stores/auth'
import { toast } from 'sonner'

function ConfDots({ score, large }: { score?: number; large?: boolean }) {
  const n = score ?? 0
  const sz = large ? 12 : 7
  return (
    <div className="gw-conf-dots">
      {[1,2,3,4,5].map(i => (
        <div key={i} className={`gw-conf-dot${n >= i ? ` f${i}` : ''}`} style={large ? { width: sz, height: sz } : {}} />
      ))}
    </div>
  )
}

const CONF_DESC: Record<number, string> = {
  1: 'One account only. The other party is needed.',
  2: 'Two accounts. Picture is forming.',
  3: 'Three sessions. Pattern visible but not confirmed.',
  4: 'Four sessions. Evidence strong. Recommendation defensible.',
  5: 'Five sessions. Full picture. High confidence.',
}

type Tab = 'overview' | 'checkins' | 'docs' | 'report' | 'settings'

export function GroundAdminPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [tab, setTab] = useState<Tab>('overview')
  const [ctxNote, setCtxNote] = useState('')
  const user = useAuthStore(s => s.user)

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

  const { data: billingStatus } = useQuery({
    queryKey: ['billing'],
    queryFn: billingApi.status,
    enabled: tab === 'report',
  })

  const { data: docs = [] } = useQuery({
    queryKey: ['docs', id],
    queryFn: () => documentsApi.list(id!),
    enabled: !!id && tab === 'docs',
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

  const remind = useMutation({
    mutationFn: (checkInId: string) => conversationApi.remind(checkInId),
    onSuccess: () => toast.success('Reminder sent'),
  })

  const addNote = useMutation({
    mutationFn: (note: string) => groundsApi.update(id!, { contextNote: note }),
    onSuccess: () => { setCtxNote(''); qc.invalidateQueries({ queryKey: ['ground', id] }) },
    onError: () => toast.error('Could not save note.'),
  })

  if (isLoading) return <Shell><div style={{ padding: 24, fontSize: 13, color: 'var(--gw-muted)' }}>Loading…</div></Shell>
  if (!ground) return <Shell><div style={{ padding: 24, fontSize: 13, color: 'var(--gw-muted)' }}>Ground not found.</div></Shell>

  const conf = ground.confidence ?? 1

  const myParticipant = (ground.participants ?? []).find((p: any) => p.userId === user?.id)
  const myOpenCheckIn = myParticipant
    ? (ground.checkIns ?? []).find((ci: any) => ci.participantId === myParticipant.id && ci.status !== 'COMPLETED')
    : null

  // Paywall: all active parties have completed session 5 but billing isn't active.
  const activeParties = (ground.participants ?? []).filter((p: any) => p.userId)
  const session5Completions = (ground.checkIns ?? []).filter((ci: any) => ci.sessionNumber === 5 && ci.status === 'COMPLETED')
  const paywallActive = activeParties.length >= 2 && session5Completions.length >= activeParties.length && !billingStatus?.careFeeActive

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--gw-bg)' }}>
      {myOpenCheckIn && (
        <div style={{ background: 'var(--gw-navy)', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,.85)', lineHeight: 1.4 }}>
            Your session {myOpenCheckIn.sessionNumber} is waiting.
          </div>
          <button
            onClick={() => navigate(`/checkin/${myOpenCheckIn.id}`, { state: { sessionNumber: myOpenCheckIn.sessionNumber, groundLabel: ground.label, groundId: id } })}
            style={{ flexShrink: 0, fontSize: 13, fontWeight: 700, color: 'var(--gw-navy)', background: 'white', border: 'none', borderRadius: 6, padding: '7px 14px', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            Start check-in
          </button>
        </div>
      )}
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
            <ConfDots score={conf} />
            <div style={{ fontSize: 11, color: 'var(--gw-sub)', marginTop: 2 }}>{conf}/5</div>
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
          {(['overview','checkins','docs','report','settings'] as Tab[]).map(t => (
            <button key={t} className={`gw-tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>
              {t.charAt(0).toUpperCase() + t.slice(1).replace('checkins','Check-ins').replace('docs','Documents').replace('report','Report').replace('settings','Settings').replace('overview','Overview')}
            </button>
          ))}
        </div>
      </div>

      <div className="gw-bd" style={{ paddingTop: 12, maxWidth: 600, margin: '0 auto', width: '100%' }}>

        {/* OVERVIEW */}
        {tab === 'overview' && (
          <div>
            <div style={{ background: 'var(--gw-blue-bg)', border: '0.5px solid var(--gw-blue-b)', borderRadius: 10, padding: '14px 16px', marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gw-navy)', letterSpacing: '.04em', textTransform: 'uppercase', marginBottom: 8 }}>Ground summary</div>
              <div style={{ fontSize: 13, lineHeight: 1.65 }}>{ground.brief ?? 'Waiting for first session pair to complete.'}</div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Participants</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {ground.participants.map((p, i) => {
                  const myCheckIn = ground.checkIns?.find(c => c.participantId === p.id)
                  const status = myCheckIn?.status ?? 'NOT_STARTED'
                  const statusColor = status === 'COMPLETED' ? 'var(--gw-green-b)' : status === 'IN_PROGRESS' ? 'var(--gw-amber-b)' : 'var(--gw-border)'
                  return (
                    <div key={p.id} className="ga-participant-row">
                      <div className="ga-status-dot" style={{ background: statusColor }} />
                      <div className={`gw-av gw-av-${i % 6}`}>{(p.email || '?').charAt(0).toUpperCase()}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{p.email}</div>
                        <div style={{ fontSize: 11, color: 'var(--gw-muted)' }}>{p.partyType === 'INITIATOR' ? 'Initiator' : 'Participant'} · {status.replace(/_/g, ' ').toLowerCase()}</div>
                      </div>
                      {myCheckIn && status !== 'COMPLETED' && (
                        <button onClick={() => remind.mutate(myCheckIn.id)} style={{ fontSize: 11, color: 'var(--gw-navy)', background: 'none', border: 'none', cursor: 'pointer' }}>Remind</button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {(ground.signals ?? []).length > 0 && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>Alignment feed</span>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--gw-green-b)', display: 'inline-block' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {ground.signals?.map(sig => (
                    <div key={sig.id} style={{ background: 'var(--gw-bg)', border: '0.5px solid var(--gw-border)', borderRadius: 8, padding: '11px 13px', animation: 'gw-fadein .4s ease forwards' }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: sig.type === 'Convergence' ? 'var(--gw-green-bg)' : sig.type === 'Divergence' ? 'var(--gw-red-bg)' : 'var(--gw-amber-bg)', color: sig.type === 'Convergence' ? 'var(--gw-green-t)' : sig.type === 'Divergence' ? 'var(--gw-red-t)' : 'var(--gw-amber-t)' }}>{sig.type}</span>
                        <span style={{ fontSize: 11, color: 'var(--gw-muted)' }}>Session {sig.sessionNum}</span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--gw-text)', lineHeight: 1.55 }}>{sig.text}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
            <div style={{ textAlign: 'center', padding: '24px 0 20px' }}>
              <ConfDots score={conf} large />
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--gw-navy)', margin: '10px 0 4px' }}>{conf}/5</div>
              <div style={{ fontSize: 13, color: 'var(--gw-sub)' }}>{CONF_DESC[conf] ?? ''}</div>
            </div>

            {paywallActive && (
              <div style={{ background: 'var(--gw-amber-bg)', border: '0.5px solid var(--gw-amber-b)', borderRadius: 10, padding: 16, marginBottom: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gw-amber-t)', marginBottom: 6 }}>Session 5 complete — activate billing to continue</div>
                <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.6, marginBottom: 12 }}>Both parties have completed session 5. Sessions 1–5 are free. Activate billing to unlock the session 5 report and continue to session 6+.</div>
                <button onClick={() => navigate('/billing')}
                  style={{ padding: '10px 18px', borderRadius: 6, background: 'var(--gw-navy)', color: 'white', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                  Activate billing →
                </button>
              </div>
            )}

            {report?.releasedAt ? (
              <div>
                <div style={{ background: 'var(--gw-navy)', color: 'white', borderRadius: 10, padding: 16, marginBottom: 14 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,.55)', marginBottom: 8 }}>Resolution summary</div>
                  <div style={{ fontSize: 14, lineHeight: 1.65 }}>{report.sharedPicture}</div>
                  <button onClick={() => navigator.clipboard?.writeText(report.sharedPicture).then(() => toast.success('Copied'))}
                    style={{ marginTop: 12, fontSize: 12, fontWeight: 600, color: 'white', background: 'rgba(255,255,255,.15)', border: 'none', cursor: 'pointer', padding: '7px 12px', borderRadius: 6, fontFamily: 'inherit' }}>
                    Copy
                  </button>
                </div>
                {report.agreements?.length > 0 && (
                  <ReportSection title="Agreements" open>
                    <ul style={{ listStyle: 'disc', paddingLeft: 18 }}>{report.agreements.map((a, i) => <li key={i} style={{ marginBottom: 4 }}>{a}</li>)}</ul>
                  </ReportSection>
                )}
                {report.divergences?.length > 0 && (
                  <ReportSection title="Divergences">
                    {report.divergences.map((d, i) => (
                      <div key={i} style={{ marginBottom: 12 }}>
                        <div style={{ fontWeight: 600, marginBottom: 6 }}>{d.topic}</div>
                        {d.positions.map(pos => (
                          <div key={pos.participantLabel} style={{ fontSize: 12, color: 'var(--gw-sub)', marginBottom: 4 }}>
                            <strong>{pos.participantLabel}:</strong> {pos.view}
                          </div>
                        ))}
                      </div>
                    ))}
                  </ReportSection>
                )}
              </div>
            ) : !paywallActive ? (
              <div style={{ background: 'var(--gw-bg)', border: '0.5px solid var(--gw-border)', borderRadius: 10, padding: 16, marginBottom: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Waiting for sessions</div>
                <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.6 }}>The report generates automatically after both parties complete each session. Check the Check-ins tab to see progress.</div>
              </div>
            ) : null}
          </div>
        )}

        {/* SETTINGS */}
        {tab === 'settings' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="gw-fld">
              <label className="gw-label">Ground name</label>
              <input className="gw-input" defaultValue={ground.label} />
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
