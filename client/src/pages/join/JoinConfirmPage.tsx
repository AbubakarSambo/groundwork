import { useEffect, useRef, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { joinApi } from '@/api/entry'
import { authApi } from '@/api/auth'
import { Arrival } from '@/components/gw/Arrival'
import { LinkProblem } from '@/components/gw/LinkProblem'
import { useAuthStore } from '@/stores/auth'

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
  const [waiting, setWaiting] = useState('')
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
        try {
          const fresh = await authApi.me()
          setAuth(fresh, res.accessToken)
        } catch { /* the placeholder stands until the next profile read; the check-in still opens */ }
        /* Signed in, and not yet let in. Sending them to a check-in that will refuse them, with a
           message about something else, is the failure the register calls P4-B03. They are told here. */
        if (res.queuedForApproval) { setWaiting(res.saying ?? 'An admin at the organisation that invited you has to approve you joining it before you can start.'); return }
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

  if (waiting) {
    return (
      <Arrival>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>You're in - almost.</div>
        <div style={{ fontSize: 13, color: 'var(--gw-muted)', maxWidth: 420 }}>{waiting}</div>
      </Arrival>
    )
  }

  if (problem) {
    return (
      <Arrival>
        {/* The server's sentence in place of the generic one, not under it in smaller type. LinkProblem
            deliberately does not say which token failed; the server's join sentences say what to do, which is a
            smaller move against that stance and is made knowingly. */}
        <LinkProblem kind="join" detail={problem} />
      </Arrival>
    )
  }

  return (
    <Arrival>
      <div style={{ textAlign: 'center', color: 'var(--gw-muted)', fontSize: 13 }}>Starting your session…</div>
    </Arrival>
  )
}
