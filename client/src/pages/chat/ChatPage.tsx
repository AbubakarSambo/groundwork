import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { conversationApi } from '@/api/conversation'
import { documentsApi } from '@/api/documents'
import { useAuthStore } from '@/stores/auth'
import { toast } from 'sonner'

interface Msg { id: string; role: 'AI' | 'PERSON'; content: string }

const QUICK_ACTIONS = [
  { label: 'What am I missing?', msg: 'What is missing from my record that would make it stronger?' },
  { label: 'Is there a document?', msg: 'Is there anything written down that we should look at for this?' },
  { label: 'What do I carry forward?', msg: 'What is the one thing I should carry into the next conversation?' },
]

export function ChatPage() {
  const { checkInId } = useParams<{ checkInId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const user = useAuthStore(s => s.user)

  // Session info passed from GroundParticipantPage
  const sessionNumber: number = (location.state as any)?.sessionNumber ?? 1
  const groundLabel: string = (location.state as any)?.groundLabel ?? ''
  const groundId: string | undefined = (location.state as any)?.groundId

  const [msgs, setMsgs] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [opened, setOpened] = useState(false)
  const [done, setDone] = useState(false)
  const msgsRef = useRef<HTMLDivElement>(null)
  const taRef = useRef<HTMLTextAreaElement>(null)

  const openSession = useMutation({
    mutationFn: () => conversationApi.open(checkInId!),
    onSuccess: res => {
      setMsgs([{ id: 'ai-open', role: 'AI', content: res.reply }])
      setOpened(true)
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? 'Could not open session.'
      toast.error(msg)
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
      setMsgs(v => v.filter(m => m.id !== 'loading').concat({ id: Date.now().toString(), role: 'AI', content: res.reply }))
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
    onSuccess: () => navigate(groundId ? `/grounds/${groundId}/p` : '/grounds'),
  })

  const uploadDoc = useMutation({
    mutationFn: (file: File) => documentsApi.upload(groundId!, file),
    onSuccess: async (doc) => {
      if (!checkInId) return
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
    if (!checkInId) return
    conversationApi.transcript(checkInId).then(({ checkIn, turns }) => {
      if (turns.length > 0) {
        setMsgs(turns.map(t => ({ id: t.id, role: t.role, content: t.content })))
        setOpened(true)
        if (checkIn.status === 'COMPLETED') setDone(true)
      } else {
        openSession.mutate()
      }
    }).catch(() => {
      openSession.mutate()
    })
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

  const privacyLabel = `Session ${sessionNumber} · Your words are private until you both activate the report.`

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--gw-bg)', overflow: 'hidden' }}>
      {/* Header */}
      <div className="gw-hdr">
        <div>
          <div className="gw-logo">{user?.firstName ?? groundLabel ?? 'Your session'}</div>
          <div style={{ fontSize: 11, color: 'var(--gw-muted)' }}>
            Session {sessionNumber} · Private
          </div>
        </div>
        <button className="gw-back" onClick={() => navigate('/grounds')}>← Grounds</button>
      </div>

      {/* Chat area */}
      <div className="gw-chat-w">
        {/* Messages */}
        <div
          ref={msgsRef}
          className="gw-chat-msgs"
        >
          {openSession.isPending && (
            <div style={{ fontSize: 13, color: 'var(--gw-muted)', textAlign: 'center', padding: 16 }}>Opening your session…</div>
          )}
          {msgs.map((m, i) => (
            <div
              key={m.id}
              className={`gw-msg ${
                m.id === 'loading' ? 'gw-msg-loading' :
                m.role === 'PERSON' ? 'gw-msg-user' : 'gw-msg-ai'
              } ${i === msgs.length - 1 ? 'gw-msg-active' : 'gw-msg-back'}`}
            >
              {m.content}
            </div>
          ))}
          {done && (
            <div style={{ padding: '10px 0' }}>
              <div style={{ background: 'var(--gw-green-bg)', border: '0.5px solid var(--gw-green-b)', borderRadius: 8, padding: '12px 14px', marginBottom: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gw-green-t)', marginBottom: 6 }}>Session {sessionNumber} is on record.</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.5 }}>
                    <span style={{ color: 'var(--gw-green-t)', fontWeight: 700, flexShrink: 0 }}>✓</span>
                    <span>Your account is saved. No one can read it until the report is released.</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.5 }}>
                    <span style={{ color: 'var(--gw-muted)', fontWeight: 700, flexShrink: 0 }}>→</span>
                    <span>The other parties will check in independently. When all parties have submitted, you will all see the report at the same time.</span>
                  </div>
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <button
                  onClick={() => complete.mutate()}
                  disabled={complete.isPending}
                  style={{ padding: '10px 24px', borderRadius: 8, background: 'var(--gw-navy)', color: 'white', fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  {complete.isPending ? 'Saving…' : 'Done ✓'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Quick action chips */}
        <div className="gw-chat-actions">
          {QUICK_ACTIONS.map(a => (
            <button
              key={a.label}
              onClick={() => quickSend(a.msg)}
              disabled={loading || done || !opened}
              className="gw-btn-sm"
              style={{ opacity: (!opened || done) ? 0.5 : 1 }}
            >
              {a.label}
            </button>
          ))}
        </div>

        {/* Bottom bar */}
        <div style={{ borderTop: '1px solid var(--gw-border)', background: 'white', flexShrink: 0 }}>
          {/* Privacy / session strip */}
          <div style={{ padding: '4px 14px', borderBottom: '0.5px solid var(--gw-border)', fontSize: 11, color: 'var(--gw-sub)', background: 'var(--gw-bg)', lineHeight: 1.4 }}>
            {privacyLabel}
          </div>

          {/* Input row: upload · textarea · send */}
          <div className="gw-chat-bar">
            <label
              htmlFor="doc-upload"
              title="Upload a document"
              style={{ padding: '0 10px', borderRadius: 6, background: 'var(--gw-bg)', color: 'var(--gw-sub)', border: '0.5px solid var(--gw-border)', cursor: groundId ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, flexShrink: 0, whiteSpace: 'nowrap', height: 38, opacity: groundId ? 1 : 0.4 }}
            >
              📎 Upload doc
            </label>
            <input type="file" id="doc-upload" accept=".pdf,.doc,.docx,.txt,.csv,.xlsx,.png,.jpg,.jpeg" style={{ display: 'none' }}
              onChange={e => { const f = e.target.files?.[0]; if (f && groundId) uploadDoc.mutate(f); e.currentTarget.value = '' }} />

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

            <button
              onClick={send}
              disabled={loading || done || !opened}
              className="gw-send-btn"
              style={{ height: 38 }}
            >
              &#8593;
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
