import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { API_ORIGIN } from '@/lib/where-the-api-lives'
import { AuthCard } from '@/pages/auth/auth-kit'
import { Button } from '@/components/gw/kit'
import { Stack } from '@/components/gw/ui'
import { useAuthStore } from '@/stores/auth'

/**
 * "STOP THESE REMINDERS", FROM AN EMAIL (A3, #/stop). The words are stop.txt's.
 *
 * OPENING THE LINK CHANGES NOTHING (11 October). It used to stop the reminders the moment the page
 * loaded, and a mail scanner that opens every link in a message did that for people who never asked.
 * The page now reads which check-in it is (a GET that changes nothing), asks in a plain sentence, and
 * only "Stop the reminders" stops them, with a POST, the way the unsubscribe page asks (StopMailPage).
 * After that it is the prototype's page (stop.txt): "Turn them back on", and "Stop all email from
 * Groundwork instead", each a POST too. No sign-in: the link in the email is enough.
 *
 * The question, and what the page says after either button, are ours: the prototype shows only the
 * stopped state.
 */
type State =
  | { kind: 'working' }
  | { kind: 'asking'; name: string | null }
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

/** Which check-in, and whether its reminders are already off. A GET, and it changes nothing. */
async function read(token: string) {
  const r = await fetch(`${API_ORIGIN}/api/v1/reminders/${encodeURIComponent(token)}`)
  if (r.status >= 500) throw new Error('server')
  const body = await r.json().catch(() => null)
  return body?.data ?? body
}

export function StopRemindersPage() {
  const { token = '' } = useParams<{ token: string }>()
  const signedIn = useAuthStore(s => !!s.isAuthenticated)
  const [state, setState] = useState<State>({ kind: 'working' })
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let alive = true
    read(token)
      .then(res => {
        if (!alive) return
        if (!res?.known) setState({ kind: 'unknown' })
        else if (res.reminders === 'off') setState({ kind: 'stopped', name: res.checkInName ?? null })
        else setState({ kind: 'asking', name: res.checkInName ?? null })
      })
      .catch(() => { if (alive) setState({ kind: 'failed' }) })
    return () => { alive = false }
  }, [token])

  async function press(what: 'stop' | 'start' | 'stop-all') {
    if (busy) return
    setBusy(true)
    try {
      const res = await post(token, what)
      if (!res?.known) setState({ kind: 'unknown' })
      else if (what === 'stop') setState({ kind: 'stopped', name: res.checkInName ?? null })
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
  if (state.kind === 'asking') {
    return (
      <AuthCard
        title={state.name ? `Do you want to stop the reminders for ${state.name}?` : 'Do you want to stop the reminders for this check-in?'}
        sub="You’ll still get your check-ins and reports. You just won’t be nudged if you haven’t answered. Nothing changes until you press the button."
      >
        <Stack gap={12}>
          <Button kind="quiet" to="/">Keep the reminders</Button>
          <Button kind="secondary" onClick={() => press('stop')} disabled={busy}>Stop the reminders</Button>
        </Stack>
        {foot}
      </AuthCard>
    )
  }
  if (state.kind === 'failed') {
    return (
      <AuthCard
        title="That did not go through"
        sub="We could not reach our own system just now, so nothing changed. Reload this page, or reply to any of our mail with the word stop and a person will do it by hand."
      />
    )
  }
  if (state.kind === 'unknown') {
    /*
     * B-209: THE OLD SENTENCE CLAIMED TO KNOW WHY, AND THEN PROMISED SOMETHING IT COULD NOT BE SURE
     * OF. "Which usually means the reminders were already stopped or the check-in has closed" is a
     * guess, and "nothing more is going to you from it" is not true for a link that was simply cut
     * short when it was copied - the reminders it was meant to stop may still be going. This says
     * only what is certain: the link does not match anything, and what to do about it.
     */
    /*
     * B-209 (review round 2): SOMEBODY ALREADY SIGNED IN IS NOT TOLD TO SIGN IN TO REACH SETTINGS -
     * they can already open it.
     */
    return (
      <AuthCard
        title="We could not find those reminders"
        sub="That link does not match anything. It may have been cut short when it was copied."
      >
        <p className="gw-auth-small">
          Open the link again from the email, or{' '}
          <Link to="/settings">{signedIn ? 'change your emails in Settings' : 'sign in to change your emails in Settings'}</Link>.
        </p>
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
