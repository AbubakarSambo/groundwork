import { useEffect, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Button, Stack } from '@/components/gw/ui'
import { AuthCard, AuthError } from './auth-kit'

/**
 * "CHECK YOUR EMAIL" (A2, #/signin/sent), shown after a link has gone.
 *
 * ONE PAGE FOR ONE MOMENT. W8-49. `/auth` and `/auth/sent` each had their own version, and which
 * one you got depended on which button you pressed. Both render this now. `/auth/sent` stays a real
 * URL, because the marketing home's SaveCard sends people to it.
 *
 * The words are the prototype's (docs/prototype/screens/A2-accounts-and-signing-in/signin-sent.txt).
 * The old "What to expect" list went with the rewording: its second step promised "You will be asked
 * to set a password", which is a decision waiting for Hafsah, not a fact this page can promise.
 *
 * "Wrong address? Use a different one" is not in the prototype and is kept: somebody who mistyped
 * their address can otherwise only resend, forever, to the typo.
 */

/** How long before "Send it again" can be pressed. A second link replaces the first, so two presses a
 *  second apart would leave somebody holding a dead link from the first email. */
const WAIT_SECONDS = 30

/*
 * THE RESEND GOES BACK THROUGH THE DOOR THAT SENT THE FIRST LINK.
 *
 * It used to call `/auth/register-magic-link` whatever sent the first one. That route creates
 * accounts, so for an address that already had one it answered 409 and every resend of a sign-in
 * link said "That link did not send". For somebody still signing up it rewrote the waiting sign-up:
 * the first name they typed became one guessed from their address, and the organisation name they
 * typed was set to nothing. So the caller, which knows what sent the first link, says how to send it
 * again.
 */
export function LinkSentPanel({ email, resend: sendAgain, onUseDifferent, forReset, withPassword }: {
  email: string
  /**
   * A password-reset link rather than a sign-in link. The sentence stays the same whether or not the
   * address has an account, because saying which would tell a stranger who is registered here.
   */
  forReset?: boolean
  /** Sends the link again, the same way the first one was sent. */
  resend: () => Promise<unknown>
  onUseDifferent: () => void
  /**
   * B-037: set when the account being created chose "With a password". The password is saved
   * server-side already (entrySave sends it, and it does sign the person in afterwards); what was
   * missing was saying so here, since confirming the email first is still required either way -
   * nothing can let somebody claim an address they have not proved they own.
   *
   * B-192: "OPEN IT TO FINISH" WAS NOT ALWAYS TRUE. Opening the link signs somebody in straight away
   * only when the server can place them in an organisation on its own. When it cannot - most plainly,
   * a brand new organisation, which nothing but the person themselves can name - the link's own page
   * asks "Where do you work?" first (`MagicVerifyPage`'s `whereDoYouWork` branch), and the account,
   * password included, does not exist until that is answered. Halima opened the link, saw that
   * question, and left; no account existed, and her password was then refused at sign-in. This
   * component never sees which case it will be, so it says the true, general thing: opening the link
   * is the first step, with anything it still asks for on the way, rather than promising it is the
   * only one.
   */
  withPassword?: boolean
}) {
  const [countdown, setCountdown] = useState(WAIT_SECONDS)
  const [sentAgain, setSentAgain] = useState(false)
  const [failed, setFailed] = useState('')

  useEffect(() => {
    if (countdown <= 0) return
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  const resend = useMutation({
    mutationFn: sendAgain,
    onSuccess: () => { setSentAgain(true); setCountdown(WAIT_SECONDS) },
    onError: () => setFailed('The link did not send again. Please try again in a moment.'),
  })

  return (
    <AuthCard
      title="Check your email"
      sub={forReset
        ? <>If there is an account for <strong>{email}</strong>, I sent it a link to choose a new password. The link works for an hour.</>
        : withPassword
          ? <>Your password is saved. I sent a link to <strong>{email}</strong> to confirm it is yours. Open it, and answer anything it still asks you - once that is done, you can sign in with your password any time.</>
          : <>I sent a sign-in link to <strong>{email}</strong>. Open it on any device.</>}
    >
      {failed && <AuthError>{failed}</AuthError>}
      <Stack gap={10}>
        <Button
          kind="secondary"
          wide
          disabled={countdown > 0 || resend.isPending}
          onClick={() => { setFailed(''); setSentAgain(false); resend.mutate() }}
        >
          {resend.isPending ? 'Sending…' : 'Send it again'}
        </Button>
      </Stack>
      {/* Only the news is announced. The countdown is not in a live region, or a screen reader would
          read it out every second. */}
      <p className="gwui-fine" role="status">
        {sentAgain ? 'We sent it again. Use the newest email, because it replaces the one before.' : ''}
      </p>
      {countdown > 0 && (
        <p className="gwui-fine">
          You can send it again in {countdown} {countdown === 1 ? 'second' : 'seconds'}.
        </p>
      )}
      <div className="gwui-button-row">
        {/* The only way off this page for a mistyped address: a button, so the keyboard reaches it. */}
        <Button kind="quiet" onClick={onUseDifferent}>Wrong address? Use a different one</Button>
      </div>
    </AuthCard>
  )
}
