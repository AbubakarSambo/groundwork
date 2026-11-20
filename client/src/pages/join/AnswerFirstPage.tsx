import { useACheckInTakes, inASentence } from '@/lib/how-long-setup-takes'
import { useEffect, useRef, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { openLinkApi } from '@/api/entry'
import { looksLikeAnAddress } from '@/components/gw/an-address-that-can-receive-mail'
import { WhatYouGaveUs, type WhatYouGave } from '@/components/gw/WhatYouGaveUs'
import { Mark } from '@/components/gw/ui'
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

  const card: React.CSSProperties = {
    maxWidth: 560, margin: '0 auto', padding: '26px 20px 40px',
    minHeight: '100dvh', display: 'flex', flexDirection: 'column',
  }
  const field: React.CSSProperties = {
    /* The kit's field (app.css .input), as the check-in's own composer draws it. */
    width: '100%', padding: '12px 16px', fontSize: 16, border: '1px solid var(--rule2-crisp)', borderRadius: 10, background: 'var(--gw-card)', color: 'var(--gw-text)',
    fontFamily: 'inherit', outline: 'none',
  }

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
    <div style={{ ...card, justifyContent: 'center', textAlign: 'center' }}>
      <Mark />
      {/* B-158: this state had no heading at all, one of five different readings the deep page
          audit found for the same "a link does not work" state. "That link didn't work" is the
          prototype's own heading for it (F4-small-states/badlink.txt), used wherever else a link
          fails; `problem` is the detail sentence underneath it, as LinkProblem.tsx already does. */}
      <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--gw-text)', marginTop: 18 }}>That link didn’t work</h1>
      <p style={{ color: 'var(--gw-sub)', marginTop: 8, lineHeight: 1.5 }}>{problem}</p>
      {signedIn ? (
        <p style={{ marginTop: 18, fontSize: 14 }}>
          <button
            type="button"
            onClick={() => navigate('/today')}
            style={{ color: 'var(--gw-navy)', fontWeight: 700, background: 'none', border: 'none', padding: 0, font: 'inherit', cursor: 'pointer' }}
          >
            Go to Today
          </button>
        </p>
      ) : (
        <p style={{ marginTop: 18, fontSize: 14 }}>
          <a href="/auth" style={{ color: 'var(--gw-navy)', fontWeight: 700 }}>Sign in</a>
          {', or '}
          <a href={MARKETING_URL} style={{ color: 'var(--gw-navy)', fontWeight: 700 }}>go to the Groundwork home page</a>.
        </p>
      )}
    </div>
  )
  if (!what) return <div style={{ ...card, justifyContent: 'center', textAlign: 'center' }}><p style={{ color: 'var(--gw-muted)' }}>One moment.</p></div>

  return (
    <div style={{ background: 'var(--gw-page)', minHeight: '100dvh' }}>
      <div style={card}>
        {/*
          THE BRIEF STOPS EATING A THIRD OF THE PHONE.
          
          Measured at 375x812: the heading is 240 of 812 pixels, and it was printed above the
          conversation on every single turn - a paragraph somebody reads once, permanently occupying
          thirty per cent of the screen, with the opener restating most of it directly underneath.
          Hafsah, 23 September 2026: "that page does not seem mobile friedly."
          
          It stays whole while they are deciding whether to start, because that is the moment it is
          for. Once they are answering it folds to one line they can open again.
        */}
        {/* The question is the heading, in every phase (Hafsah, 15 November 2026): no caption and no "tap to read it again", it is just there. */}
          <div style={{ marginBottom: 18 }}>
            {/* U.6 review: the question only where the lead wrote it to be asked; otherwise the
                check-in's name, as the invitation says it, and when it runs. Never her description. */}
            {what.theQuestion ? (
              <>
                {/* A sentence, and their name as they gave it (U.6 review). It was a label in capitals,
                    "U6G ASKED", over the question. */}
                <p style={{ fontSize: 14, color: 'var(--gw-sub)', margin: 0 }}>
                  {what.askedBy ? `${what.askedBy} asked you this.` : 'You have been asked this.'}
                </p>
                <h1 style={{ fontSize: 20, margin: '6px 0 0', lineHeight: 1.3 }}>{what.theQuestion}</h1>
              </>
            ) : (
              <h1 style={{ fontSize: 20, margin: 0, lineHeight: 1.3 }}>
                {what.askedBy ? `${what.askedBy} invited you to “${what.groundLabel}”` : `You were invited to “${what.groundLabel}”`}
              </h1>
            )}
            {phase === 'reading' && what.schedule && <p style={{ fontSize: 14, color: 'var(--gw-sub)', margin: '6px 0 0' }}>{what.schedule}</p>}
          </div>

        {phase === 'reading' && (
          <div>
            <p style={{ fontSize: 14, color: 'var(--gw-sub)', lineHeight: '22px' }}>
              {takes ? `It takes ${inASentence(takes)}. ` : ''}You will get the report at the end.
            </p>
            {/* The reason, above the box, when the first answer did not start the conversation. */}
            {problem && (
              <div role="alert" style={{ color: 'var(--gw-red-t)', fontSize: 14, marginTop: 12, lineHeight: 1.5 }}>{problem}</div>
            )}
          </div>
        )}

        {(phase === 'talking' || phase === 'address') && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {turns.map((t, i) => (
              <div key={i} style={{
                alignSelf: t.who === 'them' ? 'flex-end' : 'flex-start',
                maxWidth: '86%', padding: '10px 14px', borderRadius: 14, fontSize: 14, lineHeight: 1.5,
                background: t.who === 'them' ? 'var(--gw-navy)' : 'white',
                color: t.who === 'them' ? '#fff' : 'var(--gw-text)',
                border: t.who === 'them' ? 'none' : '1px solid var(--gw-border)',
              }}>{t.text}</div>
            ))}
            <div ref={endRef} />
          </div>
        )}

        {/* Said only where the page opened straight into a conversation nobody can see the start of. */}
        {phase === 'talking' && turns.length === 0 && (
          <div style={{ fontSize: 13, color: 'var(--gw-sub)', lineHeight: '21px', marginBottom: 12 }}>
            You had already started this. Everything you said is saved - carry on below, or press
            &ldquo;I am done&rdquo; to finish.
          </div>
        )}

        {(phase === 'reading' || phase === 'talking' || phase === 'address') && (
          /*
            PINNED TO THE BOTTOM, AND FINISHING IS NOT HIDDEN UNDER IT.
            
            Two faults on a phone. The composer scrolled away with the page, so after a few answers
            the box you type in was below the fold and the transcript had to be scrolled past to
            reach it. And "I am done" was a thirteen-pixel underlined link BENEATH the input - the
            one place a phone keyboard covers - on the control Hafsah specifically asked to be
            visible: "make sure the people can see i'm done".
            
            So the whole thing sticks to the bottom of the viewport, the transcript scrolls under
            it, and the two actions sit on one row: finishing on the left where a thumb rests,
            sending on the right. `env(safe-area-inset-bottom)` keeps it clear of the home bar.
          */
          <div style={{
            position: 'sticky', bottom: 0, marginTop: 14,
            paddingTop: 10, paddingBottom: `calc(10px + env(safe-area-inset-bottom, 0px))`,
            background: 'var(--gw-page)', borderTop: '1px solid var(--gw-border)',
          }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
              <textarea
                id="open-answer" value={input} rows={1}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); say() } }}
                placeholder={phase === 'address' && step ? PLACEHOLDERS[step] : 'Type your answer'} style={{ ...field, flex: 1, resize: 'none', minWidth: 0, maxHeight: 140 }}
              />
              <button onClick={say} disabled={busy || !input.trim()} aria-label="Send"
                style={{ width: 44, height: 44, borderRadius: '50%', border: 'none', background: 'var(--gw-navy)', color: '#fff', fontSize: 18, cursor: 'pointer', flexShrink: 0, opacity: busy || !input.trim() ? .5 : 1 }}>
                ↑
              </button>
            </div>
            {phase === 'address' && problem && (
              <div role="alert" style={{ color: 'var(--gw-red-t)', fontSize: 13, marginTop: 8 }}>{problem}</div>
            )}
            {phase === 'address' && step === 'phone' && (
              <div style={{ marginTop: 10 }}>
                <button className="btn sec" disabled={busy} onClick={() => { setTurns(t => [...t, { who: 'them', text: 'Skip' }]); void finish('') }}>Skip</button>
              </div>
            )}
            {phase === 'talking' && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, gap: 10 }}>
              <button className="btn sec" onClick={askWhoTheyAre}
                >
                I am done
              </button>
              {/* What pressing it does, so nobody presses it wondering whether it throws away the
                  answers they have just given. */}
              <span style={{ fontSize: 12, color: 'var(--gw-muted)', textAlign: 'right', lineHeight: '17px' }}>
                Finish and say where to send the report
              </span>
            </div>
            )}
          </div>
        )}

        {phase === 'done' && (
          <div style={{ marginTop: 20 }}>
            {/* "on the record" is our word for what the product does, and she read it five times
                in one conversation. See words-we-do-not-use on the API. */}
            <h2 style={{ fontSize: 18, margin: '0 0 8px' }}>That is everything. Thank you.</h2>
            <p style={{ fontSize: 14, color: 'var(--gw-sub)', lineHeight: '22px', margin: 0 }}>
              {sentTo
                ? `The report goes to ${sentTo} at the end.`
                : 'Your answers are saved.'}
            </p>
            {/*
              AND WHAT THEY GAVE, WHICH IS THE ONLY THING THIS PRODUCT GIVES BACK BEFORE THE REPORT.
              Somebody who followed a link once has no board, no next session and nothing else to
              read; this is the whole of what they get for five minutes of their own work.
            */}
            <WhatYouGaveUs it={whatYouGave} />
          </div>
        )}
      </div>
    </div>
  )
}
