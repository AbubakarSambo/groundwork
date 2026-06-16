import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { entryApi, entryStorage } from '@/api/entry'
import type { EntryMessage, EntryMode } from '@/api/entry'
import { SaveCard } from './SaveCard'

const MODE_LABEL: Record<string, string> = {
  something_new: 'Something new',
  look_back: 'Look back',
  look_forward: 'Look forward',
  both: 'Both',
}

export function EntryChat() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const mode = (params.get('mode') ?? 'both') as EntryMode

  const [msgs, setMsgs] = useState<EntryMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [opened, setOpened] = useState(false)
  const msgsRef = useRef<HTMLDivElement>(null)
  const taRef = useRef<HTMLTextAreaElement>(null)
  const firstMessage = useRef('')

  const callApi = useMutation({
    mutationFn: (messages: EntryMessage[]) => entryApi.chat(mode, messages),
    onSuccess: res => {
      setMsgs(prev => {
        const next = [...prev.filter(m => m.role !== 'loading' as any), { role: 'assistant' as const, content: res.reply }]
        entryStorage.save({ mode, messages: next, completed: res.sessionComplete, firstMessage: firstMessage.current })
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
    const saved = entryStorage.load()
    if (saved && saved.mode === mode && saved.messages.length > 0) {
      firstMessage.current = saved.firstMessage ?? ''
      setMsgs(saved.messages)
      setOpened(true)
      if (saved.completed) setDone(true)
      if (saved.messages[saved.messages.length - 1]?.role === 'assistant') return
      const toSend = saved.messages
      setLoading(true)
      setMsgs(prev => [...prev, { role: 'loading' as any, content: '…' }])
      callApi.mutate(toSend)
    } else {
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
    entryStorage.save({ mode, messages: next, completed: false, firstMessage: firstMessage.current })
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

  const visibleMsgs = msgs.filter(m => m.role !== 'loading' as any || loading)

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--gw-bg)' }}>
      <div className="gw-hdr">
        <div>
          <div className="gw-logo">Groundwork</div>
          <div style={{ fontSize: 11, color: 'var(--gw-muted)' }}>{MODE_LABEL[mode]} · Entry session</div>
        </div>
        <button className="gw-back" onClick={() => navigate('/')}>Back</button>
      </div>

      <div className="gw-chat-w">
        <div
          ref={msgsRef}
          className="gw-chat-msgs"
          style={{ maxWidth: 680, width: '100%', margin: '0 auto', alignSelf: 'center', boxSizing: 'border-box' }}
        >
          {firstMessage.current && (
            <div style={{ fontSize: 12, color: 'var(--gw-muted)', paddingBottom: 8, borderBottom: '0.5px solid var(--gw-border)', marginBottom: 4 }}>
              {MODE_LABEL[mode]} · {firstMessage.current}
            </div>
          )}

          {visibleMsgs.map((m, i) => (
            <div
              key={i}
              className={`gw-msg ${
                (m.role as any) === 'loading' ? 'gw-msg-loading' :
                m.role === 'user' ? 'gw-msg-user' : 'gw-msg-ai'
              }`}
            >
              {m.content}
            </div>
          ))}

          {done && !loading && (
            <div style={{ padding: '16px 0', maxWidth: 480, width: '100%', alignSelf: 'center' }}>
              <SaveCard mode={mode} onClear={() => { entryStorage.clear(); navigate('/') }} />
            </div>
          )}
        </div>

        {!done && (
          <>
            <div style={{ padding: '4px 14px', borderTop: '0.5px solid var(--gw-border)', fontSize: 11, color: 'var(--gw-sub)', background: 'var(--gw-bg)', lineHeight: 1.4 }}>
              Your words are private. Nothing is saved until you choose to save it.
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
    </div>
  )
}
