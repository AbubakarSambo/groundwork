import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { reviewsApi, type NextReview, type YourReview, type AppealToDecide, type AppealWaitingForAnotherAdmin } from '@/api/suites'
import { useAuthStore } from '@/stores/auth'
import { useSuitesOnForYou } from '@/hooks/useSuitesOnForYou'
import { whenItWas } from '@/lib/a-date-reads-the-same-everywhere'
import { Page, PageTitle, Section, Panel, Button, Note, Empty, Tag, RowList, Row } from '@/components/gw/ui'
import { maySeeSuites, SuiteOffMessage } from '@/lib/suite-is-off'

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
 * WHERE IT STANDS IS THE SERVER'S SENTENCE (`standsSays`: "Ready to start. 6 months of check-ins to
 * draw on.", "After “Kwame, first 90 days” is decided."), never the screen's own word. A review that
 * cannot start yet ('not-yet') has a "Not yet" tag where "Start it" would be. A review Groundwork
 * proposed says why (`proposal`). The reviews about the reader themselves (`GET /suites/reviews/mine`)
 * are listed under "Your reviews", for a person who cannot open the board as much as for one who can.
 *
 * NOT DRAWN HERE: "What Aisha’s review will show", which the server does not send.
 *
 * WORDING NO SCREEN SHOWS (item 28): "Your reviews", "Your review, March", "Open it", "No reviews are
 * due yet." and "The board did not load."
 */
const DID_NOT_GO = 'That did not go through, and nothing has changed. Try again.'
const at = (day: string) => new Date(`${day}T00:00:00.000Z`)
const monthOf = (day: string) => `${whenItWas(at(day), 'month', 'UTC')} ${day.slice(0, 4)}`
/**
 * "IT" HAD NOTHING BEFORE IT (group 2's review, fault E): while the suite was off, or before the
 * organisation's own answer had loaded, the subtitle read "It is built from..." alone - "it" naming
 * nothing. That was first fixed by filling in a made-up default ("every 6 months") whenever the
 * organisation had not set its own. But Msingi Foods has not set how often, and that made-up
 * default is not true of it - Imani Hassan read "A review happens every 6 months." as if it were
 * the organisation's own answer (engine workspace, 9 October night, test bed copy a).
 *
 * So now: when the organisation has set `every`, its own sentence opens the subtitle, by name, as
 * before. When it has not (or the answer has not loaded yet), that first sentence is left out
 * entirely, and the rest reads as its own sentence, starting with "A review" rather than the
 * dangling "It" the original fault was about.
 */
/** Exported for B-140: the suites switchboard (`SuitesPage.tsx`) uses the same rule for the
    reviews suite's own card, so it never shows a made-up cadence either. */
export const everySays = (raw: string | null | undefined) => {
  const every = raw?.replace(/^Every /, 'every ').trim()
  return every || null
}

export function ReviewsBoardPage() {
  const user = useAuthStore(s => s.user)
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['suite-reviews'],
    queryFn: reviewsApi.board,
    enabled: !!user,
    retry: false,
  })
  const refused = (error as { response?: { status?: number; data?: { message?: string } } } | null)?.response
  /* The reviews about the reader themselves, whoever they are, once somebody has started them. */
  const suitesOn = useSuitesOnForYou()
  const mine = useQuery({ queryKey: ['suite-reviews-mine'], queryFn: reviewsApi.mine, enabled: !!user && suitesOn.reviews, retry: false })
  const yours = mine.data ?? []
  const months = [...new Set((data?.next ?? []).map(n => n.dueOn.slice(0, 7)))]
  /*
   * AN ADMIN'S OWN APPEALS (decision 113, engine workspace, 9 October: "the review appeal is
   * drawn" - "Not drawn yet: the admin's list of appeals ... on Today and the reviews board").
   * `GET /suites/reviews/appeals` is admin only, so this is never asked for anybody else.
   */
  const appeals = useQuery({
    queryKey: ['suite-review-appeals'],
    queryFn: reviewsApi.appealsToDecide,
    enabled: !!user && user.role === 'ADMIN',
    retry: false,
  })
  const appealRows = appeals.data?.appeals ?? []
  const waitingForAnotherAdmin = appeals.data?.waitingForAnotherAdmin ?? []

  return (
    <Page>
      <PageTitle
        crumbs={[{ label: 'Suites', to: maySeeSuites(user?.role) ? '/settings/suites' : undefined }, { label: 'Performance reviews' }]}
        title="Performance reviews"
        subtitle={everySays(data?.every)
          ? `A review happens ${everySays(data?.every)}. It is built from what each person did and proved in their check-ins, with their own view beside it. There are no scores.`
          : 'A review is built from what each person did and proved in their check-ins, with their own view beside it. There are no scores.'}
      />

      <Panel>
        <p className="gwui-panel-text"><b>How a review is built</b></p>
        <p className="gwui-panel-text">From proof in each person’s check-ins, their own view of their work, and their manager’s view. A person decides, not Groundwork.</p>
      </Panel>

      {isLoading && <Note>Loading…</Note>}
      {yours.length > 0 && (
        <Section heading="Your reviews">
          <RowList label="Your reviews">
            {yours.map(y => <YourOwn key={y.id} y={y} />)}
          </RowList>
        </Section>
      )}
      {(appealRows.length > 0 || waitingForAnotherAdmin.length > 0) && (
        <Section heading="Appeals waiting for you">
          <RowList label="Appeals waiting for you">
            {appealRows.map(a => <AnAppealRow key={a.id} a={a} />)}
            {waitingForAnotherAdmin.map(a => <AnAppealWaitingRow key={a.id} a={a} />)}
          </RowList>
        </Section>
      )}
      {isError && !(yours.length > 0 && (refused?.status === 403 || refused?.status === 404)) && (
        refused?.status === 403 || refused?.status === 404 ? (
          <Note tone="error"><SuiteOffMessage message={refused.data?.message ?? 'Only an admin or a lead can open this board.'} role={user?.role} /></Note>
        ) : (
          <div>
            <Note tone="error">The board did not load.</Note>
            <Button kind="secondary" size="small" onClick={() => refetch()} disabled={isFetching}>Try again</Button>
          </div>
        )
      )}

      {data && (data.next ?? []).length === 0 && (
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
  return (
    <tr>
      <th scope="row"><span className="gwui-record-table-label" aria-hidden="true">Person</span>{n.name}</th>
      <td>
        {(n.writtenWithSays ?? n.writtenWith) && <span className="gwui-record-table-label" aria-hidden="true">Written with</span>}
        {n.writtenWithSays ?? n.writtenWith ?? ''}
      </td>
      <td>
        {n.standsSays}
        {n.proposal && <p className="gwui-panel-text-muted">{n.proposal}</p>}
        {problem && <span role="alert"> {problem}</span>}
      </td>
      <td>
        {n.reviewId
          ? <Link className="gwui-plain-link" to={`/suite/reviews/${n.reviewId}`} aria-label={`Open ${n.name}’s review`}>Open it</Link>
          : n.stands === 'not-yet'
            ? <Tag>Not yet</Tag>
            : n.mayStart && <Button kind="secondary" size="small" onClick={() => start.mutate()} disabled={start.isPending} aria-label={`Start ${n.name}’s review`}>Start it</Button>}
      </td>
    </tr>
  )
}

/**
 * ONE ROW PER APPEAL AN ADMIN MAY DECIDE. The heading and sentence here are plain ones, not the
 * prototype's own words (it has none for this yet) - the engine workspace's own note says so, and
 * to change them once the prototype does. Every fact in the sentence (who, by when, who reviewed
 * them) is the server's.
 */
function AnAppealRow({ a }: { a: AppealToDecide }) {
  const month = whenItWas(at(a.dueOn), 'month', 'UTC')
  const by = a.reviewerFirstName ? ` ${a.reviewerFirstName} decided it on ${a.appealedOn}.` : ` It was decided on ${a.appealedOn}.`
  return (
    <Row columns="minmax(0, 1fr) auto">
      <div>
        <b>{`${a.firstName}’s review, ${month}`}</b>
        <p className="gwui-panel-text">{`${a.name} has appealed the decision.${by}`}</p>
      </div>
      <Link className="gwui-plain-link" to={`/suite/reviews/${a.id}`} aria-label={`Open ${a.name}’s appeal`}>Open it</Link>
    </Row>
  )
}

/** An appeal the reader decided the review of, now waiting on a second admin who is not them. */
function AnAppealWaitingRow({ a }: { a: AppealWaitingForAnotherAdmin }) {
  const month = whenItWas(at(a.dueOn), 'month', 'UTC')
  return (
    <Row columns="minmax(0, 1fr) auto">
      <div>
        <b>{`${a.firstName}’s review, ${month}`}</b>
        <p className="gwui-panel-text">{a.says}</p>
      </div>
      <Link className="gwui-plain-link" to={`/suite/reviews/${a.id}`} aria-label={`Open ${a.name}’s appeal`}>Open it</Link>
    </Row>
  )
}

function YourOwn({ y }: { y: YourReview }) {
  const month = whenItWas(at(y.dueOn), 'month', 'UTC')
  return (
    <Row columns="minmax(0, 1fr) auto">
      <div>
        <b>{`Your review, ${month}`}</b>
        <p className="gwui-panel-text">{y.says}</p>
      </div>
      <Link className="gwui-plain-link" to={`/suite/reviews/${y.id}`} aria-label={`Open your review, ${month}`}>Open it</Link>
    </Row>
  )
}
