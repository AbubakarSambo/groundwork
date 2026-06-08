import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { AxiosError } from 'axios'
import { conversationApi } from '@/api'
import { useAuthStore } from '@/stores/auth'
import type { ConversationTurn } from '@/types'

/** Strip markdown formatting characters that the AI occasionally emits. */
function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/gs, '$1')
    .replace(/\*(.+?)\*/gs, '$1')
    .replace(/^#{1,3}\s+/gm, '')
    .replace(/^-{3,}$/gm, '')
    .replace(/^[ \t]*[-*]\s+/gm, '• ')
    .trim()
}

export function CheckInPage() {
  const { checkInId } = useParams<{ checkInId: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const user = useAuthStore(s => s.user)
  const logout = useAuthStore(s => s.logout)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [billingUrl, setBillingUrl] = useState<string | null>(null)
  const [cadenceMsg, setCadenceMsg] = useState<string | null>(null)
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
      conversationApi.open(checkInId).then(
        () => qc.invalidateQueries({ queryKey: ['transcript', checkInId] }),
        (err: AxiosError<{ requiresBilling?: boolean; checkoutUrl?: string; message?: string }>) => {
          const res = err.response
          if (res?.status === 402 && res.data?.checkoutUrl) {
            setBillingUrl(res.data.checkoutUrl)
          } else if (res?.status === 400 && res.data?.message) {
            setCadenceMsg(res.data.message)
          }
        }
      )
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
    onError: (err: AxiosError<{ message?: string }>) => {
      toast.error(err.response?.data?.message || 'Something went wrong. Try again.')
    },
  })

  const complete = useMutation({
    mutationFn: () => conversationApi.complete(checkInId!),
    onSuccess: (res) => {
      toast.success('Check-in complete. Your record is yours.')
      navigate(`/grounds/${res.groundId}`)
    },
    onError: (err: AxiosError<{ message?: string }>) => {
      toast.error(err.response?.data?.message || 'Could not complete check-in.')
    },
  })

  const handleDownload = async () => {
    try {
      const result = await conversationApi.transcript(checkInId!)
      const turnLines = (result.turns as ConversationTurn[])
        .map(t => `[${t.role === 'AI' ? 'Groundwork' : 'You'}]\n${t.content}`)
        .join('\n\n' + '─'.repeat(40) + '\n\n')

      const checkIn = result.checkIn as any
      const header = [
        'Groundwork — Contribution Record',
        `Session ${checkIn?.sessionNumber ?? ''}`,
        checkIn?.completedAt
          ? `Completed: ${new Date(checkIn.completedAt).toISOString().slice(0, 10)}`
          : `Status: ${checkIn?.status ?? ''}`,
        '',
        'This record belongs to you. It was built from your words, privately.',
        '═'.repeat(60),
        '',
      ].join('\n')

      const blob = new Blob([header + turnLines], { type: 'text/plain; charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `groundwork-record-session-${checkIn?.sessionNumber ?? checkInId?.slice(0, 8)}.txt`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Could not download record. Try again.')
    }
  }

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

  // Cadence gate — session is not available yet.
  if (cadenceMsg) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--gw-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ background: 'white', border: '1px solid #E2E0DB', borderRadius: 8, padding: '40px 32px', maxWidth: 420, width: '100%', textAlign: 'center' }}>
          <div style={{ fontSize: 24, marginBottom: 12 }}>🗓</div>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>Not available yet</div>
          <div style={{ fontSize: 13, color: 'var(--gw-sub)', marginBottom: 20, lineHeight: 1.6 }}>{cadenceMsg}</div>
          <button className="gw-btn-sec" style={{ display: 'inline-block', width: 'auto', padding: '9px 18px' }} onClick={() => navigate(-1)}>
            Back to ground
          </button>
        </div>
      </div>
    )
  }

  // Billing gate — session 2 requires care fee.
  if (billingUrl) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--gw-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ background: 'white', border: '1px solid #E2E0DB', borderRadius: 8, padding: '40px 32px', maxWidth: 420, width: '100%', textAlign: 'center' }}>
          <div style={{ fontSize: 24, marginBottom: 12 }}>🔓</div>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>Set up billing to continue</div>
          <div style={{ fontSize: 13, color: 'var(--gw-sub)', marginBottom: 20, lineHeight: 1.6 }}>
            Session 1 is free for everyone. To continue to the next session, a $20/month care fee is required.
            It keeps the mechanism available for your whole team whether or not a ground is active.
          </div>
          <div className="gw-box gw-box-blue" style={{ marginBottom: 20, textAlign: 'left', fontSize: 12 }}>
            $20/mo care fee · $50/person/month per active ground
          </div>
          <button className="gw-btn" onClick={() => { window.location.href = billingUrl! }}>
            Set up billing →
          </button>
          <div style={{ marginTop: 12 }}>
            <button className="gw-btn-sec" style={{ width: 'auto', padding: '8px 16px', fontSize: 12 }} onClick={() => navigate(-1)}>
              Back
            </button>
          </div>
        </div>
      </div>
    )
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
          {turns.length > 4 && (
            <button
              className="gw-btn-sm"
              onClick={() => {
                if (window.confirm('Mark this session as complete? This cannot be undone.')) {
                  complete.mutate()
                }
              }}
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
            <div className="gw-msg gw-msg-ai">Starting your check-in…</div>
          )}

          {turns.map((t) => (
            <div
              key={t.id}
              className={`gw-msg ${t.role === 'AI' ? 'gw-msg-ai' : 'gw-msg-user'}`}
            >
              {t.role === 'AI' ? stripMarkdown(t.content) : t.content}
            </div>
          ))}

          {sending && <div className="gw-msg gw-msg-loading">Thinking…</div>}
          <div ref={bottomRef} />
        </div>

        {/* Context actions — shown after a few turns */}
        {turns.length >= 4 && !sending && (
          <div className="gw-chat-actions">
            <button className="gw-btn-sm" onClick={handleDownload}>
              Download record
            </button>
            <button
              className="gw-btn-sm"
              onClick={() => {
                if (window.confirm('Mark this session as complete? This cannot be undone.')) {
                  complete.mutate()
                }
              }}
              disabled={complete.isPending}
            >
              Complete check-in
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
            placeholder="Share what you have been working on. Enter to send, Shift+Enter for a new line."
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
