import { useMutation } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/stores/auth'
import { AuthCard } from '@/pages/auth/auth-kit'
import { initialsOf, roleWord, useYourOrganisations, type YourOrganisation } from '@/components/gw/your-organisations'

/**
 * "CHOOSE AN ORGANISATION" (A3, #/orgs). The wording is copied from
 * docs/prototype/screens/A3-organisations-and-joining/orgs.txt.
 *
 * Shown once after signing in to somebody in two or more organisations (see lib/choose-an-
 * organisation.ts), and reachable at its address. Each row shows the role they have there, so
 * choosing one needs no confirm box: the role is on the row before they press it.
 *
 * The prototype's "3 new" on each row waits for the one read of "what needs you" (U.5). A count this
 * page made up would be worse than none.
 */
export function OrgsPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore(s => s.setAuth)
  const { myOrgs } = useYourOrganisations()

  const open = useMutation({
    mutationFn: (organizationId: string) => authApi.switchOrganization(organizationId),
    onSuccess: (res) => {
      setAuth(res.user, res.accessToken)
      window.location.assign('/grounds')
    },
    onError: () => toast.error('That organisation did not open. Try again.'),
  })

  function choose(o: YourOrganisation) {
    if (open.isPending) return
    if (o.active) { navigate('/grounds', { replace: true }); return }
    open.mutate(o.id)
  }

  const n = myOrgs.length
  const sub = n === 0 ? undefined : n === 1
    ? 'You’re in one organisation.'
    : `You’re in ${n}. You can switch at any time from the top of the sidebar.`

  return (
    <AuthCard title="Choose an organisation" sub={sub}>
      <ul className="gw-org-rows">
        {myOrgs.map(o => (
          <li key={o.id}>
            <button type="button" className="gw-org-row" onClick={() => choose(o)} disabled={open.isPending}>
              <span className="gw-rl-sq" aria-hidden>{initialsOf(o.name)}</span>
              <span className="gw-org-row-text">
                <b>{o.name}</b>
                <span>{roleWord(o.role)}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      <p className="gw-org-rows-foot">
        <Link to="/welcome" className="gw-auth-link">Join or create another</Link>
      </p>
    </AuthCard>
  )
}
