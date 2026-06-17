import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { participantApi, participantStorage } from '@/api/entry'
import type { EntryMessage, ParticipantSession } from '@/api/entry'
import { SaveCard } from './SaveCard'

export function ParticipantChat() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const token = params.get('token') ?? ''
  const groundLabel = params.get('groundLabel') ?? ''
  const initiatorName = params.get('initiatorName') ?? ''

  const [msgs, setMsgs] = useState<EntryMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [opened, setOpened] = useState(false)
  const [resumed, setResumed] = useState(false)
  const msgsRef = useRef<HTMLDivElement>(null)
  const taRef = useRef<HTMLTextAreaElement>(null)
  const contextRef = useRef({ groundLabel, initiatorName, token })

  const callApi = useMutation({
    mutationFn: (messages: EntryMessage[]) => participantApi.chat(contextRef.current.token, messages),
    onSuccess: res => {
      setMsgs(prev => {
        const next = [...prev.filter(m => m.role !== 'loading' as any), { role: 'assistant' as const, content: res.reply }]
        const session: ParticipantSession = {
          inviteToken: contextRef.current.token,
          groundLabel: contextRef.current.groundLabel,
          initiatorName: contextRef.current.initiatorName,
          messages: next,
          completed: res.sessionComplete,
        }
        participantStorage.save(session)
        return next
      })
      setLoading(false)
      if (res.sessionComplete) setDone(true)
    },
    onError: () => {
      setMsgs(prev => prev.filter(m => m.role !== 'loading' as any))
      setLoading(false)
    },
  })

  useEffect(() => {
    if (!token) { navigate('/'); return }
    const saved = participantStorage.load()
    if (saved && saved.inviteToken === token && saved.messages.length > 0) {
      contextRef.current = { groundLabel: saved.groundLabel, initiatorName: saved.initiatorName, token: saved.inviteToken }
      setMsgs(saved.messages)
      setOpened(true)
      if (!saved.completed) setResumed(true)
      if (saved.completed) setDone(true)
      if (saved.messages[saved.messages.length - 1]?.role === 'assistant') return
      setLoading(true)
      setMsgs(prev => [...prev, { role: 'loading' as any, content: '…' }])
      callApi.mutate(saved.messages)
    } else {
      participantStorage.save({ inviteToken: token, groundLabel, initiatorName, messages: [], completed: false })
      setLoading(true)
      setMsgs([{ role: 'loading' as any, content: '…' }])
      callApi.mutate([])
      setOpened(true)
    }
  }, [])

  useEffect(() => {
    if (msgsRef.current) msgsRef.current.scrollTop = msgsRef.current.scrollHeight
  }, [msgs])

  function send() {
    const content = input.trim()
    if (!content || loading || done) return
    setInput('')
    if (taRef.current) taRef.current.style.height = '38px'

    const next: EntryMessage[] = [...msgs.filter(m => m.role !== 'loading' as any), { role: 'user', content }]
    setMsgs([...next, { role: 'loading' as any, content: '…' }])
    const saved = participantStorage.load()
    if (saved) participantStorage.save({ ...saved, messages: next })
    setLoading(true)
    callApi.mutate(next)
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  function autoResize(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value)
    e.target.style.height = '38px'
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
  }

  const gl = contextRef.current.groundLabel || groundLabel
  const iname = contextRef.current.initiatorName || initiatorName
  const visibleMsgs = msgs.filter(m => m.role !== 'loading' as any || loading)

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--gw-bg)' }}>
      <div className="gw-hdr">
        <div>
          <div className="gw-logo">Groundwork</div>
          <div style={{ fontSize: 11, color: 'var(--gw-muted)' }}>Your account</div>
        </div>
      </div>

      <div className="gw-chat-w">
        <div
          ref={msgsRef}
          className="gw-chat-msgs"
          style={{ maxWidth: 680, width: '100%', margin: '0 auto', alignSelf: 'center', boxSizing: 'border-box' }}
        >
          {resumed && (
            <div style={{ fontSize: 12, color: 'var(--gw-muted)', paddingBottom: gl ? 4 : 8, borderBottom: gl ? 'none' : '0.5px solid var(--gw-border)', marginBottom: gl ? 0 : 4 }}>
              You were here. Continue when you are ready.
            </div>
          )}
          {gl && (
            <div style={{ fontSize: 12, color: 'var(--gw-muted)', paddingBottom: 8, borderBottom: '0.5px solid var(--gw-border)', marginBottom: 4 }}>
              {iname} · {gl}
            </div>
          )}

          {visibleMsgs.map((m, i) => (
            <div
              key={i}
              className={`gw-msg ${
                (m.role as any) === 'loading' ? 'gw-msg-loading' :
                m.role === 'user' ? 'gw-msg-user' : 'gw-msg-ai'
              } ${i === visibleMsgs.length - 1 ? 'gw-msg-active' : 'gw-msg-back'}`}
            >
              {m.content}
            </div>
          ))}
        </div>

        {!done && (
          <>
            <div style={{ padding: '4px 14px', borderTop: '0.5px solid var(--gw-border)', fontSize: 11, color: 'var(--gw-sub)', background: 'var(--gw-bg)', lineHeight: 1.4 }}>
              Your words are private. {iname} will not see what you write until both parties activate the report.
            </div>
            <div className="gw-chat-bar">
              <textarea
                ref={taRef}
                placeholder="Share what is happening."
                value={input}
                onChange={autoResize}
                onKeyDown={handleKey}
                disabled={loading || !opened}
                className="gw-chat-ta"
                style={{ background: opened && !loading ? 'white' : 'var(--gw-bg)', maxHeight: 120 }}
              />
              <button
                onClick={send}
                disabled={loading || !opened}
                className="gw-send-btn"
                style={{ height: 38 }}
              >
                &#8593;
              </button>
            </div>
          </>
        )}
      </div>

      {done && !loading && (
        <div style={{ borderTop: '0.5px solid var(--gw-border)', background: 'white', overflowY: 'auto', maxHeight: '65vh', animation: 'gw-slideup 0.35s ease', flexShrink: 0 }}>
          <div style={{ maxWidth: 680, width: '100%', margin: '0 auto', padding: '16px' }}>
            <SaveCard variant="participant" onClear={() => { participantStorage.clear(); navigate('/') }} />
          </div>
        </div>
      )}
    </div>
  )
}
