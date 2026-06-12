import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import { useAuthStore } from '@/stores/auth'

interface Msg { id: string; role: 'AI' | 'ADMIN'; content: string }

export function AlignmentFeedPage() {
  const navigate = useNavigate()
  const user = useAuthStore(s => s.user)
  const [msgs, setMsgs] = useState<Msg[]>([
    { id: '0', role: 'AI', content: 'Welcome to the alignment feed. Ask about your team, request a report, or ask about a specific person.' },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const msgsRef = useRef<HTMLDivElement>(null)

  const send = useMutation({
    mutationFn: (content: string) =>
      apiClient.get('/alignment/narrative', { params: { q: content } }).then(r => r.data),
    onMutate: content => {
      setLoading(true)
      setMsgs(v => [...v, { id: Date.now().toString(), role: 'ADMIN', content }, { id: 'loading', role: 'AI', content: '…' }])
    },
    onSuccess: (res: any) => {
      setMsgs(v => v.filter(m => m.id !== 'loading').concat({ id: Date.now().toString(), role: 'AI', content: res.narrative ?? res }))
      setLoading(false)
    },
    onError: () => {
      setMsgs(v => v.filter(m => m.id !== 'loading'))
      setLoading(false)
    },
  })

  useEffect(() => {
    if (msgsRef.current) msgsRef.current.scrollTop = msgsRef.current.scrollHeight
  }, [msgs])

  function submit() {
    const content = input.trim()
    if (!content || loading) return
    setInput('')
    send.mutate(content)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--gw-bg)' }}>
      <div className="gw-hdr">
        <div>
          <div className="gw-logo">{user?.organizationName ?? 'Alignment feed'}</div>
          <div style={{ fontSize: 11, color: 'var(--gw-muted)' }}>Admin view</div>
        </div>
        <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
          <button className="gw-back" onClick={() => navigate('/grounds')}>← Grounds</button>
        </div>
      </div>

      <div className="gw-chat-w" style={{ flex: 1 }}>
        <div className="gw-chat-msgs" ref={msgsRef}>
          {msgs.map(m => (
            <div key={m.id} className={`gw-msg ${m.id === 'loading' ? 'gw-msg-loading' : m.role === 'AI' ? 'gw-msg-ai' : 'gw-msg-user'}`}>
              {m.content}
            </div>
          ))}
        </div>

        <div className="gw-chat-actions">
          {['Show team overview', 'Who is overdue?', 'Which grounds are at risk?'].map(q => (
            <button key={q} className="gw-btn-sm" onClick={() => { setInput(q); setTimeout(submit, 0) }}>{q}</button>
          ))}
        </div>

        <div className="gw-chat-bar">
          <textarea
            className="gw-chat-ta"
            placeholder="Ask about your team, request a report, or ask about a specific person."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() } }}
            disabled={loading}
          />
          <button className="gw-send-btn" onClick={submit} disabled={loading}>↑</button>
        </div>
      </div>
    </div>
  )
}
