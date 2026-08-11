import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { authApi } from '@/api/auth'

/**
 * Where the API lives, for the one navigation that cannot go through the axios
 * client: OAuth starts by handing the browser to Google, so it must be a real
 * page load. Empty in dev, where Vite proxies /api to the server.
 */
const API_ORIGIN = import.meta.env.VITE_API_URL ?? ''
import { useAuthStore } from '@/stores/auth'

const MARKETING_URL = import.meta.env.VITE_MARKETING_URL ?? 'https://myground.work'

type View = 'password' | 'link' | 'forgot'

/**
 * The small text controls under a form ("Forgot your password?", "Create an
 * account").
 *
 * THEY WERE <span onClick>, SO THE KEYBOARD COULD NOT REACH THEM. Found while
 * verifying the new sign-up door in a browser: read_page listed only the two inputs
 * and the submit button, because a span with a click handler is not a control. It is
 * not in the tab order, screen readers do not announce it as actionable, and Enter
 * does nothing on it.
 *
 * On this screen that meant the ONLY route to creating an account was a mouse click.
 * Buttons, styled to look the same.
 */
function TextAction({ onClick, strong, children }: { onClick: () => void; strong?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        color: 'var(--gw-navy)', textDecoration: 'underline', cursor: 'pointer',
        background: 'none', border: 'none', padding: 0, font: 'inherit',
        fontWeight: strong ? 700 : undefined,
      }}
    >
      {children}
    </button>
  )
}

export function AuthPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const setAuth = useAuthStore((s) => s.setAuth)

  /**
   * Contributors arriving via ?mode=member go straight to the link view since they
   * may not have set a password yet.
   *
   * AND SO DOES ANYONE SIGNING UP, because signing up had no front door.
   *
   * Creating an account has always worked from the link view - one email, one link,
   * and the account exists, no entry chat needed. But this page opens on a
   * password-only "Sign in" screen, and the only route to that view was a small
   * underlined line reading "No password? Get a sign-in link instead", which
   * describes signing IN. Somebody with no account had to read a sign-in offer and
   * guess it would also register them. Meanwhile "Get started" on the marketing site
   * pointed at the entry chat, so there was no path from the front page to signing up
   * at all.
   *
   * That was mine to misread too: I took the "no auth before session 1" rule as
   * site-wide and concluded the missing sign-up page was correct. It is not. The rule
   * governs the ENTRY CHAT; normal sign-up and sign-in work as on any product.
   */
  const mode = searchParams.get('mode')
  const isSignup = mode === 'signup'
  const defaultView: View = mode === 'member' || isSignup ? 'link' : 'password'

  const [view, setView] = useState<View>(defaultView)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [linkSent, setLinkSent] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  /**
   * Does this deployment have Google credentials?
   *
   * Only the server knows - GoogleStrategy falls back to a placeholder client id
   * when GOOGLE_CLIENT_ID/SECRET are unset, so an unconditional button would
   * send people to Google's own error page. Asking means the button appears the
   * moment credentials are provisioned, with no client change.
   *
   * A failed or pending check renders no button, which is the safe direction.
   */
  const { data: methods } = useQuery({
    queryKey: ['auth-methods'],
    queryFn: authApi.methods,
    staleTime: 10 * 60 * 1000,
    retry: false,
  })

  const signIn = useMutation({
    mutationFn: () => authApi.login(email.trim().toLowerCase(), password),
    onSuccess: (data) => {
      setAuth(data.user, data.accessToken)
      // "/" renders the grounds list for a signed-in user (RootRoute in
      // App.tsx). There is no /home route, so signing in used to land every
      // single user on "There is nothing at this address" - the first thing
      // they saw after giving us their password.
      navigate('/')
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message
      if (Array.isArray(msg)) setError(msg[0])
      else setError(msg ?? 'Incorrect email or password.')
    },
  })

  const sendLink = useMutation({
    mutationFn: () => authApi.entrySave(email.trim().toLowerCase()),
    onSuccess: () => setLinkSent(true),
    onError: () => setLinkSent(true),
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

        <div className="gw-ttl">{view === 'link' ? (isSignup ? 'Create your account' : 'Sign in or create account') : 'Sign in'}</div>

        {view === 'password' && (
          <>
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

              {/* Rendered only when the server confirms it can complete the
                  flow. A full page navigation, not fetch: OAuth begins with a
                  redirect the browser has to follow. */}
              {methods?.google && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '16px 0 12px' }}>
                    <span style={{ flex: 1, height: 1, background: 'var(--gw-border)' }} />
                    <span style={{ fontSize: 11, color: 'var(--gw-muted)' }}>or</span>
                    <span style={{ flex: 1, height: 1, background: 'var(--gw-border)' }} />
                  </div>
                  <button
                    type="button"
                    onClick={() => { window.location.href = `${API_ORIGIN}/api/v1/auth/google` }}
                    style={{ width: '100%', padding: '10px 0', borderRadius: 7, background: 'white', color: 'var(--gw-text)', fontSize: 13, fontWeight: 600, border: '1px solid var(--gw-border)', cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    Continue with Google
                  </button>
                </>
              )}


            <div style={{ fontSize: 13, color: 'var(--gw-sub)', textAlign: 'center', marginTop: 14, lineHeight: 2 }}>
              <TextAction onClick={() => { setError(''); setView('forgot') }}>Forgot your password?</TextAction>
              <br />
              <TextAction onClick={() => { setError(''); setView('link') }}>No password? Get a sign-in link instead</TextAction>
              <br />
              {/*
                THE MISSING DOOR. "Get a sign-in link" was the only way through to
                the view that also registers people, and it reads as sign-in. Anybody
                without an account had nothing on this screen addressed to them.
              */}
              <TextAction strong onClick={() => { setError(''); setView('link') }}>New here? Create an account</TextAction>
            </div>
          </>
        )}

        {view === 'link' && !linkSent && (
          <>
            <div className="gw-sub-t" style={{ marginBottom: 20 }}>
              {isSignup
                ? 'Enter your email. We will send you a link that creates your account. No password to choose.'
                : 'Enter your email. We will send you a link. It signs you in, or creates an account if you do not have one.'}
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
              <TextAction onClick={() => { setError(''); setView('password') }}>Sign in with password instead</TextAction>
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
              A link is on its way to <strong>{email}</strong>. Check your inbox and click it to continue.
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
