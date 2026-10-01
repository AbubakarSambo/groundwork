import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { reviewsApi, type NextReview } from '@/api/suites'
import { useAuthStore } from '@/stores/auth'
import { whenItWas } from '@/lib/a-date-reads-the-same-everywhere'
import { Page, PageTitle, Section, Panel, Button, Note, Empty } from '@/components/gw/ui'

/**
 * PERFORMANCE REVIEWS (E4, #/suite/reviews, group 2 piece 4). The wording is copied from
 * docs/prototype/screens/E-suites/suite-reviews.txt.
 *
 * WHAT EACH READER IS GIVEN IS THE SERVER'S (GET /suites/reviews/board): the reviews that fall due, as
 * the organisation's own system set them (the dates the daily reminder already reads); an admin reads
 * all of them, a lead only their own team's. "Start it" only where the server says this reader writes
 * the review with the person.
 *
 * REBUILT FROM THE SHARED PARTS: `Page`/`PageTitle` (crumbs, subtitle), `Panel` for "How a review is
 * built", `Section` for each month ("The next reviews", its month as `Section`'s own `note`),
 * `.gwui-record-table` for the table, `Button` for "Start it" (it has a side effect) and a plain
 * link for "Open it" (it only navigates), and `Note`/`Empty` for loading, error and empty states.
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
    <Page>
      <PageTitle
        crumbs={[{ label: 'Suites', to: '/settings/suites' }, { label: 'Performance reviews' }]}
        title="Performance reviews"
        subtitle={`${every ? `A review ${every}. ` : ''}It is built from what each person did and proved in their check-ins, with their own view beside it. There are no scores.`}
      />

      <Panel>
        <p className="gwui-panel-text"><b>How a review is built</b></p>
        <p className="gwui-panel-text">From proof in each person’s check-ins, their own view of their work, and their manager’s view. A person decides, not Groundwork.</p>
      </Panel>

      {isLoading && <Note>Loading…</Note>}
      {isError && (
        refused?.status === 403 || refused?.status === 404 ? (
          <Note tone="error">{refused.data?.message ?? 'Only an admin or a lead can open this board.'}</Note>
        ) : (
          <div>
            <Note tone="error">The board did not load.</Note>
            <Button kind="secondary" size="small" onClick={() => refetch()} disabled={isFetching}>Try again</Button>
          </div>
        )
      )}

      {data && data.next.length === 0 && (
        <Section heading="The next reviews">
          <Empty>No reviews are due yet.</Empty>
        </Section>
      )}
      {months.map(m => (
        <Section key={m} heading="The next reviews" note={monthOf(`${m}-01`)}>
          <Panel>
            <table className="gwui-record-table">
              <thead>
                <tr>
                  <th scope="col">Person</th>
                  <th scope="col">Written with</th>
                  <th scope="col">Where it stands</th>
                  <th scope="col"><span className="gwui-sr-only">What you can do</span></th>
                </tr>
              </thead>
              <tbody>
                {data!.next.filter(n => n.dueOn.startsWith(m)).map(n => <AReviewRow key={n.dueId} n={n} />)}
              </tbody>
            </table>
          </Panel>
        </Section>
      ))}
    </Page>
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
      <td>{stands}{problem && <span role="alert"> {problem}</span>}</td>
      <td>
        {n.reviewId
          ? <Link className="gwui-plain-link" to={`/suite/reviews/${n.reviewId}`} aria-label={`Open ${n.name}’s review`}>Open it</Link>
          : n.mayStart && <Button kind="secondary" size="small" onClick={() => start.mutate()} disabled={start.isPending} aria-label={`Start ${n.name}’s review`}>Start it</Button>}
      </td>
    </tr>
  )
}
