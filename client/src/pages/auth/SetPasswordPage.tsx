import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/stores/auth'

export function SetPasswordPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const setAuth = useAuthStore(s => s.setAuth)
  const token = params.get('token') ?? ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')

  /**
   * `next` IS A DESTINATION INSIDE THIS APP, AND ONLY THAT.
   *
   * The lead invite now sends `next=/grounds/{id}` so somebody who was told about
   * one ground lands on that ground instead of the whole list. Anything that is
   * not a plain in-app path is ignored: `//evil.example` and `https://evil.example`
   * both read as "somewhere else" and would turn a password page we email people
   * into a way of forwarding them off the product.
   */
  const requested = params.get('next') ?? ''
  const next = /^\/(?!\/)/.test(requested) ? requested : '/grounds?welcome=1'

  const save = useMutation({
    mutationFn: () => authApi.setPassword(token, password),
    onSuccess: res => {
      setAuth(res.user, res.accessToken)
      navigate(next, { replace: true })
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message
      setError(Array.isArray(msg) ? msg[0] : (msg ?? 'Invalid or expired link.'))
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

  /**
   * NO TOKEN, NO FORM.
   *
   * This page rendered a complete, usable password form with no token in the URL
   * at all - two fields, a rule about uppercase letters, and a submit button that
   * could only ever fail. The only sign anything was wrong came after typing a
   * password and pressing the button.
   *
   * `/invite` already does this properly ("This invite link is missing its
   * token"), so the product held both behaviours for the same problem. This is the
   * more serious of the two, because it accepts input.
   */
  if (!token) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--gw-bg)' }}>
        <div className="gw-hdr"><a href="https://myground.work" target="_blank" rel="noopener noreferrer" className="gw-logo" style={{ textDecoration: 'none', color: 'inherit' }}>Groundwork</a></div>
        <div className="gw-bd" style={{ maxWidth: 420, margin: '0 auto', width: '100%', paddingTop: 32 }}>
          <div className="gw-ttl">This link is missing its token.</div>
          <div className="gw-sub-t" style={{ marginBottom: 20 }}>
            Password links are single use and expire. Open the most recent one from your inbox, or
            ask for a new one below.
          </div>
          <button className="gw-btn" onClick={() => navigate('/auth')}>Get a new link</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--gw-bg)' }}>
      <div className="gw-hdr"><a href="https://myground.work" target="_blank" rel="noopener noreferrer" className="gw-logo" style={{ textDecoration: 'none', color: 'inherit' }}>Groundwork</a></div>
      <div className="gw-bd" style={{ maxWidth: 420, margin: '0 auto', width: '100%', paddingTop: 32 }}>
        <div className="gw-ttl">One last step</div>
        <div className="gw-sub-t" style={{ marginBottom: 6 }}>Set a password so you can sign back in to see your record and receive the report when it is ready.</div>
        {/*
          This used to say "Your account and check-in are already saved."
          It is reached by two different people. One has just finished a session
          in the anonymous entry flow, and for them it was true. The other has
          been invited by an admin - as a lead or a participant - and has not
          answered a single question yet. Telling that person their check-in is
          saved is simply untrue, and it makes them wonder what was recorded in
          their name before they had said anything. GW-014.

          This page cannot tell the two apart from the token alone, so the copy
          now claims only what is true for both.
        */}
        <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.6, marginBottom: 20, padding: '10px 12px', background: 'var(--gw-blue-bg)', borderRadius: 8, border: '0.5px solid var(--gw-blue-b)' }}>
          Your account is ready. This password secures your access to Groundwork going forward. Anything you have already written is saved.
        </div>

        <div className="gw-fld">
          <label className="gw-label">Password</label>
          <input
            className="gw-input"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            autoFocus
          />
        </div>
        <div className="gw-fld">
          <label className="gw-label">Confirm password</label>
          <input
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
          {save.isPending ? 'Saving…' : 'Set password and open Groundwork →'}
        </button>
      </div>
    </div>
  )
}
