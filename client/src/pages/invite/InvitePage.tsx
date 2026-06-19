import { useState, useRef, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { participantsApi } from '@/api'
import { participantRequestsApi } from '@/api/participantRequests'
import { useAuthStore } from '@/stores/auth'
import { GroundworkLogo } from '@/components/gw/GroundworkLogo'
import { entryApi } from '@/api/entry'
import type { EntryReport, ChatTurn } from '@/api/entry'
import { authApi } from '@/api/auth'

type Phase = 'landing' | 'checkin' | 'report'

interface ChatMessage { role: 'user' | 'assistant'; content: string }

interface SharePrefs {
  areasRequiringAlignment: boolean
  alignmentReached: boolean
  honestClose: boolean
}

export function InvitePage() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)

  // Landing state
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phase, setPhase] = useState<Phase>('landing')

  // Check-in state
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [onboardingStep, setOnboardingStep] = useState(1)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [freeCheckinCount, setFreeCheckinCount] = useState(0)
  const [sessionEnded, setSessionEnded] = useState(false)

  // Report state
  const [sessionReport, setSessionReport] = useState<EntryReport | null>(null)
  const [generatingReport, setGeneratingReport] = useState(false)
  const [sharePrefs, setSharePrefs] = useState<SharePrefs>({
    areasRequiringAlignment: true,
    alignmentReached: true,
    honestClose: false,
  })

  // Save email
  const [email, setEmail] = useState('')
  const [emailSent, setEmailSent] = useState(false)
  const [emailError, setEmailError] = useState('')

  // Suggest participants state
  const [requestedPeople, setRequestedPeople] = useState<{ email: string; name?: string; reason: string }[]>([])
  const [reqEmail, setReqEmail] = useState('')
  const [reqName, setReqName] = useState('')
  const [reqReason, setReqReason] = useState('')

  const msgsRef = useRef<HTMLDivElement>(null)
  const taRef = useRef<HTMLTextAreaElement>(null)

  const { data: preview, isLoading, isError } = useQuery({
    queryKey: ['invite', token],
    queryFn: () => participantsApi.preview(token),
    enabled: !!token,
    retry: false,
  })

  useEffect(() => {
    if (msgsRef.current) msgsRef.current.scrollTop = msgsRef.current.scrollHeight
  }, [messages, loading])

  // Accept mutation — called in background when landing → checkin
  const accept = useMutation({
    mutationFn: () => participantsApi.accept(token, { firstName: firstName || undefined, lastName: lastName || undefined }),
    onSuccess: (res) => {
      setAuth(res.user, res.accessToken)
      if (res.user?.email) setEmail(res.user.email)
    },
    onError: () => {
      setPhase('landing')
      toast.error('Could not start your session. Please try again.')
    },
  })

  function buildParticipantOnboardingMessages(initiatorName: string, groundLabel: string): string[] {
    return [
      `Welcome. You have been invited by ${initiatorName} to share your account of ${groundLabel}. This is your private space — ${initiatorName} will not see what you write here until both accounts are complete, and the report is released to you both at the same time. There are no right answers. Take your time.`,
      `First we will ask you to name what this is about.\n\nSomething like: Kwame, my cofounder. Or Q2 sales targets. Or the Lagos project handover. Or Priya, new head of product, first 90 days.\n\nJust enough for both of you to know what this record is about. Type okay or proceed when you are ready.`,
      `Then we will ask you about the people involved.\n\nSomething like: Kwame was supposed to own the fundraising deck and the investor meetings. He has missed three deadlines and the Series A is in six weeks.\n\nOr: Priya joins next Monday. I want both of us to agree on what her first 90 days look like before she starts.\n\nJust names, what they were supposed to do or what you need from them, and what you believe is happening or needs to happen. Type okay or proceed when you are ready.`,
      `Then we will ask you to pick what kind of situation this is.\n\nSomething went wrong and you need it on record. You need to get on the same page before things get worse. Or you are starting something and want both sides clear from day one.\n\nOne of those will fit.\n\nSome of what we ask might feel direct. That is the point. The record is only useful if it is honest. You are not being asked to be fair to the other person. You are being asked to be honest about your own version. Type okay or proceed when you are ready.`,
      `We will ask for documents at the right moment.\n\nEmails where something was agreed. Work plans. Contracts. Performance reviews. Messages. Call transcripts. Project briefs.\n\nYou do not need all of them and you do not need any of them right now. But when you attach a document the product cross-references it against what you and the other party said. That cross-reference is where the most important gaps in a record are usually found. Type okay or proceed when you are ready.`,
      `The other person gets a link. They submit their own account separately. They cannot see what you wrote. You cannot see what they wrote. When both accounts are in you both see the report at the same time.\n\nNeither of you shapes the other's story. Type okay or proceed when you are ready.`,
      `Here is what happens when the other person opens their link.\n\nThey will see your name and the name of this ground. They will be told that their account is completely private and that you cannot see what they write until both of you activate the report together. They will go through their own short onboarding conversation before they answer any questions. They will be asked what they want the record to show from their side before the first question is asked.\n\nThey are not being ambushed. They are being given the same process you are going through right now. Type okay or proceed when you are ready.`,
      `When both sides have submitted their accounts the report is generated. It shows where you agree, where you differ, and what the gap between your two versions actually is. Documents you attached are cross-referenced against what you both said. Performance records, emails, and agreements are referenced where they are relevant.\n\nNo one decides who is right. The record shows both sides of the truth in the same place, checked against the evidence both parties provided. Type okay or proceed when you are ready.`,
      `After each session you will see your confidence score update. Watch it.\n\nA score of 1 means the record is just starting. A score of 3 means both sides have submitted and the picture is forming. A score of 5 means the record is strong enough to stand on its own in any room.\n\nIf the score is not moving it means the record needs more depth. More specifics. More names. More dates. More documents.\n\nThe sessions are short. About ten minutes each. You can do one today and come back next week. The record waits for you. Type okay or proceed when you are ready.`,
      `How long do you need this record for? Use this to decide. If you need a quick resolution and both parties are willing, one month. If this needs time to play out with multiple check-ins, three months. If this could end up in front of a board, a lawyer, or an external party, six months or more. Type okay or proceed when you are ready.`,
      `How often should both of you check in? If things are moving fast and the situation is changing week to week, every week. If you need regular check-ins but there is no immediate urgency, every two weeks. If this is a slow-moving situation or a long-term record, once a month. Type okay or proceed when you are ready.`,
      `What do you need this ground to produce? Keep a record of what happened. Realign on what was agreed. Resolve a dispute. Document what was delivered. Get clarity before something new starts. Type okay or proceed when you are ready.`,
      `The first four sessions are free. No card required.\n\nYour first question will be about what specifically you were expecting and what you believe has or has not happened. Be as specific as you can. Names, dates, and concrete examples make the record strong.\n\nType okay or proceed when you are ready.`,
      `One last thing before your first question. Do you have anything you want to ask about how this works? Type okay or proceed when you are ready, or ask your question.`,
    ]
  }

  const onboardingMessages = preview
    ? buildParticipantOnboardingMessages(preview.initiatorName, preview.groundLabel)
    : []

  async function startCheckin() {
    if (!preview) return
    setLoading(true)
    try {
      const res = await entryApi.chat(
        [{
          role: 'user',
          content: `I am a participant invited by ${preview.initiatorName} to contribute my account of "${preview.groundLabel}". I have completed the onboarding. Please ask me your first specific check-in question about the situation. Reference the ground label. Do not open generically. Ask one direct specific question.`,
        }],
        preview.scenario,
        preview.groundLabel,
      )
      setMessages([{ role: 'assistant', content: res.reply }])
      setOnboardingStep(15)
    } catch {
      setMessages([{ role: 'assistant', content: 'Something went wrong starting your check-in. Please try again.' }])
    } finally {
      setLoading(false)
    }
  }

  async function sendMessage(text?: string) {
    const content = (text ?? input).trim()
    if (!content || loading || sessionEnded) return
    setInput('')
    if (taRef.current) taRef.current.style.height = '38px'

    if (onboardingStep <= 14) {
      // Onboarding phase — advance
      if (onboardingStep >= 14) {
        setOnboardingStep(15)
        startCheckin()
      } else {
        setOnboardingStep(s => s + 1)
      }
      return
    }

    // Free check-in phase
    const userTurn: ChatTurn = { role: 'user', content }
    const updatedHistory: ChatTurn[] = [
      ...messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      userTurn,
    ]
    setMessages(prev => [...prev, { role: 'user', content }, { role: 'assistant', content: '…' }])
    setLoading(true)

    try {
      const res = await entryApi.chat(updatedHistory, preview?.scenario, preview?.groundLabel)
      setMessages(prev => { const out = prev.filter(m => m.content !== '…'); return [...out, { role: 'assistant', content: res.reply }] })
      setFreeCheckinCount(n => n + 1)
    } catch {
      setMessages(prev => prev.filter(m => m.content !== '…').concat({ role: 'assistant', content: 'Something went wrong. Try again.' }))
    } finally {
      setLoading(false)
    }
  }

  async function endSession() {
    setSessionEnded(true)
    setGeneratingReport(true)
    setPhase('report')
    try {
      const turns: ChatTurn[] = messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))
      const res = await entryApi.report(turns, preview?.scenario, preview?.groundLabel)
      setSessionReport(res.report)
    } catch {
      setSessionReport(null)
    } finally {
      setGeneratingReport(false)
    }
  }

  async function handleSave() {
    const trimmed = email.trim()
    if (!trimmed || !trimmed.includes('@')) { setEmailError('Please enter a valid email address.'); return }
    setEmailError('')
    try {
      await authApi.requestMagicLink({ email: trimmed, firstName: trimmed.split('@')[0] })
      setEmailSent(true)
      try { localStorage.setItem('gw_pending_email', trimmed) } catch { /* */ }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setEmailError(msg ?? 'Could not send link. Please try again.')
    }
  }

  async function handleRequest() {
    if (!reqEmail.trim() || !reqReason.trim() || !preview) return
    const groundId = (preview as InvitePreviewWithGround).groundId
    if (!groundId) return
    try {
      await participantRequestsApi.create(groundId, {
        requestedEmail: reqEmail.trim(),
        requestedName: reqName.trim() || undefined,
        reason: reqReason.trim(),
        requestedByEmail: email.trim() || undefined,
      })
      setRequestedPeople(prev => [...prev, { email: reqEmail.trim(), name: reqName.trim() || undefined, reason: reqReason.trim() }])
      setReqEmail('')
      setReqName('')
      setReqReason('')
    } catch {
      // swallow — best effort
    }
  }

  if (!token) return <InviteShell><ErrorCard msg="This invite link is missing its token." /></InviteShell>
  if (isLoading) return <InviteShell><LoadingCard /></InviteShell>
  if (isError || !preview) return <InviteShell><ErrorCard msg="This invite link is invalid or has already been used." /></InviteShell>

  if (preview.alreadyAccepted) {
    return (
      <InviteShell>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 28, marginBottom: 12 }}>👋</div>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>You've already joined</div>
          <div style={{ fontSize: 13, color: 'var(--gw-sub)', marginBottom: 20 }}>
            Sign in to continue your check-in for <strong>{preview.groundLabel}</strong>.
          </div>
          <button className="gw-btn" style={{ display: 'inline-block', width: 'auto', padding: '10px 20px' }} onClick={() => navigate('/enter')}>
            Sign in →
          </button>
        </div>
      </InviteShell>
    )
  }

  // ---------- LANDING ----------
  if (phase === 'landing') {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--gw-bg)', display: 'flex', flexDirection: 'column' }}>
        <div className="gw-hdr">
          <a href="https://myground.work" target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex' }}><GroundworkLogo /></a>
        </div>

        <div className="gw-bd" style={{ maxWidth: 480, margin: '0 auto', width: '100%', paddingTop: 24 }}>
          <div className="gw-ttl">{preview.initiatorName} wants to hear your version</div>
          <div className="gw-sub-t">
            A Groundwork session about: <strong>{preview.groundLabel}</strong>.
          </div>

          {preview.roleAsDescribed && (
            <div style={{ fontSize: 13, color: 'var(--gw-sub)', marginBottom: 12 }}>
              Your role as described: <strong>{preview.roleAsDescribed}</strong>
            </div>
          )}

          <div className="gw-box gw-box-blue" style={{ marginBottom: 16 }}>
            Both sides check in separately and privately. Your version is yours —{' '}
            <strong>{preview.initiatorName} never sees what you write.</strong>{' '}
            A shared picture releases only after both of you complete two sessions.
          </div>

          <form onSubmit={(e) => {
            e.preventDefault()
            accept.mutate()
            setPhase('checkin')
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 4 }}>
              <div className="gw-fld" style={{ margin: 0 }}>
                <label className="gw-label">First name</label>
                <input className="gw-input" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Optional" />
              </div>
              <div className="gw-fld" style={{ margin: 0 }}>
                <label className="gw-label">Last name</label>
                <input className="gw-input" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Optional" />
              </div>
            </div>
            <button className="gw-btn" type="submit" style={{ marginTop: 12 }}>
              Add my version →
            </button>
          </form>

          <div style={{ marginTop: 14, fontSize: 12, color: 'var(--gw-muted)', textAlign: 'center' }}>
            By joining, you agree that your contribution record belongs to you.
          </div>

          <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid #E2E0DB', textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: 'var(--gw-sub)', marginBottom: 8, lineHeight: 1.6 }}>
              You are never obligated to take part. If you would rather not, you can simply close this —
              nothing is shared, and declining is never shown as a negative.
            </div>
            <button
              className="gw-back"
              style={{ width: 'auto', padding: '6px 14px', fontSize: 12 }}
              onClick={() => navigate('/')}
            >
              Not right now
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ---------- CHECK-IN ----------
  if (phase === 'checkin') {
    const inOnboarding = onboardingStep <= 14

    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--gw-bg)', overflow: 'hidden' }}>
        <div style={{ padding: '10px 20px', borderBottom: '1px solid var(--gw-border)', flexShrink: 0, background: 'white' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--gw-text)' }}>{preview.groundLabel}</div>
            {inOnboarding && (
              <div style={{ fontSize: 11, color: 'var(--gw-sub)', background: 'var(--gw-blue-bg)', borderRadius: 10, padding: '2px 9px', border: '0.5px solid var(--gw-blue-b)' }}>
                {onboardingStep} of 14
              </div>
            )}
          </div>
          <div style={{ fontSize: 11, color: 'var(--gw-sub)', marginTop: 2 }}>Your private check-in · session is about 10 minutes</div>
        </div>

        <div ref={msgsRef} style={{ flex: 1, overflowY: 'auto', padding: '20px 20px', display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 680, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
          {inOnboarding && onboardingMessages.slice(0, onboardingStep).map((msg, idx) => {
            const isActive = idx === onboardingStep - 1
            return (
              <div key={idx} style={{ opacity: isActive ? 1 : 0.42, transition: 'opacity .3s' }}>
                <div style={{ maxWidth: '88%', background: 'white', color: 'var(--gw-text)', border: '1px solid var(--gw-border)', borderRadius: '4px 16px 16px 16px', padding: '12px 16px', fontSize: 14, lineHeight: 1.7, whiteSpace: 'pre-wrap', boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
                  {msg}
                </div>
              </div>
            )
          })}

          {!inOnboarding && messages.map((m, i) => {
            const isActive = i === messages.length - 1
            return (
              <div key={i} style={{ maxWidth: '82%', alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', background: m.role === 'user' ? 'var(--gw-navy)' : 'white', color: m.role === 'user' ? 'white' : 'var(--gw-text)', border: m.role === 'assistant' ? '1px solid var(--gw-border)' : 'none', borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '4px 16px 16px 16px', padding: '10px 14px', fontSize: 14, lineHeight: 1.65, whiteSpace: 'pre-wrap', opacity: (m.content === '…') ? 0.45 : (m.role === 'assistant' && !isActive && messages.length > 2) ? 0.55 : 1, transition: 'opacity .3s', boxShadow: m.role === 'assistant' ? '0 1px 3px rgba(0,0,0,.06)' : 'none' }}>
                {m.content}
              </div>
            )
          })}

          {loading && inOnboarding && (
            <div style={{ fontSize: 13, color: 'var(--gw-sub)', textAlign: 'center', padding: 16 }}>Starting your check-in…</div>
          )}
        </div>

        {!inOnboarding && freeCheckinCount >= 5 && !sessionEnded && (
          <div style={{ padding: '8px 16px', borderTop: '1px solid var(--gw-border)', background: 'white', flexShrink: 0 }}>
            <div style={{ maxWidth: 680, margin: '0 auto' }}>
              <button
                onClick={endSession}
                style={{ width: '100%', padding: '10px 16px', borderRadius: 8, background: '#0A1628', color: 'white', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                End session →
              </button>
            </div>
          </div>
        )}

        <div style={{ borderTop: '1px solid var(--gw-border)', background: 'white', flexShrink: 0 }}>
          <div style={{ padding: '10px 16px', display: 'flex', gap: 8, alignItems: 'flex-end', maxWidth: 680, margin: '0 auto' }}>
            <textarea
              ref={taRef}
              placeholder={sessionEnded ? 'Your session is on record.' : inOnboarding ? 'Type okay or proceed when you are ready.' : 'Share what you have been working on.'}
              value={input}
              onChange={(e) => {
                setInput(e.target.value)
                e.target.style.height = '38px'
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  if (inOnboarding) {
                    const val = input.trim().toLowerCase()
                    if (val) {
                      setInput('')
                      if (onboardingStep >= 14) {
                        setOnboardingStep(15)
                        startCheckin()
                      } else {
                        setOnboardingStep(s => s + 1)
                      }
                    }
                  } else {
                    sendMessage()
                  }
                }
              }}
              disabled={loading || sessionEnded}
              style={{ flex: 1, resize: 'none', height: 38, maxHeight: 120, padding: '8px 10px', fontSize: 13, lineHeight: 1.4, border: '1px solid var(--gw-border)', borderRadius: 6, background: sessionEnded ? 'var(--gw-bg)' : 'white', fontFamily: 'inherit', outline: 'none', color: 'var(--gw-text)' }}
            />
            <button
              onClick={() => {
                if (inOnboarding) {
                  const val = input.trim()
                  if (val) {
                    setInput('')
                    if (onboardingStep >= 14) {
                      setOnboardingStep(15)
                      startCheckin()
                    } else {
                      setOnboardingStep(s => s + 1)
                    }
                  }
                } else {
                  sendMessage()
                }
              }}
              disabled={loading || sessionEnded || !input.trim()}
              style={{ padding: '0 14px', borderRadius: 6, background: 'var(--gw-navy)', color: 'white', border: 'none', cursor: 'pointer', fontSize: 18, flexShrink: 0, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: (loading || sessionEnded || !input.trim()) ? 0.35 : 1 }}
            >
              ↑
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ---------- REPORT ----------
  const groundId = (preview as InvitePreviewWithGround).groundId

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gw-bg)', display: 'flex', flexDirection: 'column' }}>
      <div className="gw-hdr">
        <a href="https://myground.work" target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex' }}><GroundworkLogo /></a>
      </div>

      <div style={{ maxWidth: 640, margin: '0 auto', width: '100%', padding: '0 16px 48px' }}>
        {/* Report header */}
        <div style={{ background: '#0A1628', color: 'white', borderRadius: '0 0 12px 12px', padding: '20px 22px 16px', marginBottom: 20 }}>
          <div style={{ fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase', color: '#5DCAA5', fontWeight: 700, marginBottom: 6 }}>Session 1 · your account</div>
          <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-.01em', lineHeight: 1.2 }}>{preview.groundLabel}</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,.5)', marginTop: 4 }}>Invited by {preview.initiatorName}</div>
        </div>

        {/* Cross-reference notice */}
        <div style={{ background: '#E0F5EF', border: '1px solid #5DCAA5', borderRadius: 10, padding: '12px 14px', marginBottom: 20, fontSize: 13, color: '#085041', lineHeight: 1.6 }}>
          {(preview as InvitePreviewWithGround).initiatorCheckedIn
            ? `${preview.initiatorName} has already checked in. Your report has been cross-referenced — you will both see the shared picture now.`
            : `Your account is private until ${preview.initiatorName} completes their session. Once both are in, you will both see the shared picture — where you agree, where you differ, and what that means.`}
        </div>

        {generatingReport && !sessionReport && (
          <div style={{ background: '#F5F3EF', borderRadius: 10, padding: '14px 16px', marginBottom: 18, fontSize: 13, color: '#6B6560' }}>
            Generating your session report…
          </div>
        )}

        {sessionReport && (
          <>
            {/* What Groundwork saw */}
            <div style={{ background: '#0A1628', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
              <div style={{ fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', color: '#5DCAA5', fontWeight: 700, marginBottom: 8 }}>What Groundwork saw</div>
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: 'rgba(255,255,255,.93)' }}>{sessionReport.whatGroundworkSaw}</p>
            </div>

            {/* Alignment status */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 10, letterSpacing: '.09em', textTransform: 'uppercase', color: '#9B9590', fontWeight: 700, marginBottom: 6 }}>Alignment status</div>
              <div style={{ fontSize: 17, fontWeight: 800, color: '#1A1916' }}>{sessionReport.alignmentStatus}</div>
              <div style={{ fontSize: 12, color: '#6B6560', marginTop: 3, lineHeight: 1.5 }}>{sessionReport.alignmentBasis}</div>
              <div style={{ display: 'flex', gap: 4, marginTop: 10 }}>
                {(['Unresolved', 'Mixed', 'Emerging', 'Clear', 'Aligned'] as const).map(s => {
                  const order = ['Unresolved', 'Mixed', 'Emerging', 'Clear', 'Aligned']
                  const on = order.indexOf(s) <= order.indexOf(sessionReport.alignmentStatus)
                  return (
                    <div key={s} style={{ flex: 1, textAlign: 'center', fontSize: 9, letterSpacing: '.03em', textTransform: 'uppercase', padding: '5px 2px', borderRadius: 5, fontWeight: 700, background: on ? '#0C447C' : '#EFEDE8', color: on ? 'white' : '#9B9590' }}>{s}</div>
                  )
                })}
              </div>
            </div>

            {/* Areas requiring alignment */}
            {sessionReport.areasRequiringAlignment.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 10, letterSpacing: '.09em', textTransform: 'uppercase', color: '#9B9590', fontWeight: 700 }}>Areas requiring alignment</div>
                </div>
                {sessionReport.areasRequiringAlignment.map((a, i) => (
                  <div key={i} style={{ border: '1px solid #E2E0DB', borderLeft: '3px solid #E8A94A', borderRadius: 10, padding: '11px 13px', marginBottom: 8 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 7 }}>{a.title}</div>
                    <div style={{ fontSize: 12, lineHeight: 1.5, marginBottom: 5 }}><span style={{ fontSize: 9, letterSpacing: '.07em', textTransform: 'uppercase', fontWeight: 700, color: '#9B9590', display: 'block', marginBottom: 1 }}>Observation</span>{a.observation}</div>
                    <div style={{ fontSize: 12, lineHeight: 1.5, marginBottom: 5 }}><span style={{ fontSize: 9, letterSpacing: '.07em', textTransform: 'uppercase', fontWeight: 700, color: '#9B9590', display: 'block', marginBottom: 1 }}>Why it matters</span>{a.whyItMatters}</div>
                    <div style={{ background: '#E7F6EF', borderRadius: 7, padding: '7px 9px', fontSize: 12, color: '#085041', lineHeight: 1.5 }}><span style={{ fontSize: 9, letterSpacing: '.07em', textTransform: 'uppercase', fontWeight: 700, color: '#085041', opacity: .75, display: 'block', marginBottom: 2 }}>Recommended move</span>{a.recommendedMove}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Alignment reached */}
            {sessionReport.alignmentReached.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 10, letterSpacing: '.09em', textTransform: 'uppercase', color: '#9B9590', fontWeight: 700 }}>Alignment reached</div>
                </div>
                {sessionReport.alignmentReached.map((a, i) => (
                  <div key={i} style={{ border: '1px solid #E2E0DB', borderLeft: '3px solid #5DCAA5', borderRadius: 10, padding: '11px 13px', marginBottom: 8 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{a.title}</div>
                    <div style={{ fontSize: 12, color: '#6B6560', lineHeight: 1.5 }}>{a.note}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Honest close */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 10, letterSpacing: '.09em', textTransform: 'uppercase', color: '#9B9590', fontWeight: 700 }}>An honest close</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  { k: 'Aligned', v: sessionReport.honestClose.aligned, bg: '#E7F6EF', kc: '#085041' },
                  { k: 'Open',    v: sessionReport.honestClose.open,    bg: '#FDF3E3', kc: '#8A5C1A' },
                  { k: 'Revisit', v: sessionReport.honestClose.revisit, bg: '#EEF4FB', kc: '#0C447C' },
                  { k: 'Risk',    v: sessionReport.honestClose.risk,    bg: '#F8ECEA', kc: '#B5675A' },
                ].map(({ k, v, bg, kc }) => (
                  <div key={k} style={{ background: bg, borderRadius: 8, padding: '9px 11px', fontSize: 12, lineHeight: 1.5, color: '#1A1916' }}>
                    <span style={{ fontSize: 9, letterSpacing: '.07em', textTransform: 'uppercase', fontWeight: 700, color: kc, display: 'block', marginBottom: 3 }}>{k}</span>
                    {v}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Divider */}
        <div style={{ borderTop: '1px solid #E2E0DB', marginBottom: 18 }} />

        {/* Save email */}
        {!emailSent ? (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#6B6560', marginBottom: 6 }}>Save my session</div>
            <input
              type="email" placeholder="you@company.com" value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              style={{ width: '100%', padding: '11px 13px', borderRadius: 8, border: '1px solid #E2E0DB', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: 8, outline: 'none' }}
            />
            {emailError && <div style={{ fontSize: 12, color: '#791F1F', marginBottom: 6 }}>{emailError}</div>}
            <button onClick={handleSave} style={{ width: '100%', padding: '12px 16px', borderRadius: 8, background: '#0C447C', color: 'white', fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
              Save my session →
            </button>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '10px 0', marginBottom: 20 }}>
            <div style={{ fontSize: 22, marginBottom: 6 }}>✓</div>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Check your email</div>
            <div style={{ fontSize: 13, color: '#6B6560', lineHeight: 1.6 }}>We sent a link to <strong>{email}</strong>. Click it to finish setting up your account.</div>
          </div>
        )}

        {/* Suggest more participants */}
        {groundId && (
          <div style={{ borderTop: '1px solid #E2E0DB', paddingTop: 18 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1916', marginBottom: 6 }}>Are there others who should be part of this ground?</div>
            <div style={{ fontSize: 12, color: '#6B6560', lineHeight: 1.55, marginBottom: 14 }}>
              If someone else should have their account heard, request them here. {preview.initiatorName} will see the request and decide whether to add them.
            </div>

            {requestedPeople.map((p, i) => (
              <div key={i} style={{ fontSize: 12, color: '#085041', background: '#E7F6EF', borderRadius: 6, padding: '6px 10px', marginBottom: 6 }}>
                ✓ Request sent — {p.name ? `${p.name} (${p.email})` : p.email} will be considered by {preview.initiatorName}.
              </div>
            ))}

            <div style={{ background: '#F5F3EF', border: '1px solid #E2E0DB', borderRadius: 10, padding: '14px 14px' }}>
              <div className="gw-fld" style={{ marginBottom: 8 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#6B6560', display: 'block', marginBottom: 4 }}>Name (optional)</label>
                <input
                  type="text" placeholder="Their name" value={reqName}
                  onChange={e => setReqName(e.target.value)}
                  style={{ width: '100%', padding: '9px 11px', borderRadius: 7, border: '1px solid #E2E0DB', fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none' }}
                />
              </div>
              <div className="gw-fld" style={{ marginBottom: 8 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#6B6560', display: 'block', marginBottom: 4 }}>Email</label>
                <input
                  type="email" placeholder="name@company.com" value={reqEmail}
                  onChange={e => setReqEmail(e.target.value)}
                  style={{ width: '100%', padding: '9px 11px', borderRadius: 7, border: '1px solid #E2E0DB', fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none' }}
                />
              </div>
              <div className="gw-fld" style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#6B6560', display: 'block', marginBottom: 4 }}>Why they matter to this situation</label>
                <textarea
                  placeholder="Explain why their account should be included…" value={reqReason}
                  onChange={e => setReqReason(e.target.value)} rows={3}
                  style={{ width: '100%', padding: '9px 11px', borderRadius: 7, border: '1px solid #E2E0DB', fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none', resize: 'vertical' }}
                />
              </div>
              <button
                onClick={handleRequest}
                disabled={!reqEmail.trim() || !reqReason.trim()}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 8, background: '#0A1628', color: 'white', fontSize: 13, fontWeight: 700, border: 'none', cursor: (!reqEmail.trim() || !reqReason.trim()) ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: (!reqEmail.trim() || !reqReason.trim()) ? 0.5 : 1 }}
              >
                Request
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Extends InvitePreview with optional fields the API may add later
interface InvitePreviewWithGround {
  groundId?: string
  initiatorCheckedIn?: boolean
}

function InviteShell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--gw-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: 'white', border: '1px solid #E2E0DB', borderRadius: 8, padding: '40px 32px', maxWidth: 400, width: '100%' }}>
        {children}
      </div>
    </div>
  )
}

function ErrorCard({ msg }: { msg: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 28, marginBottom: 12 }}>✕</div>
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Invalid invite</div>
      <div style={{ fontSize: 13, color: 'var(--gw-sub)' }}>{msg}</div>
    </div>
  )
}

function LoadingCard() {
  return (
    <div style={{ textAlign: 'center', color: 'var(--gw-muted)', fontSize: 13 }}>Loading invite…</div>
  )
}
