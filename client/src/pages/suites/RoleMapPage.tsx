import { useQuery } from '@tanstack/react-query'
import { roleMapApi } from '@/api/suites'
import { useAuthStore } from '@/stores/auth'
import { Page, PageTitle, Panel, Button, Note, Empty } from '@/components/gw/ui'

/**
 * THE ROLE MAP (E6, #/suite/roles, group 2 piece 4). ADMINS ONLY, on the server. The wording is
 * copied from docs/prototype/screens/E-suites/suite-roles.txt: "Every role, what it owns, and who
 * holds it. It is built from your teams and people, and it shows jobs that nobody owns.", "Role",
 * "What it owns", "Who holds it", "6 people", "Nobody" and "Nobody owns stock planning."
 *
 * PROTECTED (role behaviour): every role, every "What it owns" and "Who holds it" value, and every
 * "Nobody owns ..." line is unchanged from before this rebuild - only the surrounding markup moved
 * to the shared parts (`Page`/`PageTitle`, `Panel`, `.gwui-record-table` with its own `.gwui-nobody`
 * for a role nobody holds, `Note`/`Empty`). Nothing here was removed, hidden or simplified.
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
    <Page>
      <PageTitle
        crumbs={[{ label: 'Suites', to: '/settings/suites' }, { label: 'Role map' }]}
        title="Role map"
        subtitle="Every role, what it owns, and who holds it. It is built from your teams and people, and it shows jobs that nobody owns."
      />

      {isLoading && <Note>Loading…</Note>}
      {isError && (
        refused?.status === 403 || refused?.status === 404 ? (
          <Note tone="error">{refused.data?.message ?? 'Only an admin can open this board.'}</Note>
        ) : (
          <div>
            <Note tone="error">The board did not load.</Note>
            <Button kind="secondary" size="small" onClick={() => refetch()} disabled={isFetching}>Try again</Button>
          </div>
        )
      )}

      {data && data.roles.length === 0 && <Empty>No roles are known yet.</Empty>}
      {data && data.roles.length > 0 && (
        <>
          <Panel>
            <table className="gwui-record-table">
              <thead>
                <tr><th scope="col">Role</th><th scope="col">What it owns</th><th scope="col">Who holds it</th></tr>
              </thead>
              <tbody>
                {data.roles.map(r => {
                  const nobody = r.heldBy.length === 0
                  return (
                    <tr key={r.name}>
                      <th scope="row" className={nobody ? 'gwui-nobody' : undefined}>{r.name}</th>
                      <td>{r.owns ?? ''}</td>
                      <td className={nobody ? 'gwui-nobody' : undefined}>{heldBy(r.heldBy)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </Panel>
          {data.nobody.map(n => (
            <p key={n.name} className="gwui-panel-text">{`Nobody owns ${inASentence(n.name)}.${n.why ? ` ${n.why}` : ''}`}</p>
          ))}
        </>
      )}
    </Page>
  )
}
