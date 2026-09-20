import { useState, useEffect } from 'react'
import { MARKETING_URL } from '@/lib/marketing'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { authApi } from '@/api/auth'
import { billingApi } from '@/api/billing'
import { aFreeRunLine, worthAsking } from './what-is-waiting-for-this-address'

/**
 * Where the API lives, for the one navigation that cannot go through the axios
 * client: OAuth starts by handing the browser to Google, so it must be a real
 * page load. Empty in dev, where Vite proxies /api to the server.
 */

import { useAuthStore } from '@/stores/auth'
import { LinkSentPanel } from './LinkSentPanel'
import { API_ORIGIN } from '@/lib/where-the-api-lives'
import { useTheTrap } from '@/components/gw/a-field-nobody-can-see'
import { looksLikeAnAddress, NOT_AN_ADDRESS } from '@/components/gw/an-address-that-can-receive-mail'
import { TextAction } from '@/components/gw/kit'



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
/* TextAction lives in components/gw/kit.tsx now, so the other screens with a <span onClick> could use it too. */

/**
 * GOOGLE'S OWN MARK, WHICH THE BUTTON DID NOT HAVE.
 *
 * "Continue with Google" was plain text in a plain box, on the two screens where somebody decides
 * whether to trust this product with their Google account. The mark is the thing that makes a
 * sign-in button recognisable at a glance - people scan for it rather than reading the words.
 *
 * Drawn inline rather than fetched: it must render on the sign-in screen with no network round
 * trip, and it is one of the few images the app cannot afford to have arrive late or not at all.
 * The four colours are Google's published brand values.
 */
function GoogleMark() {
  return (
    <svg width="17" height="17" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path fill="#4285F4" d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z" />
      <path fill="#34A853" d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z" />
      <path fill="#FBBC05" d="M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24s.85 6.91 2.34 9.88l7.35-5.7z" />
      <path fill="#EA4335" d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z" />
    </svg>
  )
}

export function AuthPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  /* The honeypot the API has always accepted and no form has ever rendered. */
  const trap = useTheTrap()
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
    /**
     * `from` IS ACCEPTED TOO, so the two spellings cannot silently diverge again. W8-70.
     *
     * `RequireAuth` and `RequirePlatformAdmin` both sent `?from=`, which nothing here read,
     * so a signed-out person clicking any protected link signed in and landed on the
     * grounds list with no idea where their page went. They send `next` now; this reads
     * both, because a redirect that loses the destination fails silently and looks like
     * the product forgetting.
     */
    const raw = searchParams.get('next') ?? searchParams.get('from')
    if (!raw) return null
    if (!raw.startsWith('/') || raw.startsWith('//')) return null
    return raw
  })()
  /*
   * WHY THEY ARE LOOKING AT THIS PAGE.
   *
   * A token expiring mid-check-in used to send the tab to `/`, which bounces a signed-out visitor
   * to the marketing site — so being signed out read as the product throwing you out. The
   * interceptor now sends `why=session-expired` and `next`, and this is the sentence that makes
   * the difference between "sign in again" and "what just happened".
   */
  const sessionExpired = searchParams.get('why') === 'session-expired'
  /**
   * AND THE GOOGLE ROUND TRIP THAT CAME BACK WITH NOTHING TO SAY.
   *
   * Reported as "I cannot even log in with Google": the button goes to Google, Google accepts the
   * app, and the person lands back on this form with no indication that anything happened. The
   * callback's failure path sent them to `/login?error=google_auth_failed`, and that route dropped
   * the query string on its way here - so the page never knew.
   *
   * The reason reaches it now, and this is the sentence. It says what to do rather than what broke,
   * because the person cannot fix what broke: the password form on this same page is the way in,
   * and the cause is in the server log where we can read it.
   */
  const googleFailed = searchParams.get('why') === 'google-signin-failed'

  const defaultView: View = isSignup ? 'create' : mode === 'member' ? 'link' : 'password'

  const [view, setView] = useState<View>(defaultView)
  /* `next` reached signIn.onSuccess and nowhere else: a ?next=/pricing visitor who created an account or
     asked for a link landed on the grounds list. The magic link opens in this browser in the ordinary case,
     so the destination is kept here for ChoosePasswordPage to honour, under the same same-origin guard. */
  useEffect(() => { try { if (nextPath) sessionStorage.setItem('gw_next', nextPath); } catch { /* storage may be unavailable */ } }, [nextPath])
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
  /* A notice about a link sent to address A stayed on screen while somebody typed address B. Both go together. */
  const clearNotices = () => { setError(''); setPasswordlessNotice('') }

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
    mutationFn: () => authApi.entrySave(email.trim().toLowerCase(), undefined, trap.filled),
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
  /*
   * Asked once the address looks like one, a beat after they stop typing, and never blocking the
   * form: a promise we cannot look up is a line that does not appear, not a sign-up that stalls.
   */
  const [freeRun, setFreeRun] = useState<string | null>(null)
  useEffect(() => {
    if (view !== 'create' || !worthAsking(email)) { setFreeRun(null); return }
    const at = window.setTimeout(() => {
      billingApi.whatIsWaitingFor(email.trim().toLowerCase())
        .then(r => setFreeRun(aFreeRunLine(r.months, r.plan)))
        .catch(() => setFreeRun(null))
    }, 500)
    return () => window.clearTimeout(at)
  }, [email, view])

  const createAccount = useMutation({
    mutationFn: () => authApi.entrySave(email.trim().toLowerCase(), {
      payload: {
        ...(firstName.trim() ? { firstName: firstName.trim() } : {}),
        ...(orgName.trim() ? { orgName: orgName.trim() } : {}),
      },
    }, trap.filled),
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
      /*
       * NOT setLinkSent(true). The same fall-through is RIGHT on sendLink above - that is the sign-in
       * door, where any honest 4xx would say whether an address exists - and WRONG here: the person
       * has just told us they are new, so there is nothing to leak, and "check your email" on a
       * request that failed is a lie. A shape complaint says nothing about any account. Do not make
       * the two consistent; they differ on purpose.
       */
      setError('That address was not accepted. Check it and try again.')
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
    if (!looksLikeAnAddress(e2)) { setError(NOT_AN_ADDRESS); return }
    if (!password) { setError('Enter your password.'); return }
    signIn.mutate()
  }

  function submitLink(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const e2 = email.trim()
    if (!looksLikeAnAddress(e2)) { setError(NOT_AN_ADDRESS); return }
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
          <h1 className="gw-ttl">
            {view === 'create' ? 'Create your account' : view === 'link' ? 'Get a sign-in link' : 'Sign in'}
          </h1>
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
            <form noValidate onSubmit={submitPassword}>
              <div className="gw-fld">
                <label className="gw-label" htmlFor="signin-email">Email</label>
                <input
                  id="signin-email"
                  className="gw-input"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => { setEmail(e.target.value); clearNotices() }}
                  autoFocus
                />
              </div>
              <div className="gw-fld">
                <label className="gw-label" htmlFor="signin-password">Password</label>
                <input
                  id="signin-password"
                  className="gw-input"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => { setPassword(e.target.value); clearNotices() }}
                />
              </div>

              <button className="gw-btn" type="submit" disabled={signIn.isPending}>
                {signIn.isPending ? 'Signing in…' : 'Sign in'}
              </button>
              {googleFailed && !error && (
                <div role="alert" style={{ marginTop: 8, fontSize: 12.5, lineHeight: 1.5, color: 'var(--gw-amber-t)', background: 'var(--gw-amber-bg)', border: '1px solid var(--gw-amber-b-soft)', borderRadius: 8, padding: '8px 10px' }}>
                  Google sent you back but we could not finish signing you in. Your email and password still work below. We have a note of what went wrong at our end.
                </div>
              )}
              {sessionExpired && !error && (
                <div role="status" style={{ marginTop: 8, fontSize: 12.5, lineHeight: 1.5, color: 'var(--gw-amber-t)', background: 'var(--gw-amber-bg)', border: '1px solid var(--gw-amber-b-soft)', borderRadius: 8, padding: '8px 10px' }}>
                  You were signed out because you had been away a while. Sign in and we will take you back to where you were - nothing you wrote has been lost.
                </div>
              )}
              {error && <div className="gw-er" role="alert" style={{ marginTop: 8 }}>{error}</div>}
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
                    style={{ width: '100%', padding: '10px 0', borderRadius: 7, background: 'white', color: 'var(--gw-text)', fontSize: 13, fontWeight: 600, border: '1px solid var(--gw-border)', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9 }}
                  >
                    {/*
                      * ONE MARK. There were two, stacked, on the sign-up side only - the sign-in
                      * button below has always had one. Added twice when the logo went in and
                      * never seen, because the change was checked on the sign-in half.
                      */}
                    <GoogleMark />
                    Continue with Google
                  </button>
                </>
              )}


            <div style={{ fontSize: 13, color: 'var(--gw-sub)', textAlign: 'center', marginTop: 14, lineHeight: 2 }}>
              <TextAction onClick={() => { clearNotices(); setView('forgot') }}>Forgot your password?</TextAction>
              <br />
              <TextAction strong onClick={() => { clearNotices(); setView('create') }}>New here? Sign up</TextAction>
            </div>
          </>
        )}

        {view === 'create' && !linkSent && (
          <>
            <div className="gw-sub-t" style={{ marginBottom: 20 }}>
              No password to choose. We send you a link, and your account is made when you open it.
            </div>

            {/*
              WHAT IS WAITING FOR THIS ADDRESS. Somebody promised three months on the house should
              read it here, while they are deciding, rather than find out on their first invoice.
              See what-is-waiting-for-this-address.ts and the API's on-the-house route.
            */}
            {freeRun && (
              <div style={{ marginBottom: 18, padding: '11px 14px', borderRadius: 8,
                            background: 'var(--gw-green-bg)', color: 'var(--gw-green-t)', fontSize: 13.5 }}>
                {freeRun}
              </div>
            )}

            <form noValidate onSubmit={e => { e.preventDefault(); setError(''); if (!looksLikeAnAddress(email)) { setError(NOT_AN_ADDRESS); return } createAccount.mutate() }}>
              {trap.field}
              <div className="gw-fld">
                <label className="gw-label" htmlFor="signup-name">Your name</label>
                <input
                  id="signup-name"
                  className="gw-input"
                  placeholder="Sam Taylor"
                  value={firstName}
                  onChange={e => { setFirstName(e.target.value); clearNotices() }}
                  autoFocus
                />
              </div>
              <div className="gw-fld">
                {/*
                  * "WORK EMAIL" WAS TURNING PEOPLE AWAY FOR NOTHING.
                  *
                  * Nothing in the code has ever required a company domain - not this form, not the
                  * API, not the org creation. The label was the only thing saying otherwise, and a
                  * label is enough: somebody who runs a real company off a Gmail address reads
                  * "Work email" as "not for you" and closes the tab. The people most likely to be
                  * turned away are exactly the small teams this is for.
                  *
                  * The placeholder said the same thing a second time, so it changes too.
                */}
                <label className="gw-label" htmlFor="signup-email">Email</label>
                <input
                  id="signup-email"
                  className="gw-input"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => { setEmail(e.target.value); clearNotices() }}
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
                  onChange={e => { setOrgName(e.target.value); clearNotices() }}
                />
                <div style={{ fontSize: 11.5, color: 'var(--gw-muted)', marginTop: 5, lineHeight: 1.5 }}>
                  What your organisation will be called. You can change it later.
                </div>
              </div>

              {error && <div className="gw-er" role="alert" style={{ marginBottom: 10 }}>{error}</div>}

              <button className="gw-btn" type="submit" disabled={createAccount.isPending}>
                {createAccount.isPending ? 'Sending…' : 'Create my account →'}
              </button>
            </form>

            {/* Same door as sign-in: an existing Google account signs in, a new one creates
                a workspace automatically - findOrCreateGoogleUser decides which, not this button. */}
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
                  style={{ width: '100%', padding: '10px 0', borderRadius: 7, background: 'white', color: 'var(--gw-text)', fontSize: 13, fontWeight: 600, border: '1px solid var(--gw-border)', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9 }}
                >
                  <GoogleMark />
                  Continue with Google
                </button>
              </>
            )}

            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <TextAction onClick={() => { clearNotices(); setView('password') }}>Already have an account? Sign in</TextAction>
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

            <form noValidate onSubmit={submitLink}>
              {trap.field}
              <div className="gw-fld">
                <label className="gw-label" htmlFor="link-email">Email</label>
                <input
                  id="link-email"
                  className="gw-input"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => { setEmail(e.target.value); clearNotices() }}
                  autoFocus
                />
              </div>

              <button className="gw-btn" type="submit" disabled={sendLink.isPending}>
                {sendLink.isPending ? 'Sending…' : 'Send link'}
              </button>
              {error && <div className="gw-er" role="alert" style={{ marginTop: 8 }}>{error}</div>}
            </form>

            <div style={{ fontSize: 13, color: 'var(--gw-sub)', textAlign: 'center', marginTop: 14 }}>
              <TextAction onClick={() => { clearNotices(); setView('password') }}>Sign in with password instead</TextAction>
            </div>
          </>
        )}

        {view === 'forgot' && !linkSent && !resetSent && (
          <>
            <div className="gw-sub-t" style={{ marginBottom: 20 }}>
              Enter your email and we will send you a link to reset your password.
            </div>

            <form noValidate onSubmit={(e) => { e.preventDefault(); setError(''); if (!looksLikeAnAddress(email)) { setError(NOT_AN_ADDRESS); return } sendReset.mutate() }}>
              <div className="gw-fld">
                <label className="gw-label" htmlFor="forgot-email">Email</label>
                <input
                  id="forgot-email"
                  className="gw-input"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => { setEmail(e.target.value); clearNotices() }}
                  autoFocus
                />
              </div>

              <button className="gw-btn" type="submit" disabled={sendReset.isPending}>
                {sendReset.isPending ? 'Sending…' : 'Send reset link'}
              </button>
              {error && <div className="gw-er" role="alert" style={{ marginTop: 8 }}>{error}</div>}
            </form>

            <div style={{ fontSize: 13, color: 'var(--gw-sub)', textAlign: 'center', marginTop: 14 }}>
              <TextAction onClick={() => { clearNotices(); setView('password') }}>Back to sign in</TextAction>
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
              <TextAction size={13} onClick={() => { setResetSent(false); setView('password') }}
              >
                Back to sign in
              </TextAction>
            </div>
          </div>
        )}

        {linkSent && (
          <LinkSentPanel
            email={email}
            onUseDifferent={() => { setLinkSent(false); setView(defaultView === 'create' ? 'create' : 'link') }}
          />
        )}

        <div style={{ fontSize: 11, color: 'var(--gw-sub)', textAlign: 'center', marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--gw-border)', lineHeight: 1.6 }}>
          One check-in each. One report showing where the team agrees, where it differs, and what to do next.
        </div>

      </div>
    </div>
  )
}
