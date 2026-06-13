import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/stores/auth'

export function ResetPasswordPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const setAuth = useAuthStore(s => s.setAuth)
  const token = params.get('token') ?? ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')

  const save = useMutation({
    mutationFn: () => authApi.resetPassword(token, password),
    onSuccess: res => {
      setAuth(res.user, res.accessToken)
      navigate('/grounds', { replace: true })
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message
      setError(Array.isArray(msg) ? msg[0] : (msg ?? 'Invalid or expired link. Request a new one.'))
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
        <div className="gw-ttl">Reset your password</div>
        <div className="gw-sub-t">Choose a new password for your account.</div>

        <div className="gw-fld">
          <label className="gw-label">New password</label>
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
          {save.isPending ? 'Saving…' : 'Reset password →'}
        </button>

        <div style={{ textAlign: 'center', marginTop: 14 }}>
          <span onClick={() => navigate('/enter')} style={{ fontSize: 12, color: 'var(--gw-sub)', cursor: 'pointer' }}>
            Back to sign in
          </span>
        </div>
      </div>
    </div>
  )
}
