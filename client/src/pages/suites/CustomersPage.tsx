import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { customersApi } from '@/api/suites'
import { useAuthStore } from '@/stores/auth'
import { whenItWas } from '@/lib/a-date-reads-the-same-everywhere'
import { Button } from '@/components/gw/kit'

/**
 * CUSTOMERS AND DEALS (E9, #/suite/customers, U.17). What each reader is given is the server's (GET
 * /suites/customers/board): an admin every customer, a lead only those their team owns, and nobody
 * else. The wording is copied from docs/prototype/screens/E-suites/suite-customers.txt: "One list of
 * customers and deals for the whole company. The sales check-ins keep it up to date, so nobody has to
 * update it by hand.", "Customer", "Where it stands", "Who owns it" and "Last contact".
 *
 * LEFT OUT (item 28): "Changing something here tells the person who owns the customer, in their next
 * check-in.", because nothing can be changed here: each customer is the organisation's own record, and
 * telling the owner in their next check-in is the engine's (request 28).
 *
 * WORDING NO SCREEN SHOWS (item 28): "No customers are known yet." and "The board did not load."
 */
const onDay = (day: string) => whenItWas(new Date(`${day}T00:00:00.000Z`), 'dayAndMonthLong', 'UTC')

export function CustomersPage() {
  const user = useAuthStore(s => s.user)
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['suite-customers'],
    queryFn: customersApi.get,
    enabled: !!user,
    retry: false,
  })
  const refused = (error as { response?: { status?: number; data?: { message?: string } } } | null)?.response

  return (
    <div className="gw-you gw-suites">
      <nav className="gw-people-crumb" aria-label="Breadcrumb"><Link to="/settings/suites">Suites</Link> / Customers and deals</nav>
      <h1 className="gw-t-title gw-suites-h1">Customers and deals</h1>
      <p className="gw-you-sub">One list of customers and deals for the whole company. The sales check-ins keep it up to date, so nobody has to update it by hand.</p>

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

      {data && data.customers.length === 0 && <p className="gw-t-body gw-you-quiet">No customers are known yet.</p>}
      {data && data.customers.length > 0 && (
        <div className="gw-you-card gw-time-table-wrap">
          <table className="gw-suite-table">
            <thead>
              <tr><th scope="col">Customer</th><th scope="col">Where it stands</th><th scope="col">Who owns it</th><th scope="col">Last contact</th></tr>
            </thead>
            <tbody>
              {data.customers.map(c => (
                <tr key={c.id}>
                  <th scope="row">{c.name}</th>
                  <td>{c.standing ?? ''}</td>
                  <td>{c.owner ?? ''}</td>
                  <td>{c.lastContact ? onDay(c.lastContact) : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
