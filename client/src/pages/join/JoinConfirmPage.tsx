import { useEffect, useRef, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { joinApi } from '@/api/entry'
import { authApi } from '@/api/auth'
import { LinkProblem } from '@/components/gw/LinkProblem'
import { Page, Mark } from '@/components/gw/ui'
import { useAuthStore } from '@/stores/auth'
import { GETTING_YOUR_FIRST_QUESTION_READY } from '@/lib/opening-is-slow'

/**
 * THE ADDRESS ANSWERED.
 *
 * This is the page the emailed link opens, and the only place in the join flow
 * where an account, a participant, a check-in or a session comes into existence.
 * The page before it now only asks; see `a-join-link-is-not-a-password.ts` for
 * why the two had to be separated.
 *
 * IT RUNS ONCE. React runs an effect twice in development, and this one signs
 * somebody in against a single-use token — the second run would meet "that link
 * has already been used" and show a failure to a person who had just succeeded.
 */
export function JoinConfirmPage() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const navigate = useNavigate()
  const setAuth = useAuthStore(s => s.setAuth)
  const [problem, setProblem] = useState('')
  const started = useRef(false)

  useEffect(() => {
    if (!token) { setProblem('That link is missing its code. Open the link from your email again.'); return }
    if (started.current) return
    started.current = true

    joinApi.confirm(token)
      .then(async res => {
        /* The token first, so the profile read is authenticated; then the REAL user. This used to
           persist an empty email, no name, MEMBER and no organisation, and every screen that reads the
           store then believed the person belonged nowhere. */
        setAuth(
          { id: res.userId, email: '', firstName: '', lastName: '', role: 'MEMBER', organizationId: '' },
          res.accessToken,
        )
        /*
         * A SINGLE FAILED READ USED TO LEAVE THE PLACEHOLDER STANDING FOR GOOD.
         *
         * Found live: a real invited person (organisation and membership row both correct in the
         * database) whose organisation switcher read "Your organisation" and "Takes part" - exactly
         * this placeholder's `organizationName: undefined` and `role: 'MEMBER'`, nothing else the
         * screens could produce. Nothing anywhere else in the app calls `/auth/me` again after this
         * page, so one dropped request here - a network blip right after a fresh token, the kind
         * `openSession`'s own watchdog exists for - persisted through every reload until she signed
         * in some other way. Retried a few times, a short pause apart, before the placeholder is
         * left standing; a token that just worked for `joinApi.confirm` is not going to keep
         * refusing this read for long unless the request itself is genuinely failing.
         */
        let fresh: Awaited<ReturnType<typeof authApi.me>> | null = null
        for (let attempt = 0; attempt < 3 && !fresh; attempt++) {
          if (attempt > 0) await new Promise(r => setTimeout(r, 400))
          try { fresh = await authApi.me() } catch { /* try again, or fall through to the placeholder */ }
        }
        if (fresh) setAuth(fresh, res.accessToken)
        /* Signed in, and not yet let in. Sending them to a check-in that will refuse them, with a
           message about something else, is the failure the register calls P4-B03. They are told here. */
        /* "Almost in" (U.3), a page of its own that can be opened again. */
        if (res.queuedForApproval) { navigate('/join/waiting', { replace: true }); return }
        navigate(`/checkin/${res.checkInId}`, {
          state: { groundId: res.groundId, sessionNumber: 1 },
          replace: true,
        })
      })
      .catch(err => {
        /* The server's own sentence, because it says which of the three things
           went wrong and what to do about each. */
        setProblem(err?.response?.data?.message ?? 'That link did not work. Ask whoever sent it for a new one.')
      })
  }, [token, navigate, setAuth])

  /*
   * B-047: this page used to wrap both states in `Arrival` (a full-width header band with
   * `GroundworkLogo`, "a left-aligned top bar... in small letter-spaced capitals"), the one
   * refusal screen in the whole audit drawn that way - every other one ("This link did not
   * work"-style pages included, `/join` itself among them) centres a card on the cream page with
   * the plain inline `Mark`, via `Page narrow`. `/join`'s own `LinkProblem` (its "error" phase,
   * `JoinPage.tsx`) is rendered exactly this way already; this page now matches it.
   */
  if (problem) {
    return (
      <Page narrow>
        <Mark />
        {/* The server's sentence in place of the generic one, not under it in smaller type. LinkProblem
            deliberately does not say which token failed; the server's join sentences say what to do, which is a
            smaller move against that stance and is made knowingly. */}
        <LinkProblem kind="join" detail={problem} />
      </Page>
    )
  }

  return (
    <Page narrow>
      <Mark />
      <div style={{ textAlign: 'center', color: 'var(--gw-muted)', fontSize: 13 }}>{GETTING_YOUR_FIRST_QUESTION_READY}</div>
    </Page>
  )
}
