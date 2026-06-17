import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { entryApi, participantApi } from '@/api/entry'
import { toast } from 'sonner'

// ── Types ──────────────────────────────────────────────────────────────────

interface DMsg {
  id: string
  from: 'ai' | 'user'
  content: string
  isLoading?: boolean
}

type Layout = 'row' | 'list'

interface LState {
  token: string
  groundLabel: string
  adminName: string
  step: number
  isAlsoParticipant: boolean
  incorrectText: string
  msgs: DMsg[]
  phase: 'onboarding' | 'faq' | 'done'
  faqState: 'input' | 'next'
}

const SK = 'gw-lead-ob-v1'
const lStore = {
  save: (s: LState) => { try { localStorage.setItem(SK, JSON.stringify(s)) } catch {} },
  load: (): LState | null => { try { const r = localStorage.getItem(SK); return r ? JSON.parse(r) : null } catch { return null } },
  clear: () => localStorage.removeItem(SK),
}

// ── Message content ────────────────────────────────────────────────────────

function msg1(adminName: string, groundLabel: string) {
  return `${adminName} has set up this ground about ${groundLabel} and asked you to manage it.\n\nGroundwork is a contribution and alignment record. Both parties in a professional situation submit their accounts independently. The record is cross-referenced and a report is produced that shows where both sides agree and where they differ.\n\nAs the manager you sit above the record. You can see who has submitted and when, track the confidence score as it builds, and activate the report when both parties are ready.\n\nType okay or proceed when you are ready.`
}

function msg2() {
  return `Here is what managing a ground means.\n\nYou will see each participant's submission status. You will not see what they wrote. Their accounts stay private until the report is activated together.\n\nYou can add participants, view the confidence score as it builds, and initiate the report activation when both sides are ready. You will receive a notification when a participant submits.\n\nType okay or proceed when you are ready.`
}

function msg3() {
  return `One thing before we continue.\n\nAre you also a participant in this situation or are you managing only?`
}

function msg4(adminName: string, groundLabel: string, isAlsoParticipant: boolean) {
  const roleBlock = isAlsoParticipant
    ? `Got it. You will manage this ground and submit your own account as a participant. Your account will be treated the same as any other participant. ${adminName} will not see what you write until both parties activate the report together.\n\n`
    : `Got it. You will manage this ground without submitting your own account. You will see submission status and activate the report when the ground is ready.\n\n`
  return `${roleBlock}Here is the brief ${adminName} provided: ${groundLabel}.\n\nDoes this match your understanding of the situation?`
}

function msg5() {
  return `Do you have anything you want to ask about how this works before we begin?`
}

// ── Component ──────────────────────────────────────────────────────────────

export function LeadOnboardingChat() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const token = searchParams.get('token') ?? ''
  const groundLabel = searchParams.get('groundLabel') ?? ''
  const adminName = searchParams.get('initiatorName') ?? ''

  const [step, setStep] = useState(1)
  const [msgs, setMsgs] = useState<DMsg[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [incorrectMode, setIncorrectMode] = useState(false)
  const [phase, setPhase] = useState<'onboarding' | 'faq' | 'done'>('onboarding')
  const [faqState, setFaqState] = useState<'input' | 'next'>('input')

  const msgsRef = useRef<HTMLDivElement>(null)
  const taRef = useRef<HTMLTextAreaElement>(null)
  const isAlsoParticipantRef = useRef(false)

  const uploadDoc = useMutation({
    mutationFn: (file: File) => participantApi.uploadDocument(token, file),
    onSuccess: (doc) => {
      const ackMsg: DMsg = { id: `doc-${doc.id}`, from: 'ai', content: `Document received: "${doc.name}". Tell me what it shows and why it is relevant.` }
      setMsgs(v => [...v, ackMsg])
    },
    onError: () => toast.error('Upload failed. Please try again.'),
  })

  function save(patch: Partial<LState> = {}) {
    lStore.save({
      token, groundLabel, adminName,
      step, isAlsoParticipant: isAlsoParticipantRef.current,
      incorrectText: '', msgs, phase, faqState, ...patch,
    })
  }

  // ── Mount ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!token) { navigate('/'); return }
    const saved = lStore.load()
    if (saved && saved.token === token) {
      setStep(saved.step)
      isAlsoParticipantRef.current = saved.isAlsoParticipant
      setMsgs(saved.msgs.filter(m => !m.isLoading))
      setPhase(saved.phase)
      setFaqState(saved.faqState)
      if (saved.phase === 'done') { completeLead(saved.isAlsoParticipant); return }
    } else {
      lStore.clear()
      const first: DMsg = { id: 'ai-1', from: 'ai', content: msg1(adminName, groundLabel) }
      setMsgs([first])
      lStore.save({ token, groundLabel, adminName, step: 1, isAlsoParticipant: false, incorrectText: '', msgs: [first], phase: 'onboarding', faqState: 'input' })
    }
  }, [])

  useEffect(() => {
    if (msgsRef.current) msgsRef.current.scrollTop = msgsRef.current.scrollHeight
  }, [msgs])

  // ── Navigation ────────────────────────────────────────────────────────────

  function completeLead(alsoParticipant: boolean) {
    lStore.clear()
    if (alsoParticipant) {
      navigate(`/participant-chat?token=${encodeURIComponent(token)}&groundLabel=${encodeURIComponent(groundLabel)}&initiatorName=${encodeURIComponent(adminName)}`)
    } else {
      navigate(`/auth?redirect=/grounds`)
    }
  }

  // ── Step advancement ──────────────────────────────────────────────────────

  function pushStep(nextStep: number, ap: boolean, base: DMsg[]) {
    let content = ''
    switch (nextStep) {
      case 2: content = msg2(); break
      case 3: content = msg3(); break
      case 4: content = msg4(adminName, groundLabel, ap); break
      case 5: content = msg5(); break
      default: return
    }
    const ai: DMsg = { id: `ai-${nextStep}-${Date.now()}`, from: 'ai', content }
    const next = [...base, ai]
    setMsgs(next)
    setStep(nextStep)
    save({ step: nextStep, msgs: next, isAlsoParticipant: ap })
  }

  function handleTextSubmit() {
    const val = input.trim()
    if (!val || loading) return
    setInput('')
    if (taRef.current) taRef.current.style.height = '38px'

    // incorrect feedback text (step 4 secondary input)
    if (incorrectMode) {
      const userMsg: DMsg = { id: `u-inc-${Date.now()}`, from: 'user', content: val }
      const ackMsg: DMsg = { id: `ai-inc-${Date.now()}`, from: 'ai', content: `Noted. I will flag that for ${adminName}. We will continue with the setup and you can follow up with them directly about those changes.` }
      const stepMsg: DMsg = { id: `ai-5-${Date.now()}`, from: 'ai', content: msg5() }
      const next = [...msgs, userMsg, ackMsg, stepMsg]
      setMsgs(next)
      setStep(5)
      setIncorrectMode(false)
      save({ step: 5, msgs: next })
      return
    }

    const userMsg: DMsg = { id: `u-${step}-${Date.now()}`, from: 'user', content: val }
    const withUser = [...msgs.filter(m => !m.isLoading), userMsg]
    setMsgs(withUser)
    pushStep(step + 1, isAlsoParticipantRef.current, withUser)
  }

  function handleButton(btn: string) {
    const userMsg: DMsg = { id: `u-btn-${step}-${Date.now()}`, from: 'user', content: btn }
    const withUser = [...msgs, userMsg]
    setMsgs(withUser)

    if (step === 3) {
      const ap = btn.startsWith('I am also a participant')
      isAlsoParticipantRef.current = ap
      pushStep(4, ap, withUser)
      return
    }

    if (step === 4) {
      if (btn === 'Yes that is right.') {
        pushStep(5, isAlsoParticipantRef.current, withUser)
      } else {
        setIncorrectMode(true)
        const ai: DMsg = { id: `ai-4b-${Date.now()}`, from: 'ai', content: 'What is missing or incorrect? Describe it briefly and I will note it.' }
        const next = [...withUser, ai]
        setMsgs(next)
        save({ step: 4, msgs: next })
      }
      return
    }

    if (step === 5) {
      if (btn === 'No questions. Let us begin.') {
        setPhase('done')
        lStore.clear()
        completeLead(isAlsoParticipantRef.current)
      } else {
        setPhase('faq')
        setFaqState('input')
        save({ step: 5, phase: 'faq', faqState: 'input', msgs: withUser })
      }
      return
    }
  }

  // ── FAQ interlude ─────────────────────────────────────────────────────────

  function handleFaqQuestion() {
    const val = input.trim()
    if (!val || loading) return
    setInput('')
    if (taRef.current) taRef.current.style.height = '38px'

    const userMsg: DMsg = { id: `faq-q-${Date.now()}`, from: 'user', content: val }
    const loadMsg: DMsg = { id: 'faq-load', from: 'ai', content: '…', isLoading: true }
    setMsgs([...msgs, userMsg, loadMsg])
    setLoading(true)

    entryApi.faq(val).then(res => {
      const answerMsg: DMsg = { id: `faq-a-${Date.now()}`, from: 'ai', content: res.reply }
      const nextMsg: DMsg = { id: `faq-nxt-${Date.now()}`, from: 'ai', content: 'Anything else or shall we begin?' }
      const next = [...msgs, userMsg, answerMsg, nextMsg]
      setMsgs(next)
      setFaqState('next')
      setLoading(false)
      save({ phase: 'faq', faqState: 'next', msgs: next })
    }).catch(() => {
      setMsgs([...msgs, userMsg])
      setLoading(false)
    })
  }

  function handleFaqNext(btn: string) {
    const userMsg: DMsg = { id: `faq-nxt-u-${Date.now()}`, from: 'user', content: btn }
    const withUser = [...msgs, userMsg]
    setMsgs(withUser)
    if (btn === 'Nothing else. Let us begin.') {
      lStore.clear()
      completeLead(isAlsoParticipantRef.current)
    } else {
      setFaqState('input')
      save({ phase: 'faq', faqState: 'input', msgs: withUser })
    }
  }

  // ── Input routing ─────────────────────────────────────────────────────────

  function handleSubmit() {
    if (phase === 'faq' && faqState === 'input') return handleFaqQuestion()
    handleTextSubmit()
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit() }
  }

  function autoResize(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value)
    e.target.style.height = '38px'
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
  }

  // ── Derived state ─────────────────────────────────────────────────────────

  const currentButtons = (() => {
    if (loading || phase === 'done') return null
    if (phase === 'faq' && faqState === 'next') return { options: ['Nothing else. Let us begin.', 'I have another question.'], layout: 'row' as Layout }
    if (phase === 'onboarding') {
      if (step === 3) return { options: ['I am managing only.', 'I am also a participant and will submit my own account.'], layout: 'list' as Layout }
      if (step === 4 && !incorrectMode) return { options: ['Yes that is right.', 'There is something missing or incorrect.'], layout: 'row' as Layout }
      if (step === 5) return { options: ['No questions. Let us begin.', 'Yes I have a question.'], layout: 'row' as Layout }
    }
    return null
  })()

  const showInput = !loading && (
    (phase === 'onboarding' && (step <= 2 || incorrectMode)) ||
    (phase === 'faq' && faqState === 'input')
  )

  const inputPlaceholder =
    phase === 'faq' ? 'Type your question.' :
    incorrectMode ? 'Describe what is missing or incorrect.' :
    'Type okay or proceed.'

  const visibleMsgs = msgs.filter(m => !m.isLoading || loading)

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--gw-bg)' }}>
      <div className="gw-hdr">
        <div>
          <div className="gw-logo">Groundwork</div>
          <div style={{ fontSize: 11, color: 'var(--gw-muted)' }}>Ground management</div>
        </div>
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
              flexWrap: 'wrap',
            }}>
              {currentButtons.options.map(opt => (
                <button
                  key={opt}
                  onClick={() => phase === 'faq' ? handleFaqNext(opt) : handleButton(opt)}
                  style={{
                    padding: '10px 14px',
                    borderRadius: 8,
                    border: '1px solid var(--gw-border)',
                    background: 'white',
                    color: 'var(--gw-text)',
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    textAlign: 'left',
                    lineHeight: 1.4,
                    transition: 'border-color 0.12s, color 0.12s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--gw-navy)'; e.currentTarget.style.color = 'var(--gw-navy)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--gw-border)'; e.currentTarget.style.color = 'var(--gw-text)' }}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}
        </div>

        {showInput && (
          <div className="gw-chat-bar">
            <label
              htmlFor="lead-doc-upload"
              title="Upload a document"
              style={{ padding: '0 10px', borderRadius: 6, background: 'var(--gw-bg)', color: 'var(--gw-sub)', border: '0.5px solid var(--gw-border)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, flexShrink: 0, whiteSpace: 'nowrap', height: 38 }}
            >
              + <span style={{ fontSize: 11 }}>Doc</span>
            </label>
            <input type="file" id="lead-doc-upload" accept=".pdf,.doc,.docx,.txt,.csv,.xlsx,.png,.jpg,.jpeg" style={{ display: 'none' }}
              onChange={e => { const f = e.target.files?.[0]; if (f) uploadDoc.mutate(f); e.currentTarget.value = '' }} />
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
      </div>
    </div>
  )
}
