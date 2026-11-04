import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/stores/auth'
import { Button, Stack } from '@/components/gw/ui'
import { useTheTrap } from '@/components/gw/a-field-nobody-can-see'
import { whatIsWrongWithTheAddress } from './the-address-typed'
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
  return (
    <AskForAFreshLink
      kind={kind}
      title="That link has expired"
      sub="Links from our emails work for a short while. Nothing is lost; ask for a fresh one."
      button="Send me a fresh link"
    />
  )
}

/**
 * "THAT LINK DIDN'T WORK", for a link already used or one we do not know. U.2 review; wording
 * updated to the prototype's own (F4-small-states/badlink.txt) at U.20.
 *
 * These used to get the old page: a "GROUNDWORK" header, a ✕, and whatever the server or this page
 * had written ("This link is not valid. It may have been replaced by a newer one - use the most
 * recent link from your inbox."). They get the account card now, with one plain message, and the
 * same way to ask for a new link as an expired one. It does not say which of the two it was:
 * telling a stranger whether a link was once real is a small clue about links they do not hold.
 */
export function LinkDidNotWork({ kind }: { kind: 'sign-in' | 'reset' }) {
  return (
    <AskForAFreshLink
      kind={kind}
      title="That link didn’t work"
      sub="It may have been cut short when it was copied, or it has already been used. Open it again from the email, or ask for a new one."
      button="Send me a new link"
    />
  )
}

function AskForAFreshLink({ kind, title, sub, button }: { kind: 'sign-in' | 'reset'; title: string; sub: string; button: string }) {
  const trap = useTheTrap()
  const navigate = useNavigate()
  const signedIn = useAuthStore(s => !!s.isAuthenticated)
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  const sendOne = () => kind === 'reset'
    ? authApi.forgotPassword(email.trim().toLowerCase())
    : authApi.entrySave(email.trim().toLowerCase(), undefined, trap.filled)

  // ALWAYS CALLED, EVEN WHEN SIGNED IN (rules of hooks): the signed-in branch below returns its
  // own card before this mutation is ever used, but the hook itself has to run on every render.
  const send = useMutation({
    mutationFn: sendOne,
    onSuccess: () => setSent(true),
    onError: (err: any) => {
      const status = err?.response?.status
      if (!status || status >= 500) { setError('That did not send, because something went wrong on my side. Please try again.'); return }
      if (status === 429) { setError('Too many attempts. Wait a minute and try again.'); return }
      /* Anything about the address itself gets the same answer as a sent link. */
      setSent(true)
    },
  })

  /*
   * B-208: A SIGNED-IN PERSON IS NOT OFFERED A WAY TO SIGN IN. This card's two buttons - ask for a
   * fresh link, or sign in - are both for somebody who is signed out. Opening a dead sign-in or
   * reset link while already signed in (the email client followed an old link, or a tab had two
   * links open) used to offer both anyway, neither of which has anything to do with where they
   * already are: Today, where they belong.
   *
   * B-208 (review round 2): AND THE SENTENCE UNDER THE TITLE STOPPED OFFERING THINGS THIS SCREEN NO
   * LONGER HAS. `sub` is written for the signed-out form below it ("ask for a fresh one", "open it
   * again from the email, or ask for a new one") - repeated under a lone "Go to Today" button, it
   * told a signed-in person to do things the screen does not offer them any more. Nothing here
   * needs explaining beyond the title once "Go to Today" is the one thing to press, so the signed-in
   * card carries no subtitle at all.
   */
  if (signedIn) {
    return (
      <AuthCard title={title}>
        <Stack gap={10}>
          <Button wide onClick={() => navigate('/today')}>Go to Today</Button>
        </Stack>
      </AuthCard>
    )
  }

  if (sent) {
    return <LinkSentPanel email={email.trim()} forReset={kind === 'reset'} resend={sendOne} onUseDifferent={() => setSent(false)} />
  }

  return (
    <AuthCard title={title} sub={sub}>
      <form noValidate onSubmit={e => { e.preventDefault(); setError(''); { const wrong = whatIsWrongWithTheAddress(email); if (wrong) { setError(wrong); return } } send.mutate() }}>
        {trap.field}
        <Stack gap={10}>
          <AuthField id="expired-email" label="Email" type="email" autoComplete="email" value={email} onChange={v => { setEmail(v); setError('') }} autoFocus />
          {error && <AuthError>{error}</AuthError>}
          <Button type="submit" wide disabled={send.isPending}>
            {send.isPending ? 'Sending…' : button}
          </Button>
          {/* B-130: this page was a dead end for anyone who already has a password and just wants to
              sign in rather than wait for a new link. The invite and join pages already offer this
              way out (LinkProblem's "Sign in instead"); this one did not. */}
          <Button kind="quiet" wide type="button" onClick={() => navigate('/auth')}>Sign in instead</Button>
        </Stack>
      </form>
    </AuthCard>
  )
}

/**
 * B-208: A SIGN-IN LINK ALREADY USED, WHOSE ADDRESS THIS ALREADY CONFIRMED.
 *
 * Opening /verify-email a second time used to land on the generic "That link didn't work" card,
 * with its own fixed sentence and a form to ask for a new link - even though the server had already
 * answered plainly: "This link has already been used, so your address is confirmed. Sign in from
 * the sign-in page." There is nothing left to ask for here, and nothing wrong with the address -
 * the one thing to do is sign in, so this shows the server's own sentence and that one way through.
 *
 * B-208 (review round 2): ZAWADI, SIGNED IN BY THAT VERY LINK, AND GRACE BOTH READ THE SAME
 * SIGNED-OUT SCREEN. "Your email is already confirmed... Sign in from the sign-in page." [Sign in]
 * is wrong twice over for anybody already signed in: it asks them to sign in again, on the account
 * they are already using, and "Your email" names an address that is not necessarily theirs at all -
 * Grace, reading it on a link that was never hers, has no email confirmed by it. Signed in, this
 * reads "This address is already confirmed." (true of the address either way, naming nobody) and
 * offers "Go to Today" - not the server's own sentence, which still ends by telling them to sign in.
 *
 * B-208 (review round 3): "THIS ADDRESS IS ALREADY CONFIRMED" ANSWERS A QUESTION NOBODY SIGNED IN
 * IS ASKING. A used sign-in link opened while already signed in is not about confirming an address
 * at all - that is what a SET-PASSWORD or RESET link's "used" state means, not a sign-in link's.
 * What is actually true for this reader is that the link itself has already been used, and that
 * being signed in already means there is nothing left to do but carry on.
 */
export function LinkAlreadyUsedConfirmed({ sentence }: { sentence: string }) {
  const navigate = useNavigate()
  const signedIn = useAuthStore(s => !!s.isAuthenticated)
  if (signedIn) {
    return (
      <AuthCard title="This link has already been used" sub="You're signed in, so you can carry on.">
        <Stack gap={10}>
          <Button wide onClick={() => navigate('/today')}>Go to Today</Button>
        </Stack>
      </AuthCard>
    )
  }
  return (
    <AuthCard title="Your email is already confirmed" sub={sentence}>
      <Stack gap={10}>
        <Button wide to="/auth">Sign in</Button>
      </Stack>
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
      <Stack gap={10}>
        <Button kind="quiet" wide to="/auth">Go to sign in</Button>
      </Stack>
    </AuthCard>
  )
}
