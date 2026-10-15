import { useEffect, useRef, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { openLinkApi } from '@/api/entry'
import { looksLikeAnAddress } from '@/components/gw/an-address-that-can-receive-mail'
import { WhatYouGaveUs, type WhatYouGave } from '@/components/gw/WhatYouGaveUs'
import { Mark } from '@/components/gw/ui'
import { MARKETING_URL } from '@/lib/marketing'
import { useAuthStore } from '@/stores/auth'

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
 * WHAT "DONE" WAITS FOR, SAID (U.6 review). The button stayed greyed out until the name, the
 * organisation and the email were all there, and nothing said so. What is required is unchanged.
 */
export function whatIsStillNeeded(name: string, org: string, email: string): string {
  const missing = [!name.trim() && 'your name', !org.trim() && 'your organisation', !email.trim() && 'your email'].filter(Boolean) as string[]
  const list = missing.length <= 1 ? missing.join('') : `${missing.slice(0, -1).join(', ')} and ${missing[missing.length - 1]}`
  return `Add ${list} to finish.`
}

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
  const [name, setName] = useState('')
  /* WHO THEY ANSWERED FOR. On a link sent across a network the organisation is the unit the whole
     report is about, and this asked for a name and an address and nothing else. */
  const [org, setOrg] = useState('')
  /* The question "do you want the report?" is gone: the page promises it before the first answer,
     so asking afterwards had one real answer and cost the record a name. See the address step. */
  const [whatYouGave, setWhatYouGave] = useState<WhatYouGave | null>(null)
  const [sentTo, setSentTo] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!token) { setProblem('That link is missing its code.'); return }
    openLinkApi.whatThisIs(token)
      .then(setWhat)
      .catch((err: any) => setProblem(err?.response?.data?.message ?? 'That link does not open anything.'))
  }, [token])

  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }) }, [turns, phase])

  async function begin() {
    if (busy) return
    setBusy(true)
    try {
      const started = await openLinkApi.start(token)
      remember(started.key)
      setPhase('talking')
      if (started.reply) setTurns([{ who: 'it', text: started.reply }])
    } catch (err: any) {
      /*
       * THE ELEVENTH PERSON IN THE ROOM WAS TOLD NOTHING.
       *
       * These routes are rate limited, and a hundred people scanning one QR code on one wifi hit
       * that limit within seconds. The 429 was caught, `problem` was set - and `problem` was only
       * rendered on the address screen, so on this screen the button simply went back to saying
       * "Start". Proven on a phone, 23 September 2026: 429 in the network log, nothing at all on
       * the screen. The limit itself is fixed in a-room-of-people-is-not-one-person; this is the
       * half that matters when it is hit anyway.
       */
      const status = err?.response?.status
      setProblem(
        status === 429
          ? 'A lot of people are starting at the same time. Wait a few seconds and press Start again - nothing is lost.'
          : err?.response?.data?.message ?? 'That did not start. Try the link again.',
      )
    } finally { setBusy(false) }
  }

  async function say() {
    const said = input.trim()
    if (!said || !key || busy) return
    setBusy(true)
    setInput('')
    setTurns(t => [...t, { who: 'them', text: said }])
    try {
      const back = await openLinkApi.say(key, said)
      setTurns(t => [...t, { who: 'it', text: back.reply }])
      /*
       * WHEN IT HAS CLOSED, THE PAGE CLOSES.
       *
       * Read live, 22 September 2026: the conversation said "your report is ready now, speak soon"
       * and the box stayed open under it, so the person typed two more questions into a session that
       * had already ended and got answers to neither. The engine says when a session is over; this
       * page took the reply and ignored the flag beside it. Now the close moves straight on to the
       * one thing left - who they are and where the report goes - which is what the ending is for.
       */
      if (back.sessionComplete) setPhase('address')
    } catch (err: any) {
      setTurns(t => [...t, { who: 'it', text: err?.response?.data?.message ?? 'That did not send. Say it again.' }])
    } finally { setBusy(false) }
  }

  async function finish(withEmail: boolean) {
    if (!key || busy) return
    if (withEmail && !name.trim()) { setProblem('Your name.'); return }
    if (withEmail && !org.trim()) { setProblem('Your organisation.'); return }
    if (withEmail && !looksLikeAnAddress(email)) { setProblem('That does not look like an email address.'); return }
    setBusy(true)
    setProblem('')
    try {
      /* The name goes either way; the address and the wish for the report only where they said yes. */
      const done = await openLinkApi.finish(key, withEmail ? email.trim() : undefined, name.trim() || undefined, withEmail, org.trim() || undefined)
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
       * A RECORD THAT IS STILL THIN SENDS THEM BACK TO THE CONVERSATION, NOT TO A DEAD END.
       *
       * The product refuses to close a check-in with one answer in it, which is right and is the
       * reason the reports are worth reading. Read live on the open link: the refusal arrived on
       * the address screen, where there is nothing to answer, so the only thing left to press was
       * the button that had just failed. Its own words say what to do - answer one or two more
       * questions - so the page does that: back to the chat, with the reason above the box.
       */
      if (/still thin|more exchanges/i.test(said)) {
        setTurns(t => [...t, { who: 'it', text: said }])
        setPhase('talking')
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
    width: '100%', padding: '11px 16px', fontSize: 15, borderRadius: 21,
    border: '1px solid var(--gw-border)', fontFamily: 'inherit', outline: 'none', background: 'white',
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
        <p style={{ marginTop: 18, fontSize: 14.5 }}>
          <button
            type="button"
            onClick={() => navigate('/today')}
            style={{ color: 'var(--gw-navy)', fontWeight: 600, background: 'none', border: 'none', padding: 0, font: 'inherit', cursor: 'pointer' }}
          >
            Go to Today
          </button>
        </p>
      ) : (
        <p style={{ marginTop: 18, fontSize: 14.5 }}>
          <a href="/auth" style={{ color: 'var(--gw-navy)', fontWeight: 600 }}>Sign in</a>
          {', or '}
          <a href={MARKETING_URL} style={{ color: 'var(--gw-navy)', fontWeight: 600 }}>go to the Groundwork home page</a>.
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
        {phase === 'reading' ? (
          <div style={{ marginBottom: 18 }}>
            {/* U.6 review: the question only where the lead wrote it to be asked; otherwise the
                check-in's name, as the invitation says it, and when it runs. Never her description. */}
            {what.theQuestion ? (
              <>
                {/* A sentence, and their name as they gave it (U.6 review). It was a label in capitals,
                    "U6G ASKED", over the question. */}
                <p style={{ fontSize: 13.5, color: 'var(--gw-sub)', margin: 0 }}>
                  {what.askedBy ? `${what.askedBy} asked you this.` : 'You have been asked this.'}
                </p>
                <h1 style={{ fontSize: 20, margin: '6px 0 0', lineHeight: 1.3 }}>{what.theQuestion}</h1>
              </>
            ) : (
              <h1 style={{ fontSize: 20, margin: 0, lineHeight: 1.3 }}>
                {what.askedBy ? `${what.askedBy} invited you to “${what.groundLabel}”` : `You were invited to “${what.groundLabel}”`}
              </h1>
            )}
            {what.schedule && <p style={{ fontSize: 13.5, color: 'var(--gw-sub)', margin: '6px 0 0' }}>{what.schedule}</p>}
          </div>
        ) : (
          <details style={{ marginBottom: 14 }}>
            <summary style={{ fontSize: 12.5, color: 'var(--gw-sub)', cursor: 'pointer', listStyle: 'none' }}>
              {what.theQuestion ? (what.askedBy ? `What ${what.askedBy} asked. Tap to read it again.` : 'What you were asked. Tap to read it again.') : `This is “${what.groundLabel}”. Tap to read it again.`}
            </summary>
            <p style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--gw-text)', margin: '8px 0 0' }}>
              {what.theQuestion || what.groundLabel}
            </p>
          </details>
        )}

        {phase === 'reading' && (
          <div>
            <p style={{ fontSize: 14, color: 'var(--gw-sub)', lineHeight: 1.6 }}>
              {/*
                WHAT IT USED TO SAY: "nobody sees what you write". That is not true and it is not a
                small untruth - the person who sent this link reads every answer, and the report
                built from them goes back out to everybody who asked for it. A promise of privacy
                made in the second before somebody types is the worst place in the product to be
                wrong. Hafsah, 23 September 2026.
              */}
              Answer in your own words. It takes about ten minutes. The answers help everybody get a
              shared picture, and you will receive the consolidated report at the end.
            </p>
            <button onClick={begin} disabled={busy}
              style={{ marginTop: 16, padding: '12px 22px', borderRadius: 8, border: 'none', background: 'var(--gw-navy)', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              {busy ? 'Starting...' : 'Start'}
            </button>
            {/* The reason, where the button is. See begin() for the hundred people this is for. */}
            {problem && (
              <div role="alert" style={{ color: 'var(--gw-red-t)', fontSize: 13.5, marginTop: 12, lineHeight: 1.5 }}>{problem}</div>
            )}
          </div>
        )}

        {(phase === 'talking' || phase === 'address') && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {turns.map((t, i) => (
              <div key={i} style={{
                alignSelf: t.who === 'them' ? 'flex-end' : 'flex-start',
                maxWidth: '86%', padding: '10px 14px', borderRadius: 14, fontSize: 14.5, lineHeight: 1.5,
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
          <div style={{ fontSize: 13, color: 'var(--gw-sub)', lineHeight: 1.6, marginBottom: 12 }}>
            You had already started this. Everything you said is saved - carry on below, or press
            &ldquo;I am done&rdquo; to finish.
          </div>
        )}

        {phase === 'talking' && (
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
                placeholder="Type your answer" style={{ ...field, flex: 1, resize: 'none', minWidth: 0, maxHeight: 140 }}
              />
              <button onClick={say} disabled={busy || !input.trim()} aria-label="Send"
                style={{ width: 42, height: 42, borderRadius: '50%', border: 'none', background: 'var(--gw-navy)', color: '#fff', fontSize: 18, cursor: 'pointer', flexShrink: 0, opacity: busy || !input.trim() ? .5 : 1 }}>
                ↑
              </button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, gap: 10 }}>
              <button onClick={() => setPhase('address')}
                style={{
                  background: 'white', border: '1px solid var(--gw-border)', borderRadius: 20,
                  color: 'var(--gw-navy)', fontSize: 13.5, fontWeight: 600, padding: '8px 15px',
                  cursor: 'pointer', fontFamily: 'inherit', minHeight: 40,
                }}>
                I am done
              </button>
              {/* What pressing it does, so nobody presses it wondering whether it throws away the
                  answers they have just given. */}
              <span style={{ fontSize: 11.5, color: 'var(--gw-muted)', textAlign: 'right', lineHeight: 1.4 }}>
                Finish and say where to send the report
              </span>
            </div>
          </div>
        )}

        {/*
          WHO THEY ARE, AND IT IS ASKED OF EVERYBODY.
          
          This used to open on "Do you want the report?" and only ask for a name and an address if
          the answer was yes. Hafsah, 23 September 2026: "we need their email and names when they
          checkin and put their emails" - and the page now promises, before the first answer, that
          the consolidated report comes back to them. Asking whether they want the thing they were
          just promised is a question with one real answer, and it was costing the organiser the
          half of the record that says whose answer this is.
          
          So the three are asked outright and all three are needed. Nobody is anonymous by accident
          and nobody is anonymised by the product - whether the OTHERS see these names is the
          organiser's choice at the moment they share it, which is a different decision made by a
          different person. See what-the-respondents-get.ts.
        */}
        {phase === 'address' && (
          <div style={{ marginTop: 16, background: 'white', border: '1px solid var(--gw-border)', borderRadius: 12, padding: '16px 18px' }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>Last thing: who are you?</div>
            {/*
              THE SENTENCE UNDER IT IS GONE. Hafsah, 23 September 2026: "this is not necessary 'the
              part where it says so you are not anonymises'". She is right - three labelled fields
              asking for a name, an organisation and an address do not need a paragraph explaining
              that giving them makes you identifiable. The labels say what each one is for.
            */}
            <div style={{ display: 'grid', gap: 8 }}>
              <label htmlFor="open-name" style={{ fontSize: 12.5, color: 'var(--gw-sub)' }}>Your name</label>
              <input id="open-name" type="text" autoComplete="name" value={name}
                onChange={e => { setName(e.target.value); setProblem('') }}
                placeholder="Your name" style={field} />
              <label htmlFor="open-org" style={{ fontSize: 12.5, color: 'var(--gw-sub)' }}>Your organisation</label>
              <input id="open-org" type="text" autoComplete="organization" value={org}
                onChange={e => { setOrg(e.target.value); setProblem('') }}
                placeholder="Where you work" style={field} />
              <label htmlFor="open-email" style={{ fontSize: 12.5, color: 'var(--gw-sub)' }}>Where to send the report</label>
              <input id="open-email" type="email" autoComplete="email" value={email}
                onChange={e => { setEmail(e.target.value); setProblem('') }}
                placeholder="you@work.com" style={field} />
            </div>
            {problem && <div role="alert" style={{ color: 'var(--gw-red-t)', fontSize: 13, marginTop: 8 }}>{problem}</div>}
            {/* U.6 review: "Done" waits for all three, and now it says so. The same three are needed. */}
            {(!email.trim() || !name.trim() || !org.trim()) && (
              <div style={{ fontSize: 12.5, color: 'var(--gw-sub)', marginTop: 10 }}>{whatIsStillNeeded(name, org, email)}</div>
            )}
            <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
              <button onClick={() => finish(true)} disabled={busy || !email.trim() || !name.trim() || !org.trim()}
                style={{ padding: '10px 18px', borderRadius: 8, border: 'none', background: 'var(--gw-navy)', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: busy || !email.trim() || !name.trim() || !org.trim() ? .5 : 1 }}>
                Done
              </button>
            </div>
          </div>
        )}

        {phase === 'done' && (
          <div style={{ marginTop: 20 }}>
            {/* "on the record" is our word for what the product does, and she read it five times
                in one conversation. See words-we-do-not-use on the API. */}
            <h2 style={{ fontSize: 18, margin: '0 0 8px' }}>That is everything. Thank you.</h2>
            <p style={{ fontSize: 14, color: 'var(--gw-sub)', lineHeight: 1.6, margin: 0 }}>
              {sentTo
                ? `The consolidated report goes to ${sentTo} at the end.`
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
