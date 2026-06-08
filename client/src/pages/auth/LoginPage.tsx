import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { toast } from 'sonner'
import { authApi } from '@/api'
import { useAuthStore } from '@/stores/auth'

export function LoginPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { accessToken, user } = await authApi.login(email, password)
      setAuth(user, accessToken)
      navigate('/')
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Invalid email or password'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gw-bg)', display: 'flex', flexDirection: 'column' }}>
      <div className="gw-hdr">
        <div className="gw-logo">Groundwork</div>
        <Link to="/" className="gw-back">← Back</Link>
      </div>

      <div className="gw-bd" style={{ maxWidth: 460, margin: '0 auto', width: '100%', paddingTop: 32 }}>
        <div className="gw-ttl">Sign in</div>
        <div className="gw-sub-t">Enter your email and password to continue.</div>

        <form onSubmit={onSubmit}>
          <div className="gw-fld">
            <label className="gw-label">Email</label>
            <input className="gw-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" required />
          </div>
          <div className="gw-fld">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <label className="gw-label">Password</label>
              <Link to="/forgot-password" style={{ fontSize: 11, color: '#0C447C', textDecoration: 'underline' }}>Forgot password?</Link>
            </div>
            <input className="gw-input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Your password" required />
          </div>
          <button className="gw-btn" type="submit" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in →'}
          </button>
        </form>

        <div style={{ height: 1, background: '#E2E0DB', margin: '20px 0' }} />
        <div style={{ fontSize: 12, color: 'var(--gw-sub)', textAlign: 'center' }}>
          New here?{' '}
          <Link to="/register" style={{ color: '#0C447C', textDecoration: 'underline' }}>Set up your org</Link>
        </div>
      </div>
    </div>
  )
}
