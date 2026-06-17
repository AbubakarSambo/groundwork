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
  msgs: DMsg[]
  history: EntryMessage[]
  phase: 'onboarding' | 'faq' | 'checkin' | 'done'
  faqState: 'input' | 'next'
}

const SK = 'gw-p-ob-v2'
const pStore = {
  save: (s: PState) => { try { localStorage.setItem(SK, JSON.stringify(s)) } catch {} },
  load: (): PState | null => { try { const r = localStorage.getItem(SK); return r ? JSON.parse(r) : null } catch { return null } },
  clear: () => localStorage.removeItem(SK),
}

// ── Message content ────────────────────────────────────────────────────────

function purposeOptions(multiParty: boolean): string[] {
  return [
    'That I delivered what was agreed.',
    'That the expectations were not clear or were not fair.',
    multiParty
      ? 'That I need this situation to be reset on honest terms.'
      : 'That I need this relationship to be reset on honest terms.',
    multiParty
      ? 'That I want my version on record alongside everyone else\'s before any decision is made.'
      : 'That I want both sides of the story in the same place before any decision is made.',
    'That I just want my version on record regardless of what happens next.',
  ]
}

function stepContent(step: number, adminName: string, groundLabel: string, multiParty: boolean): string {
  switch (step) {
    case 1:
      if (multiParty) {
        return `${adminName} has asked you to submit your account of a situation involving ${groundLabel}.\n\nGroundwork is a contribution and alignment record. It captures multiple independent accounts of the same situation, cross-references them against documents, performance reviews, and what was actually agreed, and produces a report that shows where all accounts agree, where they differ, and what the gaps between them are.\n\nYour version is one of several. It is as important as any other. Nobody can see what anyone else wrote until all parties activate the report together. Type okay or proceed when you are ready.`
      }
      return `${adminName} has asked you to submit your account of a situation involving ${groundLabel}.\n\nBefore you do, here is what this actually is.\n\nGroundwork is a contribution and alignment record. It captures both sides of a professional relationship independently, cross-references them against documents, performance reviews, and what was actually agreed, and produces a report that shows where both sides see the same thing and where they do not.\n\nYour version matters as much as theirs. Neither version is treated as more accurate than the other. The cross-reference is what finds the truth between them. Type okay or proceed when you are ready.`
    case 2:
      if (multiParty) {
        return `The most important thing to know before you write anything.\n\nYour account is completely private. Nobody in this ground can see what you write here until all parties activate the report together.\n\nYou are not writing to them. You are writing for the record. Type okay or proceed when you are ready.`
      }
      return `The most important thing to know before you write anything.\n\nYour account is completely private. ${adminName} cannot see what you write here. Nobody can see what you write here until both of you have chosen to activate the report together.\n\nYou are not writing to them. You are writing for the record. Type okay or proceed when you are ready.`
    case 3:
      return `Here is how this works.\n\nYou will answer a few questions about the situation, one at a time. Some will be straightforward. Some might catch you off guard. Answer what you know. If you are not sure about something say so. Uncertainty is as useful as certainty in a record like this.\n\nYour session takes about ten minutes. You can stop and come back if you need to. This conversation is saved on this device. Type okay or proceed when you are ready.`
    case 4:
      if (multiParty) {
        return `After your session you will see a confidence score. It runs from 1 to 5.\n\nThe score goes up as more parties submit and as the record gets more specific. A score of 2 after your first session is normal. It means your account is in and the record is building.\n\nThe score is not a judgment of you. It is a measure of how complete the collective picture is. Type okay or proceed when you are ready.`
      }
      return `After your session you will see a confidence score. It runs from 1 to 5.\n\nA score of 2 after your first session is normal. It means your account is in and the record is waiting for the other side. The score goes up as both parties submit and as the record gets more specific.\n\nThe score is not a judgment of you. It is a measure of how complete the picture is. Type okay or proceed when you are ready.`
    case 5:
      return `We might ask for documents at the right moment.\n\nAn email where something was agreed. A message. A work plan. A contract. A performance review.\n\nYou do not need them. You do not have to share them. But if you have something that shows what was agreed or what happened it makes your account stronger. Type okay or proceed when you are ready.`
    case 6:
      return `One thing before we begin.\n\nWhat do you want this record to show from your side? This is your moment to name it before the questions start.`
    case 7:
      return multiParty
        ? `Your account is yours. What you write here is independent and private until all parties activate the report together.\n\nDo you have any questions before we begin?`
        : `Your account is yours. What you write here is independent and private until both parties activate the report together.\n\nDo you have any questions before we begin?`
    default:
      return ''
  }
}

type Layout = 'list' | 'row'
function stepButtons(step: number, multiParty: boolean): { options: string[]; layout: Layout } | null {
  if (step === 6) return { options: purposeOptions(multiParty), layout: 'list' }
  if (step === 7) return { options: ['No questions. Let us begin.', 'Yes I have a question.'], layout: 'row' }
  return null
}

const QUICK_ACTIONS = [
  { label: 'What am I missing?', msg: 'What is missing from my record that would make it stronger?' },
  { label: 'Is there a document?', msg: 'Is there anything written down that we should look at for this?' },
  { label: 'What do I carry forward?', msg: 'What is the one thing I should carry into the next conversation?' },
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
  const [phase, setPhase] = useState<'onboarding' | 'faq' | 'checkin' | 'done'>('onboarding')
  const [faqState, setFaqState] = useState<'input' | 'next'>('input')
  const [done, setDone] = useState(false)

  const msgsRef = useRef<HTMLDivElement>(null)
  const taRef = useRef<HTMLTextAreaElement>(null)
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
      setMsgs(saved.msgs.filter(m => !m.isLoading))
      historyRef.current = saved.history
      setPhase(saved.phase)
      setFaqState(saved.faqState)
      if (saved.phase === 'done') setDone(true)
    } else {
      pStore.clear()
      const first: DMsg = { id: 'ai-1', from: 'ai', content: stepContent(1, adminName, groundLabel, multiParty) }
      setMsgs([first])
      pStore.save({ token, groundLabel, adminName, multiParty, step: 1, purpose: '', msgs: [first], history: [], phase: 'onboarding', faqState: 'input' })
    }
  }, [])

  useEffect(() => {
    if (msgsRef.current) msgsRef.current.scrollTop = msgsRef.current.scrollHeight
  }, [msgs])

  // ── Onboarding advancement ────────────────────────────────────────────────

  function pushStep(nextStep: number, p: string, base: DMsg[]) {
    if (nextStep > 7) {
      triggerCheckIn(p, base)
      return
    }
    const content = stepContent(nextStep, adminName, groundLabel, multiParty)
    const next = [...base, { id: `ai-${nextStep}-${Date.now()}`, from: 'ai' as const, content }]
    setMsgs(next)
    setStep(nextStep)
    pStore.save({ token, groundLabel, adminName, multiParty, step: nextStep, purpose: p, msgs: next, history: [], phase: 'onboarding', faqState: 'input' })
  }

  function handleTextSubmit() {
    const val = input.trim()
    if (!val || loading) return
    setInput('')
    if (taRef.current) taRef.current.style.height = '38px'

    if (step === 6) {
      purposeRef.current = val
      const userMsg: DMsg = { id: `u-6-${Date.now()}`, from: 'user', content: val }
      const withUser = [...msgs, userMsg]
      setMsgs(withUser)
      pushStep(7, val, withUser)
      return
    }

    const userMsg: DMsg = { id: `u-${step}-${Date.now()}`, from: 'user', content: val }
    const withUser = [...msgs.filter(m => !m.isLoading), userMsg]
    setMsgs(withUser)
    pushStep(step + 1, purposeRef.current, withUser)
  }

  function handleButton(btn: string) {
    if (step === 6) {
      purposeRef.current = btn
    }

    const userMsg: DMsg = { id: `u-btn-${step}-${Date.now()}`, from: 'user', content: btn }
    const withUser = [...msgs, userMsg]
    setMsgs(withUser)

    if (step === 7) {
      if (btn === 'No questions. Let us begin.') {
        triggerCheckIn(purposeRef.current, withUser)
      } else {
        setPhase('faq')
        setFaqState('input')
        pStore.save({ token, groundLabel, adminName, multiParty, step: 7, purpose: purposeRef.current, msgs: withUser, history: [], phase: 'faq', faqState: 'input' })
      }
      return
    }

    pushStep(step + 1, purposeRef.current, withUser)
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
      pStore.save({ token, groundLabel, adminName, multiParty, step: 7, purpose: purposeRef.current, msgs: withAnswer, history: [], phase: 'faq', faqState: 'next' })
    }).catch(() => {
      setMsgs(withLoad.filter(m => !m.isLoading))
      setLoading(false)
    })
  }

  function handleFaqNext(btn: string) {
    const userMsg: DMsg = { id: `faq-nxt-u-${Date.now()}`, from: 'user', content: btn }
    const withUser = [...msgs, userMsg]
    setMsgs(withUser)
    if (btn === 'Nothing else. Let us begin.') {
      triggerCheckIn(purposeRef.current, withUser)
    } else {
      setFaqState('input')
      pStore.save({ token, groundLabel, adminName, multiParty, step: 7, purpose: purposeRef.current, msgs: withUser, history: [], phase: 'faq', faqState: 'input' })
    }
  }

  // ── Check-in (message 8+) ─────────────────────────────────────────────────

  function triggerCheckIn(p: string, base: DMsg[]) {
    const groundType = multiParty ? 'multi-party' : 'two-party'
    const seedContent = `[PARTICIPANT ONBOARDING COMPLETE]\nGround: ${groundLabel}\nInitiator: ${adminName}\nGround type: ${groundType}\nParticipant's stated purpose: ${p}\n\nBegin the check-in.`
    const seedMsg: EntryMessage = { role: 'user', content: seedContent }
    const h: EntryMessage[] = [seedMsg]
    historyRef.current = h

    setPhase('checkin')

    const loadMsg: DMsg = { id: 'ci-load-0', from: 'ai', content: '…', isLoading: true }
    setMsgs([...base, loadMsg])
    setLoading(true)

    participantApi.chat(token, h).then(res => {
      const aiEntry: EntryMessage = { role: 'assistant', content: res.reply }
      const nextH = [...h, aiEntry]
      historyRef.current = nextH


      const aiDMsg: DMsg = { id: `ci-ai-0-${Date.now()}`, from: 'ai', content: res.reply }
      const withAi = [...base, aiDMsg]
      setMsgs(withAi)
      setLoading(false)

      if (res.sessionComplete) {
        const session: ParticipantSession = { inviteToken: token, groundLabel, initiatorName: adminName, messages: nextH, completed: true }
        participantStorage.save(session)
        setDone(true)
        pStore.save({ token, groundLabel, adminName, multiParty, step: 8, purpose: p, msgs: withAi, history: nextH, phase: 'done', faqState: 'input' })
      } else {
        pStore.save({ token, groundLabel, adminName, multiParty, step: 8, purpose: p, msgs: withAi, history: nextH, phase: 'checkin', faqState: 'input' })
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
        setDone(true)
        pStore.save({ token, groundLabel, adminName, multiParty, step: 8, purpose: purposeRef.current, msgs: withAi, history: finalH, phase: 'done', faqState: 'input' })
      } else {
        pStore.save({ token, groundLabel, adminName, multiParty, step: 8, purpose: purposeRef.current, msgs: withAi, history: finalH, phase: 'checkin', faqState: 'input' })
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
      if (res.sessionComplete) setDone(true)
    }).catch(() => {
      setMsgs(v => v.filter(m => m.id !== 'ci-load-qs'))
      setLoading(false)
    })
  }

  // ── Input routing ─────────────────────────────────────────────────────────

  function handleSubmit() {
    if (phase === 'checkin') return handleCheckInSend()
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
      return { options: ['Nothing else. Let us begin.', 'I have another question.'], layout: 'row' as Layout }
    if (phase === 'onboarding' && !loading)
      return stepButtons(step, multiParty)
    return null
  })()

  const showInput = !done && !loading && (
    (phase === 'onboarding' && (step <= 5 || step === 6)) ||
    (phase === 'faq' && faqState === 'input') ||
    phase === 'checkin'
  )

  const inputPlaceholder =
    phase === 'checkin' ? 'Share what you have been working on.' :
    phase === 'faq' ? 'Type your question.' :
    step === 6 ? 'Or type it in your own words.' :
    'Type okay or proceed.'

  const visibleMsgs = msgs.filter(m => !m.isLoading || loading)

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--gw-bg)' }}>
      <div className="gw-hdr">
        <div>
          <div className="gw-logo">Groundwork</div>
          <div style={{ fontSize: 11, color: 'var(--gw-muted)' }}>
            {phase === 'checkin' || phase === 'done' ? 'Your account' : 'Before you begin'}
          </div>
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

        {!done && (
          <>
            {/* Quick action chips — check-in phase only */}
            {phase === 'checkin' && !loading && (
              <div className="gw-chat-actions">
                {QUICK_ACTIONS.map(a => (
                  <button
                    key={a.label}
                    onClick={() => quickSend(a.msg)}
                    disabled={loading || done}
                    className="gw-btn-sm"
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            )}

            <div style={{ borderTop: '0.5px solid var(--gw-border)', background: 'white', flexShrink: 0 }}>
              <div style={{ padding: '4px 14px', borderBottom: '0.5px solid var(--gw-border)', fontSize: 11, color: 'var(--gw-sub)', background: 'var(--gw-bg)', lineHeight: 1.4 }}>
                Your words are private. {adminName} will not see what you write until all parties activate the report.
              </div>
              {showInput && (
                <div className="gw-chat-bar">
                  {phase === 'checkin' && (
                    <>
                      <label
                        htmlFor="poc-doc-upload"
                        title="Upload a document"
                        style={{ padding: '0 10px', borderRadius: 6, background: 'var(--gw-bg)', color: 'var(--gw-sub)', border: '0.5px solid var(--gw-border)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, flexShrink: 0, whiteSpace: 'nowrap', height: 38 }}
                      >
                        + <span style={{ fontSize: 11 }}>Doc</span>
                      </label>
                      <input type="file" id="poc-doc-upload" accept=".pdf,.doc,.docx,.txt,.csv,.xlsx,.png,.jpg,.jpeg" style={{ display: 'none' }}
                        onChange={e => { const f = e.target.files?.[0]; if (f) uploadDoc.mutate(f); e.currentTarget.value = '' }} />
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
            </div>
          </>
        )}
      </div>

      {done && !loading && (
        <div style={{ borderTop: '0.5px solid var(--gw-border)', background: 'white', overflowY: 'auto', maxHeight: '65vh', animation: 'gw-slideup 0.35s ease', flexShrink: 0 }}>
          <div style={{ maxWidth: 680, width: '100%', margin: '0 auto', padding: '16px' }}>
            <SaveCard variant="participant" onClear={() => { pStore.clear(); participantStorage.clear(); navigate('/') }} />
          </div>
        </div>
      )}
    </div>
  )
}
