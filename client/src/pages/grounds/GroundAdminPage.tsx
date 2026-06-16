import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
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

const SPECIFICITY_LABEL: Record<string, string> = {
  specific: 'Specific',
  directional: 'Directional',
  vague: 'Vague',
  managed: 'Managed',
}
const SPECIFICITY_NOTE: Record<string, string> = {
  specific: 'Named concrete details, events, and people. Good recall depth.',
  directional: 'Named themes but not specifics. Some recall gaps remain.',
  vague: 'Mostly general. Hard to trace to named situations.',
  managed: 'Answers stayed abstract or redirected. Worth exploring in session 2.',
}
const RECALL_LABEL: Record<string, string> = {
  certain: 'Certain',
  mostly_certain: 'Mostly certain',
  uncertain: 'Uncertain',
}
const RECALL_NOTE: Record<string, string> = {
  certain: 'Consistent recall across the session.',
  mostly_certain: 'Mostly consistent with some hedging.',
  uncertain: 'Significant hedging or contradictions. Worth revisiting.',
}

interface Msg { id: string; role: 'AI' | 'PERSON'; content: string }

function InlineChat({
  checkInId,
  groundId,
  sessionNumber,
  onDone,
}: {
  checkInId: string
  groundId: string
  sessionNumber: number
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
    onSuccess: doc => {
      setMsgs(v => [...v, { id: `doc-${doc.id}`, role: 'AI', content: `Document received: "${doc.name}". Let me ask you a few things about it.` }])
    },
    onError: () => toast.error('Upload failed.'),
  })

  useEffect(() => {
    if (!checkInId) return
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
        Session {sessionNumber} · Your words are private.
      </div>
      <div ref={msgsRef} className="gw-chat-msgs" style={{ flex: 1 }}>
        {openSession.isPending && (
          <div style={{ fontSize: 13, color: 'var(--gw-muted)', textAlign: 'center', padding: 16 }}>Opening session…</div>
        )}
        {msgs.map(m => (
          <div key={m.id} className={`gw-msg ${m.id === 'loading' ? 'gw-msg-loading' : m.role === 'PERSON' ? 'gw-msg-user' : 'gw-msg-ai'}`}>
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
            htmlFor="ga-doc-upload-chat"
            title="Upload a document"
            style={{ padding: '0 10px', borderRadius: 6, background: 'var(--gw-bg)', color: 'var(--gw-sub)', border: '0.5px solid var(--gw-border)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, flexShrink: 0, height: 38 }}
          >
            + <span style={{ fontSize: 11 }}>Doc</span>
          </label>
          <input type="file" id="ga-doc-upload-chat" accept=".pdf,.doc,.docx,.txt,.csv,.xlsx,.png,.jpg,.jpeg" style={{ display: 'none' }}
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

function PreSession({ nextSession }: { nextSession: number }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12, textAlign: 'center' }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gw-text)' }}>No open session</div>
      <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.65, maxWidth: 220 }}>
        Session {nextSession} will open once the previous sessions are complete and the ground is ready.
      </div>
    </div>
  )
}

function SessionReport({ ground, report, docsCount, paywallActive, conf }: {
  ground: any
  report: any
  docsCount: number
  paywallActive: boolean
  conf: number
}) {
  const navigate = useNavigate()
  const session1CheckIns = (ground.checkIns ?? []).filter((ci: any) => ci.sessionNumber === 1)
  const s1Done = session1CheckIns.filter((ci: any) => ci.status === 'COMPLETED')
  const totalParties = (ground.participants ?? []).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ textAlign: 'center', paddingBottom: 8, borderBottom: '0.5px solid var(--gw-border)' }}>
        <ConfDots score={conf} large />
        <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--gw-navy)', margin: '8px 0 3px' }}>{conf}/5</div>
        <div style={{ fontSize: 11, color: 'var(--gw-sub)' }}>{CONF_DESC[conf] ?? ''}</div>
      </div>

      {paywallActive && (
        <div style={{ background: 'var(--gw-amber-bg)', border: '0.5px solid var(--gw-amber-b)', borderRadius: 8, padding: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--gw-amber-t)', marginBottom: 4 }}>Session 5 complete</div>
          <div style={{ fontSize: 11, color: 'var(--gw-sub)', lineHeight: 1.6, marginBottom: 8 }}>Activate billing to unlock the session 5 report and continue.</div>
          <button onClick={() => navigate('/billing')}
            style={{ padding: '7px 12px', borderRadius: 6, background: 'var(--gw-navy)', color: 'white', fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
            Activate billing
          </button>
        </div>
      )}

      {session1CheckIns.length > 0 && (
        <div style={{ background: 'white', border: '0.5px solid var(--gw-border)', borderRadius: 8, padding: '12px 14px' }}>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--gw-muted)', marginBottom: 10 }}>Session 1 notes</div>

          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gw-sub)', marginBottom: 2 }}>Completion</div>
            <div style={{ fontSize: 12, color: 'var(--gw-text)' }}>
              {s1Done.length}/{totalParties} {s1Done.length === totalParties ? 'Both done' : s1Done.length === 0 ? 'Not started' : 'One pending'}
            </div>
          </div>

          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gw-sub)', marginBottom: 2 }}>Documents</div>
            <div style={{ fontSize: 12, color: 'var(--gw-text)' }}>{docsCount > 0 ? `${docsCount} uploaded` : 'None uploaded'}</div>
          </div>

          {s1Done.map((ci: any) => {
            const participant = (ground.participants ?? []).find((p: any) => p.id === ci.participantId)
            const label = participant?.email ? participant.email.split('@')[0] : 'Party'
            return (
              <div key={ci.id} style={{ marginBottom: 10, paddingTop: 8, borderTop: '0.5px solid var(--gw-border)' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gw-muted)', marginBottom: 6 }}>{label}</div>
                {ci.specificityLevel && (
                  <div style={{ marginBottom: 4 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gw-sub)' }}>Specificity: {SPECIFICITY_LABEL[ci.specificityLevel] ?? ci.specificityLevel}</div>
                    <div style={{ fontSize: 11, color: 'var(--gw-muted)', lineHeight: 1.5, marginTop: 1 }}>{SPECIFICITY_NOTE[ci.specificityLevel] ?? ''}</div>
                  </div>
                )}
                {ci.recallConfidence && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gw-sub)' }}>Recall: {RECALL_LABEL[ci.recallConfidence] ?? ci.recallConfidence}</div>
                    <div style={{ fontSize: 11, color: 'var(--gw-muted)', lineHeight: 1.5, marginTop: 1 }}>{RECALL_NOTE[ci.recallConfidence] ?? ''}</div>
                  </div>
                )}
              </div>
            )
          })}

          {report?.releasedAt && (
            <div style={{ paddingTop: 8, borderTop: '0.5px solid var(--gw-border)' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gw-sub)', marginBottom: 4 }}>Session 2 focus</div>
              <div style={{ fontSize: 11, color: 'var(--gw-text)', lineHeight: 1.55 }}>{report.centralQuestion ?? 'Run session 2 to deepen the record.'}</div>
            </div>
          )}
        </div>
      )}

      {/* Check-in history */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--gw-muted)', marginBottom: 8 }}>Session history</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {(ground.checkIns ?? []).length === 0 && (
            <div style={{ fontSize: 12, color: 'var(--gw-muted)', textAlign: 'center', padding: '12px 0' }}>No sessions yet.</div>
          )}
          {(ground.checkIns ?? []).map((ci: any) => (
            <div key={ci.id} style={{ background: 'white', border: '0.5px solid var(--gw-border)', borderRadius: 6, padding: '9px 12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 12, fontWeight: 600 }}>Session {ci.sessionNumber}</div>
                <span className={`gw-pill ${ci.status === 'COMPLETED' ? 'gw-pill-green' : ci.status === 'IN_PROGRESS' ? 'gw-pill-amber' : 'gw-pill-gray'}`} style={{ fontSize: 10 }}>
                  {ci.status.replace(/_/g, ' ').toLowerCase()}
                </span>
              </div>
              {ci.completedAt && <div style={{ fontSize: 10, color: 'var(--gw-muted)', marginTop: 2 }}>{new Date(ci.completedAt).toLocaleDateString()}</div>}
            </div>
          ))}
        </div>
      </div>

      {report?.releasedAt && !paywallActive && (
        <div style={{ background: 'var(--gw-navy)', color: 'white', borderRadius: 8, padding: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,.55)', marginBottom: 6 }}>Resolution summary</div>
          <div style={{ fontSize: 12, lineHeight: 1.65 }}>{report.sharedPicture}</div>
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

  if (isLoading) return <Shell><div style={{ padding: 24, fontSize: 13, color: 'var(--gw-muted)' }}>Loading…</div></Shell>
  if (!ground) return <Shell><div style={{ padding: 24, fontSize: 13, color: 'var(--gw-muted)' }}>Ground not found.</div></Shell>

  const conf = ground.confidence ?? 1
  const myParticipant = (ground.participants ?? []).find((p: any) => p.userId === user?.id)

  // Non-initiators should use the participant view
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

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--gw-bg)', minHeight: 0, overflow: 'hidden' }}>
      {/* Sticky header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'var(--gw-bg)', borderBottom: '0.5px solid var(--gw-border)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span onClick={() => navigate('/grounds')} style={{ fontSize: 13, color: 'var(--gw-sub)', cursor: 'pointer' }}>Grounds</span>
            <span style={{ fontSize: 13, color: 'var(--gw-border)' }}>›</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.2 }}>{ground.label}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
                <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 20, background: 'var(--gw-blue-bg)', color: 'var(--gw-navy)' }}>{ground.moment}</span>
                {ground.status === 'ACTIVE' && <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--gw-green-b)', display: 'inline-block' }} />}
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
        {/* LEFT: Check-in */}
        <div className={`gw-panel gw-panel-left${mobilePanel !== 'left' ? ' gw-panel-hide' : ''}`}>
          {myOpenCheckIn ? (
            <InlineChat
              checkInId={myOpenCheckIn.id}
              groundId={id!}
              sessionNumber={myOpenCheckIn.sessionNumber}
              onDone={() => setMobilePanel('center')}
            />
          ) : (
            <PreSession nextSession={myLastSession + 1} />
          )}
        </div>

        {/* CENTER: Ground info */}
        <div className={`gw-panel gw-panel-center${mobilePanel !== 'center' ? ' gw-panel-hide' : ''}`}>

          {showInviteSection && !inviteSent && (
            <div style={{ background: 'white', border: '0.5px solid var(--gw-border)', borderRadius: 10, padding: 16, marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Invite the other person</div>
              <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.6, marginBottom: 12 }}>
                Share this link with the other person. They open it, check in from their own side, and the record builds.
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
                    style={{ flex: 1, fontSize: 11, padding: '5px 8px', border: '0.5px solid var(--gw-green-b)', borderRadius: 5, background: 'white', color: 'var(--gw-sub)', fontFamily: 'inherit' }}
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

          <div style={{ background: 'var(--gw-blue-bg)', border: '0.5px solid var(--gw-blue-b)', borderRadius: 8, padding: '12px 14px', marginBottom: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--gw-navy)', letterSpacing: '.04em', textTransform: 'uppercase', marginBottom: 6 }}>Ground summary</div>
            <div style={{ fontSize: 13, lineHeight: 1.65 }}>{ground.brief ?? 'Waiting for first session pair to complete.'}</div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Participants</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {ground.participants.map((p: any, i: number) => {
                const myCheckIn = ground.checkIns?.find((c: any) => c.participantId === p.id)
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
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 600 }}>Alignment feed</span>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--gw-green-b)', display: 'inline-block' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {ground.signals?.map((sig: any) => (
                  <div key={sig.id} style={{ background: 'var(--gw-bg)', border: '0.5px solid var(--gw-border)', borderRadius: 7, padding: '10px 12px' }}>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 3 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 5px', borderRadius: 3, background: sig.type === 'Convergence' ? 'var(--gw-green-bg)' : sig.type === 'Divergence' ? 'var(--gw-red-bg)' : 'var(--gw-amber-bg)', color: sig.type === 'Convergence' ? 'var(--gw-green-t)' : sig.type === 'Divergence' ? 'var(--gw-red-t)' : 'var(--gw-amber-t)' }}>{sig.type}</span>
                      <span style={{ fontSize: 10, color: 'var(--gw-muted)' }}>Session {sig.sessionNum}</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--gw-text)', lineHeight: 1.55 }}>{sig.text}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Documents section */}
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

          {/* Settings link */}
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

        {/* RIGHT: Session history + report */}
        <div className={`gw-panel gw-panel-right${mobilePanel !== 'right' ? ' gw-panel-hide' : ''}`}>
          <SessionReport
            ground={ground}
            report={report}
            docsCount={docs.length}
            paywallActive={paywallActive}
            conf={conf}
          />
        </div>
      </div>

      {/* Mobile bottom tab bar */}
      <div className="gw-mobile-tabs">
        <button className={`gw-mobile-tab${mobilePanel === 'left' ? ' active' : ''}`} onClick={() => setMobilePanel('left')}>
          <span style={{ fontSize: 16 }}>💬</span>
          Check-in
        </button>
        <button className={`gw-mobile-tab${mobilePanel === 'center' ? ' active' : ''}`} onClick={() => setMobilePanel('center')}>
          <span style={{ fontSize: 16 }}>◎</span>
          Ground
        </button>
        <button className={`gw-mobile-tab${mobilePanel === 'right' ? ' active' : ''}`} onClick={() => setMobilePanel('right')}>
          <span style={{ fontSize: 16 }}>📋</span>
          History
        </button>
      </div>
    </div>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div style={{ flex: 1, background: 'var(--gw-bg)' }}>{children}</div>
}
