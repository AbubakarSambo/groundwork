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
  matchAnswer?: string
  selectedGoals?: string[]
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

const PARTICIPANT_GOAL_OPTIONS = [
  'I delivered what was agreed',
  'Expectations were unclear',
  'Important context is missing',
  'The situation needs to be reset',
  'I want my account on record',
  'I want a clearer understanding of what happened',
  'Something else',
]

const ROLE_OPTIONS = ['Project lead', 'Manager', 'Team member', 'Cofounder', 'Partner', 'Client']

const PARTICIPANT_ONBOARDING_STEPS = 4

function stepContent(step: number, adminName: string, groundLabel: string, _multiParty: boolean, matchAnswer?: string): string {
  switch (step) {
    case 1:
      return `${adminName} has invited you to contribute to a Groundwork record.\n\nMost situations look different depending on who is describing them.\n\nGroundwork creates a record using what people have experienced, observed, documented, and agreed. As people contribute, the record is cross referenced and becomes more complete over time.\n\nThis record is about:\n${groundLabel}\n\nBefore we begin, does this description broadly match your understanding?`
    case 2:
      if (matchAnswer === 'yes') {
        return `Good.\n\nYou are not answering for ${adminName}.\nYou are adding your own account.\nNobody can edit it.\nNobody can speak for you.\n\nWhat role do you have in this situation?`
      }
      return `Good.\n\nDifferences in understanding are often why a record is useful.\n\nHow would you describe what this situation is about?`
    case 3:
      return `What would you most like this record to establish from your side?`
    case 4:
      return `What have you experienced, observed, or documented that makes that important to you?`
    default:
      return ''
  }
}

type Layout = 'list' | 'row'
function stepButtons(step: number, _multiParty: boolean, _matchAnswer?: string): { options: string[]; layout: Layout; multiSelect?: boolean } | null {
  if (step === 1) return { options: ['Yes', 'Partly', 'No'], layout: 'row' }
  if (step === 2 && _matchAnswer === 'yes') return { options: ROLE_OPTIONS, layout: 'list' }
  if (step === 3) return { options: PARTICIPANT_GOAL_OPTIONS, layout: 'list', multiSelect: true }
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
  const [matchAnswer, setMatchAnswer] = useState<string>('')
  const [selectedGoals, setSelectedGoals] = useState<string[]>([])

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
      if (saved.matchAnswer) setMatchAnswer(saved.matchAnswer)
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

  function pushStep(nextStep: number, p: string, base: DMsg[], ma?: string) {
    if (nextStep > PARTICIPANT_ONBOARDING_STEPS) {
      triggerCheckIn(p, base)
      return
    }
    const content = stepContent(nextStep, adminName, groundLabel, multiParty, ma ?? matchAnswer)
    const next = [...base, { id: `ai-${nextStep}-${Date.now()}`, from: 'ai' as const, content }]
    setMsgs(next)
    setStep(nextStep)
    pStore.save({ token, groundLabel, adminName, multiParty, step: nextStep, purpose: p, matchAnswer: ma ?? matchAnswer, msgs: next, history: [], phase: 'onboarding', faqState: 'input' })
  }

  function handleTextSubmit() {
    const val = input.trim()
    if (!val || loading) return
    setInput('')
    if (taRef.current) taRef.current.style.height = '38px'

    if (step === 3) {
      // Free text goal
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
      triggerCheckIn(purposeRef.current, withUser)
      return
    }

    purposeRef.current = purposeRef.current || val
    const userMsg: DMsg = { id: `u-${step}-${Date.now()}`, from: 'user', content: val }
    const withUser = [...msgs.filter(m => !m.isLoading), userMsg]
    setMsgs(withUser)
    pushStep(step + 1, purposeRef.current, withUser)
  }

  function handleButton(btn: string) {
    // Step 1: match answer — Yes / Partly / No
    if (step === 1) {
      const ma = btn.toLowerCase() === 'yes' ? 'yes' : btn.toLowerCase() === 'partly' ? 'partly' : 'no'
      setMatchAnswer(ma)
      const userMsg: DMsg = { id: `u-btn-1-${Date.now()}`, from: 'user', content: btn }
      const withUser = [...msgs, userMsg]
      setMsgs(withUser)
      pushStep(2, purposeRef.current, withUser, ma)
      return
    }

    // Step 2 (Yes path): role option selected
    if (step === 2 && matchAnswer === 'yes' && ROLE_OPTIONS.includes(btn)) {
      purposeRef.current = `Role: ${btn}`
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
    const seedContent = `[PARTICIPANT ONBOARDING COMPLETE]\nGround: ${groundLabel}\nInitiator: ${adminName}\nGround type: ${groundType}\nParticipant's match answer: ${matchAnswer || 'yes'}\nWhat participant wants this ground to get right: ${p}\n\nBegin the check-in. Ask one direct specific question based on what they shared. Do not open generically.`
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
      return stepButtons(step, multiParty, matchAnswer)
    return null
  })()

  const showInput = !done && !loading && (
    (phase === 'onboarding' && step >= 2) ||
    (phase === 'faq' && faqState === 'input') ||
    phase === 'checkin'
  )

  const inputPlaceholder =
    phase === 'checkin' ? 'Type your response.' :
    phase === 'faq' ? 'Type your question.' :
    step === 3 ? 'Or describe it in your own words.' :
    step === 4 ? 'Type your response.' :
    'Type your response.'

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
              flexWrap: currentButtons.layout === 'row' ? 'wrap' : undefined,
            }}>
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
                  Confirm →
                </button>
              )}
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
                Your full account stays private from other contributors. The picture builds as people check in.
              </div>
              {showInput && (
                <div className="gw-chat-bar">
                  <label
                    htmlFor="poc-doc-upload"
                    title="Upload a document"
                    style={{ padding: '0 10px', borderRadius: 6, background: 'var(--gw-bg)', color: 'var(--gw-sub)', border: '0.5px solid var(--gw-border)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, flexShrink: 0, whiteSpace: 'nowrap', height: 38 }}
                  >
                    + <span style={{ fontSize: 11 }}>Doc</span>
                  </label>
                  <input type="file" id="poc-doc-upload" accept=".pdf,.doc,.docx,.txt,.csv,.xlsx,.png,.jpg,.jpeg" style={{ display: 'none' }}
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
