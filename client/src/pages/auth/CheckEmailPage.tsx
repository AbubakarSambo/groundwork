import { useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { toast } from 'sonner'
import { authApi } from '@/api'
import { GroundworkLogo } from '@/components/gw/GroundworkLogo'

export function CheckEmailPage() {
  const [params] = useSearchParams()
  const email = params.get('email') ?? ''
  const [sending, setSending] = useState(false)
  const [resent, setResent] = useState(false)

  const handleResend = async () => {
    if (!email) return
    setSending(true)
    try {
      await authApi.resendVerification(email)
      setResent(true)
      toast.success('Verification email resent.')
    } catch {
      toast.error('Could not resend. Try again in a moment.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gw-bg)', display: 'flex', flexDirection: 'column' }}>
      <div className="gw-hdr">
        <GroundworkLogo />
      </div>

      <div className="gw-bd" style={{ maxWidth: 460, margin: '0 auto', width: '100%', paddingTop: 48 }}>
        <div style={{ fontSize: 28, marginBottom: 16 }}>📬</div>
        <div className="gw-ttl">Check your email</div>
        <div className="gw-sub-t" style={{ marginBottom: 20 }}>
          We sent a verification link to{' '}
          {email ? <strong>{email}</strong> : 'your email address'}.
          Click the link to activate your account before signing in.
        </div>

        <div className="gw-box gw-box-blue" style={{ marginBottom: 24, fontSize: 13 }}>
          The link expires in 24 hours. Do not try to sign in until you have verified — it will not work yet.
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {!resent ? (
            <button
              className="gw-btn-sec"
              onClick={handleResend}
              disabled={sending || !email}
              style={{ width: '100%' }}
            >
              {sending ? 'Sending…' : 'Resend verification email'}
            </button>
          ) : (
            <div style={{ fontSize: 13, color: 'var(--gw-sub)', textAlign: 'center', padding: '10px 0' }}>
              Sent — check your inbox again.
            </div>
          )}

          <Link
            to="/login"
            style={{ fontSize: 12, color: 'var(--gw-sub)', textAlign: 'center', textDecoration: 'underline', marginTop: 4 }}
          >
            Already verified? Sign in
          </Link>
        </div>
      </div>
    </div>
  )
}
