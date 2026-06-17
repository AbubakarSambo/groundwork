import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { entryApi, entryStorage } from '@/api/entry'
import type { EntryMessage, EntryMode } from '@/api/entry'
import { SaveCard } from './SaveCard'

// ── Types ──────────────────────────────────────────────────────────────────

interface DMsg {
  id: string
  from: 'ai' | 'user'
  content: string
  isLoading?: boolean
}

interface OState {
  mode: string
  openingText: string
  step: number
  timeframe: string
  cadence: string
  decision: string
  msgs: DMsg[]
  history: EntryMessage[]
  phase: 'onboarding' | 'faq' | 'checkin' | 'done'
  faqState: 'input' | 'next'
}

const SK = 'gw-ob-v2'
const obStore = {
  save: (s: OState) => { try { localStorage.setItem(SK, JSON.stringify(s)) } catch {} },
  load: (): OState | null => { try { const r = localStorage.getItem(SK); return r ? JSON.parse(r) : null } catch { return null } },
  clear: () => localStorage.removeItem(SK),
}

// ── Message content ────────────────────────────────────────────────────────

const MODE_OPENER: Record<string, string> = {
  something_new: 'The best time to get both sides of a working relationship on record is before anything goes wrong. This tool builds that record from day one.',
  look_back: 'Some situations need more than a conversation. They need a record of what actually happened, cross-referenced against what was agreed and what each side delivered.',
  look_forward: 'Good working relationships do not happen by accident. They are built on clarity. This tool builds that clarity before it is needed.',
  both: 'Whether you need to get something on record or build a clear picture of what comes next, this tool handles both in one place.',
}

const TIMEFRAME = ['One session only', 'One month', 'Three months', 'Six months or more']
const CADENCE = ['Every week', 'Every two weeks', 'Once a month', 'At key moments only']
const DECISION = [
  'Keep this person in their role or not',
  'Support a decision to let this person go',
  'Realign on what we both agreed to',
  'Resolve a dispute before it goes further',
  'Document what happened so the record exists',
  'Close out a project and capture what each side delivered',
  'Get both sides clear before we start something new',
  'Build an alignment record from day one',
  'Set expectations and make them stick',
]

type Ctx = { timeframe: string; cadence: string; decision: string }

function stepContent(step: number, mode: string, ctx: Ctx): string {
  const opener = MODE_OPENER[mode] ?? MODE_OPENER['both']
  switch (step) {
    case 1:
      return `${opener}\n\nGetting all parties genuinely aligned is harder than it looks. This tool builds the record that makes alignment real. Good working relationships do not happen by accident. They are built on clarity. This tool builds that clarity.\n\nGroundwork is a contribution and alignment record. It captures all sides of a professional situation independently, cross-references them against documents, performance reviews, and what was actually agreed, and produces a report that shows where everyone sees the same thing and where they do not.\n\nIt takes about ten minutes to get started. Type okay or proceed when you are ready.`
    case 2:
      return `First we will ask you to name what this is about.\n\nSomething like: Kwame, my cofounder. Or Q2 sales targets. Or the Lagos project handover. Or Priya, new head of product, first 90 days.\n\nJust enough for everyone involved to know what this record is about. Type okay or proceed when you are ready.`
    case 3:
      return `Then we will ask you about the people involved.\n\nSomething like: Kwame was supposed to own the fundraising deck and the investor meetings. He has missed three deadlines and the Series A is in six weeks.\n\nOr: Priya joins next Monday. I want both of us to agree on what her first 90 days look like before she starts.\n\nJust names, what they were supposed to do or what you need from them, and what you believe is happening or needs to happen. Type okay or proceed when you are ready.`
    case 4:
      return `Then we will ask you to pick what kind of situation this is.\n\nSomething went wrong and you need it on record. You need to get everyone on the same page before things get worse. Or you are starting something and want all sides clear from day one.\n\nOne of those will fit.\n\nSome of what we ask might feel direct. That is the point. The record is only useful if it is honest. You are not being asked to be fair to the other people. You are being asked to be honest about your own version. Type okay or proceed when you are ready.`
    case 5:
      return `We will ask for documents at the right moment.\n\nEmails where something was agreed. Work plans. Contracts. Performance reviews. Messages. Call transcripts. Project briefs.\n\nYou do not need all of them and you do not need any of them right now. But when you attach a document the product cross-references it against what all parties said. That cross-reference is where the most important gaps in a record are usually found. Type okay or proceed when you are ready.`
    case 6:
      return `Each person you invite gets their own private link. They submit their account independently and cannot see what you or anyone else wrote. You cannot see what they wrote. When all accounts are in, everyone sees the report at the same time.\n\nNo one shapes another person's story. Type okay or proceed when you are ready.`
    case 7:
      return `Here is what happens when someone you invite opens their link.\n\nThey will see your name and the name of this ground. They will be told that their account is completely private and that no one can see what they write until all parties have submitted and the report is released. They will go through their own short onboarding conversation before they answer any questions. They will be asked what they want the record to show from their side before the first question is asked.\n\nThey are not being ambushed. They are being given the same process you are going through right now. Type okay or proceed when you are ready.`
    case 8:
      return `When all parties have submitted their accounts the report is generated. It shows where everyone agrees, where they differ, and what the gaps between the accounts actually are. Documents you attached are cross-referenced against what everyone said. Performance records, emails, and agreements are referenced where they are relevant.\n\nNo one decides who is right. The record shows all sides of the truth in the same place, checked against the evidence all parties provided.\n\nYou can use it to have a conversation that is grounded in something real. Take it into a performance review. Use it before a mediation. Show it to a lawyer or a board. Use it to reset a relationship before it breaks. Or just have it there so no one can rewrite history later.\n\nThe report belongs to all parties. Nothing leaves this system without all parties agreeing to it. Type okay or proceed when you are ready.`
    case 9:
      return `After each session you will see your confidence score update. Watch it.\n\nA score of 1 means the record is just starting. A score of 3 means both sides have submitted and the picture is forming. A score of 5 means the record is strong enough to stand on its own in any room.\n\nIf the score is not moving it means the record needs more depth. More specifics. More names. More dates. More documents.\n\nThe sessions are short. About ten minutes each. You can do one today and come back next week. The record waits for you. Type okay or proceed when you are ready.`
    case 10:
      return `How long do you need this record for?\n\nUse this to decide. If you need a quick resolution and both parties are willing, one month. If this needs time to play out with multiple check-ins, three months. If this could end up in front of a board, a lawyer, or an external party, six months or more. If you just need both sides on record right now and you are done, one session only.`
    case 11:
      return `How often should everyone check in?\n\nIf things are moving fast and the situation is changing week to week, every week. If you need regular check-ins but there is no immediate urgency, every two weeks. If this is a slow-moving situation or a long-term record, once a month. If the situation is unpredictable and you need flexibility, at key moments only.`
    case 12:
      return `What do you need this ground to produce?`
    case 13: {
      const summary = ctx.timeframe === 'One session only'
        ? `Got it. You are building a one-session record.`
        : `Got it. You are building a ${ctx.timeframe.toLowerCase()} record with ${ctx.cadence.toLowerCase()} check-ins.`
      return `${summary} You need to ${ctx.decision.toLowerCase()}.\n\nThe first two sessions are free. No card required.\n\nYour first question will be about what specifically you were expecting from the people involved and what you believe has or has not happened. Be as specific as you can. Names, dates, and concrete examples make the record strong.\n\nDoes that look right or do you want to change something?`
    }
    case 14:
      return `One last thing before your first question. Do you have anything you want to ask about how this works?`
    default:
      return ''
  }
}

type Layout = 'grid2' | 'list' | 'row'

function stepButtons(step: number): { options: string[]; layout: Layout } | null {
  if (step === 10) return { options: TIMEFRAME, layout: 'grid2' }
  if (step === 11) return { options: CADENCE, layout: 'grid2' }
  if (step === 12) return { options: DECISION, layout: 'list' }
  if (step === 13) return { options: ['That is right. Let us go.', 'I want to change something.'], layout: 'row' }
  if (step === 14) return { options: ['No questions. Let us begin.', 'Yes I have a question.'], layout: 'row' }
  return null
}

// ── Component ──────────────────────────────────────────────────────────────

export function OnboardingChat() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const mode = searchParams.get('mode') ?? 'both'
  const openingText = searchParams.get('q') ?? ''

  const [step, setStep] = useState(1)
  const [msgs, setMsgs] = useState<DMsg[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [phase, setPhase] = useState<'onboarding' | 'faq' | 'checkin' | 'done'>('onboarding')
  const [faqState, setFaqState] = useState<'input' | 'next'>('input')
  const [done, setDone] = useState(false)

  const msgsRef = useRef<HTMLDivElement>(null)
  const taRef = useRef<HTMLTextAreaElement>(null)
  const ctxRef = useRef<Ctx>({ timeframe: '', cadence: '', decision: '' })
  const historyRef = useRef<EntryMessage[]>([])

  // ── Mount: resume or start fresh ──────────────────────────────────────────

  useEffect(() => {
    const saved = obStore.load()
    if (saved && saved.mode === mode) {
      setStep(saved.step)
      setMsgs(saved.msgs.filter(m => !m.isLoading))
      historyRef.current = saved.history
      setPhase(saved.phase)
      setFaqState(saved.faqState)
      ctxRef.current = { timeframe: saved.timeframe, cadence: saved.cadence, decision: saved.decision }
      if (saved.phase === 'done') setDone(true)
    } else {
      obStore.clear()
      const first: DMsg = { id: 'ai-1', from: 'ai', content: stepContent(1, mode, { timeframe: '', cadence: '', decision: '' }) }
      setMsgs([first])
      obStore.save({ mode, openingText, step: 1, timeframe: '', cadence: '', decision: '', msgs: [first], history: [], phase: 'onboarding', faqState: 'input' })
    }
  }, [])

  useEffect(() => {
    if (msgsRef.current) msgsRef.current.scrollTop = msgsRef.current.scrollHeight
  }, [msgs])

  // ── Onboarding advancement ────────────────────────────────────────────────

  function pushStep(nextStep: number, ctx: Ctx, base: DMsg[]) {
    if (nextStep > 14) {
      triggerCheckIn(ctx, base)
      return
    }
    const content = stepContent(nextStep, mode, ctx)
    const next = [...base, { id: `ai-${nextStep}-${Date.now()}`, from: 'ai' as const, content }]
    setMsgs(next)
    setStep(nextStep)
    obStore.save({ mode, openingText, step: nextStep, ...ctx, msgs: next, history: [], phase: 'onboarding', faqState: 'input' })
  }

  function handleTextSubmit() {
    const val = input.trim()
    if (!val || loading) return
    setInput('')
    if (taRef.current) taRef.current.style.height = '38px'

    if (step === 12) {
      // Free-text decision entry
      const newCtx = { ...ctxRef.current, decision: val }
      ctxRef.current = newCtx
      const userMsg: DMsg = { id: `u-12-${Date.now()}`, from: 'user', content: val }
      const withUser = [...msgs, userMsg]
      setMsgs(withUser)
      pushStep(13, newCtx, withUser)
      return
    }

    const userMsg: DMsg = { id: `u-${step}-${Date.now()}`, from: 'user', content: val }
    const withUser = [...msgs.filter(m => !m.isLoading), userMsg]
    setMsgs(withUser)
    pushStep(step + 1, ctxRef.current, withUser)
  }

  function handleButton(btn: string) {
    const newCtx = { ...ctxRef.current }
    if (step === 10) { newCtx.timeframe = btn }
    if (step === 11) { newCtx.cadence = btn }
    if (step === 12) { newCtx.decision = btn }
    ctxRef.current = newCtx

    const userMsg: DMsg = { id: `u-btn-${step}-${Date.now()}`, from: 'user', content: btn }
    const withUser = [...msgs, userMsg]
    setMsgs(withUser)

    if (step === 13 && btn === 'I want to change something.') {
      const reset: Ctx = { timeframe: '', cadence: '', decision: '' }
      ctxRef.current = reset
      pushStep(10, reset, withUser)
      return
    }

    if (step === 14) {
      if (btn === 'No questions. Let us begin.') {
        triggerCheckIn(newCtx, withUser)
      } else {
        setPhase('faq')
        setFaqState('input')
        obStore.save({ mode, openingText, step: 14, ...newCtx, msgs: withUser, history: [], phase: 'faq', faqState: 'input' })
      }
      return
    }

    pushStep(step + 1, newCtx, withUser)
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
      obStore.save({ mode, openingText, step: 14, ...ctxRef.current, msgs: withAnswer, history: [], phase: 'faq', faqState: 'next' })
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
      triggerCheckIn(ctxRef.current, withUser)
    } else {
      setFaqState('input')
      obStore.save({ mode, openingText, step: 14, ...ctxRef.current, msgs: withUser, history: [], phase: 'faq', faqState: 'input' })
    }
  }

  // ── Check-in (message 15+) ────────────────────────────────────────────────

  function triggerCheckIn(ctx: Ctx, base: DMsg[]) {
    const seedContent = `[ONBOARDING COMPLETE]\nMode: ${mode}\nOpening: ${openingText}\nTimeframe: ${ctx.timeframe}\nCadence: ${ctx.cadence}\nDecision: ${ctx.decision}\n\nBegin the check-in.`
    const seedMsg: EntryMessage = { role: 'user', content: seedContent }
    const h: EntryMessage[] = [seedMsg]
    historyRef.current = h

    setPhase('checkin')

    const loadMsg: DMsg = { id: 'ci-load-0', from: 'ai', content: '…', isLoading: true }
    setMsgs([...base, loadMsg])
    setLoading(true)

    entryApi.chat(mode as EntryMode, h).then(res => {
      const aiEntry: EntryMessage = { role: 'assistant', content: res.reply }
      const nextH = [...h, aiEntry]
      historyRef.current = nextH


      const aiDMsg: DMsg = { id: `ci-ai-0-${Date.now()}`, from: 'ai', content: res.reply }
      const withAi = [...base, aiDMsg]
      setMsgs(withAi)
      setLoading(false)

      if (res.sessionComplete) {
        entryStorage.save({ mode: mode as EntryMode, messages: nextH, completed: true, firstMessage: openingText })
        setDone(true)
        obStore.save({ mode, openingText, step: 15, ...ctx, msgs: withAi, history: nextH, phase: 'done', faqState: 'input' })
      } else {
        obStore.save({ mode, openingText, step: 15, ...ctx, msgs: withAi, history: nextH, phase: 'checkin', faqState: 'input' })
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

    entryApi.chat(mode as EntryMode, nextH).then(res => {
      const aiEntry: EntryMessage = { role: 'assistant', content: res.reply }
      const finalH = [...nextH, aiEntry]
      historyRef.current = finalH


      const aiDMsg: DMsg = { id: `ci-ai-${Date.now()}`, from: 'ai', content: res.reply }
      const withAi = [...withLoad.filter(m => !m.isLoading), aiDMsg]
      setMsgs(withAi)
      setLoading(false)

      if (res.sessionComplete) {
        entryStorage.save({ mode: mode as EntryMode, messages: finalH, completed: true, firstMessage: openingText })
        setDone(true)
        obStore.save({ mode, openingText, step: 15, ...ctxRef.current, msgs: withAi, history: finalH, phase: 'done', faqState: 'input' })
      } else {
        obStore.save({ mode, openingText, step: 15, ...ctxRef.current, msgs: withAi, history: finalH, phase: 'checkin', faqState: 'input' })
      }
    }).catch(() => {
      setMsgs(withLoad.filter(m => !m.isLoading))
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
      return stepButtons(step)
    return null
  })()

  // Text input visible for text-only onboarding steps, step 12 (alongside buttons), FAQ input, and check-in
  const showInput = !done && !loading && (
    (phase === 'onboarding' && (step <= 9 || step === 12)) ||
    (phase === 'faq' && faqState === 'input') ||
    phase === 'checkin'
  )

  const inputPlaceholder =
    phase === 'checkin' ? 'Share what you have been working on.' :
    phase === 'faq' ? 'Type your question.' :
    step === 12 ? 'Or type it in your own words.' :
    'Type okay or proceed.'

  const visibleMsgs = msgs.filter(m => !m.isLoading || loading)

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--gw-bg)' }}>
      <div className="gw-hdr">
        <div>
          <div className="gw-logo">Groundwork</div>
          <div style={{ fontSize: 11, color: 'var(--gw-muted)' }}>
            {phase === 'checkin' || phase === 'done' ? 'Session 1' : 'Getting started'}
          </div>
        </div>
        <button className="gw-back" onClick={() => navigate('/')}>Back</button>
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

          {/* Choice buttons for the current step */}
          {currentButtons && (
            <div style={{
              display: 'flex',
              flexDirection: currentButtons.layout === 'list' ? 'column' : 'row',
              flexWrap: currentButtons.layout === 'grid2' ? 'wrap' : 'nowrap',
              gap: 7,
              padding: '10px 0 4px',
            }}>
              {currentButtons.options.map(opt => (
                <button
                  key={opt}
                  onClick={() => phase === 'faq' ? handleFaqNext(opt) : handleButton(opt)}
                  style={{
                    flex: currentButtons.layout === 'grid2' ? '1 1 calc(50% - 4px)' : undefined,
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
            <div style={{ padding: '4px 14px', borderTop: '0.5px solid var(--gw-border)', fontSize: 11, color: 'var(--gw-sub)', background: 'var(--gw-bg)', lineHeight: 1.4 }}>
              Your words are private. Nothing is saved until you choose to save it.
            </div>
            {showInput && (
              <div className="gw-chat-bar">
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
          </>
        )}
      </div>

      {done && !loading && (
        <div style={{ borderTop: '0.5px solid var(--gw-border)', background: 'white', overflowY: 'auto', maxHeight: '65vh', animation: 'gw-slideup 0.35s ease', flexShrink: 0 }}>
          <div style={{ maxWidth: 680, width: '100%', margin: '0 auto', padding: '16px' }}>
            <SaveCard
              mode={mode as EntryMode}
              onClear={() => { obStore.clear(); entryStorage.clear(); navigate('/') }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
