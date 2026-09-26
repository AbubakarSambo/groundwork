import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { authApi } from '@/api/auth'
import { Button } from '@/components/gw/kit'
import { useTheTrap } from '@/components/gw/a-field-nobody-can-see'
import { looksLikeAnAddress, NOT_AN_ADDRESS } from '@/components/gw/an-address-that-can-receive-mail'
import { AuthCard, AuthError, AuthField } from './auth-kit'
import { LinkSentPanel } from './LinkSentPanel'

/**
 * "THAT LINK HAS EXPIRED" (A2, #/verify-expired).
 *
 * Shown where a page learns from the server that the link it was opened with has run out: the sign-in
 * link (/verify-email), a set-up link (/set-password) and a reset link (/reset-password). The words
 * are the prototype's (docs/prototype/screens/A2-accounts-and-signing-in/verify-expired.txt); the
 * label is "Email", not "Your email", while the label is waiting for Hafsah.
 *
 * WHICH DOOR THE FRESH LINK GOES THROUGH. A sign-in or set-up link is replaced by a sign-in link,
 * through entrySave, the same route and the same one answer as every other sign-in link: for an
 * account with no password yet, opening it leads on to choosing one. A reset link is replaced by a
 * reset link, through forgot-password, because what that person came to do is choose a new password,
 * and a sign-in link would take them in without one.
 *
 * Neither says whether the address has an account. Only a failure that says nothing about the
 * address (no answer, a server error, too many tries) is shown as a failure.
 */
export function LinkExpired({ kind }: { kind: 'sign-in' | 'reset' }) {
  const trap = useTheTrap()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  const sendOne = () => kind === 'reset'
    ? authApi.forgotPassword(email.trim().toLowerCase())
    : authApi.entrySave(email.trim().toLowerCase(), undefined, trap.filled)

  const send = useMutation({
    mutationFn: sendOne,
    onSuccess: () => setSent(true),
    onError: (err: any) => {
      const status = err?.response?.status
      if (!status || status >= 500) { setError('That did not send, because something went wrong on our side. Please try again.'); return }
      if (status === 429) { setError('Too many attempts. Wait a minute and try again.'); return }
      /* Anything about the address itself gets the same answer as a sent link. */
      setSent(true)
    },
  })

  if (sent) {
    return <LinkSentPanel email={email.trim()} forReset={kind === 'reset'} resend={sendOne} onUseDifferent={() => setSent(false)} />
  }

  return (
    <AuthCard
      title="That link has expired"
      sub="Links from our emails work for a short while. Nothing is lost; ask for a fresh one."
    >
      <form noValidate onSubmit={e => { e.preventDefault(); setError(''); if (!looksLikeAnAddress(email.trim())) { setError(NOT_AN_ADDRESS); return } send.mutate() }}>
        {trap.field}
        <AuthField id="expired-email" label="Email" type="email" autoComplete="email" value={email} onChange={v => { setEmail(v); setError('') }} autoFocus />
        {error && <AuthError>{error}</AuthError>}
        <div className="gw-auth-actions">
          <Button type="submit" wide disabled={send.isPending}>
            {send.isPending ? 'Sending…' : 'Send me a fresh link'}
          </Button>
        </div>
      </form>
    </AuthCard>
  )
}

/**
 * A waiting sign-up whose link had run out, which the server has already sent again. Nothing to ask
 * for, so the page says so in the server's own sentence and offers the way to sign in.
 */
export function LinkAlreadyResent({ sentence }: { sentence: string }) {
  return (
    <AuthCard title="Check your email" sub={sentence}>
      <div className="gw-auth-actions">
        <Button kind="quiet" wide to="/auth">Go to sign in</Button>
      </div>
    </AuthCard>
  )
}
