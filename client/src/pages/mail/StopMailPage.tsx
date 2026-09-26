import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { API_ORIGIN } from '@/lib/where-the-api-lives'

/**
 * THE PAGE THE LINK ON A MAIL LANDS ON, AND UNTIL NOW THERE WAS NONE.
 *
 * Every round digest carries an unsubscribe link built as `${frontendUrl}/unsubscribe/:token`.
 * The API route that honours it is real and works. The client route it points at did not exist,
 * so the link rendered the not-found page: somebody who wanted the mail to stop pressed the only
 * control we gave them and got "nothing's here", and the mail kept coming.
 *
 * That is the exact failure the unsubscribe controller's own comment says it accepted GET to
 * avoid - "a link that fails at that moment becomes a spam complaint rather than a support
 * ticket" - arriving through the front end instead of the back.
 *
 * One page for both links, because from the reader's side they are the same act: stop writing to
 * me. What differs is scope, and the API says which in its own words rather than this page
 * guessing at it.
 *
 * NO HEX FALLBACKS IN THE var() CALLS. This page is reached from a mail client and renders with no
 * app chrome around it, which is the situation that tempts a `var(--gw-text, #1A1916)` "just in
 * case". `one-vocabulary.spec.ts` refuses it, and it is right: a fallback is a second definition of
 * a colour that the palette already owns, and it goes stale silently the moment the token moves.
 * The tokens are defined on :root in index.css, which this page loads like every other.
 */
type Which = 'unsubscribe' | 'stop-reminders'

export function StopMailPage({ which }: { which: Which }) {
  const { token } = useParams<{ token: string }>()
  const [state, setState] = useState<'working' | 'done' | 'failed'>('working')
  const [says, setSays] = useState('')

  useEffect(() => {
    /* No button to press. They already pressed one, in their mail client. Asking for a second is
       how somebody who has had enough decides we are making it difficult on purpose. */
    let alive = true
    void (async () => {
      try {
        const r = await fetch(`${API_ORIGIN}/api/v1/${which}/${encodeURIComponent(token ?? '')}`)
        const body = await r.json().catch(() => null)
        if (!alive) return
        /* A 404 here still means the mail stops, because the token is gone. Only a server that
           could not answer at all is a failure worth showing somebody. */
        if (r.status >= 500 || !body) {
          setState('failed')
          return
        }
        /* THE ENVELOPE. Every API response here is wrapped as `{ success, data }`, so reading
           `body.says` gets undefined and the page would fall back to its own generic sentence -
           which happens to be true, so nothing would have looked broken. Caught by driving it. */
        setSays(body?.data?.says ?? body?.says ?? 'No more of this mail is going to you.')
        setState('done')
      } catch {
        if (alive) setState('failed')
      }
    })()
    return () => {
      alive = false
    }
  }, [token, which])

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'var(--gw-page)' }}>
      <div style={{ maxWidth: 460, textAlign: 'left' }}>
        <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1.4, color: 'var(--gw-navy)', marginBottom: 10 }}>
          GROUNDWORK
        </div>
        {state === 'working' && (
          <p style={{ fontSize: 15, color: 'var(--gw-sub)', margin: 0 }}>One moment.</p>
        )}
        {state === 'done' && (
          <>
            <h1 style={{ fontSize: 21, fontWeight: 800, color: 'var(--gw-text)', margin: '0 0 10px' }}>Done.</h1>
            <p style={{ fontSize: 14.5, color: 'var(--gw-sub)', lineHeight: 1.7, margin: 0 }}>{says}</p>
          </>
        )}
        {state === 'failed' && (
          <>
            <h1 style={{ fontSize: 21, fontWeight: 800, color: 'var(--gw-text)', margin: '0 0 10px' }}>
              That did not go through
            </h1>
            {/* Never "try again later" and nothing else. Somebody at this point wants the mail to
                stop, and the honest fallback is a person who can do it by hand. */}
            <p style={{ fontSize: 14.5, color: 'var(--gw-sub)', lineHeight: 1.7, margin: 0 }}>
              We could not reach our own system just now, so nothing changed. Reload this page, or
              reply to any of our mail with the word stop and a person will do it by hand.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
