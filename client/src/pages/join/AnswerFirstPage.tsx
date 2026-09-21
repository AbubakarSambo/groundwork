import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { openLinkApi } from '@/api/entry'
import { looksLikeAnAddress } from '@/components/gw/an-address-that-can-receive-mail'

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

export function AnswerFirstPage() {
  const [params] = useSearchParams()
  const token = params.get('t') ?? ''
  const [what, setWhat] = useState<{ groundLabel: string; theQuestion: string | null; askedBy: string | null } | null>(null)
  const [problem, setProblem] = useState('')
  const [key, setKey] = useState<string | null>(null)
  const [turns, setTurns] = useState<Turn[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [phase, setPhase] = useState<'reading' | 'talking' | 'address' | 'done'>('reading')
  const [email, setEmail] = useState('')
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
      setKey(started.key)
      setPhase('talking')
      if (started.reply) setTurns([{ who: 'it', text: started.reply }])
    } catch (err: any) {
      setProblem(err?.response?.data?.message ?? 'That did not start. Try the link again.')
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
    } catch (err: any) {
      setTurns(t => [...t, { who: 'it', text: err?.response?.data?.message ?? 'That did not send. Say it again.' }])
    } finally { setBusy(false) }
  }

  async function finish(withEmail: boolean) {
    if (!key || busy) return
    if (withEmail && !looksLikeAnAddress(email)) { setProblem('That does not look like an email address.'); return }
    setBusy(true)
    setProblem('')
    try {
      const done = await openLinkApi.finish(key, withEmail ? email.trim() : undefined)
      setSentTo(done.at)
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

  if (problem && !what) return <div style={{ ...card, justifyContent: 'center', textAlign: 'center' }}><p style={{ color: 'var(--gw-sub)' }}>{problem}</p></div>
  if (!what) return <div style={{ ...card, justifyContent: 'center', textAlign: 'center' }}><p style={{ color: 'var(--gw-muted)' }}>One moment.</p></div>

  return (
    <div style={{ background: 'var(--gw-bg)', minHeight: '100dvh' }}>
      <div style={card}>
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 11.5, letterSpacing: '.07em', textTransform: 'uppercase', color: 'var(--gw-muted)' }}>
            {what.askedBy ? `${what.askedBy} asked` : 'You have been asked'}
          </div>
          <h1 style={{ fontSize: 20, margin: '6px 0 0', lineHeight: 1.3 }}>{what.theQuestion || what.groundLabel}</h1>
        </div>

        {phase === 'reading' && (
          <div>
            <p style={{ fontSize: 14, color: 'var(--gw-sub)', lineHeight: 1.6 }}>
              Answer in your own words. It takes about two minutes, nobody sees what you write, and
              you are not asked who you are until the end.
            </p>
            <button onClick={begin} disabled={busy}
              style={{ marginTop: 16, padding: '12px 22px', borderRadius: 8, border: 'none', background: 'var(--gw-navy)', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              {busy ? 'Starting...' : 'Start'}
            </button>
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

        {phase === 'talking' && (
          <div style={{ marginTop: 14 }}>
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
            <button onClick={() => setPhase('address')}
              style={{ marginTop: 12, background: 'none', border: 'none', color: 'var(--gw-sub)', textDecoration: 'underline', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
              I am done
            </button>
          </div>
        )}

        {phase === 'address' && (
          <div style={{ marginTop: 16, background: 'white', border: '1px solid var(--gw-border)', borderRadius: 12, padding: '16px 18px' }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>Where should we send the report?</div>
            <p style={{ fontSize: 13.5, color: 'var(--gw-sub)', lineHeight: 1.6, margin: '0 0 12px' }}>
              When everybody has answered, one report goes out: what each person said, where you line
              up, where you do not. Leave this blank if you would rather not have it. Your answers
              stay on the record either way.
            </p>
            <input id="open-email" type="email" autoComplete="email" value={email}
              onChange={e => { setEmail(e.target.value); setProblem('') }}
              placeholder="you@work.com" style={field} />
            {problem && <div style={{ color: 'var(--gw-red-t)', fontSize: 13, marginTop: 8 }}>{problem}</div>}
            <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
              <button onClick={() => finish(true)} disabled={busy || !email.trim()}
                style={{ padding: '10px 18px', borderRadius: 8, border: 'none', background: 'var(--gw-navy)', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: busy || !email.trim() ? .5 : 1 }}>
                Send me the report
              </button>
              <button onClick={() => finish(false)} disabled={busy}
                style={{ padding: '10px 18px', borderRadius: 8, border: '1px solid var(--gw-border)', background: 'white', color: 'var(--gw-sub)', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>
                Finish without it
              </button>
            </div>
          </div>
        )}

        {phase === 'done' && (
          <div style={{ marginTop: 20 }}>
            <h2 style={{ fontSize: 18, margin: '0 0 8px' }}>That is on the record. Thank you.</h2>
            <p style={{ fontSize: 14, color: 'var(--gw-sub)', lineHeight: 1.6, margin: 0 }}>
              {sentTo
                ? `The report goes to ${sentTo} when everybody has answered.`
                : 'You did not leave an address, so nothing will be sent to you. What you said still counts.'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
