import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { groundsApi } from '@/api/grounds'
import { useAuthStore } from '@/stores/auth'
import { reportsApi } from '@/api/reports'
import { documentsApi } from '@/api/documents'
import { ConfDots } from '@/components/ConfDots'
import { toast } from 'sonner'

type Tab = 'checkin' | 'record' | 'docs' | 'report' | 'profile'

export function GroundParticipantPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [tab, setTab] = useState<Tab>('checkin')

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

  if (isLoading) return <div style={{ flex: 1, background: 'var(--gw-bg)', padding: 24, fontSize: 13, color: 'var(--gw-muted)' }}>Loading…</div>
  if (!ground) return <div style={{ flex: 1, background: 'var(--gw-bg)', padding: 24, fontSize: 13, color: 'var(--gw-muted)' }}>Ground not found.</div>

  const conf = ground.confidence ?? 1

  // Find this user's participant record, then their check-ins only
  const myParticipant = (ground.participants ?? []).find((p: any) => p.userId === user?.id)
  const myCheckIns: any[] = (ground.checkIns ?? []).filter((ci: any) => ci.participantId === myParticipant?.id)
  // The most recent open/in-progress check-in (or latest) is the active one
  const myCheckIn = myCheckIns.find((ci: any) => ci.status !== 'COMPLETED') ?? myCheckIns[myCheckIns.length - 1]
  const sessionOpen = myCheckIn && myCheckIn.status !== 'COMPLETED'

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--gw-bg)', minHeight: 0, overflow: 'hidden' }}>
      {/* Sticky header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'var(--gw-bg)', borderBottom: '0.5px solid var(--gw-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
            <span onClick={() => navigate('/grounds')} style={{ fontSize: 13, color: 'var(--gw-sub)', cursor: 'pointer', flexShrink: 0 }}>← Grounds</span>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ground.label}</div>
              <div style={{ fontSize: 12, color: 'var(--gw-sub)', marginTop: 1 }}>Your words are private.</div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <ConfDots score={conf} />
            <div style={{ fontSize: 10, color: 'var(--gw-sub)', marginTop: 2 }}>{conf}/5</div>
          </div>
        </div>

        {ground.resolutionState && (
          <div style={{ padding: '0 16px 8px' }}>
            <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: 'var(--gw-blue-bg)', color: 'var(--gw-navy)' }}>{ground.resolutionState}</span>
          </div>
        )}

        <div className="gw-tabs-scroll" style={{ display: 'flex', borderTop: '0.5px solid var(--gw-border)' }}>
          {(['checkin','record','docs','report','profile'] as Tab[]).map(t => (
            <button key={t} className={`gw-tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>
              {({ checkin: 'My check-in', record: 'My record', docs: 'Documents', report: 'Report', profile: 'My profile' })[t]}
            </button>
          ))}
        </div>
      </div>

      <div className="gw-bd" style={{ paddingTop: 12, maxWidth: 600, margin: '0 auto', width: '100%' }}>

        {/* MY CHECK-IN */}
        {tab === 'checkin' && (
          <div>
            {sessionOpen ? (
              <div>
                <div style={{ fontSize: 14, color: 'var(--gw-sub)', lineHeight: 1.6, marginBottom: 20 }}>
                  Session {myCheckIn.sessionNumber} is open.
                </div>
                <button
                  onClick={() => navigate(`/checkin/${myCheckIn.id}`, { state: { sessionNumber: myCheckIn.sessionNumber, groundLabel: ground.label, groundId: id } })}
                  style={{ width: '100%', padding: 16, borderRadius: 8, background: 'var(--gw-navy)', color: 'white', fontSize: 15, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit', marginBottom: 12 }}
                >
                  Start session {myCheckIn.sessionNumber}
                </button>
                <div style={{ fontSize: 12, color: 'var(--gw-sub)', textAlign: 'center', lineHeight: 1.6 }}>Your answers are private. Other parties cannot see what you write until all parties activate the report.</div>
              </div>
            ) : (
              <div style={{ background: 'var(--gw-green-bg)', border: '0.5px solid var(--gw-green-b)', borderRadius: 8, padding: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gw-green-t)', marginBottom: 5 }}>Session complete</div>
                <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.6 }}>Your contribution has been recorded. The administrator releases the report once all parties complete their most recent session.</div>
              </div>
            )}
          </div>
        )}

        {/* MY RECORD */}
        {tab === 'record' && (
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Your record is building.</div>
            <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.6, marginBottom: 16 }}>This view is yours alone. Nobody else sees it.</div>
            {myCheckIns.length === 0 && (
              <div style={{ fontSize: 13, color: 'var(--gw-muted)', textAlign: 'center', padding: 24 }}>No sessions yet.</div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {myCheckIns.map((ci: any) => (
                <div key={ci.id} style={{ background: 'white', border: '0.5px solid var(--gw-border)', borderRadius: 8, padding: '12px 14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>Session {ci.sessionNumber}</div>
                    <span className={`gw-pill ${ci.status === 'COMPLETED' ? 'gw-pill-green' : 'gw-pill-amber'}`}>
                      {ci.status === 'COMPLETED' ? 'Complete' : 'In progress'}
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
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Ground documents</div>
            <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.6, marginBottom: 14, background: 'var(--gw-bg)', borderRadius: 7, padding: '10px 12px' }}>
              Documents the admin has shared appear here. Your uploads are part of your private record until the report activates.
            </div>
            <div style={{ border: '1.5px dashed var(--gw-border)', borderRadius: 8, padding: 16, textAlign: 'center', cursor: 'pointer', marginBottom: 12 }} onClick={() => document.getElementById('gp-doc-upload')?.click()}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gw-navy)' }}>Upload a supporting document</div>
              <div style={{ fontSize: 12, color: 'var(--gw-sub)', marginTop: 3 }}>PDF, DOCX, JPEG, PNG</div>
              <input type="file" id="gp-doc-upload" style={{ display: 'none' }} accept=".pdf,.docx,.jpeg,.jpg,.png"
                onChange={e => { const f = e.target.files?.[0]; if (f) uploadDoc.mutate(f); e.target.value = '' }} />
            </div>
            {docs.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--gw-sub)', textAlign: 'center', padding: 16, background: 'var(--gw-bg)', borderRadius: 8, border: '0.5px solid var(--gw-border)' }}>No documents in this ground yet.</div>
            ) : (
              docs.map(doc => (
                <div key={doc.id} style={{ background: 'white', border: '0.5px solid var(--gw-border)', borderRadius: 8, padding: '11px 14px', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{doc.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--gw-muted)' }}>{new Date(doc.uploadedAt).toLocaleDateString()}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* REPORT */}
        {tab === 'report' && (
          <div>
            <div style={{ textAlign: 'center', padding: '20px 0 16px' }}>
              <ConfDots score={conf} />
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--gw-navy)', margin: '8px 0 4px' }}>{conf}/5</div>
              <div style={{ fontSize: 13, color: 'var(--gw-sub)' }}>{conf < 3 ? 'One account only. Other accounts are needed.' : 'Evidence building.'}</div>
            </div>

            {report?.releasedAt ? (
              <div>
                <button
                  onClick={() => navigate(`/grounds/${id}/report`)}
                  style={{ width: '100%', padding: '11px 0', borderRadius: 8, background: '#0A1628', color: 'white', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit', marginBottom: 16 }}
                >
                  View full report →
                </button>
                {/* 1. Your account, confirmed */}
                <div style={{ background: 'var(--gw-navy)', color: 'white', borderRadius: 10, padding: 16, marginBottom: 12 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,.55)', marginBottom: 6 }}>Your account, confirmed</div>
                  <div style={{ fontSize: 13, lineHeight: 1.65 }}>
                    {report.soloArtifact?.summary ?? report.sharedPicture}
                  </div>
                </div>

                {/* 2. Ground confidence */}
                <div style={{ background: 'white', border: '0.5px solid var(--gw-border)', borderRadius: 8, padding: '12px 14px', marginBottom: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gw-muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6 }}>Ground confidence</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <ConfDots score={conf} />
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gw-navy)' }}>{conf}/5</div>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.5 }}>
                    {conf <= 2 ? 'Two sessions recorded. The picture is forming. Session 2 will test whether both accounts hold.' : conf <= 3 ? 'Three sessions. A pattern is visible.' : 'Strong evidence base.'}
                  </div>
                </div>

                {/* 3. What session 2 will probe */}
                {((report.divergences ?? []).length > 0 || report.soloArtifact?.whatToCarry) && (
                  <div style={{ background: 'white', border: '0.5px solid var(--gw-border)', borderRadius: 8, padding: '12px 14px', marginBottom: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gw-muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>What session 2 will probe</div>
                    {report.divergences?.slice(0, 3).map((d, i) => (
                      <div key={i} style={{ fontSize: 12, color: 'var(--gw-text)', lineHeight: 1.6, marginBottom: 5, paddingLeft: 10, borderLeft: '2px solid var(--gw-border)' }}>
                        {d.topic}
                      </div>
                    ))}
                    {report.soloArtifact?.whatToCarry && (report.divergences?.length ?? 0) === 0 && (
                      <div style={{ fontSize: 12, color: 'var(--gw-text)', lineHeight: 1.6 }}>{report.soloArtifact.whatToCarry}</div>
                    )}
                  </div>
                )}

                {/* 4. Privacy reminder */}
                <div style={{ background: 'var(--gw-bg)', border: '0.5px solid var(--gw-border)', borderRadius: 8, padding: '12px 14px', marginBottom: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gw-muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6 }}>Privacy reminder</div>
                  <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.65 }}>Your account is private. Other parties cannot see what you wrote. No party sees the others' sessions until all parties activate the report.</div>
                </div>

                <button onClick={() => navigate('/grounds/new')}
                  style={{ width: '100%', padding: 11, borderRadius: 7, background: 'none', color: 'var(--gw-navy)', fontSize: 13, fontWeight: 600, border: '1px solid var(--gw-blue-b)', cursor: 'pointer', fontFamily: 'inherit' }}>
                  Open your own ground
                </button>
              </div>
            ) : (
              <div>
                {/* Even before report release, show what participant knows about their own sessions */}
                {myCheckIns.length > 0 && myCheckIns.some((ci: any) => ci.status === 'COMPLETED') && (
                  <div style={{ background: 'white', border: '0.5px solid var(--gw-border)', borderRadius: 8, padding: '12px 14px', marginBottom: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gw-muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6 }}>Your sessions so far</div>
                    {myCheckIns.filter((ci: any) => ci.status === 'COMPLETED').map((ci: any) => (
                      <div key={ci.id} style={{ fontSize: 12, color: 'var(--gw-text)', lineHeight: 1.6, marginBottom: 4 }}>
                        Session {ci.sessionNumber} complete{ci.completedAt ? ` · ${new Date(ci.completedAt).toLocaleDateString()}` : ''}
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ background: 'var(--gw-bg)', border: '0.5px solid var(--gw-border)', borderRadius: 10, padding: 16, marginBottom: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 5 }}>Report not yet released</div>
                  <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.6 }}>The report is released by the ground administrator once all parties have completed their most recent session. All parties see it at the same time.</div>
                </div>

                <div style={{ background: 'var(--gw-bg)', border: '0.5px solid var(--gw-border)', borderRadius: 8, padding: '12px 14px' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gw-muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 5 }}>Privacy reminder</div>
                  <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.65 }}>Other parties cannot read your session words. Your record is yours alone until the report is released.</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* MY PROFILE */}
        {tab === 'profile' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>My Groundwork profile</div>
              <button onClick={() => { navigator.clipboard?.writeText(`${window.location.origin}/profile`); toast.success('Link copied') }}
                style={{ fontSize: 12, fontWeight: 600, color: 'var(--gw-navy)', background: 'var(--gw-blue-bg)', border: '0.5px solid var(--gw-blue-b)', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontFamily: 'inherit' }}>
                Copy link
              </button>
            </div>
            <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.6, marginBottom: 16, background: 'var(--gw-bg)', borderRadius: 7, padding: '10px 12px' }}>
              Your profile shows closed grounds you have chosen to make public. Toggle each ground below.
            </div>
            <div style={{ fontSize: 13, color: 'var(--gw-sub)', textAlign: 'center', padding: 16, background: 'var(--gw-bg)', borderRadius: 8, border: '0.5px solid var(--gw-border)' }}>
              Your profile is building. Each closed ground adds a verified record.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
