import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { roleMapApi } from '@/api/suites'
import { useAuthStore } from '@/stores/auth'
import { Button } from '@/components/gw/kit'

/**
 * THE ROLE MAP (E6, #/suite/roles, U.17). ADMINS ONLY, on the server. The wording is copied from
 * docs/prototype/screens/E-suites/suite-roles.txt: "Every role, what it owns, and who holds it. It is
 * built from your teams and people, and it shows jobs that nobody owns.", "Role", "What it owns", "Who
 * holds it", "6 people", "Nobody" and "Nobody owns stock planning."
 *
 * WHAT IS LEFT OUT, AND WHY (item 28): "Give it an owner", because roles and who holds them come from
 * the organisation's own systems and feed the handover, so a second place to change them would
 * disagree with the first; and "The role interview" with "Send the role interview", which are the
 * engine's (request 25). Once the engine writes them, what the role interview says a role owns fills
 * in "What it owns", and why a job nobody owns matters follows "Nobody owns ...", as the server gives it.
 *
 * WORDING NO SCREEN SHOWS (item 28): "No roles are known yet." and "The board did not load."
 */

/** "Stock planning" reads "stock planning" inside a sentence; "CRM lead" stays as it is. */
export function inASentence(name: string): string {
  return /^[A-Z][a-z]/.test(name) ? name[0].toLowerCase() + name.slice(1) : name
}

function heldBy(names: string[]): string {
  if (names.length === 0) return 'Nobody'
  if (names.length === 1) return names[0]
  return `${names.length} people`
}

export function RoleMapPage() {
  const user = useAuthStore(s => s.user)
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['suite-roles'],
    queryFn: roleMapApi.get,
    enabled: !!user,
    retry: false,
  })
  const refused = (error as { response?: { status?: number; data?: { message?: string } } } | null)?.response

  return (
    <div className="gw-you gw-suites">
      <nav className="gw-people-crumb" aria-label="Breadcrumb"><Link to="/settings/suites">Suites</Link> / Role map</nav>
      <h1 className="gw-t-title gw-suites-h1">Role map</h1>
      <p className="gw-you-sub">Every role, what it owns, and who holds it. It is built from your teams and people, and it shows jobs that nobody owns.</p>

      {isLoading && <p className="gw-t-body gw-you-quiet">Loading…</p>}
      {isError && (
        refused?.status === 403 || refused?.status === 404 ? (
          <p role="alert" className="gw-t-body">{refused.data?.message ?? 'Only an admin can open this board.'}</p>
        ) : (
          <div role="alert" className="gw-you-quiet">
            <p className="gw-t-body">The board did not load.</p>
            <Button kind="secondary" size="small" onClick={() => refetch()} disabled={isFetching}>Try again</Button>
          </div>
        )
      )}

      {data && data.roles.length === 0 && <p className="gw-t-body gw-you-quiet">No roles are known yet.</p>}
      {data && data.roles.length > 0 && (
        <>
          <div className="gw-you-card gw-time-table-wrap">
            <table className="gw-suite-table">
              <thead>
                <tr><th scope="col">Role</th><th scope="col">What it owns</th><th scope="col">Who holds it</th></tr>
              </thead>
              <tbody>
                {data.roles.map(r => {
                  const nobody = r.heldBy.length === 0
                  return (
                    <tr key={r.name}>
                      <th scope="row" className={nobody ? 'gw-nobody' : undefined}>{r.name}</th>
                      <td>{r.owns ?? ''}</td>
                      <td className={nobody ? 'gw-nobody' : undefined}>{heldBy(r.heldBy)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {data.nobody.map(n => (
            <p key={n.name} className="gw-t-body">{`Nobody owns ${inASentence(n.name)}.${n.why ? ` ${n.why}` : ''}`}</p>
          ))}
        </>
      )}
    </div>
  )
}
