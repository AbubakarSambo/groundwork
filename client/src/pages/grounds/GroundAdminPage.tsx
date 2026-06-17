import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { groundsApi } from '@/api/grounds'
import { reportsApi } from '@/api/reports'
import { documentsApi } from '@/api/documents'
import { conversationApi } from '@/api/conversation'
import { billingApi } from '@/api/billing'
import { useAuthStore } from '@/stores/auth'
import { ConfDots } from '@/components/ConfDots'
import { toast } from 'sonner'
import type { Report } from '@/types'

const CONF_DESC: Record<number, string> = {
  1: 'One account only. The other party is needed to build the picture.',
  2: 'Two accounts in. A picture is forming.',
  3: 'Three sessions. A pattern is visible but not yet confirmed.',
  4: 'Four sessions. Evidence is strong. Recommendation is defensible.',
  5: 'Five sessions. Full picture. High confidence.',
}

const SPECIFICITY_LABEL: Record<string, string> = {
  specific: 'Specific',
  directional: 'Directional',
  vague: 'Vague',
  managed: 'Managed',
}

const SPECIFICITY_COLOR: Record<string, { bg: string; color: string }> = {
  specific:    { bg: '#E8F8F5', color: '#085041' },
  directional: { bg: '#EEF4FB', color: '#0C447C' },
  vague:       { bg: '#FDF3E3', color: '#8A5C1A' },
  managed:     { bg: '#FCEBEB', color: '#791F1F' },
}

const DIM_LABEL: Record<string, string> = {
  delivery:   'Delivery',
  evidence:   'Evidence',
  enablement: 'Enablement',
  coverage:   'Coverage',
  commitment: 'Commitment',
}

const RECALL_LABEL: Record<string, string> = {
  certain: 'Certain',
  mostly_certain: 'Mostly certain',
  uncertain: 'Uncertain on key points',
}

const ALIGNMENT_COLOR: Record<string, string> = {
  aligned: 'var(--gw-green-b)',
  close: 'var(--gw-amber-b)',
  diverged: 'var(--gw-red-t)',
  'one account only': 'var(--gw-sub)',
}

interface Msg { id: string; role: 'AI' | 'PERSON'; content: string }

// The one chat interface — shared chat component for inline use.
function InlineChat({
  checkInId,
  groundId,
  sessionNumber,
  groundLabel,
  onDone,
}: {
  checkInId: string
  groundId: string
  sessionNumber: number
  groundLabel: string
  onDone: () => void
}) {
  const qc = useQueryClient()
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [opened, setOpened] = useState(false)
  const [done, setDone] = useState(false)
  const msgsRef = useRef<HTMLDivElement>(null)
  const taRef = useRef<HTMLTextAreaElement>(null)

  const openSession = useMutation({
    mutationFn: () => conversationApi.open(checkInId),
    onSuccess: res => {
      setMsgs([{ id: 'ai-open', role: 'AI', content: res.reply }])
      setOpened(true)
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Could not open session.'),
  })

  const sendMsg = useMutation({
    mutationFn: (message: string) => conversationApi.send(checkInId, message),
    onMutate: message => {
      setLoading(true)
      setMsgs(v => [...v,
        { id: Date.now().toString(), role: 'PERSON', content: message },
        { id: 'loading', role: 'AI', content: '…' },
      ])
    },
    onSuccess: res => {
      setMsgs(v => v.filter(m => m.id !== 'loading').concat({ id: Date.now().toString() + 'r', role: 'AI', content: res.reply }))
      setLoading(false)
      if (res.sessionComplete) setDone(true)
    },
    onError: () => {
      setMsgs(v => v.filter(m => m.id !== 'loading'))
      setLoading(false)
      toast.error('Message failed. Try again.')
    },
  })

  const complete = useMutation({
    mutationFn: () => conversationApi.complete(checkInId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ground'] })
      onDone()
    },
  })

  const uploadDoc = useMutation({
    mutationFn: (file: File) => documentsApi.upload(groundId, file),
    onSuccess: async (doc) => {
      try {
        const res = await conversationApi.documentReceived(checkInId)
        setMsgs(v => [...v, { id: `doc-ai-${doc.id}`, role: 'AI', content: res.reply }])
      } catch {
        setMsgs(v => [...v, { id: `doc-${doc.id}`, role: 'AI', content: `Document received: "${doc.name}". Tell me what it shows.` }])
      }
    },
    onError: () => toast.error('Upload failed.'),
  })

  useEffect(() => {
    conversationApi.transcript(checkInId).then(({ checkIn, turns }) => {
      if (turns.length > 0) {
        setMsgs(turns.map(t => ({ id: t.id, role: t.role, content: t.content })))
        setOpened(true)
        if (checkIn.status === 'COMPLETED') setDone(true)
      } else {
        openSession.mutate()
      }
    }).catch(() => openSession.mutate())
  }, [checkInId])

  useEffect(() => {
    if (msgsRef.current) msgsRef.current.scrollTop = msgsRef.current.scrollHeight
  }, [msgs])

  function send() {
    const content = input.trim()
    if (!content || loading || done || !opened) return
    setInput('')
    if (taRef.current) taRef.current.style.height = '38px'
    sendMsg.mutate(content)
  }

  function autoResize(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value)
    e.target.style.height = '38px'
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div style={{ padding: '8px 14px', borderBottom: '0.5px solid var(--gw-border)', fontSize: 11, color: 'var(--gw-muted)', background: 'white', flexShrink: 0 }}>
        Session {sessionNumber} · {groundLabel} · Your words are private.
      </div>
      <div ref={msgsRef} className="gw-chat-msgs" style={{ flex: 1 }}>
        {openSession.isPending && (
          <div style={{ fontSize: 13, color: 'var(--gw-muted)', textAlign: 'center', padding: 16 }}>Opening session…</div>
        )}
        {msgs.map((m, i) => (
          <div key={m.id} className={`gw-msg ${m.id === 'loading' ? 'gw-msg-loading' : m.role === 'PERSON' ? 'gw-msg-user' : 'gw-msg-ai'} ${i === msgs.length - 1 ? 'gw-msg-active' : 'gw-msg-back'}`}>
            {m.content}
          </div>
        ))}
        {done && (
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <button
              onClick={() => complete.mutate()}
              disabled={complete.isPending}
              style={{ padding: '10px 20px', borderRadius: 8, background: 'var(--gw-navy)', color: 'white', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              {complete.isPending ? 'Saving…' : 'Complete session'}
            </button>
          </div>
        )}
      </div>
      <div style={{ borderTop: '0.5px solid var(--gw-border)', background: 'white', flexShrink: 0 }}>
        <div className="gw-chat-bar">
          <label
            htmlFor="ga-doc-upload-inline"
            title="Upload a document"
            style={{ padding: '0 10px', borderRadius: 6, background: 'var(--gw-bg)', color: 'var(--gw-sub)', border: '0.5px solid var(--gw-border)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, flexShrink: 0, height: 38 }}
          >
            + <span style={{ fontSize: 11 }}>Doc</span>
          </label>
          <input type="file" id="ga-doc-upload-inline" accept=".pdf,.doc,.docx,.txt,.csv,.xlsx,.png,.jpg,.jpeg" style={{ display: 'none' }}
            onChange={e => { const f = e.target.files?.[0]; if (f) uploadDoc.mutate(f); e.currentTarget.value = '' }} />
          <textarea
            ref={taRef}
            placeholder="Share what you have been working on."
            value={input}
            onChange={autoResize}
            onKeyDown={handleKeyDown}
            disabled={loading || done || !opened}
            className="gw-chat-ta"
            style={{ background: opened && !loading ? 'white' : 'var(--gw-bg)', maxHeight: 120 }}
          />
          <button onClick={send} disabled={loading || done || !opened} className="gw-send-btn" style={{ height: 38 }}>
            &#8593;
          </button>
        </div>
      </div>
    </div>
  )
}

// Pre-session screen: shown when a NOT_STARTED check-in exists.
// Shows session number, ground name, privacy reminder, start button.
function PreSessionReady({
  sessionNumber,
  groundLabel,
  onStart,
}: {
  sessionNumber: number
  groundLabel: string
  onStart: () => void
}) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '28px 20px', gap: 0, textAlign: 'center' }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gw-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>
        Session {sessionNumber}
      </div>
      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--gw-navy)', marginBottom: 6, lineHeight: 1.3 }}>
        {groundLabel}
      </div>
      <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.65, marginBottom: 24, maxWidth: 220 }}>
        Your words are private. The other party will not see what you write until you both activate the report.
      </div>
      <button
        onClick={onStart}
        style={{ padding: '11px 28px', borderRadius: 8, background: 'var(--gw-navy)', color: 'white', fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
      >
        Start session {sessionNumber}
      </button>
    </div>
  )
}

// Shown when no session is currently open or scheduled.
function PreSessionWaiting({ nextSession }: { nextSession: number }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, gap: 10, textAlign: 'center' }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gw-text)' }}>
        Session {nextSession} is not open yet
      </div>
      <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.65, maxWidth: 220 }}>
        Sessions open on cadence once the previous pair completes.
      </div>
    </div>
  )
}

// Participant row with specificity and recall from their most recent completed check-in.
function ParticipantRow({
  participant,
  index,
  checkIns,
  overdueCutoff,
  onRemind,
}: {
  participant: any
  index: number
  checkIns: any[]
  overdueCutoff: Date
  onRemind: (checkInId: string) => void
}) {
  const myCheckIns = checkIns.filter((c: any) => c.participantId === participant.id)
  const openCheckIn = myCheckIns.find((c: any) => c.status !== 'COMPLETED')
  const lastCompleted = myCheckIns
    .filter((c: any) => c.status === 'COMPLETED')
    .sort((a: any, b: any) => b.sessionNumber - a.sessionNumber)[0]

  const status = openCheckIn?.status ?? (myCheckIns.length > 0 ? 'COMPLETED' : 'NOT_STARTED')
  const isOverdue = status === 'NOT_STARTED' && openCheckIn && new Date(openCheckIn.createdAt) < overdueCutoff

  const statusWord = status === 'COMPLETED' ? 'submitted'
    : isOverdue ? 'overdue'
    : 'pending'
  const statusColor = statusWord === 'submitted' ? 'var(--gw-green-b)'
    : statusWord === 'overdue' ? 'var(--gw-amber-b)'
    : 'var(--gw-border)'

  const handle = participant.email ? participant.email.split('@')[0] : 'Party'
  const initial = (participant.email || '?').charAt(0).toUpperCase()

  return (
    <div style={{ background: 'white', border: '0.5px solid var(--gw-border)', borderRadius: 8, padding: '11px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: lastCompleted ? 8 : 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: statusColor, flexShrink: 0 }} />
          <div className={`gw-av gw-av-${index % 6}`}>{initial}</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gw-text)' }}>{handle}</div>
            <div style={{ fontSize: 11, color: 'var(--gw-muted)' }}>
              {participant.partyType === 'INITIATOR' ? 'Initiator' : 'Participant'} · {statusWord}
            </div>
          </div>
        </div>
        {openCheckIn && statusWord !== 'submitted' && (
          <button
            onClick={() => onRemind(openCheckIn.id)}
            style={{ fontSize: 11, color: 'var(--gw-navy)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            Remind
          </button>
        )}
      </div>
      {lastCompleted && (
        <div style={{ paddingTop: 8, borderTop: '0.5px solid var(--gw-border)', display: 'flex', flexDirection: 'column', gap: 5 }}>
          {lastCompleted.specificityDimensions ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {Object.entries(DIM_LABEL).map(([key, label]) => {
                const level = lastCompleted.specificityDimensions?.[key]
                if (!level) return null
                const c = SPECIFICITY_COLOR[level] ?? { bg: 'var(--gw-bg)', color: 'var(--gw-text)' }
                return (
                  <span
                    key={key}
                    title={label}
                    style={{ fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 20, background: c.bg, color: c.color }}
                  >
                    {label[0]}: {SPECIFICITY_LABEL[level] ?? level}
                  </span>
                )
              })}
            </div>
          ) : lastCompleted.specificityLevel ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 10, color: 'var(--gw-muted)', minWidth: 60 }}>Specificity</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--gw-text)', padding: '1px 7px', borderRadius: 20, background: 'var(--gw-bg)', border: '0.5px solid var(--gw-border)' }}>
                {SPECIFICITY_LABEL[lastCompleted.specificityLevel] ?? lastCompleted.specificityLevel}
              </span>
            </div>
          ) : null}
          {lastCompleted.recallConfidence && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 10, color: 'var(--gw-muted)', minWidth: 60 }}>Recall</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--gw-text)', padding: '1px 7px', borderRadius: 20, background: 'var(--gw-bg)', border: '0.5px solid var(--gw-border)' }}>
                {RECALL_LABEL[lastCompleted.recallConfidence] ?? lastCompleted.recallConfidence}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Alignment map derived from the most recent report.
// Divergences show as "diverged", agreements summarised, one account only if applicable.
function AlignmentMap({
  report,
  participants,
  checkIns,
}: {
  report?: Report | null
  participants: any[]
  checkIns: any[]
}) {
  const bothSubmitted = participants.length >= 2 &&
    participants.every(p => checkIns.some((c: any) => c.participantId === p.id && c.status === 'COMPLETED'))

  if (!bothSubmitted) {
    return (
      <div style={{ background: 'white', border: '0.5px solid var(--gw-border)', borderRadius: 8, padding: '12px 14px' }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gw-muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6 }}>Alignment map</div>
        <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.6 }}>
          Available once both parties have submitted their first session.
        </div>
      </div>
    )
  }

  if (!report?.releasedAt) {
    return (
      <div style={{ background: 'white', border: '0.5px solid var(--gw-border)', borderRadius: 8, padding: '12px 14px' }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gw-muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6 }}>Alignment map</div>
        <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.6 }}>
          Visible after the report is activated.
        </div>
      </div>
    )
  }

  const divergences = report.divergences ?? []
  const agreements = report.agreements ?? []

  return (
    <div style={{ background: 'white', border: '0.5px solid var(--gw-border)', borderRadius: 8, padding: '12px 14px' }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gw-muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 10 }}>Alignment map</div>

      {agreements.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: ALIGNMENT_COLOR['aligned'], flexShrink: 0 }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--gw-text)' }}>Aligned</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {agreements.map((a, i) => (
              <div key={i} style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.6, paddingLeft: 15 }}>
                {a}
              </div>
            ))}
          </div>
        </div>
      )}

      {divergences.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {divergences.map((d, i) => {
            // Derive plain 1-2 sentence description from positions. No quotes.
            const desc = d.positions.map(p => p.view).join(' ')
            return (
              <div key={i}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: ALIGNMENT_COLOR['diverged'], flexShrink: 0 }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--gw-text)' }}>{d.topic}</span>
                  <span style={{ fontSize: 10, color: ALIGNMENT_COLOR['diverged'], fontWeight: 600 }}>Diverged</span>
                </div>
                {desc && (
                  <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.6, paddingLeft: 15 }}>
                    {desc}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {agreements.length === 0 && divergences.length === 0 && (
        <div style={{ fontSize: 12, color: 'var(--gw-muted)' }}>No pattern data yet.</div>
      )}
    </div>
  )
}

// Right panel: chronological session periods, each with date range, parties, report status.
// Tapping a period expands the report inline.
function SessionHistory({
  ground,
  report,
  paywallActive,
  onRelease,
  releasing,
}: {
  ground: any
  report?: Report | null
  paywallActive: boolean
  onRelease: () => void
  releasing: boolean
}) {
  const [openSession, setOpenSession] = useState<number | null>(null)

  const checkIns: any[] = ground.checkIns ?? []
  const participants: any[] = ground.participants ?? []

  // Group check-ins by sessionNumber.
  const sessionNumbers = [...new Set(checkIns.map((c: any) => c.sessionNumber as number))].sort((a, b) => a - b)

  function fmtDate(d: string | Date | null | undefined) {
    if (!d) return ''
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--gw-muted)', marginBottom: 2 }}>Session history</div>

      {sessionNumbers.length === 0 && (
        <div style={{ fontSize: 12, color: 'var(--gw-muted)', textAlign: 'center', padding: '16px 0' }}>No sessions yet.</div>
      )}

      {sessionNumbers.map(sNum => {
        const group = checkIns.filter((c: any) => c.sessionNumber === sNum)
        const completed = group.filter((c: any) => c.status === 'COMPLETED')
        const earliest = group.reduce((a: any, b: any) => new Date(a.createdAt) < new Date(b.createdAt) ? a : b, group[0])
        const latest = completed.length > 0
          ? completed.reduce((a: any, b: any) => new Date(a.completedAt ?? 0) > new Date(b.completedAt ?? 0) ? a : b, completed[0])
          : null

        const startDate = fmtDate(earliest?.createdAt)
        const endDate = latest ? fmtDate(latest.completedAt) : null
        const dateRange = endDate ? `${startDate} to ${endDate}` : startDate

        // Which parties submitted this session
        const submittedIds = new Set(completed.map((c: any) => c.participantId))
        const submittedParties = participants.filter((p: any) => submittedIds.has(p.id))
        const allSubmitted = submittedParties.length === participants.length && participants.length > 0

        // Report status for this session
        let reportStatus: string
        let reportStatusColor: string
        if (paywallActive && sNum === 5) {
          reportStatus = 'billing required'
          reportStatusColor = 'var(--gw-amber-t)'
        } else if (!allSubmitted) {
          reportStatus = 'awaiting parties'
          reportStatusColor = 'var(--gw-muted)'
        } else if (!report) {
          reportStatus = 'generating'
          reportStatusColor = 'var(--gw-sub)'
        } else if (!report.releasedAt) {
          reportStatus = 'ready to activate'
          reportStatusColor = 'var(--gw-green-t)'
        } else {
          reportStatus = 'activated'
          reportStatusColor = 'var(--gw-navy)'
        }

        const isOpen = openSession === sNum
        const canExpand = !!report?.releasedAt && allSubmitted && !paywallActive

        return (
          <div key={sNum} style={{ background: 'white', border: `0.5px solid ${isOpen ? 'var(--gw-blue-b)' : 'var(--gw-border)'}`, borderRadius: 8, overflow: 'hidden' }}>
            <div
              onClick={() => canExpand && setOpenSession(isOpen ? null : sNum)}
              style={{ padding: '11px 14px', cursor: canExpand ? 'pointer' : 'default', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--gw-navy)' }}>Session {sNum}</span>
                  <span style={{ fontSize: 10, fontWeight: 600, color: reportStatusColor }}>{reportStatus}</span>
                  {canExpand && <span style={{ fontSize: 10, color: 'var(--gw-sub)', marginLeft: 'auto' }}>{isOpen ? '▲' : '▼'}</span>}
                </div>
                {dateRange && (
                  <div style={{ fontSize: 11, color: 'var(--gw-muted)', marginBottom: 4 }}>{dateRange}</div>
                )}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {participants.map((p: any) => {
                    const submitted = submittedIds.has(p.id)
                    const handle = p.email ? p.email.split('@')[0] : 'Party'
                    return (
                      <span
                        key={p.id}
                        style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, background: submitted ? 'var(--gw-green-bg)' : 'var(--gw-bg)', color: submitted ? 'var(--gw-green-t)' : 'var(--gw-muted)', border: `0.5px solid ${submitted ? 'var(--gw-green-b)' : 'var(--gw-border)'}`, fontWeight: submitted ? 600 : 400 }}
                      >
                        {handle} {submitted ? '✓' : '·'}
                      </span>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Activate button for ready reports */}
            {!report?.releasedAt && report && allSubmitted && !paywallActive && (
              <div style={{ padding: '0 14px 12px' }}>
                <button
                  onClick={onRelease}
                  disabled={releasing}
                  style={{ width: '100%', padding: '8px 0', borderRadius: 6, background: 'var(--gw-navy)', color: 'white', fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  {releasing ? 'Activating…' : 'Activate report'}
                </button>
              </div>
            )}

            {/* Paywall notice */}
            {paywallActive && sNum === 5 && (
              <div style={{ padding: '0 14px 12px' }}>
                <div style={{ fontSize: 11, color: 'var(--gw-amber-t)', background: 'var(--gw-amber-bg)', border: '0.5px solid var(--gw-amber-b)', borderRadius: 6, padding: '8px 10px', lineHeight: 1.55 }}>
                  Activate billing to unlock the session 5 report and continue.
                </div>
              </div>
            )}

            {/* Inline report */}
            {isOpen && report?.releasedAt && (
              <div style={{ borderTop: '0.5px solid var(--gw-border)', padding: '14px 14px', background: 'var(--gw-bg)' }}>
                {/* Completion status */}
                <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                  {participants.map((p: any) => {
                    const submitted = submittedIds.has(p.id)
                    const handle = p.email ? p.email.split('@')[0] : 'Party'
                    return (
                      <span key={p.id} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: submitted ? 'var(--gw-green-bg)' : 'var(--gw-bg)', color: submitted ? 'var(--gw-green-t)' : 'var(--gw-muted)', border: `0.5px solid ${submitted ? 'var(--gw-green-b)' : 'var(--gw-border)'}`, fontWeight: 600 }}>
                        {handle} {submitted ? 'submitted' : 'pending'}
                      </span>
                    )
                  })}
                </div>

                {/* Shared picture */}
                <div style={{ background: 'var(--gw-navy)', color: 'white', borderRadius: 8, padding: '12px 14px', marginBottom: 12 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,.55)', marginBottom: 6 }}>Synthesis</div>
                  <div style={{ fontSize: 12, lineHeight: 1.65 }}>{report.sharedPicture}</div>
                </div>

                {/* What session N+1 will focus on */}
                {report.centralQuestion && (
                  <div style={{ background: 'white', border: '0.5px solid var(--gw-border)', borderRadius: 8, padding: '10px 12px', marginBottom: 10 }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--gw-muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>What session {sNum + 1} will focus on</div>
                    <div style={{ fontSize: 12, color: 'var(--gw-text)', lineHeight: 1.6 }}>{report.centralQuestion}</div>
                    {(() => {
                      const s2f = (report.engagement as any)?.session2Focus as string[] | undefined
                      if (!s2f?.length) return null
                      return (
                        <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 3 }}>
                          {s2f.map((f, i) => (
                            <div key={i} style={{ fontSize: 11, color: 'var(--gw-sub)', paddingLeft: 8, borderLeft: '2px solid var(--gw-border)' }}>{f}</div>
                          ))}
                        </div>
                      )
                    })()}
                  </div>
                )}

                {/* Agreements */}
                {(report.agreements ?? []).length > 0 && (
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gw-sub)', marginBottom: 6 }}>Agreements</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {report.agreements.map((a, i) => (
                        <div key={i} style={{ fontSize: 12, color: 'var(--gw-text)', lineHeight: 1.6, background: 'var(--gw-green-bg)', borderRadius: 5, padding: '6px 10px' }}>
                          {a}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Named gaps */}
                {(report.divergences ?? []).length > 0 && (
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gw-sub)', marginBottom: 6 }}>Named gaps</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {report.divergences.map((d, i) => (
                        <div key={i} style={{ background: 'white', border: '0.5px solid var(--gw-border)', borderRadius: 5, padding: '8px 10px' }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--gw-text)', marginBottom: 3 }}>{d.topic}</div>
                          <div style={{ fontSize: 11, color: 'var(--gw-sub)', lineHeight: 1.55 }}>
                            {d.positions.map(p => p.view).join(' ')}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Document status */}
                {(() => {
                  const ds = (report.engagement as any)?.docStatus
                  if (!ds) return null
                  return (
                    <div style={{ background: 'white', border: '0.5px solid var(--gw-border)', borderRadius: 5, padding: '8px 10px', marginBottom: 10 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gw-muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 5 }}>Documents</div>
                      <div style={{ fontSize: 12, color: 'var(--gw-text)', lineHeight: 1.6 }}>
                        {ds.total === 0 ? 'No documents attached.' : `${ds.total} document${ds.total !== 1 ? 's' : ''} attached.`}
                        {ds.withAnnotations > 0 && ` ${ds.withAnnotations} annotated.`}
                      </div>
                      {(ds.discrepancyFlags ?? []).length > 0 && (
                        <div style={{ marginTop: 5 }}>
                          {(ds.discrepancyFlags as string[]).map((flag, i) => (
                            <div key={i} style={{ fontSize: 11, color: 'var(--gw-amber-t)', background: 'var(--gw-amber-bg)', borderRadius: 4, padding: '4px 8px', marginBottom: 3 }}>{flag}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })()}

                {/* Specificity notes */}
                {(() => {
                  const sn = (report.engagement as any)?.specificityNotes as any[] | undefined
                  if (!sn?.length) return null
                  return (
                    <div style={{ background: 'white', border: '0.5px solid var(--gw-border)', borderRadius: 5, padding: '8px 10px', marginBottom: 10 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gw-muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 5 }}>Specificity notes</div>
                      {sn.map((pn: any, i: number) => (
                        <div key={i} style={{ marginBottom: i < sn.length - 1 ? 8 : 0 }}>
                          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gw-text)', marginBottom: 3 }}>{pn.label}</div>
                          {(pn.dimensions ?? []).map((d: any, j: number) => (
                            <div key={j} style={{ fontSize: 11, color: 'var(--gw-sub)', lineHeight: 1.5 }}>{d.note}</div>
                          ))}
                        </div>
                      ))}
                    </div>
                  )
                })()}

                {/* Recall confidence */}
                {(() => {
                  const rn = (report.engagement as any)?.recallNotes as any[] | undefined
                  if (!rn?.length) return null
                  return (
                    <div style={{ background: 'white', border: '0.5px solid var(--gw-border)', borderRadius: 5, padding: '8px 10px', marginBottom: 10 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gw-muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 5 }}>Recall confidence</div>
                      {rn.map((r: any, i: number) => (
                        <div key={i} style={{ fontSize: 11, color: 'var(--gw-sub)', lineHeight: 1.5 }}>{r.note}</div>
                      ))}
                    </div>
                  )
                })()}
              </div>
            )}
          </div>
        )
      })}

      {/* Confidence summary */}
      {ground.confidence && (
        <div style={{ background: 'white', border: '0.5px solid var(--gw-border)', borderRadius: 8, padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <ConfDots score={ground.confidence} large />
            <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--gw-navy)' }}>{ground.confidence}/5</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--gw-sub)', lineHeight: 1.55 }}>{CONF_DESC[ground.confidence] ?? ''}</div>
        </div>
      )}
    </div>
  )
}

type MobilePanel = 'left' | 'center' | 'right'

export function GroundAdminPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isSetup = searchParams.get('setup') === '1'
  const qc = useQueryClient()
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>('center')
  const [ctxNote, setCtxNote] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteUrl, setInviteUrl] = useState('')
  const [inviteSent, setInviteSent] = useState(false)
  const [showDocs, setShowDocs] = useState(false)
  // Controls transition from PreSession to InlineChat for NOT_STARTED sessions.
  const [sessionStarted, setSessionStarted] = useState(false)
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

  const { data: billingStatus } = useQuery({
    queryKey: ['billing'],
    queryFn: billingApi.status,
  })

  const { data: docs = [] } = useQuery({
    queryKey: ['docs', id],
    queryFn: () => documentsApi.list(id!),
    enabled: !!id,
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

  const addParticipant = useMutation({
    mutationFn: (email: string) => groundsApi.addParticipant(id!, { email }),
    onSuccess: async (participant: any) => {
      setInviteSent(true)
      qc.invalidateQueries({ queryKey: ['ground', id] })
      try {
        const res = await groundsApi.getParticipantInviteUrl(id!, participant.id)
        setInviteUrl(res.inviteUrl)
      } catch {}
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message
      toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Could not send invite.'))
    },
  })

  const releaseReport = useMutation({
    mutationFn: () => reportsApi.release(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['report', id] })
      toast.success('Report activated')
    },
    onError: () => toast.error('Could not activate report.'),
  })

  if (isLoading) return <Shell><div style={{ padding: 24, fontSize: 13, color: 'var(--gw-muted)' }}>Loading…</div></Shell>
  if (!ground) return <Shell><div style={{ padding: 24, fontSize: 13, color: 'var(--gw-muted)' }}>Ground not found.</div></Shell>

  const conf = ground.confidence ?? 1
  const myParticipant = (ground.participants ?? []).find((p: any) => p.userId === user?.id)

  if (myParticipant && myParticipant.partyType !== 'INITIATOR') {
    navigate(`/grounds/${id}/p`, { replace: true })
    return null
  }

  const myOpenCheckIn = myParticipant
    ? (ground.checkIns ?? []).find((ci: any) => ci.participantId === myParticipant.id && ci.status !== 'COMPLETED')
    : null
  const myLastSession = myParticipant
    ? Math.max(0, ...(ground.checkIns ?? []).filter((ci: any) => ci.participantId === myParticipant.id).map((ci: any) => ci.sessionNumber))
    : 0

  const activeParties = (ground.participants ?? []).filter((p: any) => p.userId)
  const session5Completions = (ground.checkIns ?? []).filter((ci: any) => ci.sessionNumber === 5 && ci.status === 'COMPLETED')
  const paywallActive = activeParties.length >= 2 && session5Completions.length >= activeParties.length && !billingStatus?.careFeeActive

  const showInviteSection = isSetup || ground.participants.filter((p: any) => p.partyType === 'PARTICIPANT').length === 0

  // 3-day overdue threshold (matches the RemindService threshold)
  const overdueCutoff = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)

  // Left panel determines what to render.
  const showInlineChat = sessionStarted || myOpenCheckIn?.status === 'IN_PROGRESS'
  const showPreSessionReady = !showInlineChat && myOpenCheckIn?.status === 'NOT_STARTED'
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--gw-bg)', minHeight: 0, overflow: 'hidden' }}>
      {/* Sticky header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'var(--gw-bg)', borderBottom: '0.5px solid var(--gw-border)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ground.label}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
                <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 20, background: 'var(--gw-blue-bg)', color: 'var(--gw-navy)', flexShrink: 0 }}>{ground.moment}</span>
                {ground.status === 'ACTIVE' && <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--gw-green-b)', display: 'inline-block', flexShrink: 0 }} />}
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <ConfDots score={conf} />
            <div style={{ fontSize: 10, color: 'var(--gw-sub)', marginTop: 1 }}>{conf}/5</div>
          </div>
        </div>
      </div>

      {/* Three panels */}
      <div className="gw-three-col">

        {/* LEFT: Check-in session */}
        <div className={`gw-panel gw-panel-left${mobilePanel !== 'left' ? ' gw-panel-hide' : ''}`}>
          {showInlineChat && myOpenCheckIn ? (
            <InlineChat
              checkInId={myOpenCheckIn.id}
              groundId={id!}
              sessionNumber={myOpenCheckIn.sessionNumber}
              groundLabel={ground.label}
              onDone={() => { setSessionStarted(false); setMobilePanel('center') }}
            />
          ) : showPreSessionReady && myOpenCheckIn ? (
            <PreSessionReady
              sessionNumber={myOpenCheckIn.sessionNumber}
              groundLabel={ground.label}
              onStart={() => setSessionStarted(true)}
            />
          ) : (
            <PreSessionWaiting nextSession={myLastSession + 1} />
          )}
        </div>

        {/* CENTER: Participants, confidence, alignment map */}
        <div className={`gw-panel gw-panel-center${mobilePanel !== 'center' ? ' gw-panel-hide' : ''}`}>

          {/* Invite section */}
          {showInviteSection && !inviteSent && (
            <div style={{ background: 'white', border: '0.5px solid var(--gw-border)', borderRadius: 10, padding: 16, marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Invite the other person</div>
              <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.6, marginBottom: 12 }}>
                Share this link with the other person. They open it, submit their account, and the record builds.
              </div>
              <div className="gw-fld" style={{ marginBottom: 8 }}>
                <label className="gw-label">Their email</label>
                <input
                  className="gw-input"
                  type="email"
                  placeholder="them@company.com"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && inviteEmail.trim()) addParticipant.mutate(inviteEmail.trim()) }}
                />
              </div>
              <button
                className="gw-btn"
                onClick={() => { if (inviteEmail.trim()) addParticipant.mutate(inviteEmail.trim()) }}
                disabled={addParticipant.isPending || !inviteEmail.trim()}
              >
                {addParticipant.isPending ? 'Sending…' : 'Send invite'}
              </button>
            </div>
          )}

          {inviteSent && (
            <div style={{ background: 'var(--gw-green-bg)', border: '0.5px solid var(--gw-green-b)', borderRadius: 10, padding: '12px 14px', marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--gw-green-t)', marginBottom: 4 }}>Invite sent.</div>
              {inviteUrl ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                  <input readOnly value={inviteUrl}
                    style={{ flex: 1, fontSize: 11, padding: '5px 8px', border: '0.5px solid var(--gw-green-b)', borderRadius: 5, background: 'white', color: 'var(--gw-sub)', fontFamily: 'inherit', minWidth: 0 }}
                    onClick={e => (e.target as HTMLInputElement).select()} />
                  <button onClick={() => navigator.clipboard?.writeText(inviteUrl).then(() => toast.success('Link copied'))}
                    style={{ padding: '5px 10px', borderRadius: 5, background: 'var(--gw-green-t)', color: 'white', border: 'none', cursor: 'pointer', fontSize: 11, fontFamily: 'inherit', flexShrink: 0 }}>
                    Copy
                  </button>
                </div>
              ) : (
                <div style={{ fontSize: 11, color: 'var(--gw-green-t)' }}>They will receive an email with the link.</div>
              )}
            </div>
          )}

          {/* Participants */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Participants</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {ground.participants.map((p: any, i: number) => (
                <ParticipantRow
                  key={p.id}
                  participant={p}
                  index={i}
                  checkIns={ground.checkIns ?? []}
                  overdueCutoff={overdueCutoff}
                  onRemind={remind.mutate}
                />
              ))}
            </div>
          </div>

          {/* Ground confidence */}
          <div style={{ background: 'white', border: '0.5px solid var(--gw-border)', borderRadius: 8, padding: '12px 14px', marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gw-muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>Ground confidence</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5 }}>
              <ConfDots score={conf} />
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--gw-navy)' }}>{conf}/5</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.55 }}>{CONF_DESC[conf] ?? ''}</div>
          </div>

          {/* Alignment map */}
          <div style={{ marginBottom: 14 }}>
            <AlignmentMap
              report={report}
              participants={ground.participants ?? []}
              checkIns={ground.checkIns ?? []}
            />
          </div>

          {/* Documents */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 600 }}>Documents</div>
              <button onClick={() => setShowDocs(v => !v)} style={{ fontSize: 11, color: 'var(--gw-navy)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                {showDocs ? 'Hide' : `Show${docs.length > 0 ? ` (${docs.length})` : ''}`}
              </button>
            </div>
            {showDocs && (
              <>
                <div
                  style={{ border: '1.5px dashed var(--gw-border)', borderRadius: 8, padding: 14, textAlign: 'center', cursor: 'pointer', marginBottom: 10, background: 'var(--gw-bg)' }}
                  onClick={() => document.getElementById('ga-doc-upload')?.click()}
                >
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--gw-navy)', marginBottom: 2 }}>Upload a document</div>
                  <div style={{ fontSize: 11, color: 'var(--gw-sub)' }}>PDF, DOCX, JPEG, PNG, CSV, XLSX</div>
                  <input type="file" id="ga-doc-upload" style={{ display: 'none' }} accept=".pdf,.docx,.jpeg,.jpg,.png,.csv,.xlsx"
                    onChange={e => { const f = e.target.files?.[0]; if (f) uploadDoc.mutate(f); e.target.value = '' }} />
                </div>
                {docs.length === 0 && <div style={{ fontSize: 12, color: 'var(--gw-muted)', textAlign: 'center', padding: 10 }}>No documents yet.</div>}
                {docs.map((doc: any) => (
                  <div key={doc.id} style={{ background: 'white', border: '0.5px solid var(--gw-border)', borderRadius: 7, padding: '9px 12px', marginBottom: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600 }}>{doc.name}</div>
                      <div style={{ fontSize: 10, color: 'var(--gw-muted)' }}>{new Date(doc.uploadedAt).toLocaleDateString()}</div>
                    </div>
                    <button onClick={() => deleteDoc.mutate(doc.id)} style={{ fontSize: 11, color: 'var(--gw-red-t)', background: 'none', border: 'none', cursor: 'pointer' }}>Delete</button>
                  </div>
                ))}
              </>
            )}
          </div>

          {/* Context notes */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Context notes</div>
            <div className="gw-fld">
              <textarea className="gw-ta" rows={2} value={ctxNote} onChange={e => setCtxNote(e.target.value)} placeholder="Changed scope, revised goal, new constraint…" />
            </div>
            <button onClick={() => { if (ctxNote.trim()) addNote.mutate(ctxNote.trim()) }} disabled={addNote.isPending}
              style={{ padding: '7px 14px', borderRadius: 6, background: 'var(--gw-navy)', color: 'white', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer', fontFamily: 'inherit', marginBottom: 10 }}>
              {addNote.isPending ? 'Saving…' : 'Add note'}
            </button>
            {(ground.contextNotes ?? []).map((n: string, i: number) => (
              <div key={i} style={{ background: 'white', border: '0.5px solid var(--gw-border)', borderRadius: 7, padding: '9px 12px', fontSize: 12, color: 'var(--gw-sub)', marginBottom: 6, lineHeight: 1.6 }}>{n}</div>
            ))}
          </div>

          {/* Settings */}
          <div style={{ paddingTop: 12, borderTop: '0.5px solid var(--gw-border)' }}>
            <button onClick={() => navigate('/billing')}
              style={{ width: '100%', padding: 10, borderRadius: 7, background: 'none', color: 'var(--gw-navy)', fontSize: 12, fontWeight: 600, border: '1px solid var(--gw-blue-b)', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span>Billing and seats</span><span style={{ color: 'var(--gw-sub)' }}>›</span>
            </button>
            <div style={{ padding: 12, background: 'var(--gw-red-bg)', border: '0.5px solid var(--gw-red-b)', borderRadius: 7 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--gw-red-t)', marginBottom: 4 }}>Close ground</div>
              <div style={{ fontSize: 11, color: 'var(--gw-sub)', lineHeight: 1.6, marginBottom: 8 }}>Closing writes the final resolution record. Both parties keep their record permanently.</div>
              <button style={{ fontSize: 12, fontWeight: 600, color: 'var(--gw-red-t)', background: 'none', border: '1px solid var(--gw-red-b)', padding: '6px 12px', borderRadius: 5, cursor: 'pointer', fontFamily: 'inherit' }}>
                Close this ground
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT: Session history */}
        <div className={`gw-panel gw-panel-right${mobilePanel !== 'right' ? ' gw-panel-hide' : ''}`}>
          <SessionHistory
            ground={ground}
            report={report}
            paywallActive={paywallActive}
            onRelease={() => releaseReport.mutate()}
            releasing={releaseReport.isPending}
          />
        </div>
      </div>

      {/* Mobile bottom tab bar — three tabs for three panels */}
      <div className="gw-mobile-tabs">
        <button className={`gw-mobile-tab${mobilePanel === 'left' ? ' active' : ''}`} onClick={() => setMobilePanel('left')}>
          <span style={{ fontSize: 16 }}>&#9998;</span>
          Check-in
        </button>
        <button className={`gw-mobile-tab${mobilePanel === 'center' ? ' active' : ''}`} onClick={() => setMobilePanel('center')}>
          <span style={{ fontSize: 16 }}>&#9711;</span>
          Ground
        </button>
        <button className={`gw-mobile-tab${mobilePanel === 'right' ? ' active' : ''}`} onClick={() => setMobilePanel('right')}>
          <span style={{ fontSize: 16 }}>&#128203;</span>
          History
        </button>
      </div>
    </div>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div style={{ flex: 1, background: 'var(--gw-bg)' }}>{children}</div>
}
