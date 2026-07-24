import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import { groundsApi } from '@/api/grounds'
import { useAuthStore } from '@/stores/auth'
import { useFeedbackStore } from '@/stores/feedback'

interface Msg { id: string; role: 'AI' | 'ADMIN'; content: string }

interface PersonEngagement {
  id: string
  name: string
  initials: string
  status: 'active' | 'overdue' | 'pending'
  sessionsDone: number
  lastCheckin?: string
}

function statusColor(s: PersonEngagement['status']) {
  if (s === 'active') return 'var(--gw-green-b)'
  if (s === 'overdue') return 'var(--gw-amber-b)'
  return 'var(--gw-border)'
}

export function AlignmentFeedPage() {
  const navigate = useNavigate()
  const user = useAuthStore(s => s.user)
  const showFeedback = useFeedbackStore(s => s.show)
  const [msgs, setMsgs] = useState<Msg[]>([
    { id: '0', role: 'AI', content: 'Welcome to the alignment feed. Ask about your team, request a report, or ask about a specific person.' },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [showTeam, setShowTeam] = useState(false)
  const msgsRef = useRef<HTMLDivElement>(null)

  const { data: grounds = [] } = useQuery({
    queryKey: ['grounds'],
    queryFn: groundsApi.list,
    enabled: !!user,
  })

  // Build a flat list of participants across all grounds for the team panel
  const people: PersonEngagement[] = grounds.flatMap(g =>
    g.participants.map((p, i) => ({
      id: `${g.id}-${i}`,
      name: typeof p === 'string' ? p : (p as any).name ?? 'A teammate',
      initials: (typeof p === 'string' ? p : (p as any).name ?? 'T').slice(0, 2).toUpperCase(),
      status: (g.overdue ?? 0) > 0 ? 'overdue' : g.status === 'ACTIVE' ? 'active' : 'pending',
      sessionsDone: (p as any).sessionsDone ?? 0,
    }))
  )

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
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--gw-bg)', position: 'relative' }}>
      <div className="gw-hdr">
        <div>
          <span onClick={() => navigate('/grounds')} style={{ cursor: 'pointer', fontSize: 13, color: 'var(--gw-sub)' }}>← Grounds</span>
          <div className="gw-logo" style={{ marginTop: 2 }}>{user?.organizationName ?? 'Alignment feed'}</div>
          <div style={{ fontSize: 11, color: 'var(--gw-muted)' }}>Engagement overview · {user?.role === 'ADMIN' ? 'Admin' : 'Read only'}</div>
        </div>
        <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
          <button className="gw-feedback-btn" onClick={showFeedback}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1C3.686 1 1 3.462 1 6.5c0 1.41.56 2.694 1.48 3.662L1.5 13l2.98-1.334A6.2 6.2 0 0 0 7 12c3.314 0 6-2.462 6-5.5S10.314 1 7 1Z" stroke="white" strokeWidth="1.3" fill="none"/>
            </svg>
            Feedback
          </button>
          <button
            style={{ fontSize: 11, color: 'var(--gw-navy)', background: 'none', border: '1px solid var(--gw-blue-b)', borderRadius: 'var(--gw-radius)', padding: '4px 10px', cursor: 'pointer', fontFamily: 'inherit' }}
            onClick={() => navigate('/grounds/new')}
          >
            + Invite
          </button>
          <button
            className="gw-back"
            onClick={() => setShowTeam(v => !v)}
            title="Team engagement view"
          >
            👥 Team
          </button>
          <button className="gw-back" onClick={() => navigate('/grounds')}>← Back</button>
        </div>
      </div>

      {/* Team panel - slides in from right */}
      {showTeam && (
        <div style={{ position: 'absolute', top: 0, right: 0, width: '100%', maxWidth: 340, height: '100%', minHeight: '100vh', background: 'white', borderLeft: '0.5px solid var(--gw-border)', zIndex: 20, overflowY: 'auto', padding: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>Team engagement</div>
            <button className="gw-back" onClick={() => setShowTeam(false)}>Close</button>
          </div>
          <div style={{ fontSize: 12, color: 'var(--gw-blue-t)', background: 'var(--gw-blue-bg)', borderRadius: 'var(--gw-radius)', padding: '8px 10px', marginBottom: 12, lineHeight: 1.55 }}>
            This shows session completion and timing only. Individual check-in content is private. Reports are released only when both parties activate them together.
          </div>
          {people.length === 0 && (
            <div style={{ fontSize: 13, color: 'var(--gw-muted)', textAlign: 'center', padding: 24 }}>No participants yet.</div>
          )}
          {people.map(p => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '0.5px solid var(--gw-border)' }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--gw-blue-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'var(--gw-navy)', flexShrink: 0 }}>
                {p.initials}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{p.name}</div>
                <div style={{ fontSize: 11, color: 'var(--gw-sub)' }}>{p.sessionsDone} session{p.sessionsDone !== 1 ? 's' : ''}</div>
              </div>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor(p.status), flexShrink: 0 }} />
            </div>
          ))}
        </div>
      )}

      <div className="gw-chat-w" style={{ flex: 1 }}>
        <div className="gw-chat-msgs" ref={msgsRef}>
          {msgs.map(m => (
            <div key={m.id} className={`gw-msg ${m.id === 'loading' ? 'gw-msg-loading' : m.role === 'AI' ? 'gw-msg-ai' : 'gw-msg-user'}`}>
              {m.id === 'loading'
                ? <><span style={{ marginRight: 6, fontStyle: 'normal', color: 'var(--gw-muted)', fontSize: 11 }}>Thinking</span><span className="gw-dot" /><span className="gw-dot" /><span className="gw-dot" /></>
                : m.content}
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
