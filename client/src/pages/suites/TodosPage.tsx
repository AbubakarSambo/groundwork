import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { todosApi } from '@/api/suites'
import { useAuthStore } from '@/stores/auth'
import { whenItWas } from '@/lib/a-date-reads-the-same-everywhere'
import { Button } from '@/components/gw/kit'

/**
 * TO-DOS (E8, #/suite/todos, U.17). What each reader is given is the server's (GET
 * /suites/todos/board): only lines they may already read in the check-in each came from, for an admin
 * everybody, for a lead their own team and themselves, and nobody else. The wording follows
 * docs/prototype/screens/E-suites/suite-todos.txt: each person's name, each line, and "From her
 * check-in, 24 September", with "a check-in" for "her check-in" because the product does not know
 * anybody's pronouns.
 *
 * ONE PROTOTYPE LINE IS CHANGED, because it would not be true (item 28): "Everything people said they
 * will do, from every check-in and chat, in one list for each person." says "in their check-ins", since
 * a person's own to-dos from chat stay theirs alone.
 *
 * LEFT OUT (item 28): "Done" on each line, because whether it was done is asked in the person's next
 * check-in and counts in its record, so a board must not change it; and "How people use it", because
 * "Remind me" in chat adds to the person's own list, which nobody else reads (request 27).
 *
 * WORDING NO SCREEN SHOWS (item 28): "Nobody has anything on their list yet." and "The board did not
 * load."
 */
const onDay = (day: string) => whenItWas(new Date(`${day}T00:00:00.000Z`), 'dayAndMonthLong', 'UTC')

export function TodosPage() {
  const user = useAuthStore(s => s.user)
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['suite-todos'],
    queryFn: todosApi.get,
    enabled: !!user,
    retry: false,
  })
  const refused = (error as { response?: { status?: number; data?: { message?: string } } } | null)?.response

  return (
    <div className="gw-you gw-suites">
      <nav className="gw-people-crumb" aria-label="Breadcrumb"><Link to="/settings/suites">Suites</Link> / To-dos</nav>
      <h1 className="gw-t-title gw-suites-h1">To-dos</h1>
      <p className="gw-you-sub">Everything people said they will do in their check-ins, in one list for each person. Nobody has to write it down twice.</p>

      {isLoading && <p className="gw-t-body gw-you-quiet">Loading…</p>}
      {isError && (
        refused?.status === 403 || refused?.status === 404 ? (
          <p role="alert" className="gw-t-body">{refused.data?.message ?? 'Only an admin or a lead can open this board.'}</p>
        ) : (
          <div role="alert" className="gw-you-quiet">
            <p className="gw-t-body">The board did not load.</p>
            <Button kind="secondary" size="small" onClick={() => refetch()} disabled={isFetching}>Try again</Button>
          </div>
        )
      )}

      {data && data.people.length === 0 && <p className="gw-t-body gw-you-quiet">Nobody has anything on their list yet.</p>}
      {data && data.people.map((p, i) => (
        <section key={p.name} className="gw-suites-group" aria-labelledby={`todos-${i}`}>
          <h2 id={`todos-${i}`} className="gw-t-h3">{p.name}</h2>
          <ul className="gw-leave-list">
            {p.todos.map(t => (
              <li key={t.id} className="gw-leave-row">
                <div>
                  <b>{t.text}</b>
                  <p className="gw-you-quiet">{`From a check-in, ${onDay(t.on)}`}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
