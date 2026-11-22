import { Skeleton } from '@/components/gw/ui/Skeleton'
import { useEffect, useRef, useState } from 'react'
import { rememberTheFirstCheckInClosing } from '@/lib/the-closing-after-your-first-check-in'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { queryClient } from '@/lib/queryClient'
import { authApi, type VerifyEmailResponse, type WhereDoYouWorkFirst } from '@/api/auth'
import { WhereDoYouWork } from '@/pages/org/WhereDoYouWork'
import { thePasswordKey, forgetThePasswordKey } from './the-password-key'
import { takeJustSignedIn } from '@/lib/choose-an-organisation'
import { entryApi } from '@/api/entry'
import { groundsApi } from '@/api/grounds'
import { Page, Mark, PageTitle, Panel, SubHeading, Stack, Button, Note, Callout } from '@/components/gw/ui'
import { useAuthStore } from '@/stores/auth'
import { whatTheLinkDid, WE_SENT_A_NEW_ONE, ALREADY_CONFIRMED } from './a-link-that-has-expired'
import { LinkExpired, LinkAlreadyResent, LinkAlreadyUsedConfirmed, LinkDidNotWork } from './LinkExpired'

const COMMIT_KEY = 'gw_commit_payload'
import { loadEntryHandover, clearEntryHandover } from "./entry-handover"
import { copy } from '@/components/gw/copying-can-fail'
import { toast } from 'sonner'
import { REFERENCES_AND_RESOURCES } from '@/lib/the-references-tab'
const FRONTEND_URL = window.location.origin

// Verifying the token flips the auth state, which swaps the route into the
// authed shell and REMOUNTS this page - a genuinely fresh mount (new refs),
// which used to re-verify the now-used token and paint "Link invalid" over
// the success screen. Cache each token's outcome at module scope so remounts
// replay the outcome instead of re-verifying.
type VerifyOutcome =
  | { kind: 'success'; groundId: string; joinUrl: string | null; invited: string[]; waitingInvites?: { email: string; because: string }[]; failedInvites: string[]; whyInvitesFailed?: { email: string; because: string }[]; wasAnchorDraft: boolean }
  | { kind: 'noSession' }
  /* The save is still running somewhere else (COMMIT_IN_PROGRESS): not lost, not failed. */
  | { kind: 'stillSaving' }
  | { kind: 'commitError'; message?: string }
  | { kind: 'redirect'; to: string }
  | { kind: 'verifyError'; message: string }
  /* B-208 (review round 2): the server answered 429 (too many tries), which is neither an expired
     link nor one already used - the token itself may well still be good. Said as what it is (wait,
     try again), with the server's own sentence when it sends one, rather than falling through to
     "That link didn't work... already been used", which is not true of a request that was simply
     throttled. */
  | { kind: 'rateLimited'; message: string }
  /* The link ran out ('expired'), ran out and the server has already sent a new one ('resent'), or
     (B-208) was a sign-in link already used, whose address that already confirmed ('used-confirmed') - see
     a-link-that-has-expired.ts for what each one means and says. */
  | { kind: 'deadLink'; what: 'expired' | 'resent' | 'used-confirmed'; sentence: string }
  /* The link has just created the account: say so first, then carry on to `then`. */
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

/**
 * PRIMARY-BUTTONS-NEVER-TOGETHER: this component has several mutually exclusive `return`s, one per
 * outcome of opening the link - the welcome card for a first check-in, "we couldn't find your
 * session", "still being saved", "wasn't saved", and the rest below them - and only one is ever on
 * screen for a given link. Each writes at most one primary (navy) button of its own ("Go to your
 * check-in", "Go to my check-ins", "Try again" twice, in two states that cannot both be open at
 * once); none of them appears beside another.
 */
export function MagicVerifyPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const setAuth = useAuthStore(s => s.setAuth)
  const signedIn = useAuthStore(s => !!s.isAuthenticated)
  const [error, setError] = useState('')
  /* B-208 (review round 2): a 429 from /auth/verify-email, kept apart from `error` so it reads as
     "wait and try again" rather than falling through to the generic "That link didn't work" card. */
  const [rateLimited, setRateLimited] = useState('')
  /* B-208 (review round 3): the "Try again" button below needs to know it is mid-attempt, the same
     way the commit-error retries elsewhere on this page already do (`retrying`), but kept separate
     from them - a retry here re-attempts the VERIFY, not a commit. */
  const [verifyRetrying, setVerifyRetrying] = useState(false)
  const [deadLink, setDeadLink] = useState<{ what: 'expired' | 'resent' | 'used-confirmed'; sentence: string } | null>(null)
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
  const [waitingInvites, setWaitingInvites] = useState<{ email: string; because: string }[]>([])
  const [nextGroundId, setNextGroundId] = useState<string | null>(null)
  // null while we do not know yet; the welcome panel waits rather than flashing.
  const [isFirstGround, setIsFirstGround] = useState<boolean | null>(null)
  const [joinUrl, setJoinUrl] = useState<string | null>(null)
  /**
   * FAULT 3: AN ANCHOR DRAFT'S OWN WORDING ON THIS SCREEN, AND NOWHERE ELSE.
   *
   * `payload.scenario` (the same commit DTO field fault 1 reads, `'HELP_TEAM_UNDERSTAND'`) is what
   * `commitFlow` below reads to set this - never invented, and never applied to any other situation.
   */
  const [isAnchorCheckIn, setIsAnchorCheckIn] = useState(false)
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

  const lastAttempt = useRef<{ token: string; payload: any; user: { jobTitle?: string | null; role?: string } } | null>(null)

  function applyOutcome(outcome: VerifyOutcome) {
    /* "Where do you work?" is answered once any other outcome arrives, or its screen stays on top of
       the one that follows (U.6 review: the saved check-in's confirmation sat under it). */
    if (outcome.kind !== 'whereDoYouWork') setChoosing(null)
    if (outcome.kind === 'success') {
      setFailedInvites(outcome.failedInvites)
      setWhyInvitesFailed(outcome.whyInvitesFailed ?? [])
      setInvited(outcome.invited)
      setWaitingInvites(outcome.waitingInvites ?? [])
      setJoinUrl(outcome.joinUrl)
      setNextGroundId(outcome.groundId)
      setIsAnchorCheckIn(outcome.wasAnchorDraft)
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
    } else if (outcome.kind === 'rateLimited') {
      setRateLimited(outcome.message)
    } else if (outcome.kind === 'deadLink') {
      setDeadLink({ what: outcome.what, sentence: outcome.sentence })
    } else if (outcome.kind === 'whereDoYouWork') {
      setChoosing({ token: outcome.token, offers: outcome.offers })
    }
  }

  /** The commit half of the flow, as an outcome (never throws). Safe to re-run:
   * the server-side draft persists and commit is idempotent. */
  async function commitFlow(payload: any, hadEntryIntent: boolean): Promise<VerifyOutcome> {
    try {
      /* Somebody with nothing saved in this browser asks the server to save only if it holds a draft, so a
         new admin from the sign-up form gets no 400 on their first page (journey of 12 October). */
      const result = hadEntryIntent ? await entryApi.commit(payload) : await entryApi.commit(payload, { ifThereIsOne: true })
      if (result?.nothing) return { kind: 'redirect', to: '/grounds' }
      /* Decision 133: the lead lands on the check-in page, where her first check-in's closing is said once. */
      rememberTheFirstCheckInClosing((result as any)?.groundId)

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
      /*
       * INVITED MEANS SENT (U.6 review). Everybody who was not failed was listed as "Invited", which
       * the save card had promised too. Somebody can be added and not written to: the check-in starts
       * later, there is no seat for them yet, or the mail did not go. They are listed apart, each with
       * why, and never as invited.
       */
      const failed = new Set(result.failedInvites ?? [])
      /*
       * SCREEN FAULT 6(c): "NAME (EMAIL)" WHEN A NAME WAS GIVEN. The server's own answer carries
       * only each contributor's email; the name typed for them at the people step travelled in the
       * COMMIT PAYLOAD instead (`asSomeoneToInvite`'s `displayName`, request 166) - read back here by
       * email, the same lookup `shownAs` does on the entry page itself.
       */
      const namedAs = new Map<string, string>(
        (payload?.contributors ?? [])
          .filter((c: { email?: string; displayName?: string }) => c.email && c.displayName)
          .map((c: { email: string; displayName: string }) => [c.email.trim().toLowerCase(), c.displayName]),
      )
      const invitedEmails = (result.contributors ?? []).filter(c => !failed.has(c.email) && !c.waiting).map(c => {
        const name = namedAs.get(c.email.trim().toLowerCase())
        return name ? `${name} (${c.email})` : c.email
      })
      const waitingInvites = (result.contributors ?? []).filter(c => !failed.has(c.email) && c.waiting).map(c => ({
        email: c.email,
        because: c.waitingBecause === 'no_seat'
          ? (c.saying ?? 'Their invitation waits until there is a seat for them.')
          : c.waitingBecause === 'mail_failed'
            ? 'The invitation did not send. You can send it again from your check-in page.'
            : 'Their invitation goes out on the morning the check-in starts.',
      }))
      return {
        kind: 'success',
        groundId: result.groundId,
        joinUrl: result.joinToken ? `${FRONTEND_URL}/join?t=${result.joinToken}` : null,
        invited: invitedEmails,
        waitingInvites,
        failedInvites: result.failedInvites ?? [],
        /* Why each one did not go, which the server has always sent and this never passed on (U.6 review). */
        whyInvitesFailed: (result as { whyInvitesFailed?: { email: string; because: string }[] }).whyInvitesFailed ?? [],
        /* FAULT 3: the commit payload's own `scenario` field (fault 1), never a guess. */
        wasAnchorDraft: payload?.scenario === 'HELP_TEAM_UNDERSTAND',
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

    /*
     * NO PAGES IN BETWEEN (batch 2, group 6; staging check S14). "Your email is confirmed, Continue" and "Choose a password"
     * used to stand between an emailed link and where the person was going, the second one every time somebody had no
     * password. The link signs them in and they land where they were going; a password is set from Settings, if ever.
     */

    /*
     * THE EMAILED LINK CARRIES NO `next`, SO THE SERVER KEEPS IT (U.3 review). Somebody who pressed
     * "Join Coamana" on an invite link, signed up, and opened the link from their mailbox used to
     * land on "Where do you work?". The place they were going now comes back with the answer, and
     * is checked here too: only a path inside this app.
     */
    const goingTo = [fromParam, res.next].find(p => typeof p === 'string' && p.startsWith('/') && !p.startsWith('//') && !p.startsWith('/\\'))
    /*
     * HOME IS NOT A DESTINATION THAT SKIPS THE SAVE (U.6 review). After "Where do you work?" the
     * server says "go on to Today", and this took that as a place to go instead of saving: the set-up
     * check-in was never made and nobody was invited, while the save card had promised "opening it
     * saves your check-in and sends the invite". So a way home still commits first; only a real
     * destination (a link to one check-in, an invitation) goes straight there.
     */
    const home = goingTo === '/today' || goingTo === '/grounds' ? goingTo : null
    if (goingTo && !home) {
      return { kind: 'redirect', to: goingTo }
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

    /* Nothing to save after all, on the way home: home. */
    if (outcome.kind === 'redirect' && home && outcome.to === '/grounds') return { kind: 'redirect', to: home }
    return outcome
  }

  /**
   * ONE ATTEMPT AT VERIFYING THIS TOKEN, AS AN OUTCOME (never throws).
   *
   * Pulled out of the mount effect below (B-208, review round 3) so a 429's own "Try again" button
   * can run the exact same attempt again, rather than duplicating it. Not cached in `verifyFlows`
   * by this function itself - the caller decides whether this is the one-per-token first attempt
   * (cached) or a deliberate retry (not: a throttled attempt must be asked again, not replayed from
   * memory).
   */
  function attemptVerify(token: string, fromParam: string | null): Promise<VerifyOutcome> {
    return (async (): Promise<VerifyOutcome> => {
      let res: Awaited<ReturnType<typeof authApi.verifyEmail>>
      try {
        /* Only with a key when this browser chose a password at sign-up; otherwise exactly as before. */
        const passwordKey = thePasswordKey()
        res = passwordKey ? await authApi.verifyEmail(token, undefined, passwordKey) : await authApi.verifyEmail(token)
        if ('accessToken' in res && res.accessToken) forgetThePasswordKey()
      } catch (err: any) {
        /* A link that ran out gets its own page (A2, "That link has expired"); a sign-in link
           already used, whose address this already confirmed, gets its own too (B-208, "Your
           email is already confirmed"); anything else stays with "That link didn’t work"
           (LinkDidNotWork). */
        const said = err?.response?.data?.message
        /* B-208 (review round 2): checked BEFORE whatTheLinkDid, which reads the server's
           sentence to decide "expired"/"used"/etc - a 429 is a different question entirely (too
           many tries, not what the link itself did), and may carry no recognisable sentence of
           that shape at all. */
        if (err?.response?.status === 429) {
          return { kind: 'rateLimited', message: typeof said === 'string' && said ? said : 'Too many tries. Wait a minute, then try again.' }
        }
        const what = whatTheLinkDid(said)
        if (what === 'expired' || what === 'resent') return { kind: 'deadLink', what, sentence: typeof said === 'string' && what === 'resent' ? said : WE_SENT_A_NEW_ONE }
        if (what === 'used-confirmed') return { kind: 'deadLink', what, sentence: typeof said === 'string' ? said : ALREADY_CONFIRMED }
        return { kind: 'verifyError', message: typeof said === 'string' && said ? said : 'The link could not be checked.' }
      }
      /*
       * Nothing has been made yet, and they choose where they work (U.3 review). In the natural
       * order: "Your email is confirmed" first, then "Where do you work?". Somebody who came from
       * Google confirmed no email, so they go straight to the choice.
       */
      if ('whereDoYouWork' in res && res.whereDoYouWork) {
        const choice: VerifyOutcome = { kind: 'whereDoYouWork', token, offers: res.whereDoYouWork }
        return choice
      }
      return afterVerify(res as SignedIn, token, fromParam)
    })()
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
      flow = attemptVerify(token, fromParam)
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

  /* B-208 (review round 3): THE 429 PAGE'S OWN "TRY AGAIN" - re-asks with the exact same token and
     destination, rather than sending somebody to retype an address the link already answered. The
     cached flow for this token is replaced (never trusted from memory: a throttled attempt earning
     the same cached answer forever would make "Try again" do nothing), and a fresh one is cached in
     its place so a remount mid-retry joins it rather than firing a third request. */
  function retryVerify() {
    const token = params.get('token')
    if (!token) return
    const fromParam = params.get('from') ?? params.get('next')
    setVerifyRetrying(true)
    setRateLimited('')
    const flow = attemptVerify(token, fromParam)
    verifyFlows.set(token, flow)
    flow.then(outcome => {
      setVerifyRetrying(false)
      if (outcome.kind === 'commitError') verifyFlows.delete(token)
      applyOutcome(outcome)
    })
  }

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
          navigate('/grounds', { replace: true })
        }
      })
      // If the count cannot be fetched, show the welcome rather than a blank
      // screen: being over-welcomed is a smaller failure than being stranded.
      .catch(() => { if (mounted) setIsFirstGround(true) })
    return () => { mounted = false }
  }, [nextGroundId])

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
        const passwordKey = thePasswordKey()
        const res = passwordKey ? await authApi.verifyEmail(token, choice, passwordKey) : await authApi.verifyEmail(token, choice)
        if ('accessToken' in res && res.accessToken) forgetThePasswordKey()
        if ('whereDoYouWork' in res && res.whereDoYouWork) return { kind: 'whereDoYouWork', token, offers: res.whereDoYouWork }
        const onward = await afterVerify(res as SignedIn, token, null)
        /* They have just answered "Where do you work?", so the first page after signing in must not
           ask it again. After afterVerify, because signing in is what sets that flag. */
        takeJustSignedIn()
        return onward
      } catch (err: any) {
        const said = err?.response?.data?.message
        /* B-208 (review round 2): same reason as the main verify flow above - a 429 is "wait and
           try again", not whatever `whatTheLinkDid` would otherwise read the sentence as. */
        if (err?.response?.status === 429) {
          return {
            kind: 'whereDoYouWork', token,
            offers: { ...offers, problem: typeof said === 'string' && said ? said : 'Too many tries. Wait a minute, then try again.' },
          }
        }
        const what = whatTheLinkDid(said)
        if (what === 'expired' || what === 'resent') return { kind: 'deadLink', what, sentence: typeof said === 'string' && what === 'resent' ? said : WE_SENT_A_NEW_ONE }
        if (what === 'used-confirmed') return { kind: 'deadLink', what, sentence: typeof said === 'string' ? said : ALREADY_CONFIRMED }
        return {
          kind: 'whereDoYouWork', token,
          offers: { ...offers, problem: typeof said === 'string' && said ? said : 'That did not go through, and nothing has changed. Try again.' },
        }
      }
    })()
    verifyFlows.set(token, flow)
    flow.then(o => { setChooseBusy(false); applyOutcome(o) })
  }

  if (choosing) {
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


  if (nextGroundId && isFirstGround === false) {
    return null   // returning user: the effect above has sent them to their grounds
  }
  if (nextGroundId && isFirstGround === null) {
    return null   // still counting; better a blank moment than the wrong screen
  }

  if (nextGroundId) {
    return (
      <Page narrow>
        <Mark />
        <Stack gap={18}>
          <Callout tone="success" role="status">
            Your check-in is set up. Your session is saved and you are signed in.
          </Callout>

          {/* The way on comes first (Hafsah, 22 November 2026: "how do you get to your board or where you are meant to get to from
              here"). It sat under four panels, below the fold; nothing on the page is removed, only the button moves up. */}
          <Button
            size="big"
            wide
            onClick={() => navigate(`/grounds/${nextGroundId}`, { replace: true })}
          >
            Go to your check-in
          </Button>

          {joinUrl && (
            <Panel heading={isAnchorCheckIn ? 'Share this link to invite people' : 'Share this link to invite participants'}>
              <span className="gwui-invite-link-row">
                <span className="gwui-invite-link-address">{joinUrl}</span>
                <Button
                  kind="secondary"
                  size="small"
                  onClick={async () => { if (!(await copy(joinUrl))) toast.error('Copying is not available here. Select the link and copy it yourself.') }}
                >
                  Copy link
                </Button>
              </span>
            </Panel>
          )}

          {invited.length > 0 && (
            <Panel heading={`Invited (${invited.length}) ✓`}>
              <div className="gwui-subheading-list">
                <p className="gwui-panel-text">Each of these people has been emailed a private link to add their own version:</p>
                {invited.map(e => <p key={e} className="gwui-panel-text">{e}</p>)}
                <Note>
                  Track who has checked in on your check-in page. Each person shows as invited, in
                  progress or completed, and you can send a reminder from there.
                </Note>
              </div>
            </Panel>
          )}

          {waitingInvites.length > 0 && (
            <Panel heading={`Not invited yet (${waitingInvites.length})`}>
              <div className="gwui-subheading-list">
                {waitingInvites.map(w => (
                  <div key={w.email}>
                    <p className="gwui-panel-text">{w.email}</p>
                    <Note>{w.because}</Note>
                  </div>
                ))}
              </div>
            </Panel>
          )}

          {failedInvites.length > 0 && (
            <Panel heading={invited.length === 0 ? 'None of your invites could be sent' : 'Some invites did not send'}>
              <div className="gwui-subheading-list">
                {/*
                  * SAYS WHY, PER PERSON. This read "these addresses were not reached, you can resend
                  * from your check-in page", which is right for a bounced email and wrong for the
                  * commonest cause: the free plan covers five people including you, so an admin who
                  * names five colleagues here loses one. Resending will never fix a seat limit, and
                  * being told to retry something that cannot work is worse than being told the limit.
                  */}
                <p className="gwui-panel-text">
                  {whyInvitesFailed.length > 0
                    ? 'These did not go out:'
                    : 'These addresses were not reached. You can resend from your check-in page:'}
                </p>
                {failedInvites.map(e => (
                  <div key={e}>
                    <p className="gwui-panel-text">{e}</p>
                    {whyInvitesFailed.find(w => w.email === e) && (
                      <Note>{whyInvitesFailed.find(w => w.email === e)!.because}</Note>
                    )}
                  </div>
                ))}
              </div>
            </Panel>
          )}

          <Panel heading="What happens next">
            <div className="gwui-subheading-list">
              <div>
                <SubHeading>The people you added get their invitation</SubHeading>
                <p className="gwui-panel-text">Anyone you added will receive an email with a private link. They check in independently.</p>
              </div>
              <div>
                <SubHeading>Their answers come in</SubHeading>
                <p className="gwui-panel-text">Once they submit, Groundwork builds a picture from what everyone said. The report shows where people agree and where they differ.</p>
              </div>
              {/*
                SCREEN FAULT 1: NO RELEASE STEP FOR AN ANCHOR DRAFT. There is no shared report
                nobody but the lead has ever held back - each person in `HELP_TEAM_UNDERSTAND` reads
                their own account (see the reveal on the setup screen, and docs/anchor-scenario.md).
                "You release it" describes a step this situation does not have.
              */}
              {!isAnchorCheckIn && (
              <div>
                <SubHeading>You release the report</SubHeading>
                <p className="gwui-panel-text">When you are ready, you release the report to everybody in it.</p>
              </div>
              )}
            </div>
          </Panel>

          {/*
            NOTHING EVER MENTIONED THE CONTEXT TAB.
            It holds document upload and context notes, and Hafsah finished a
            whole setup without learning it existed: "It didnt ask me or tell me
            that there a space to add more context and documents once i am done
            setting up the ground." The feature is built; this is the sentence
            that makes it findable, at the one moment somebody is looking at
            what to do next.
          */}
          <p className="gwui-fine" style={{ textAlign: 'center' }}>
            Track their check-ins on your check-in page, and add documents or notes
            for everyone to work from under <strong>{REFERENCES_AND_RESOURCES}</strong>.
          </p>

        </Stack>
      </Page>
    )
  }

  if (noSession) {
    return (
      <Page narrow>
        <Mark />
        <Stack gap={18}>
          <PageTitle
            title="We couldn’t find your session on this device"
            subtitle="Your email is confirmed, but we have no copy here of the session you saved. Open this link on the browser or device where you finished it. Your session is still saved there."
            subtitleTone="ink"
          />
          <Stack gap={10}>
            <Button wide onClick={() => navigate('/grounds', { replace: true })}>Go to my check-ins</Button>
            <Button kind="secondary" wide onClick={() => navigate('/start', { replace: true })}>Start a new check-in</Button>
          </Stack>
        </Stack>
      </Page>
    )
  }

  if (stillSaving) {
    return (
      <Page narrow>
        <Mark />
        <Stack gap={18}>
          <PageTitle
            title="Your check-in is still being saved."
            subtitle="Another tab or device is saving it right now. Nothing is lost. Give it a moment, then try again."
            subtitleTone="ink"
          />
          <Button
            wide
            disabled={retrying}
            onClick={async () => {
              if (!lastAttempt.current) { navigate('/grounds', { replace: true }); return }
              setRetrying(true)
              setStillSaving(false)
              applyOutcome(await commitFlow(lastAttempt.current.payload, true))
              setRetrying(false)
            }}
          >
            {retrying ? 'Trying again…' : 'Try again'}
          </Button>
        </Stack>
      </Page>
    )
  }

  if (commitError) {
    return (
      <Page narrow>
        <Mark />
        <Stack gap={18}>
          <PageTitle
            title="You are signed in, but the check-in wasn’t saved"
            subtitle={commitErrorMessage || 'Something went wrong saving your session. Your sign-in is ready, so go to your check-ins page and start again from there.'}
            subtitleTone="ink"
          />
          <Stack gap={10}>
            <Button
              wide
              disabled={retrying}
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
              {retrying ? 'Retrying…' : 'Try again'}
            </Button>
            <Button kind="secondary" wide onClick={() => navigate('/grounds', { replace: true })}>Go to check-ins</Button>
          </Stack>
        </Stack>
      </Page>
    )
  }

  if (deadLink?.what === 'resent') return <LinkAlreadyResent sentence={deadLink.sentence} />
  if (deadLink?.what === 'expired') return <LinkExpired kind="sign-in" />
  if (deadLink?.what === 'used-confirmed') return <LinkAlreadyUsedConfirmed sentence={deadLink.sentence} />

  /* B-208 (review round 2): a 429 reads as what it is - too many tries, wait and try again - not
     "That link didn't work... already been used", which was shown for this before and is not true
     of a request that was simply throttled.

     B-208 (review round 3): "TOO MANY TRIES" SAID THE SAME THING TWICE AND LEFT NO WAY FORWARD.
     The heading repeated the server's own sentence below it, which already says what happened
     ("too many tries in a short time"); the one thing the heading needed to add was what to do
     about it - wait. And the card was a dead end: nothing on it could be pressed, so trying again
     meant finding the original email and opening the link a second time. "Try again" re-asks with
     this same link; somebody already signed in (the throttle can be tripped by other tabs or
     devices on the same account) is also offered the one place they actually need to go. */
  if (rateLimited) {
    return (
      <Page narrow>
        <Mark />
        <Stack gap={18}>
          <PageTitle title="Wait a minute" subtitle={rateLimited} subtitleTone="ink" />
          <Stack gap={10}>
            <Button wide disabled={verifyRetrying} onClick={retryVerify}>
              {verifyRetrying ? 'Trying again…' : 'Try again'}
            </Button>
            {signedIn && (
              <Button kind="secondary" wide onClick={() => navigate('/today', { replace: true })}>Go to Today</Button>
            )}
          </Stack>
        </Stack>
      </Page>
    )
  }

  /* A link already used, one we do not know, or none at all: the account card, with one plain
     message and a way to ask for a new one (U.2 review). It used to be LinkProblem under the old
     header, with the page's or the server's own sentence. */
  if (error) return <LinkDidNotWork kind="sign-in" />

  return (
    <Page narrow>
      <Mark />
      {/* Only somebody who described a check-in before giving their address has one being made
          (U.2 re-review). Everybody else is only having their address confirmed. */}
      <Skeleton what={aCheckInIsBeingMade() ? 'Setting up your check-in…' : 'Confirming your email…'} shape="lines" count={1} />
    </Page>
  )
}
