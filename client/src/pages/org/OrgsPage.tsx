import { useMutation, useQuery } from '@tanstack/react-query'
import { todayApi } from '@/api/today'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/stores/auth'
import { AuthCard } from '@/pages/auth/auth-kit'
import { Tag } from '@/components/gw/kit'
import { aRowSays, initialsOf, roleWord, useYourOrganisations, type YourOrganisation } from '@/components/gw/your-organisations'

/**
 * "CHOOSE AN ORGANISATION" (A3, #/orgs). The wording is copied from
 * docs/prototype/screens/A3-organisations-and-joining/orgs.txt.
 *
 * Shown once after signing in to somebody in two or more organisations (see lib/choose-an-
 * organisation.ts), and reachable at its address. Each row shows the role they have there, so
 * choosing one needs no confirm box: the role is on the row before they press it.
 *
 * "3 new" on each row is how many things need you in that organisation, from the server's one read of
 * what needs you (GET /today/everywhere, U.5), counted with the role you have there. Nothing is shown
 * for an organisation where nothing needs you, or while the count has not arrived.
 */
export function OrgsPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore(s => s.setAuth)
  const { myOrgs } = useYourOrganisations()
  const { data: counts = [] } = useQuery({ queryKey: ['today-everywhere'], queryFn: todayApi.everywhere, retry: false })
  const newIn = (id: string) => counts.find(c => c.organizationId === id)?.count ?? 0

  const open = useMutation({
    mutationFn: (organizationId: string) => authApi.switchOrganization(organizationId),
    onSuccess: (res) => {
      setAuth(res.user, res.accessToken)
      window.location.assign('/today')
    },
    onError: () => toast.error('That organisation did not open. Try again.'),
  })

  function choose(o: YourOrganisation) {
    if (open.isPending) return
    if (o.active) { navigate('/today', { replace: true }); return }
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
            <button type="button" className="gw-org-row" onClick={() => choose(o)} disabled={open.isPending} aria-label={aRowSays(o, newIn(o.id))}>
              <span className="gw-rl-sq" aria-hidden>{initialsOf(o.name)}</span>
              <span className="gw-org-row-text">
                <b>{o.name}</b>
                <span>{roleWord(o.role)}</span>
              </span>
              {newIn(o.id) > 0 && <span className="gw-org-row-new"><Tag tone="attention">{newIn(o.id)} new</Tag></span>}
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
