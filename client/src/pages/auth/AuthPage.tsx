import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/stores/auth'

const MARKETING_URL = import.meta.env.VITE_MARKETING_URL ?? 'https://myground.work'

type View = 'password' | 'link' | 'forgot'

export function AuthPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const setAuth = useAuthStore((s) => s.setAuth)

  // Contributors arriving via ?mode=member go straight to the link view
  // since they may not have set a password yet
  const defaultView: View = searchParams.get('mode') === 'member' ? 'link' : 'password'

  const [view, setView] = useState<View>(defaultView)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [linkSent, setLinkSent] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  const signIn = useMutation({
    mutationFn: () => authApi.login(email.trim().toLowerCase(), password),
    onSuccess: (data) => {
      setAuth(data.user, data.accessToken)
      navigate('/home')
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message
      if (Array.isArray(msg)) setError(msg[0])
      else setError(msg ?? 'Incorrect email or password.')
    },
  })

  const sendLink = useMutation({
    mutationFn: () => authApi.memberSignin(email.trim().toLowerCase()),
    onSuccess: () => setLinkSent(true),
    onError: () => {
      // memberSignin may fail if the account doesn't exist yet
      // fall through to show a generic message
      setLinkSent(true)
    },
  })

  const sendReset = useMutation({
    mutationFn: () => authApi.forgotPassword(email.trim().toLowerCase()),
    onSuccess: () => setResetSent(true),
    onError: () => setResetSent(true), // generic message regardless
  })

  function submitPassword(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const e2 = email.trim()
    if (!e2 || !e2.includes('@')) { setError('Enter a valid email address.'); return }
    if (!password) { setError('Enter your password.'); return }
    signIn.mutate()
  }

  function submitLink(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const e2 = email.trim()
    if (!e2 || !e2.includes('@')) { setError('Enter a valid email address.'); return }
    sendLink.mutate()
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--gw-bg)' }}>

      <div style={{ background: 'var(--gw-navy)', padding: '20px 20px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <svg width="18" height="14" viewBox="0 0 22 17" fill="none">
            <rect x="5" y="0" width="12" height="3" rx="1.5" fill="white" opacity="0.45" />
            <rect x="2" y="6" width="18" height="3" rx="1.5" fill="white" opacity="0.72" />
            <rect x="0" y="12" width="22" height="3" rx="1.5" fill="white" />
          </svg>
          <span style={{ fontSize: 15, fontWeight: 700, color: 'white', letterSpacing: '-.02em' }}>Groundwork</span>
        </div>
        <a href={MARKETING_URL} style={{ fontSize: 13, color: 'rgba(255,255,255,.55)', textDecoration: 'none' }}>Back</a>
      </div>

      <div className="gw-bd" style={{ maxWidth: 480, margin: '0 auto', width: '100%', paddingTop: 28 }}>

        <div className="gw-ttl">{view === 'link' ? 'Sign in or create account' : 'Sign in'}</div>

        {view === 'password' && (
          <>
            <div className="gw-sub-t" style={{ marginBottom: 20 }}>
              Enter your email and password.
            </div>

            <form onSubmit={submitPassword}>
              <div className="gw-fld">
                <label className="gw-label">Email</label>
                <input
                  className="gw-input"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError('') }}
                  autoFocus
                />
              </div>
              <div className="gw-fld">
                <label className="gw-label">Password</label>
                <input
                  className="gw-input"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError('') }}
                />
              </div>

              <button className="gw-btn" type="submit" disabled={signIn.isPending}>
                {signIn.isPending ? 'Signing in…' : 'Sign in'}
              </button>
              {error && <div className="gw-er" style={{ marginTop: 8 }}>{error}</div>}
            </form>

            <div style={{ fontSize: 13, color: 'var(--gw-sub)', textAlign: 'center', marginTop: 14, lineHeight: 1.8 }}>
              <span
                style={{ color: 'var(--gw-navy)', textDecoration: 'underline', cursor: 'pointer' }}
                onClick={() => { setError(''); setView('forgot') }}
              >
                Forgot your password?
              </span>
              {' · '}
              <span
                style={{ color: 'var(--gw-navy)', textDecoration: 'underline', cursor: 'pointer' }}
                onClick={() => { setError(''); setView('link') }}
              >
                New here or forgot password? Get a link
              </span>
            </div>
          </>
        )}

        {view === 'link' && !linkSent && (
          <>
            <div className="gw-sub-t" style={{ marginBottom: 20 }}>
              Enter your email. We will send you a link — it signs you in or creates an account if you don't have one.
            </div>

            <form onSubmit={submitLink}>
              <div className="gw-fld">
                <label className="gw-label">Email</label>
                <input
                  className="gw-input"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError('') }}
                  autoFocus
                />
              </div>

              <button className="gw-btn" type="submit" disabled={sendLink.isPending}>
                {sendLink.isPending ? 'Sending…' : 'Send link'}
              </button>
              {error && <div className="gw-er" style={{ marginTop: 8 }}>{error}</div>}
            </form>

            <div style={{ fontSize: 13, color: 'var(--gw-sub)', textAlign: 'center', marginTop: 14 }}>
              <span
                style={{ color: 'var(--gw-navy)', textDecoration: 'underline', cursor: 'pointer' }}
                onClick={() => { setError(''); setView('password') }}
              >
                Sign in with password instead
              </span>
            </div>
          </>
        )}

        {view === 'forgot' && !resetSent && (
          <>
            <div className="gw-sub-t" style={{ marginBottom: 20 }}>
              Enter your email and we will send you a link to reset your password.
            </div>

            <form onSubmit={(e) => { e.preventDefault(); setError(''); const e2 = email.trim(); if (!e2 || !e2.includes('@')) { setError('Enter a valid email address.'); return } sendReset.mutate() }}>
              <div className="gw-fld">
                <label className="gw-label">Email</label>
                <input
                  className="gw-input"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError('') }}
                  autoFocus
                />
              </div>

              <button className="gw-btn" type="submit" disabled={sendReset.isPending}>
                {sendReset.isPending ? 'Sending…' : 'Send reset link'}
              </button>
              {error && <div className="gw-er" style={{ marginTop: 8 }}>{error}</div>}
            </form>

            <div style={{ fontSize: 13, color: 'var(--gw-sub)', textAlign: 'center', marginTop: 14 }}>
              <span
                style={{ color: 'var(--gw-navy)', textDecoration: 'underline', cursor: 'pointer' }}
                onClick={() => { setError(''); setView('password') }}
              >
                Back to sign in
              </span>
            </div>
          </>
        )}

        {view === 'forgot' && resetSent && (
          <div style={{ textAlign: 'center', paddingTop: 12 }}>
            <div style={{ fontSize: 22, marginBottom: 8 }}>✓</div>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>Check your email</div>
            <div style={{ fontSize: 13, color: 'var(--gw-sub)', lineHeight: 1.6 }}>
              If an account exists for <strong>{email}</strong>, a password reset link is on its way. It expires in 1 hour.
            </div>
            <div style={{ marginTop: 16 }}>
              <span
                style={{ fontSize: 13, color: 'var(--gw-navy)', textDecoration: 'underline', cursor: 'pointer' }}
                onClick={() => { setResetSent(false); setView('password') }}
              >
                Back to sign in
              </span>
            </div>
          </div>
        )}

        {view === 'link' && linkSent && (
          <div style={{ textAlign: 'center', paddingTop: 12 }}>
            <div style={{ fontSize: 22, marginBottom: 8 }}>✓</div>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>Check your email</div>
            <div style={{ fontSize: 13, color: 'var(--gw-sub)', lineHeight: 1.6 }}>
              If an account exists for <strong>{email}</strong>, a sign-in link is on its way.
            </div>
            <div style={{ marginTop: 16 }}>
              <span
                style={{ fontSize: 13, color: 'var(--gw-navy)', textDecoration: 'underline', cursor: 'pointer' }}
                onClick={() => { setLinkSent(false); setView('password') }}
              >
                Back to sign in
              </span>
            </div>
          </div>
        )}

        <div style={{ fontSize: 11, color: 'var(--gw-sub)', textAlign: 'center', marginTop: 24, paddingTop: 16, borderTop: '0.5px solid var(--gw-border)', lineHeight: 1.6 }}>
          Your contributions stay private from other contributors. Alignment, gaps, and confidence emerge from everyone's check-ins together.
        </div>

      </div>
    </div>
  )
}
