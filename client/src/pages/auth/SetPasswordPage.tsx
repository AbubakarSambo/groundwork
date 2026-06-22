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

  const next = params.get('next') ?? '/grounds?welcome=1'

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
    if (!token) { setError('Invalid link — no token.'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password)) { setError('Password must contain at least 1 uppercase and 1 lowercase letter.'); return }
    if (password !== confirm) { setError('Passwords do not match.'); return }
    save.mutate()
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--gw-bg)' }}>
      <div className="gw-hdr"><a href="https://myground.work" target="_blank" rel="noopener noreferrer" className="gw-logo" style={{ textDecoration: 'none', color: 'inherit' }}>Groundwork</a></div>
      <div className="gw-bd" style={{ maxWidth: 420, margin: '0 auto', width: '100%', paddingTop: 32 }}>
        <div className="gw-ttl">One last step</div>
        <div className="gw-sub-t" style={{ marginBottom: 6 }}>Set a password so you can sign back in to see your record and receive the report when it is ready.</div>
        <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.6, marginBottom: 20, padding: '10px 12px', background: 'var(--gw-blue-bg)', borderRadius: 8, border: '0.5px solid var(--gw-blue-b)' }}>
          Your account and check-in are already saved. This password secures your access to Groundwork going forward.
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
