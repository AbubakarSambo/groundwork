import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { AxiosError } from 'axios'
import { conversationApi } from '@/api'
import { useAuthStore } from '@/stores/auth'
import type { ConversationTurn } from '@/types'
import { CofounderIntakePage } from './CofounderIntakePage'

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

const WELCOME_KEY = 'gw_welcome_shown'

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

  // Task 1 — inline confirmation state
  const [confirmAction, setConfirmAction] = useState<'complete' | 'decline' | null>(null)

  // Task 2 — welcome screen state (persist per session)
  const [showWelcome, setShowWelcome] = useState<boolean>(
    () => sessionStorage.getItem(WELCOME_KEY) !== 'true'
  )

  // Task 3 — completion note state
  const [completionNote, setCompletionNote] = useState('')
  const [showCompletionPrompt, setShowCompletionPrompt] = useState(false)

  // Cofounder intake — set to true once the participant has submitted (or already had) the intake
  const [intakeComplete, setIntakeComplete] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['transcript', checkInId],
    queryFn: () => conversationApi.transcript(checkInId!),
    enabled: !!checkInId,
  })

  const opened = useRef(false)
  useEffect(() => {
    // Task 2 — do not open the conversation until the user dismisses the welcome screen
    if (showWelcome) return
    if (!checkInId || isLoading || opened.current) return
    if ((data?.turns?.length ?? 0) === 0) {
      opened.current = true
      conversationApi.open(checkInId).then(
        () => qc.invalidateQueries({ queryKey: ['transcript', checkInId] }),
        (err: AxiosError<{ message?: string }>) => {
          toast.error(err.response?.data?.message || 'Could not start the check-in. Please refresh to try again.')
        }
      )
    }
  }, [checkInId, isLoading, data?.turns?.length, qc, showWelcome])

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

  // Task 3 — complete mutation now accepts optional nextCommitment
  const complete = useMutation({
    mutationFn: (nextCommitment?: string) => conversationApi.complete(checkInId!, nextCommitment),
    onSuccess: (res) => {
      toast.success('Check-in complete. Your record is yours.')
      navigate(`/grounds/${res.groundId}`)
    },
    onError: (err: AxiosError<{ message?: string }>) => {
      toast.error(err.response?.data?.message || 'Could not complete check-in.')
    },
  })

  const decline = useMutation({
    mutationFn: () => conversationApi.decline(checkInId!),
    onSuccess: () => {
      toast.success('Noted — you have chosen not to take part. That is respected, and your record stays yours.')
      navigate('/')
    },
    onError: (err: AxiosError<{ message?: string }>) => {
      toast.error(err.response?.data?.message || 'Could not record that.')
    },
  })

  // Task 4 — remind mutation
  const remind = useMutation({
    mutationFn: () => conversationApi.remind(checkInId!),
    onSuccess: () => {
      toast.success('Reminder sent.')
    },
    onError: (err: AxiosError<{ message?: string }>) => {
      toast.error(err.response?.data?.message || 'Could not send reminder.')
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
      a.download = `groundwork-${(checkIn?.groundLabel ?? 'record').toLowerCase().replace(/\s+/g, '-')}-session-${checkIn?.sessionNumber ?? checkInId?.slice(0, 8)}.txt`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Could not download record. Try again.')
    }
  }

  useEffect(() => {
    if (taRef.current) {
      taRef.current.style.height = 'auto';
      taRef.current.style.height = Math.min(taRef.current.scrollHeight, 120) + 'px';
    }
  }, [message])

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

  // Task 2 — welcome screen handler
  const handleBeginCheckIn = () => {
    sessionStorage.setItem(WELCOME_KEY, 'true')
    setShowWelcome(false)
  }

  // Task 1+3 — handlers for confirmation bar
  const handleConfirmComplete = () => {
    setConfirmAction('complete')
    setShowCompletionPrompt(false)
    setCompletionNote('')
  }

  const handleConfirmDecline = () => {
    setConfirmAction('decline')
  }

  const handleCancelConfirm = () => {
    setConfirmAction(null)
    setShowCompletionPrompt(false)
    setCompletionNote('')
  }

  // Task 3 — when "Complete session" is confirmed, show the note prompt instead
  const handleProceedComplete = () => {
    setShowCompletionPrompt(true)
  }

  const handleSaveAndComplete = () => {
    complete.mutate(completionNote || undefined)
  }

  const handleSkipAndComplete = () => {
    complete.mutate(undefined)
  }

  // Determine whether the cofounder intake should be shown.
  // Show when: scenario is NEW_COFOUNDER, it's session 1, and the participant
  // has not yet submitted the intake (hasIntake is false on the transcript response).
  const checkInData = data?.checkIn as any
  const isNewCofounder = checkInData?.scenario === 'NEW_COFOUNDER'
  const isFirstSession = checkInData?.sessionNumber === 1
  const serverHasIntake: boolean = checkInData?.hasIntake === true
  const showCofounderIntake =
    !isLoading &&
    isNewCofounder &&
    isFirstSession &&
    !serverHasIntake &&
    !intakeComplete

  if (showCofounderIntake && checkInId) {
    return (
      <CofounderIntakePage
        checkInId={checkInId}
        groundLabel={checkInData?.groundLabel ?? 'Groundwork'}
        onComplete={() => setIntakeComplete(true)}
      />
    )
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--gw-bg)' }}>
      {/* Header */}
      <div className="gw-hdr">
        <div>
          <div className="gw-logo">{data?.checkIn?.groundLabel ?? user?.firstName ?? 'Check-in'}</div>
          <div style={{ fontSize: 11, color: 'var(--gw-muted)', marginTop: 1 }}>Session {data?.checkIn?.sessionNumber ?? ''} · {user?.organizationName ?? 'Groundwork'}</div>
        </div>
        <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
          {turns.length >= 6 && (
            <button
              className="gw-btn-sm"
              onClick={handleConfirmComplete}
              disabled={complete.isPending}
            >
              {complete.isPending ? 'Completing…' : 'Complete check-in'}
            </button>
          )}
          {(turns.length >= 2 || confirmAction === 'decline') && (
            <button
              className="gw-back"
              onClick={handleConfirmDecline}
              disabled={decline.isPending}
            >
              Not for me
            </button>
          )}
          <button className="gw-back" onClick={() => { logout(); navigate('/') }}>Sign out</button>
        </div>
      </div>

      {/* Task 2 — welcome screen */}
      {showWelcome && turns.length === 0 && !isLoading ? (
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
        }}>
          <div style={{
            maxWidth: 480,
            width: '100%',
            background: 'var(--gw-card, #fff)',
            borderRadius: 12,
            padding: '2.5rem 2rem',
            boxShadow: '0 2px 16px rgba(0,0,0,0.07)',
            textAlign: 'center',
          }}>
            <h2 style={{ margin: '0 0 1rem', fontSize: '1.35rem', fontWeight: 700, color: 'var(--gw-text)' }}>
              This record is yours
            </h2>
            <p style={{ margin: '0 0 2rem', lineHeight: 1.6, color: 'var(--gw-muted, #6b7280)', fontSize: '0.97rem' }}>
              Nothing you write is shared with your employer, your manager, or anyone else unless you choose to share it.
              The record belongs to you and stays with you even if you leave the organisation.
            </p>
            <button
              className="gw-btn-sm"
              style={{ minWidth: 160, padding: '0.6rem 1.5rem', fontSize: '0.95rem' }}
              onClick={handleBeginCheckIn}
            >
              Begin check-in
            </button>
          </div>
        </div>
      ) : (
        /* Chat */
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

            {sending && (
              <div className="gw-msg gw-msg-ai" style={{ display: 'flex', gap: 4, alignItems: 'center', minWidth: 48 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--gw-muted)', animation: 'gw-pulse 1.2s ease-in-out infinite' }} />
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--gw-muted)', animation: 'gw-pulse 1.2s ease-in-out 0.4s infinite' }} />
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--gw-muted)', animation: 'gw-pulse 1.2s ease-in-out 0.8s infinite' }} />
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Task 4 — remind other party button */}
          {turns.length >= 2 && (
            <div style={{ padding: '0.25rem 1rem 0', textAlign: 'right' }}>
              <button
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--gw-muted, #6b7280)',
                  fontSize: '0.82rem',
                  cursor: remind.isPending ? 'default' : 'pointer',
                  padding: '2px 0',
                  textDecoration: 'underline',
                  opacity: remind.isPending ? 0.5 : 1,
                }}
                onClick={() => remind.mutate()}
                disabled={remind.isPending}
              >
                {remind.isPending ? 'Sending…' : 'Remind the other party →'}
              </button>
            </div>
          )}

          {/* Context actions — shown after 6 turns */}
          {turns.length >= 6 && !sending && (
            <div className="gw-chat-actions">
              <button className="gw-btn-sm" onClick={handleDownload}>
                Download record
              </button>
              <button
                className="gw-btn-sm"
                onClick={handleConfirmComplete}
                disabled={complete.isPending}
              >
                Complete check-in
              </button>
            </div>
          )}

          {/* Task 1+3 — inline confirmation bar */}
          {confirmAction !== null && (
            <div style={{
              margin: '0.5rem 1rem',
              padding: '1rem',
              background: 'var(--gw-card, #f9fafb)',
              border: '1px solid var(--gw-border, #e5e7eb)',
              borderRadius: 8,
              fontSize: '0.9rem',
            }}>
              {confirmAction === 'complete' && !showCompletionPrompt && (
                <>
                  <p style={{ margin: '0 0 0.75rem', color: 'var(--gw-text)' }}>
                    Mark this session as complete? This cannot be undone.
                  </p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="gw-back" onClick={handleCancelConfirm}>Cancel</button>
                    <button className="gw-btn-sm" onClick={handleProceedComplete}>Complete session</button>
                  </div>
                </>
              )}

              {confirmAction === 'complete' && showCompletionPrompt && (
                <>
                  <p style={{ margin: '0 0 0.5rem', color: 'var(--gw-text)', fontWeight: 500 }}>
                    One last thing — what is your commitment from this session? (optional)
                  </p>
                  <textarea
                    style={{
                      width: '100%',
                      minHeight: 72,
                      borderRadius: 6,
                      border: '1px solid var(--gw-border, #e5e7eb)',
                      padding: '0.5rem',
                      fontSize: '0.9rem',
                      resize: 'vertical',
                      boxSizing: 'border-box',
                    }}
                    value={completionNote}
                    onChange={e => setCompletionNote(e.target.value)}
                    placeholder="e.g. Follow up with the team on the project timeline"
                    autoFocus
                  />
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <button className="gw-back" onClick={handleSkipAndComplete} disabled={complete.isPending}>
                      Skip
                    </button>
                    <button className="gw-btn-sm" onClick={handleSaveAndComplete} disabled={complete.isPending}>
                      {complete.isPending ? 'Saving…' : 'Save and complete'}
                    </button>
                  </div>
                </>
              )}

              {confirmAction === 'decline' && (
                <>
                  <p style={{ margin: '0 0 0.75rem', color: 'var(--gw-text)' }}>
                    Decline to take part? Nothing you wrote is shared. Declining is never shown as a negative.
                  </p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="gw-back" onClick={handleCancelConfirm}>Cancel</button>
                    <button
                      className="gw-btn-sm"
                      onClick={() => decline.mutate()}
                      disabled={decline.isPending}
                    >
                      {decline.isPending ? 'Declining…' : 'Yes, decline'}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Input */}
          <div className="gw-chat-bar">
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
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
              <div style={{ fontSize: 11, color: 'var(--gw-muted)', marginTop: 3, textAlign: 'right' }}>Enter to send · Shift+Enter for new line</div>
            </div>
            <button
              className="gw-send-btn"
              onClick={() => canSend && send.mutate()}
              disabled={!canSend}
            >
              ↑
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
