import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { entryApi } from '@/api/entry'
import { authApi } from '@/api/auth'
import { useEntryStore } from '@/stores/entry'
import { toast } from 'sonner'

const STORAGE_KEY = 'gw_entry_session'

interface Turn { role: 'user' | 'assistant'; content: string }
interface EntrySession {
  scenario: string
  history: Turn[]
  closed: boolean
  report?: string
  email?: string
  onboardingStep?: number
  onboardingSelections?: OnboardingSelections
}

interface OnboardingSelections {
  mode: string
  initial: string
  timeframe?: string
  cadence?: string
  decision?: string
}

function saveSession(s: EntrySession) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)) } catch { /* */ }
}
function loadSession(): EntrySession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const p = JSON.parse(raw)
    if (p?.history?.length || (p?.onboardingStep && p.onboardingStep > 0)) return p
  } catch { /* */ }
  return null
}
export function clearEntrySession() {
  try { localStorage.removeItem(STORAGE_KEY) } catch { /* */ }
}
export function hasPendingEntry(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return false
    const p = JSON.parse(raw)
    return !!(p?.history?.length)
  } catch { return false }
}

// Mode-specific opening lines
const MODE_OPENERS: Record<string, string> = {
  new: 'The best time to get both sides of a working relationship on record is before anything goes wrong. This tool builds that record from day one.',
  back: 'Some situations need more than a conversation. They need a record of what actually happened, cross-referenced against what was agreed and what each side delivered.',
  forward: 'Good working relationships do not happen by accident. They are built on clarity. This tool builds that clarity before it is needed.',
  both: 'Whether you need to get something on record or build a clear picture of what comes next, this tool handles both in one place.',
}

const MODE_LABELS: Record<string, string> = {
  new: 'Something new',
  back: 'Look back',
  forward: 'Look forward',
  both: 'Both',
}

const MODE_PLACEHOLDERS: Record<string, string> = {
  new: 'Who is involved and what are you trying to get right from the start?',
  back: 'What happened, with whom, and what needs to be on record?',
  forward: 'What needs to be agreed before the work begins?',
  both: 'What happened and what needs to happen next?',
}

// Scripted onboarding messages — ONBOARDING_STEPS total
const ONBOARDING_STEPS = 6

function buildOnboardingMessages(sels: OnboardingSelections): { text: string; buttons?: string[] }[] {
  const modeOpener = MODE_OPENERS[sels.mode] || MODE_OPENERS.new
  return [
    // Step 1 — brief intro
    {
      text: `${modeOpener}\n\nThis builds a private two-sided record. Both of you answer separately — neither sees the other's account until you both unlock the report together. Sessions take about ten minutes. Type okay or proceed when you are ready.`,
    },
    // Step 2 — how long (buttons)
    {
      text: `How long does this record need to run?`,
      buttons: ['1 week', '2 weeks', '1 month', '3 months', '6 months or more'],
    },
    // Step 3 — check-in frequency (buttons)
    {
      text: `How often should both of you check in?`,
      buttons: ['Daily', 'Weekly', 'Fortnightly', 'Monthly'],
    },
    // Step 4 — what kind of situation (buttons)
    {
      text: `What kind of situation is this?`,
      buttons: [
        'Starting something new — get both sides clear from day one',
        'Something went wrong — needs to be on record',
        'Need to realign — things have drifted',
        'Building an ongoing record — no specific issue yet',
      ],
    },
    // Step 5 — what to produce (buttons)
    {
      text: `What do you need this record to produce?`,
      buttons: [
        'A decision on whether this person stays in their role',
        'Evidence to support letting someone go',
        'A reset on what we both agreed to',
        'A document both sides can stand on',
        'Clarity before something new starts',
      ],
    },
    // Step 6 — confirmation (buttons)
    {
      text: `Got it.\n\n${sels.timeframe || '1 month'} · ${sels.cadence || 'weekly'} check-ins · ${sels.decision || 'alignment record'}.\n\nSessions 1 and 2 are free. A card is required before the session 2 report releases. Ready?`,
      buttons: ['Let us begin.', 'Change something.'],
    },
  ]
}

// Quick actions shown after the check-in starts
const QUICK_ACTIONS = [
  { label: 'Check in', msg: 'I want to keep going with my check-in.' },
  { label: 'My report', msg: 'Give me a summary of what my record shows so far.' },
  { label: 'What am I missing?', msg: 'What is missing from my record that would make it stronger?' },
  { label: 'Review my goals', msg: 'Review the goals I set at the start of this ground and tell me where I stand against each one.' },
  { label: 'Team cross-reference', msg: 'Cross-reference what I have shared with what you know about how the other party sees this situation.' },
]

export function EntryChatPage() {
  const [params] = useSearchParams()
  const scenario = params.get('scenario') ?? ''
  const urlMode = params.get('mode') ?? ''
  const urlInitial = params.get('initial') ?? ''

  const { groundName, setGroundName, sessions, setSessions } = useEntryStore()
  const [renamingGround, setRenamingGround] = useState(false)
  const [renameInput, setRenameInput] = useState('')
  const [editingSessions, setEditingSessions] = useState(false)
  const [sessionsInput, setSessionsInput] = useState('1')
  const [showSessionsUpgrade, setShowSessionsUpgrade] = useState(false)
  const groundRenameRef = useRef<HTMLInputElement>(null)

  // Onboarding state
  const defaultSels: OnboardingSelections = { mode: urlMode || 'new', initial: urlInitial || '' }
  const [onboardingStep, setOnboardingStep] = useState(1)
  const [onboardingSelections, setOnboardingSelections] = useState<OnboardingSelections>(defaultSels)
  const [onboardingMessages, setOnboardingMessages] = useState<{ text: string; buttons?: string[] }[]>(
    () => buildOnboardingMessages(defaultSels)
  )

  // Check-in chat state (phase 2)
  const [history, setHistory] = useState<Turn[]>([])
  const [displayedHistory, setDisplayedHistory] = useState<Turn[]>([])
  const [streamingIdx, setStreamingIdx] = useState<number | null>(null)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [closed, setClosed] = useState(false)
  const [phase, setPhase] = useState<'onboarding' | 'checkin'>('onboarding')

  // Save card
  const [showSave, setShowSave] = useState(false)
  const [sessionReport, setSessionReport] = useState<import('@/api/entry').EntryReport | null>(null)
  const [generatingReport, setGeneratingReport] = useState(false)
  const [orgName, setOrgName] = useState('')
  const [email, setEmail] = useState('')
  const [emailSent, setEmailSent] = useState(false)
  const [emailError, setEmailError] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteNote, setInviteNote] = useState('')
  const [inviteAdded, setInviteAdded] = useState<string[]>([])
  const [inviteContextFor, setInviteContextFor] = useState<string | null>(null)
  const [inviteContext, setInviteContext] = useState('')
  const [copiedLink, setCopiedLink] = useState(false)

  // Doc upload
  const [uploadedDoc, setUploadedDoc] = useState<{ name: string; content: string } | null>(null)
  const [docContextMode, setDocContextMode] = useState(false)
  const [docContext, setDocContext] = useState('')

  const msgsRef = useRef<HTMLDivElement>(null)
  const taRef = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // Seed ground name
  useEffect(() => {
    const defaultName = scenario ? scenario.replace(/\+/g, ' ') : 'Entry session'
    setGroundName(defaultName)
    setSessions(1)
  }, [])

  // Load or start session
  useEffect(() => {
    const saved = loadSession()
    if (saved && !saved.closed && !scenario) {
      // Restore existing session
      setHistory(saved.history)
      if (saved.report) { try { setSessionReport(JSON.parse(saved.report)) } catch { /* legacy plain text — discard */ } }
      if (saved.email) setEmail(saved.email)
      if (saved.onboardingSelections) {
        setOnboardingSelections(saved.onboardingSelections)
        setOnboardingMessages(buildOnboardingMessages(saved.onboardingSelections))
      }
      const step = saved.onboardingStep ?? 0
      if (step >= ONBOARDING_STEPS && saved.history.length > 0) {
        setPhase('checkin')
        setOnboardingStep(ONBOARDING_STEPS)
      } else if (step > 0) {
        setPhase('onboarding')
        setOnboardingStep(step)
      }
    } else {
      clearEntrySession()
      if (urlInitial || scenario) {
        const sels: OnboardingSelections = { mode: urlMode || 'new', initial: urlInitial || scenario || '' }
        setOnboardingSelections(sels)
        setOnboardingMessages(buildOnboardingMessages(sels))
        persistOnboarding([], sels, 1)
      }
    }
  }, [])

  function persistOnboarding(h: Turn[], sels: OnboardingSelections, step: number) {
    saveSession({ scenario, history: h, closed: false, onboardingStep: step, onboardingSelections: sels })
  }

  function persistCheckin(h: Turn[], cl = false, rep = '') {
    saveSession({ scenario, history: h, closed: cl, report: rep, onboardingStep: ONBOARDING_STEPS, onboardingSelections })
  }

  // Typewriter streaming effect for check-in phase
  useEffect(() => {
    if (phase !== 'checkin') return
    const lastIdx = history.length - 1
    const last = history[lastIdx]
    if (!last || last.role !== 'assistant' || last.content === '…') {
      setDisplayedHistory(history)
      setStreamingIdx(null)
      return
    }
    if (displayedHistory[lastIdx]?.content === last.content) return

    setStreamingIdx(lastIdx)
    let i = 0
    const full = last.content
    const CHUNK = 2
    const DELAY = 25
    const base = history.slice(0, lastIdx)
    const tick = setInterval(() => {
      i += CHUNK
      setDisplayedHistory([...base, { role: 'assistant', content: full.slice(0, i) }])
      if (i >= full.length) {
        clearInterval(tick)
        setDisplayedHistory(history)
        setStreamingIdx(null)
      }
    }, DELAY)
    return () => clearInterval(tick)
  }, [history, phase])

  useEffect(() => {
    if (msgsRef.current) msgsRef.current.scrollTop = msgsRef.current.scrollHeight
  }, [displayedHistory, loading, onboardingStep, phase])

  // Start first check-in question (AI-generated) after onboarding
  const startCheckin = useMutation({
    mutationFn: () => {
      const ctx = [
        onboardingSelections.mode ? `Situation type: ${onboardingSelections.mode}` : '',
        onboardingSelections.initial ? `Situation they described: ${onboardingSelections.initial}` : '',
        onboardingSelections.timeframe ? `Timeframe: ${onboardingSelections.timeframe}` : '',
        onboardingSelections.cadence ? `Check-in frequency: ${onboardingSelections.cadence}` : '',
        onboardingSelections.decision ? `What they need this ground to produce: ${onboardingSelections.decision}` : '',
      ].filter(Boolean).join('. ')
      return entryApi.chat([{
        role: 'user',
        content: `I have completed the onboarding. Here is my context. ${ctx}. Please ask me your first specific check-in question based on what I told you. Reference my situation and what I said I need. Do not open generically. Do not ask what my role is. Ask one direct specific question drawn from what I have shared.`,
      }], scenario || undefined, groundName || undefined)
    },
    onSuccess: (res) => {
      const h: Turn[] = [{ role: 'assistant', content: res.reply }]
      setHistory(h)
      setDisplayedHistory(h)
      setPhase('checkin')
      persistCheckin(h)
    },
    onError: () => toast.error('Could not start check-in. Please try again.'),
  })

  const sendMut = useMutation({
    mutationFn: (msgs: Turn[]) => entryApi.chat(msgs, scenario || undefined, groundName || undefined),
    onSuccess: (res, msgs) => {
      const newTurn: Turn = { role: 'assistant', content: res.reply }
      const updated = [...msgs, newTurn]
      setHistory(updated)
      setLoading(false)
      const engineClosed = res.reply.includes('Here is what is now in your record:') ||
        (res.reply.includes('now in your record') && res.reply.includes('next steps'))
      if (engineClosed && !closed) {
        setClosed(true)
        persistCheckin(updated, true)
        generateSessionReport(updated).then(() => setTimeout(() => setShowSave(true), 400))
      } else {
        persistCheckin(updated)
      }
    },
    onError: () => {
      setLoading(false)
      setHistory(prev => prev.filter(m => m.role !== 'assistant' || m.content !== '…'))
      toast.error('Message failed. Try again.')
    },
  })

  async function generateSessionReport(turns: Turn[]) {
    setGeneratingReport(true)
    try {
      const res = await entryApi.report(turns, scenario || undefined, groundName || undefined)
      setSessionReport(res.report)
      persistCheckin(turns, true, res.report ? JSON.stringify(res.report) : '')
    } catch {
      setSessionReport(null)
      persistCheckin(turns, true, '')
    } finally {
      setGeneratingReport(false)
    }
  }

  // Advance onboarding step
  function advanceOnboarding(buttonChoice?: string) {
    const currentStep = onboardingStep
    const msgs = onboardingMessages
    const msg = msgs[currentStep - 1]

    let newSels = { ...onboardingSelections }

    // Store selections for steps with buttons
    if (buttonChoice) {
      if (currentStep === 2) newSels = { ...newSels, timeframe: buttonChoice }
      if (currentStep === 3) newSels = { ...newSels, cadence: buttonChoice }
      if (currentStep === 4) newSels = { ...newSels, mode: buttonChoice }
      if (currentStep === 5) newSels = { ...newSels, decision: buttonChoice }
      if (currentStep === 6 && buttonChoice.startsWith('Change')) {
        // Reset to step 2
        setOnboardingStep(2)
        setOnboardingSelections(newSels)
        return
      }
      setOnboardingSelections(newSels)
      setOnboardingMessages(buildOnboardingMessages(newSels))
    }

    if (currentStep >= ONBOARDING_STEPS) {
      // Done with onboarding — start AI check-in
      setOnboardingStep(ONBOARDING_STEPS + 1)
      persistOnboarding([], newSels, ONBOARDING_STEPS)
      startCheckin.mutate()
      return
    }

    const nextStep = currentStep + 1
    setOnboardingStep(nextStep)
    persistOnboarding([], newSels, nextStep)

    // Auto-scroll
    setTimeout(() => {
      if (msgsRef.current) msgsRef.current.scrollTop = msgsRef.current.scrollHeight
    }, 50)
  }

  // Handle text input during onboarding
  function handleOnboardingInput(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return
    const val = (e.target as HTMLInputElement).value.trim().toLowerCase()
    if (!val) return
    if (['okay', 'ok', 'proceed', 'next', 'yes', 'y', 'sure', 'go', 'ready'].some(t => val.includes(t))) {
      setInput('')
      advanceOnboarding()
    }
  }

  // Check-in send
  function send(text?: string) {
    const content = (text ?? input).trim()
    if (!content || loading || closed) return
    setInput('')
    if (taRef.current) taRef.current.style.height = '38px'
    setLoading(true)
    const userTurn: Turn = { role: 'user', content }
    setUploadedDoc(null)
    setHistory(prev => [...prev, userTurn, { role: 'assistant', content: '…' }])
    sendMut.mutate([...history, userTurn])
  }

  function handleCheckinKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  function autoResize(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value)
    e.target.style.height = '38px'
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const content = (ev.target?.result as string) ?? ''
      setUploadedDoc({ name: file.name, content: content.slice(0, 8000) })
    }
    reader.onerror = () => toast.error('Could not read file.')
    if (file.type.startsWith('text/') || file.name.endsWith('.txt') || file.name.endsWith('.csv') || file.name.endsWith('.md')) {
      reader.readAsText(file)
    } else {
      setUploadedDoc({ name: file.name, content: `[Binary file: ${file.name}]` })
    }
    e.currentTarget.value = ''
    setDocContext('')
    setDocContextMode(true)
  }

  function submitDocContext() {
    const ctx = docContext.trim()
    setDocContextMode(false)
    if (!uploadedDoc) return
    const content = `[Document: "${uploadedDoc.name}"]\n${uploadedDoc.content}\n\nContext from me: ${ctx || 'See attached document.'}`
    setUploadedDoc(null)
    setDocContext('')
    setLoading(true)
    const userTurn: Turn = { role: 'user', content }
    setHistory(prev => [...prev, userTurn, { role: 'assistant', content: '…' }])
    sendMut.mutate([...history, userTurn])
  }

  async function handleSave() {
    const trimmed = email.trim()
    if (!trimmed || !trimmed.includes('@')) { setEmailError('Please enter a valid email address.'); return }
    setEmailError('')
    try {
      await authApi.requestMagicLink({ email: trimmed, firstName: trimmed.split('@')[0] })
      setEmailSent(true)
      try { localStorage.setItem('gw_pending_email', trimmed) } catch { /* */ }
    } catch (err: any) {
      setEmailError(err?.response?.data?.message ?? 'Could not send link. Please try again.')
    }
  }

  function copyInviteLink() {
    const link = `${window.location.origin}/invite?from=entry`
    navigator.clipboard.writeText(link).then(() => {
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2000)
    })
  }

  function addInviteEmail() {
    const e = inviteEmail.trim()
    if (!e || !e.includes('@')) return
    setInviteEmail('')
    setInviteContextFor(e)
    setInviteContext('')
  }

  function submitInviteContext() {
    if (!inviteContextFor) return
    const entry = inviteContextFor + (inviteContext.trim() ? ` — ${inviteContext.trim()}` : '')
    if (!inviteAdded.includes(inviteContextFor)) setInviteAdded(prev => [...prev, entry])
    setInviteContextFor(null)
    setInviteContext('')
  }

  const isCheckinLoading = startCheckin.isPending || (phase === 'checkin' && loading)
  const currentOnboardingMsg = onboardingMessages[onboardingStep - 1]

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--gw-bg)', position: 'relative', overflow: 'hidden' }}>

      {/* Session header */}
      <div style={{ padding: '10px 20px', borderBottom: '1px solid var(--gw-border)', flexShrink: 0, background: 'white', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ flex: 1 }}>
          {renamingGround ? (
            <input
              ref={groundRenameRef}
              value={renameInput}
              onChange={e => setRenameInput(e.target.value)}
              onBlur={() => { setGroundName(renameInput.trim() || groundName); setRenamingGround(false) }}
              onKeyDown={e => { if (e.key === 'Enter') { setGroundName(renameInput.trim() || groundName); setRenamingGround(false) } if (e.key === 'Escape') setRenamingGround(false) }}
              style={{ fontSize: 14, fontWeight: 700, color: 'var(--gw-text)', border: '1px solid var(--gw-border)', borderRadius: 5, padding: '2px 8px', fontFamily: 'inherit', outline: 'none', width: '100%', maxWidth: 320 }}
              autoFocus
            />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--gw-text)' }}>{groundName}</span>
              <button onClick={() => { setRenameInput(groundName); setRenamingGround(true) }} style={{ background: 'none', border: 'none', color: 'var(--gw-muted)', cursor: 'pointer', fontSize: 12, padding: 0, fontFamily: 'inherit' }} title="Rename">✎</button>
            </div>
          )}
          <div style={{ fontSize: 11, color: 'var(--gw-sub)', display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
            Getting started · session is about 10 minutes
          </div>
        </div>

        {/* Sessions counter */}
        <div style={{ flexShrink: 0, textAlign: 'right' }}>
          {editingSessions ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11, color: 'var(--gw-sub)' }}>sessions:</span>
              <input
                type="number" min={1} max={12}
                value={sessionsInput}
                onChange={e => setSessionsInput(e.target.value)}
                onBlur={() => {
                  const n = Math.max(1, parseInt(sessionsInput) || 1)
                  setSessions(n)
                  setSessionsInput(String(n))
                  setEditingSessions(false)
                  if (n > 1) setShowSessionsUpgrade(true)
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                  if (e.key === 'Escape') setEditingSessions(false)
                }}
                style={{ width: 44, fontSize: 13, border: '1px solid var(--gw-border)', borderRadius: 5, padding: '2px 6px', fontFamily: 'inherit', outline: 'none', textAlign: 'center' }}
                autoFocus
              />
            </div>
          ) : (
            <button
              onClick={() => { setSessionsInput(String(sessions)); setEditingSessions(true) }}
              style={{ background: 'none', border: '1px solid var(--gw-border)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontFamily: 'inherit' }}
              title="Edit number of sessions"
            >
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--gw-text)' }}>1/{sessions}</span>
              <span style={{ fontSize: 10, color: 'var(--gw-sub)', marginLeft: 4 }}>sessions</span>
            </button>
          )}
        </div>
      </div>

      {/* Sessions upgrade prompt */}
      {showSessionsUpgrade && (
        <div style={{ background: 'var(--gw-blue-bg)', borderBottom: '1px solid var(--gw-blue-b)', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <div style={{ flex: 1, fontSize: 13, color: 'var(--gw-navy)', lineHeight: 1.5 }}>
            <strong>{sessions} sessions</strong> needs an account. Save your session below, set up your org and payment, then continue.
          </div>
          <button onClick={() => { setShowSessionsUpgrade(false); setShowSave(true) }}
            style={{ flexShrink: 0, background: 'var(--gw-navy)', color: 'white', border: 'none', borderRadius: 7, padding: '7px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            Save &amp; set up →
          </button>
          <button onClick={() => setShowSessionsUpgrade(false)} style={{ background: 'none', border: 'none', color: 'var(--gw-sub)', cursor: 'pointer', fontSize: 14 }}>✕</button>
        </div>
      )}

      {/* Main content area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>

        {/* PHASE: MODE SELECTION */}
        {/* PHASE: ONBOARDING */}
        {phase === 'onboarding' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            {/* Messages */}
            <div
              ref={msgsRef}
              style={{ flex: 1, overflowY: 'auto', padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 680, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}
            >
              {/* Context line */}
              {onboardingSelections.initial && (
                <div style={{ fontSize: 12, color: 'var(--gw-muted)', textAlign: 'center', paddingBottom: 8 }}>
                  {MODE_LABELS[onboardingSelections.mode] || 'Something new'} · {onboardingSelections.initial}
                </div>
              )}

              {/* Show all messages up to current step, with message focus rule */}
              {onboardingMessages.slice(0, onboardingStep).map((msg, idx) => {
                const isActive = idx === onboardingStep - 1
                return (
                  <div key={idx} style={{ transition: 'opacity .3s', opacity: isActive ? 1 : 0.42 }}>
                    {/* AI message bubble */}
                    <div style={{
                      maxWidth: '88%',
                      alignSelf: 'flex-start',
                      background: 'white',
                      color: 'var(--gw-text)',
                      border: '1px solid var(--gw-border)',
                      borderRadius: '4px 16px 16px 16px',
                      padding: '12px 16px',
                      fontSize: 14,
                      lineHeight: 1.7,
                      whiteSpace: 'pre-wrap',
                      boxShadow: '0 1px 3px rgba(0,0,0,.06)',
                    }}>
                      {msg.text}
                    </div>

                    {/* Buttons for this step (only shown when active) */}
                    {isActive && msg.buttons && (
                      <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {msg.buttons.map(btn => (
                          <button
                            key={btn}
                            onClick={() => advanceOnboarding(btn)}
                            style={{
                              padding: '8px 14px', borderRadius: 20, fontSize: 12, fontWeight: 500,
                              border: '1px solid var(--gw-border)', background: 'white',
                              color: 'var(--gw-text)', cursor: 'pointer', fontFamily: 'inherit',
                              transition: 'all .15s',
                            }}
                            onMouseEnter={e => {
                              (e.target as HTMLButtonElement).style.background = 'var(--gw-navy)'
                              ;(e.target as HTMLButtonElement).style.color = 'white'
                              ;(e.target as HTMLButtonElement).style.borderColor = 'var(--gw-navy)'
                            }}
                            onMouseLeave={e => {
                              (e.target as HTMLButtonElement).style.background = 'white'
                              ;(e.target as HTMLButtonElement).style.color = 'var(--gw-text)'
                              ;(e.target as HTMLButtonElement).style.borderColor = 'var(--gw-border)'
                            }}
                          >
                            {btn}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Loading state when transitioning to check-in */}
              {startCheckin.isPending && (
                <div style={{ fontSize: 13, color: 'var(--gw-sub)', textAlign: 'center', padding: 16 }}>
                  Starting your check-in…
                </div>
              )}
            </div>

            {/* Input for "okay / proceed" — only shown when current step has no buttons */}
            {!startCheckin.isPending && currentOnboardingMsg && !currentOnboardingMsg.buttons && (
              <div style={{ borderTop: '1px solid var(--gw-border)', background: 'white', flexShrink: 0 }}>
                {/* Chip row */}
                <div style={{ padding: '6px 16px', borderBottom: '1px solid var(--gw-border)', display: 'flex', gap: 7, flexWrap: 'wrap', alignItems: 'center' }}>
                  <label htmlFor="onboarding-doc-upload" title="Upload a document"
                    style={{ padding: '4px 10px', borderRadius: 20, fontSize: 13, border: '1px solid var(--gw-border)', background: 'transparent', color: 'var(--gw-sub)', cursor: 'pointer', fontFamily: 'inherit' }}>
                    📎 Upload doc
                  </label>
                  <input ref={fileRef} type="file" id="onboarding-doc-upload" accept=".pdf,.doc,.docx,.txt,.csv,.xlsx,.png,.jpg,.jpeg,.md" style={{ display: 'none' }} onChange={handleFileChange} />
                </div>
                <div style={{ padding: '10px 16px' }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', maxWidth: 680, margin: '0 auto' }}>
                    <input
                      type="text"
                      placeholder="Type okay or proceed when you are ready."
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          const val = input.trim().toLowerCase()
                          if (val) {
                            setInput('')
                            advanceOnboarding()
                          }
                        }
                      }}
                      style={{
                        flex: 1, padding: '10px 12px', fontSize: 13, border: '1px solid var(--gw-border)',
                        borderRadius: 6, fontFamily: 'inherit', outline: 'none', background: 'white',
                        color: 'var(--gw-text)',
                      }}
                      autoFocus
                    />
                    <button
                      onClick={() => { if (input.trim()) { setInput(''); advanceOnboarding() } }}
                      style={{ padding: '0 14px', borderRadius: 6, background: 'var(--gw-navy)', color: 'white', border: 'none', cursor: 'pointer', fontSize: 18, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      ↑
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* PHASE: CHECK-IN (AI-driven, message 15+) */}
        {phase === 'checkin' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <div
              ref={msgsRef}
              style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 680, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}
            >
              {startCheckin.isPending && (
                <div style={{ fontSize: 13, color: 'var(--gw-sub)', textAlign: 'center', padding: 24 }}>Starting your check-in…</div>
              )}
              {displayedHistory.map((m, i) => {
                const isActive = i === displayedHistory.length - 1
                return (
                  <div
                    key={i}
                    style={{
                      maxWidth: '82%',
                      alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                      background: m.role === 'user' ? 'var(--gw-navy)' : 'white',
                      color: m.role === 'user' ? 'white' : 'var(--gw-text)',
                      border: m.role === 'assistant' ? '1px solid var(--gw-border)' : 'none',
                      borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '4px 16px 16px 16px',
                      padding: '10px 14px',
                      fontSize: 14,
                      lineHeight: 1.65,
                      whiteSpace: 'pre-wrap',
                      opacity: (m.content === '…') ? 0.45 : (m.role === 'assistant' && !isActive && displayedHistory.length > 2) ? 0.55 : 1,
                      transition: 'opacity .3s',
                      boxShadow: m.role === 'assistant' ? '0 1px 3px rgba(0,0,0,.06)' : 'none',
                    }}
                  >
                    {m.content}
                    {streamingIdx === i && <span style={{ display: 'inline-block', width: 2, height: '1em', background: 'var(--gw-navy)', marginLeft: 2, verticalAlign: 'text-bottom', animation: 'blink .7s step-end infinite' }} />}
                  </div>
                )
              })}
            </div>

            {/* Quick action chips */}
            {!closed && displayedHistory.length >= 1 && (
              <div style={{ padding: '8px 16px', borderTop: '1px solid var(--gw-border)', display: 'flex', gap: 7, flexWrap: 'wrap', flexShrink: 0, background: 'white', alignItems: 'center' }}>
                {QUICK_ACTIONS.map(a => (
                  <button key={a.label} onClick={() => send(a.msg)} disabled={loading}
                    style={{ padding: '5px 12px', borderRadius: 20, fontSize: 12, border: '1px solid var(--gw-border)', background: 'transparent', color: 'var(--gw-sub)', cursor: 'pointer', fontFamily: 'inherit', opacity: loading ? 0.5 : 1 }}>
                    {a.label}
                  </button>
                ))}
                <button onClick={() => send('What patterns are you noticing in what I have shared so far?')} disabled={loading}
                  style={{ padding: '5px 12px', borderRadius: 20, fontSize: 12, border: '1px solid var(--gw-border)', background: 'transparent', color: 'var(--gw-sub)', cursor: 'pointer', fontFamily: 'inherit', opacity: loading ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: 4 }}>
                  Patterns
                  <span style={{ background: 'var(--gw-navy)', color: 'white', borderRadius: 10, fontSize: 10, fontWeight: 700, padding: '0px 5px', lineHeight: '16px' }}>1</span>
                </button>
                <label htmlFor="entry-doc-upload-chip" title="Upload a document"
                  style={{ padding: '5px 10px', borderRadius: 20, fontSize: 13, border: '1px solid var(--gw-border)', background: 'transparent', color: 'var(--gw-sub)', cursor: 'pointer', fontFamily: 'inherit', opacity: loading ? 0.5 : 1 }}>
                  📎
                </label>
                <input ref={fileRef} type="file" id="entry-doc-upload-chip" accept=".pdf,.doc,.docx,.txt,.csv,.xlsx,.png,.jpg,.jpeg,.md" style={{ display: 'none' }} onChange={handleFileChange} />
              </div>
            )}

            {/* Attached doc pill */}
            {uploadedDoc && (
              <div style={{ padding: '6px 16px', background: 'var(--gw-blue-bg)', borderTop: '1px solid var(--gw-blue-b)', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <span style={{ fontSize: 12, color: 'var(--gw-navy)', flex: 1 }}>📎 {uploadedDoc.name}</span>
                <button onClick={() => setUploadedDoc(null)} style={{ fontSize: 11, color: 'var(--gw-sub)', background: 'none', border: 'none', cursor: 'pointer' }}>× remove</button>
              </div>
            )}

            {/* Input bar */}
            <div style={{ borderTop: '1px solid var(--gw-border)', background: 'white', flexShrink: 0 }}>
              <div style={{ padding: '10px 16px', display: 'flex', gap: 8, alignItems: 'flex-end', maxWidth: 680, margin: '0 auto' }}>
                <textarea
                  ref={taRef}
                  placeholder={closed ? 'Your session is on record.' : 'Share what you have been working on.'}
                  value={input}
                  onChange={autoResize}
                  onKeyDown={handleCheckinKey}
                  disabled={loading || closed}
                  style={{ flex: 1, resize: 'none', height: 38, maxHeight: 120, padding: '8px 10px', fontSize: 13, lineHeight: 1.4, border: '1px solid var(--gw-border)', borderRadius: 6, background: closed ? 'var(--gw-bg)' : 'white', fontFamily: 'inherit', outline: 'none', color: 'var(--gw-text)' }}
                />
                <button onClick={() => send()} disabled={loading || closed || !input.trim()}
                  style={{ padding: '0 14px', borderRadius: 6, background: 'var(--gw-navy)', color: 'white', border: 'none', cursor: 'pointer', fontSize: 18, flexShrink: 0, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: (loading || closed || !input.trim()) ? 0.35 : 1 }}>
                  ↑
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Doc context overlay */}
      {docContextMode && uploadedDoc && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ background: 'white', borderRadius: '14px 14px 0 0', padding: '20px 20px 32px', width: '100%', maxWidth: 560 }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--gw-border)', margin: '0 auto 16px' }} />
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gw-text)', marginBottom: 4 }}>📎 {uploadedDoc.name}</div>
            <div style={{ fontSize: 13, color: 'var(--gw-sub)', marginBottom: 12, lineHeight: 1.55 }}>
              What context does this document support from what you have shared so far?
            </div>
            <textarea autoFocus placeholder="e.g. This is the brief I referenced when I mentioned the project scope…"
              value={docContext} onChange={e => setDocContext(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitDocContext() } }}
              style={{ width: '100%', resize: 'none', minHeight: 80, padding: '10px 12px', fontSize: 13, lineHeight: 1.55, border: '1px solid var(--gw-border)', borderRadius: 8, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', marginBottom: 10 }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { setDocContextMode(false); setUploadedDoc(null) }} style={{ padding: '10px 16px', borderRadius: 8, background: 'none', border: '1px solid var(--gw-border)', color: 'var(--gw-sub)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
              <button onClick={submitDocContext} style={{ flex: 1, padding: '10px 16px', borderRadius: 8, background: 'var(--gw-navy)', color: 'white', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Add to session</button>
            </div>
          </div>
        </div>
      )}

      {/* Save card */}
      <div style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 30,
        opacity: showSave ? 1 : 0, pointerEvents: showSave ? 'auto' : 'none',
        transition: 'opacity .3s',
        overflowY: 'auto', display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: '24px 16px 48px',
      }}>
        <div style={{ width: '100%', maxWidth: 640, background: 'white', borderRadius: 14, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,.22)' }}>

          {/* Report header */}
          <div style={{ background: '#0A1628', color: 'white', padding: '20px 22px 16px' }}>
            <div style={{ fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase', color: '#5DCAA5', fontWeight: 700, marginBottom: 6 }}>Session 1 · your account</div>
            <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-.01em', lineHeight: 1.2 }}>{groundName || 'Your session is on record.'}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,.5)', marginTop: 4 }}>The other side appears when your participant checks in.</div>
          </div>

          <div style={{ padding: '18px 20px 28px' }}>

            {/* Generating state */}
            {generatingReport && !sessionReport && (
              <div style={{ background: '#F5F3EF', borderRadius: 10, padding: '14px 16px', marginBottom: 18, fontSize: 13, color: '#6B6560' }}>
                Generating your session report…
              </div>
            )}

            {/* Structured report */}
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
                    {(['Unresolved','Mixed','Emerging','Clear','Aligned'] as const).map(s => {
                      const order = ['Unresolved','Mixed','Emerging','Clear','Aligned']
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
                    <div style={{ fontSize: 10, letterSpacing: '.09em', textTransform: 'uppercase', color: '#9B9590', fontWeight: 700, marginBottom: 8 }}>Areas requiring alignment</div>
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
                    <div style={{ fontSize: 10, letterSpacing: '.09em', textTransform: 'uppercase', color: '#9B9590', fontWeight: 700, marginBottom: 8 }}>Alignment reached</div>
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
                  <div style={{ fontSize: 10, letterSpacing: '.09em', textTransform: 'uppercase', color: '#9B9590', fontWeight: 700, marginBottom: 8 }}>An honest close</div>
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

            {/* Ground + org naming */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#6B6560', marginBottom: 6 }}>Name this ground</div>
              <input
                type="text" placeholder="e.g. Kwame — first 90 days" value={groundName}
                onChange={e => setGroundName(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #E2E0DB', fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none', marginBottom: 8 }}
              />
              <input
                type="text" placeholder="Organisation name (optional)" value={orgName}
                onChange={e => setOrgName(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #E2E0DB', fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none' }}
              />
            </div>

            {/* Save / email */}
            {!emailSent ? (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#6B6560', marginBottom: 6 }}>Save your session</div>
                <input type="email" placeholder="you@company.com" value={email} onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSave()}
                  style={{ width: '100%', padding: '11px 13px', borderRadius: 8, border: '1px solid #E2E0DB', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: 8, outline: 'none' }}
                />
                {emailError && <div style={{ fontSize: 12, color: '#791F1F', marginBottom: 6 }}>{emailError}</div>}
                <button onClick={handleSave} style={{ width: '100%', padding: '12px 16px', borderRadius: 8, background: '#0C447C', color: 'white', fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                  Save my session →
                </button>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '10px 0', marginBottom: 16 }}>
                <div style={{ fontSize: 22, marginBottom: 6 }}>✓</div>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Check your email</div>
                <div style={{ fontSize: 13, color: '#6B6560', lineHeight: 1.6 }}>We sent a link to <strong>{email}</strong>. Click it to finish setting up your account.</div>
              </div>
            )}

            {/* Invite participants */}
            <div style={{ borderTop: '1px solid #E2E0DB', paddingTop: 16, marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#6B6560', marginBottom: 6 }}>Invite the other party</div>
              <div style={{ fontSize: 12, color: '#9B9590', lineHeight: 1.55, marginBottom: 10 }}>
                They submit their own account independently — without seeing yours. Both accounts are cross-referenced to produce the report.
              </div>

              {inviteAdded.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 }}>
                  {inviteAdded.map(e => (
                    <div key={e} style={{ fontSize: 12, color: '#085041', background: '#E7F6EF', borderRadius: 6, padding: '5px 10px' }}>✓ {e}</div>
                  ))}
                </div>
              )}

              {inviteContextFor ? (
                <div style={{ background: '#F5F3EF', border: '1px solid #E2E0DB', borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1916', marginBottom: 4 }}>{inviteContextFor}</div>
                  <div style={{ fontSize: 12, color: '#6B6560', marginBottom: 8, lineHeight: 1.5 }}>How is this person connected to what you shared?</div>
                  <textarea autoFocus placeholder="e.g. This is the person I mentioned…"
                    value={inviteContext} onChange={e => setInviteContext(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitInviteContext() } }}
                    style={{ width: '100%', resize: 'none', minHeight: 60, padding: '8px 10px', fontSize: 13, lineHeight: 1.5, border: '1px solid #E2E0DB', borderRadius: 7, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', marginBottom: 8 }}
                  />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => { setInviteContextFor(null); setInviteContext('') }} style={{ padding: '8px 14px', borderRadius: 7, background: 'none', border: '1px solid #E2E0DB', color: '#6B6560', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>Skip</button>
                    <button onClick={submitInviteContext} style={{ flex: 1, padding: '8px 14px', borderRadius: 7, background: '#0C447C', color: 'white', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Add participant</button>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <input type="email" placeholder="name@company.com" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addInviteEmail()}
                      style={{ flex: 1, padding: '10px 12px', borderRadius: 8, border: '1px solid #E2E0DB', fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none' }}
                    />
                    <button onClick={addInviteEmail} style={{ flexShrink: 0, padding: '10px 16px', borderRadius: 8, background: '#0C447C', color: 'white', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Add</button>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1, fontSize: 12, color: '#0C447C', background: '#EEF4FB', border: '0.5px solid #BFDBFE', borderRadius: 7, padding: '8px 10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {window.location.origin}/invite?from=entry
                    </div>
                    <button onClick={copyInviteLink} style={{ flexShrink: 0, padding: '8px 12px', borderRadius: 7, background: '#F5F3EF', color: '#1A1916', fontSize: 12, fontWeight: 600, border: '0.5px solid #E2E0DB', cursor: 'pointer', fontFamily: 'inherit' }}>
                      {copiedLink ? 'Copied!' : 'Copy link'}
                    </button>
                  </div>
                  <input type="text" placeholder="Add a note to send with your link (optional)" value={inviteNote} onChange={e => setInviteNote(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #E2E0DB', fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none', marginTop: 8 }}
                  />
                </>
              )}
            </div>

            <div onClick={() => setShowSave(false)} style={{ textAlign: 'center', fontSize: 12, color: '#9B9590', cursor: 'pointer', paddingTop: 4 }}>
              Later
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
