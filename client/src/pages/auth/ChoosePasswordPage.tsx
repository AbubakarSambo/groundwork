import { useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/stores/auth'

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

  /**
   * Which of the two links they opened. The endpoints are genuinely different -
   * `setPassword` is a first password on a new account, `resetPassword` replaces an
   * existing one - so the token is only valid at its own.
   */
  const kind: Kind = useLocation().pathname === '/reset-password' ? 'reset' : 'set'

  const token = params.get('token') ?? ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')

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
  const next = /^\/(?!\/)/.test(requested) ? requested : (kind === 'set' ? '/grounds?welcome=1' : '/grounds')

  const save = useMutation({
    mutationFn: () => kind === 'set'
      ? authApi.setPassword(token, password)
      : authApi.resetPassword(token, password),
    onSuccess: res => {
      setAuth(res.user, res.accessToken)
      navigate(next, { replace: true })
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message
      setError(Array.isArray(msg) ? msg[0] : (msg ?? 'Invalid or expired link. Ask for a new one.'))
    },
  })

  function submit() {
    setError('')
    if (!token) { setError('Invalid link - no token.'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password)) { setError('Password must contain at least 1 uppercase and 1 lowercase letter.'); return }
    if (password !== confirm) { setError('Passwords do not match.'); return }
    save.mutate()
  }

  const shell = (children: React.ReactNode) => (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--gw-bg)' }}>
      <div className="gw-hdr">
        <a href="https://myground.work" target="_blank" rel="noopener noreferrer" className="gw-logo" style={{ textDecoration: 'none', color: 'inherit' }}>Groundwork</a>
      </div>
      <div className="gw-bd" style={{ maxWidth: 420, margin: '0 auto', width: '100%', paddingTop: 32 }}>{children}</div>
    </div>
  )

  /**
   * NO TOKEN, NO FORM.
   *
   * `/set-password` rendered a complete, usable password form with no token in the
   * URL at all - two fields, a rule about uppercase letters, and a submit button
   * that could only ever fail. The only sign anything was wrong came after typing a
   * password and pressing it. `/reset-password` did the same. `/invite` already
   * handled this properly, so the product held both behaviours for one problem.
   */
  if (!token) {
    return shell(
      <>
        <div className="gw-ttl">This link is missing its token.</div>
        <div className="gw-sub-t" style={{ marginBottom: 20 }}>
          Password links are single use and expire. Open the most recent one from your inbox, or
          ask for a new one below.
        </div>
        <button className="gw-btn" onClick={() => navigate('/auth')}>Get a new link</button>
      </>,
    )
  }

  return shell(
    <>
      <div className="gw-ttl">{kind === 'set' ? 'One last step' : 'Reset your password'}</div>
      <div className="gw-sub-t" style={{ marginBottom: kind === 'set' ? 6 : 0 }}>
        {kind === 'set'
          ? 'Set a password so you can sign back in to see your record and receive the report when it is ready.'
          : 'Choose a new password for your account.'}
      </div>

      {/*
        This used to say "Your account and check-in are already saved."
        It is reached by two different people. One has just finished a session in the
        anonymous entry flow, and for them it was true. The other has been invited by
        an admin - as a lead or a participant - and has not answered a single question
        yet. Telling that person their check-in is saved is simply untrue, and it makes
        them wonder what was recorded in their name before they had said anything.
        GW-014. This page cannot tell the two apart from the token alone, so the copy
        claims only what is true for both.
      */}
      {kind === 'set' && (
        <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.6, marginBottom: 20, padding: '10px 12px', background: 'var(--gw-blue-bg)', borderRadius: 8, border: '0.5px solid var(--gw-blue-b)' }}>
          Your account is ready. This password secures your access to Groundwork going forward. Anything you have already written is saved.
        </div>
      )}

      <div className="gw-fld">
        <label className="gw-label" htmlFor="new-password">{kind === 'set' ? 'Password' : 'New password'}</label>
        <input
          id="new-password"
          className="gw-input"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="At least 8 characters"
          autoFocus
        />
      </div>
      <div className="gw-fld">
        <label className="gw-label" htmlFor="confirm-password">Confirm password</label>
        <input
          id="confirm-password"
          className="gw-input"
          type="password"
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          placeholder="Same as above"
        />
      </div>

      <div style={{ fontSize: 11, color: 'var(--gw-sub)', marginBottom: 12, lineHeight: 1.6 }}>
        Must be 8+ characters with at least one uppercase and one lowercase letter.
      </div>

      {error && <div className="gw-er" style={{ marginBottom: 10 }}>{error}</div>}

      <button className="gw-btn" onClick={submit} disabled={save.isPending}>
        {save.isPending ? 'Saving…' : kind === 'set' ? 'Set password and open Groundwork →' : 'Reset password →'}
      </button>

      {/*
        THE LINK SAID "BACK TO SIGN IN" AND WENT SOMEWHERE ELSE. W8-42.

        `/enter` is the org-code page, left over from an onboarding model the product
        no longer uses. Somebody who had just reset their password and wanted to use it
        was handed a page asking for a code they do not have. Sign in is `/auth`.
      */}
      <div style={{ textAlign: 'center', marginTop: 14 }}>
        <button
          type="button"
          onClick={() => navigate('/auth')}
          style={{ fontSize: 12, color: 'var(--gw-sub)', cursor: 'pointer', background: 'none', border: 'none', font: 'inherit' }}
        >
          Back to sign in
        </button>
      </div>
    </>,
  )
}
