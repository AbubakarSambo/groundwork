import { useState } from 'react'
import { THE_DOOR_SIGNED_IN, THE_DOOR_SIGNED_OUT, THE_EXAMPLES, RATHER_PICK } from './the-way-in'

/*
 * THE FIRST SCREEN OF A NEW CHECK-IN (U.6, B1): #/start signed out, #/new signed in.
 *
 * One box and one question. The examples put their words in the box; nothing is sent until the
 * person presses the button, and what they send opens the setup conversation exactly as describing
 * it in their own words always has. The list of every situation is one link away.
 */
export function TheDoor({
  signedIn,
  onSend,
  onSeeEverySituation,
}: {
  signedIn: boolean
  onSend: (text: string) => void
  onSeeEverySituation: () => void
}) {
  const [text, setText] = useState('')
  const words = signedIn ? THE_DOOR_SIGNED_IN : THE_DOOR_SIGNED_OUT
  const send = () => { if (text.trim()) onSend(text.trim()) }

  return (
    <div style={{ width: '100%', maxWidth: 684, margin: '0 auto' }}>
      {signedIn && (
        <nav aria-label="Where you are" style={{ fontSize: 12.5, color: 'var(--gw-sub)', marginBottom: 10 }}>
          {THE_DOOR_SIGNED_IN.crumbs[0]} <span aria-hidden="true">/</span> {THE_DOOR_SIGNED_IN.crumbs[1]}
        </nav>
      )}
      <h1 style={{ fontFamily: 'var(--gw-font-name)', fontSize: 'clamp(26px, 5vw, 34px)', fontWeight: 500, lineHeight: 1.2, color: 'var(--gw-text)', margin: '0 0 6px' }}>
        {words.heading}
      </h1>
      <p style={{ fontSize: 15.5, color: 'var(--gw-sub)', lineHeight: 1.6, margin: '0 0 14px' }}>{words.help}</p>
      <div style={{ background: 'white', border: '1px solid var(--gw-border)', borderRadius: 10, padding: 14 }}>
        {signedIn && (
          <label htmlFor="gw-door-box" style={{ display: 'block', fontSize: 14, fontWeight: 700, color: 'var(--gw-text)', marginBottom: 6 }}>
            {THE_DOOR_SIGNED_IN.question}
          </label>
        )}
        <textarea
          id="gw-door-box"
          className="gw-ta"
          rows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
          placeholder={words.placeholder}
          aria-label={signedIn ? undefined : words.heading}
          style={{ width: '100%', boxSizing: 'border-box' }}
        />
        {!signedIn && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '10px 0 0' }}>
            {THE_EXAMPLES.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => setText(example)}
                style={{ background: 'white', border: '1px solid var(--gw-border)', borderRadius: 999, padding: '7px 13px', fontSize: 13.5, color: 'var(--gw-text)', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}
              >
                {example}
              </button>
            ))}
          </div>
        )}
        <button type="button" className="gw-btn" onClick={send} disabled={!text.trim()} style={{ marginTop: 12 }}>
          {words.button}
        </button>
      </div>
      <p style={{ fontSize: 13.5, color: 'var(--gw-text)', margin: '12px 0 0' }}>
        {RATHER_PICK.before}{' '}
        <button
          type="button"
          onClick={onSeeEverySituation}
          style={{ background: 'none', border: 0, padding: 0, font: 'inherit', color: 'var(--gw-navy)', textDecoration: 'underline', cursor: 'pointer' }}
        >
          {RATHER_PICK.link}
        </button>
        .
      </p>
    </div>
  )
}
