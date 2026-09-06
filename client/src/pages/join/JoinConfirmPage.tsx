import { useEffect, useRef, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { joinApi } from '@/api/entry'
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
  const started = useRef(false)

  useEffect(() => {
    if (!token) { setProblem('That link is missing its code. Open the link from your email again.'); return }
    if (started.current) return
    started.current = true

    joinApi.confirm(token)
      .then(res => {
        setAuth(
          { id: res.userId, email: '', firstName: '', lastName: '', role: 'MEMBER', organizationId: '' },
          res.accessToken,
        )
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

  if (problem) {
    return (
      <Arrival>
        <LinkProblem kind="join" />
        <div style={{ marginTop: 12, fontSize: 13, color: 'var(--gw-muted)', maxWidth: 420 }}>{problem}</div>
      </Arrival>
    )
  }

  return (
    <Arrival>
      <div style={{ textAlign: 'center', color: 'var(--gw-muted)', fontSize: 13 }}>Starting your check-in…</div>
    </Arrival>
  )
}
