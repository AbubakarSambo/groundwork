import { useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { todayApi, type Need } from '@/api/today'
import { useAuthStore } from '@/stores/auth'
import { Button, NeedsYouList, NeedsYouRow } from '@/components/gw/kit'
import { whenItWas } from '@/lib/a-date-reads-the-same-everywhere'
import { AdminFirstRun } from '@/pages/grounds/an-admin-lands-on-a-check-in-list'
import { partOfTheDay, whenItComes } from './when-it-comes'
import { AppealsToDecide } from '@/components/gw/Suggestions'
import { groundsApi } from '@/api/grounds'
import { YouAreIn } from './YouAreIn'

/**
 * TODAY (C1, #/today). The wording is copied from docs/prototype/screens/C1-today-and-check-ins/
 * today-lead.txt, today-admin.txt and today-participant-with-groundwork-message.txt.
 *
 *   "Morning, Wairimu"
 *   "Wednesday 23 September. In the sales team, 5 of 6 have checked in today; Omar hasn't yet."
 *   "What needs you"          "5 things, most important first"
 *   "Coming up"
 *
 * WHAT IS ON IT IS DECIDED BY THE SERVER (GET /today), from what this reader may already see. The
 * page adds nothing to it; it only says the date and the times in the reader's own clock.
 *
 * A NEW ORGANISATION'S TODAY starts with the welcome card and "Get <organisation> going", as Hafsah
 * decided on 26 September (no tour). They are for admins, and each hides itself when it is done.
 *
 * NOT HERE YET, because nothing in the product holds it: the message Groundwork writes first, "Since
 * yesterday" with the deal ladder, "Your deals", and the chief executive's company priorities. Each
 * waits for the part of the product that holds it (see docs/morning-report-ui.md, U.5).
 */
export function TodayPage() {
  const user = useAuthStore(s => s.user)
  const [params] = useSearchParams()
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['today'],
    queryFn: todayApi.get,
    enabled: !!user,
    staleTime: 30_000,
  })

  /* Only read after joining, for "You are in." (the same list the sidebar reads, so no extra request). */
  const grounds = useQuery({ queryKey: ['grounds'], queryFn: groundsApi.list, enabled: !!user && params.get('welcome') === '1', staleTime: 30_000 })

  const now = new Date()
  const name = user?.firstName?.trim()
  const greeting = name ? `${partOfTheDay(now)}, ${name}` : partOfTheDay(now)
  const needs = data?.needs ?? []

  return (
    <div className="gw-today">
      <div className="gw-today-main">
        {params.get('welcome') === '1' && (
          <YouAreIn checkIns={grounds.isSuccess ? (grounds.data?.length ?? 0) : null} mayStart={user?.mayOpenCheckIns !== false} />
        )}
        <AdminFirstRun />

        <h1 className="gw-t-greet gw-today-h1">{greeting}</h1>
        <p className="gw-today-line">
          {whenItWas(now, 'weekdayAndDay')}.{data?.line ? ` ${data.line}` : ''}
        </p>

        {/* Appeals to decide (C3, U.13): an admin's only. The server refuses anybody else. */}
        {user?.role === 'ADMIN' && <AppealsToDecide />}

        <section aria-labelledby="needs-you-h" className="gw-today-section">
          <div className="gw-today-section-head">
            <h2 id="needs-you-h" className="gw-t-h2">What needs you</h2>
            {needs.length > 1 && <span className="gw-t-small">{needs.length} things, most important first</span>}
          </div>
          {isLoading && <p className="gw-t-body gw-today-quiet">Loading…</p>}
          {isError && (
            <div role="alert" className="gw-today-quiet">
              <p className="gw-t-body">What needs you did not load. Nothing you have written is affected.</p>
              <Button kind="secondary" size="small" onClick={() => refetch()} disabled={isFetching}>Try again</Button>
            </div>
          )}
          {data && needs.length === 0 && <p className="gw-t-body gw-today-quiet">Nothing needs you right now.</p>}
          {needs.length > 0 && (
            <NeedsYouList label="What needs you">
              {needs.map((n: Need) => (
                <NeedsYouRow
                  key={n.key}
                  kind={n.kind}
                  title={n.title}
                  detail={n.detail ?? undefined}
                  actions={<Button kind={n.action.label === 'Start it' ? 'primary' : 'secondary'} size="small" to={n.action.to}>{n.action.label}</Button>}
                />
              ))}
            </NeedsYouList>
          )}
        </section>
      </div>

      {data && data.comingUp.length > 0 && (
        <aside aria-labelledby="coming-up-h" className="gw-today-aside">
          <h2 id="coming-up-h" className="gw-t-h3">Coming up</h2>
          <ul className="gw-coming-up">
            {data.comingUp.map(c => (
              <li key={c.at + c.what}>
                <b>{whenItComes(c.at, now)}</b>
                <Link to={c.to}>{c.what}</Link>
              </li>
            ))}
          </ul>
        </aside>
      )}
    </div>
  )
}
