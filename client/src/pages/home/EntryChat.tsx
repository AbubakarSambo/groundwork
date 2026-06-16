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

  const callApi = useMutation({
    mutationFn: (messages: EntryMessage[]) => entryApi.chat(mode, messages),
    onSuccess: res => {
      setMsgs(prev => {
        const next = [...prev.filter(m => m.role !== 'loading' as any), { role: 'assistant' as const, content: res.reply }]
        entryStorage.save({ mode, messages: next, completed: res.sessionComplete, firstMessage: next[0]?.content ?? '' })
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
      setMsgs(saved.messages)
      setOpened(true)
      if (saved.completed) setDone(true)
      if (saved.messages[saved.messages.length - 1]?.role === 'assistant') return
      const toSend = saved.messages
      setLoading(true)
      setMsgs(prev => [...prev, { role: 'loading' as any, content: '…' }])
      callApi.mutate(toSend)
    } else {
      const initialMessages: EntryMessage[] = []
      setLoading(true)
      setMsgs([{ role: 'loading' as any, content: '…' }])
      callApi.mutate(initialMessages)
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
    entryStorage.save({ mode, messages: next, completed: false, firstMessage: next[0]?.content ?? '' })
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
        <button className="gw-back" onClick={() => navigate('/')}>← Back</button>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div
          ref={msgsRef}
          style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 680, width: '100%', margin: '0 auto', alignSelf: 'center', boxSizing: 'border-box' }}
        >
          {visibleMsgs.map((m, i) => (
            <div
              key={i}
              style={{
                maxWidth: '82%',
                alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                background: m.role === 'user' ? 'var(--gw-navy)' : 'white',
                color: m.role === 'user' ? 'white' : 'var(--gw-text)',
                border: m.role !== 'user' ? '0.5px solid var(--gw-border)' : 'none',
                borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                padding: '10px 14px',
                fontSize: 14,
                lineHeight: 1.65,
                whiteSpace: 'pre-wrap',
                opacity: (m.role as any) === 'loading' ? 0.5 : 1,
                fontStyle: (m.role as any) === 'loading' ? 'italic' : 'normal',
              }}
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
            <div style={{ borderTop: '1px solid var(--gw-border)', background: 'white', padding: '10px 14px', display: 'flex', gap: 8, alignItems: 'flex-end', flexShrink: 0 }}>
              <textarea
                ref={taRef}
                placeholder="Share what is happening."
                value={input}
                onChange={autoResize}
                onKeyDown={handleKey}
                disabled={loading || !opened}
                style={{
                  flex: 1,
                  resize: 'none',
                  height: 38,
                  maxHeight: 120,
                  padding: '8px 10px',
                  fontSize: 13,
                  lineHeight: 1.4,
                  border: '1px solid var(--gw-border)',
                  borderRadius: 6,
                  background: opened && !loading ? 'white' : 'var(--gw-bg)',
                  fontFamily: 'inherit',
                  outline: 'none',
                  color: 'var(--gw-text)',
                }}
              />
              <button
                onClick={send}
                disabled={loading || !opened}
                style={{
                  padding: '0 14px',
                  borderRadius: 6,
                  background: 'var(--gw-navy)',
                  color: 'white',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 18,
                  flexShrink: 0,
                  height: 38,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: (!opened || loading) ? 0.5 : 1,
                  fontFamily: 'inherit',
                }}
              >
                ↑
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
