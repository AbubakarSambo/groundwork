import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams, useLocation, useSearchParams } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { conversationApi, streamMessage } from '@/api/conversation'
import { documentsApi, type DocumentAssessment } from '@/api/documents'
import { useAuthStore } from '@/stores/auth'
import { SessionReportCard } from '@/components/gw/SessionReportCard'
import { toast } from 'sonner'

interface Msg {
  id: string
  role: 'AI' | 'PERSON'
  content: string
  docAssessment?: { docId: string; docName: string; assessment: DocumentAssessment }
}

/** Shows a document's "what this suggests / what will be done with it" bullets,
 * with an inline correction affordance so the person can fix a wrong read. */
function AssessmentCard({ groundId, docId, docName, assessment, onCorrected }: {
  groundId: string; docId: string; docName: string; assessment: DocumentAssessment
  onCorrected: (a: DocumentAssessment) => void
}) {
  const [editing, setEditing] = useState(false)
  const [suggestsText, setSuggestsText] = useState(assessment.suggests.join('\n'))
  const [willDoText, setWillDoText] = useState(assessment.willDo.join('\n'))
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    try {
      const corrected = {
        suggests: suggestsText.split('\n').map(s => s.trim()).filter(Boolean),
        willDo: willDoText.split('\n').map(s => s.trim()).filter(Boolean),
      }
      const doc = await documentsApi.correctAssessment(groundId, docId, corrected)
      onCorrected(doc.assessment ?? corrected)
      setEditing(false)
    } catch {
      toast.error('Could not save your correction. Try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ border: '1px solid var(--gw-border)', borderRadius: 10, padding: '12px 14px', background: 'white', maxWidth: '82%', alignSelf: 'flex-start' }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--gw-navy)', marginBottom: 8 }}>📎 {docName}</div>
      {!editing ? (
        <>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--gw-sub)', marginBottom: 4 }}>What this suggests</div>
          <ul style={{ margin: '0 0 10px', paddingLeft: 18, fontSize: 13, lineHeight: 1.6 }}>
            {assessment.suggests.map((s, i) => <li key={i}>{s}</li>)}
          </ul>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--gw-sub)', marginBottom: 4 }}>What I will do with it</div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.6 }}>
            {assessment.willDo.map((s, i) => <li key={i}>{s}</li>)}
          </ul>
          <button onClick={() => setEditing(true)} style={{ marginTop: 10, fontSize: 12, color: 'var(--gw-navy)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontFamily: 'inherit', padding: 0 }}>
            Not right? Correct this
          </button>
        </>
      ) : (
        <>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--gw-sub)', marginBottom: 4 }}>What this suggests (one per line)</div>
          <textarea value={suggestsText} onChange={e => setSuggestsText(e.target.value)} rows={3}
            style={{ width: '100%', padding: '8px 10px', fontSize: 13, border: '1px solid var(--gw-border)', borderRadius: 6, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', resize: 'vertical', marginBottom: 8 }} />
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--gw-sub)', marginBottom: 4 }}>What I will do with it (one per line)</div>
          <textarea value={willDoText} onChange={e => setWillDoText(e.target.value)} rows={2}
            style={{ width: '100%', padding: '8px 10px', fontSize: 13, border: '1px solid var(--gw-border)', borderRadius: 6, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', resize: 'vertical', marginBottom: 8 }} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={save} disabled={saving} style={{ padding: '7px 14px', borderRadius: 6, background: 'var(--gw-navy)', color: 'white', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'inherit', opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Saving…' : 'Save correction'}
            </button>
            <button onClick={() => setEditing(false)} disabled={saving} style={{ padding: '7px 14px', borderRadius: 6, background: 'none', color: 'var(--gw-sub)', border: '1px solid var(--gw-border)', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}>
              Cancel
            </button>
          </div>
        </>
      )}
    </div>
  )
}

const QUICK_ACTIONS = [
  { label: 'What am I missing?',        msg: 'What is missing from my record that would make it stronger?' },
  { label: 'Is there a document?',      msg: 'Is there anything written down that we should look at for this?' },
  { label: 'What do I carry forward?',  msg: 'What is the one thing I should carry into the next conversation?' },
]

export function ChatPage() {
  const { checkInId } = useParams<{ checkInId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const user = useAuthStore(s => s.user)

  const [searchParams] = useSearchParams()
  const isClarificationSession = searchParams.get('clarify') === 'true'

  const sessionNumber: number = (location.state as any)?.sessionNumber ?? 1
  const groundLabel: string   = (location.state as any)?.groundLabel ?? ''
  const [groundId, setGroundId] = useState<string | undefined>((location.state as any)?.groundId)
  const isInitiator: boolean  = (location.state as any)?.isInitiator ?? false
  const isFinalSession: boolean = (location.state as any)?.isFinal ?? false

  const [msgs, setMsgs]               = useState<Msg[]>([])
  const [priorTurns, setPriorTurns]   = useState<Msg[]>([])
  const [priorSessionNumber, setPriorSessionNumber] = useState<number | null>(null)
  const [displayedMsgs, setDisplayedMsgs] = useState<Msg[]>([])
  const [streamingId, setStreamingId] = useState<string | null>(null)
  const [input, setInput]             = useState('')
  const [loading, setLoading]         = useState(false)
  const [opened, setOpened]           = useState(false)
  const [done, setDone]               = useState(false)
  const [completed, setCompleted]     = useState(false)
  const [confirmingFinish, setConfirmingFinish] = useState(false)
  const [openFailed, setOpenFailed]   = useState(false)
  const openedRef = useRef(false)

  // Doc context
  const [pendingDoc, setPendingDoc]   = useState<File | null>(null)
  const [docContext, setDocContext]   = useState('')
  const [docContextMode, setDocContextMode] = useState(false)

  // Paste text
  const [pasteMode, setPasteMode]     = useState(false)
  const [pasteText, setPasteText]     = useState('')
  const [pasteLabel, setPasteLabel]   = useState('')

  const msgsRef = useRef<HTMLDivElement>(null)
  const taRef   = useRef<HTMLTextAreaElement>(null)
  const streamingRef = useRef(false)

  // Typewriter effect for new AI messages. Skipped while a live stream is running -
  // streamed deltas are rendered directly, so the typewriter must not fight them.
  useEffect(() => {
    if (streamingRef.current) return
    const lastIdx = msgs.length - 1
    const last = msgs[lastIdx]
    if (!last || last.role !== 'AI' || last.id === 'loading') {
      setDisplayedMsgs(msgs)
      setStreamingId(null)
      return
    }
    if (displayedMsgs[lastIdx]?.content === last.content) return

    setStreamingId(last.id)
    let i = 0
    const full = last.content
    const base = msgs.slice(0, lastIdx)
    const tick = setInterval(() => {
      i += 2
      setDisplayedMsgs([...base, { ...last, content: full.slice(0, i) }])
      if (i >= full.length) {
        clearInterval(tick)
        setDisplayedMsgs(msgs)
        setStreamingId(null)
      }
    }, 25)
    return () => clearInterval(tick)
  }, [msgs])

  useEffect(() => {
    if (msgsRef.current) msgsRef.current.scrollTop = msgsRef.current.scrollHeight
  }, [displayedMsgs, loading])

  const openSession = useMutation({
    mutationFn: () => conversationApi.open(checkInId!),
    onSuccess: res => {
      setMsgs([{ id: 'ai-open', role: 'AI', content: res.reply }])
      if (res.groundId && !groundId) setGroundId(res.groundId)
      setOpened(true)
      setOpenFailed(false)
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? 'Could not open session.')
      setOpenFailed(true)
    },
  })


  const complete = useMutation({
    mutationFn: () => conversationApi.complete(checkInId!),
    onSuccess: () => setCompleted(true),
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Could not complete this session.'),
  })

  const uploadDoc = useMutation({
    mutationFn: ({ file }: { file: File; ctx: string }) => {
      if (!groundId) throw new Error('groundId missing')
      return documentsApi.upload(groundId, file)
    },
    onSuccess: (doc, { ctx }) => {
      const contextLine = ctx.trim() ? ` Context you gave: ${ctx.trim()}.` : ''
      const newMsgs: Msg[] = [{
        id: `doc-note-${Date.now()}`,
        role: 'AI',
        content: `Document received: "${doc.name}".${contextLine}`,
      }]
      if (doc.assessment) {
        newMsgs.push({
          id: `doc-assess-${doc.id}`,
          role: 'AI',
          content: '',
          docAssessment: { docId: doc.id, docName: doc.name, assessment: doc.assessment },
        })
      }
      setMsgs(v => [...v, ...newMsgs])
    },
    onError: (_err, { file, ctx }) => {
      // Restore what the person typed/picked instead of silently discarding it -
      // previously a failed upload cleared pendingDoc/docContext with no way to retry.
      setPendingDoc(file)
      setDocContext(ctx)
      setDocContextMode(true)
      toast.error('Upload failed. Try again.')
    },
  })

  // Resume an in-progress check-in with its real transcript. open() only ever
  // returns the single opener line, so opening on every mount wiped the visible
  // conversation for a returning user (their turns are safe server-side, but
  // the screen reset to empty). On mount, load the stored transcript first: if
  // there are already turns, render them; only call open() for a fresh session
  // that has none yet.
  useEffect(() => {
    if (checkInId && !opened && !openedRef.current) {
      openedRef.current = true
      let cancelled = false
      const jitter = Math.random() * 2000
      const t = setTimeout(async () => {
        try {
          const t = await conversationApi.transcript(checkInId)
          if (cancelled) return
          // Reopen (#3): if this is a correction session, show the prior
          // session's turns read-only so the person sees what they said before.
          if (t.priorTurns && t.priorTurns.length > 0) {
            setPriorTurns(t.priorTurns.map(turn => ({ id: turn.id, role: turn.role, content: turn.content })))
            setPriorSessionNumber(t.priorSessionNumber ?? null)
          }
          if (t.turns && t.turns.length > 0) {
            setMsgs(t.turns.map(turn => ({ id: turn.id, role: turn.role, content: turn.content })))
            if (t.checkIn?.groundId && !groundId) setGroundId(t.checkIn.groundId)
            if (t.checkIn?.status === 'COMPLETED') { setDone(true); setCompleted(true) }
            setOpened(true)
            setOpenFailed(false)
            return
          }
        } catch { /* no transcript yet or fetch failed - fall through to open() */ }
        if (!cancelled) openSession.mutate()
      }, jitter)
      return () => { cancelled = true; clearTimeout(t); openedRef.current = false }
    }
  }, [checkInId, opened])

  // Streaming send: shows the answer token-by-token. Falls back to the plain
  // request if the stream can't start (proxy buffering, older browser, error).
  async function sendStreaming(message: string) {
    if (!checkInId) return
    setLoading(true)
    const aiId = `ai-${Date.now()}`
    setMsgs(v => [...v, { id: Date.now().toString(), role: 'PERSON', content: message }, { id: aiId, role: 'AI', content: '…' }])
    let acc = ''
    let started = false
    streamingRef.current = true
    try {
      await streamMessage(checkInId, message, {
        onDelta: (text) => {
          started = true
          acc += text
          setMsgs(v => v.map(m => m.id === aiId ? { ...m, content: acc } : m))
          setDisplayedMsgs(v => v.map(m => m.id === aiId ? { ...m, content: acc } : m))
        },
        onDone: (r) => {
          setMsgs(v => v.map(m => m.id === aiId ? { ...m, content: r.reply } : m))
          setDisplayedMsgs(v => v.map(m => m.id === aiId ? { ...m, content: r.reply } : m))
          if (r.sessionComplete) setDone(true)
        },
        onError: (m) => { throw new Error(m) },
      })
      streamingRef.current = false
      setLoading(false)
    } catch (err) {
      streamingRef.current = false
      // If nothing streamed yet, fall back cleanly to the non-streaming path.
      if (!started) {
        setMsgs(v => v.filter(m => m.id !== aiId)) // drop the empty AI bubble; keep the person's message
        try {
          const res = await conversationApi.send(checkInId, message)
          setMsgs(v => v.concat({ id: `ai-${Date.now()}`, role: 'AI', content: res.reply }))
          if (res.sessionComplete) setDone(true)
        } catch {
          toast.error('Message failed. Try again.')
        }
        setLoading(false)
      } else {
        setLoading(false)
        toast.error('The reply was cut off. You can send again.')
      }
    }
  }

  function send() {
    const content = input.trim()
    if (!content || loading || done || !opened) return
    setInput('')
    if (taRef.current) { try { taRef.current.style.height = '38px' } catch { /* ref detached */ } }
    sendStreaming(content)
  }

  function quickSend(msg: string) {
    if (loading || done || !opened) return
    sendStreaming(msg)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  function autoResize(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value)
    e.target.style.height = '38px'
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f || !groundId) return
    setPendingDoc(f)
    setDocContext('')
    setDocContextMode(true)
    e.currentTarget.value = ''
  }

  function submitDocWithContext() {
    if (!pendingDoc) return
    if (!groundId) { toast.error('Ground context missing. Please open this session from your ground page.'); return }
    uploadDoc.mutate({ file: pendingDoc, ctx: docContext })
    setDocContextMode(false)
    setPendingDoc(null)
    setDocContext('')
  }

  function submitPaste() {
    const text = pasteText.trim()
    if (!text || !groundId) return
    const label = pasteLabel.trim() || 'pasted-note.txt'
    const fileName = label.endsWith('.txt') ? label : label + '.txt'
    const file = new File([text], fileName, { type: 'text/plain' })
    uploadDoc.mutate({ file, ctx: '' })
    setPasteMode(false)
    setPasteText('')
    setPasteLabel('')
  }

  const privacyLabel = isFinalSession
    ? `Closing session ${sessionNumber} · This is the last word on the record. Take the time to be thorough - what you document here is what the final report weighs.`
    : `Session ${sessionNumber} · Your words are private until you both activate the report.`

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--gw-bg)' }}>
      {/* Header */}
      <div className="gw-hdr">
        <div>
          <div className="gw-logo">{groundLabel || user?.firstName || 'Your session'}</div>
          <div style={{ fontSize: 11, color: isFinalSession ? '#8A5C1A' : 'var(--gw-muted)', fontWeight: isFinalSession ? 700 : 400 }}>
            {isFinalSession ? `Closing session ${sessionNumber} · your final account` : `Session ${sessionNumber} · Private`}
          </div>
        </div>
        <button className="gw-back" onClick={() => navigate('/grounds')}>← Grounds</button>
      </div>

      {/* Clarification session banner */}
      {isClarificationSession && (
        <div style={{ background: '#EEF4FB', borderBottom: '1px solid #B5D4F4', padding: '10px 16px', fontSize: 12.5, color: '#0C447C', lineHeight: 1.55 }}>
          <strong>Clarification session.</strong> Something in your report was inferred, not quoted directly. Tell us what was actually happening and we'll update the record.
        </div>
      )}

      {/* Session open failure - shown at top of chat area so it's always visible */}
      {openFailed && (
        <div style={{ padding: '12px 16px', background: '#FDF3E3', borderBottom: '1px solid #E8A94A', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexShrink: 0 }}>
          <span style={{ fontSize: 13, color: '#8A5C1A', lineHeight: 1.4 }}>Could not open your session. This is usually a temporary issue.</span>
          <button
            onClick={() => { setOpenFailed(false); openedRef.current = false; openSession.mutate() }}
            disabled={openSession.isPending}
            style={{ padding: '6px 14px', borderRadius: 6, background: '#8A5C1A', color: 'white', fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0, opacity: openSession.isPending ? 0.6 : 1 }}
          >
            {openSession.isPending ? 'Opening…' : 'Try again'}
          </button>
        </div>
      )}

      {/* Chat area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div
          ref={msgsRef}
          style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}
        >
          {openSession.isPending && (
            <div style={{ fontSize: 13, color: 'var(--gw-muted)', textAlign: 'center', padding: 16 }}>Opening your session…</div>
          )}
          {priorTurns.length > 0 && (
            <div style={{ border: '1px dashed var(--gw-border)', borderRadius: 10, padding: '10px 12px', marginBottom: 4, background: 'var(--gw-bg)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--gw-muted)', marginBottom: 8 }}>
                From your earlier session{priorSessionNumber != null ? ` ${priorSessionNumber}` : ''} · read-only
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, opacity: 0.72 }}>
                {priorTurns.map(m => (
                  <div key={`prior-${m.id}`} style={{ alignSelf: m.role === 'PERSON' ? 'flex-end' : 'flex-start', maxWidth: '85%', fontSize: 13, lineHeight: 1.5, color: 'var(--gw-text)', background: m.role === 'PERSON' ? 'var(--gw-blue-bg)' : 'white', border: '1px solid var(--gw-border)', borderRadius: 8, padding: '7px 10px' }}>
                    {m.content}
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 11, color: 'var(--gw-muted)', marginTop: 8, lineHeight: 1.5 }}>
                This stays on record as it is. What you add below is recorded as an update, not a replacement.
              </div>
            </div>
          )}
          {displayedMsgs.map(m => (
            m.docAssessment ? (
              <AssessmentCard
                key={m.id}
                groundId={groundId ?? ''}
                docId={m.docAssessment.docId}
                docName={m.docAssessment.docName}
                assessment={m.docAssessment.assessment}
                onCorrected={(a) => setMsgs(v => v.map(msg => msg.id === m.id ? { ...msg, docAssessment: { ...msg.docAssessment!, assessment: a } } : msg))}
              />
            ) : (
            <div
              key={m.id}
              style={{
                maxWidth: '80%',
                alignSelf: m.role === 'PERSON' ? 'flex-end' : 'flex-start',
                background: m.role === 'PERSON' ? 'var(--gw-navy)' : 'white',
                color: m.role === 'PERSON' ? 'white' : 'var(--gw-text)',
                border: m.role === 'AI' ? '0.5px solid var(--gw-border)' : 'none',
                borderRadius: m.role === 'PERSON' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                padding: '10px 14px',
                fontSize: 14,
                lineHeight: 1.6,
                whiteSpace: 'pre-wrap',
                opacity: m.id === 'loading' ? 0.5 : 1,
                boxShadow: m.role === 'AI' ? '0 1px 3px rgba(0,0,0,.05)' : 'none',
              }}
            >
              {m.id === 'loading' ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  {[0, 1, 2].map(i => (
                    <span key={i} style={{
                      display: 'inline-block', width: 6, height: 6, borderRadius: '50%',
                      background: 'var(--gw-sub)',
                      animation: 'gwDotBounce 1.2s ease-in-out infinite',
                      animationDelay: `${i * 0.2}s`,
                    }} />
                  ))}
                  <style>{`@keyframes gwDotBounce { 0%,80%,100%{transform:translateY(0);opacity:.4} 40%{transform:translateY(-5px);opacity:1} }`}</style>
                </span>
              ) : m.content}
              {streamingId === m.id && (
                <span style={{ display: 'inline-block', width: 2, height: '1em', background: 'var(--gw-navy)', marginLeft: 2, verticalAlign: 'text-bottom', animation: 'blink .7s step-end infinite' }} />
              )}
            </div>
            )
          ))}
          {/* Explicit end confirmation: finishing never auto-happens. Clicking
              "Complete session" opens a confirm step so the person can review
              before the record locks. This is the client half of one coherent
              close - the engine has already confirmed the timeframe and that
              they are ready in the conversation itself (TIMEFRAME RULE); this
              is the deliberate final action, not a second stacked prompt. */}
          {done && !completed && !confirmingFinish && (
            <div style={{ textAlign: 'center', padding: '10px 0' }}>
              <button
                onClick={() => setConfirmingFinish(true)}
                style={{ padding: '10px 24px', borderRadius: 8, background: 'var(--gw-navy)', color: 'white', fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Complete session ✓
              </button>
            </div>
          )}
          {!completed && confirmingFinish && (
            <div style={{ padding: '12px 0', textAlign: 'center' }}>
              <div style={{ maxWidth: 460, margin: '0 auto', background: 'var(--gw-bg)', border: '1px solid var(--gw-border)', borderRadius: 10, padding: '16px 18px' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--gw-text)', marginBottom: 6 }}>Ready to finish this check-in?</div>
                <div style={{ fontSize: 13, color: 'var(--gw-sub)', lineHeight: 1.6, marginBottom: 14 }}>
                  Take a moment to look back over what you have said. Once you finish, this session's record is locked in and cross-referenced with the others. If a timeframe matters here, make sure you have confirmed it above.
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                  <button
                    onClick={() => complete.mutate()}
                    disabled={complete.isPending}
                    style={{ padding: '10px 22px', borderRadius: 8, background: 'var(--gw-navy)', color: 'white', fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    {complete.isPending ? 'Saving…' : 'Finish check-in ✓'}
                  </button>
                  <button
                    onClick={() => setConfirmingFinish(false)}
                    disabled={complete.isPending}
                    style={{ padding: '10px 18px', borderRadius: 8, background: 'none', color: 'var(--gw-sub)', fontSize: 13, fontWeight: 600, border: '1px solid var(--gw-border)', cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    Not yet, keep going
                  </button>
                </div>
              </div>
            </div>
          )}
          {/* Manual fallback: "done" only flips when the AI's reply happens to
              match a fixed set of closing phrases (detectSessionComplete on
              the backend). That heuristic can miss a legitimate closing reply,
              leaving no way to complete. Once there's a real record built,
              offer a manual path - the backend's own readiness gate is the
              actual authority and returns a clear message if it's too early. */}
          {!done && !completed && !confirmingFinish && opened && msgs.filter(m => m.role === 'PERSON').length >= 3 && (
            <div style={{ textAlign: 'center', padding: '6px 0' }}>
              <button
                onClick={() => setConfirmingFinish(true)}
                style={{ fontSize: 12, color: 'var(--gw-sub)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontFamily: 'inherit' }}
              >
                Not seeing a wrap-up? Complete session
              </button>
            </div>
          )}
          {completed && groundId && checkInId && (
            <div style={{ padding: '4px 0 16px' }}>
              <SessionReportCard checkInId={checkInId} groundId={groundId} sessionNumber={sessionNumber} isInitiator={isInitiator} />
              <div style={{ textAlign: 'center', paddingTop: 8 }}>
                <button onClick={() => navigate('/grounds')} style={{ fontSize: 13, color: 'var(--gw-sub)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontFamily: 'inherit' }}>
                  ← Back to grounds
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Quick action chips */}
        <div style={{ padding: '8px 14px', background: 'white', borderTop: '1px solid var(--gw-border)', display: 'flex', gap: 7, flexWrap: 'wrap', flexShrink: 0 }}>
          {QUICK_ACTIONS.map(a => (
            <button key={a.label} onClick={() => quickSend(a.msg)} disabled={loading || done || !opened}
              title={!opened ? 'Available once your session is open' : done ? 'Session is complete' : undefined}
              style={{ padding: '5px 12px', borderRadius: 20, fontSize: 12, border: '1px solid var(--gw-border)', background: 'var(--gw-bg)', color: 'var(--gw-sub)', cursor: (!opened || done) ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: (!opened || done) ? 0.5 : 1 }}
            >
              {a.label}
            </button>
          ))}
        </div>


        {/* Bottom bar */}
        <div style={{ borderTop: '1px solid var(--gw-border)', background: 'white', flexShrink: 0 }}>
          <div style={{ padding: '4px 14px', borderBottom: '0.5px solid var(--gw-border)', fontSize: 11, color: 'var(--gw-sub)', background: 'var(--gw-bg)', lineHeight: 1.4 }}>
            {privacyLabel}
          </div>
          <div style={{ padding: '10px 14px', display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <label htmlFor="doc-upload"
              title="Accepted: PDF, DOC, DOCX, TXT, CSV, XLSX, PNG, JPG, MD"
              style={{ padding: '0 10px', borderRadius: 6, background: 'var(--gw-bg)', color: 'var(--gw-sub)', border: '0.5px solid var(--gw-border)', cursor: groundId ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, flexShrink: 0, whiteSpace: 'nowrap', height: 38, opacity: groundId ? 1 : 0.4 }}
            >
              📎 <span style={{ fontSize: 11 }}>Upload doc</span>
            </label>
            <button
              onClick={() => { if (groundId) setPasteMode(true) }}
              disabled={!groundId || done}
              title="Paste an email, Slack message, meeting notes, or any text"
              style={{ padding: '0 10px', borderRadius: 6, background: 'var(--gw-bg)', color: 'var(--gw-sub)', border: '0.5px solid var(--gw-border)', cursor: groundId && !done ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, flexShrink: 0, whiteSpace: 'nowrap', height: 38, opacity: groundId && !done ? 1 : 0.4, fontFamily: 'inherit' }}
            >
              📋 <span style={{ fontSize: 11 }}>Paste text</span>
            </button>
            <input type="file" id="doc-upload" accept=".pdf,.doc,.docx,.txt,.csv,.xlsx,.png,.jpg,.jpeg,.heic,.md,.html,.htm,.json,.xml,.js,.ts,.py,.java,.go,.rb,.php,.css" style={{ display: 'none' }} onChange={e => {
              const f = e.target.files?.[0]
              if (f) {
                const allowed = ['.pdf','.doc','.docx','.txt','.csv','.xlsx','.png','.jpg','.jpeg','.md']
                const ext = '.' + f.name.split('.').pop()?.toLowerCase()
                if (!allowed.includes(ext)) { toast.error(`File type not supported. Accepted: ${allowed.join(', ')}`); e.target.value = ''; return }
              }
              handleFileChange(e)
            }} />

            <textarea ref={taRef} placeholder="Share what you have been working on."
              value={input} onChange={autoResize} onKeyDown={handleKeyDown}
              disabled={loading || done || !opened}
              style={{ flex: 1, resize: 'none', height: 38, maxHeight: 120, padding: '8px 10px', fontSize: 13, lineHeight: 1.4, border: '1px solid var(--gw-border)', borderRadius: 6, background: opened ? 'white' : 'var(--gw-bg)', fontFamily: 'inherit', outline: 'none' }}
            />
            <button onClick={send} disabled={loading || done || !opened}
              style={{ padding: '0 14px', borderRadius: 6, background: 'var(--gw-navy)', color: 'white', border: 'none', cursor: 'pointer', fontSize: 18, flexShrink: 0, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: (!opened || done) ? 0.5 : 1 }}
            >
              ↑
            </button>
          </div>
        </div>
      </div>

      {/* Paste text overlay */}
      {pasteMode && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ background: 'white', borderRadius: '14px 14px 0 0', padding: '20px 20px 32px', width: '100%', maxWidth: 560 }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--gw-border)', margin: '0 auto 16px' }} />
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gw-text)', marginBottom: 4 }}>📋 Paste text</div>
            <div style={{ fontSize: 13, color: 'var(--gw-sub)', marginBottom: 12, lineHeight: 1.55 }}>
              Paste an email, Slack thread, meeting notes, or any text that supports what you are describing. The tool will use it to ask sharper questions.
            </div>
            <input
              placeholder="Label (optional) e.g. Q2 update email, project brief"
              value={pasteLabel}
              onChange={e => setPasteLabel(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', fontSize: 13, border: '1px solid var(--gw-border)', borderRadius: 8, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', marginBottom: 8 }}
            />
            <textarea autoFocus
              placeholder="Paste your text here…"
              value={pasteText}
              onChange={e => setPasteText(e.target.value)}
              style={{ width: '100%', resize: 'none', minHeight: 140, padding: '10px 12px', fontSize: 13, lineHeight: 1.55, border: '1px solid var(--gw-border)', borderRadius: 8, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', marginBottom: 10 }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { setPasteMode(false); setPasteText(''); setPasteLabel('') }}
                style={{ padding: '10px 16px', borderRadius: 8, background: 'none', border: '1px solid var(--gw-border)', color: 'var(--gw-sub)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
                Cancel
              </button>
              <button onClick={submitPaste} disabled={!pasteText.trim()}
                style={{ flex: 1, padding: '10px 16px', borderRadius: 8, background: 'var(--gw-navy)', color: 'white', fontSize: 13, fontWeight: 700, border: 'none', cursor: pasteText.trim() ? 'pointer' : 'not-allowed', fontFamily: 'inherit', opacity: pasteText.trim() ? 1 : 0.5 }}>
                Add to session
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Doc context overlay */}
      {docContextMode && pendingDoc && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ background: 'white', borderRadius: '14px 14px 0 0', padding: '20px 20px 32px', width: '100%', maxWidth: 560 }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--gw-border)', margin: '0 auto 16px' }} />
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gw-text)', marginBottom: 4 }}>📎 {pendingDoc.name}</div>
            <div style={{ fontSize: 13, color: 'var(--gw-sub)', marginBottom: 12, lineHeight: 1.55 }}>
              What context does this document support from what you have shared so far?
            </div>
            <textarea autoFocus
              placeholder="e.g. This is the brief I referenced when I mentioned the project scope…"
              value={docContext} onChange={e => setDocContext(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitDocWithContext() } }}
              style={{ width: '100%', resize: 'none', minHeight: 80, padding: '10px 12px', fontSize: 13, lineHeight: 1.55, border: '1px solid var(--gw-border)', borderRadius: 8, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', marginBottom: 10 }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { setDocContextMode(false); setPendingDoc(null) }}
                style={{ padding: '10px 16px', borderRadius: 8, background: 'none', border: '1px solid var(--gw-border)', color: 'var(--gw-sub)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
                Cancel
              </button>
              <button onClick={submitDocWithContext}
                style={{ flex: 1, padding: '10px 16px', borderRadius: 8, background: 'var(--gw-navy)', color: 'white', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                Add to session
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
