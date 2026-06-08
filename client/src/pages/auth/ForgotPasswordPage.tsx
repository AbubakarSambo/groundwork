import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { authApi } from '@/api'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await authApi.forgotPassword(email)
      setSent(true)
    } catch {
      toast.error('Something went wrong. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gw-bg)', display: 'flex', flexDirection: 'column' }}>
      <div className="gw-hdr">
        <div className="gw-logo">Groundwork</div>
        <Link to="/login" className="gw-back">Back to sign in</Link>
      </div>

      <div className="gw-bd" style={{ maxWidth: 460, margin: '0 auto', width: '100%', paddingTop: 40 }}>
        {sent ? (
          <>
            <div className="gw-ttl">Check your email</div>
            <div className="gw-sub-t">
              If an account exists for <strong>{email}</strong>, we sent a password reset link. Check your inbox.
            </div>
            <div style={{ marginTop: 20 }}>
              <Link to="/login" className="gw-btn" style={{ display: 'inline-block', textDecoration: 'none' }}>
                Back to sign in
              </Link>
            </div>
          </>
        ) : (
          <>
            <div className="gw-ttl">Forgot your password?</div>
            <div className="gw-sub-t">Enter your email and we'll send you a reset link.</div>

            <form onSubmit={onSubmit}>
              <div className="gw-fld">
                <label className="gw-label">Email</label>
                <input
                  className="gw-input"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                  autoFocus
                />
              </div>
              <button className="gw-btn" type="submit" disabled={loading}>
                {loading ? 'Sending…' : 'Send reset link →'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
