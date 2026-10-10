import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { apiClient } from '@/api/client'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/stores/auth'
import { Button } from '@/components/gw/kit'
import { AuthCard, AuthError } from '@/pages/auth/auth-kit'

/**
 * AN ORGANISATION'S OWN INVITE LINK (A3, #/j/baridi). The words are j-baridi.txt's, with three
 * changes said here:
 *
 *   - "27 people there use Groundwork" drops the head count: "People there use Groundwork ...".
 *   - "Join with your work email or Google" says "email", as the account cards do (Hafsah, U.2), and
 *     mentions Google only when Google sign-in is switched on.
 *   - With nobody to name (the admin who shared it has left), the heading is "You're invited to
 *     <organisation>".
 *
 * Joining gives "Takes part" (Hafsah, 26 September), through the plan's seat check, on the server.
 */
type Preview = { open: false } | { open: true; organisationName: string; inviterName: string | null }

export function JoinByLinkPage() {
  const { code = '' } = useParams<{ code: string }>()
  const navigate = useNavigate()
  const signedIn = useAuthStore(s => s.isAuthenticated)
  const setAuth = useAuthStore(s => s.setAuth)
  const [problem, setProblem] = useState('')
  const here = `/j/${encodeURIComponent(code)}`

  const { data, isLoading } = useQuery({
    queryKey: ['join-link', code],
    queryFn: () => apiClient.get(`/join-links/${encodeURIComponent(code)}`).then(r => (r.data.data ?? r.data) as Preview),
    retry: false,
  })
  const { data: methods } = useQuery({ queryKey: ['auth-methods'], queryFn: authApi.methods, staleTime: 600_000, retry: false })

  const join = useMutation({
    mutationFn: () => apiClient.post(`/join-links/${encodeURIComponent(code)}/join`).then(r => r.data.data ?? r.data),
    onSuccess: (res: any) => {
      /* Somebody whose email domain does not match the organisation's own is not joined on the
         spot (item 11, 29 September): the server raises a request instead and there is no
         `user`/`accessToken` to sign in with here. "Almost in" (join/waiting.tsx) is the same page
         a check-in invitation sends somebody to while they wait for an admin. */
      if (res.queuedForApproval) { navigate('/join/waiting', { replace: true }); return }
      setAuth(res.user, res.accessToken)
      window.location.assign('/today')
    },
    onError: (e: any) => setProblem(e?.response?.data?.message ?? 'That did not work, and you have not joined. Try again.'),
  })

  if (isLoading) return <AuthCard title="One moment." />
  if (!data || !data.open) {
    /*
     * WALKTHROUGH PASS 2, ITEM 4: A DEAD END WITH NOTHING TO PRESS. This said why the link does
     * not work and stopped there - nowhere to go, unlike the prototype's own small-state screens
     * (docs/prototype/screens/F4-small-states/badlink.txt, nowhere.txt), each of which pairs its
     * sentence with a way through. `AuthCard` already carries the Groundwork mark; a way on is
     * added here - sign in, for somebody who already has an account, or the home page.
     */
    /* B-158: the prototype's own heading for a link that does not work
       (F4-small-states/badlink.txt), the same one LinkProblem.tsx uses - this page had its own,
       different wording for the same state. */
    return (
      <AuthCard title="That link didn’t work" sub="Ask whoever sent it for the new one.">
        <div className="gw-auth-actions">
          <Button wide size="big" onClick={() => navigate('/auth')}>Sign in</Button>
        </div>
        <p className="gw-auth-small">
          <Link to="/">Go to the Groundwork home page</Link> instead.
        </p>
      </AuthCard>
    )
  }

  const org = data.organisationName
  const how = methods?.google ? 'Join with your email or Google.' : 'Join with your email.'
  return (
    <AuthCard
      title={data.inviterName ? `${data.inviterName} invited you to ${org}` : `You’re invited to ${org}`}
      sub={`People there use Groundwork for short check-ins on their work. ${how}`}
    >
      <p className="gw-auth-small" style={{ margin: '-6px 0 14px' }}>{`${window.location.host}${here}`}</p>
      {problem && <AuthError>{problem}</AuthError>}
      <div className="gw-auth-actions">
        <Button
          wide
          size="big"
          disabled={join.isPending}
          onClick={() => (signedIn ? join.mutate() : navigate(`/auth?mode=signup&next=${encodeURIComponent(here)}`))}
        >
          {`Join ${org}`}
        </Button>
        {!signedIn && (
          <Button kind="secondary" wide size="big" onClick={() => navigate(`/auth?next=${encodeURIComponent(here)}`)}>
            I already have an account
          </Button>
        )}
      </div>
      <p className="gw-auth-small">
        {`Not from ${org}? `}
        <Link to={signedIn ? '/org-new' : '/auth?mode=signup'}>Create your own organisation</Link>
        {' instead.'}
      </p>
    </AuthCard>
  )
}
