import { useState, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { AxiosError } from 'axios'
import { groundsApi, resolutionApi, dashboardApi, documentsApi, conversationApi, billingApi } from '@/api'
import { useAuthStore } from '@/stores/auth'
import { StatusPill } from '@/components/gw'
import type { CheckInStatus } from '@/types'

// Project & team grounds may hold more than two parties; all others are two-party.
const MULTI_PARTY_SCENARIOS = ['NEW_PROJECT', 'CRISIS_ALIGNMENT']

export function GroundDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('')

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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ground', id] }); toast.success('Ground activated') },
    onError: (err) => {
      const res = (err as AxiosError<{ requiresBilling?: boolean; checkoutUrl?: string }>).response
      if (res?.status === 402 && res.data?.checkoutUrl) {
        toast.info('Set up billing to activate this ground')
        window.location.href = res.data.checkoutUrl
      }
    },
  })

  if (isLoading || !ground) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--gw-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: 13, color: 'var(--gw-muted)' }}>Loading…</div>
      </div>
    )
  }

  const myParticipant = ground.participants?.find((p: any) => p.userId === user?.id)
  const myCheckIns = ground.checkIns?.filter((c: any) => c.participantId === myParticipant?.id) ?? []
  const myCheckIn = myCheckIns.find((c: any) => c.status === 'NOT_STARTED' || c.status === 'IN_PROGRESS')
    ?? myCheckIns.sort((a: any, b: any) => b.sessionNumber - a.sessionNumber)[0]
  const declinedParticipantIds = new Set<string>(
    (ground.checkIns ?? []).filter((c: any) => c.status === 'DECLINED').map((c: any) => c.participantId),
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gw-bg)', display: 'flex', flexDirection: 'column' }}>
      <div className="gw-hdr">
        <div>
          <div className="gw-logo">{ground.label}</div>
          <div style={{ fontSize: 11, color: 'var(--gw-muted)', marginTop: 1 }}>
            {ground.scenario?.replace(/_/g, ' ').toLowerCase()}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
          <StatusPill status={ground.status} />
          <button className="gw-back" onClick={() => navigate('/')}>← Grounds</button>
        </div>
      </div>

      <div className="gw-bd" style={{ maxWidth: 600, margin: '0 auto', width: '100%' }}>

        {/* Completeness — admin only */}
        {user?.role === 'ADMIN' && (ground.checkIns?.length ?? 0) > 0 && (
          <CompletenessSection ground={ground} />
        )}

        {/* Resolved + no feedback banner */}
        {(ground.status === 'RESOLVED' || ground.status === 'CLOSED') && (
          <FeedbackBanner groundId={ground.id} />
        )}

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

        {/* My check-in */}
        <Section title="Your check-in">
          {myCheckIn ? (
            <button className="gw-btn" onClick={() => navigate(`/checkin/${myCheckIn.id}`)}>
              {myCheckIn.status === 'COMPLETED'
                ? `Review session ${myCheckIn.sessionNumber}`
                : `Session ${myCheckIn.sessionNumber} — enter check-in`}
            </button>
          ) : (
            <div style={{ fontSize: 13, color: 'var(--gw-muted)' }}>No check-in for you on this ground yet.</div>
          )}
        </Section>

        {/* Your single-party record so far (B2) */}
        {myCheckIn && <SoloArtifactCard checkInId={myCheckIn.id} />}

        {/* Documents */}
        {myParticipant && (
          <DocumentsCard groundId={ground.id} />
        )}

        {/* Report */}
        {ground.report?.releasedAt && (
          <Section title="The shared picture">
            <Link to={`/report/${ground.id}`}>
              <button className="gw-btn">View report →</button>
            </Link>
          </Section>
        )}

        {/* Activate */}
        {ground.status === 'REPORT_READY' && user?.role === 'ADMIN' && (
          <Section title="Report is ready">
            <div className="gw-box gw-box-green" style={{ marginBottom: 12 }}>
              Both parties have checked in twice. The report is ready to unlock.
            </div>
            <div style={{ fontSize: 12, color: 'var(--gw-sub)', marginBottom: 12 }}>
              Activating starts billing ($20/mo care fee + $50/person/mo).
            </div>
            <button className="gw-btn" onClick={() => activate.mutate()} disabled={activate.isPending}>
              {activate.isPending ? 'Activating…' : 'Activate & read report'}
            </button>
          </Section>
        )}

        {/* Resolution */}
        {['ACTIVE', 'CLOSED', 'RESOLVED'].includes(ground.status) && (
          <ResolutionCard groundId={ground.id} />
        )}
      </div>
    </div>
  )
}

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
        Built from your record alone — yours to use now, whether or not the other side checks in. The full shared picture comes once both of you complete two sessions.
      </div>
    </Section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Completeness section (admin view only)
// ─────────────────────────────────────────────────────────────────────────────

function statusDot(status: CheckInStatus | undefined) {
  if (status === 'COMPLETED') return { color: '#5DCAA5', label: 'Completed' }
  if (status === 'IN_PROGRESS') return { color: '#E8A94A', label: 'In progress' }
  return { color: '#C9C5BF', label: 'Not started' }
}

function CompletenessSection({ ground }: { ground: any }) {
  const participants: any[] = ground.participants ?? []
  const checkIns: any[] = ground.checkIns ?? []

  // Find the current period (highest sessionNumber present)
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
              <span
                style={{
                  width: 9, height: 9, borderRadius: '50%', flexShrink: 0,
                  background: dot.color, display: 'inline-block',
                }}
                title={dot.label}
              />
              <span style={{ fontSize: 12, color: 'var(--gw-text)', flex: 1 }}>
                {p.roleAsDescribed || p.partyType}
              </span>
              <span style={{ fontSize: 11, color: 'var(--gw-muted)' }}>{dot.label}</span>
            </div>
          )
        })}
      </div>
    </Section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Feedback banner — shown when ground is resolved and user hasn't given feedback
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
      <button
        className="gw-btn-sm"
        style={{ flexShrink: 0, marginTop: 0 }}
        onClick={() => navigate(`/grounds/${groundId}/feedback`)}
      >
        Share feedback
      </button>
    </div>
  )
}

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

function ResolutionCard({ groundId }: { groundId: string }) {
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
  })

  if (isLoading || !data) return null
  const { resolution, options, groundStatus, confirmations = [], confirmedCount = 0, totalActive = 0 } = data
  const labelFor = (v: string) => options?.find((o: any) => o.value === v)?.label ?? v
  const chosenStates = new Set(confirmations.filter((c) => c.endState).map((c) => c.endState))
  const divergent = chosenStates.size > 1

  if (groundStatus === 'CLOSED' || groundStatus === 'RESOLVED') {
    return (
      <>
        <Section title="Resolved">
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
    <Section title="Resolution">
      <div style={{ fontSize: 12, color: 'var(--gw-sub)', marginBottom: 12 }}>
        The ground closes when every party confirms the same end state. No one decides this alone.
      </div>

      {confirmations.length > 0 && (
        <div className={`gw-box ${divergent ? 'gw-box-amber' : 'gw-box-blue'}`} style={{ marginBottom: 12 }}>
          <strong>{confirmedCount} of {totalActive} parties confirmed</strong>
          {divergent && <span> — parties have chosen different end states</span>}
          <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 3 }}>
            {confirmations.map((c) => (
              <div key={c.participantId} style={{ fontSize: 12 }}>
                {c.label}: {c.endState ? `${labelFor(c.endState)} ✓` : '· not yet'}
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
        {options?.map((o: any) => (
          <button
            key={o.value}
            onClick={() => propose.mutate(o.value)}
            disabled={propose.isPending}
            className={resolution?.endState === o.value ? 'gw-btn' : 'gw-btn-sec'}
            style={{ width: 'auto', padding: '8px 14px', fontSize: 13 }}
          >
            {o.label}
          </button>
        ))}
      </div>
      <div style={{ fontSize: 11, color: 'var(--gw-muted)', marginTop: 8 }}>
        Choosing an end state records your confirmation. The ground closes when every party confirms the same one.
      </div>
    </Section>
  )
}

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
        <button className="gw-btn" style={{ flex: 1, padding: '8px 0' }} onClick={() => submit.mutate(true)} disabled={submit.isPending}>
          Yes
        </button>
        <button className="gw-btn-sec" style={{ flex: 1, padding: '8px 0' }} onClick={() => submit.mutate(false)} disabled={submit.isPending}>
          No
        </button>
      </div>
    </Section>
  )
}
