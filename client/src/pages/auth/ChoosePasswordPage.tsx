import { useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/stores/auth'
import { Button, Stack } from '@/components/gw/ui'
import { AuthCard, AuthError, PasswordField, PasswordRules, PasswordStrength } from './auth-kit'
import { whatTheLinkDid } from './a-link-that-has-expired'
import { LinkExpired, LinkDidNotWork } from './LinkExpired'
import { meetsTodaysPasswordRules } from './password-rules'
import { looksLikeAnAddress } from '@/components/gw/an-address-that-can-receive-mail'

/**
 * CHOOSING A PASSWORD FROM A LINK IN AN EMAIL. W8-49.
 *
 * This was two pages, `/set-password` and `/reset-password`, doing the same thing:
 * take a token from the URL, take a password twice, call one endpoint, sign the
 * person in. Same rules, same fields, same failure modes - and, being two files, two
 * different standards.
 *
 * BOTH URLS STAY REAL, and that is not a detail. They are sent in emails, so they
 * exist in inboxes we do not control and must keep resolving forever. This is one
 * page reached two ways, not a redirect.
 *
 * WHAT THE MERGE FIXED, both from the reset side:
 *
 *  1. It said "Check your inbox - we've sent a reset link" AFTER somebody submitted
 *     a new password. Nothing had been sent; they had just chosen one. The message
 *     belonged to the earlier step, on a different page.
 *  2. Worse, it showed that on `submit()`, BEFORE the request came back. So a reset
 *     that failed - expired token, weak password rejected server-side - told the
 *     person to go and check their email, and the error rendered underneath a screen
 *     they were no longer looking at. Same shape as the sign-up flow's
 *     `onError: () => setLinkSent(true)`.
 *  3. It rendered the whole form with no token in the URL. `/set-password` had
 *     already learned that lesson and says so up front; now one of them does.
 */

type Kind = 'set' | 'reset'

export function ChoosePasswordPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const setAuth = useAuthStore(s => s.setAuth)
  /*
   * WHOSE ADDRESS "NOT YOUR EMAIL ADDRESS" IS CHECKED AGAINST. Only on the set-up page, where opening
   * the email link has just signed this person in, so the signed-in account is theirs. The reset page
   * may be opened in a browser where somebody else is signed in, so it does not use it.
   */
  const signedInEmail = useAuthStore(s => s.user?.email ?? null)
  const signedIn = useAuthStore(s => !!s.isAuthenticated)

  /**
   * Which of the two links they opened. The endpoints are genuinely different -
   * `setPassword` is a first password on a new account, `resetPassword` replaces an
   * existing one - so the token is only valid at its own.
   */
  const kind: Kind = useLocation().pathname === '/reset-password' ? 'reset' : 'set'
  const theirEmail = kind === 'set' ? signedInEmail : null

  const token = params.get('token') ?? ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  /* Set when the server says the link has run out: the page becomes "That link has expired". */
  const [expired, setExpired] = useState(false)
  /* Set when the server says the link was used, is unknown, or is the wrong kind. */
  const [didNotWork, setDidNotWork] = useState(false)

  /**
   * WHOSE PASSWORD THIS IS, WHEN THE SERVER SAYS.
   *
   * The prototype's reset page reads "For wairimu@baridi.co.ke." The address comes from the link, so
   * only the server can say it, and today `validate-token` answers only whether the link works. When
   * the answer carries `email` the page shows it; when it does not, the sentence simply starts at
   * "Once it's saved". A failed check changes nothing: the form still works, and the server still
   * decides when the password is saved.
   */
  const { data: linkCheck } = useQuery({
    queryKey: ['validate-token', kind, token],
    queryFn: () => authApi.validateToken(token, kind === 'reset' ? 'PASSWORD_RESET' : 'PASSWORD_SETUP'),
    enabled: !!token,
    retry: false,
    staleTime: Infinity,
  })
  /* A link that has run out opens straight on "That link has expired", rather than after a password
     has been typed twice. The server says `expired` only for a real, unused link of this kind. */
  const expiredOnOpen = linkCheck?.expired === true
  /* And one the server does not hold as working (used, replaced by a newer one, unknown) opens on
     "That link didn’t work", rather than after a password has been typed (U.2 re-review). */
  const didNotWorkOnOpen = linkCheck?.valid === false && linkCheck?.expired !== true
  const forAddress = typeof linkCheck?.email === 'string' && looksLikeAnAddress(linkCheck.email) ? linkCheck.email : null

  /**
   * `next` IS A DESTINATION INSIDE THIS APP, AND ONLY THAT.
   *
   * The lead invite sends `next=/grounds/{id}` so somebody who was told about one
   * ground lands on that ground instead of the whole list. Anything that is not a
   * plain in-app path is ignored: `//evil.example` and `https://evil.example` both
   * read as "somewhere else" and would turn a password page we email people into a
   * way of forwarding them off the product.
   */
  const requested = params.get('next') ?? ''
  /* The destination the person arrived with, kept by AuthPage for this browser; same guard, so it cannot be an open redirect. */
  const kept = (() => { try { return sessionStorage.getItem('gw_next') ?? '' } catch { return '' } })()
  const next = /^\/(?!\/)/.test(requested) ? requested : /^\/(?!\/)/.test(kept) ? kept : (kind === 'set' ? '/grounds?welcome=1' : '/grounds')

  const save = useMutation({
    mutationFn: () => kind === 'set'
      ? authApi.setPassword(token, password)
      : authApi.resetPassword(token, password),
    onSuccess: res => {
      setAuth(res.user, res.accessToken)
      try { sessionStorage.removeItem('gw_next') } catch { /* */ }
      navigate(next, { replace: true })
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message
      const what = whatTheLinkDid(msg)
      if (what === 'expired') { setExpired(true); return }
      if (what === 'did-not-work') { setDidNotWork(true); return }
      setError(Array.isArray(msg) ? msg[0] : (msg ?? 'That did not save, because something went wrong on our side. Please try again.'))
    },
  })

  function submit() {
    /* Enter in the confirm field was not disabled while the button was; against a single-use token the
       second call came back "invalid or expired" over the success of the first. */
    if (save.isPending) return
    setError('')
    if (!token) { setDidNotWork(true); return }
    /* The same rules the list under the fields shows, and the server checks. Choosing a first
       password has one box, as in the prototype, with Show to check what was typed. */
    if (!meetsTodaysPasswordRules(password, kind === 'reset' ? confirm : undefined, theirEmail)) {
      setError(password !== confirm && meetsTodaysPasswordRules(password, undefined, theirEmail)
        ? 'The two passwords are not the same. Type the same password in both boxes.'
        : 'Your password does not meet every rule in the list yet.')
      return
    }
    save.mutate()
  }

  /**
   * NO TOKEN, NO FORM.
   *
   * `/set-password` rendered a complete, usable password form with no token in the
   * URL at all - two fields, a rule about uppercase letters, and a submit button
   * that could only ever fail. The only sign anything was wrong came after typing a
   * password and pressing it. `/reset-password` did the same. `/invite` already
   * handled this properly, so the product held both behaviours for one problem.
   */
  if (expired || expiredOnOpen) return <LinkExpired kind={kind === 'reset' ? 'reset' : 'sign-in'} />
  if (didNotWork || didNotWorkOnOpen) return <LinkDidNotWork kind={kind === 'reset' ? 'reset' : 'sign-in'} />

  /* A link with no token cannot work: the same card as any link that did not, with the way to ask
     for a new one on it (U.2 review). */
  if (!token) return <LinkDidNotWork kind={kind === 'reset' ? 'reset' : 'sign-in'} />

  /*
   * CHOOSING A FIRST PASSWORD (A2, #/password), in the prototype's words. Choosing one is optional
   * (Hafsah's decision of 26 September), so the prototype's "Keep using email links instead" is
   * offered. "You can keep using links too" is true either way: an account with a password can still
   * ask for a sign-in link.
   */
  const title = kind === 'set' ? 'Choose a password' : 'Choose a new password'
  const sub = kind === 'set'
    ? 'For signing in without an email link. You can keep using links too.'
    /* True: saving a new password raises the account's token epoch, which ends every other session. */
    : forAddress
      ? <>For <strong>{forAddress}</strong>. Once it’s saved, you’re signed out everywhere else.</>
      : 'Once it’s saved, you’re signed out everywhere else.'

  return (
    <AuthCard title={title} sub={sub}>
      {/*
        "Your account and check-in are already saved" was said here once, to people who had not yet
        answered anything. GW-014. This page cannot tell them apart from the token, so it claims only
        what is true for everybody who reaches it.
      */}
      {/* A form, so Enter submits from the first field too, and the password manager is told what these are. */}
      <form noValidate onSubmit={e => { e.preventDefault(); submit() }}>
        <Stack gap={10}>
          <PasswordField
            id="new-password"
            label={kind === 'set' ? 'Password' : 'New password'}
            autoComplete="new-password"
            value={password}
            onChange={setPassword}
            autoFocus
          />
          {kind === 'reset' ? (
            <>
              <PasswordField
                id="confirm-password"
                label="Type it again"
                spokenAs="password you typed again"
                autoComplete="new-password"
                value={confirm}
                onChange={setConfirm}
              />
              <PasswordRules password={password} confirm={confirm} />
            </>
          ) : (
            <>
              <PasswordStrength password={password} email={theirEmail} />
              <p className="gwui-fine">
                Use one you don’t use anywhere else. A few unrelated words are easier to remember than symbols.
              </p>
            </>
          )}
          {error && <AuthError>{error}</AuthError>}
          <Button type="submit" wide disabled={save.isPending}>
            {save.isPending ? 'Saving…' : 'Save password'}
          </Button>
        </Stack>
      </form>
      {kind === 'set' && (
        <div className="gwui-auth-links">
          {/*
            NO PASSWORD, AND THAT IS FINE. Opening the email link has signed this person in, so
            skipping goes on to where they were going. Somebody here without a session (a set-up
            link from an invitation) is sent to ask for a sign-in link instead, which is what
            "email links" means for them. The unused set-up link simply runs out.
          */}
          <Button
            kind="quiet"
            onClick={() => {
              try { sessionStorage.removeItem('gw_next') } catch { /* */ }
              navigate(signedIn ? next : '/auth?mode=member', { replace: true })
            }}
          >
            Keep using email links instead
          </Button>
        </div>
      )}
    </AuthCard>
  )
}
