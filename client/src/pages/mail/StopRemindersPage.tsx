import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { API_ORIGIN } from '@/lib/where-the-api-lives'
import { AuthCard } from '@/pages/auth/auth-kit'
import { Button } from '@/components/gw/kit'

/**
 * "STOP THESE REMINDERS", FROM AN EMAIL (A3, #/stop). The words are stop.txt's.
 *
 * Opening the link stops this check-in's reminders at once, as it always did: they already pressed a
 * button, in their mail client. The page then says which check-in, and offers the prototype's two
 * ways on: "Turn them back on", and "Stop all email from Groundwork instead". Each is a POST to the
 * reminder link's own routes (api email/the-reminder-link.controller.ts), so no mail scanner can press
 * them. No sign-in: the link in the email is enough.
 *
 * What the page says after either button is ours, because the prototype shows only the first state.
 */
type State =
  | { kind: 'working' }
  | { kind: 'stopped'; name: string | null }
  | { kind: 'on-again'; name: string | null }
  | { kind: 'all-off' }
  | { kind: 'unknown' }
  | { kind: 'failed' }

async function post(token: string, what: 'stop' | 'start' | 'stop-all') {
  const r = await fetch(`${API_ORIGIN}/api/v1/reminders/${encodeURIComponent(token)}/${what}`, { method: 'POST' })
  if (r.status >= 500) throw new Error('server')
  const body = await r.json().catch(() => null)
  return body?.data ?? body
}

export function StopRemindersPage() {
  const { token = '' } = useParams<{ token: string }>()
  const [state, setState] = useState<State>({ kind: 'working' })
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let alive = true
    post(token, 'stop')
      .then(res => { if (alive) setState(res?.known ? { kind: 'stopped', name: res.checkInName ?? null } : { kind: 'unknown' }) })
      .catch(() => { if (alive) setState({ kind: 'failed' }) })
    return () => { alive = false }
  }, [token])

  async function press(what: 'start' | 'stop-all') {
    if (busy) return
    setBusy(true)
    try {
      const res = await post(token, what)
      if (!res?.known) setState({ kind: 'unknown' })
      else if (what === 'start') setState({ kind: 'on-again', name: res.checkInName ?? null })
      else setState({ kind: 'all-off' })
    } catch {
      setState({ kind: 'failed' })
    } finally {
      setBusy(false)
    }
  }

  const foot = <p className="gw-auth-small">No sign-in needed; the link in the email was enough. You can change any of this later in Settings.</p>

  if (state.kind === 'working') return <AuthCard title="One moment." />
  if (state.kind === 'failed') {
    return (
      <AuthCard
        title="That did not go through"
        sub="We could not reach our own system just now, so nothing changed. Reload this page, or reply to any of our mail with the word stop and a person will do it by hand."
      />
    )
  }
  if (state.kind === 'unknown') {
    return (
      <AuthCard
        title="We could not find those reminders"
        sub="That link does not match anything, which usually means the reminders were already stopped or the check-in has closed. Either way, nothing more is going to you from it."
      >
        <p className="gw-auth-small"><Link to="/settings">Sign in to change your emails in Settings</Link></p>
      </AuthCard>
    )
  }
  if (state.kind === 'all-off') {
    return (
      <AuthCard title="Done. No more email from Groundwork." sub="Only what you ask for yourself still comes, such as a sign-in link.">
        {foot}
      </AuthCard>
    )
  }
  if (state.kind === 'on-again') {
    return (
      <AuthCard title={state.name ? `Your reminders for ${state.name} are back on.` : 'Your reminders are back on.'}>
        {foot}
      </AuthCard>
    )
  }
  return (
    <AuthCard
      title={state.name ? `Done. No more reminders for ${state.name}.` : 'Done. No more reminders for this check-in.'}
      sub="You’ll still get your check-ins and reports. You just won’t be nudged if you haven’t answered."
    >
      <div className="gw-stop-choices">
        <Button kind="secondary" wide onClick={() => press('start')} disabled={busy}>Turn them back on</Button>
        <button type="button" className="gw-auth-link" onClick={() => press('stop-all')} disabled={busy}>
          Stop all email from Groundwork instead
        </button>
      </div>
      {foot}
    </AuthCard>
  )
}
