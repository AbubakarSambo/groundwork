import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { participantApi, participantStorage, entryApi } from '@/api/entry'
import type { EntryMessage, ParticipantSession } from '@/api/entry'
import { SaveCard } from './SaveCard'
import { toast } from 'sonner'

// ── Types ──────────────────────────────────────────────────────────────────

interface DMsg {
  id: string
  from: 'ai' | 'user'
  content: string
  isLoading?: boolean
}

interface PState {
  token: string
  groundLabel: string
  adminName: string
  multiParty: boolean
  step: number
  purpose: string
  email: string
  matchAnswer?: string
  selectedGoals?: string[]
  msgs: DMsg[]
  history: EntryMessage[]
  phase: 'onboarding' | 'email' | 'faq' | 'checkin' | 'done'
  faqState: 'input' | 'next'
}

const SK = 'gw-p-ob-v2'
const pStore = {
  save: (s: PState) => { try { localStorage.setItem(SK, JSON.stringify(s)) } catch {} },
  load: (): PState | null => { try { const r = localStorage.getItem(SK); return r ? JSON.parse(r) : null } catch { return null } },
  clear: () => localStorage.removeItem(SK),
}

// ── Message content ────────────────────────────────────────────────────────

const PARTICIPANT_GOAL_OPTIONS = [
  'I delivered what was agreed',
  'Expectations were unclear',
  'Important context is missing',
  'The situation needs to be reset',
  'I want my account on record',
  'I want a clearer understanding of what happened',
  'Document what I found or contributed',
  'Track my progress against what was agreed',
  'Report on what I observed',
  'I want to show what I actually did and where it can be verified',
  'I want to give an independent view before others weigh in',
  'Something else',
]

const ROLE_OPTIONS = ['Project lead', 'Manager', 'Team member', 'Cofounder', 'Partner', 'Client', 'Board member', 'Advisor', 'Something else']

const PARTICIPANT_ONBOARDING_STEPS = 4

function stepContent(step: number, adminName: string, groundLabel: string, _multiParty: boolean, matchAnswer?: string, purpose?: string): string {
  switch (step) {
    case 1:
      return `${adminName} has opened a record and wants your view on it.\n\nEveryone adds their own account. You write what you have seen, what you know, what you have experienced. Nobody reads your words directly. What the report shows is where accounts agree and where they differ. Your words stay yours. The admin releases the report when ready.\n\nThe record is about:\n${groundLabel}\n\nIs this an accurate description of what you are part of?`
    case 2:
      if (matchAnswer === 'yes') {
        return `Good.\n\nYou are not here to respond to what ${adminName} said. You have not seen it. Just your own account, as you saw it happen.\n\nWhat is your role in this?`
      }
      return `Good. That difference is exactly why your account matters.\n\nHow would you describe what this situation is about?`
    case 3:
      return `What do you most want on record from your side?`
    case 4: {
      const hasUncertainty = purpose && (purpose.includes('Expectations were unclear') || purpose.includes('Important context is missing'))
      return hasUncertainty
        ? `Tell me what you know, and where the gaps are.`
        : `What have you seen, done, or been part of that makes that matter?`
    }
    default:
      return ''
  }
}

type Layout = 'list' | 'row'
function stepButtons(step: number, _multiParty: boolean, _matchAnswer?: string): { options: string[]; layout: Layout; multiSelect?: boolean; hint?: string } | null {
  if (step === 1) return { options: ['Yes', 'No'], layout: 'row' }
  if (step === 2 && _matchAnswer === 'yes') return { options: ROLE_OPTIONS, layout: 'list', hint: 'Pick the one that fits best.' }
  if (step === 3) return { options: PARTICIPANT_GOAL_OPTIONS, layout: 'list', multiSelect: true, hint: 'Pick what applies, or describe it below.' }
  return null
}

// Unified quick actions for the check-in phase
const QUICK_ACTIONS = [
  { label: 'What am I missing?', msg: 'What is missing from my record that would make it stronger?' },
  { label: 'Add a document', action: 'upload' as const },
  { label: 'I am done', msg: 'I have covered everything I want on record and I am done.' },
]

// ── Component ──────────────────────────────────────────────────────────────

export function ParticipantOnboardingChat() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token') ?? ''
  const groundLabel = searchParams.get('groundLabel') ?? ''
  const adminName = searchParams.get('initiatorName') ?? ''
  const multiParty = searchParams.get('multiParty') === 'true'

  const [step, setStep] = useState(1)
  const [msgs, setMsgs] = useState<DMsg[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [phase, setPhase] = useState<'onboarding' | 'email' | 'faq' | 'checkin' | 'done'>('onboarding')
  const [faqState, setFaqState] = useState<'input' | 'next'>('input')
  const [done, setDone] = useState(false)
  const [showIntro, setShowIntro] = useState(true)
  const [matchAnswer, setMatchAnswer] = useState<string>('')
  const [selectedGoals, setSelectedGoals] = useState<string[]>([])
  const [emailCapture, setEmailCapture] = useState('')
  const [showDonePrompt, setShowDonePrompt] = useState(false)

  const msgsRef = useRef<HTMLDivElement>(null)
  const taRef = useRef<HTMLTextAreaElement>(null)
  const docInputRef = useRef<HTMLInputElement>(null)
  const historyRef = useRef<EntryMessage[]>([])
  const purposeRef = useRef('')

  const uploadDoc = useMutation({
    mutationFn: (file: File) => participantApi.uploadDocument(token, file),
    onSuccess: (doc) => {
      const ackMsg: DMsg = { id: `doc-${doc.id}`, from: 'ai', content: `Document received: "${doc.name}". Tell me what it shows and why it is relevant.` }
      setMsgs(v => [...v, ackMsg])
    },
    onError: () => toast.error('Upload failed. Please try again.'),
  })

  // ── Mount ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!token) { navigate('/'); return }
    const saved = pStore.load()
    if (saved && saved.token === token) {
      setStep(saved.step)
      purposeRef.current = saved.purpose
      if (saved.matchAnswer) setMatchAnswer(saved.matchAnswer)
      if (saved.email) setEmailCapture(saved.email)
      setMsgs(saved.msgs.filter(m => !m.isLoading))
      historyRef.current = saved.history
      setPhase(saved.phase)
      setFaqState(saved.faqState)
      if (saved.phase === 'done') setDone(true)
      setShowIntro(false)
    } else {
      pStore.clear()
      const first: DMsg = { id: 'ai-1', from: 'ai', content: stepContent(1, adminName, groundLabel, multiParty) }
      setMsgs([first])
      pStore.save({ token, groundLabel, adminName, multiParty, step: 1, purpose: '', email: '', msgs: [first], history: [], phase: 'onboarding', faqState: 'input' })
    }
  }, [])

  useEffect(() => {
    if (msgsRef.current) msgsRef.current.scrollTop = msgsRef.current.scrollHeight
  }, [msgs])

  // ── Onboarding advancement ────────────────────────────────────────────────

  function pushStep(nextStep: number, p: string, base: DMsg[], ma?: string) {
    if (nextStep > PARTICIPANT_ONBOARDING_STEPS) {
      // Email capture before check-in begins
      const emailPrompt: DMsg = {
        id: `email-prompt-${Date.now()}`,
        from: 'ai',
        content: `What email should I send your account link to?\n\nYou will use it to sign in and see your record when the report is ready.`,
      }
      const next = [...base, emailPrompt]
      setMsgs(next)
      setPhase('email')
      pStore.save({ token, groundLabel, adminName, multiParty, step: nextStep, purpose: p, email: emailCapture, matchAnswer: ma ?? matchAnswer, msgs: next, history: [], phase: 'email', faqState: 'input' })
      return
    }
    const content = stepContent(nextStep, adminName, groundLabel, multiParty, ma ?? matchAnswer, p)
    const next = [...base, { id: `ai-${nextStep}-${Date.now()}`, from: 'ai' as const, content }]
    setMsgs(next)
    setStep(nextStep)
    pStore.save({ token, groundLabel, adminName, multiParty, step: nextStep, purpose: p, email: emailCapture, matchAnswer: ma ?? matchAnswer, msgs: next, history: [], phase: 'onboarding', faqState: 'input' })
  }

  function handleTextSubmit() {
    const val = input.trim()
    if (!val || loading) return
    setInput('')
    if (taRef.current) taRef.current.style.height = '38px'

    if (step === 3) {
      // Free text goal - combine with any multi-select choices
      const goals = selectedGoals.length > 0 ? [...selectedGoals, val] : [val]
      const combined = goals.join(', ')
      purposeRef.current = combined
      setSelectedGoals([])
      const userMsg: DMsg = { id: `u-3-${Date.now()}`, from: 'user', content: val }
      const withUser = [...msgs, userMsg]
      setMsgs(withUser)
      pushStep(4, combined, withUser)
      return
    }

    if (step === 4) {
      purposeRef.current = purposeRef.current + `. Initial context: ${val}`
      const userMsg: DMsg = { id: `u-4-${Date.now()}`, from: 'user', content: val }
      const withUser = [...msgs, userMsg]
      setMsgs(withUser)
      pushStep(PARTICIPANT_ONBOARDING_STEPS + 1, purposeRef.current, withUser)
      return
    }

    purposeRef.current = purposeRef.current || val
    const userMsg: DMsg = { id: `u-${step}-${Date.now()}`, from: 'user', content: val }
    const withUser = [...msgs.filter(m => !m.isLoading), userMsg]
    setMsgs(withUser)
    pushStep(step + 1, purposeRef.current, withUser)
  }

  function handleEmailSubmit() {
    const val = input.trim()
    if (!val || loading) return
    setInput('')
    if (taRef.current) taRef.current.style.height = '38px'
    setEmailCapture(val)
    const userMsg: DMsg = { id: `email-u-${Date.now()}`, from: 'user', content: val }
    const withUser = [...msgs, userMsg]
    setMsgs(withUser)
    triggerCheckIn(purposeRef.current, withUser, val)
  }

  function handleButton(btn: string) {
    // Step 1: match answer
    if (step === 1) {
      const ma = btn.toLowerCase() === 'yes' ? 'yes' : 'no'
      setMatchAnswer(ma)
      const userMsg: DMsg = { id: `u-btn-1-${Date.now()}`, from: 'user', content: btn }
      const withUser = [...msgs, userMsg]
      setMsgs(withUser)
      pushStep(2, purposeRef.current, withUser, ma)
      return
    }

    // Step 2 (Yes path): role option
    if (step === 2 && matchAnswer === 'yes' && ROLE_OPTIONS.includes(btn)) {
      purposeRef.current = btn === 'Something else' ? 'Role: other' : `Role: ${btn}`
      const userMsg: DMsg = { id: `u-btn-2-${Date.now()}`, from: 'user', content: btn }
      const withUser = [...msgs, userMsg]
      setMsgs(withUser)
      pushStep(3, purposeRef.current, withUser)
      return
    }

    // Step 3: multi-select goal toggle
    if (step === 3 && PARTICIPANT_GOAL_OPTIONS.includes(btn)) {
      setSelectedGoals(prev =>
        prev.includes(btn) ? prev.filter(g => g !== btn) : [...prev, btn]
      )
      return
    }

    const userMsg: DMsg = { id: `u-btn-${step}-${Date.now()}`, from: 'user', content: btn }
    const withUser = [...msgs, userMsg]
    setMsgs(withUser)
    pushStep(step + 1, purposeRef.current, withUser)
  }

  function confirmGoals() {
    if (selectedGoals.length === 0) return
    const combined = selectedGoals.join(', ')
    purposeRef.current = combined
    setSelectedGoals([])
    const userMsg: DMsg = { id: `u-goals-${Date.now()}`, from: 'user', content: selectedGoals.join('\n') }
    const withUser = [...msgs, userMsg]
    setMsgs(withUser)
    pushStep(4, combined, withUser)
  }

  // ── FAQ interlude ─────────────────────────────────────────────────────────

  function handleFaqQuestion() {
    const val = input.trim()
    if (!val || loading) return
    setInput('')
    if (taRef.current) taRef.current.style.height = '38px'

    const userMsg: DMsg = { id: `faq-q-${Date.now()}`, from: 'user', content: val }
    const loadMsg: DMsg = { id: 'faq-load', from: 'ai', content: '…', isLoading: true }
    const withLoad = [...msgs, userMsg, loadMsg]
    setMsgs(withLoad)
    setLoading(true)

    entryApi.faq(val).then(res => {
      const answerMsg: DMsg = { id: `faq-a-${Date.now()}`, from: 'ai', content: res.reply }
      const nextMsg: DMsg = { id: `faq-nxt-${Date.now()}`, from: 'ai', content: 'Anything else or shall we begin?' }
      const withAnswer = [...withLoad.filter(m => !m.isLoading), answerMsg, nextMsg]
      setMsgs(withAnswer)
      setFaqState('next')
      setLoading(false)
      pStore.save({ token, groundLabel, adminName, multiParty, step: 7, purpose: purposeRef.current, email: emailCapture, msgs: withAnswer, history: [], phase: 'faq', faqState: 'next' })
    }).catch(() => {
      setMsgs(withLoad.filter(m => !m.isLoading))
      setLoading(false)
    })
  }

  function handleFaqNext(btn: string) {
    const userMsg: DMsg = { id: `faq-nxt-u-${Date.now()}`, from: 'user', content: btn }
    const withUser = [...msgs, userMsg]
    setMsgs(withUser)
    if (btn === 'Start my check-in') {
      triggerCheckIn(purposeRef.current, withUser, emailCapture)
    } else {
      setFaqState('input')
      pStore.save({ token, groundLabel, adminName, multiParty, step: 7, purpose: purposeRef.current, email: emailCapture, msgs: withUser, history: [], phase: 'faq', faqState: 'input' })
    }
  }

  // ── Check-in ──────────────────────────────────────────────────────────────

  function triggerCheckIn(p: string, base: DMsg[], capturedEmail?: string) {
    const groundType = multiParty ? 'multi-party' : 'two-party'
    const isCoachingContext = p.toLowerCase().includes('track my progress') || groundLabel.toLowerCase().includes('coach') || groundLabel.toLowerCase().includes('mentor')
    const coachingNote = isCoachingContext ? '\n\nThis is a coaching or mentoring context. Ask what moved forward since the last session, not whether tasks were completed. Stay progress-oriented and curious, not evaluative.' : ''
    const seedContent = `[PARTICIPANT ONBOARDING COMPLETE]\nGround: ${groundLabel}\nInitiator: ${adminName}\nGround type: ${groundType}\nParticipant's match answer: ${matchAnswer || 'yes'}\nWhat participant wants this ground to get right: ${p}${coachingNote}\n\nBegin the check-in. Ask one direct specific question based on what they shared. Do not open generically.`
    const seedMsg: EntryMessage = { role: 'user', content: seedContent }
    const h: EntryMessage[] = [seedMsg]
    historyRef.current = h

    setPhase('checkin')

    const transMsg: DMsg = { id: `ci-trans-${Date.now()}`, from: 'ai', content: 'Good. Now tell me what you have seen.' }
    const loadMsg: DMsg = { id: 'ci-load-0', from: 'ai', content: '…', isLoading: true }
    setMsgs([...base, transMsg, loadMsg])
    setLoading(true)

    participantApi.chat(token, h).then(res => {
      const aiEntry: EntryMessage = { role: 'assistant', content: res.reply }
      const nextH = [...h, aiEntry]
      historyRef.current = nextH

      const aiDMsg: DMsg = { id: `ci-ai-0-${Date.now()}`, from: 'ai', content: res.reply }
      const withAi = [...base, transMsg, aiDMsg]
      setMsgs(withAi)
      setLoading(false)

      const email = capturedEmail ?? emailCapture
      if (res.sessionComplete) {
        const session: ParticipantSession = { inviteToken: token, groundLabel, initiatorName: adminName, messages: nextH, completed: true }
        participantStorage.save(session)
        setShowDonePrompt(true)
        pStore.save({ token, groundLabel, adminName, multiParty, step: 8, purpose: p, email, msgs: withAi, history: nextH, phase: 'checkin', faqState: 'input' })
      } else {
        pStore.save({ token, groundLabel, adminName, multiParty, step: 8, purpose: p, email, msgs: withAi, history: nextH, phase: 'checkin', faqState: 'input' })
      }
    }).catch(() => {
      setMsgs(base)
      setLoading(false)
    })
  }

  function handleCheckInSend() {
    const val = input.trim()
    if (!val || loading || done) return
    setInput('')
    if (taRef.current) taRef.current.style.height = '38px'

    const userEntry: EntryMessage = { role: 'user', content: val }
    const nextH = [...historyRef.current, userEntry]
    historyRef.current = nextH

    const userDMsg: DMsg = { id: `ci-u-${Date.now()}`, from: 'user', content: val }
    const loadDMsg: DMsg = { id: 'ci-load', from: 'ai', content: '…', isLoading: true }
    const withLoad = [...msgs, userDMsg, loadDMsg]
    setMsgs(withLoad)
    setLoading(true)

    participantApi.chat(token, nextH).then(res => {
      const aiEntry: EntryMessage = { role: 'assistant', content: res.reply }
      const finalH = [...nextH, aiEntry]
      historyRef.current = finalH

      const aiDMsg: DMsg = { id: `ci-ai-${Date.now()}`, from: 'ai', content: res.reply }
      const withAi = [...withLoad.filter(m => !m.isLoading), aiDMsg]
      setMsgs(withAi)
      setLoading(false)

      if (res.sessionComplete) {
        const session: ParticipantSession = { inviteToken: token, groundLabel, initiatorName: adminName, messages: finalH, completed: true }
        participantStorage.save(session)
        setShowDonePrompt(true)
        pStore.save({ token, groundLabel, adminName, multiParty, step: 8, purpose: purposeRef.current, email: emailCapture, msgs: withAi, history: finalH, phase: 'checkin', faqState: 'input' })
      } else {
        pStore.save({ token, groundLabel, adminName, multiParty, step: 8, purpose: purposeRef.current, email: emailCapture, msgs: withAi, history: finalH, phase: 'checkin', faqState: 'input' })
      }
    }).catch(() => {
      setMsgs(withLoad.filter(m => !m.isLoading))
      setLoading(false)
    })
  }

  function quickSend(msg: string) {
    if (loading || done || phase !== 'checkin') return
    const userEntry: EntryMessage = { role: 'user', content: msg }
    const nextH = [...historyRef.current, userEntry]
    historyRef.current = nextH
    const userDMsg: DMsg = { id: `qs-${Date.now()}`, from: 'user', content: msg }
    const loadDMsg: DMsg = { id: 'ci-load-qs', from: 'ai', content: '…', isLoading: true }
    setMsgs(v => [...v, userDMsg, loadDMsg])
    setLoading(true)
    participantApi.chat(token, nextH).then(res => {
      const aiEntry: EntryMessage = { role: 'assistant', content: res.reply }
      historyRef.current = [...nextH, aiEntry]
      const aiDMsg: DMsg = { id: `ci-ai-qs-${Date.now()}`, from: 'ai', content: res.reply }
      setMsgs(v => [...v.filter(m => m.id !== 'ci-load-qs'), aiDMsg])
      setLoading(false)
      if (res.sessionComplete) setShowDonePrompt(true)
    }).catch(() => {
      setMsgs(v => v.filter(m => m.id !== 'ci-load-qs'))
      setLoading(false)
    })
  }

  // ── Input routing ─────────────────────────────────────────────────────────

  function handleSubmit() {
    if (phase === 'checkin') return handleCheckInSend()
    if (phase === 'email') return handleEmailSubmit()
    if (phase === 'faq' && faqState === 'input') return handleFaqQuestion()
    if (phase === 'onboarding') return handleTextSubmit()
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit() }
  }

  function autoResize(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value)
    e.target.style.height = '38px'
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
  }

  // ── Derived UI state ──────────────────────────────────────────────────────

  const currentButtons = (() => {
    if (phase === 'faq' && faqState === 'next' && !loading)
      return { options: ['Start my check-in', 'Ask another question.'], layout: 'row' as Layout }
    if (phase === 'onboarding' && !loading)
      return stepButtons(step, multiParty, matchAnswer)
    return null
  })()

  const showInput = !done && !loading && (
    (phase === 'onboarding' && step >= 2) ||
    phase === 'email' ||
    (phase === 'faq' && faqState === 'input') ||
    phase === 'checkin'
  )

  const inputPlaceholder =
    phase === 'email' ? 'Your email address.' :
    phase === 'checkin' ? 'Type your response.' :
    phase === 'faq' ? 'Type your question.' :
    step === 3 ? 'Or describe it in your own words.' :
    'Type your response.'

  const exchangeCount = phase === 'checkin'
    ? Math.max(0, historyRef.current.filter(m => m.role === 'user').length - 1)
    : 0

  const visibleMsgs = msgs.filter(m => !m.isLoading || loading)

  // ── Render ────────────────────────────────────────────────────────────────

  if (showIntro) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--gw-bg)', padding: '24px 20px' }}>
        <div style={{ maxWidth: 480, width: '100%' }}>
          <div style={{ marginBottom: 24 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--gw-navy)', letterSpacing: '-.01em' }}>Groundwork</span>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--gw-text)', lineHeight: 1.2, marginBottom: 8 }}>
            {adminName} has asked for your account.
          </h1>
          <p style={{ fontSize: 14, color: 'var(--gw-sub)', lineHeight: 1.7, marginBottom: 24 }}>
            The record is about: <strong style={{ color: 'var(--gw-text)' }}>{groundLabel}</strong>
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '13px 16px', background: 'white', borderRadius: 10, border: '1px solid var(--gw-border)' }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>🔒</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gw-text)', marginBottom: 2 }}>Your words stay private</div>
                <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.55 }}>What you write is not shared directly. The report shows where accounts agree and where they differ, without quoting anyone.</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '13px 16px', background: 'white', borderRadius: 10, border: '1px solid var(--gw-border)' }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>⏱</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gw-text)', marginBottom: 2 }}>About 10 minutes</div>
                <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.55 }}>You will be asked a few questions about the situation. Answer in your own words. There are no right answers.</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '13px 16px', background: 'white', borderRadius: 10, border: '1px solid var(--gw-border)' }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>📄</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gw-text)', marginBottom: 2 }}>You get the report too</div>
                <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.55 }}>When everyone has checked in, the report is released to all parties at the same time.</div>
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowIntro(false)}
            style={{ width: '100%', padding: '14px 20px', borderRadius: 8, background: 'var(--gw-navy)', color: 'white', fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            Start my check-in
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--gw-bg)' }}>
      <div className="gw-hdr">
        <div>
          <a href="https://myground.work" target="_blank" rel="noopener noreferrer" className="gw-logo" style={{ textDecoration: 'none', color: 'inherit' }}>Groundwork</a>
          <div style={{ fontSize: 11, color: 'var(--gw-muted)' }}>
            {phase === 'checkin' || phase === 'done' ? 'Your account' : 'Before you begin'}
          </div>
        </div>
        {phase === 'checkin' && exchangeCount > 0 && (
          <div style={{ fontSize: 11, color: 'var(--gw-sub)' }}>
            {exchangeCount} exchange{exchangeCount !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      <div className="gw-chat-w">
        <div
          ref={msgsRef}
          className="gw-chat-msgs"
          style={{ maxWidth: 680, width: '100%', margin: '0 auto', alignSelf: 'center', boxSizing: 'border-box' }}
        >
          {visibleMsgs.map((m, i) => (
            <div
              key={m.id}
              className={`gw-msg ${
                m.isLoading ? 'gw-msg-loading' :
                m.from === 'user' ? 'gw-msg-user' : 'gw-msg-ai'
              } ${i === visibleMsgs.length - 1 ? 'gw-msg-active' : 'gw-msg-back'}`}
            >
              {m.content}
            </div>
          ))}

          {currentButtons && (
            <div style={{
              display: 'flex',
              flexDirection: currentButtons.layout === 'list' ? 'column' : 'row',
              gap: 7,
              padding: '10px 0 4px',
              flexWrap: currentButtons.layout === 'row' ? 'wrap' : undefined,
            }}>
              {currentButtons.hint && (
                <div style={{ fontSize: 11, color: 'var(--gw-sub)', marginBottom: 2 }}>{currentButtons.hint}</div>
              )}
              {currentButtons.options.map(opt => {
                const isSelected = currentButtons.multiSelect && selectedGoals.includes(opt)
                return (
                  <button
                    key={opt}
                    onClick={() => phase === 'faq' ? handleFaqNext(opt) : handleButton(opt)}
                    style={{
                      padding: '10px 14px',
                      borderRadius: 8,
                      border: `1px solid ${isSelected ? 'var(--gw-navy)' : 'var(--gw-border)'}`,
                      background: isSelected ? 'var(--gw-navy)' : 'white',
                      color: isSelected ? 'white' : 'var(--gw-text)',
                      fontSize: 13,
                      fontWeight: 500,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      textAlign: 'left',
                      lineHeight: 1.4,
                      transition: 'all 0.12s',
                    }}
                  >
                    {opt}
                  </button>
                )
              })}
              {currentButtons.multiSelect && selectedGoals.length > 0 && (
                <button
                  onClick={confirmGoals}
                  style={{
                    padding: '10px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700,
                    background: 'var(--gw-navy)', color: 'white', border: '1px solid var(--gw-navy)',
                    cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                  }}
                >
                  Confirm selection →
                </button>
              )}
            </div>
          )}
        </div>

        {/* Done suggestion banner */}
        {showDonePrompt && !done && (
          <div style={{ maxWidth: 680, width: '100%', margin: '0 auto', padding: '0 14px 10px' }}>
            <div style={{ background: '#E7F6EF', border: '1px solid #B6E8D4', borderRadius: 10, padding: '14px 16px' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#085041', marginBottom: 10 }}>
                That looks like a complete account. Ready to wrap up?
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => { setDone(true); setShowDonePrompt(false) }}
                  style={{ padding: '9px 16px', borderRadius: 7, background: '#085041', color: 'white', fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  Yes, save my account
                </button>
                <button
                  onClick={() => setShowDonePrompt(false)}
                  style={{ padding: '9px 14px', borderRadius: 7, background: 'white', color: 'var(--gw-text)', fontSize: 12, fontWeight: 600, border: '1px solid var(--gw-border)', cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  Keep going
                </button>
              </div>
            </div>
          </div>
        )}

        {!done && (
          <>
            {/* Quick action chips - check-in phase only */}
            {phase === 'checkin' && !loading && (
              <div className="gw-chat-actions">
                {QUICK_ACTIONS.map(a => (
                  <button
                    key={a.label}
                    onClick={() => {
                      if (a.action === 'upload') {
                        docInputRef.current?.click()
                      } else if (a.msg) {
                        quickSend(a.msg)
                      }
                    }}
                    disabled={loading || done}
                    className="gw-btn-sm"
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            )}

            <div style={{ borderTop: '0.5px solid var(--gw-border)', background: 'white', flexShrink: 0 }}>
              <div style={{ padding: '4px 14px', borderBottom: '0.5px solid var(--gw-border)', fontSize: 11, color: 'var(--gw-sub)', background: 'var(--gw-bg)', lineHeight: 1.4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Nobody reads your words directly. The report shows where accounts agree and where they differ.</span>
                {(phase === 'checkin' || phase === 'onboarding') && (
                  <span style={{ color: 'var(--gw-muted)', flexShrink: 0, marginLeft: 8 }}>· autosaved</span>
                )}
              </div>
              {showInput && (
                <div className="gw-chat-bar">
                  {phase === 'checkin' && (
                    <>
                      <label
                        htmlFor="poc-doc-upload"
                        title={uploadDoc.isPending ? 'Uploading...' : 'Upload a document'}
                        style={{ padding: '0 10px', borderRadius: 6, background: 'var(--gw-bg)', color: 'var(--gw-sub)', border: '0.5px solid var(--gw-border)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, flexShrink: 0, whiteSpace: 'nowrap', height: 38, opacity: uploadDoc.isPending ? 0.6 : 1 }}
                      >
                        {uploadDoc.isPending ? '…' : '+'} <span style={{ fontSize: 11 }}>{uploadDoc.isPending ? 'Uploading' : 'Doc'}</span>
                      </label>
                      <input
                        ref={docInputRef}
                        type="file"
                        id="poc-doc-upload"
                        accept=".pdf,.doc,.docx,.txt,.csv,.xlsx,.png,.jpg,.jpeg"
                        style={{ display: 'none' }}
                        onChange={e => { const f = e.target.files?.[0]; if (f) uploadDoc.mutate(f); e.currentTarget.value = '' }}
                      />
                    </>
                  )}
                  <textarea
                    ref={taRef}
                    placeholder={inputPlaceholder}
                    value={input}
                    onChange={autoResize}
                    onKeyDown={handleKey}
                    disabled={loading}
                    className="gw-chat-ta"
                    style={{ background: loading ? 'var(--gw-bg)' : 'white', maxHeight: 120 }}
                  />
                  <button
                    onClick={handleSubmit}
                    disabled={loading || !input.trim()}
                    className="gw-send-btn"
                    style={{ height: 38 }}
                  >
                    &#8593;
                  </button>
                </div>
              )}
              {phase === 'checkin' && !loading && (
                <div style={{ padding: '2px 14px 6px', fontSize: 10, color: 'var(--gw-muted)' }}>
                  PDF, Word, Excel and images up to 10 MB
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {done && !loading && (
        <div style={{ borderTop: '0.5px solid var(--gw-border)', background: 'white', overflowY: 'auto', maxHeight: '72vh', animation: 'gw-slideup 0.35s ease', flexShrink: 0 }}>
          <div style={{ maxWidth: 680, width: '100%', margin: '0 auto', padding: '16px' }}>
            <div style={{ fontSize: 12, color: 'var(--gw-green-t)', fontWeight: 600, marginBottom: 12, padding: '8px 12px', background: 'var(--gw-green-bg)', borderRadius: 8, border: '0.5px solid var(--gw-green-b)' }}>
              Your account is on record. It will be included when the report runs.
            </div>

            {/* What happens next */}
            <div style={{ background: 'var(--gw-bg)', border: '0.5px solid var(--gw-border)', borderRadius: 10, padding: '14px 16px', marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--gw-sub)', marginBottom: 12 }}>What happens next</div>
              {[
                { n: '1', text: `${adminName} will be notified you have checked in.` },
                { n: '2', text: 'Once all parties have added their account, a report is generated. Nobody reads your words directly.' },
                { n: '3', text: 'The admin releases the report to both parties at the same time. Neither sees it before the other.' },
              ].map(s => (
                <div key={s.n} style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--gw-navy)', color: 'white', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>{s.n}</div>
                  <div style={{ fontSize: 12, color: 'var(--gw-text)', lineHeight: 1.55, paddingTop: 2 }}>{s.text}</div>
                </div>
              ))}
            </div>

            <SaveCard variant="participant" email={emailCapture} onClear={() => { pStore.clear(); participantStorage.clear(); navigate('/') }} />
          </div>
        </div>
      )}
    </div>
  )
}
