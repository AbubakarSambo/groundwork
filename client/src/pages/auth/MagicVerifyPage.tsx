import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { queryClient } from '@/lib/queryClient'
import { authApi, type VerifyEmailResponse, type WhereDoYouWorkFirst } from '@/api/auth'
import { WhereDoYouWork } from '@/pages/org/WhereDoYouWork'
import { entryApi } from '@/api/entry'
import { groundsApi } from '@/api/grounds'
import { Arrival } from '@/components/gw/Arrival'
import { useAuthStore } from '@/stores/auth'
import { whatTheLinkDid, WE_SENT_A_NEW_ONE } from './a-link-that-has-expired'
import { LinkExpired, LinkAlreadyResent, LinkDidNotWork } from './LinkExpired'
import { EmailConfirmed } from './EmailConfirmed'

const COMMIT_KEY = 'gw_commit_payload'
import { loadEntryHandover, clearEntryHandover } from "./entry-handover"
import { copy } from '@/components/gw/copying-can-fail'
import { toast } from 'sonner'
const FRONTEND_URL = window.location.origin

// Verifying the token flips the auth state, which swaps the route into the
// authed shell and REMOUNTS this page - a genuinely fresh mount (new refs),
// which used to re-verify the now-used token and paint "Link invalid" over
// the success screen. Cache each token's outcome at module scope so remounts
// replay the outcome instead of re-verifying.
type VerifyOutcome =
  | { kind: 'success'; groundId: string; joinUrl: string | null; invited: string[]; failedInvites: string[]; whyInvitesFailed?: { email: string; because: string }[]; passwordSetupToken?: string }
  | { kind: 'noSession' }
  /* The save is still running somewhere else (COMMIT_IN_PROGRESS): not lost, not failed. */
  | { kind: 'stillSaving' }
  | { kind: 'commitError'; message?: string }
  | { kind: 'redirect'; to: string }
  | { kind: 'verifyError'; message: string }
  /* The link ran out ('expired'), or ran out and the server has already sent a new one ('resent'). */
  | { kind: 'deadLink'; what: 'expired' | 'resent'; sentence: string }
  /* The link has just created the account: say so first, then carry on to `then`. */
  | { kind: 'confirmed'; email: string | null; then: VerifyOutcome }
  /* The address is proved, nothing is made yet, and "Where do you work?" comes first (U.3 review). */
  | { kind: 'whereDoYouWork'; token: string; offers: WhereDoYouWorkFirst['whereDoYouWork'] }
type SignedIn = VerifyEmailResponse
// SINGLE-FLIGHT per token: the remount can happen while the first mount's
// verify+commit is still in flight, so caching only finished outcomes is not
// enough - both mounts must await the SAME promise.
const verifyFlows = new Map<string, Promise<VerifyOutcome>>()

/** Whether this browser holds a check-in described before the address was given (the entry chat's copies). */
function aCheckInIsBeingMade(): boolean {
  try { return !!localStorage.getItem(COMMIT_KEY) || !!localStorage.getItem('gw_draft_token') } catch { return false }
}

export function MagicVerifyPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const setAuth = useAuthStore(s => s.setAuth)
  const [error, setError] = useState('')
  const [deadLink, setDeadLink] = useState<{ what: 'expired' | 'resent'; sentence: string } | null>(null)
  const [confirmed, setConfirmed] = useState<{ email: string | null; then: VerifyOutcome } | null>(null)
  const [choosing, setChoosing] = useState<{ token: string; offers: WhereDoYouWorkFirst['whereDoYouWork'] } | null>(null)
  const [chooseBusy, setChooseBusy] = useState(false)
  const [commitError, setCommitError] = useState(false)
  /* The server's own sentence for a refused commit - the plan limit, the seat limit, "not named as able
     to open check-ins" - which all used to arrive as one generic line. */
  const [commitErrorMessage, setCommitErrorMessage] = useState<string | null>(null)
  const [stillSaving, setStillSaving] = useState(false)
  // Server said NO_ENTRY_SESSION: no draft and no local payload. Shown as an
  // explicit "we couldn't find your session" screen - never a silent /setup.
  const [noSession, setNoSession] = useState(false)
  const [retrying, setRetrying] = useState(false)
  const [failedInvites, setFailedInvites] = useState<string[]>([])
  const [whyInvitesFailed, setWhyInvitesFailed] = useState<{ email: string; because: string }[]>([])
  const [invited, setInvited] = useState<string[]>([])
  const [nextGroundId, setNextGroundId] = useState<string | null>(null)
  // null while we do not know yet; the welcome panel waits rather than flashing.
  const [isFirstGround, setIsFirstGround] = useState<boolean | null>(null)
  const [joinUrl, setJoinUrl] = useState<string | null>(null)
  /**
   * THE PASSWORD STEP, HELD UNTIL AFTER THE CONFIRMATION.
   *
   * Two earlier attempts at this were both wrong in the same way - they treated the password as
   * something to do INSTEAD of a screen rather than after it. First it pre-empted the commit, and
   * the ground was never created. Then it ran after the commit but redirected straight to the
   * ground, which skipped this confirmation - and this confirmation is the only place the person is
   * told WHO WAS INVITED and given the join link to pass on. Silently dropping that for every
   * first-time user is a worse bug than the one being fixed, and the persona suite caught it too.
   *
   * So the token is held here, and the onward button carries it. Everybody sees the confirmation;
   * everybody without a password sets one on the way out of it.
   */
  const [passwordSetupToken, setPasswordSetupToken] = useState<string | null>(null)

  const lastAttempt = useRef<{ token: string; payload: any; user: { jobTitle?: string | null; role?: string } } | null>(null)

  function applyOutcome(outcome: VerifyOutcome) {
    if (outcome.kind === 'success') {
      setPasswordSetupToken(outcome.passwordSetupToken ?? null)
      setFailedInvites(outcome.failedInvites)
      setWhyInvitesFailed(outcome.whyInvitesFailed ?? [])
      setInvited(outcome.invited)
      setJoinUrl(outcome.joinUrl)
      setNextGroundId(outcome.groundId)
    } else if (outcome.kind === 'noSession') {
      setNoSession(true)
    } else if (outcome.kind === 'commitError') {
      setCommitError(true)
      setCommitErrorMessage(outcome.message ?? null)
    } else if (outcome.kind === 'stillSaving') {
      setStillSaving(true)
    } else if (outcome.kind === 'redirect') {
      navigate(outcome.to, { replace: true })
    } else if (outcome.kind === 'verifyError') {
      setError(outcome.message)
    } else if (outcome.kind === 'deadLink') {
      setDeadLink({ what: outcome.what, sentence: outcome.sentence })
    } else if (outcome.kind === 'confirmed') {
      setChoosing(null)
      setConfirmed({ email: outcome.email, then: outcome.then })
    } else if (outcome.kind === 'whereDoYouWork') {
      setChoosing({ token: outcome.token, offers: outcome.offers })
    }
  }

  /** The commit half of the flow, as an outcome (never throws). Safe to re-run:
   * the server-side draft persists and commit is idempotent. */
  async function commitFlow(payload: any, hadEntryIntent: boolean): Promise<VerifyOutcome> {
    try {
      const result = await entryApi.commit(payload)

      /**
       * The sidebar has to learn the ground exists.
       *
       * The grounds list is cached with a 30 second staleTime, and it is usually
       * fetched the moment the shell mounts - which is BEFORE this commit creates
       * the first ground. Without an invalidation the sidebar sat on its empty
       * result and told a person who had just created their first ground "No
       * grounds yet", while they were looking at that very ground. Caught by a
       * Playwright run, whose accessibility snapshot showed both on screen at
       * once. GW-019.
       */
      queryClient.invalidateQueries({ queryKey: ['grounds'] })

      clearEntryHandover()
      const invitedEmails = (result.contributors ?? []).map(c => c.email).filter(e => !result.failedInvites?.includes(e))
      return {
        kind: 'success',
        groundId: result.groundId,
        joinUrl: result.joinToken ? `${FRONTEND_URL}/join?t=${result.joinToken}` : null,
        invited: invitedEmails,
        failedInvites: result.failedInvites ?? [],
      }
    } catch (err: any) {
      const msg: string = err?.response?.data?.message ?? ''
      // NO_ENTRY_SESSION: nothing to commit anywhere - no draft, no history.
      // COMMIT_IN_PROGRESS: a concurrent commit attempt for this same user
      // claimed the draft and never produced a ground (entry.service.ts's
      // awaitConsumedDraftGround gives up after ~5s) - for someone with no
      // local entry intent (an invited participant or an existing user just
      // signing in via a magic link, neither of whom ever had anything to
      // commit in the first place) this is the SAME "nothing for me here"
      // case as NO_ENTRY_SESSION, not a real failure. Both must land the
      // same way: a plain sign-in for someone who never ran the entry flow,
      // the explicit lost-session state for someone who did - never the
      // initiator-only "your ground wasn't saved" copy, which is nonsensical
      // for anyone who was never an initiator.
      /*
       * A SLOW SAVE IS NOT A LOST ONE. COMMIT_IN_PROGRESS means another attempt is still running; the
       * draft is intact on the server. For somebody who ran the entry flow that is "still saving, try
       * again in a moment" - never the lost-session screen, which offers to start over and discard it.
       */
      if (msg.includes('COMMIT_IN_PROGRESS') && hadEntryIntent) return { kind: 'stillSaving' }
      if (msg.includes('NO_ENTRY_SESSION') || msg.includes('COMMIT_IN_PROGRESS')) {
        if (hadEntryIntent) return { kind: 'noSession' }
        /**
         * A NEW ADMIN GOES TO THEIR GROUNDS, NOT TO AN ORG CODE.
         *
         * This sent a brand-new admin to `/setup` - "Set up your org", asking for an
         * **Org code** they have never had, plus a name and an organisation name their
         * account already holds. `verifyEmail` creates the organisation, the create-account
         * view now asks for its name, and the org-code model behind that page is gone.
         *
         * Found by chasing `/setup` as an orphan and discovering it was not one: it was
         * live, and it was the first screen a new admin saw.
         */
        return { kind: 'redirect', to: '/grounds' }
      }
      return { kind: 'commitError', message: msg || undefined }
    }
  }



  /** Everything after the link has made or opened the account: the password step, the confirmation, the commit. */
  async function afterVerify(res: SignedIn, token: string, fromParam: string | null): Promise<VerifyOutcome> {
    setAuth(res.user, res.accessToken)

    /**
     * THE PASSWORD STEP THE COPY PROMISES - AND WHY IT MUST NOT COME FIRST.
     *
     * Signup says it twice, on the wait page as step 2 of 3 and in the activation email, and
     * until now it never happened: this landed people straight in the app with no password. That
     * looks harmless on day one and is severe later, because a passwordless account can ONLY be
     * re-entered by requesting a fresh emailed link, every single time. In an eighteen-ground run
     * that was the fault that stopped grounds ever reaching a report - the last person to check
     * in could not sign back in to finish.
     *
     * THE FIRST VERSION OF THIS FIX PUT THE REDIRECT HERE, ABOVE THE COMMIT, and reasoned that
     * as a virtue: "so it applies to every arrival". It applied to every arrival by RETURNING
     * before the commit ever ran - so somebody arriving from the anonymous entry chat set a
     * password, landed on an empty grounds list, and the ground they had just described was
     * never created. That is the vanishing-ground bug this product already fixed once (R1), put
     * back by a change that had nothing to do with grounds.
     *
     * Caught by the persona suite, whose suite_v exists for precisely this and is named after
     * it. Nothing in the unit tests or the typecheck had an opinion.
     *
     * So the order is now: commit first, THEN the password. `passwordStep` below wraps whatever
     * destination the arrival was heading for, so the detour cannot swallow it again.
     */
    const passwordStep = (destination: string): VerifyOutcome | null =>
      res.needsPassword && res.passwordSetupToken
        ? {
            kind: 'redirect',
            to: `/set-password?token=${encodeURIComponent(res.passwordSetupToken)}&next=${encodeURIComponent(destination)}`,
          }
        : null

    /*
     * "YOUR EMAIL IS CONFIRMED" (A2, #/verify-email), ONLY FOR AN ACCOUNT THIS LINK HAS JUST MADE.
     *
     * Shown when the server says `justCreated`, and only in front of an outcome that goes on
     * (a redirect, or the first check-in's welcome). A failure is never hidden behind it. Its
     * "Continue" leads to exactly where the page would have gone without it, through the
     * password step when the account has no password yet. Without `justCreated`, which the
     * server does not send yet, nothing changes.
     */
    const confirmFirst = (o: VerifyOutcome): VerifyOutcome => {
      if (!res.justCreated) return o
      if (o.kind === 'redirect') {
        const onward = o.to.startsWith('/set-password') ? o : (passwordStep(o.to) ?? o)
        return { kind: 'confirmed', email: res.user?.email ?? null, then: onward }
      }
      if (o.kind === 'success') return { kind: 'confirmed', email: res.user?.email ?? null, then: o }
      return o
    }

    /*
     * THE EMAILED LINK CARRIES NO `next`, SO THE SERVER KEEPS IT (U.3 review). Somebody who pressed
     * "Join Coamana" on an invite link, signed up, and opened the link from their mailbox used to
     * land on "Where do you work?". The place they were going now comes back with the answer, and
     * is checked here too: only a path inside this app.
     */
    const goingTo = [fromParam, res.next].find(p => typeof p === 'string' && p.startsWith('/') && !p.startsWith('//') && !p.startsWith('/\\'))
    if (goingTo) {
      return confirmFirst(passwordStep(goingTo) ?? { kind: 'redirect', to: goingTo })
    }
    // ALWAYS attempt the commit. The server merges whatever this browser
    // has over the server-side draft written at entry-save, so the commit
    // works even when this browser has nothing (magic link opened in a
    // different browser/device). Whether there is anything to commit is
    // the SERVER's decision now - the old client-side branch here silently
    // skipped the commit and stranded people on /setup.
    const payload = loadEntryHandover() ?? { groundLabel: '', history: [], contributors: [] }
    const hadEntryIntent = !!localStorage.getItem(COMMIT_KEY) || !!localStorage.getItem('gw_draft_token')
    lastAttempt.current = { token, payload, user: res.user }
    const outcome = await commitFlow(payload, hadEntryIntent)

    /**
     * Only a SUCCESSFUL commit hands over to the password step, and it hands over pointing at
     * the ground that now exists - so the reassurance the interstitial used to give ("your
     * ground is set up") is given by the ground itself.
     *
     * A commit ERROR must stay on this screen. It has a "Try again" that re-attempts, and
     * sending somebody to set a password mid-failure loses the retry and the explanation both.
     * They will still be asked for a password the next time they arrive.
     */
    if (outcome.kind === 'success' && res.needsPassword && res.passwordSetupToken) {
      /** Shown, not skipped. The button out of the confirmation goes via the password step. */
      return confirmFirst({ ...outcome, passwordSetupToken: res.passwordSetupToken })
    }
    return confirmFirst(outcome)
  }

  useEffect(() => {
    const token = params.get('token')
    if (!token) { setError('This link has no token.'); return }

    // One flow per token, ever. Verifying flips the auth state, which swaps
    // the route into the authed shell and REMOUNTS this page mid-flight; the
    // remount (and any StrictMode double-invoke) joins the same in-flight
    // promise instead of re-verifying the now-used token - which used to
    // paint "Link invalid" over the success screen and double-fire the commit.
    let flow = verifyFlows.get(token)
    if (!flow) {
      /*
        `next` AS WELL AS `from`, BECAUSE THE INVITE MAIL SENDS `next`.
        
        This page has always honoured a destination on the URL - under the name `from`. The sign-in
        link an invite sends carried no destination at all, so somebody who clicked a link to one
        check-in, got mailed a way back, and signed in, landed on the list of everything. The mail
        carries it now, and `next` is the name the rest of this flow already uses for the same
        thing - see `passwordStep` below, which appends `next=` to the password detour.
      */
      const fromParam = params.get('from') ?? params.get('next')
      flow = (async (): Promise<VerifyOutcome> => {
        let res: Awaited<ReturnType<typeof authApi.verifyEmail>>
        try {
          res = await authApi.verifyEmail(token)
        } catch (err: any) {
          /* A link that ran out gets its own page (A2, "That link has expired"); anything else stays
             with "This link did not work" (LinkDidNotWork). */
          const said = err?.response?.data?.message
          const what = whatTheLinkDid(said)
          if (what === 'expired' || what === 'resent') return { kind: 'deadLink', what, sentence: typeof said === 'string' && what === 'resent' ? said : WE_SENT_A_NEW_ONE }
          return { kind: 'verifyError', message: typeof said === 'string' && said ? said : 'The link could not be checked.' }
        }
        /* "Where do you work?" first: nothing has been made yet (U.3 review). */
        if ('whereDoYouWork' in res && res.whereDoYouWork) return { kind: 'whereDoYouWork', token, offers: res.whereDoYouWork }
        return afterVerify(res as SignedIn, token, fromParam)
      })()
      verifyFlows.set(token, flow)
    }

    let mounted = true
    flow.then(outcome => {
      if (!mounted) return
      // A commitError is not cached as final: clear the flow so a remount or
      // "Try again" re-attempts (commit is idempotent server-side).
      if (outcome.kind === 'commitError') verifyFlows.delete(token)
      applyOutcome(outcome)
    })
    return () => { mounted = false }
  }, [])

  /**
   * Count what they already have, once a ground id is in hand. One ground means
   * this is the first run and the welcome panel is the right screen. More than
   * one means they have been here before, so they go to their grounds list
   * instead of being introduced to a product they already own.
   */
  useEffect(() => {
    if (!nextGroundId) return
    let mounted = true
    groundsApi.list()
      .then((grounds: any[]) => {
        if (!mounted) return
        const first = (grounds?.length ?? 0) <= 1
        setIsFirstGround(first)
        /**
         * A returning person skips the welcome, but must not skip the password. Somebody with a
         * second ground and still no password is exactly the account that can only ever be
         * re-entered by emailing themselves a fresh link - the whole reason this step exists.
         */
        if (!first) {
          navigate(
            passwordSetupToken
              ? `/set-password?token=${encodeURIComponent(passwordSetupToken)}&next=${encodeURIComponent('/grounds')}`
              : '/grounds',
            { replace: true },
          )
        }
      })
      // If the count cannot be fetched, show the welcome rather than a blank
      // screen: being over-welcomed is a smaller failure than being stranded.
      .catch(() => { if (mounted) setIsFirstGround(true) })
    return () => { mounted = false }
  }, [nextGroundId, passwordSetupToken])

  /**
   * THE FIRST-RUN WELCOME IS FOR A FIRST GROUND.
   *
   * "Your ground is set up. Your session is on record and your account is live",
   * a link to share, three steps explaining what happens next, and a button to
   * "Go to your ground" - correct for somebody who has just made one, and wrong
   * for the person who owns the organisation and is signing back in.
   *
   * On Ground 2, Sahar asked for a sign-in link, followed it, and was welcomed as
   * though she had just arrived, with the button pointing at the ground she had
   * closed weeks earlier. Nothing was broken. The whole screen was written for
   * somebody else, which is its own kind of broken.
   *
   * So it is shown only when this really is the org's first ground. Anybody else
   * goes where they were going.
   */
  /*
   * "WHERE DO YOU WORK?", BEFORE THE ACCOUNT EXISTS (U.3 review). "Join" joins the organisation that
   * was offered, as "Takes part"; "Create" makes their own. Either answer goes back to the server with
   * the same link, and then on exactly as any new account does. The new flow replaces the old one for
   * this token first, so the remount that signing in causes joins it rather than asking again.
   */
  function choose(choice: { joinOrganizationId: string } | { createMyOwn: true }) {
    if (!choosing || chooseBusy) return
    const { token, offers } = choosing
    setChooseBusy(true)
    const flow = (async (): Promise<VerifyOutcome> => {
      try {
        const res = await authApi.verifyEmail(token, choice)
        if ('whereDoYouWork' in res && res.whereDoYouWork) return { kind: 'whereDoYouWork', token, offers: res.whereDoYouWork }
        return afterVerify(res as SignedIn, token, null)
      } catch (err: any) {
        const said = err?.response?.data?.message
        const what = whatTheLinkDid(said)
        if (what === 'expired' || what === 'resent') return { kind: 'deadLink', what, sentence: typeof said === 'string' && what === 'resent' ? said : WE_SENT_A_NEW_ONE }
        return {
          kind: 'whereDoYouWork', token,
          offers: { ...offers, problem: typeof said === 'string' && said ? said : 'That did not go through, and nothing has changed. Try again.' },
        }
      }
    })()
    verifyFlows.set(token, flow)
    flow.then(o => { setChooseBusy(false); applyOutcome(o) })
  }

  if (choosing && !confirmed) {
    return (
      <WhereDoYouWork
        byDomain={choosing.offers.byDomain}
        problem={choosing.offers.problem}
        busy={chooseBusy}
        onJoin={id => choose({ joinOrganizationId: id })}
        create={{ onCreate: () => choose({ createMyOwn: true }) }}
      />
    )
  }

  if (confirmed) {
    return <EmailConfirmed email={confirmed.email} onContinue={() => { const then = confirmed.then; setConfirmed(null); applyOutcome(then) }} />
  }

  if (nextGroundId && isFirstGround === false) {
    return null   // returning user: the effect above has sent them to their grounds
  }
  if (nextGroundId && isFirstGround === null) {
    return null   // still counting; better a blank moment than the wrong screen
  }

  if (nextGroundId) {
    return (
      <Arrival wide>
        <div style={{ maxWidth: 380, width: '100%' }}>
          <div style={{ background: 'var(--gw-green-bg)', border: '1px solid var(--gw-green-b-soft)', borderRadius: 12, padding: '20px 22px', marginBottom: 20, textAlign: 'center' }}>
            <div style={{ fontSize: 22, marginBottom: 8 }}>✓</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--gw-green-t)', marginBottom: 4 }}>Your check-in is set up.</div>
            <div style={{ fontSize: 13, color: 'var(--gw-green-t-soft)', lineHeight: 1.6 }}>Your session is saved and you are signed in.</div>
          </div>
          {joinUrl && (
            <div style={{ background: 'white', border: '1px solid var(--gw-border)', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gw-sub)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>Share this link to invite participants</div>
              <div style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--gw-dark)', background: 'var(--gw-paper-2)', borderRadius: 6, padding: '8px 10px', wordBreak: 'break-all', marginBottom: 8 }}>{joinUrl}</div>
              <button
                onClick={async () => { if (!(await copy(joinUrl))) toast.error('Copying is not available here. Select the link and copy it yourself.') }}
                style={{ fontSize: 11, fontWeight: 700, color: 'var(--gw-dark)', background: 'none', border: '1px solid #C8C5C0', borderRadius: 5, padding: '5px 12px', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Copy link
              </button>
            </div>
          )}
          {invited.length > 0 && (
            <div style={{ background: 'var(--gw-green-bg)', border: '1px solid var(--gw-green-b-soft)', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gw-green-t)', marginBottom: 6 }}>Invited ({invited.length}) ✓</div>
              <div style={{ fontSize: 12, color: 'var(--gw-green-t-soft)', lineHeight: 1.55, marginBottom: 6 }}>Each of these people has been emailed a private link to add their own version:</div>
              {invited.map(e => (
                <div key={e} style={{ fontSize: 12, color: 'var(--gw-green-t)', fontFamily: 'monospace' }}>{e}</div>
              ))}
              <div style={{ fontSize: 12, color: 'var(--gw-green-t-soft)', lineHeight: 1.55, marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--gw-green-b-soft)' }}>
                Track who has checked in on your check-in page - each person shows as invited, in progress, or completed, and you can send a reminder from there.
              </div>
            </div>
          )}
          {failedInvites.length > 0 && (
            <div style={{ background: 'var(--gw-amber-bg)', border: '1px solid var(--gw-amber-b-soft)', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gw-amber-t)', marginBottom: 6 }}>{invited.length === 0 ? 'None of your invites could be sent.' : 'Some invites did not send.'}</div>
              {/*
                * SAYS WHY, PER PERSON. This read "these addresses were not reached, you can resend
                * from your check-in page", which is right for a bounced email and wrong for the
                * commonest cause: the free plan covers five people including you, so an admin who
                * names five colleagues here loses one. Resending will never fix a seat limit, and
                * being told to retry something that cannot work is worse than being told the limit.
                */}
              <div style={{ fontSize: 12, color: 'var(--gw-amber-t)', lineHeight: 1.55, marginBottom: 8 }}>
                {whyInvitesFailed.length > 0
                  ? 'These did not go out:'
                  : 'These addresses were not reached. You can resend from your check-in page:'}
              </div>
              {failedInvites.map(e => (
                <div key={e} style={{ fontSize: 12, color: '#5A3A00', marginBottom: 5 }}>
                  <span style={{ fontFamily: 'monospace' }}>{e}</span>
                  {whyInvitesFailed.find(w => w.email === e) && (
                    <div style={{ fontFamily: 'inherit', lineHeight: 1.5, marginTop: 1 }}>
                      {whyInvitesFailed.find(w => w.email === e)!.because}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          <div style={{ background: 'white', border: '1px solid var(--gw-border)', borderRadius: 12, padding: '18px 20px', marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--gw-sub)', marginBottom: 14 }}>What happens next</div>
            {[
              { n: '1', title: 'Participants get their invite', body: 'Anyone you added will receive an email with a private link. They check in independently.' },
              { n: '2', title: 'Their answers come in', body: 'Once they submit, Groundwork builds a picture from what everyone said. The report shows where people agree and where they differ.' },
              { n: '3', title: 'You release the report', body: 'When you are ready, you release the report to everybody in it.' },
            ].map(s => (
              <div key={s.n} style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--gw-navy)', color: 'white', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>{s.n}</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>{s.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.55 }}>{s.body}</div>
                </div>
              </div>
            ))}
          </div>
          {/*
            NOTHING EVER MENTIONED THE CONTEXT TAB.
            It holds document upload and context notes, and Hafsah finished a
            whole setup without learning it existed: "It didnt ask me or tell me
            that there a space to add more context and documents once i am done
            setting up the ground." The feature is built; this is the sentence
            that makes it findable, at the one moment somebody is looking at
            what to do next.
          */}
          <div style={{ fontSize: 12, color: 'var(--gw-sub)', textAlign: 'center', marginBottom: 8, lineHeight: 1.6 }}>
            Track their check-ins on your check-in page, and add documents or notes
            for everyone to work from under <strong>Context</strong>.
          </div>
          <button
            onClick={() => navigate(
              passwordSetupToken
                ? `/set-password?token=${encodeURIComponent(passwordSetupToken)}&next=${encodeURIComponent(`/grounds/${nextGroundId}`)}`
                : `/grounds/${nextGroundId}`,
              { replace: true },
            )}
            style={{ width: '100%', padding: '13px 16px', borderRadius: 8, background: 'var(--gw-navy)', color: 'white', fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            Go to your check-in →
          </button>
        </div>
      </Arrival>
    )
  }

  if (noSession) {
    return (
      <Arrival wide>
        <div style={{ maxWidth: 400, width: '100%', textAlign: 'center' }}>
          <div style={{ background: 'var(--gw-amber-bg)', border: '1px solid var(--gw-amber-b-soft)', borderRadius: 12, padding: '20px 22px', marginBottom: 20, textAlign: 'left' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--gw-amber-t)', marginBottom: 6 }}>We couldn't find your session on this device.</div>
            <div style={{ fontSize: 13, color: 'var(--gw-amber-t)', lineHeight: 1.6 }}>
              Your account is active, but the session you saved isn't on this device and we don't have a copy of it.
              If you finished your session in a different browser or on another device, open this link there - your session is still saved on that device.
            </div>
          </div>
          <button className="gw-btn" style={{ marginBottom: 10 }} onClick={() => navigate('/grounds', { replace: true })}>
            Go to my check-ins →
          </button>
          <button className="gw-btn" style={{ background: 'white', color: 'var(--gw-navy)', border: '1px solid var(--gw-border)' }} onClick={() => navigate('/start', { replace: true })}>
            Start a new check-in
          </button>
        </div>
      </Arrival>
    )
  }

  if (stillSaving) {
    return (
      <Arrival wide>
        <div style={{ maxWidth: 380, width: '100%', textAlign: 'center' }}>
          <div style={{ background: 'var(--gw-amber-bg)', border: '1px solid var(--gw-amber-b-soft)', borderRadius: 12, padding: '20px 22px', marginBottom: 20 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--gw-amber-t)', marginBottom: 6 }}>Your check-in is still being saved.</div>
            <div style={{ fontSize: 13, color: 'var(--gw-amber-t)', lineHeight: 1.6 }}>Another tab or device is saving it right now. Nothing is lost. Give it a moment, then try again.</div>
          </div>
          <button
            className="gw-btn"
            disabled={retrying}
            style={{ opacity: retrying ? 0.6 : 1 }}
            onClick={async () => {
              if (!lastAttempt.current) { navigate('/grounds', { replace: true }); return }
              setRetrying(true)
              setStillSaving(false)
              applyOutcome(await commitFlow(lastAttempt.current.payload, true))
              setRetrying(false)
            }}
          >
            {retrying ? 'Trying again...' : 'Try again'}
          </button>
        </div>
      </Arrival>
    )
  }

  if (commitError) {
    return (
      <Arrival wide>
        <div style={{ maxWidth: 380, width: '100%', textAlign: 'center' }}>
          <div style={{ background: 'var(--gw-red-bg)', border: '1px solid var(--gw-red-b-soft)', borderRadius: 12, padding: '20px 22px', marginBottom: 20 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--gw-red-t)', marginBottom: 6 }}>You are signed in, but the check-in wasn't saved.</div>
            <div style={{ fontSize: 13, color: '#7A3030', lineHeight: 1.6 }}>{commitErrorMessage || 'Something went wrong saving your session. Your sign-in is ready - go to your check-ins page and start again from there.'}</div>
          </div>
          <button
            className="gw-btn"
            disabled={retrying}
            style={{ marginBottom: 10, opacity: retrying ? 0.6 : 1 }}
            onClick={async () => {
              if (!lastAttempt.current) return
              setRetrying(true)
              setCommitError(false)
              // Safe to retry: the draft persists server-side and commit is
              // idempotent (a replay returns the existing ground).
              applyOutcome(await commitFlow(lastAttempt.current.payload, true))
              setRetrying(false)
            }}
          >
            {retrying ? 'Retrying...' : 'Try again'}
          </button>
          <button className="gw-btn" onClick={() => navigate('/grounds', { replace: true })}>
            Go to check-ins →
          </button>
        </div>
      </Arrival>
    )
  }

  if (deadLink?.what === 'resent') return <LinkAlreadyResent sentence={deadLink.sentence} />
  if (deadLink?.what === 'expired') return <LinkExpired kind="sign-in" />

  /* A link already used, one we do not know, or none at all: the account card, with one plain
     message and a way to ask for a new one (U.2 review). It used to be LinkProblem under the old
     header, with the page's or the server's own sentence. */
  if (error) return <LinkDidNotWork kind="sign-in" />

  return (
    <Arrival>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 40, height: 40, border: '3px solid var(--gw-navy)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
        {/* Only somebody who described a check-in before giving their address has one being made
            (U.2 re-review). Everybody else is only having their address confirmed. */}
        <div style={{ fontSize: 14, color: 'var(--gw-sub)' }}>{aCheckInIsBeingMade() ? 'Setting up your check-in…' : 'Confirming your email…'}</div>
      </div>
    </Arrival>
  )
}
