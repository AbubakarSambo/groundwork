import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { AxiosError } from 'axios'
import { groundsApi, resolutionApi, dashboardApi } from '@/api'
import { useAuthStore } from '@/stores/auth'
import { StatusPill } from '@/components/gw'

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
              </div>
              <span className="gw-pill gw-pill-blue">{p.partyType}</span>
            </div>
          ))}

          {(ground.participants?.length ?? 0) < 2 && (
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
      toast.success('Recorded. The ground closes once both parties confirm the same end state.')
    },
  })

  if (isLoading || !data) return null
  const { resolution, options, groundStatus } = data
  const labelFor = (v: string) => options?.find((o: any) => o.value === v)?.label ?? v

  if (groundStatus === 'CLOSED' || groundStatus === 'RESOLVED') {
    return (
      <>
        <Section title="Resolved">
          <div className="gw-box gw-box-green">
            End state: <strong>{resolution ? labelFor(resolution.endState) : '—'}</strong>
          </div>
          <div style={{ fontSize: 12, color: 'var(--gw-sub)', marginTop: 8 }}>
            Billing has stopped. This record is permanent and belongs to both of you.
          </div>
        </Section>
        <OutcomeFeedbackCard groundId={groundId} />
      </>
    )
  }

  return (
    <Section title="Resolution">
      <div style={{ fontSize: 12, color: 'var(--gw-sub)', marginBottom: 12 }}>
        The ground closes when both parties confirm the same end state. No one decides this alone.
      </div>

      {resolution && (
        <div className="gw-box gw-box-amber" style={{ marginBottom: 12 }}>
          <strong>Current proposal: {labelFor(resolution.endState)}</strong>
          <div style={{ marginTop: 4, fontSize: 12 }}>
            Initiator {resolution.confirmedByInitiator ? '✓ confirmed' : '· not yet'} ·
            Participant {resolution.confirmedByParticipant ? '✓ confirmed' : '· not yet'}
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
        Choosing the current proposal confirms your side. Choosing a different one re-opens it for both.
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
