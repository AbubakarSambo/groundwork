import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { toast } from 'sonner'
import { authApi } from '@/api'
import { useAuthStore } from '@/stores/auth'
import { GroundworkLogo } from '@/components/gw/GroundworkLogo'

export function SetPasswordPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const token = params.get('token') ?? ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [er, setEr] = useState('')

  useEffect(() => {
    if (!token) setEr('This link is missing its token. Request a new one.')
  }, [token])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 8) { setEr('Password must be at least 8 characters'); return }
    if (password !== confirm) { setEr('Passwords do not match'); return }
    setLoading(true)
    try {
      const { accessToken, user } = await authApi.setPassword(token, password)
      setAuth(user, accessToken)
      toast.success('Password set — you are signed in.')
      navigate('/')
    } catch (err: any) {
      setEr(err?.response?.data?.message || 'This link has expired or is invalid.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gw-bg)', display: 'flex', flexDirection: 'column' }}>
      <div className="gw-hdr">
        <GroundworkLogo />
        <Link to="/login" className="gw-back">Sign in instead</Link>
      </div>

      <div className="gw-bd" style={{ maxWidth: 460, margin: '0 auto', width: '100%', paddingTop: 40 }}>
        <div className="gw-ttl">Set your password</div>
        <div className="gw-sub-t">Choose a password to sign in to Groundwork.</div>

        <form onSubmit={onSubmit}>
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
              placeholder="Same again"
            />
          </div>
          {er && <div className="gw-er">{er}</div>}
          <button className="gw-btn" type="submit" disabled={loading || !token}>
            {loading ? 'Setting password…' : 'Set password and sign in →'}
          </button>
        </form>
      </div>
    </div>
  )
}
