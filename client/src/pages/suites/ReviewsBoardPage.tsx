import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { reviewsApi, type NextReview } from '@/api/suites'
import { useAuthStore } from '@/stores/auth'
import { whenItWas } from '@/lib/a-date-reads-the-same-everywhere'
import { Button } from '@/components/gw/kit'

/**
 * PERFORMANCE REVIEWS (E4, #/suite/reviews, U.17). The wording is copied from
 * docs/prototype/screens/E-suites/suite-reviews.txt.
 *
 * WHAT EACH READER IS GIVEN IS THE SERVER'S (GET /suites/reviews/board): the reviews that fall due, as
 * the organisation's own system set them (the dates the daily reminder already reads); an admin reads
 * all of them, a lead only their own team's. "Start it" only where the server says this reader writes
 * the review with the person.
 *
 * NOT DRAWN HERE, ON PURPOSE (docs/morning-report-ui.md, item 28): "What Aisha’s review will show"
 * and "6 months of check-ins to draw on", which are the engine's to write (request 23).
 *
 * WORDING NO SCREEN SHOWS (item 28): "Started.", "Decided.", "Open it" (the prototype's words for
 * opening a decision elsewhere), "No reviews are due yet." and "The board did not load."
 */
const DID_NOT_GO = 'That did not go through, and nothing has changed. Try again.'
const at = (day: string) => new Date(`${day}T00:00:00.000Z`)
const monthOf = (day: string) => `${whenItWas(at(day), 'month', 'UTC')} ${day.slice(0, 4)}`

export function ReviewsBoardPage() {
  const user = useAuthStore(s => s.user)
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['suite-reviews'],
    queryFn: reviewsApi.board,
    enabled: !!user,
    retry: false,
  })
  const refused = (error as { response?: { status?: number; data?: { message?: string } } } | null)?.response
  const every = data?.every?.replace(/^Every /, 'every ')
  const months = [...new Set((data?.next ?? []).map(n => n.dueOn.slice(0, 7)))]

  return (
    <div className="gw-you gw-suites">
      <nav className="gw-people-crumb" aria-label="Breadcrumb"><Link to="/settings/suites">Suites</Link> / Performance reviews</nav>
      <h1 className="gw-t-title gw-suites-h1">Performance reviews</h1>
      <p className="gw-you-sub">{`${every ? `A review ${every}. ` : ''}It is built from what each person did and proved in their check-ins, with their own view beside it. There are no scores.`}</p>

      <div className="gw-you-card gw-time-rule">
        <b>How a review is built</b>
        <p>From proof in each person’s check-ins, their own view of their work, and their manager’s view. A person decides, not Groundwork.</p>
      </div>

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

      {data && data.next.length === 0 && (
        <section className="gw-suites-group" aria-labelledby="reviews-next">
          <h2 id="reviews-next" className="gw-t-h2">The next reviews</h2>
          <p className="gw-t-body gw-you-quiet">No reviews are due yet.</p>
        </section>
      )}
      {months.map(m => (
        <section key={m} className="gw-suites-group" aria-labelledby={`reviews-${m}`}>
          <div className="gw-suite-head">
            <h2 id={`reviews-${m}`} className="gw-t-h2">The next reviews</h2>
            <span className="gw-you-quiet">{monthOf(`${m}-01`)}</span>
          </div>
          <div className="gw-you-card gw-time-table-wrap">
            <table className="gw-time-table">
              <thead>
                <tr>
                  <th scope="col">Person</th>
                  <th scope="col">Written with</th>
                  <th scope="col">Where it stands</th>
                  <th scope="col"><span className="gw-sr-only">What you can do</span></th>
                </tr>
              </thead>
              <tbody>
                {data!.next.filter(n => n.dueOn.startsWith(m)).map(n => <AReviewRow key={n.dueId} n={n} />)}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  )
}

function AReviewRow({ n }: { n: NextReview }) {
  const go = useNavigate()
  const [problem, setProblem] = useState<string | null>(null)
  const start = useMutation({
    mutationFn: () => reviewsApi.start(n.dueId),
    onSuccess: (r) => go(`/suite/reviews/${r.id}`),
    onError: (e: any) => setProblem(e?.response?.data?.message || DID_NOT_GO),
  })
  const stands = n.stands === 'ready' ? 'Ready to start.' : n.stands === 'started' ? 'Started.' : 'Decided.'
  return (
    <tr>
      <th scope="row">{n.name}</th>
      <td>{n.writtenWith ?? ''}</td>
      <td>{stands}{problem && <span className="gw-auth-error" role="alert"> {problem}</span>}</td>
      <td>
        {n.reviewId
          ? <Button kind="secondary" size="small" to={`/suite/reviews/${n.reviewId}`} aria-label={`Open ${n.name}’s review`}>Open it</Button>
          : n.mayStart && <Button kind="secondary" size="small" onClick={() => start.mutate()} disabled={start.isPending} aria-label={`Start ${n.name}’s review`}>Start it</Button>}
      </td>
    </tr>
  )
}
