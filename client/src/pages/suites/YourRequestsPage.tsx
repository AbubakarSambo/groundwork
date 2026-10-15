import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { yourRequestsApi, reviewsApi, type YourRequest, type YourHours, type YourReview } from '@/api/suites'
import { useAuthStore } from '@/stores/auth'
import { useSuitesOnForYou } from '@/hooks/useSuitesOnForYou'
import { Page, PageTitle, Section, Button, Note, Callout, Empty, RowList, Row, Tag, FieldLabel, TextArea } from '@/components/gw/ui'
import { maySwitchSuitesOn, SuiteOffMessage } from '@/lib/suite-is-off'
import { whenItWas } from '@/lib/a-date-reads-the-same-everywhere'

/**
 * A MEMBER'S OWN SUITES PAGE (#/suite/mine; Hafsah's design for B-123). Every switched-on suite's
 * own part of it for this one person - their leave balance and leave requests, their expenses and
 * money requests, their timesheets, their reviews - each with its status and, where a form exists,
 * a clear button to make a new request. There is no prototype screen for it (the prototype draws
 * the boards for the people who decide, never a member's own view across suites), so it is built
 * from the shared parts and every fact in it is the server's own: GET /suites/leave/mine,
 * /suites/spend/mine, /suites/time/mine and /suites/reviews/mine. Nobody else's request, hours or
 * review is on it.
 *
 * RETITLED FROM "Your requests" (B-123): this is the member's own "Suites" page - the same name,
 * and the same `/suite/mine` address, a lead or an admin's own "Suites" nav item already carries by
 * role (`nav-items.tsx`'s `memberSuiteOnly` gate puts the same label in a member's own rail, once a
 * suite of theirs is actually on). It no longer sits under a "Suites" crumb the server refuses a
 * member to open (`/settings/suites`) - it IS the member's own Suites page, not a page below it.
 *
 * WORDING THE SERVER DOES NOT SEND: the title and its subtitle; "Your leave"; "Your requests to
 * spend"; "Your hours"; "Your reviews"; "Waiting", "Approved", "Declined"; "Your answer"; "Send your
 * answer"; "Open it"; and the empty and failed states.
 *
 * "YOUR HOURS" (fault 1 of the live walk, 6 October): after confirming hours in chat a person is told
 * "...you will see it under your hours.", but nothing here showed them - GET /suites/time/mine was
 * never read. Added as a third section, quiet in the same way as the other two when the time sheets
 * suite is off or this person keeps none. Every sentence in it is the server's own.
 *
 * "YOUR REVIEWS" (B-123, Hafsah's design): `GET /suites/reviews/mine` never checks whether the
 * reviews suite is on or off - it answers whatever reviews already exist for this person
 * (`SuitesService.mine`, the-reviews.service.ts) - so this section is shown whenever that list is
 * not empty, the same way `ReviewsBoardPage.tsx`'s own "Your reviews" section already reads it.
 * There is no new-request button here: a review is started by whoever writes it with the person
 * (an admin or a lead), never asked for by the person it is about.
 */
const DID_NOT_GO = 'That did not go through, and nothing has changed. Try again.'
const TAGS = { waiting: 'Waiting', approved: 'Approved', declined: 'Declined' } as const
const at = (day: string) => new Date(`${day}T00:00:00.000Z`)

const refusalOf = (error: unknown): { status?: number; message?: string } | undefined =>
  (error as { response?: { status?: number; data?: { message?: string } } } | null)?.response
    ? { status: (error as any).response.status, message: (error as any).response.data?.message }
    : undefined

export function YourRequestsPage() {
  const user = useAuthStore(s => s.user)
  const location = useLocation()
  /* REQUEST 165 (Hafsah, 6 October): a request just filed from its own form (LeaveRequestNewPage
     or SpendRequestNewPage) lands here and says so, in the server's own sentence where it sends
     one. Read once from router state, not kept on a reload - the confirmation belongs to the
     moment of arriving here, not to the page itself. */
  const sentMessage = (location.state as { sentMessage?: string } | null)?.sentMessage
  /* Journey walk row 5: a suite's own route is asked only once GET /suites/mine says that suite is on.
     A suite that is off is said in the server's own sentence, without asking its route for a 404. */
  const suitesOn = useSuitesOnForYou()
  const leave = useQuery({ queryKey: ['your-leave'], queryFn: yourRequestsApi.leave, enabled: !!user && suitesOn.leave, retry: false })
  const spending = useQuery({ queryKey: ['your-spending'], queryFn: yourRequestsApi.spending, enabled: !!user && suitesOn.spending, retry: false })
  const hours = useQuery({ queryKey: ['your-hours'], queryFn: yourRequestsApi.hours, enabled: !!user && suitesOn.hours, retry: false })
  const reviews = useQuery({ queryKey: ['your-reviews'], queryFn: reviewsApi.mineQuietly, enabled: !!user && suitesOn.reviews, retry: false })

  return (
    <Page>
      <PageTitle
        title="Suites"
        subtitle="Your own part of each suite your organisation has switched on."
      />

      {sentMessage && <Callout tone="success" role="status">{sentMessage}</Callout>}

      <SuiteSection heading="Your leave" q={leave} isOff={suitesOn.known && !suitesOn.leave} off="The leave suite is not switched on. An admin switches it on under Suites." role={user?.role}
        action={<Button kind="secondary" size="small" to="/suite/leave/new">Request leave</Button>}>
        {data => (
          <>
            <p className="gwui-panel-text">{data.daysLeftSaid}</p>
            <Requests rows={data.requests} none="You have not asked for any leave." answer={yourRequestsApi.answerLeave} queryKey={['your-leave']} />
          </>
        )}
      </SuiteSection>

      <SuiteSection heading="Your requests to spend" q={spending} isOff={suitesOn.known && !suitesOn.spending} off="The spending suite is not switched on. An admin switches it on under Suites." role={user?.role}
        action={<Button kind="secondary" size="small" to="/suite/spend/new">Ask to spend money</Button>}>
        {data => <Requests rows={data.requests} none="You have not asked to spend anything." answer={yourRequestsApi.answerSpending} queryKey={['your-spending']} />}
      </SuiteSection>

      <SuiteSection heading="Your hours" q={hours} isOff={suitesOn.known && !suitesOn.hours} off="The time sheets suite is not switched on. An admin switches it on under Suites." role={user?.role}>
        {data => <YourHoursSection data={data} />}
      </SuiteSection>

      {/* "YOUR REVIEWS" never refuses with a 403/404 the way the other three sections can (reviews/
          mine answers whatever already exists, suite on or off), so it is drawn directly from the
          query rather than through `SuiteSection` - empty, not off, is the only "nothing here"
          state it has. */}
      {reviews.isSuccess && reviews.data.length > 0 && (
        <Section heading="Your reviews">
          <RowList label="Your reviews">
            {reviews.data.map(y => <YourOwnReview key={y.id} y={y} />)}
          </RowList>
        </Section>
      )}
    </Page>
  )
}

function YourOwnReview({ y }: { y: YourReview }) {
  const month = whenItWas(at(y.dueOn), 'month', 'UTC')
  return (
    <Row columns="minmax(0, 1fr) auto">
      <div>
        <b>{`Your review, ${month}`}</b>
        <p className="gwui-panel-text">{y.says}</p>
        {y.appealSays && <p className="gwui-panel-text">{y.appealSays}</p>}
      </div>
      <Link className="gwui-plain-link" to={`/suite/reviews/${y.id}`} aria-label={`Open your review, ${month}`}>Open it</Link>
    </Row>
  )
}

function YourHoursSection({ data }: { data: YourHours }) {
  if (data.weeks.length === 0) return <Empty>You have not given any hours yet.</Empty>
  return (
    <>
      {data.standing && <p className="gwui-panel-text">{data.standing}</p>}
      <RowList label="Your hours">
        {data.weeks.map(w => (
          <Row key={w.weekOf} columns="minmax(0, 1fr)">
            <p className="gwui-panel-text">{w.where}</p>
          </Row>
        ))}
      </RowList>
    </>
  )
}

/**
 * A SUITE'S WHOLE SECTION, LEFT OUT FOR A MEMBER WHEN IT IS OFF (screen fault 8, final walk).
 *
 * "The time sheets suite is not switched on. An admin switches it on under Suites." used to show to
 * anybody - a member included, who cannot switch anything on and has no reason to be told to go and
 * look at a settings page refused to them. Only whoever can actually act on it (an admin -
 * `maySwitchSuitesOn`) still reads the sentence; for everybody else the section - heading included -
 * is left out entirely, the same way a suite nobody has switched on leaves no trace elsewhere on the
 * product.
 */
function SuiteSection<T>({ heading, q, isOff, off, role, action, children }: {
  heading: string
  /** GET /suites/mine said this suite is off, so its own route was never asked. */
  isOff?: boolean
  q: { data?: T; isLoading: boolean; isError: boolean; error: unknown; refetch: () => unknown; isFetching: boolean }
  off: string
  role?: string
  /** A button beside the heading, for example "Request leave" - shown only once the suite is
   *  actually on for this person (request 185: a dead end with no button and no word on how to
   *  ask, B-123). Never shown while the suite is off or failed to load. */
  action?: React.ReactNode
  children: (data: T) => React.ReactNode
}) {
  if (isOff) {
    if (!maySwitchSuitesOn(role)) return null
    return <Section heading={heading}><Empty><SuiteOffMessage message={off} role={role} /></Empty></Section>
  }
  if (q.isLoading) return <Section heading={heading}><Note>Loading…</Note></Section>
  if (q.isError) {
    const refused = refusalOf(q.error)
    if (refused?.status === 403 || refused?.status === 404) {
      if (!maySwitchSuitesOn(role)) return null
      return <Section heading={heading}><Empty><SuiteOffMessage message={refused.message ?? off} role={role} /></Empty></Section>
    }
    return (
      <Section heading={heading}>
        <div>
          <Note tone="error">Your requests did not load.</Note>
          <Button kind="secondary" size="small" onClick={() => q.refetch()} disabled={q.isFetching}>Try again</Button>
        </div>
      </Section>
    )
  }
  return q.data ? <Section heading={heading} action={action}>{children(q.data)}</Section> : null
}

function Requests<L extends { requests: YourRequest[] }>({ rows, none, answer, queryKey }: {
  rows: YourRequest[]; none: string; answer: (id: string, text: string) => Promise<L>; queryKey: string[]
}) {
  if (rows.length === 0) return <Empty>{none}</Empty>
  return (
    <RowList label="Your requests">
      {rows.map(r => <ARequest key={r.id} r={r} answer={answer} queryKey={queryKey} />)}
    </RowList>
  )
}

function ARequest<L>({ r, answer, queryKey }: { r: YourRequest; answer: (id: string, text: string) => Promise<L>; queryKey: string[] }) {
  const qc = useQueryClient()
  const [text, setText] = useState('')
  const [problem, setProblem] = useState<string | null>(null)
  const send = useMutation({
    mutationFn: () => answer(r.id, text.trim()),
    onSuccess: (served) => { setProblem(null); setText(''); qc.setQueryData(queryKey, served) },
    onError: (e: any) => setProblem(e?.response?.data?.message || DID_NOT_GO),
  })
  const fieldId = `answer-${r.id}`
  /* Everything in the row is the server's own sentences, in the order it serves them. */
  return (
    <Row columns="minmax(0, 1fr) auto">
      <div>
        <p className="gwui-panel-text">{r.where}</p>
        {r.questions.map((line, i) => <p key={i} className="gwui-panel-text">{line}</p>)}
        {r.declinedBecause && <p className="gwui-panel-text">{r.declinedBecause}</p>}
        {r.questionWaiting && (
          <form className="gwui-suite-ask" onSubmit={e => { e.preventDefault(); if (text.trim()) send.mutate() }}>
            <div className="gwui-suite-q">
              <FieldLabel htmlFor={fieldId}>Your answer</FieldLabel>
              <TextArea id={fieldId} rows={3} value={text} onChange={e => setText(e.target.value)} maxLength={1000} />
            </div>
            <div className="gwui-edge-acts">
              <Button kind="secondary" size="small" type="submit" disabled={!text.trim() || send.isPending}>Send your answer</Button>
            </div>
          </form>
        )}
        {problem && <Note tone="error">{problem}</Note>}
      </div>
      <Tag tone={r.status === 'declined' ? 'concern' : r.status === 'approved' ? 'proven' : 'attention'}>{TAGS[r.status]}</Tag>
    </Row>
  )
}
