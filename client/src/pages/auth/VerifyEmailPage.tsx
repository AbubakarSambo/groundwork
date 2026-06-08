import { useEffect, useState } from 'react'
import { useSearchParams, Link, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { authApi } from '@/api'
import { useAuthStore } from '@/stores/auth'

const fired = new Set<string>()

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const token = searchParams.get('token')
  const [email, setEmail] = useState('')

  const verify = useMutation({
    mutationFn: (t: string) => authApi.verifyEmail(t),
    onSuccess: ({ accessToken, user }) => {
      setAuth(user, accessToken)
      toast.success('Email verified — welcome to Groundwork.')
      navigate('/', { replace: true })
    },
  })

  const resend = useMutation({
    mutationFn: (e: string) => authApi.resendVerification(e),
    onSuccess: () => toast.success('Verification email sent — check your inbox.'),
    onError: () => toast.error('Failed to resend. Check the email address and try again.'),
  })

  useEffect(() => {
    if (token && !fired.has(token)) {
      fired.add(token)
      verify.mutate(token)
    }
  }, [token])

  if (!token) return (
    <CenteredCard>
      <div style={{ fontSize: 32, marginBottom: 12 }}>✕</div>
      <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Invalid link</div>
      <div style={{ fontSize: 13, color: 'var(--gw-sub)', marginBottom: 16 }}>No verification token found in the URL.</div>
      <Link to="/login" style={{ color: '#0C447C', textDecoration: 'underline', fontSize: 13 }}>Go to sign in</Link>
    </CenteredCard>
  )

  if (verify.isPending) return (
    <CenteredCard>
      <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
      <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Verifying your email…</div>
      <div style={{ fontSize: 13, color: 'var(--gw-sub)' }}>Just a moment.</div>
    </CenteredCard>
  )

  if (verify.isError) {
    const message = (verify.error as any)?.response?.data?.message || 'This link has already been used or has expired.'
    return (
      <CenteredCard>
        <div style={{ fontSize: 32, marginBottom: 12 }}>✕</div>
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Verification failed</div>
        <div style={{ fontSize: 13, color: 'var(--gw-sub)', marginBottom: 20 }}>{message}</div>
        <div className="gw-fld" style={{ textAlign: 'left' }}>
          <label className="gw-label">Enter your email to get a new link</label>
          <input className="gw-input" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} />
        </div>
        <button className="gw-btn" disabled={!email || resend.isPending} onClick={() => resend.mutate(email)}>
          {resend.isPending ? 'Sending…' : 'Resend verification email'}
        </button>
        <Link to="/login" style={{ color: '#0C447C', textDecoration: 'underline', fontSize: 12, display: 'block', marginTop: 12 }}>Back to sign in</Link>
      </CenteredCard>
    )
  }

  return (
    <CenteredCard>
      <div style={{ fontSize: 32, marginBottom: 12 }}>✓</div>
      <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Email verified!</div>
      <div style={{ fontSize: 13, color: 'var(--gw-sub)' }}>Redirecting…</div>
    </CenteredCard>
  )
}

function CenteredCard({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--gw-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'white', border: '1px solid #E2E0DB', borderRadius: 8, padding: '40px 32px', maxWidth: 420, width: '100%', textAlign: 'center' }}>
        {children}
      </div>
    </div>
  )
}
