import { useState, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { AxiosError } from 'axios'
import { groundsApi, resolutionApi, dashboardApi, documentsApi, conversationApi, billingApi } from '@/api'
import { useAuthStore } from '@/stores/auth'
import { StatusPill } from '@/components/gw'
import type { CheckInStatus } from '@/types'

const MULTI_PARTY_SCENARIOS = ['NEW_PROJECT', 'CRISIS_ALIGNMENT']

// ─────────────────────────────────────────────────────────────────────────────
// Tab types
// ─────────────────────────────────────────────────────────────────────────────
type AdminTab   = 'overview' | 'checkins' | 'documents' | 'report' | 'settings'
type MemberTab  = 'checkin'  | 'record'   | 'report'

// ─────────────────────────────────────────────────────────────────────────────
// Tab bar component
// ─────────────────────────────────────────────────────────────────────────────
function TabBar<T extends string>({
  tabs,
  active,
  onSelect,
}: {
  tabs: { key: T; label: string }[]
  active: T
  onSelect: (t: T) => void
}) {
  return (
    <div style={{ display: 'flex', borderBottom: '1px solid #E2E0DB', background: 'white', overflowX: 'auto', flexShrink: 0 }}>
      {tabs.map(t => (
        <button
          key={t.key}
          onClick={() => onSelect(t.key)}
          style={{
            padding: '10px 16px',
            fontSize: 13,
            fontWeight: active === t.key ? 600 : 400,
            color: active === t.key ? '#0C447C' : '#6B6560',
            background: 'none',
            border: 'none',
            borderBottom: active === t.key ? '2px solid #0C447C' : '2px solid transparent',
            cursor: 'pointer',
            fontFamily: 'inherit',
            whiteSpace: 'nowrap',
            marginBottom: -1,
          }}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────
export function GroundDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)

  const [email, setEmail] = useState('')
  const [role, setRole] = useState('')
  const [adminTab, setAdminTab]   = useState<AdminTab>('overview')
  const [memberTab, setMemberTab] = useState<MemberTab>('checkin')

  // Tracks whether THIS user has tapped "Activate report" — used for waiting state
  const [hasActivated, setHasActivated] = useState(false)

  const { data: ground, isLoading } = useQuery({
    queryKey: ['ground', id],
    queryFn: () => groundsApi.get(id!),
    enabled: !!id,
  })

  const addParticipant = useMutation({
    mutationFn: () => groundsApi.addParticipant(id!, { email, roleAsDescribed: role || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ground', id] })
      setEmail(''); setRole('')
      toast.success('Invite sent — they are notified, never added silently')
    },
  })

  const activate = useMutation({
    mutationFn: () => groundsApi.activate(id!),
    onSuccess: () => {
      setHasActivated(true)
      qc.invalidateQueries({ queryKey: ['ground', id] })
    },
    onError: (err) => {
      const res = (err as AxiosError<{ requiresBilling?: boolean; checkoutUrl?: string }>).response
      if (res?.status === 402 && res.data?.checkoutUrl) {
        toast.info('Set up billing to activate this ground')
        window.location.href = res.data.checkoutUrl
      } else {
        toast.error('Could not activate — try again.')
      }
    },
  })

  const reopen = useMutation({
    mutationFn: () => groundsApi.patch(id!, { status: 'ACTIVE' }),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ['ground', id] })
      const prev = qc.getQueryData(['ground', id])
      qc.setQueryData(['ground', id], (old: any) => old ? { ...old, status: 'ACTIVE' } : old)
      return { prev }
    },
    onError: (_err, _vars, ctx: any) => {
      if (ctx?.prev) qc.setQueryData(['ground', id], ctx.prev)
      toast.error('Could not reopen this ground.')
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ground', id] })
      toast.success('Ground reopened')
    },
  })

  if (isLoading || !ground) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--gw-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: 13, color: 'var(--gw-muted)' }}>Loading…</div>
      </div>
    )
  }

  const isAdmin = user?.role === 'ADMIN'
  const myParticipant = ground.participants?.find((p: any) => p.userId === user?.id)
  const myCheckIns = ground.checkIns?.filter((c: any) => c.participantId === myParticipant?.id) ?? []
  const myCheckIn = myCheckIns.find((c: any) => c.status === 'NOT_STARTED' || c.status === 'IN_PROGRESS')
    ?? myCheckIns.sort((a: any, b: any) => b.sessionNumber - a.sessionNumber)[0]
  const declinedParticipantIds = new Set<string>(
    (ground.checkIns ?? []).filter((c: any) => c.status === 'DECLINED').map((c: any) => c.participantId),
  )

  // Report state
  const reportReleased = ground.report?.releasedAt != null
  const reportReady    = ground.status === 'REPORT_READY'
  // Show waiting state if this user activated but report isn't out yet
  const waitingForOther = hasActivated && !reportReleased

  // ── ADMIN TABS ────────────────────────────────────────────────────────────

  const adminTabs: { key: AdminTab; label: string }[] = [
    { key: 'overview',  label: 'Overview'   },
    { key: 'checkins',  label: 'Check-ins'  },
    { key: 'documents', label: 'Documents'  },
    { key: 'report',    label: 'Report'     },
    { key: 'settings',  label: 'Settings'   },
  ]

  const memberTabs: { key: MemberTab; label: string }[] = [
    { key: 'checkin', label: 'Check-in' },
    { key: 'record',  label: 'Record'   },
    { key: 'report',  label: 'Report'   },
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gw-bg)', display: 'flex', flexDirection: 'column' }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'white', borderBottom: '0.5px solid #E2E0DB' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button className="gw-back" onClick={() => navigate('/')}>← Grounds</button>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#1A1916', lineHeight: 1.2 }}>{ground.label}</div>
              <div style={{ fontSize: 11, color: 'var(--gw-muted)', marginTop: 1 }}>
                {ground.scenario?.replace(/_/g, ' ').toLowerCase()}
              </div>
            </div>
          </div>
          <StatusPill status={ground.status} />
        </div>

        {isAdmin
          ? <TabBar tabs={adminTabs}  active={adminTab}  onSelect={setAdminTab}  />
          : <TabBar tabs={memberTabs} active={memberTab} onSelect={setMemberTab} />
        }
      </div>

      {/* ── Tab content ────────────────────────────────────────────────────── */}
      <div className="gw-bd" style={{ maxWidth: 600, margin: '0 auto', width: '100%', paddingTop: 12 }}>

        {/* ═══ ADMIN TABS ══════════════════════════════════════════════════ */}
        {isAdmin && (
          <>
            {/* OVERVIEW */}
            {adminTab === 'overview' && (
              <>
                {ground?.scenario === 'NEW_COFOUNDER' && (
                  <CofounderAlignmentSection participants={ground.participants ?? []} />
                )}
                {ground?.timelineDays > 0 && (
                  <PeriodProgressSection timelineDays={ground.timelineDays} checkIns={ground.checkIns ?? []} />
                )}
                {(ground?.status === 'STALLED' || ground?.status === 'PAUSED') && (
                  <StalledBanner status={ground.status} onReopen={() => reopen.mutate()} pending={reopen.isPending} />
                )}
                {(ground.checkIns?.length ?? 0) > 0 && (
                  <CompletenessSection ground={ground} />
                )}
                {(ground.status === 'RESOLVED' || ground.status === 'CLOSED') && (
                  <FeedbackBanner groundId={ground.id} />
                )}
              </>
            )}

            {/* CHECK-INS */}
            {adminTab === 'checkins' && (
              <>
                {myCheckIn && (
                  <Section title="Your check-in">
                    <button className="gw-btn" onClick={() => navigate(`/checkin/${myCheckIn.id}`)}>
                      {myCheckIn.status === 'COMPLETED'
                        ? `Review session ${myCheckIn.sessionNumber}`
                        : `Session ${myCheckIn.sessionNumber} — enter check-in`}
                    </button>
                  </Section>
                )}
                <CheckInsHistory ground={ground} declinedIds={declinedParticipantIds} />
              </>
            )}

            {/* DOCUMENTS */}
            {adminTab === 'documents' && myParticipant && (
              <DocumentsCard groundId={ground.id} />
            )}

            {/* REPORT */}
            {adminTab === 'report' && (
              <ReportTab
                ground={ground}
                reportReady={reportReady}
                reportReleased={reportReleased}
                waitingForOther={waitingForOther}
                activating={activate.isPending}
                onActivate={() => activate.mutate()}
              />
            )}

            {/* SETTINGS */}
            {adminTab === 'settings' && (
              <>
                {/* Participants */}
                <Section title="Parties">
                  {ground.participants?.map((p: any) => (
                    <div key={p.id} className="gw-prow">
                      <div className="gw-av gw-av-0">{(p.email?.[0] ?? '?').toUpperCase()}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{p.email}</div>
                        {p.roleAsDescribed && (
                          <div style={{ fontSize: 12, color: 'var(--gw-sub)' }}>{p.roleAsDescribed}</div>
                        )}
                        {declinedParticipantIds.has(p.id) && (
                          <div style={{ fontSize: 12, color: 'var(--gw-muted)' }}>Chose not to take part</div>
                        )}
                      </div>
                      <span className="gw-pill gw-pill-blue">{p.partyType}</span>
                    </div>
                  ))}

                  {(MULTI_PARTY_SCENARIOS.includes(ground.scenario) || (ground.participants?.length ?? 0) < 2) && (
                    <form
                      onSubmit={(e) => { e.preventDefault(); addParticipant.mutate() }}
                      style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #E2E0DB' }}
                    >
                      <div className="gw-box gw-box-blue" style={{ marginBottom: 12 }}>
                        They will be notified the moment they are added. No one is added silently.
                      </div>
                      <div className="gw-fld">
                        <label className="gw-label">Email</label>
                        <input className="gw-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                      </div>
                      <div className="gw-fld">
                        <label className="gw-label">Role as you describe it</label>
                        <input className="gw-input" value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Head of Engineering" />
                      </div>
                      <button className="gw-btn" type="submit" disabled={addParticipant.isPending}>
                        {addParticipant.isPending ? 'Inviting…' : 'Send invite'}
                      </button>
                    </form>
                  )}
                </Section>

                {/* Reopen — only if stalled/paused */}
                {(ground?.status === 'STALLED' || ground?.status === 'PAUSED') && (
                  <Section title="Ground status">
                    <StalledBanner status={ground.status} onReopen={() => reopen.mutate()} pending={reopen.isPending} />
                  </Section>
                )}

                {/* Resolution */}
                {['ACTIVE', 'CLOSED', 'RESOLVED'].includes(ground.status) && (
                  <ResolutionCard groundId={ground.id} myParticipantId={myParticipant?.id} scenario={ground.scenario} />
                )}
              </>
            )}
          </>
        )}

        {/* ═══ MEMBER TABS ═════════════════════════════════════════════════ */}
        {!isAdmin && (
          <>
            {/* CHECK-IN */}
            {memberTab === 'checkin' && (
              <Section title="Your check-in">
                {myCheckIn ? (
                  <>
                    <div className="gw-box gw-box-blue" style={{ marginBottom: 12 }}>
                      Your words are private until you both activate the report.
                    </div>
                    <button className="gw-btn" onClick={() => navigate(`/checkin/${myCheckIn.id}`)}>
                      {myCheckIn.status === 'COMPLETED'
                        ? `Review session ${myCheckIn.sessionNumber}`
                        : `Session ${myCheckIn.sessionNumber} — enter check-in`}
                    </button>
                  </>
                ) : (
                  <div style={{ fontSize: 13, color: 'var(--gw-muted)' }}>
                    No check-in for you on this ground yet. You will be notified when one is ready.
                  </div>
                )}
              </Section>
            )}

            {/* RECORD */}
            {memberTab === 'record' && (
              <>
                {myCheckIn && <SoloArtifactCard checkInId={myCheckIn.id} />}
                {myParticipant && <DocumentsCard groundId={ground.id} />}
                {!myCheckIn && !myParticipant && (
                  <div style={{ fontSize: 13, color: 'var(--gw-muted)', padding: '20px 0' }}>
                    Your record will appear here after your first check-in.
                  </div>
                )}
              </>
            )}

            {/* REPORT */}
            {memberTab === 'report' && (
              <>
                <ReportTab
                  ground={ground}
                  reportReady={reportReady}
                  reportReleased={reportReleased}
                  waitingForOther={waitingForOther}
                  activating={activate.isPending}
                  onActivate={() => activate.mutate()}
                />
                {['ACTIVE', 'CLOSED', 'RESOLVED'].includes(ground.status) && (
                  <ResolutionCard groundId={ground.id} myParticipantId={myParticipant?.id} scenario={ground.scenario} />
                )}
              </>
            )}
          </>
        )}

      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Report tab — shared between admin and participant
// ─────────────────────────────────────────────────────────────────────────────
function ReportTab({
  ground,
  reportReady,
  reportReleased,
  waitingForOther,
  activating,
  onActivate,
}: {
  ground: any
  reportReady: boolean
  reportReleased: boolean
  waitingForOther: boolean
  activating: boolean
  onActivate: () => void
}) {
  if (reportReleased) {
    return (
      <Section title="The shared picture">
        <div className="gw-box gw-box-green" style={{ marginBottom: 12 }}>
          Both parties confirmed. The shared picture is ready.
        </div>
        <Link to={`/report/${ground.id}`}>
          <button className="gw-btn">View report →</button>
        </Link>
      </Section>
    )
  }

  if (waitingForOther) {
    return (
      <Section title="Report">
        <div className="gw-box gw-box-blue">
          Your confirmation is recorded. The report will appear here once the other party also confirms.
        </div>
      </Section>
    )
  }

  if (reportReady) {
    return (
      <Section title="Report is ready">
        <div className="gw-box gw-box-green" style={{ marginBottom: 12 }}>
          Both parties have completed enough sessions. Confirm to reveal the shared picture.
        </div>
        <div style={{ fontSize: 12, color: 'var(--gw-sub)', marginBottom: 14, lineHeight: 1.65 }}>
          Neither party sees the report until both confirm. Your record stays yours whether or not you activate.
        </div>
        <button className="gw-btn" onClick={onActivate} disabled={activating}>
          {activating ? 'Confirming…' : 'Confirm & reveal report'}
        </button>
      </Section>
    )
  }

  return (
    <Section title="Report">
      <div style={{ fontSize: 13, color: 'var(--gw-muted)', lineHeight: 1.65 }}>
        The report becomes available once both parties have completed enough sessions and both confirm.
        Your record is being built privately with each check-in.
      </div>
    </Section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Stalled / paused banner
// ─────────────────────────────────────────────────────────────────────────────
function StalledBanner({ status, onReopen, pending }: { status: string; onReopen: () => void; pending: boolean }) {
  return (
    <div style={{ background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: 6, padding: '10px 14px', marginBottom: 14, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <span>
        {status === 'STALLED'
          ? 'This ground has stalled — the timeline elapsed without a confirmed outcome. Both records remain intact.'
          : 'This ground is paused.'}
      </span>
      <button
        className="gw-btn-sm"
        style={{ flexShrink: 0, marginTop: 0 }}
        onClick={onReopen}
        disabled={pending}
      >
        {pending ? 'Reopening…' : 'Reopen'}
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Check-ins history (admin view)
// ─────────────────────────────────────────────────────────────────────────────
function CheckInsHistory({ ground, declinedIds }: { ground: any; declinedIds: Set<string> }) {
  const checkIns: any[] = ground.checkIns ?? []
  const participants: any[] = ground.participants ?? []

  if (participants.length === 0) {
    return (
      <Section title="Check-ins">
        <div style={{ fontSize: 13, color: 'var(--gw-muted)' }}>No participants yet.</div>
      </Section>
    )
  }

  return (
    <Section title="Check-ins">
      {participants.map((p: any) => {
        const pCheckIns = checkIns
          .filter((c: any) => c.participantId === p.id)
          .sort((a: any, b: any) => b.sessionNumber - a.sessionNumber)
        return (
          <div key={p.id} style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1916', marginBottom: 6 }}>
              {p.roleAsDescribed || p.partyType}
              {declinedIds.has(p.id) && (
                <span style={{ fontSize: 11, color: 'var(--gw-muted)', fontWeight: 400, marginLeft: 8 }}>declined</span>
              )}
            </div>
            {pCheckIns.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--gw-muted)', fontStyle: 'italic' }}>No check-ins yet</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {pCheckIns.map((c: any) => {
                  const dot = statusDot(c.status)
                  return (
                    <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: '#F7F6F3', borderRadius: 5 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: dot.color, flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: '#1A1916' }}>Session {c.sessionNumber}</span>
                      <span style={{ fontSize: 11, color: 'var(--gw-muted)', marginLeft: 'auto' }}>{dot.label}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </Section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Documents card
// ─────────────────────────────────────────────────────────────────────────────
function DocumentsCard({ groundId }: { groundId: string }) {
  const qc = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const { data: docs = [] } = useQuery({
    queryKey: ['documents', groundId],
    queryFn: () => documentsApi.list(groundId),
  })

  const remove = useMutation({
    mutationFn: (docId: string) => documentsApi.remove(groundId, docId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['documents', groundId] })
      toast.success('Document removed')
    },
  })

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      await documentsApi.upload(groundId, file)
      qc.invalidateQueries({ queryKey: ['documents', groundId] })
      toast.success(`"${file.name}" added to your record`)
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Upload failed')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <Section title="Your documents">
      <div style={{ fontSize: 12, color: 'var(--gw-sub)', marginBottom: 12 }}>
        Upload PDF or text files — the AI reads them during your check-in and can reference them directly. Only you can see your documents.
      </div>

      {docs.length > 0 && (
        <div style={{ marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {docs.map((doc) => (
            <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: '#F7F6F3', borderRadius: 5 }}>
              <span style={{ fontSize: 12, flex: 1, color: '#1A1916' }}>{doc.fileName}</span>
              <button
                onClick={() => remove.mutate(doc.id)}
                disabled={remove.isPending}
                style={{ fontSize: 11, color: 'var(--gw-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px' }}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept=".pdf,.txt,text/plain,application/pdf"
        style={{ display: 'none' }}
        onChange={handleFile}
      />
      <button
        className="gw-btn-sec"
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        style={{ width: '100%' }}
      >
        {uploading ? 'Uploading…' : '+ Add document (PDF or TXT)'}
      </button>
    </Section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Solo artifact card (participant record so far)
// ─────────────────────────────────────────────────────────────────────────────
function SoloArtifactCard({ checkInId }: { checkInId: string }) {
  const { data } = useQuery({
    queryKey: ['artifact', checkInId],
    queryFn: () => conversationApi.artifact(checkInId),
  })
  if (!data?.artifact) return null
  return (
    <Section title="Your record so far">
      <div style={{ fontSize: 13, lineHeight: 1.6, color: '#1A1916', whiteSpace: 'pre-wrap', marginBottom: data.artifact.whatToCarry ? 10 : 0 }}>
        {data.artifact.summary}
      </div>
      {data.artifact.whatToCarry && (
        <div className="gw-box gw-box-blue" style={{ fontSize: 12 }}>
          <strong>To carry forward:</strong> {data.artifact.whatToCarry}
        </div>
      )}
      <div style={{ fontSize: 11, color: 'var(--gw-muted)', marginTop: 8 }}>
        Built from your record alone — yours to use now. The full shared picture comes once both parties complete enough sessions and both confirm.
      </div>
    </Section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Completeness section (admin — check-in board)
// ─────────────────────────────────────────────────────────────────────────────
function statusDot(status: CheckInStatus | undefined) {
  if (status === 'COMPLETED') return { color: '#5DCAA5', label: 'Completed' }
  if (status === 'IN_PROGRESS') return { color: '#E8A94A', label: 'In progress' }
  return { color: '#C9C5BF', label: 'Not started' }
}

function CompletenessSection({ ground }: { ground: any }) {
  const participants: any[] = ground.participants ?? []
  const checkIns: any[] = ground.checkIns ?? []
  const maxSession = checkIns.reduce((m: number, c: any) => Math.max(m, c.sessionNumber ?? 0), 0)
  const currentPeriodCheckIns = checkIns.filter((c: any) => c.sessionNumber === maxSession)
  const completedCount = currentPeriodCheckIns.filter((c: any) => c.status === 'COMPLETED').length

  const statusForParticipant = (participantId: string): CheckInStatus | undefined => {
    const c = currentPeriodCheckIns.find((ci: any) => ci.participantId === participantId)
    return c?.status as CheckInStatus | undefined
  }

  return (
    <Section title={`Period ${maxSession || 1} check-in completeness`}>
      <div style={{ fontSize: 13, color: 'var(--gw-sub)', marginBottom: 12 }}>
        <strong style={{ color: 'var(--gw-text)' }}>{completedCount} of {participants.length}</strong> people have checked in this period
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {participants.map((p: any) => {
          const dot = statusDot(statusForParticipant(p.id))
          return (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px', background: '#F7F6F3', borderRadius: 5 }}>
              <span style={{ width: 9, height: 9, borderRadius: '50%', flexShrink: 0, background: dot.color, display: 'inline-block' }} title={dot.label} />
              <span style={{ fontSize: 12, color: 'var(--gw-text)', flex: 1 }}>{p.roleAsDescribed || p.partyType}</span>
              <span style={{ fontSize: 11, color: 'var(--gw-muted)' }}>{dot.label}</span>
            </div>
          )
        })}
      </div>
    </Section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Feedback banner (resolved ground, no feedback yet)
// ─────────────────────────────────────────────────────────────────────────────
function FeedbackBanner({ groundId }: { groundId: string }) {
  const navigate = useNavigate()
  const { data: feedback, isLoading } = useQuery({
    queryKey: ['ground-feedback', groundId],
    queryFn: () => billingApi.getFeedback(groundId),
  })
  if (isLoading || feedback) return null
  return (
    <div className="gw-box gw-box-amber" style={{ marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <span>This ground is resolved. How did it go?</span>
      <button className="gw-btn-sm" style={{ flexShrink: 0, marginTop: 0 }} onClick={() => navigate(`/grounds/${groundId}/feedback`)}>
        Share feedback
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Cofounder alignment section
// ─────────────────────────────────────────────────────────────────────────────
function CofounderAlignmentSection({ participants }: { participants: any[] }) {
  const intents = participants.map((p: any) => ({
    label: p.roleAsDescribed || p.partyType,
    intent: p.intentQuestionnaire?.intent ?? p.intake?.intent ?? null,
  }))
  const [myIntent, otherIntent] = intents
  if (!myIntent && !otherIntent) return null
  const bothPresent = !!(myIntent?.intent && otherIntent?.intent)
  return (
    <Section title="Alignment">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ fontSize: 12, display: 'flex', gap: 8 }}>
          <span style={{ color: 'var(--gw-muted)', minWidth: 130 }}>Your intent:</span>
          <span style={{ color: '#1A1916', flex: 1 }}>
            {myIntent?.intent ?? <span style={{ color: 'var(--gw-muted)', fontStyle: 'italic' }}>Not yet recorded</span>}
          </span>
        </div>
        <div style={{ fontSize: 12, display: 'flex', gap: 8 }}>
          <span style={{ color: 'var(--gw-muted)', minWidth: 130 }}>Other party's intent:</span>
          <span style={{ color: '#1A1916', flex: 1 }}>
            {otherIntent?.intent ?? <span style={{ color: 'var(--gw-muted)', fontStyle: 'italic' }}>Not yet recorded</span>}
          </span>
        </div>
        {bothPresent && (
          <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ height: 6, flex: 1, borderRadius: 999, background: '#5DCAA5' }} />
            <span style={{ fontSize: 11, color: '#085041', fontWeight: 600 }}>Both parties have stated intent</span>
          </div>
        )}
      </div>
    </Section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Period progress
// ─────────────────────────────────────────────────────────────────────────────
function PeriodProgressSection({ timelineDays, checkIns }: { timelineDays: number; checkIns: any[] }) {
  const totalPeriods = Math.max(1, Math.round(timelineDays / 14))
  const currentPeriod = checkIns.reduce((m: number, c: any) => Math.max(m, c.sessionNumber ?? 0), 1)
  return (
    <div style={{ background: 'white', border: '1px solid #E2E0DB', borderRadius: 6, padding: '10px 16px', marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span style={{ fontSize: 12, color: 'var(--gw-sub)' }}>
        Period <strong style={{ color: '#1A1916' }}>{currentPeriod}</strong> of <strong style={{ color: '#1A1916' }}>{totalPeriods}</strong>
      </span>
      <div style={{ display: 'flex', gap: 3 }}>
        {Array.from({ length: totalPeriods }).map((_, i) => (
          <div key={i} style={{ width: 12, height: 6, borderRadius: 3, background: i < currentPeriod ? '#5DCAA5' : '#E2E0DB' }} />
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Section wrapper
// ─────────────────────────────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'white', border: '1px solid #E2E0DB', borderRadius: 6, padding: '16px', marginBottom: 8 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gw-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>
        {title}
      </div>
      {children}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Scenario end-state map
// ─────────────────────────────────────────────────────────────────────────────
const SCENARIO_END_STATES: Record<string, { value: string; label: string }[]> = {
  NEW_HIRE:         [{ value: 'KEEP', label: 'Keep the hire' }, { value: 'RESTRUCTURE', label: 'Restructure the role' }, { value: 'EXIT', label: 'Let them go' }, { value: 'NOT_YET', label: 'Not yet — revisit with a named gap' }],
  NEW_COFOUNDER:    [{ value: 'CONTINUE', label: 'Continue the partnership' }, { value: 'RESTRUCTURE', label: 'Restructure the arrangement' }, { value: 'SEPARATE', label: 'Separate' }, { value: 'NOT_YET', label: 'Not yet — revisit with a named gap' }],
  NEW_ADVISOR:      [{ value: 'RENEW', label: 'Renew the engagement' }, { value: 'RESTRUCTURE', label: 'Restructure the engagement' }, { value: 'END', label: 'End the engagement' }, { value: 'NOT_YET', label: 'Not yet — revisit with a named gap' }],
  NEW_PROJECT:      [{ value: 'COMPLETE', label: 'Mark complete' }, { value: 'CONTINUE', label: 'Continue' }, { value: 'DESCOPE', label: 'Descope' }, { value: 'STOP', label: 'Stop the project' }],
  NEW_MANAGER:      [{ value: 'CONTINUE', label: 'Extend the engagement' }, { value: 'RESTRUCTURE', label: 'Restructure the scope or terms' }, { value: 'END', label: 'End the engagement' }, { value: 'NOT_YET', label: 'Not yet — revisit with a named gap' }],
  CONTRACT_RENEWAL: [{ value: 'RENEW', label: 'Renew on current terms' }, { value: 'RENEGOTIATE', label: 'Renew on revised terms' }, { value: 'EXIT', label: 'Do not renew' }, { value: 'NOT_YET', label: 'Extend evaluation period' }],
  RECOGNITION:      [{ value: 'YES', label: 'Grant the ask' }, { value: 'NO', label: 'Decline' }, { value: 'NOT_YET', label: 'Not yet — with a named gap and milestone' }],
  DRIFT:            [{ value: 'CONTINUE', label: 'Continue' }, { value: 'RESTRUCTURE', label: 'Restructure' }, { value: 'DESCOPE', label: 'Descope' }, { value: 'SEPARATE', label: 'Separate' }, { value: 'EXIT', label: 'Exit' }, { value: 'STOP', label: 'Stop' }, { value: 'NOT_YET', label: 'Not yet — revisit with a named gap' }],
  CRISIS_ALIGNMENT: [{ value: 'ALIGNED', label: 'Shared picture established — team aligned' }, { value: 'RESTRUCTURE', label: 'Structure or priorities need to change' }, { value: 'ESCALATE', label: 'Requires external support or intervention' }, { value: 'NOT_YET', label: 'Not yet — revisit when more information is available' }],
}

// ─────────────────────────────────────────────────────────────────────────────
// Resolution card
// ─────────────────────────────────────────────────────────────────────────────
function ResolutionCard({ groundId, myParticipantId, scenario }: { groundId: string; myParticipantId?: string; scenario?: string }) {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['resolution', groundId],
    queryFn: () => resolutionApi.get(groundId),
  })
  const propose = useMutation({
    mutationFn: (endState: string) => resolutionApi.propose(groundId, endState),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['resolution', groundId] })
      qc.invalidateQueries({ queryKey: ['ground', groundId] })
      toast.success('Recorded. The ground closes once every party confirms the same end state.')
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Could not record that.'),
  })

  if (isLoading || !data) return null

  const { resolution, options: apiOptions, groundStatus, confirmations = [], confirmedCount = 0, totalActive = 0 } = data
  const options = (apiOptions && apiOptions.length > 0) ? apiOptions : (scenario ? (SCENARIO_END_STATES[scenario] ?? []) : [])
  const labelFor = (v: string) => options.find((o) => o.value === v)?.label ?? v
  const myConfirmation = myParticipantId ? confirmations.find((c) => c.participantId === myParticipantId) : undefined
  const myChoice = myConfirmation?.endState ?? null
  const myChoiceLabel = myChoice ? labelFor(myChoice) : null
  const otherChoices = new Set(confirmations.filter((c) => c.participantId !== myParticipantId && c.endState).map((c) => c.endState as string))
  const allChosenStates = new Set(confirmations.filter((c) => c.endState).map((c) => c.endState as string))
  const divergence = allChosenStates.size > 1
  const resolved = groundStatus === 'CLOSED' || groundStatus === 'RESOLVED'

  if (resolved) {
    return (
      <>
        <Section title="Outcome">
          <div className="gw-box gw-box-green">
            End state: <strong>{resolution ? labelFor(resolution.endState) : '—'}</strong>
          </div>
          <div style={{ fontSize: 12, color: 'var(--gw-sub)', marginTop: 8 }}>
            Billing has stopped. This record is permanent and belongs to all parties.
          </div>
        </Section>
        <OutcomeFeedbackCard groundId={groundId} />
      </>
    )
  }

  return (
    <Section title="Outcome">
      <div style={{ fontSize: 12, color: 'var(--gw-muted)', marginBottom: 14 }}>
        The ground closes when all parties confirm the same outcome. Your selection is private until confirmed.
      </div>

      {myChoice && (
        <div style={{ marginBottom: 12, padding: '8px 12px', background: '#F0FAF4', border: '1px solid #BBF7D0', borderRadius: 6, fontSize: 12 }}>
          Your current choice: <strong>{myChoiceLabel}</strong>
          {confirmedCount >= totalActive && !divergence ? ' — Confirmed by all parties.' : ' — Waiting for other party.'}
        </div>
      )}

      {divergence && (
        <div style={{ marginBottom: 12, padding: '8px 12px', background: '#FEF9C3', border: '1px solid #FDE68A', borderRadius: 6, fontSize: 12 }}>
          The other party has selected a different outcome. Both parties need to agree on the same option to close this ground.
        </div>
      )}

      {!divergence && confirmedCount > 0 && confirmedCount < totalActive && (
        <div className="gw-box gw-box-blue" style={{ marginBottom: 12 }}>
          <strong>{confirmedCount} of {totalActive} parties</strong> have confirmed an outcome.
        </div>
      )}

      <div>
        <div style={{ fontSize: 12, color: 'var(--gw-sub)', marginBottom: 8 }}>
          {myChoice ? 'Change your outcome:' : 'Select an outcome:'}
        </div>
        {options.map((o) => (
          <button
            key={o.value}
            onClick={() => propose.mutate(o.value)}
            disabled={propose.isPending}
            style={{
              display: 'block', width: '100%', textAlign: 'left',
              padding: '9px 12px', marginBottom: 6, borderRadius: 6,
              border: myChoice === o.value ? '2px solid #2563EB' : '1px solid #E2E0DB',
              background: myChoice === o.value ? '#EFF6FF' : 'white',
              fontSize: 13, cursor: propose.isPending ? 'not-allowed' : 'pointer',
              fontWeight: myChoice === o.value ? 600 : 400,
            }}
          >
            {o.label}
            {otherChoices.has(o.value) && (
              <span style={{ fontSize: 11, color: '#5DCAA5', marginLeft: 8, fontWeight: 400 }}>(other party agrees)</span>
            )}
          </button>
        ))}
      </div>

      <div style={{ fontSize: 11, color: 'var(--gw-muted)', marginTop: 8 }}>
        Choosing an end state records your confirmation. The ground closes when every party confirms the same one.
      </div>
    </Section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Outcome feedback card
// ─────────────────────────────────────────────────────────────────────────────
function OutcomeFeedbackCard({ groundId }: { groundId: string }) {
  const qc = useQueryClient()
  const { data: feedback, isLoading } = useQuery({
    queryKey: ['outcome-feedback', groundId],
    queryFn: () => dashboardApi.myFeedback(groundId),
  })
  const submit = useMutation({
    mutationFn: (feltFair: boolean) => dashboardApi.submitFeedback(groundId, feltFair),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['outcome-feedback', groundId] })
      toast.success('Thank you — this helps Groundwork improve.')
    },
  })

  if (isLoading) return null

  if (feedback) {
    return (
      <Section title="Your response">
        <div style={{ fontSize: 13, color: 'var(--gw-sub)' }}>
          Did this feel fair and grounded in evidence? — <strong>{feedback.feltFair ? 'Yes' : 'No'}</strong>
        </div>
      </Section>
    )
  }

  return (
    <Section title="One question">
      <div style={{ fontSize: 13, marginBottom: 12 }}>
        Did this process help you reach a decision that felt fair and grounded in evidence?
      </div>
      <div style={{ display: 'flex', gap: 7 }}>
        <button className="gw-btn" style={{ flex: 1, padding: '8px 0' }} onClick={() => submit.mutate(true)} disabled={submit.isPending}>Yes</button>
        <button className="gw-btn-sec" style={{ flex: 1, padding: '8px 0' }} onClick={() => submit.mutate(false)} disabled={submit.isPending}>No</button>
      </div>
    </Section>
  )
}
