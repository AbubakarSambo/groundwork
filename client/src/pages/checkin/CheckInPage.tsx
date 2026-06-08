import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { conversationApi } from '@/api'
import { useAuthStore } from '@/stores/auth'
import type { ConversationTurn } from '@/types'

export function CheckInPage() {
  const { checkInId } = useParams<{ checkInId: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const user = useAuthStore(s => s.user)
  const logout = useAuthStore(s => s.logout)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const taRef = useRef<HTMLTextAreaElement>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['transcript', checkInId],
    queryFn: () => conversationApi.transcript(checkInId!),
    enabled: !!checkInId,
  })

  const opened = useRef(false)
  useEffect(() => {
    if (!checkInId || isLoading || opened.current) return
    if ((data?.turns?.length ?? 0) === 0) {
      opened.current = true
      conversationApi.open(checkInId).then(() => qc.invalidateQueries({ queryKey: ['transcript', checkInId] }))
    }
  }, [checkInId, isLoading, data?.turns?.length, qc])

  const send = useMutation({
    mutationFn: () => conversationApi.send(checkInId!, message),
    onMutate: () => setSending(true),
    onSettled: () => setSending(false),
    onSuccess: () => {
      setMessage('')
      qc.invalidateQueries({ queryKey: ['transcript', checkInId] })
      taRef.current?.focus()
    },
  })

  const complete = useMutation({
    mutationFn: () => conversationApi.complete(checkInId!),
    onSuccess: (res) => {
      toast.success('Check-in complete. Your record is yours.')
      navigate(`/grounds/${res.groundId}`)
    },
  })

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [data?.turns?.length, sending])

  const turns: ConversationTurn[] = data?.turns ?? []
  const canSend = message.trim().length > 0 && !sending

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (canSend) send.mutate()
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--gw-bg)' }}>
      {/* Header */}
      <div className="gw-hdr">
        <div>
          <div className="gw-logo">{user?.firstName ?? 'Check-in'}</div>
          <div style={{ fontSize: 11, color: 'var(--gw-muted)', marginTop: 1 }}>{user?.organizationName ?? 'Groundwork'}</div>
        </div>
        <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
          {turns.length > 2 && (
            <button
              className="gw-btn-sm"
              onClick={() => complete.mutate()}
              disabled={complete.isPending}
            >
              {complete.isPending ? 'Completing…' : 'Complete check-in'}
            </button>
          )}
          <button className="gw-back" onClick={() => { logout(); navigate('/') }}>Sign out</button>
        </div>
      </div>

      {/* Chat */}
      <div className="gw-chat-w">
        <div className="gw-chat-msgs" id="chat-scroll">
          {isLoading && (
            <div className="gw-msg gw-msg-loading">Loading your check-in…</div>
          )}

          {!isLoading && turns.length === 0 && (
            <div className="gw-msg gw-msg-ai">
              Starting your check-in…
            </div>
          )}

          {turns.map((t) => (
            <div
              key={t.id}
              className={`gw-msg ${t.role === 'AI' ? 'gw-msg-ai' : 'gw-msg-user'}`}
            >
              {t.content}
            </div>
          ))}

          {sending && <div className="gw-msg gw-msg-loading">Thinking…</div>}
          <div ref={bottomRef} />
        </div>

        {/* Context action buttons — shown after a few turns */}
        {turns.length >= 2 && !sending && (
          <div className="gw-chat-actions">
            <button className="gw-btn-sm" onClick={() => setMessage('I would like to download my contribution record')}>
              📄 Download record
            </button>
            <button className="gw-btn-sm" onClick={() => complete.mutate()} disabled={complete.isPending}>
              ✓ Complete check-in
            </button>
          </div>
        )}

        {/* Input */}
        <div className="gw-chat-bar">
          <textarea
            ref={taRef}
            className="gw-chat-ta"
            value={message}
            onChange={e => setMessage(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Share what you have been working on."
            rows={1}
            style={{ minHeight: 38, maxHeight: 120 }}
          />
          <button
            className="gw-send-btn"
            onClick={() => canSend && send.mutate()}
            disabled={!canSend}
          >
            ↑
          </button>
        </div>
      </div>
    </div>
  )
}
