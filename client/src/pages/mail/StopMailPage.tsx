import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { API_ORIGIN } from '@/lib/where-the-api-lives'
import { AuthCard } from '@/pages/auth/auth-kit'
import { Button, Stack } from '@/components/gw/ui'

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
 * BUILT FROM THE SHARED PARTS ONLY (`AuthCard`, `Button`, `Stack`), as its sibling
 * `StopRemindersPage.tsx` already is - no inline styles, no one-off classes. The page is reached
 * from a mail client with no app chrome around it, which used to tempt a hand-rolled `<div style=
 * {{...}}>` card; `AuthCard` already draws exactly that narrow cream-page card (Mark, PageTitle,
 * a panel), so this page no longer needs its own copy of it.
 */
type Which = 'unsubscribe' | 'stop-reminders'

export function StopMailPage({ which }: { which: Which }) {
  const { token } = useParams<{ token: string }>()
  const [state, setState] = useState<'working' | 'done' | 'failed' | 'asking'>('working')
  const [says, setSays] = useState('')
  /* The question for the unsubscribe link, which asks before it stops anything (decision 109). */
  const [question, setQuestion] = useState<{ title: string; says: string[]; keepLabel: string; stopLabel: string; turnBackOnLabel: string; stopped: boolean } | null>(null)
  const [busy, setBusy] = useState(false)
  /* After a stop: its heading, and whether the page offers the undo (somebody with no account has
     only this link to come back by). From the engine's review of the opt-out (1fe53cb2). */
  const [doneTitle, setDoneTitle] = useState('Done.')
  const [canUndo, setCanUndo] = useState(false)
  async function answer(path: '' | '/undo') {
    setBusy(true)
    try {
      const r = await fetch(`${API_ORIGIN}/api/v1/unsubscribe/${encodeURIComponent(token ?? '')}${path}`, { method: 'POST' })
      const body = await r.json().catch(() => null)
      if (r.status >= 500 || !body) { setState('failed'); return }
      const d = body?.data ?? body
      setSays(Array.isArray(d?.says) ? d.says.join(' ') : d?.says ?? '')
      setDoneTitle(d?.title ?? (path === '/undo' ? 'These emails are back on' : 'These emails are turned off'))
      setCanUndo(path === '' && d?.canUndo === true)
      setState('done')
    } catch { setState('failed') } finally { setBusy(false) }
  }

  useEffect(() => {
    /* No button to press. They already pressed one, in their mail client. Asking for a second is
       how somebody who has had enough decides we are making it difficult on purpose. */
    let alive = true
    void (async () => {
      try {
        /* The unsubscribe question is read from its own address (the engine's 1fe53cb2); an API from
           before it has none and answers 404 there, so the page falls back to the plain read. */
        const base = `${API_ORIGIN}/api/v1/${which}/${encodeURIComponent(token ?? '')}`
        let r = await fetch(which === 'unsubscribe' ? `${base}/question` : base)
        if (which === 'unsubscribe' && r.status === 404) r = await fetch(base)
        const body = await r.json().catch(() => null)
        if (!alive) return
        /* A 404 here still means the mail stops, because the token is gone. Only a server that
           could not answer at all is a failure worth showing somebody. */
        if (r.status >= 500 || !body) {
          setState('failed')
          return
        }
        if (which === 'unsubscribe') {
          const q = body?.data ?? body
          /* An API from before decision 109 answers `says` as one sentence and no question; the page
             must still read it (the client and the API are not always released at the same moment). */
          const lines: string[] = Array.isArray(q?.says) ? q.says : (typeof q?.says === 'string' ? [q.says] : [])
          if (!q?.title) {
            setSays(lines.join(' ') || 'No more of this mail is going to you.')
            setState('done')
            return
          }
          setQuestion({ ...q, says: lines })
          setState(q?.known === false ? 'done' : 'asking')
          setSays(lines.join(' '))
          if (q?.known === false) setDoneTitle(q?.title ?? 'That link is not one we recognise')
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

  if (state === 'working') return <AuthCard title="One moment." />

  if (state === 'failed') {
    /* Never "try again later" and nothing else. Somebody at this point wants the mail to stop,
       and the honest fallback is a person who can do it by hand. */
    return (
      <AuthCard
        title="That did not go through"
        sub="We could not reach our own system just now, so nothing changed. Reload this page, or reply to any of our mail with the word stop and a person will do it by hand."
      />
    )
  }

  if (state === 'asking' && question) {
    /* The prototype pre-selects keeping the mail, so only the stop control may read as the one
       navy primary button there is on the page - which here is none: `keepLabel` is a quiet link
       and `stopLabel` a plain secondary button, never filled navy. */
    return (
      <AuthCard title={question.title} sub={question.says.join(' ')}>
        <Stack gap={12}>
          {question.stopped ? (
            <Button kind="secondary" wide disabled={busy} onClick={() => void answer('/undo')}>{question.turnBackOnLabel}</Button>
          ) : (
            <>
              <Button kind="quiet" to="/">{question.keepLabel}</Button>
              <Button kind="secondary" disabled={busy} onClick={() => void answer('')}>{question.stopLabel}</Button>
            </>
          )}
        </Stack>
      </AuthCard>
    )
  }

  return (
    <AuthCard title={which === 'unsubscribe' ? doneTitle : 'Done.'} sub={says}>
      {which === 'unsubscribe' && canUndo && (
        <Button kind="secondary" disabled={busy} onClick={() => void answer('/undo')}>Turn them back on</Button>
      )}
    </AuthCard>
  )
}
