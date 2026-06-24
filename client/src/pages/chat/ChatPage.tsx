import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { conversationApi } from '@/api/conversation'
import { documentsApi } from '@/api/documents'
import { useAuthStore } from '@/stores/auth'
import { SessionReportCard } from '@/components/gw/SessionReportCard'
import { toast } from 'sonner'

interface Msg { id: string; role: 'AI' | 'PERSON'; content: string }

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

  const sessionNumber: number = (location.state as any)?.sessionNumber ?? 1
  const groundLabel: string   = (location.state as any)?.groundLabel ?? ''
  const [groundId, setGroundId] = useState<string | undefined>((location.state as any)?.groundId)
  const isInitiator: boolean  = (location.state as any)?.isInitiator ?? false

  const [msgs, setMsgs]               = useState<Msg[]>([])
  const [displayedMsgs, setDisplayedMsgs] = useState<Msg[]>([])
  const [streamingId, setStreamingId] = useState<string | null>(null)
  const [input, setInput]             = useState('')
  const [loading, setLoading]         = useState(false)
  const [opened, setOpened]           = useState(false)
  const [done, setDone]               = useState(false)
  const [completed, setCompleted]     = useState(false)
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

  // Typewriter effect for new AI messages
  useEffect(() => {
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

  const sendMsg = useMutation({
    mutationFn: (message: string) => conversationApi.send(checkInId!, message),
    onMutate: message => {
      setLoading(true)
      setMsgs(v => [...v,
        { id: Date.now().toString(), role: 'PERSON', content: message },
        { id: 'loading', role: 'AI', content: '…' },
      ])
    },
    onSuccess: res => {
      const id = Date.now().toString()
      setMsgs(v => v.filter(m => m.id !== 'loading').concat({ id, role: 'AI', content: res.reply }))
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
    mutationFn: () => conversationApi.complete(checkInId!),
    onSuccess: () => setCompleted(true),
  })

  const uploadDoc = useMutation({
    mutationFn: ({ file }: { file: File; ctx: string }) => {
      if (!groundId) throw new Error('groundId missing')
      return documentsApi.upload(groundId, file)
    },
    onSuccess: (doc, { ctx }) => {
      const id = Date.now().toString()
      const contextLine = ctx.trim() ? `\n\nContext: ${ctx.trim()}` : ''
      setMsgs(v => [...v, {
        id,
        role: 'AI',
        content: `Document received: "${doc.name}".${contextLine} Let me ask you a few things about it.`,
      }])
    },
    onError: () => toast.error('Upload failed.'),
  })

  useEffect(() => {
    if (checkInId && !opened && !openedRef.current) {
      openedRef.current = true
      openSession.mutate()
    }
  }, [checkInId, opened])

  function send() {
    const content = input.trim()
    if (!content || loading || done || !opened) return
    setInput('')
    if (taRef.current) { try { taRef.current.style.height = '38px' } catch { /* ref detached */ } }
    sendMsg.mutate(content)
  }

  function quickSend(msg: string) {
    if (loading || done || !opened) return
    sendMsg.mutate(msg)
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

  const privacyLabel = `Session ${sessionNumber} · Your words are private until you both activate the report.`

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--gw-bg)' }}>
      {/* Header */}
      <div className="gw-hdr">
        <div>
          <div className="gw-logo">{groundLabel || user?.firstName || 'Your session'}</div>
          <div style={{ fontSize: 11, color: 'var(--gw-muted)' }}>Session {sessionNumber} · Private</div>
        </div>
        <button className="gw-back" onClick={() => navigate('/grounds')}>← Grounds</button>
      </div>

      {/* Chat area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div
          ref={msgsRef}
          style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}
        >
          {openSession.isPending && (
            <div style={{ fontSize: 13, color: 'var(--gw-muted)', textAlign: 'center', padding: 16 }}>Opening your session…</div>
          )}
          {displayedMsgs.map(m => (
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
              {m.content}
              {streamingId === m.id && (
                <span style={{ display: 'inline-block', width: 2, height: '1em', background: 'var(--gw-navy)', marginLeft: 2, verticalAlign: 'text-bottom', animation: 'blink .7s step-end infinite' }} />
              )}
            </div>
          ))}
          {done && !completed && (
            <div style={{ textAlign: 'center', padding: '10px 0' }}>
              <button
                onClick={() => complete.mutate()}
                disabled={complete.isPending}
                style={{ padding: '10px 24px', borderRadius: 8, background: 'var(--gw-navy)', color: 'white', fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                {complete.isPending ? 'Saving…' : 'Complete session ✓'}
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

        {/* Session open failure */}
        {openFailed && (
          <div style={{ padding: '10px 14px', background: '#FDF3E3', borderTop: '1px solid #E8A94A', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexShrink: 0 }}>
            <span style={{ fontSize: 13, color: '#8A5C1A' }}>Could not open your session.</span>
            <button
              onClick={() => { setOpenFailed(false); openedRef.current = false; openSession.mutate() }}
              disabled={openSession.isPending}
              style={{ padding: '6px 14px', borderRadius: 6, background: '#8A5C1A', color: 'white', fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0, opacity: openSession.isPending ? 0.6 : 1 }}
            >
              {openSession.isPending ? 'Opening…' : 'Try again'}
            </button>
          </div>
        )}

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
            <input type="file" id="doc-upload" accept=".pdf,.doc,.docx,.txt,.csv,.xlsx,.png,.jpg,.jpeg,.md" style={{ display: 'none' }} onChange={e => {
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
