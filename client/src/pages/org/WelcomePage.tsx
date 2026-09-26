import { useMutation, useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/stores/auth'
import { Button } from '@/components/gw/kit'
import { AuthCard, AuthError } from '@/pages/auth/auth-kit'
import { initialsOf } from '@/components/gw/your-organisations'

/**
 * "WHERE DO YOU WORK?" (A3, #/welcome). The words are welcome.txt's, without the head count ("27
 * people."), which is not shown to somebody who is not in the organisation yet.
 *
 * What is offered comes from the server (GET /auth/where-can-i-join): organisations that let anyone
 * with this person's confirmed email domain join, invitations still open for their exact address,
 * and always "Create a new organisation".
 */
export function WelcomePage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore(s => s.setAuth)
  const [problem, setProblem] = useState('')
  const { data } = useQuery({ queryKey: ['where-can-i-join'], queryFn: authApi.whereCanIJoin, retry: false })

  const join = useMutation({
    mutationFn: (organizationId: string) => authApi.joinByDomain(organizationId),
    onSuccess: (res) => {
      setAuth(res.user, res.accessToken)
      window.location.assign('/grounds')
    },
    onError: (e: any) => setProblem(e?.response?.data?.message ?? 'That did not work, and you have not joined. Try again.'),
  })

  return (
    <AuthCard
      title="Where do you work?"
      sub="Join an organisation you belong to, or create a new one. You can be in more than one and switch between them."
    >
      {problem && <AuthError>{problem}</AuthError>}
      <ul className="gw-org-rows">
        {(data?.byDomain ?? []).map(o => (
          <li key={o.id}>
            <div className="gw-org-row gw-org-row-static">
              <span className="gw-rl-sq" aria-hidden>{initialsOf(o.name)}</span>
              <span className="gw-org-row-text">
                <b>{o.name}</b>
                <span>{`Anyone with an @${o.domain} email can join.`}</span>
              </span>
              <Button size="small" onClick={() => join.mutate(o.id)} disabled={join.isPending} aria-label={`Join ${o.name}`}>Join</Button>
            </div>
          </li>
        ))}
        {(data?.asAGuest ?? []).map(g => (
          <li key={g.invitePath}>
            <div className="gw-org-row gw-org-row-static">
              <span className="gw-rl-sq gw-rl-sq-guest" aria-hidden>{initialsOf(g.organisationName)}</span>
              <span className="gw-org-row-text">
                <b>{g.organisationName}</b>
                <span>You were invited to one check-in, as a guest.</span>
              </span>
              <Button size="small" onClick={() => navigate(g.invitePath)} aria-label={`Join ${g.organisationName} as a guest`}>Join as a guest</Button>
            </div>
          </li>
        ))}
        <li>
          <div className="gw-org-row gw-org-row-static gw-org-row-new">
            <span className="gw-rl-sq gw-rl-sq-plus" aria-hidden>+</span>
            <span className="gw-org-row-text">
              <b>Create a new organisation</b>
              <span>For a team that isn’t on Groundwork yet.</span>
            </span>
            <Button kind="secondary" size="small" to="/org-new">Create</Button>
          </div>
        </li>
      </ul>
    </AuthCard>
  )
}
