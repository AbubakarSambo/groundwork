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
    onSuccess: () => navigate('/grounds'),
  })

  const uploadDoc = useMutation({
    mutationFn: (file: File) => documentsApi.upload(groundId!, file),
    onSuccess: (doc) => {
      setMsgs(v => [...v, { id: `doc-${doc.id}`, role: 'AI', content: `Document received: "${doc.name}". Let me ask you a few things about it.` }])
    },
    onError: () => toast.error('Upload failed.'),
  })

  useEffect(() => {
    if (checkInId && !opened) openSession.mutate()
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
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--gw-bg)' }}>
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
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {/* Messages */}
        <div
          ref={msgsRef}
          style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}
        >
          {openSession.isPending && (
            <div style={{ fontSize: 13, color: 'var(--gw-muted)', textAlign: 'center', padding: 16 }}>Opening your session…</div>
          )}
          {msgs.map(m => (
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
              }}
            >
              {m.content}
            </div>
          ))}
          {done && (
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
        </div>

        {/* Quick action chips */}
        <div style={{ padding: '8px 14px', background: 'white', borderTop: '1px solid var(--gw-border)', display: 'flex', gap: 7, flexWrap: 'wrap', flexShrink: 0 }}>
          {QUICK_ACTIONS.map(a => (
            <button
              key={a.label}
              onClick={() => quickSend(a.msg)}
              disabled={loading || done || !opened}
              style={{ padding: '5px 12px', borderRadius: 20, fontSize: 12, border: '1px solid var(--gw-border)', background: 'var(--gw-bg)', color: 'var(--gw-sub)', cursor: 'pointer', fontFamily: 'inherit', opacity: (!opened || done) ? 0.5 : 1 }}
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
          <div style={{ padding: '10px 14px', display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <label
              htmlFor="doc-upload"
              title="Upload a document — written agreements, messages, briefs"
              style={{ padding: '0 10px', borderRadius: 6, background: 'var(--gw-bg)', color: 'var(--gw-sub)', border: '0.5px solid var(--gw-border)', cursor: groundId ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, flexShrink: 0, whiteSpace: 'nowrap', height: 38, opacity: groundId ? 1 : 0.4 }}
            >
              + <span style={{ fontSize: 11 }}>Upload doc</span>
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
              style={{ flex: 1, resize: 'none', height: 38, maxHeight: 120, padding: '8px 10px', fontSize: 13, lineHeight: 1.4, border: '1px solid var(--gw-border)', borderRadius: 6, background: opened ? 'white' : 'var(--gw-bg)', fontFamily: 'inherit', outline: 'none' }}
            />

            <button
              onClick={send}
              disabled={loading || done || !opened}
              style={{ padding: '0 14px', borderRadius: 6, background: 'var(--gw-navy)', color: 'white', border: 'none', cursor: 'pointer', fontSize: 18, flexShrink: 0, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: (!opened || done) ? 0.5 : 1 }}
            >
              ↑
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
