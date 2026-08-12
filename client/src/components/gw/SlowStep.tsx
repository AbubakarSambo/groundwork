import { useState, useEffect } from 'react'

/**
 * THE ONE SLOW STEP, SAID OUT LOUD.
 *
 * Closing a session runs two model calls before it answers - scoring how
 * specific the account was, then pulling the record entries out of it. It takes
 * about half a minute, and Hafsah read that silence as the conversation being
 * slow ("this is taking so long, it is taking like 20 seconds") when the
 * conversation is not where the time goes.
 *
 * Half a minute of one unchanging word reads as a hang. So this says what is
 * actually happening, in the order it happens, and it never claims to be nearly
 * done - the steps are honest names for real work, not a progress bar pretending
 * to know how far along it is.
 *
 * Lifted out of EntryChatPage because the signed-in finish has exactly the same
 * wait and showed only "Saving…". That is the path everybody is on from session
 * two onwards.
 */
export function SlowStep({ steps, note, everyMs = 9000 }: { steps: string[]; note?: string; everyMs?: number }) {
  const [step, setStep] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setStep(s => Math.min(s + 1, steps.length - 1)), everyMs)
    return () => clearInterval(t)
    // Steps are literals at every call site; re-running on identity would reset
    // the sequence to the first line on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [everyMs, steps.length])
  return (
    <div style={{ background: 'var(--gw-bg)', borderRadius: 10, padding: '14px 16px', fontSize: 13, color: 'var(--gw-sub)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span className="gw-dot" /><span className="gw-dot" /><span className="gw-dot" />
        <span>{steps[step]}…</span>
      </div>
      {note && (
        <div style={{ fontSize: 11.5, color: 'var(--gw-muted)', marginTop: 6, lineHeight: 1.5 }}>{note}</div>
      )}
    </div>
  )
}

/** What closing a session actually does, in order. */
export const CLOSING_STEPS = [
  'Reading back what you said',
  'Checking what is specific enough to stand on',
  'Finding what is still open',
  'Writing it into your record',
]
