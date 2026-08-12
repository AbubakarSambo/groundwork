import { useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { authApi } from '@/api/auth'

/**
 * Where the API lives, for the one navigation that cannot go through the axios
 * client: OAuth starts by handing the browser to Google, so it must be a real
 * page load. Empty in dev, where Vite proxies /api to the server.
 */
const API_ORIGIN = import.meta.env.VITE_API_URL ?? ''
import { useAuthStore } from '@/stores/auth'
import { LinkSentPanel } from './LinkSentPanel'

const MARKETING_URL = import.meta.env.VITE_MARKETING_URL ?? 'https://myground.work'

/**
 * `create` is new, and it is the point of W10-1: there was no view that was only
 * about making an account. `link` did it, under a heading that said "Sign in or
 * create account", reachable from the fourth line of small print.
 */
type View = 'password' | 'link' | 'create' | 'forgot'

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

  /**
   * WHERE TO GO AFTER SIGNING IN.
   *
   * PricingPage sends people to `/auth?next=/pricing`, and this file read only
   * `mode` - the string `next` appeared nowhere. So somebody who clicked Subscribe
   * on a tier, signed in, and expected to land back on the thing they were buying
   * was put on the grounds list with no explanation and no way back to their tier.
   *
   * Only same-origin paths are honoured. An absolute URL in a query parameter is
   * how an open redirect gets built, and this one is reachable by anybody with a
   * link.
   */
  const nextPath = (() => {
    const raw = searchParams.get('next')
    if (!raw) return null
    if (!raw.startsWith('/') || raw.startsWith('//')) return null
    return raw
  })()
  const defaultView: View = isSignup ? 'create' : mode === 'member' ? 'link' : 'password'

  const [view, setView] = useState<View>(defaultView)
  /**
   * `/auth/sent?email=...` is this page in its link-sent state, not a page of its own.
   * `SaveCard` on the marketing home still sends people to that URL, so it keeps
   * working - it just arrives here now. W8-49.
   */
  const arrivedSent = useLocation().pathname === '/auth/sent'
  const [email, setEmail] = useState(arrivedSent ? (searchParams.get('email') ?? '') : '')
  const [password, setPassword] = useState('')
  // Asked for at last. Without them the organisation ends up called "Sam's
  // workspace", derived from the address, and nobody was ever asked. W10-2.
  const [firstName, setFirstName] = useState('')
  const [orgName, setOrgName] = useState('')
  const [error, setError] = useState('')
  const [linkSent, setLinkSent] = useState(arrivedSent)
  const [resetSent, setResetSent] = useState(false)
  /** Set when the server says this account has no password and a link is on its way. */
  const [passwordlessNotice, setPasswordlessNotice] = useState('')

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
      navigate(nextPath ?? '/')
    },
    onError: (err: any) => {
      const raw = err?.response?.data?.message
      const msg: string = Array.isArray(raw) ? raw[0] : (raw ?? 'Incorrect email or password.')
      /**
       * "YOU HAVE NO PASSWORD" IS NOT A WRONG PASSWORD. W10-2.
       *
       * A participant added to a ground has an account and no password. `login` spots
       * that, emails them a setup link, and says so - but it arrived as red text under
       * the password field, which reads as "you typed it wrong" and invites them to
       * try again with a password that has never existed.
       *
       * DELIBERATELY NOT A LOOKUP BEFORE THEY SUBMIT. An endpoint that answers "does
       * this address have a password" is an account-enumeration oracle, and avoiding
       * exactly that is why the other answers on this page are generic. The server
       * already tells us after a real attempt; this just stops mislabelling it.
       */
      if (/emailed you a link|set (your |a )?password|Google Sign-In/i.test(msg)) {
        setPasswordlessNotice(msg)
        setError('')
        return
      }
      setError(msg)
    },
  })

  const sendLink = useMutation({
    mutationFn: () => authApi.entrySave(email.trim().toLowerCase()),
    onSuccess: () => setLinkSent(true),
    /**
     * A FAILURE IS NOT A SUCCESS. W10-2.
     *
     * This said `setLinkSent(true)` on error, so a network failure, a 500 or a
     * rejected address all showed "Check your email".
     *
     * The generic answer is right for SIGN-IN and for the reset below: telling a
     * stranger "no such account" tells them which addresses are registered. It is
     * wrong here, because this form also CREATES accounts - somebody whose account
     * was never made was sent away to wait for an email that would never arrive, and
     * the product had told them everything was fine.
     *
     * A transport failure gives away nothing about the address, so saying so is safe
     * and it is the difference between a person retrying and a person giving up.
     */
    onError: (err: any) => {
      const status = err?.response?.status
      // No response at all, or the server broke. Neither says anything about whether
      // this address has an account.
      if (!status || status >= 500) {
        setError('That did not send - something went wrong on our side. Try again.')
        return
      }
      if (status === 429) {
        setError('Too many attempts. Wait a minute and try again.')
        return
      }
      // A 4xx about the address itself stays generic: this is also the sign-in door.
      setLinkSent(true)
    },
  })

  /**
   * CREATING AN ACCOUNT, WITH THE THINGS THAT MAKE IT THEIRS.
   *
   * Same endpoint as the link view - `entrySave` has always been the thing that
   * creates an account, which is exactly the problem: it was only reachable through a
   * door labelled "get a sign-in link". This one is labelled what it is, and it sends
   * the name and the organisation so neither has to be guessed from the address.
   *
   * Still nothing is created until the link is opened (GW-001). This fills in the
   * pending signup, it does not make a user.
   */
  const createAccount = useMutation({
    mutationFn: () => authApi.entrySave(email.trim().toLowerCase(), {
      payload: {
        ...(firstName.trim() ? { firstName: firstName.trim() } : {}),
        ...(orgName.trim() ? { orgName: orgName.trim() } : {}),
      },
    }),
    onSuccess: () => setLinkSent(true),
    onError: (err: any) => {
      const status = err?.response?.status
      if (!status || status >= 500) {
        setError('That did not send - something went wrong on our side. Try again.')
        return
      }
      if (status === 429) {
        setError('Too many attempts. Wait a minute and try again.')
        return
      }
      // A 409 means the address already has an account, and saying so here is safe:
      // they just told us they are new, so it is the useful answer rather than a leak.
      if (status === 409) {
        setError('That address already has an account. Sign in instead.')
        return
      }
      setLinkSent(true)
    },
  })

  const sendReset = useMutation({
    mutationFn: () => authApi.forgotPassword(email.trim().toLowerCase()),
    onSuccess: () => setResetSent(true),
    /**
     * Reset stays generic on every failure, deliberately. Unlike the link above it
     * never creates anything, so the only thing an honest error could reveal is
     * whether the address is registered.
     */
    onError: () => setResetSent(true),
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

        {/* The link-sent panel carries its own heading, so "Sign in" above it read as
            two screens stacked. W8-62. */}
        {!linkSent && (
          <div className="gw-ttl">
            {view === 'create' ? 'Create your account' : view === 'link' ? 'Get a sign-in link' : 'Sign in'}
          </div>
        )}

        {view === 'password' && !linkSent && passwordlessNotice && (
          <div style={{ background: 'var(--gw-blue-bg)', border: '1px solid var(--gw-blue-b)', borderRadius: 10, padding: '13px 15px', marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gw-navy)', marginBottom: 4 }}>
              Check your email
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--gw-navy)', lineHeight: 1.6 }}>
              {passwordlessNotice}
            </div>
          </div>
        )}

        {/* `!linkSent`: on /auth/sent this whole form rendered above the panel. W8-62. */}
        {view === 'password' && !linkSent && (
          <>
            <form onSubmit={submitPassword}>
              <div className="gw-fld">
                <label className="gw-label" htmlFor="signin-email">Email</label>
                <input
                  id="signin-email"
                  className="gw-input"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError('') }}
                  autoFocus
                />
              </div>
              <div className="gw-fld">
                <label className="gw-label" htmlFor="signin-password">Password</label>
                <input
                  id="signin-password"
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
              {/*
                ONE DOOR EACH. Both of these used to open the same view: "no password"
                read as a workaround and "create an account" as registration, and they
                were the same form. Now the first is a sign-in aid and the second goes
                to a page that is only about creating an account.
              */}
              <TextAction strong onClick={() => { setError(''); setView('create') }}>New here? Create an account</TextAction>
            </div>
          </>
        )}

        {view === 'create' && !linkSent && (
          <>
            <div className="gw-sub-t" style={{ marginBottom: 20 }}>
              No password to choose. We send you a link, and your account is made when you open it.
            </div>

            <form onSubmit={e => { e.preventDefault(); setError(''); if (!email.trim().includes('@')) { setError('Enter a valid email address.'); return } createAccount.mutate() }}>
              <div className="gw-fld">
                <label className="gw-label" htmlFor="signup-name">Your name</label>
                <input
                  id="signup-name"
                  className="gw-input"
                  placeholder="Sam Taylor"
                  value={firstName}
                  onChange={e => { setFirstName(e.target.value); setError('') }}
                  autoFocus
                />
              </div>
              <div className="gw-fld">
                <label className="gw-label" htmlFor="signup-email">Work email</label>
                <input
                  id="signup-email"
                  className="gw-input"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError('') }}
                />
              </div>
              <div className="gw-fld">
                {/*
                  ASKED, NOT GUESSED. Left empty this becomes "Sam's workspace" from
                  the name - which is the current behaviour for everybody, because
                  nothing ever asked. It is optional because a person signing up to
                  try it should not be stopped by a naming decision.
                */}
                <label className="gw-label" htmlFor="signup-org">Your organisation <span style={{ color: 'var(--gw-muted)', fontWeight: 400 }}>(optional)</span></label>
                <input
                  id="signup-org"
                  className="gw-input"
                  placeholder="Acme Ltd"
                  value={orgName}
                  onChange={e => { setOrgName(e.target.value); setError('') }}
                />
                <div style={{ fontSize: 11.5, color: 'var(--gw-muted)', marginTop: 5, lineHeight: 1.5 }}>
                  What your workspace will be called. You can change it later.
                </div>
              </div>

              {error && <div className="gw-er" style={{ marginBottom: 10 }}>{error}</div>}

              <button className="gw-btn" type="submit" disabled={createAccount.isPending}>
                {createAccount.isPending ? 'Sending…' : 'Create my account →'}
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <TextAction onClick={() => { setError(''); setView('password') }}>Already have an account? Sign in</TextAction>
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

        {view === 'forgot' && !linkSent && !resetSent && (
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

        {linkSent && (
          <LinkSentPanel
            email={email}
            onUseDifferent={() => { setLinkSent(false); setView(defaultView === 'create' ? 'create' : 'link') }}
          />
        )}

        <div style={{ fontSize: 11, color: 'var(--gw-sub)', textAlign: 'center', marginTop: 24, paddingTop: 16, borderTop: '0.5px solid var(--gw-border)', lineHeight: 1.6 }}>
          Your contributions stay private from the other participants. Alignment, gaps, and confidence emerge from everyone's check-ins together.
        </div>

      </div>
    </div>
  )
}
