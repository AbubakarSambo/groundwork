import { useACheckInTakes, inASentence } from '@/lib/how-long-setup-takes'
import { useEffect, useRef, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { openLinkApi } from '@/api/entry'
import { looksLikeAnAddress } from '@/components/gw/an-address-that-can-receive-mail'
import { WhatYouGaveUs, type WhatYouGave } from '@/components/gw/WhatYouGaveUs'
import { Mark } from '@/components/gw/ui'
import { Button } from '@/components/gw/ui/Button'
import { Bubble } from '@/components/gw/ui/Bubble'
import { Composer } from '@/components/gw/ui/Composer'
import { ConversationCard } from '@/components/gw/ui/ConversationCard'
import { InTheDesignSystem } from '@/components/gw/ui/the-design-system'
import { MARKETING_URL } from '@/lib/marketing'
import { useAuthStore } from '@/stores/auth'
import { keepTheNumberForWhenTheySignIn } from '@/lib/a-number-given-before-signing-in'

/**
 * ANSWER FIRST, SAY WHO YOU ARE AT THE END.
 *
 * Hafsah, 19 September 2026: "the update can also be a QR code we share where people can provide
 * the update and add their email in the end to get the final report themselves."
 *
 * The same link the ground page has always carried, with the order reversed. It opens on the lead's
 * own question and a box to type in. Nothing is asked before that: not a name, not an address, not
 * a role. When they are done it asks where to send the report, and says plainly that leaving it
 * blank is allowed - their answer is already on the record either way.
 *
 * ONE CARD, NO SHELL. Somebody arrives here from a phone camera, which is the whole reason the QR
 * code exists, so it draws like the bare check-in a team update opens: see the-link-opens-on-the-
 * question.
 */
type Turn = { who: 'them' | 'it'; text: string }

/**
 * THE LAST THREE THINGS, ASKED IN THE CHAT (Hafsah, 15 November 2026, audit of the check-in pages, row 20). The person's name,
 * organisation and email are still all needed (her decision of 23 September), and the phone number is still taken and still
 * editable; they are asked one at a time as Groundwork's own lines, not as a form that appears after the conversation.
 */
type Step = 'name' | 'org' | 'email' | 'phone'
const ASKS: Record<Step, string> = {
  name: 'Last thing. What is your name?',
  org: 'And which organisation are you with?',
  email: 'Where should I send the report?',
  phone: 'What is your phone number? You can skip this.',
}
const PLACEHOLDERS: Record<Step, string> = { name: 'Your name', org: 'Where you work', email: 'you@work.com', phone: 'Your phone number' }

export function AnswerFirstPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const signedIn = useAuthStore(s => !!s.isAuthenticated)
  const token = params.get('t') ?? ''
  const [what, setWhat] = useState<{ groundLabel: string; theQuestion: string | null; askedBy: string | null; schedule?: string | null } | null>(null)
  const [problem, setProblem] = useState('')
  /*
   * THE KEY OUTLIVES THE TAB, BECAUSE THE ANSWER DOES.
   *
   * "That answer does not belong to anything" - read on 23 September 2026, and it is the honest
   * server response to a key it has never seen. The key only ever lived in React state, so a
   * refresh, a phone locking, a tab restored by the browser, or being signed out mid-answer lost
   * it - and the person was then told their answer belonged to nothing, while every word of it sat
   * safely on the server against a row they could no longer reach.
   *
   * Kept per link, so somebody who answers two different check-ins on one phone does not resume
   * the wrong one. Wrapped, because storage throws in a private window and an answer page must
   * open regardless - see the artifact storage rule this codebase follows elsewhere.
   */
  /* `gw-` so the sign-out sweep reaches it. signing-out-leaves-nothing-behind counts every key the
     app writes and refuses one it cannot clear - and it caught this on the first run. */
  const keyFor = `gw-answer-${token}`
  const [key, setKey] = useState<string | null>(() => {
    try { return window.localStorage.getItem(keyFor) } catch { return null }
  })
  const remember = (k: string | null) => {
    setKey(k)
    try { k ? window.localStorage.setItem(keyFor, k) : window.localStorage.removeItem(keyFor) } catch { /* private window */ }
  }
  const [turns, setTurns] = useState<Turn[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  /*
   * SOMEBODY WHO HAD ALREADY STARTED PICKS UP WHERE THEY WERE.
   *
   * With the key surviving the tab, a returning person would otherwise land on "Start" and mint a
   * SECOND row - two half-answers from one person, which is the duplicate the open link's own merge
   * exists to clean up. If a key is on this device for this link, the conversation is already open.
   */
  const [phase, setPhase] = useState<'reading' | 'talking' | 'address' | 'done'>(() => {
    try { return window.localStorage.getItem(`gw-answer-${token}`) ? 'talking' : 'reading' } catch { return 'reading' }
  })
  const [email, setEmail] = useState('')
  const [step, setStep] = useState<Step | null>(null)
  /* Optional, always asked (Hafsah, 30 October 2026); saved to them through PATCH /auth/me when that address signs in here. */
  const takes = useACheckInTakes()
  const [name, setName] = useState('')
  /* WHO THEY ANSWERED FOR. On a link sent across a network the organisation is the unit the whole
     report is about, and this asked for a name and an address and nothing else. */
  const [org, setOrg] = useState('')
  /* The question "do you want the report?" is gone: the page promises it before the first answer,
     so asking afterwards had one real answer and cost the record a name. See the address step. */
  const [whatYouGave, setWhatYouGave] = useState<WhatYouGave | null>(null)
  const [sentTo, setSentTo] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement | null>(null)
  /* The last three questions are begun once, however many times the close arrives. */
  const askedRef = useRef(false)

  useEffect(() => {
    if (!token) { setProblem('That link is missing its code.'); return }
    openLinkApi.whatThisIs(token)
      .then(setWhat)
      .catch((err: any) => setProblem(err?.response?.data?.message ?? 'That link does not open anything.'))
  }, [token])

  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }) }, [turns, phase])

  /* Starts the conversation, returning its key, or null when it did not start (the reason is on screen). */
  async function begin(): Promise<string | null> {
    try {
      const started = await openLinkApi.start(token)
      remember(started.key)
      setPhase('talking')
      if (started.reply) setTurns([{ who: 'it', text: started.reply }])
      return started.key
    } catch (err: any) {
      /*
       * THE ELEVENTH PERSON IN THE ROOM WAS TOLD NOTHING.
       *
       * These routes are rate limited, and a hundred people scanning one QR code on one wifi hit
       * that limit within seconds. The 429 was caught, `problem` was set, and nothing rendered it.
       * The reason is shown above the box now, and what they typed stays in the box.
       */
      const status = err?.response?.status
      setProblem(
        status === 429
          ? 'A lot of people are starting at the same time. Wait a few seconds and send it again. Nothing is lost.'
          : err?.response?.data?.message ?? 'That did not start. Try the link again.',
      )
      return null
    }
  }

  /* Moves on to the last three questions, once, as Groundwork's own lines. */
  function askWhoTheyAre() {
    setPhase('address')
    if (askedRef.current) return
    askedRef.current = true
    setStep('name')
    setTurns(t => [...t, { who: 'it', text: ASKS.name }])
  }

  async function answerTheStep(said: string) {
    const say = (text: string) => setTurns(t => [...t, { who: 'them', text: said }, { who: 'it', text }])
    setInput('')
    setProblem('')
    if (step === 'name') { setName(said); say(ASKS.org); setStep('org') }
    else if (step === 'org') { setOrg(said); say(ASKS.email); setStep('email') }
    else if (step === 'email') {
      if (!looksLikeAnAddress(said)) { say(`That does not look like an email address. ${ASKS.email}`); return }
      setEmail(said.trim()); say(ASKS.phone); setStep('phone')
    } else if (step === 'phone') {
      setTurns(t => [...t, { who: 'them', text: said }])
      await finish(said)
    }
  }

  async function say() {
    const said = input.trim()
    if (!said || busy) return
    if (phase === 'address') { await answerTheStep(said); return }
    setBusy(true)
    setProblem('')
    try {
      /* The first answer starts the conversation, so opening the link does not (a mail scanner opening it starts nothing). */
      const k = key ?? await begin()
      if (!k) return
      setInput('')
      setTurns(t => [...t, { who: 'them', text: said }])
      try {
        const back = await openLinkApi.say(k, said)
        setTurns(t => [...t, { who: 'it', text: back.reply }])
        /*
         * WHEN IT HAS CLOSED, THE PAGE CLOSES. Read live, 22 September 2026: the conversation said
         * "your report is ready now, speak soon" and the box stayed open under it. The engine says
         * when a session is over; the close moves straight on to the last three questions.
         */
        if (back.sessionComplete) askWhoTheyAre()
      } catch (err: any) {
        setTurns(t => [...t, { who: 'it', text: err?.response?.data?.message ?? 'That did not send. Say it again.' }])
      }
    } finally { setBusy(false) }
  }

  async function finish(phoneGiven: string) {
    if (!key || busy) return
    setBusy(true)
    setProblem('')
    try {
      const done = await openLinkApi.finish(key, email.trim(), name.trim() || undefined, true, org.trim() || undefined)
      keepTheNumberForWhenTheySignIn(email, phoneGiven)
      setSentTo(done.at)
      /* What we measured about their own answers, told to them. See WhatYouGaveUs. */
      if ((done as any)?.whatYouGave) setWhatYouGave((done as any).whatYouGave as WhatYouGave)
      /* Finished, so the key is spent. The next person to open this link on this phone - at an
         event, that happens - starts their own answer rather than resuming somebody else's. */
      remember(null)
      setPhase('done')
    } catch (err: any) {
      const said = err?.response?.data?.message ?? 'That did not finish. Try again.'
      /*
       * A RECORD THAT IS STILL THIN SENDS THEM BACK TO THE CONVERSATION, NOT TO A DEAD END. The
       * product refuses to close a check-in with one answer in it; its own words say what to do,
       * so the page does that: back to the chat, with the reason in the conversation.
       */
      if (/still thin|more exchanges/i.test(said)) {
        setTurns(t => [...t, { who: 'it', text: said }])
        setPhase('talking')
        setStep(null)
        askedRef.current = false
        setProblem('')
      } else {
        setProblem(said)
      }
    } finally { setBusy(false) }
  }

  /* The four steps across the top (answer-without-account.jpg), the current one filled. */
  const STEPS = ['1. What it’s about', '2. Answering', '3. Who you are', '4. Done']
  const current = { reading: 0, talking: 1, address: 2, done: 3 }[phase]
  const steps = (
    <ol className="ds-steps" aria-label="Where you are">
      {STEPS.map((label, i) => <li key={label} className={i === current ? 'ds-step ds-step-on' : 'ds-step'} aria-current={i === current ? 'step' : undefined}>{label}</li>)}
    </ol>
  )

  /*
   * WALKTHROUGH PASS 2, ITEM 4: A DEAD END WITH NO MARK AND NO WAY ON. A link that does not open
   * (no code at all, or the server refuses it) left a bare sentence on a blank page - nowhere to
   * go and nothing to say where this even was, unlike every other small-state screen in the
   * product (docs/prototype/screens/F4-small-states/). Same shape here: the mark, the sentence,
   * and a way through - sign in, for somebody who already has an account, or the Groundwork home
   * page for anybody else.
   */
  /*
   * B-207 (review round 2): SOMEBODY ALREADY SIGNED IN IS NOT OFFERED "SIGN IN, OR GO TO THE
   * GROUNDWORK HOME PAGE". Both of those are for somebody signed out; signed in, Today is where
   * they already belong, and sending them to /auth or the marketing page both lead away from the
   * product they are already using.
   */
  if (problem && !what) return (
    <InTheDesignSystem.Provider value={true}>
      <div className="ds-alone">
        <div className="ds-ci">
          <Mark />
          <div className="ds-pair">
            {/* B-158: this state had no heading at all, one of five different readings the deep page
                audit found for the same "a link does not work" state. "That link didn't work" is the
                prototype's own heading for it (F4-small-states/badlink.txt), used wherever else a link
                fails; `problem` is the detail sentence underneath it, as LinkProblem.tsx already does. */}
            <h1 className="ds-text-title">That link didn’t work</h1>
            <p className="ds-text-body">{problem}</p>
          </div>
          {signedIn ? (
            <p className="ds-text-body">
              <button type="button" onClick={() => navigate('/today')} className="ds-link">Go to Today</button>
            </p>
          ) : (
            <p className="ds-text-body">
              <a href="/auth" className="ds-link">Sign in</a>
              {', or '}
              <a href={MARKETING_URL} className="ds-link">go to the Groundwork home page</a>.
            </p>
          )}
        </div>
      </div>
    </InTheDesignSystem.Provider>
  )
  if (!what) return <InTheDesignSystem.Provider value={true}><div className="ds-alone"><p className="ds-empty">One moment.</p></div></InTheDesignSystem.Provider>

  const box = (
    <>
      <Composer
        inputRef={inputRef}
        value={input}
        onChange={setInput}
        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void say() } }}
        onSend={() => void say()}
        disabled={busy}
        sendDisabled={!input.trim()}
        placeholder={phase === 'address' && step ? PLACEHOLDERS[step] : 'Type your answer'}
        ariaLabel="Your answer"
        sendLabel="Send"
      />
      {phase === 'address' && problem && <p role="alert" className="ds-text-secondary ds-ink-con">{problem}</p>}
      {phase === 'address' && step === 'phone' && (
        <div className="ds-actions">
          <Button kind="secondary" disabled={busy} onClick={() => { setTurns(t => [...t, { who: 'them', text: 'Skip' }]); void finish('') }}>Skip</Button>
        </div>
      )}
      {/* "I am done" beside what it does, never a small link under the box (Hafsah, 23 September: "make sure the people can see i'm done"). */}
      {phase === 'talking' && (
        <div className="ds-actions">
          <Button kind="secondary" onClick={askWhoTheyAre}>I am done</Button>
          {/* What pressing it does, so nobody presses it wondering whether it throws away the
              answers they have just given. */}
          <span className="ds-text-meta">Finish and say where to send the report</span>
        </div>
      )}
    </>
  )

  /*
   * ON THE DESIGN SYSTEM (journey 2, Hafsah, 23 November 2026), as answer-without-account.jpg lays it out: the four steps across
   * the top, who asked, the question as the page's title, one line under it, then the conversation in the same card as the
   * check-in's, with the box to type in pinned at the bottom of the card where a thumb is. Every value is a token.
   */
  return (
    <InTheDesignSystem.Provider value={true}>
      <div className="ds-alone">
        <div className="ds-ci">
          {steps}
          {/* The question is the heading, in every phase (Hafsah, 15 November 2026): no caption and no "tap to read it again", it is just there. */}
          <header className="ds-pair">
            {/* U.6 review: the question only where the lead wrote it to be asked; otherwise the
                check-in's name, as the invitation says it, and when it runs. Never her description. */}
            {what.theQuestion ? (
              <>
                {/* A sentence, and their name as they gave it (U.6 review). It was a label in capitals,
                    "U6G ASKED", over the question. */}
                <p className="ds-text-secondary">{what.askedBy ? `${what.askedBy} asked you this.` : 'You have been asked this.'}</p>
                <h1 className="ds-text-title">{what.theQuestion}</h1>
              </>
            ) : (
              <h1 className="ds-text-title">
                {what.askedBy ? `${what.askedBy} invited you to “${what.groundLabel}”` : `You were invited to “${what.groundLabel}”`}
              </h1>
            )}
            {phase === 'reading' && (
              <>
                {what.schedule && <p className="ds-text-secondary">{what.schedule}</p>}
                <p className="ds-text-body">{takes ? `It takes ${inASentence(takes)}. ` : ''}You will get the report at the end.</p>
                {/* The reason, above the box, when the first answer did not start the conversation. */}
                {problem && (
                  <p role="alert" className="ds-text-body ds-ink-con">{problem}</p>
                )}
              </>
            )}
          </header>

          {phase === 'done' ? (
            <section className="ds-pair">
              {/* "on the record" is our word for what the product does, and she read it five times
                  in one conversation. See words-we-do-not-use on the API. */}
              <h2 className="ds-text-section">That is everything. Thank you.</h2>
              <p className="ds-text-body">{sentTo ? `The report goes to ${sentTo} at the end.` : 'Your answers are saved.'}</p>
              {/* AND WHAT THEY GAVE, WHICH IS THE ONLY THING THIS PRODUCT GIVES BACK BEFORE THE REPORT.
                  Somebody who followed a link once has no board, no next session and nothing else to
                  read; this is the whole of what they get for five minutes of their own work. */}
              <WhatYouGaveUs it={whatYouGave} />
            </section>
          ) : (
            /* Before the first answer the box sits under the question on its own (nothing to read yet, so no empty card); from
               the first answer on, the conversation is the check-in's card with the box pinned at its foot. */
            phase === 'reading' ? <div className="ds-ci-foot ds-ci-foot-alone">{box}</div> : (
            <ConversationCard header={null} footer={box}>
              {/* Said only where the page opened straight into a conversation nobody can see the start of. */}
              {phase === 'talking' && turns.length === 0 && (
                <p className="ds-text-secondary">
                  You had already started this. Everything you said is saved. Carry on below, or press “I am done” to finish.
                </p>
              )}
              {turns.map((t, i) => <Bubble key={i} mine={t.who === 'them'}>{t.text}</Bubble>)}
              <div ref={endRef} />
            </ConversationCard>
            )
          )}
        </div>
      </div>
    </InTheDesignSystem.Provider>
  )
}
