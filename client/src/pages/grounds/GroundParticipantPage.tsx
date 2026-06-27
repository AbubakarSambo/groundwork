import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { groundsApi } from '@/api/grounds'
import { billingApi } from '@/api/billing'
import { useAuthStore } from '@/stores/auth'
import { reportsApi } from '@/api/reports'
import { documentsApi } from '@/api/documents'
import { conversationApi } from '@/api/conversation'
import { apiClient } from '@/api/client'
import { toast } from 'sonner'

const BANDS = ['', 'Unresolved', 'Mixed', 'Emerging', 'Clear', 'Aligned']
function bandLabel(score?: number) { return BANDS[Math.min(Math.round(score ?? 1), 5)] ?? 'Unresolved' }

function confidenceDescription(conf: number): string {
  if (conf <= 1) return 'Just started. One more session will begin to show the picture.'
  if (conf <= 2) return 'Building. Both parties are on record for the first time.'
  if (conf <= 3) return 'Strong enough to generate a report.'
  if (conf <= 4) return 'High confidence. Multiple sessions cross-referenced.'
  return 'Full depth. Record is verifiable and complete.'
}

function timeAgo(date: string | Date): string {
  const ms = Date.now() - new Date(date).getTime()
  const mins = Math.floor(ms / 60000)
  if (mins < 60) return `${mins} minute${mins !== 1 ? 's' : ''} ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} hour${hrs !== 1 ? 's' : ''} ago`
  const days = Math.floor(hrs / 24)
  return `${days} day${days !== 1 ? 's' : ''} ago`
}

function specificityQualityLabel(score: number): { label: string; color: string; bg: string } {
  if (score >= 0.65) return { label: 'Specific and evidenced', color: '#085041', bg: '#E7F6EF' }
  if (score >= 0.35) return { label: 'Moderate detail', color: '#5A4A1A', bg: '#FDF8E3' }
  return { label: 'Building', color: '#6B6560', bg: '#F0EEE9' }
}

type Tab = 'checkin' | 'history' | 'record' | 'report' | 'docs' | 'settings'

function SoloArtifactBlock({ checkInId }: { checkInId: string }) {
  const [open, setOpen] = useState(false)
  const { data, isLoading } = useQuery({
    queryKey: ['artifact', checkInId],
    queryFn: () => conversationApi.artifact(checkInId),
    enabled: open,
  })
  return (
    <div style={{ marginTop: 8 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ fontSize: 11, color: '#0C447C', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit', fontWeight: 600 }}
      >
        {open ? 'Hide record summary' : 'What Groundwork saw in your account'}
      </button>
      {open && (
        <div style={{ marginTop: 8, background: '#F5F3EF', borderRadius: 7, padding: '10px 12px' }}>
          {isLoading && <div style={{ fontSize: 12, color: '#9B9590' }}>Loading…</div>}
          {data?.artifact ? (
            <>
              <div style={{ fontSize: 12, color: '#4A4540', lineHeight: 1.6, marginBottom: data.artifact.whatToCarry ? 8 : 0 }}>{data.artifact.summary}</div>
              {data.artifact.whatToCarry && (
                <div style={{ fontSize: 12, color: '#0C447C', fontWeight: 600, borderTop: '1px solid #E2E0DB', paddingTop: 7, marginTop: 4 }}>
                  Carry forward: {data.artifact.whatToCarry}
                </div>
              )}
            </>
          ) : !isLoading && (
            <div style={{ fontSize: 12, color: '#9B9590' }}>No summary yet for this session.</div>
          )}
        </div>
      )}
    </div>
  )
}

export function GroundParticipantPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [tab, setTab] = useState<Tab>('checkin')
  const [showPaywall, setShowPaywall] = useState(false)
  const [paywallCode, setPaywallCode] = useState('')
  const [paywallCodeMsg, setPaywallCodeMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const user = useAuthStore(s => s.user)

  const { data: ground, isLoading } = useQuery({
    queryKey: ['ground', id],
    queryFn: () => groundsApi.get(id!),
    enabled: !!id,
  })

  const { data: report } = useQuery({
    queryKey: ['report', id],
    queryFn: () => reportsApi.get(id!),
    enabled: !!id,
    retry: false,
  })

  const { data: specificity } = useQuery({
    queryKey: ['my-specificity', id],
    queryFn: () => groundsApi.getMySpecificity(id!),
    enabled: !!id,
    retry: false,
  })

  const { data: myRecord } = useQuery({
    queryKey: ['my-record', id],
    queryFn: () => groundsApi.getMyRecord(id!),
    enabled: !!id && tab === 'record',
    retry: false,
  })

  const checkoutMut = useMutation({
    mutationFn: () => billingApi.createCareFeeCheckout(id),
    onSuccess: (url) => { window.location.href = url },
    onError: () => toast.error('Could not start checkout. Please try again.'),
  })

  const probeSession = useMutation({
    mutationFn: async (checkIn: any) => {
      const res = await apiClient.post(
        `/check-ins/${checkIn.id}/open`,
        {},
        { validateStatus: () => true }
      )
      if (res.status === 403) return { blocked: true, checkIn }
      return { blocked: false, checkIn }
    },
    onSuccess: ({ blocked, checkIn }) => {
      if (blocked) {
        setShowPaywall(true)
      } else {
        navigate(`/checkin/${checkIn.id}`, {
          state: { sessionNumber: checkIn.sessionNumber, groundLabel: ground?.label, groundId: id, isInitiator: (ground?.participants ?? []).find((p: any) => p.userId === user?.id)?.partyType === 'INITIATOR' }
        })
      }
    },
    onError: () => toast.error('Could not start session. Try again.'),
  })

  const redeemPaywallCode = useMutation({
    mutationFn: () => billingApi.redeemContributorCode(paywallCode.trim().toUpperCase(), id!),
    onSuccess: r => {
      qc.invalidateQueries({ queryKey: ['ground', id] })
      setPaywallCodeMsg({ ok: r.ok, text: r.message })
      if (r.ok) {
        setShowPaywall(false)
        setPaywallCode('')
      }
    },
    onError: () => setPaywallCodeMsg({ ok: false, text: 'Something went wrong. Try again.' }),
  })

  const purchaseSessionMut = useMutation({
    mutationFn: () => billingApi.purchaseSession(id!),
    onSuccess: r => { if (r.checkoutUrl) window.location.href = r.checkoutUrl },
    onError: () => toast.error('Could not start checkout. Try again.'),
  })

  const activateMutation = useMutation({
    mutationFn: () => reportsApi.activate(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['report', id] })
      toast.success('Report revealed')
      setTab('report')
    },
    onError: () => toast.error('Could not activate. Try again.'),
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

  if (isLoading) return <div style={{ minHeight: '100vh', background: '#F5F3EF', padding: 24, fontSize: 13, color: '#9B9590' }}>Loading…</div>
  if (!ground) return <div style={{ minHeight: '100vh', background: '#F5F3EF', padding: 24, fontSize: 13, color: '#9B9590' }}>Ground not found.</div>

  const conf = ground.confidence ?? 1
  const bl = bandLabel(conf)
  const myParticipant = (ground.participants ?? []).find((p: any) => p.userId === user?.id)

  if (!myParticipant) {
    return (
      <div style={{ minHeight: '100vh', background: '#F5F3EF', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ maxWidth: 400, textAlign: 'center' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#1A1916', marginBottom: 8 }}>Account not linked</div>
          <div style={{ fontSize: 13, color: '#6B6560', lineHeight: 1.65, marginBottom: 20 }}>
            Your account is not linked to this ground. Please contact the ground admin.
          </div>
          <button onClick={() => navigate('/grounds')} style={{ fontSize: 13, color: '#0C447C', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontFamily: 'inherit' }}>
            Back to grounds
          </button>
        </div>
      </div>
    )
  }
  const myCheckIns: any[] = (ground.checkIns ?? []).filter((ci: any) => ci.participantId === myParticipant?.id)
  const openCheckIn = myCheckIns.find((ci: any) => ci.status !== 'COMPLETED')
  const completedCheckIns = myCheckIns.filter((ci: any) => ci.status === 'COMPLETED').sort((a: any, b: any) => b.sessionNumber - a.sessionNumber)
  const totalSessions = (ground as any).totalSessions ?? 6
  const lastCompleted = completedCheckIns[0]

  const signals: any[] = ground.signals ?? []
  const feedEvents = signals.map((s: any) => ({
    type: s.code?.startsWith('D') ? 'divergence' : 'convergence',
    label: s.code?.startsWith('D') ? 'Divergence' : 'Convergence',
    session: s.lastPeriodNumber ?? 1,
    text: s.observationText ?? '',
    at: s.lastSeenAt,
  })).filter((e: any) => e.text).reverse()

  const specificityScores: number[] = specificity?.scores ?? []

  const tabs: { key: Tab; label: string }[] = [
    { key: 'checkin', label: 'Check-in' },
    { key: 'history', label: 'Session history' },
    { key: 'record', label: 'My record' },
    { key: 'report', label: 'Report' },
    { key: 'docs', label: 'Documents' },
    { key: 'settings', label: 'Settings' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#F5F3EF', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 50, background: '#F5F3EF', borderBottom: '1px solid #E2E0DB' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px' }}>
          <span onClick={() => navigate('/grounds')} style={{ fontSize: 13, color: '#9B9590', cursor: 'pointer', flexShrink: 0 }}>← Grounds</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#1A1916', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ground.label}</div>
            <div style={{ fontSize: 11, color: '#9B9590' }}>Your account is private until the report releases.</div>
          </div>
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', borderTop: '1px solid #E2E0DB', overflowX: 'auto' }}>
          {tabs.map(t => (
            <button key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                flex: '0 0 auto', padding: '10px 16px', fontSize: 12, fontWeight: tab === t.key ? 700 : 500,
                color: tab === t.key ? '#0C447C' : '#6B6560', background: 'none', border: 'none',
                borderBottom: tab === t.key ? '2px solid #0C447C' : '2px solid transparent',
                cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
              }}
            >{t.label}</button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 600, margin: '0 auto', width: '100%', padding: '16px 16px 48px' }}>

        {/* CHECK-IN TAB */}
        {tab === 'checkin' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* Ground confidence */}
            <div style={{ background: 'white', border: '1px solid #E2E0DB', borderRadius: 10, padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: '#9B9590' }}>Ground confidence</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#0C447C' }}>{conf}/5 <span style={{ fontSize: 12, fontWeight: 600, color: '#6B6560' }}>{bl}</span></div>
              </div>
              <div style={{ display: 'flex', gap: 3, marginBottom: 8 }}>
                {[1,2,3,4,5].map(i => (
                  <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= conf ? '#0C447C' : '#E2E0DB' }} />
                ))}
              </div>
              <div style={{ fontSize: 12, color: '#6B6560', lineHeight: 1.5 }}>{confidenceDescription(conf)}</div>
            </div>

            {/* My record quality (if has check-ins) */}
            {specificityScores.length > 0 && (() => {
              const avg = specificityScores.reduce((a, b) => a + b, 0) / specificityScores.length
              const q = specificityQualityLabel(avg)
              return (
                <div style={{ background: 'white', border: '1px solid #E2E0DB', borderRadius: 10, padding: '13px 16px' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: '#9B9590', marginBottom: 8 }}>Your record quality</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: q.bg, color: q.color }}>{q.label}</span>
                    <span style={{ fontSize: 12, color: '#9B9590' }}>across {specificityScores.length} session{specificityScores.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 3 }}>
                    {specificityScores.map((s, i) => {
                      const qp = specificityQualityLabel(s)
                      return <div key={i} title={`Session ${i + 1}: ${qp.label}`} style={{ flex: 1, height: 5, borderRadius: 2, background: s >= 0.65 ? '#5DCAA5' : s >= 0.35 ? '#E8A94A' : '#E2E0DB' }} />
                    })}
                  </div>
                  <div style={{ fontSize: 11, color: '#9B9590', marginTop: 5, lineHeight: 1.5 }}>
                    {avg >= 0.65
                      ? 'Strong, evidenced contributions across your sessions.'
                      : avg >= 0.35
                      ? 'Good detail in places. Adding specific examples strengthens alignment.'
                      : 'More specific evidence in your next session will build a stronger record.'}
                  </div>
                </div>
              )
            })()}

            {/* Active check-in card */}
            {openCheckIn ? (
              <div style={{ background: '#0A1628', borderRadius: 10, padding: '16px 18px' }}>
                <div style={{ fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase', color: '#5DCAA5', fontWeight: 700, marginBottom: 6 }}>Session open</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: 'white', marginBottom: 2 }}>
                  Session {openCheckIn.sessionNumber} of {totalSessions}
                </div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,.6)', marginBottom: 14 }}>{ground.label}</div>

                {lastCompleted && (
                  <div style={{ background: 'rgba(255,255,255,.06)', borderRadius: 7, padding: '9px 12px', marginBottom: 14 }}>
                    <div style={{ fontSize: 10, letterSpacing: '.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,.4)', fontWeight: 700, marginBottom: 4 }}>Carried over</div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,.8)', lineHeight: 1.5 }}>
                      Session {lastCompleted.sessionNumber} complete.
                      {feedEvents.length > 0 ? ` ${feedEvents[0].text}` : ' Your record is building.'}
                    </div>
                  </div>
                )}

                <div style={{ background: 'rgba(255,255,255,.06)', borderRadius: 7, padding: '9px 12px', marginBottom: 16 }}>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,.5)', lineHeight: 1.5 }}>
                    Your account is independent. The other party never sees what you write here.
                  </div>
                </div>

                <button
                  onClick={() => probeSession.mutate(openCheckIn)}
                  disabled={probeSession.isPending}
                  style={{ width: '100%', padding: '13px 16px', borderRadius: 8, background: '#5DCAA5', color: '#0A1628', fontSize: 14, fontWeight: 800, border: 'none', cursor: probeSession.isPending ? 'wait' : 'pointer', fontFamily: 'inherit', opacity: probeSession.isPending ? 0.7 : 1 }}
                >
                  {probeSession.isPending ? 'Opening...' : `Start session ${openCheckIn.sessionNumber}`}
                </button>
              </div>
            ) : (
              <div style={{ background: '#E7F6EF', border: '1px solid #B6E8D4', borderRadius: 10, padding: '13px 16px' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#085041', marginBottom: 4 }}>Session complete</div>
                <div style={{ fontSize: 12, color: '#3A7A60', lineHeight: 1.6 }}>
                  Your account for this session is on record. The report releases when all parties complete their sessions.
                </div>
              </div>
            )}

            {/* Report reveal (if ready) */}
            {report?.releasedAt && !report.activated && (
              <div style={{ background: 'white', border: '1px solid #E2E0DB', borderRadius: 10, padding: '16px 18px', textAlign: 'center' }}>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>The report is ready</div>
                <div style={{ fontSize: 13, color: '#6B6560', lineHeight: 1.65, marginBottom: 16 }}>
                  Both parties reveal the report at the same time. Once you confirm, the shared picture is permanent.
                </div>
                <button
                  onClick={() => activateMutation.mutate()}
                  disabled={activateMutation.isPending}
                  style={{ padding: '11px 28px', borderRadius: 8, background: '#0C447C', color: 'white', fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit', opacity: activateMutation.isPending ? 0.6 : 1 }}
                >
                  {activateMutation.isPending ? 'Confirming…' : 'Reveal report'}
                </button>
              </div>
            )}

            {/* Specificity intro — shown even before first session */}
            {specificityScores.length === 0 && (
              <div style={{ background: 'white', border: '1px solid #E2E0DB', borderRadius: 10, padding: '13px 16px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: '#9B9590', marginBottom: 6 }}>Your record quality</div>
                <div style={{ fontSize: 12, color: '#6B6560', lineHeight: 1.6 }}>
                  After your first session, you will see how specific and evidenced your contributions are. Specific answers with names, dates, and concrete examples make the shared picture stronger.
                </div>
              </div>
            )}

            {/* Alignment map */}
            {completedCheckIns.length >= 1 && (
              <div style={{ background: 'white', border: '1px solid #E2E0DB', borderRadius: 10, padding: '14px 16px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: '#9B9590', marginBottom: 10 }}>Alignment map</div>
                <div style={{ display: 'flex', gap: 3, marginBottom: 10 }}>
                  {[1,2,3,4,5].map(i => {
                    const bandIndex = Math.min(Math.round(conf), 5)
                    return (
                      <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                        <div style={{ width: '100%', height: 28, borderRadius: 4, background: i <= bandIndex ? '#0C447C' : '#E2E0DB', opacity: i <= bandIndex ? (0.4 + i * 0.12) : 1 }} />
                        <div style={{ fontSize: 9, color: '#9B9590', textAlign: 'center', lineHeight: 1.2 }}>{BANDS[i]}</div>
                      </div>
                    )
                  })}
                </div>
                <div style={{ fontSize: 12, color: '#6B6560', lineHeight: 1.5 }}>
                  Currently at <strong>{bl}</strong> after {completedCheckIns.length} session{completedCheckIns.length !== 1 ? 's' : ''}.
                  {conf < 3 ? ' More sessions will sharpen the picture.' : ' Strong enough to generate a full report.'}
                </div>
              </div>
            )}

            {/* Alignment feed */}
            {feedEvents.length > 0 && (
              <div style={{ background: 'white', border: '1px solid #E2E0DB', borderRadius: 10, padding: '14px 16px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: '#9B9590', marginBottom: 12 }}>Alignment feed</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {feedEvents.slice(0, 6).map((ev: any, i: number) => (
                    <div key={i} style={{ borderLeft: `3px solid ${ev.type === 'convergence' ? '#5DCAA5' : '#E8A94A'}`, paddingLeft: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                        <span style={{
                          fontSize: 9, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase',
                          color: ev.type === 'convergence' ? '#085041' : '#8A5C1A',
                          background: ev.type === 'convergence' ? '#E7F6EF' : '#FDF3E3',
                          padding: '2px 7px', borderRadius: 20,
                        }}>{ev.label}</span>
                        <span style={{ fontSize: 11, color: '#9B9590' }}>Session {ev.session}</span>
                        {ev.at && <span style={{ fontSize: 11, color: '#9B9590' }}>{timeAgo(ev.at)}</span>}
                      </div>
                      <div style={{ fontSize: 12, color: '#4A4540', lineHeight: 1.55 }}>{ev.text}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* SESSION HISTORY TAB */}
        {tab === 'history' && (
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1A1916', marginBottom: 4 }}>Session history</div>
            <div style={{ fontSize: 12, color: '#9B9590', lineHeight: 1.6, marginBottom: 16 }}>Your private check-in record. Nobody else sees this view.</div>

            {openCheckIn && (
              <div style={{ background: '#FDF3E3', border: '1px solid #E8A94A', borderRadius: 10, padding: '11px 14px', marginBottom: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#8A5C1A', marginBottom: 2 }}>Session {openCheckIn.sessionNumber} is open</div>
                <div style={{ fontSize: 12, color: '#6B6560', lineHeight: 1.5 }}>
                  Your in-progress session is on the Check-in tab. It will appear here once complete.
                </div>
                <button onClick={() => setTab('checkin')} style={{ marginTop: 8, fontSize: 12, color: '#8A5C1A', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit', fontWeight: 600, textDecoration: 'underline' }}>
                  Go to check-in
                </button>
              </div>
            )}

            {myCheckIns.length === 0 ? (
              <div style={{ background: 'white', border: '1px solid #E2E0DB', borderRadius: 10, padding: 24, textAlign: 'center' }}>
                <div style={{ fontSize: 13, color: '#9B9590' }}>No completed sessions yet.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[...myCheckIns].sort((a: any, b: any) => b.sessionNumber - a.sessionNumber).map((ci: any) => {
                  const sessionIdx = ci.sessionNumber - 1
                  const score: number | undefined = specificityScores[sessionIdx]
                  const isComplete = ci.status === 'COMPLETED'
                  const q = score !== undefined ? specificityQualityLabel(score) : null
                  return (
                    <div key={ci.id} style={{ background: 'white', border: '1px solid #E2E0DB', borderLeft: `3px solid ${isComplete ? '#5DCAA5' : '#E8A94A'}`, borderRadius: 10, padding: '12px 14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700 }}>Session {ci.sessionNumber}</div>
                          {ci.completedAt && (
                            <div style={{ fontSize: 11, color: '#9B9590' }}>Completed {new Date(ci.completedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {q && (
                            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: q.bg, color: q.color }}>{q.label}</span>
                          )}
                          <span style={{
                            fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, letterSpacing: '.04em', textTransform: 'uppercase',
                            background: isComplete ? '#E7F6EF' : '#FDF3E3',
                            color: isComplete ? '#085041' : '#8A5C1A',
                          }}>
                            {isComplete ? 'Complete' : 'In progress'}
                          </span>
                        </div>
                      </div>
                      {ci.nextCommitment && (
                        <div style={{ fontSize: 12, color: '#6B6560', marginTop: 4, lineHeight: 1.5 }}>
                          <span style={{ fontWeight: 600 }}>Commitment:</span> {ci.nextCommitment}
                        </div>
                      )}
                      {isComplete && <SoloArtifactBlock checkInId={ci.id} />}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* MY RECORD TAB */}
        {tab === 'record' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* Unlock CTA — shown whether locked or not, but changes state */}
            {myRecord?.insightsLocked !== false && (
              <div style={{ background: '#0C447C', borderRadius: 10, padding: '18px 20px' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'white', marginBottom: 6 }}>Unlock your full record</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,.75)', lineHeight: 1.6, marginBottom: 14 }}>
                  See how your record has built over time: specificity trend, confidence score, and observations from your account across sessions. Unlocks for your whole organisation.
                </div>
                <button
                  onClick={() => checkoutMut.mutate()}
                  disabled={checkoutMut.isPending}
                  style={{ padding: '9px 18px', borderRadius: 7, background: 'white', color: '#0C447C', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  {checkoutMut.isPending ? 'Opening…' : 'Unlock insights for $25/mo'}
                </button>
              </div>
            )}

            {/* Session history summary — always visible */}
            {(myRecord?.sessions ?? []).length > 0 && (
              <div style={{ background: 'white', border: '1px solid #E2E0DB', borderRadius: 10, padding: '14px 16px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: '#9B9590', marginBottom: 10 }}>Sessions on record</div>
                {(myRecord?.sessions ?? []).map(s => (
                  <div key={s.sessionNumber} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderTop: '1px solid #F0EEE9' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1916' }}>Session {s.sessionNumber}</div>
                    <div style={{ fontSize: 11, color: s.status === 'COMPLETED' ? '#085041' : '#9B9590', fontWeight: s.status === 'COMPLETED' ? 700 : 500 }}>
                      {s.status === 'COMPLETED' ? (s.completedAt ? new Date(s.completedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Complete') : 'In progress'}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Specificity trend — unlocked only */}
            {myRecord && !myRecord.insightsLocked && myRecord.specificity && (
              <div style={{ background: 'white', border: '1px solid #E2E0DB', borderRadius: 10, padding: '14px 16px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: '#9B9590', marginBottom: 8 }}>Specificity across sessions</div>
                <div style={{ display: 'flex', gap: 3, marginBottom: 8 }}>
                  {myRecord.specificity.scores.map((s, i) => (
                    <div key={i} title={`Session ${i + 1}`} style={{ flex: 1, height: 6, borderRadius: 3, background: s >= 0.65 ? '#5DCAA5' : s >= 0.35 ? '#E8A94A' : '#E2E0DB' }} />
                  ))}
                </div>
                <div style={{ fontSize: 12, color: '#6B6560', lineHeight: 1.5 }}>
                  {myRecord.specificity.label === 'high'
                    ? 'Your record is consistently specific and evidenced. It carries strong weight.'
                    : myRecord.specificity.label === 'moderate'
                      ? 'Good detail in places. Adding specific examples in your next session strengthens the picture.'
                      : 'Your record is building. Specificity grows with each check-in.'}
                </div>
              </div>
            )}

            {/* Confidence score — unlocked only */}
            {myRecord && !myRecord.insightsLocked && myRecord.confidence && (
              <div style={{ background: 'white', border: '1px solid #E2E0DB', borderRadius: 10, padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: '#9B9590' }}>Record confidence</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#0C447C' }}>{myRecord.confidence.label}</div>
                </div>
                <div style={{ display: 'flex', gap: 3, marginBottom: 8 }}>
                  {[1,2,3,4,5].map(i => (
                    <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= myRecord.confidence!.score ? '#0C447C' : '#E2E0DB' }} />
                  ))}
                </div>
                <div style={{ fontSize: 12, color: '#6B6560', lineHeight: 1.5 }}>{myRecord.confidence.description}</div>
              </div>
            )}

            {/* Pattern observations — unlocked, diplomatic */}
            {myRecord && !myRecord.insightsLocked && myRecord.patterns && myRecord.patterns.length > 0 && (
              <div style={{ background: 'white', border: '1px solid #E2E0DB', borderRadius: 10, padding: '14px 16px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: '#9B9590', marginBottom: 4 }}>Observations from your record</div>
                <div style={{ fontSize: 12, color: '#9B9590', marginBottom: 10, lineHeight: 1.5 }}>
                  These are patterns Groundwork has noticed across your check-ins. They are observations, not verdicts. Worth being aware of as your record builds.
                </div>
                {myRecord.patterns.map((p, i) => (
                  <div key={i} style={{ padding: '10px 0', borderTop: i === 0 ? '1px solid #F0EEE9' : '1px solid #F0EEE9', fontSize: 13, color: '#3A3630', lineHeight: 1.6 }}>
                    {p.observation}
                    {p.sessionNumber && <span style={{ display: 'block', fontSize: 11, color: '#9B9590', marginTop: 3 }}>First noticed in Session {p.sessionNumber}</span>}
                  </div>
                ))}
              </div>
            )}

            {myRecord && !myRecord.insightsLocked && (!myRecord.patterns || myRecord.patterns.length === 0) && (
              <div style={{ background: '#F5F3EF', border: '1px solid #E2E0DB', borderRadius: 10, padding: '14px 16px', fontSize: 12, color: '#9B9590', lineHeight: 1.6 }}>
                No patterns have surfaced yet. Patterns appear after they have been observed across multiple sessions. This is intentional.
              </div>
            )}
          </div>
        )}

        {/* REPORT TAB */}
        {tab === 'report' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1A1916', marginBottom: 2 }}>Your report</div>
            <div style={{ fontSize: 12, color: '#9B9590', lineHeight: 1.6, marginBottom: 4 }}>
              This is your participant report. It speaks to your account only and does not reveal the other party's raw words.
            </div>

            {!report ? (
              <div style={{ background: 'white', border: '1px solid #E2E0DB', borderRadius: 10, padding: 24, textAlign: 'center' }}>
                <div style={{ fontSize: 13, color: '#9B9590', marginBottom: 4 }}>No report yet.</div>
                <div style={{ fontSize: 12, color: '#9B9590' }}>The report generates once all parties have checked in.</div>
              </div>
            ) : !report.releasedAt ? (
              <div style={{ background: '#EEF4FB', border: '1px solid #BFDBFE', borderRadius: 10, padding: '14px 16px' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0C447C', marginBottom: 4 }}>Report is being prepared</div>
                <div style={{ fontSize: 12, color: '#4A6A9A', lineHeight: 1.6 }}>The admin is reviewing the cross-reference. Your report will be available once it is released.</div>
              </div>
            ) : !report.activated ? (
              <div style={{ background: 'white', border: '1px solid #E2E0DB', borderRadius: 10, padding: '16px 18px', textAlign: 'center' }}>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>The report is ready</div>
                <div style={{ fontSize: 13, color: '#6B6560', lineHeight: 1.65, marginBottom: 16 }}>
                  Both parties reveal the report at the same time. Once you confirm, the shared picture is permanent.
                </div>
                <button
                  onClick={() => activateMutation.mutate()}
                  disabled={activateMutation.isPending}
                  style={{ padding: '11px 28px', borderRadius: 8, background: '#0C447C', color: 'white', fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit', opacity: activateMutation.isPending ? 0.6 : 1 }}
                >
                  {activateMutation.isPending ? 'Confirming…' : 'Reveal report'}
                </button>
              </div>
            ) : (
              <>
                {/* Participant report sections */}
                {report.pattern && (
                  <div style={{ background: '#0A1628', color: 'white', borderRadius: 10, padding: '14px 16px' }}>
                    <div style={{ fontSize: 10, letterSpacing: '.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,.45)', fontWeight: 700, marginBottom: 8 }}>What your record reveals</div>
                    <div style={{ fontSize: 13, lineHeight: 1.65 }}>{report.pattern}</div>
                  </div>
                )}
                {(report.assumptions ?? []).length > 0 && (
                  <div style={{ background: 'white', border: '1px solid #E2E0DB', borderRadius: 10, padding: '13px 16px' }}>
                    <div style={{ fontSize: 10, letterSpacing: '.08em', textTransform: 'uppercase', color: '#9B9590', fontWeight: 700, marginBottom: 8 }}>Assumptions you are carrying</div>
                    <ul style={{ listStyle: 'disc', paddingLeft: 18, margin: 0 }}>
                      {(report.assumptions ?? []).map((a: string, i: number) => <li key={i} style={{ fontSize: 13, lineHeight: 1.65, marginBottom: 5 }}>{a}</li>)}
                    </ul>
                  </div>
                )}
                {(report.clarity ?? []).length > 0 && (
                  <div style={{ background: '#EEF4FB', border: '1px solid #BFDBFE', borderRadius: 10, padding: '13px 16px' }}>
                    <div style={{ fontSize: 10, letterSpacing: '.08em', textTransform: 'uppercase', color: '#0C447C', fontWeight: 700, marginBottom: 8 }}>Where you have clarity</div>
                    <ul style={{ listStyle: 'disc', paddingLeft: 18, margin: 0 }}>
                      {(report.clarity ?? []).map((c: string, i: number) => <li key={i} style={{ fontSize: 13, lineHeight: 1.65, marginBottom: 5 }}>{c}</li>)}
                    </ul>
                  </div>
                )}

                {/* Cross-reference section (shared picture, after activation) */}
                {(report.alignmentReached ?? []).length > 0 && (
                  <div style={{ background: '#E7F6EF', border: '1px solid #B6E8D4', borderRadius: 10, padding: '13px 16px' }}>
                    <div style={{ fontSize: 10, letterSpacing: '.08em', textTransform: 'uppercase', color: '#085041', fontWeight: 700, marginBottom: 10 }}>Shared picture: where you are aligned</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {(report.alignmentReached ?? []).map((a: any, i: number) => (
                        <div key={i} style={{ borderLeft: '3px solid #5DCAA5', paddingLeft: 10 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#085041' }}>{a.title ?? a}</div>
                          {a.note && <div style={{ fontSize: 12, color: '#3A7A60', lineHeight: 1.5, marginTop: 2 }}>{a.note}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {(report.areasRequiringAlignment ?? []).length > 0 && (
                  <div style={{ background: 'white', border: '1px solid #E2E0DB', borderRadius: 10, padding: '13px 16px' }}>
                    <div style={{ fontSize: 10, letterSpacing: '.08em', textTransform: 'uppercase', color: '#9B9590', fontWeight: 700, marginBottom: 10 }}>Shared picture: still to resolve</div>
                    <div style={{ fontSize: 11, color: '#9B9590', marginBottom: 10, lineHeight: 1.5 }}>These gaps appear in the cross-reference. They show where your account and the other party's account differ. Neither side's raw words are shown here.</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {(report.areasRequiringAlignment ?? []).map((a: any, i: number) => (
                        <div key={i} style={{ borderLeft: '3px solid #E8A94A', paddingLeft: 10 }}>
                          <div style={{ fontSize: 13, fontWeight: 700 }}>{a.title ?? a}</div>
                          {a.observation && <div style={{ fontSize: 12, color: '#6B6560', lineHeight: 1.5, marginTop: 2 }}>{a.observation}</div>}
                          {a.recommendedMove && (
                            <div style={{ fontSize: 12, color: '#0C447C', fontWeight: 600, marginTop: 4 }}>Next: {a.recommendedMove}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ background: '#F5F3EF', border: '1px solid #E2E0DB', borderRadius: 8, padding: '10px 13px' }}>
                  <div style={{ fontSize: 11, color: '#9B9590', lineHeight: 1.6 }}>
                    This report shows where both accounts agree and where they differ. The other party's exact words are never visible to you, and yours are never visible to them.
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* DOCUMENTS TAB */}
        {tab === 'docs' && (
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1A1916', marginBottom: 4 }}>Documents</div>
            <div style={{ fontSize: 12, color: '#9B9590', lineHeight: 1.6, marginBottom: 14, background: 'white', borderRadius: 8, padding: '10px 12px', border: '1px solid #E2E0DB' }}>
              Documents the admin has shared appear here. Your uploads are part of your private record until the report activates.
            </div>

            <div
              style={{ border: '1.5px dashed #E2E0DB', borderRadius: 8, padding: 16, textAlign: 'center', cursor: 'pointer', marginBottom: 12, background: 'white' }}
              onClick={() => document.getElementById('gp-doc-upload')?.click()}
            >
              <div style={{ fontSize: 13, fontWeight: 600, color: '#0C447C' }}>Upload a supporting document</div>
              <div style={{ fontSize: 12, color: '#9B9590', marginTop: 3 }}>PDF, DOCX, JPEG, PNG</div>
              <input type="file" id="gp-doc-upload" style={{ display: 'none' }} accept=".pdf,.docx,.jpeg,.jpg,.png"
                onChange={e => { const f = e.target.files?.[0]; if (f) uploadDoc.mutate(f); e.target.value = '' }} />
            </div>

            {docs.length === 0 ? (
              <div style={{ fontSize: 13, color: '#9B9590', textAlign: 'center', padding: 20, background: 'white', borderRadius: 8, border: '1px solid #E2E0DB' }}>
                No documents yet.
              </div>
            ) : (
              docs.map((doc: any) => (
                <div key={doc.id} style={{ background: 'white', border: '1px solid #E2E0DB', borderRadius: 8, padding: '11px 14px', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{doc.name}</div>
                    <div style={{ fontSize: 11, color: '#9B9590', marginTop: 2 }}>{new Date(doc.uploadedAt).toLocaleDateString()}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* SETTINGS TAB */}
        {tab === 'settings' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1A1916', marginBottom: 4 }}>Settings</div>

            {/* Profile summary */}
            <div style={{ background: 'white', border: '1px solid #E2E0DB', borderRadius: 10, padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#0C447C', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 16, fontWeight: 800, flexShrink: 0 }}>
                {(user?.firstName?.[0] ?? '?').toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#1A1916' }}>{user?.firstName} {user?.lastName}</div>
                <div style={{ fontSize: 12, color: '#9B9590' }}>{user?.email}</div>
              </div>
            </div>

            <div style={{ background: 'white', border: '1px solid #E2E0DB', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ padding: '13px 16px', borderBottom: '1px solid #F0EEE9' }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>Ground</div>
                <div style={{ fontSize: 12, color: '#9B9590' }}>{ground.label}</div>
              </div>
              <div style={{ padding: '13px 16px', borderBottom: '1px solid #F0EEE9' }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>Scenario</div>
                <div style={{ fontSize: 12, color: '#9B9590' }}>{ground.scenario?.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c: string) => c.toUpperCase())}</div>
              </div>
              <div style={{ padding: '13px 16px', borderBottom: '1px solid #F0EEE9' }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>Your role</div>
                <div style={{ fontSize: 12, color: '#9B9590' }}>{myParticipant?.roleAsDescribed ?? 'Contributor'}</div>
              </div>
              <div style={{ padding: '13px 16px', borderBottom: '1px solid #F0EEE9' }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>Status</div>
                <div style={{ fontSize: 12, color: '#9B9590' }}>{ground.status}</div>
              </div>
              <div style={{ padding: '13px 16px' }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>Sessions completed</div>
                <div style={{ fontSize: 12, color: '#9B9590' }}>{completedCheckIns.length} of {totalSessions}</div>
              </div>
            </div>

            {specificity && (
              <div style={{ background: 'white', border: '1px solid #E2E0DB', borderRadius: 10, padding: '13px 16px' }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Record quality</div>
                <div style={{ fontSize: 12, color: '#6B6560', lineHeight: 1.6 }}>
                  Overall quality label: <strong style={{ color: '#1A1916' }}>{specificity.label}</strong>.
                  This reflects how specific and evidenced your submissions have been across all sessions.
                  Specific, verifiable contributions strengthen the cross-reference and make the final report more useful to both parties.
                </div>
              </div>
            )}

            <div style={{ background: '#F8ECEA', border: '1px solid #EDD0CB', borderRadius: 10, padding: '13px 16px' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#B5675A', marginBottom: 4 }}>Privacy reminder</div>
              <div style={{ fontSize: 12, color: '#7A4A44', lineHeight: 1.6 }}>
                Your check-in answers are never visible to the other party. They are stored privately and only cross-referenced at the point of report generation. Neither party can read the other's raw account at any time.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Paywall overlay */}
      {showPaywall && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(10,22,40,0.55)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px' }}>
          <div style={{ background: 'white', borderRadius: 12, padding: 24, maxWidth: 380, width: '100%' }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#0A1628', marginBottom: 8 }}>This ground needs a session to continue.</div>
            {(ground as any).sessionsBalance !== undefined && (
              <div style={{ fontSize: 13, color: '#6B6560', marginBottom: 14 }}>
                Sessions remaining: {(ground as any).sessionsBalance}
              </div>
            )}
            <button
              onClick={() => purchaseSessionMut.mutate()}
              disabled={purchaseSessionMut.isPending}
              style={{ width: '100%', padding: '12px', borderRadius: 8, background: '#0A1628', color: 'white', fontSize: 14, fontWeight: 700, border: 'none', cursor: purchaseSessionMut.isPending ? 'wait' : 'pointer', fontFamily: 'inherit', opacity: purchaseSessionMut.isPending ? 0.7 : 1, marginBottom: 14 }}
            >
              {purchaseSessionMut.isPending ? 'Redirecting...' : 'Add a session ($5)'}
            </button>

            <div style={{ borderTop: '1px solid #E2E0DB', paddingTop: 14 }}>
              <button
                onClick={() => setShowPaywall(false)}
                style={{ background: 'none', border: 'none', fontSize: 12, color: '#9B9590', cursor: 'pointer', fontFamily: 'inherit', padding: 0, marginBottom: 10 }}
              >
                Cancel
              </button>
              <div style={{ marginTop: 4 }}>
                <button
                  onClick={() => {}}
                  style={{ background: 'none', border: 'none', fontSize: 12, color: '#9B9590', cursor: 'pointer', fontFamily: 'inherit', padding: 0, textDecoration: 'underline' }}
                  aria-label="toggle contributor code"
                >
                  Have a contributor code?
                </button>
              </div>
              <div style={{ marginTop: 10 }}>
                <input
                  type="text"
                  value={paywallCode}
                  onChange={e => { setPaywallCode(e.target.value); setPaywallCodeMsg(null) }}
                  placeholder="Enter code"
                  style={{ width: '100%', padding: '9px 11px', fontSize: 13, fontFamily: 'inherit', border: `1px solid ${paywallCodeMsg && !paywallCodeMsg.ok ? '#c0392b' : '#E2E0DB'}`, borderRadius: 7, background: '#F5F3EF', color: '#0A1628', outline: 'none', boxSizing: 'border-box', marginBottom: 8 }}
                />
                {paywallCodeMsg && (
                  <div style={{ fontSize: 12, color: paywallCodeMsg.ok ? '#085041' : '#c0392b', marginBottom: 8 }}>{paywallCodeMsg.text}</div>
                )}
                <button
                  onClick={() => redeemPaywallCode.mutate()}
                  disabled={!paywallCode.trim() || redeemPaywallCode.isPending}
                  style={{ width: '100%', padding: '9px', borderRadius: 7, background: '#0C447C', color: 'white', fontSize: 13, fontWeight: 600, border: 'none', cursor: !paywallCode.trim() ? 'not-allowed' : 'pointer', opacity: !paywallCode.trim() ? 0.45 : 1, fontFamily: 'inherit' }}
                >
                  {redeemPaywallCode.isPending ? 'Checking...' : 'Apply'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
