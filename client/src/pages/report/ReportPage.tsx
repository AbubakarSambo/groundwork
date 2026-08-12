import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { groundsApi } from '@/api/grounds'
import { reportsApi } from '@/api/reports'
import { conversationApi } from '@/api/conversation'
import { outcomeFeedbackApi } from '@/api/feedback'
import { apiClient } from '@/api/client'
import { useAuthStore } from '@/stores/auth'
import { alignmentLabel, alignmentShort } from '@/lib/alignment'
import { participantLabel } from '@/lib/utils'
import { InferenceReviewPanel } from '@/components/InferenceReviewPanel'
import { VennIcon } from '@/components/gw/VennIcon'
import { participantRequestsApi } from '@/api/participantRequests'

type ViewTab = 'shared' | 'own'

interface ResolutionStatus {
  resolution: { id: string; endState: string; closedAt: string | null } | null
  confirmations: { participantId: string; label: string; endState: string | null; confirmed: boolean }[]
  confirmedCount: number
  totalActive: number
  groundStatus: string
}

function ResolutionSection({ groundId, resolutionState }: { groundId: string; resolutionState?: string | null }) {
  const { data } = useQuery({
    queryKey: ['resolution', groundId],
    queryFn: () => apiClient.get<ResolutionStatus>(`/grounds/${groundId}/resolution`).then(r => r.data),
    retry: false,
  })
  const isClosed = data?.groundStatus === 'RESOLVED' || data?.groundStatus === 'CLOSED'

  return (
    <div style={{ background: 'white', border: '1px solid #E2E0DB', borderRadius: 12, padding: '16px 18px', marginBottom: 18 }}>
      <div style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: '#9B9590', fontWeight: 700, marginBottom: 10 }}>Resolution</div>
      {resolutionState && (
        <div style={{ marginBottom: data ? 12 : 0 }}>
          <span style={{ fontSize: 9.5, letterSpacing: '.07em', textTransform: 'uppercase', fontWeight: 700, color: '#9B9590', display: 'block', marginBottom: 2 }}>Agreed at the start</span>
          <div style={{ fontSize: 14, fontWeight: 700 }}>{resolutionState}</div>
        </div>
      )}
      {data && (
        <div>
          <span style={{ fontSize: 9.5, letterSpacing: '.07em', textTransform: 'uppercase', fontWeight: 700, color: '#9B9590', display: 'block', marginBottom: 6 }}>Current status</span>
          {isClosed && data.resolution ? (
            <div style={{ background: '#E7F6EF', borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#085041' }}>Closed: {data.resolution.endState}</div>
              <div style={{ fontSize: 12, color: '#3A7A60', marginTop: 2 }}>All {data.totalActive} parties confirmed the same end state.</div>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: 13, marginBottom: 8 }}>{data.confirmedCount} of {data.totalActive} parties have confirmed an end state.</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {data.confirmations.map((c) => (
                  <div key={c.participantId} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, padding: '6px 10px', background: '#F7F6F3', borderRadius: 6 }}>
                    <span>{c.label}</span>
                    <span style={{ color: c.confirmed ? '#085041' : '#9B9590', fontWeight: 600 }}>{c.confirmed ? c.endState : 'Not yet'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      {!resolutionState && !data?.resolution && (
        <div style={{ fontSize: 13, color: '#9B9590' }}>No resolution state set for this ground yet.</div>
      )}
    </div>
  )
}

/**
 * The five-band ladder that used to sit here - Unresolved, Mixed, Emerging,
 * Clear, Aligned, with a filled "n of 5" - is gone. Two reasons, and the second
 * is the one that mattered.
 *
 * It read as a grade. The landing page says twice that this product does not
 * score or rate, and a five-step bar with four segments lit is a score whatever
 * the words on it say. A person opening their own report should not meet a
 * number that looks like a mark out of five.
 *
 * And three of the five bands were invented. The report holds exactly two
 * things: `agreements` and `divergences`. "Emerging" and "Mixed" were thresholds
 * picked here in the client to fill a scale that the record cannot support -
 * d <= 2 was a design decision, not a finding. So the page now says what the
 * report actually holds, and when it holds nothing it says nothing. That last
 * part is the point: an empty report used to render as a full ladder.
 */

/**
 * DID THIS FEEL FAIR?
 *
 * The only question that tells anyone whether Groundwork worked, and until now
 * there was no way for a party to answer it. Both verbs of
 * `/grounds/:id/outcome-feedback` existed on the API and nothing called either,
 * which means `avgFairnessRate` in the outcome-learning summary has been
 * averaging an empty set since it was written.
 *
 * Three deliberate choices:
 *
 * ASKED ONLY AFTER THE GROUND CLOSES. Asking mid-ground is asking someone to
 * rate a conversation they are still inside, and it would also tell them the
 * process is over when it is not.
 *
 * THE ANSWER IS CHANGEABLE. The endpoint upserts, so a party who felt one way on
 * the day and another a week later can say so. A first impression locked in
 * forever is a worse record than a revisable one.
 *
 * "NO" IS AS EASY TO PRESS AS "YES". Both are plain buttons of equal weight. A
 * feedback control that makes the negative answer the effortful one collects
 * flattery, and flattery here would quietly corrupt the one number that says
 * whether any of this is working.
 */
function OutcomeFeedbackSection({ groundId, closed }: { groundId: string; closed: boolean }) {
  const qc = useQueryClient()
  const [note, setNote] = useState('')

  const { data: mine } = useQuery({
    queryKey: ['outcome-feedback', groundId],
    queryFn: () => outcomeFeedbackApi.mine(groundId),
    enabled: closed,
    retry: false,
  })

  const submit = useMutation({
    mutationFn: (feltFair: boolean) => outcomeFeedbackApi.submit(groundId, feltFair, note.trim() || undefined),
    onSuccess: () => {
      toast.success('Thank you - that is recorded.')
      setNote('')
      qc.invalidateQueries({ queryKey: ['outcome-feedback', groundId] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Could not record that. Please try again.'),
  })

  if (!closed) return null

  const answered = !!mine

  return (
    <div style={{ background: 'white', border: '1px solid #E2E0DB', borderRadius: 12, padding: '16px 18px', marginBottom: 18 }}>
      <div style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: '#9B9590', fontWeight: 700, marginBottom: 10 }}>
        This ground has closed
      </div>

      {answered && (
        <div style={{ fontSize: 13, marginBottom: 10 }}>
          You said this process {mine!.feltFair ? 'felt fair' : 'did not feel fair'}.
          {mine!.note && <span style={{ color: '#6B6560' }}> "{mine!.note}"</span>}
          <span style={{ color: '#9B9590' }}> You can change that below.</span>
        </div>
      )}

      <div style={{ fontSize: 13.5, marginBottom: 8, lineHeight: 1.55 }}>
        Did this process feel fair, and grounded in what was actually said?
      </div>
      <div style={{ fontSize: 12, color: '#6B6560', marginBottom: 10, lineHeight: 1.5 }}>
        Your answer is not shown to the other parties.
      </div>

      <textarea
        value={note}
        onChange={e => setNote(e.target.value)}
        maxLength={2000}
        rows={2}
        placeholder="Anything you want to add (optional)"
        style={{ width: '100%', boxSizing: 'border-box', fontSize: 13, padding: '8px 10px', borderRadius: 7, border: '1px solid #D6D2CA', fontFamily: 'inherit', outline: 'none', resize: 'vertical', marginBottom: 10 }}
      />

      <div style={{ display: 'flex', gap: 8 }}>
        {/* Equal weight, deliberately. See the note above. */}
        <button
          disabled={submit.isPending}
          onClick={() => submit.mutate(true)}
          style={{ fontSize: 13, fontWeight: 700, color: '#085041', background: '#E7F6EF', border: '1px solid #BFE3D3', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontFamily: 'inherit' }}
        >
          It felt fair
        </button>
        <button
          disabled={submit.isPending}
          onClick={() => submit.mutate(false)}
          style={{ fontSize: 13, fontWeight: 700, color: '#8A5C1A', background: '#FDF3E3', border: '1px solid #F0DCB4', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontFamily: 'inherit' }}
        >
          It did not
        </button>
      </div>
    </div>
  )
}

function PatternBlock({ label, content, dark }: { label: string; content: string; dark?: boolean }) {
  return (
    <div style={{ background: dark ? '#0E3A30' : '#0A1628', color: '#fff', borderRadius: 11, padding: '15px 17px', marginBottom: 16 }}>
      <div style={{ fontSize: 10.5, letterSpacing: '.1em', textTransform: 'uppercase', color: '#5DCAA5', fontWeight: 700, marginBottom: 8 }}>
        {label}
      </div>
      <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: 'rgba(255,255,255,.93)' }}>{content}</p>
    </div>
  )
}

function AreaBlock({ title, observation, whyItMatters, recommendedMove, reached, note }: {
  title: string
  observation?: string
  whyItMatters?: string
  recommendedMove?: string
  reached?: boolean
  note?: string
}) {
  return (
    <div style={{
      border: '1px solid #E2E0DB', borderRadius: 10, padding: '12px 14px', marginBottom: 10,
      borderLeft: `3px solid ${reached ? '#5DCAA5' : '#E8A94A'}`,
    }}>
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>{title}</div>
      {note && <div style={{ fontSize: 12.5, color: '#6B6560' }}>{note}</div>}
      {observation && (
        <div style={{ fontSize: 13, lineHeight: 1.5, marginBottom: 7 }}>
          <span style={{ fontSize: 9.5, letterSpacing: '.07em', textTransform: 'uppercase', fontWeight: 700, color: '#9B9590', display: 'block', marginBottom: 1 }}>What we noticed</span>
          {observation}
        </div>
      )}
      {whyItMatters && (
        <div style={{ fontSize: 13, lineHeight: 1.5, marginBottom: 7 }}>
          <span style={{ fontSize: 9.5, letterSpacing: '.07em', textTransform: 'uppercase', fontWeight: 700, color: '#9B9590', display: 'block', marginBottom: 1 }}>Why it matters</span>
          {whyItMatters}
        </div>
      )}
      {recommendedMove && (
        <div style={{ background: '#E7F6EF', borderRadius: 7, padding: '8px 10px', fontSize: 13, color: '#085041', lineHeight: 1.5 }}>
          <span style={{ fontSize: 9.5, letterSpacing: '.07em', textTransform: 'uppercase', fontWeight: 700, color: '#085041', opacity: 0.75, display: 'block', marginBottom: 2 }}>What to do next</span>
          {recommendedMove}
        </div>
      )}
    </div>
  )
}

function HonestClose({ aligned, open, revisit, risk }: {
  aligned?: string; open?: string; revisit?: string; risk?: string
}) {
  const cells = [
    { label: 'Aligned', value: aligned, bg: '#E7F6EF', color: '#085041' },
    { label: 'Open',    value: open,    bg: '#FDF3E3', color: '#8A5C1A' },
    { label: 'Revisit', value: revisit, bg: '#EEF4FB', color: '#0C447C' },
    { label: 'Risk',    value: risk,    bg: '#F8ECEA', color: '#B5675A' },
  ]
  const visible = cells.filter(c => c.value)
  if (visible.length === 0) return null
  return (
    <div>
      <div style={{ fontSize: 10.5, letterSpacing: '.09em', textTransform: 'uppercase', color: '#9B9590', fontWeight: 700, margin: '0 0 9px' }}>An honest close</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {cells.map(cell => cell.value ? (
          <div key={cell.label} style={{ borderRadius: 8, padding: '10px 12px', fontSize: 12.5, lineHeight: 1.5, color: '#1A1916', background: cell.bg }}>
            <span style={{ fontSize: 9.5, letterSpacing: '.07em', textTransform: 'uppercase', fontWeight: 700, display: 'block', marginBottom: 3, color: cell.color }}>{cell.label}</span>
            {cell.value}
          </div>
        ) : null)}
      </div>
    </div>
  )
}

function Bullet({ text }: { text: string }) {
  return (
    <div style={{ display: 'flex', gap: 9, fontSize: 13, lineHeight: 1.55, marginBottom: 7 }}>
      <span style={{ flexShrink: 0, marginTop: '.55em', width: 5, height: 5, borderRadius: '50%', background: '#5DCAA5', display: 'inline-block' }} />
      <span>{text}</span>
    </div>
  )
}

function SecH({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 10.5, letterSpacing: '.09em', textTransform: 'uppercase', color: '#9B9590', fontWeight: 700, margin: '0 0 9px' }}>
      {children}
    </div>
  )
}

// #1b/#1c: hiddenContributors is computed server-side (reports.service.ts
// REPORT_SCHEMA) but was never rendered anywhere - dead data. Surfaces it here
// with a role-appropriate action: the initiator can add the person directly
// (the ground already exists at this point, unlike the pre-ground entry
// flow); a participant cannot add anyone themselves, so they get the
// existing ParticipantRequest flow instead, which the initiator already has
// an approval UI for (GroundAdminPage.tsx pendingRequests).
function HiddenContributorsSection({
  groundId,
  contributors,
  isInitiator,
}: {
  groundId: string
  contributors: { label: string; evidence: string }[]
  isInitiator: boolean
}) {
  const [openFor, setOpenFor] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [reason, setReason] = useState('')
  const [done, setDone] = useState<Set<string>>(new Set())

  const addParticipant = useMutation({
    mutationFn: (vars: { key: string; email: string; note: string }) =>
      groundsApi.addParticipant(groundId, { email: vars.email, note: vars.note }),
    onSuccess: (_data, vars) => {
      setDone(prev => new Set(prev).add(vars.key))
      setOpenFor(null)
      toast.success('Invited.')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Could not add them. Try again.'),
  })

  const requestAddition = useMutation({
    mutationFn: (vars: { key: string; requestedEmail: string; requestedName?: string; reason: string }) =>
      participantRequestsApi.create(groundId, { requestedEmail: vars.requestedEmail, requestedName: vars.requestedName, reason: vars.reason }),
    onSuccess: (_data, vars) => {
      setDone(prev => new Set(prev).add(vars.key))
      setOpenFor(null)
      toast.success('Request sent to the initiator.')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Could not send the request. Try again.'),
  })

  if (contributors.length === 0) return null

  return (
    <div style={{ marginTop: 16, background: '#F4F7FC', border: '1px solid #CFE2F5', borderRadius: 8, padding: '12px 14px' }}>
      <SecH>People who may be missing</SecH>
      <div style={{ fontSize: 12.5, color: '#4A5568', lineHeight: 1.55, marginBottom: 10 }}>
        The record references people who are not themselves a party on this ground.
      </div>
      {contributors.map((c, i) => {
        const key = `${i}-${c.label}`
        return (
          <div key={key} style={{ padding: '9px 0', borderTop: i > 0 ? '0.5px solid #D8E2F0' : undefined }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1A1916', marginBottom: 2 }}>{c.label}</div>
            <div style={{ fontSize: 12, color: '#6B6560', lineHeight: 1.45, marginBottom: 6 }}>{c.evidence}</div>
            {done.has(key) ? (
              <div style={{ fontSize: 11.5, color: '#085041', fontWeight: 600 }}>{isInitiator ? '✓ Invited' : '✓ Request sent'}</div>
            ) : openFor === key ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <input
                  type="email" autoFocus placeholder="their@email.com"
                  value={email} onChange={e => setEmail(e.target.value)}
                  style={{ padding: '7px 10px', borderRadius: 6, border: '1px solid #CFE2F5', fontSize: 12.5, fontFamily: 'inherit', outline: 'none' }}
                />
                {!isInitiator && (
                  <input
                    type="text" placeholder="Their name (optional)"
                    value={name} onChange={e => setName(e.target.value)}
                    style={{ padding: '7px 10px', borderRadius: 6, border: '1px solid #CFE2F5', fontSize: 12.5, fontFamily: 'inherit', outline: 'none' }}
                  />
                )}
                {!isInitiator && (
                  <textarea
                    placeholder="Why should they be added?"
                    value={reason} onChange={e => setReason(e.target.value)}
                    style={{ padding: '7px 10px', borderRadius: 6, border: '1px solid #CFE2F5', fontSize: 12.5, fontFamily: 'inherit', outline: 'none', resize: 'vertical', minHeight: 44 }}
                  />
                )}
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => {
                      if (!email.trim().includes('@')) return
                      if (isInitiator) {
                        addParticipant.mutate({ key, email: email.trim(), note: c.evidence })
                      } else {
                        requestAddition.mutate({ key, requestedEmail: email.trim(), requestedName: name.trim() || undefined, reason: reason.trim() || c.evidence })
                      }
                    }}
                    disabled={addParticipant.isPending || requestAddition.isPending}
                    style={{ flex: 1, padding: '7px 12px', borderRadius: 6, background: '#0C447C', color: 'white', border: 'none', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    {isInitiator ? 'Add them' : 'Send request'}
                  </button>
                  <button
                    onClick={() => { setOpenFor(null); setEmail(''); setName(''); setReason('') }}
                    style={{ padding: '7px 12px', borderRadius: 6, background: 'none', border: '1px solid #CFE2F5', color: '#6B6560', fontSize: 12.5, cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => { setOpenFor(key); setEmail(''); setName(''); setReason(c.evidence) }}
                style={{ background: 'none', border: 'none', padding: 0, fontSize: 12.5, fontWeight: 600, color: '#0C447C', cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline' }}
              >
                {isInitiator ? 'Add them' : 'Request they be added'}
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}

export function ReportPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const user = useAuthStore(s => s.user)
  const [tab, setTab] = useState<ViewTab>('shared')

  const { data: ground, isLoading: gl } = useQuery({
    queryKey: ['ground', id],
    queryFn: () => groundsApi.get(id!),
    enabled: !!id,
  })

  /**
   * A report that is out of date says so.
   *
   * Synthesis runs after a check-in finishes, so for a minute or two the page
   * shows the PREVIOUS report with no sign of it. Someone who has just spent
   * twenty minutes correcting their account opens this, sees the old version,
   * and reasonably concludes the correction was thrown away. Showing that it is
   * still updating - and refreshing until it is - costs nothing and prevents
   * exactly that.
   */
  const [reportIsStale, setReportIsStale] = useState(false)

  const { data: report, isLoading: rl } = useQuery({
    queryKey: ['report', id],
    queryFn: () => reportsApi.get(id!),
    enabled: !!id,
    retry: false,
    refetchInterval: reportIsStale ? 5000 : false,
  })

  // Someone finished a check-in after this report was written, so what is on
  // screen predates their account.
  useEffect(() => {
    const generatedAt = (report as any)?.createdAt ? new Date((report as any).createdAt).getTime() : 0
    const newest = (ground?.checkIns ?? [])
      .map((c) => (c.completedAt ? new Date(c.completedAt).getTime() : 0))
      .reduce((m, t) => Math.max(m, t), 0)
    setReportIsStale(!!generatedAt && newest > generatedAt)
  }, [report, ground])

  // Self-correction: revisit a completed session to correct or add to it. The backend
  // (startSelfCorrectionSession) opens a fresh session in correction mode; the corrected
  // record flows into the next report synthesis. The original session is preserved, not
  // overwritten. Only available on your OWN completed session that no later session builds on.
  const correctSession = useMutation({
    mutationFn: (sessionNumber: number) => reportsApi.startSelfCorrection(id!, sessionNumber),
    onSuccess: (data) => navigate(`/checkin/${data.checkInId}`),
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Could not start a correction session. Please try again.'),
  })

  /**
   * The caller's OWN sessions, so the page can offer them their own record.
   *
   * `/my-checkin-status` resolves the participant from the caller's user id, so
   * this cannot be pointed at another party - which is why it is safe to run on
   * a page both parties open. It is also the only way to get the check-in ids
   * needed for the download below; the shared report itself does not carry them,
   * and it should not.
   */
  const { data: myStatus } = useQuery({
    queryKey: ['my-checkin-status', id],
    queryFn: () => groundsApi.getMyCheckinStatus(id!),
    enabled: !!id,
    retry: false,
  })

  /**
   * "This record is yours. It is portable and permanent" - which the panel below
   * has said all along, with no way to take it anywhere. The endpoint existed
   * and nothing called it. Owner-only, enforced server-side.
   */
  const downloadRecord = useMutation({
    mutationFn: (checkInId: string) => conversationApi.download(checkInId),
    onError: () => toast.error('Could not download that record. Please try again.'),
  })

  const PAGE_STYLE: React.CSSProperties = {
    minHeight: '100vh',
    background: '#EDECEA',
    color: '#1A1916',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    lineHeight: 1.55,
    WebkitFontSmoothing: 'antialiased',
  }

  if (gl || rl) {
    return (
      <div style={{ ...PAGE_STYLE, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: 13, color: '#9B9590' }}>Loading report…</div>
      </div>
    )
  }

  if (!ground) {
    return (
      <div style={{ ...PAGE_STYLE, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <div style={{ fontSize: 13, color: '#6B6560' }}>Report not found.</div>
        <button onClick={() => navigate(-1)} style={{ fontSize: 12, color: '#0C447C', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Go back</button>
      </div>
    )
  }

  if (!report || (!(report as any).sharedPicture && !(report as any).forming)) {
    return (
      <div style={{ ...PAGE_STYLE, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        {/*
          IT SAID "once at least one person has checked in" TO SOMEBODY WHO HAD.
          This is the SHARED report, which needs every party in before it can show
          where accounts agree or differ - so the old sentence was measuring the
          wrong thing, and on a ground where session 1 was complete it read as the
          product having lost the check-in.
        */}
        <div style={{ fontSize: 13, color: '#9B9590', maxWidth: 380, textAlign: 'center', lineHeight: 1.6 }}>
          The shared report appears once everybody has checked in. Your own record is on
          your ground page in the meantime.
        </div>
        <button onClick={() => navigate(-1)} style={{ fontSize: 12, color: '#0C447C', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Go back</button>
      </div>
    )
  }

  const isForming = !report.releasedAt

  const staleBanner = reportIsStale ? (
    <div role="status" aria-live="polite" style={{ fontSize: 12.5, color: '#5A4A1A', background: '#FDF3E3', border: '1px solid #F5D9A0', borderRadius: 8, padding: '9px 12px', marginBottom: 14, lineHeight: 1.5 }}>
      Someone has checked in since this was written, so it is being updated now. What you are reading is the previous version. It will refresh on its own.
    </div>
  ) : null
  const progress = (report as any).sessionProgress as
    | { sessionNumber: number; total: number; completed: number; requestingUserIsMissing: boolean }
    | null
    | undefined

  const myParticipant = (ground.participants ?? []).find((p: any) => p.userId === user?.id)
  const isAdmin = myParticipant?.partyType === 'INITIATOR'
  // The participant's own latest COMPLETED session - the one self-correction targets.
  const myCompletedSessions = (((myParticipant as any)?.checkIns ?? []) as any[])
    .filter((c) => c.status === 'COMPLETED')
    .map((c) => c.sessionNumber as number)
  const myLatestCompletedSession = myCompletedSessions.length ? Math.max(...myCompletedSessions) : null
  const backUrl = isAdmin ? `/grounds/${id}` : `/grounds/${id}/p`

  const adminParty = (ground.participants ?? []).find((p: any) => p.partyType === 'INITIATOR')
  const partParty = (ground.participants ?? []).find((p: any) => p.partyType !== 'INITIATOR')
  // Real name if given, else roleAsDescribed, else a neutral descriptor -
  // never the bare role word ("Admin"/"Participant") and never a raw email
  // local-part, both of which read as a label rather than a person.
  const adminHandle = adminParty ? participantLabel(adminParty) : 'the initiator'
  const partHandle = partParty ? participantLabel(partParty) : 'the other party'

  const agreements = report.agreements ?? []
  const divergences = report.divergences ?? []
  const contributedParties = ((report.engagement ?? {}) as any).parties?.filter((p: any) => p.contributed).length ?? 2
  // Null when the report names nothing, and the header renders nothing in that
  // case rather than a reassuring placeholder.
  const read = agreements.length + divergences.length > 0
    ? { agreed: agreements.length, open: divergences.length }
    : null
  const statusLabel = alignmentLabel(read)
  const statusShort = alignmentShort(read)

  const eng = (report.engagement ?? {}) as any
  const areas: any[] = eng.areas ?? []
  const hasAreas = areas.length > 0

  const honestClose = eng.honestClose ?? {
    aligned: agreements.length > 0 ? agreements.slice(0, 2).join('. ') : undefined,
    open: divergences.length > 0 ? divergences.map((d: any) => d.topic).join('. ') : undefined,
    revisit: report.centralQuestion || undefined,
    risk: undefined,
  }

  const solo = report.soloArtifact
  const releasedDate = report.releasedAt
    ? new Date(report.releasedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null

  /**
   * Agreement is two-sided. If only one party has an account on record, the
   * report can say what that account holds but cannot call any of it agreed -
   * there is nothing yet for it to agree WITH. The old ladder handled this by
   * capping the bar at "Clear", which still read as four-fifths of the way to
   * aligned. Saying it in words is the honest version.
   */
  const oneSided = contributedParties < 2

  const sessionPhrase = !statusLabel
    ? 'Nothing to report on yet.'
    : oneSided
      ? 'One person has checked in so far. The second is what makes it a comparison.'
      : divergences.length === 0
        ? 'You see this the same way.'
        : 'Where you see it differently is below, most important first.'

  return (
    <div style={PAGE_STYLE}>
      {staleBanner && <div style={{ maxWidth: 1040, margin: '0 auto', padding: '14px 20px 0' }}>{staleBanner}</div>}

      {/* HEADER */}
      <header style={{ background: '#0A1628', color: '#fff', padding: '40px 0 34px' }}>
        <div style={{ maxWidth: 1040, margin: '0 auto', padding: '0 20px' }}>
          <button
            onClick={() => navigate(backUrl)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,.55)', fontSize: 13, fontFamily: 'inherit', padding: 0, marginBottom: 22, display: 'block' }}
          >
            ← Back
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={{ background: 'white', borderRadius: 4, padding: '3px 4px', display: 'inline-flex' }}><VennIcon size={24} /></span>
            {/*
              THE HEADER SAID "Shared report" WHILE YOU WERE READING YOUR OWN.
              The toggle below switches the body between two genuinely different
              documents, and the eyebrow, the headline and the summary above it
              never changed - so the page insisted it was the shared report on both
              settings. Hafsah: "i dont know if its our shared report or my report".
              Whichever one is on screen now says so, in all three places.
            */}
            <span style={{ fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: '#5DCAA5', fontWeight: 700 }}>
              {tab === 'own' ? 'Your report, private to you' : 'Shared report'}
            </span>
          </div>
          <h1 style={{ fontSize: 30, lineHeight: 1.1, letterSpacing: '-.02em', margin: '0 0 12px', fontWeight: 800 }}>
            {tab === 'own' ? 'What your own account holds.' : "Where everyone's accounts agree or differ."}
          </h1>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,.72)', maxWidth: 640, margin: 0 }}>
            {tab === 'own'
              ? 'Only you can see this. It is built from what you said, and nobody else reads your words.'
              : report.sharedPicture}
          </p>
          <div style={{ marginTop: 20, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {[
              ground.label,
              adminHandle,
              partParty ? partHandle : null,
              releasedDate ? `Released ${releasedDate}` : 'Still forming',
            ].filter(Boolean).map(pill => (
              <span key={pill as string} style={{ fontSize: 12, background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.16)', borderRadius: 20, padding: '5px 12px', color: 'rgba(255,255,255,.9)' }}>
                {pill}
              </span>
            ))}
          </div>

          {/* OWN / SHARED TOGGLE - always visible so it's clear these are two
              distinct reports, not one merged document. */}
          {solo && (
            <div style={{ marginTop: 24, display: 'inline-flex', background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.16)', borderRadius: 10, padding: 3, gap: 2 }}>
              {(['shared', 'own'] as ViewTab[]).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  style={{
                    fontSize: 13, fontWeight: 700, padding: '7px 16px', borderRadius: 7, border: 'none', cursor: 'pointer',
                    background: tab === t ? '#fff' : 'transparent',
                    color: tab === t ? '#0A1628' : 'rgba(255,255,255,.75)',
                  }}
                >
                  {t === 'shared' ? 'Shared report' : 'Your report'}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* FORMING BANNER - the picture updates as people check in; this isn't
          the final, mutually-revealed report yet. */}
      {isForming && progress && (
        <div style={{ background: '#FDF3E3', borderBottom: '1px solid #F0DDB0' }}>
          <div style={{ maxWidth: 1040, margin: '0 auto', padding: '12px 20px', fontSize: 13, color: '#8A5C1A' }}>
            <strong>Picture forming</strong> - {progress.completed} of {progress.total} checked in.
            {progress.requestingUserIsMissing ? ' You haven\'t checked in yet for this round - that\'s part of what\'s still missing.' : ' This updates as more people check in.'}
          </div>
        </div>
      )}

      {/* LEGEND */}
      <section style={{ background: 'white', borderBottom: '1px solid #E2E0DB' }}>
        <div style={{ maxWidth: 1040, margin: '0 auto', padding: '0 20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)' }}>
            {[
              { h: 'What we heard', p: "Every report opens with what runs across everyone's answers, the thing no single person could see on their own." },
              // This used to promise "a recommended move" for every area. The
              // engine has never produced one: a divergence carries a topic,
              // each party's position, the evidence behind it, and what is at
              // stake if it holds. Naming those four is honest and is also the
              // more useful claim - the move is the reader's to make.
              { h: 'What matters most, first', p: 'Every gap names each side\'s position, the evidence behind it, and what is at stake if it holds. The most significant comes first.' },
              { h: 'Honest closes', p: 'Decisions rarely finish clean. Each report names what is aligned, what is open, what to revisit, and what risk remains.' },
            ].map((cell, i) => (
              <div key={i} style={{ padding: '18px 22px', borderRight: i < 2 ? '1px solid #E2E0DB' : 'none' }}>
                <div style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: '#9B9590', fontWeight: 700, marginBottom: 7 }}>{cell.h}</div>
                <div style={{ fontSize: 12.5, color: '#6B6560', lineHeight: 1.5 }}>{cell.p}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BODY */}
      <div style={{ maxWidth: 1040, margin: '0 auto', padding: '34px 20px 60px' }}>

        {/* Session header */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', fontWeight: 700, color: '#0C447C' }}>
            {ground.label}
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-.01em', margin: '4px 0 2px' }}>
            {sessionPhrase}
          </div>
          <div style={{ fontSize: 13, color: '#6B6560' }}>{releasedDate ? `Released ${releasedDate}` : 'Still forming - not yet released'}</div>
        </div>

        <ResolutionSection groundId={id!} resolutionState={(ground as any).resolutionState} />

        <OutcomeFeedbackSection
          groundId={id!}
          closed={(ground as any).status === 'RESOLVED' || (ground as any).status === 'CLOSED'}
        />

        {/* Cards - the toggle above picks which one shows; without a solo
            report to toggle to, the shared report is the only thing here. */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 18 }}>

          {/* SHARED / GROUND REPORT CARD */}
          {(!solo || tab === 'shared') && (
          <div style={{ background: 'white', border: '1px solid #E2E0DB', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '13px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0C447C', color: '#fff' }}>
              <span style={{ fontSize: 13, fontWeight: 800 }}>Ground report</span>
              <span style={{ fontSize: 11, opacity: 0.82 }}>for {adminHandle}</span>
            </div>
            <div style={{ padding: '16px 18px 18px' }}>

              <PatternBlock label="What we heard" content={report.sharedPicture} />

              {/* Where things stand. Rendered only when the report holds
                  something - an empty report says nothing here rather than
                  reassuring anyone. */}
              {statusLabel && (
                <div style={{ marginBottom: 16 }}>
                  <SecH>Where things stand</SecH>
                  <div style={{ fontSize: 18, fontWeight: 800 }}>
                    {oneSided ? `${agreements.length + divergences.length} areas on record` : statusLabel}
                  </div>
                  <div style={{ fontSize: 12.5, color: '#6B6560', marginTop: 2, lineHeight: 1.5 }}>
                    {sessionPhrase}
                  </div>
                </div>
              )}

              {/* What's still open */}
              {divergences.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <SecH>What's still open</SecH>
                  {hasAreas
                    ? areas.filter((a: any) => !a.reached).map((area: any, i: number) => (
                        <AreaBlock key={i} title={area.title} observation={area.observation} whyItMatters={area.whyItMatters} recommendedMove={area.recommendedMove} />
                      ))
                    : divergences.map((d: any, i: number) => (
                        // The engine now emits these ranked, most significant
                        // first, so render order is the ranking - no re-sorting
                        // here. `atStake` is what happens to the work if the gap
                        // holds; it is omitted when the record could not support
                        // saying anything, so it is conditional on being present.
                        <AreaBlock
                          key={i}
                          title={d.topic}
                          observation={d.positions.map((p: any) => p.view).join(' ')}
                          whyItMatters={d.atStake}
                        />
                      ))
                  }
                </div>
              )}

              {/* LEADERSHIP GAPS, WHICH NOTHING HAS EVER RENDERED.
                  The synthesis routes findings here deliberately - a deferred
                  conversation, a commitment nobody was held to, work not handed
                  over, a contribution not seen - and its own prompt says the two
                  surfaces are "read on different surfaces for different
                  purposes". Nothing implemented the second surface. The API
                  returned them to every party and this page referenced the field
                  nowhere, so the most sensitive thing the synthesis produces was
                  being handed to five colleagues by an endpoint nobody was
                  reading.

                  The API side is fixed - they reach the lead only now. This is
                  the surface that was missing. Shown to the lead, framed as
                  something about how the work was led rather than a judgement on
                  the person leading it, because that is what the prompt is
                  instructed to produce and the framing has to match or the whole
                  thing reads as an appraisal. */}
              {isAdmin && Array.isArray((report as any).leadershipGaps) && (report as any).leadershipGaps.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <SecH>Worth your attention as the person leading this</SecH>
                  <div style={{ fontSize: 12.5, color: 'var(--gw-sub)', lineHeight: 1.6, marginBottom: 10 }}>
                    Only you see this part. It is about how the work was led, not about anyone in it, and nobody is quoted or named.
                  </div>
                  {(report as any).leadershipGaps.map((g: any, i: number) => (
                    <AreaBlock
                      key={i}
                      title={g.pattern ?? g.title ?? 'A pattern in how this ran'}
                      observation={g.observation ?? g.text ?? ''}
                      whyItMatters={g.atStake ?? g.whyItMatters}
                      recommendedMove={g.recommendedMove}
                    />
                  ))}
                </div>
              )}

              {/* Alignment reached */}
              {agreements.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <SecH>Alignment reached</SecH>
                  {hasAreas
                    ? areas.filter((a: any) => a.reached).map((area: any, i: number) => (
                        <AreaBlock key={i} title={area.title} note={area.note} reached />
                      ))
                    : agreements.map((a: string, i: number) => (
                        <div key={i} style={{ border: '1px solid #E2E0DB', borderRadius: 10, padding: '12px 14px', marginBottom: 10, borderLeft: '3px solid #5DCAA5' }}>
                          <div style={{ fontSize: 12.5, color: '#6B6560' }}>{a}</div>
                        </div>
                      ))
                  }
                </div>
              )}

              <HonestClose aligned={honestClose.aligned} open={honestClose.open} revisit={honestClose.revisit} risk={honestClose.risk} />

              {report.centralQuestion && (
                <div style={{ marginTop: 16, background: '#EEF4FB', borderRadius: 8, padding: '10px 12px' }}>
                  <SecH>What comes next</SecH>
                  <div style={{ fontSize: 13, color: '#1A1916', lineHeight: 1.6 }}>{report.centralQuestion}</div>
                </div>
              )}

              {Array.isArray((report as any).engagement?.hiddenContributors) && (report as any).engagement.hiddenContributors.length > 0 && (
                <HiddenContributorsSection groundId={id!} contributors={(report as any).engagement.hiddenContributors} isInitiator={isAdmin} />
              )}

              {/* CLOSING ROUND: the choice now in front of the parties. Neutral
                  framing - the report never recommends; the resolution step is
                  where the parties choose together. */}
              {(report as any).finalSynthesis?.closingComplete && (
                <div style={{ marginTop: 16, background: '#FFF8EC', border: '1px solid #E4C88A', borderRadius: 8, padding: '12px 14px' }}>
                  <SecH>The ground is closing</SecH>
                  <div style={{ fontSize: 13, color: '#1A1916', lineHeight: 1.6, marginBottom: 8 }}>
                    Every account is in. The choice now in front of you, together:
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                    {((report as any).finalSynthesis.endStates ?? []).map((es: any) => (
                      <span key={es.value} style={{ fontSize: 12, fontWeight: 600, background: 'white', border: '1px solid #E4C88A', color: '#7A4B00', borderRadius: 20, padding: '4px 12px' }}>{es.label}</span>
                    ))}
                  </div>
                  <button onClick={() => navigate(`/grounds/${id}`)} style={{ padding: '9px 16px', borderRadius: 7, background: '#7A4B00', color: 'white', border: 'none', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                    Propose the end state →
                  </button>
                </div>
              )}

              {/* ARC ADVISORY - initiator/org-admin surface only (the server
                  strips arcSignals for participants). A reviewer flag, not a
                  verdict. */}
              {Array.isArray((report as any).arcAdvisories) && (report as any).arcAdvisories.length > 0 && (
                <div style={{ marginTop: 12, background: '#FBF3F3', border: '1px solid #E8C4C4', borderRadius: 8, padding: '12px 14px' }}>
                  <SecH>For your review - record shape</SecH>
                  {((report as any).arcAdvisories as any[]).map(a => (
                    <div key={a.participantId} style={{ marginBottom: 8 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: '#791F1F' }}>{a.email ?? a.participantId}</div>
                      <div style={{ fontSize: 12.5, color: '#5A2A2A', lineHeight: 1.55 }}>{a.note}</div>
                      {(a.features ?? []).map((f: string, i: number) => (
                        <div key={i} style={{ fontSize: 11.5, color: '#7A4B4B', lineHeight: 1.5, marginTop: 2 }}>· {f}</div>
                      ))}
                    </div>
                  ))}
                </div>
              )}

              {/* Visible Updates trail (Honest Corrections): a self-correction
                  session shows up here as a flagged, dated entry instead of
                  being silently blended into the report above. No correction
                  TEXT is shown - only who, when, and whether it happened
                  after that party had already signed off. */}
              {Array.isArray((report as any).updates) && (report as any).updates.length > 0 && (
                <div style={{ marginTop: 12, background: '#F5F3EF', border: '1px solid #E2E0DB', borderRadius: 8, padding: '12px 14px' }}>
                  <SecH>Updates</SecH>
                  {((report as any).updates as any[]).map((u, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, padding: '4px 0' }}>
                      <div style={{ fontSize: 12.5, color: '#1A1916' }}>
                        {u.email ?? 'A party'} updated their account
                        {u.completedAt ? ` on ${new Date(u.completedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}` : ''}
                      </div>
                      {u.isPostSignOff && (
                        <span style={{ fontSize: 10.5, fontWeight: 700, color: '#8A5C1A', background: '#FDF3E3', borderRadius: 6, padding: '2px 8px', flexShrink: 0 }}>
                          Updated after sign-off
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          )}

          {/* PARTICIPANT / OWN REPORT CARD */}
          {solo && tab === 'own' && (
            <div style={{ background: 'white', border: '1px solid #E2E0DB', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ padding: '13px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#085041', color: '#fff' }}>
                {/* "Contributor report" was a third word for a thing the tab
                    above already calls your report and the rest of the product
                    calls a participant. One noun per thing. W8-47. */}
                <span style={{ fontSize: 13, fontWeight: 800 }}>Your report</span>
                <span style={{ fontSize: 11, opacity: 0.82 }}>for {partHandle}</span>
              </div>
              <div style={{ padding: '16px 18px 18px' }}>

                <PatternBlock label="What your contribution reveals" content={solo.summary} dark />

                {solo.whatToCarry && (
                  <div style={{ marginBottom: 16 }}>
                    <SecH>What to carry forward</SecH>
                    <Bullet text={solo.whatToCarry} />
                  </div>
                )}

                {divergences.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <SecH>Questions worth resolving</SecH>
                    {divergences.map((d: any, i: number) => (
                      <Bullet key={i} text={`What would alignment on ${d.topic.toLowerCase()} look like to you?`} />
                    ))}
                  </div>
                )}

                {statusShort && <div style={{ marginBottom: 16 }}>
                  <SecH>Your account, so far</SecH>
                  <div style={{ fontSize: 18, fontWeight: 800 }}>{statusShort}</div>
                  <div style={{ fontSize: 12.5, color: '#6B6560', marginTop: 2, lineHeight: 1.5 }}>
                    {sessionPhrase}
                  </div>
                </div>}

                <div style={{ fontSize: 12, color: '#6B6560', background: '#F4F1EA', border: '1px solid #E5DFD2', borderRadius: 8, padding: '10px 12px', lineHeight: 1.55 }}>
                  This record is yours. It is portable and permanent. You can add this ground to your Groundwork profile.
                  {/* The sentence above claims portability, so give them the file.
                      Completed sessions only - there is nothing settled to take
                      away from a session still in progress. */}
                  {(myStatus?.checkIns ?? []).some(c => c.completedAt) && (
                    <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                      <span style={{ fontSize: 11, color: '#9B9590' }}>Download:</span>
                      {(myStatus?.checkIns ?? [])
                        .filter(c => c.completedAt)
                        .map(c => (
                          <button
                            key={c.id}
                            disabled={downloadRecord.isPending}
                            onClick={() => downloadRecord.mutate(c.id)}
                            style={{ fontSize: 11, fontWeight: 700, color: '#0C447C', background: 'white', border: '1px solid #D6D2CA', borderRadius: 12, padding: '3px 10px', cursor: 'pointer', fontFamily: 'inherit' }}
                            title={`Download your session ${c.sessionNumber} record as a text file`}
                          >
                            Session {c.sessionNumber}
                          </button>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Who is on record + how specific each account was (#33). */}
        {Array.isArray(eng.parties) && eng.parties.length > 0 && (
          <div style={{ marginTop: 32 }}>
            <div style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: '#9B9590', fontWeight: 700, marginBottom: 10 }}>On record</div>
            <div style={{ border: '1px solid #E2E0DB', borderRadius: 10, overflow: 'hidden' }}>
              {eng.parties.map((p: any, i: number) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 14px', borderBottom: i < eng.parties.length - 1 ? '1px solid #EFEDE8' : 'none', background: 'white' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1916' }}>{p.label}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                    <span style={{ fontSize: 11, color: '#9B9590' }}>
                      {!p.contributed
                        ? 'not yet checked in'
                        : p.recordEntries > 0
                        ? `${p.sessions ?? 0} session${(p.sessions ?? 0) !== 1 ? 's' : ''}`
                        : 'checked in, no record'}
                    </span>
                    {p.contributed && p.recordEntries > 0 && p.specificityLabel && (
                      <span title="How concrete they were" style={{ fontSize: 11, fontWeight: 700, borderRadius: 6, padding: '2px 8px',
                        background: p.specificityLabel === 'high' ? '#E7F6EF' : p.specificityLabel === 'moderate' ? '#EEF4FB' : '#FDF3E3',
                        color: p.specificityLabel === 'high' ? '#085041' : p.specificityLabel === 'moderate' ? '#0C447C' : '#8A5C1A' }}>
                        {p.specificityLabel} specificity
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {report.inferences && report.inferences.length > 0 && (
          <InferenceReviewPanel groundId={id!} inferences={report.inferences} />
        )}

        {/* Always-visible correction affordance (#21): the per-claim "Correct this"
            only appears when there are inferred claims, so make correction discoverable. */}
        <div style={{ marginTop: 24, background: '#F7F6F3', border: '1px solid #E2E0DB', borderRadius: 10, padding: '14px 16px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1A1916', marginBottom: 4 }}>Something not right in this report?</div>
          <div style={{ fontSize: 12.5, color: '#6B6560', lineHeight: 1.6, marginBottom: myLatestCompletedSession != null ? 12 : 0 }}>
            {report.inferences && report.inferences.length > 0
              ? 'Inferred claims above have a "Correct this" button that opens a short follow-up to fix that specific claim. '
              : ''}
            {myLatestCompletedSession != null
              ? 'For anything else in your own account, revisit your last session below. It opens a short follow-up that corrects or adds to your record. Your original answers are kept as they were, and the update flows into the next report.'
              : 'To correct something you said, reopen a session you have already finished on this ground.'}
          </div>
          {myLatestCompletedSession != null && (
            <button
              onClick={() => correctSession.mutate(myLatestCompletedSession)}
              disabled={correctSession.isPending}
              style={{ fontSize: 13, fontWeight: 700, color: '#fff', background: '#0C447C', border: 'none', borderRadius: 8, padding: '9px 16px', cursor: correctSession.isPending ? 'wait' : 'pointer', fontFamily: 'inherit' }}
            >
              {correctSession.isPending ? 'Starting…' : 'Revisit my last session to correct it →'}
            </button>
          )}
        </div>

        <div style={{ marginTop: 40, paddingTop: 24, borderTop: '1px solid #E2E0DB', fontSize: 12, color: '#9B9590', lineHeight: 1.6 }}>
          This report is permanent. Everybody in this ground keeps their copy.
        </div>
      </div>
    </div>
  )
}
