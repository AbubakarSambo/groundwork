import { useState, useEffect } from 'react'
import { Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { looksLikeAnAddress } from '@/components/gw/an-address-that-can-receive-mail'
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
import { whatIsWrongWithTheAddress } from './the-address-typed'
import { Button, Stack, Choices, Callout, Note } from '@/components/gw/ui'
import { AuthCard, AuthError, AuthField, AuthNotice, AuthSplit, GoogleMark, PasswordField, PasswordRules } from './auth-kit'
import { meetsTodaysPasswordRules } from './password-rules'
import { theFreeTrialSentence } from '@/lib/the-free-trial'
import { keepThePasswordKey } from './the-password-key'



/**
 * `create` is new, and it is the point of W10-1: there was no view that was only
 * about making an account. `link` did it, under a heading that said "Sign in or
 * create account", reachable from the fourth line of small print.
 */
type View = 'password' | 'link' | 'create' | 'forgot'

/**
 * PRIMARY-BUTTONS-NEVER-TOGETHER: this component has five mutually exclusive `return`s - sign in
 * (view === 'password'), "check your email" (linkSent), create an account (view === 'create'),
 * get a sign-in link (view === 'link'), and forgot/reset your password - and only one of them is
 * ever on screen at once. Each writes its own one primary (navy) button: "Sign in", "Create
 * account", "Email me a sign-in link", and "Email me a reset link". None of the four can appear
 * beside another.
 */

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
    /* Never back to "You're signed out": arriving there signs you out again. */
    if (/^\/signout(?:[/?#]|$)/.test(raw)) return null
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
  /*
   * AN EMAIL LINK, OR A PASSWORD, AT SIGN-UP (U.2, Hafsah's decision of 26 September). The link is
   * the default, as it has always been; choosing a password shows the two boxes and the rules.
   */
  const [signInBy, setSignInBy] = useState<'link' | 'password'>('link')
  /*
   * THE ORGANISATION'S NAME, SUGGESTED FROM THE ADDRESS UNTIL THEY TYPE ONE (Hafsah, 26 September).
   * hafsah@coamana.com suggests "Coamana"; a public mail address suggests nothing. Once the person
   * types in the box, what they typed stays.
   */
  const [orgTouched, setOrgTouched] = useState(false)
  /* Asked of the server, which holds the one list of public mail domains (U.3). Only once the box
     holds an address, and a failed read suggests nothing, which is the safe direction. */
  /*
   * FROM AN ORGANISATION'S INVITE LINK, NO ORGANISATION IS ASKED FOR OR SUGGESTED (U.3 review). They
   * are joining the one whose link they pressed; the server joins them to it on confirming, and makes
   * none of their own.
   */
  const fromAnInviteLink = /^\/j\/[^/]+$/.test(nextPath ?? '')
  const typedAddress = view === 'create' && !fromAnInviteLink && looksLikeAnAddress(email) ? email.trim().toLowerCase() : ''
  const { data: suggestion } = useQuery({
    queryKey: ['name-from-address', typedAddress],
    queryFn: () => authApi.nameFromAddress(typedAddress),
    enabled: !!typedAddress,
    staleTime: Infinity,
    retry: false,
  })
  const suggestedOrg = typedAddress ? (suggestion?.name ?? null) : null
  useEffect(() => {
    if (view === 'create' && !orgTouched) setOrgName(suggestedOrg ?? '')
  }, [suggestedOrg, orgTouched, view])
  const [newPassword, setNewPassword] = useState('')
  const [newConfirm, setNewConfirm] = useState('')
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

  /*
   * THE FREE TRIAL'S SENTENCE, FROM THE SERVER'S NUMBERS (Hafsah, 26 September). Shown on sign-up
   * only while the trial is switched on, which waits until billing really grants it (U.19). A failed
   * read shows nothing, which is the safe direction.
   */
  const { data: pricing } = useQuery({
    queryKey: ['public-pricing'],
    queryFn: billingApi.getPricing,
    enabled: view === 'create',
    staleTime: 10 * 60 * 1000,
    retry: false,
  })
  /*
   * B-206: THE TRIAL LINE IS ABOUT STARTING YOUR OWN ORGANISATION, NOT ABOUT JOINING SOMEONE
   * ELSE'S. Signing up from an organisation's own invite link (/j/:code, JoinByLinkPage, which
   * sends people here as `?mode=signup&next=/j/<code>`) is always joining an organisation that
   * already exists - "Teams of fewer than 20 people get 3 months free" has nothing to do with it,
   * and reading it here (j-baridi.txt has no such line) promises a trial that is not what is about
   * to happen. Left out only on this one path; every other sign-up still reads it.
   */
  const openedFromAJoinLink = !!nextPath && nextPath.startsWith('/j/')
  const trialSentence = openedFromAJoinLink ? null : theFreeTrialSentence(pricing?.trial)

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

  /*
   * HOW THE LINK ON SCREEN WAS SENT, SO "SEND IT AGAIN" SENDS IT THE SAME WAY.
   *
   * A sign-in link, and `/auth/sent` (the marketing home's SaveCard sends one before it arrives
   * here), go through `entrySave` with nothing but the address: for an account that exists that is a
   * sign-in link, and for a sign-up still waiting it keeps everything already saved and only renews
   * the link. A new account goes through `entrySave` again with the name and organisation typed, so
   * the second link carries exactly what the first did.
   */
  const [sentBy, setSentBy] = useState<'link' | 'create'>('link')
  /*
   * B-037: "WITH A PASSWORD" STILL READ "CHECK YOUR EMAIL... WE SENT A SIGN-IN LINK", with no
   * mention anywhere that the password just typed had been kept.
   *
   * The password IS saved and does work (entrySave sends it, and it signs the person in
   * afterwards exactly like any other password) - confirming the email is still required either
   * way, since nothing can let somebody claim an address they have not proved they own. What was
   * missing was telling them that: this page read identically whichever door was chosen, so
   * choosing a password looked ignored even though it was not. Set once, when a password is
   * actually sent with the account.
   */
  const [createdWithPassword, setCreatedWithPassword] = useState(false)
  /* `nextPath` rides with the link, so opening it from the mailbox comes back here (U.3 review). It is
     only sent when there is one, so every other request is exactly what it was. */
  const save = (draft: Parameters<typeof authApi.entrySave>[1], password?: string) => nextPath
    ? authApi.entrySave(email.trim().toLowerCase(), draft, trap.filled, password, nextPath)
    : password !== undefined
      ? authApi.entrySave(email.trim().toLowerCase(), draft, trap.filled, password)
      : authApi.entrySave(email.trim().toLowerCase(), draft, trap.filled)
  const sendTheLinkAgain = () => sentBy === 'create'
    ? save({ payload: whatTheyTyped() })
    : save(undefined)

  const sendLink = useMutation({
    mutationFn: () => save(undefined),
    /* Somebody who was removed is told so, in the server's words, not that a link was sent (run 5, 19 November). */
    onSuccess: (data: any) => { if (data?.removedSays) { setError(data.removedSays); return } setSentBy('link'); setLinkSent(true) },
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
        setError('That did not send, because something went wrong on my side. Please try again.')
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

  function whatTheyTyped() {
    return {
      ...(firstName.trim() ? { firstName: firstName.trim() } : {}),
      ...(orgName.trim() && !fromAnInviteLink ? { orgName: orgName.trim() } : {}),
      /* Left as we suggested it from the address, not typed (U.3 re-review): "Create a new
         organisation" after "Where do you work?" does not reuse a suggestion that names the
         organisation they chose not to join. */
      ...(orgName.trim() && !fromAnInviteLink && !orgTouched && suggestedOrg && orgName === suggestedOrg ? { orgNameSuggested: true } : {}),
    }
  }
  const createAccount = useMutation({
    mutationFn: () => nextPath
      ? save({ payload: whatTheyTyped() }, signInBy === 'password' ? newPassword : undefined)
      : authApi.entrySave(email.trim().toLowerCase(), { payload: whatTheyTyped() }, trap.filled, signInBy === 'password' ? newPassword : undefined),
    /* The key for a password chosen here stays in this browser (the-password-key.ts, U.3 review). */
    onSuccess: (data: any) => { if (data?.removedSays) { setError(data.removedSays); return } keepThePasswordKey(data?.passwordKey); setSentBy('create'); setCreatedWithPassword(signInBy === 'password'); setLinkSent(true) },
    onError: (err: any) => {
      const status = err?.response?.status
      if (!status || status >= 500) {
        setError('That did not send, because something went wrong on my side. Please try again.')
        return
      }
      if (status === 429) {
        setError('Too many attempts. Wait a minute and try again.')
        return
      }
      /*
       * NO "THAT ADDRESS ALREADY HAS AN ACCOUNT". Hafsah's rule (26 September): sign-up never says
       * whether an address has an account. entry-save answers an existing address exactly as a new
       * one (the person is sent a sign-in link), so there is no 409 to read here any more.
       *
       * A password the server refused comes back as its own sentence ("Your password needs a number
       * or a symbol."), which is shown as it is.
       */
      const said = err?.response?.data?.message
      const sentence = Array.isArray(said) ? said[0] : said
      if (typeof sentence === 'string' && /password/i.test(sentence)) {
        setError(sentence)
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
    { const wrong = whatIsWrongWithTheAddress(e2); if (wrong) { setError(wrong); return } }
    if (!password) { setError('Enter your password.'); return }
    signIn.mutate()
  }

  /** "Email me a sign-in link instead", from the sign-in screen: a link to the address typed above. */
  function askForALink() {
    setError('')
    { const wrong = whatIsWrongWithTheAddress(email); if (wrong) { setError(wrong); return } }
    sendLink.mutate()
  }

  function submitLink(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const e2 = email.trim()
    { const wrong = whatIsWrongWithTheAddress(e2); if (wrong) { setError(wrong); return } }
    sendLink.mutate()
  }

  /**
   * GOOGLE, OFFERED ONLY WHEN THE SERVER CAN FINISH IT. A full page load, not a fetch: signing in with
   * Google starts by handing the browser to Google.
   */
  const googleButton = (label: string) => methods?.google ? (
    /* The place they were going rides to Google and back (U.3 review), such as the invite link. */
    <Button kind="secondary" wide onClick={() => { window.location.href = `${API_ORIGIN}/api/v1/auth/google${nextPath ? `?next=${encodeURIComponent(nextPath)}` : ''}` }}>
      <GoogleMark />
      {label}
    </Button>
  ) : null

  /* The API still sends a failed Google sign-in to /auth?why=google-signin-failed. It has its own
     page now, which says what happened and offers the two ways on (A2, #/google-failed). */
  if (googleFailed) return <Navigate to="/google-failed" replace />

  /* THE SIGN-IN SCREEN (A2, #/signin). The prototype's two halves: the form, and the dark panel. */
  if (view === 'password' && !linkSent) {
    return (
      <AuthSplit title="Sign in" sub="Use your password, or we’ll email you a link that signs you in.">
        {passwordlessNotice && <AuthNotice title="Check your email">{passwordlessNotice}</AuthNotice>}
        {sessionExpired && !error && (
          <AuthNotice>
            You were signed out because you had been away a while. Sign in and we will take you back to where you were. Nothing you wrote has been lost.
          </AuthNotice>
        )}

        <form noValidate onSubmit={submitPassword}>
          {trap.field}
          <Stack gap={8}>
            {/* "Email", not the prototype's "Your work email": which label to use is waiting for Hafsah. */}
            <AuthField
              id="signin-email"
              label="Email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={v => { setEmail(v); clearNotices() }}
              autoFocus
            />
            <PasswordField
              id="signin-password"
              label="Password"
              autoComplete="current-password"
              value={password}
              onChange={v => { setPassword(v); clearNotices() }}
            />
            {error && <AuthError>{error}</AuthError>}
            <Button type="submit" wide size="big" disabled={signIn.isPending}>
              {signIn.isPending ? 'Signing you in…' : 'Sign in'}
            </Button>
            {/*
              THE WAY IN FOR SOMEBODY WITH NO PASSWORD, ON THE SCREEN THEY START FROM.
              It used to be reachable only from a link carrying ?mode=member, so a person who had
              never set a password stood in front of a password box with no visible way past it.
              It sends a link to the address typed above, through the same door as every sign-in
              link, and gives the same answer whether or not the address has an account.
            */}
            <Button kind="secondary" wide size="big" disabled={sendLink.isPending} onClick={askForALink}>
              {sendLink.isPending ? 'Sending…' : 'Email me a sign-in link instead'}
            </Button>
            {googleButton('Sign in with Google')}
          </Stack>
        </form>

        <div className="signlinks">
          <Button kind="quiet" onClick={() => { clearNotices(); setView('forgot') }}>Forgot password?</Button>
          <Button kind="quiet" onClick={() => { clearNotices(); setView('create') }}>New here? Sign up</Button>
        </div>
      </AuthSplit>
    )
  }

  /* "Check your email", after a link has gone. */
  if (linkSent) {
    return (
      <LinkSentPanel
        email={email}
        resend={sendTheLinkAgain}
        onUseDifferent={() => { setLinkSent(false); setView(defaultView === 'create' ? 'create' : 'link') }}
        withPassword={sentBy === 'create' && createdWithPassword}
      />
    )
  }

  if (view === 'create') {
    const submitCreate = (e: React.FormEvent) => {
      e.preventDefault()
      setError('')
      const wrong = whatIsWrongWithTheAddress(email)
      if (wrong) { setError(wrong); return }
      if (signInBy === 'password' && !meetsTodaysPasswordRules(newPassword, newConfirm, email)) {
        setError(newPassword !== newConfirm && meetsTodaysPasswordRules(newPassword, undefined, email)
          ? 'The two passwords are not the same. Type the same password in both boxes.'
          : 'Your password does not meet every rule in the list yet.')
        return
      }
      createAccount.mutate()
    }
    const google = googleButton('Sign up with Google')
    return (
      <AuthCard title="Sign up to Groundwork" sub={trialSentence ?? 'We send you a link to confirm your email. You are signed up when you open it.'}>
        {/*
          WHAT IS WAITING FOR THIS ADDRESS. Somebody promised a month on the house should
          read it here, while they are deciding, rather than find out on their first invoice.
          See what-is-waiting-for-this-address.ts and the API's on-the-house route.
        */}
        {freeRun && <Callout tone="success" role="status">{freeRun}</Callout>}

        {/* Google first, as the prototype draws it. Same door as sign-in: an existing Google account
            signs in, a new one gets its own organisation. findOrCreateGoogleUser decides which. */}
        {google && (
          <>
            <Stack gap={10}>{google}</Stack>
            <Note center>or with your email</Note>
          </>
        )}

        <form noValidate onSubmit={submitCreate}>
          {trap.field}
          <Stack gap={10}>
            <AuthField id="signup-name" label="Your name" value={firstName} onChange={v => { setFirstName(v); clearNotices() }} autoFocus />
            {/* "Email", not "Work email": Hafsah's decision of 26 September. Nothing requires a company address. */}
            <AuthField id="signup-email" label="Email" type="email" autoComplete="email" value={email} onChange={v => { setEmail(v); clearNotices() }} />
            {/*
              ASKED, NOT GUESSED. Left empty this becomes "Sam's workspace" from the name. Optional,
              because a person signing up to try it should not be stopped by a naming decision.
            */}
            {!fromAnInviteLink && (
              <div>
                <AuthField id="signup-org" label="Your organisation (optional)" value={orgName} onChange={v => { setOrgTouched(true); setOrgName(v); clearNotices() }} />
                <p className="gwui-field-help">
                  {!orgTouched && suggestedOrg && orgName === suggestedOrg
                    ? 'I suggested this from your email address. You can change it now or later.'
                    : 'What your organisation will be called. You can change it later.'}
                </p>
              </div>
            )}

            <div>
              <p className="gwui-field-label">How would you like to sign in?</p>
              {/* `quiet` (walkthrough pass 2, item 4): "Create account" below is this page's one
                  navy button - the prototype's own sign-up screen has only the one (signup.txt). */}
              <Choices
                label="How would you like to sign in?"
                value={signInBy}
                onChange={k => { setSignInBy(k as 'link' | 'password'); clearNotices() }}
                quiet
                options={[
                  { key: 'link', label: 'With a link we email you' },
                  { key: 'password', label: 'With a password' },
                ]}
              />
            </div>

            {signInBy === 'password' && (
              <Stack gap={10}>
                <PasswordField id="signup-password" label="Password" autoComplete="new-password" value={newPassword} onChange={v => { setNewPassword(v); clearNotices() }} />
                <PasswordField id="signup-confirm" label="Type it again"
                spokenAs="password you typed again" autoComplete="new-password" value={newConfirm} onChange={v => { setNewConfirm(v); clearNotices() }} />
                <PasswordRules password={newPassword} confirm={newConfirm} email={email.trim() || null} />
              </Stack>
            )}

            {error && <AuthError>{error}</AuthError>}
            <Button type="submit" wide disabled={createAccount.isPending}>
              {createAccount.isPending ? 'Sending…' : 'Sign up'}
            </Button>
          </Stack>
        </form>

        <p className="gwui-fine">
          Already signed up?{' '}
          <Button kind="quiet" onClick={() => { clearNotices(); setView('password') }}>Sign in</Button>
        </p>
      </AuthCard>
    )
  }

  if (view === 'link') {
    return (
      <AuthCard
        title="Get a sign-in link"
        sub={isSignup
          ? 'Enter your email. We will send you a link that signs you up.'
          : 'Enter your email. We will send you a link. It signs you in, or signs you up if you are new to Groundwork.'}
      >
        <form noValidate onSubmit={submitLink}>
          {trap.field}
          <Stack gap={10}>
            <AuthField id="link-email" label="Email" type="email" autoComplete="email" value={email} onChange={v => { setEmail(v); clearNotices() }} autoFocus />
            {error && <AuthError>{error}</AuthError>}
            <Button type="submit" wide disabled={sendLink.isPending}>
              {sendLink.isPending ? 'Sending…' : 'Email me a sign-in link'}
            </Button>
          </Stack>
        </form>
        <div className="gwui-button-row">
          <Button kind="quiet" onClick={() => { clearNotices(); setView('password') }}>Sign in with a password instead</Button>
        </div>
      </AuthCard>
    )
  }

  /* FORGOT YOUR PASSWORD (A2, #/forgot), and "Check your email" once the reset link has gone. */
  if (resetSent) {
    return (
      <LinkSentPanel
        forReset
        email={email}
        /* The reset goes again through forgot-password, the door that sent it. */
        resend={() => authApi.forgotPassword(email.trim().toLowerCase())}
        onUseDifferent={() => setResetSent(false)}
      />
    )
  }
  return (
    <AuthCard title="Forgot your password?" sub="I’ll email you a link to choose a new one. It works for an hour.">
      <form noValidate onSubmit={(e) => { e.preventDefault(); setError(''); { const wrong = whatIsWrongWithTheAddress(email); if (wrong) { setError(wrong); return } } sendReset.mutate() }}>
        <Stack gap={10}>
          {/* "Email", not the prototype's "Work email": which label to use is waiting for Hafsah. */}
          <AuthField id="forgot-email" label="Email" type="email" autoComplete="email" value={email} onChange={v => { setEmail(v); clearNotices() }} autoFocus />
          {error && <AuthError>{error}</AuthError>}
          <Button type="submit" wide disabled={sendReset.isPending}>
            {sendReset.isPending ? 'Sending…' : 'Email me a reset link'}
          </Button>
        </Stack>
      </form>
      <div className="gwui-button-row">
        <Button kind="quiet" onClick={() => { clearNotices(); setView('password') }}>Back to sign in</Button>
        <Button kind="quiet" onClick={() => { clearNotices(); setView('create') }}>New here? Sign up</Button>
      </div>
    </AuthCard>
  )
}
