import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { yourRequestsApi, type YourRequest, type YourHours } from '@/api/suites'
import { useAuthStore } from '@/stores/auth'
import { Page, PageTitle, Section, Button, Note, Callout, Empty, RowList, Row, Tag, FieldLabel, TextArea } from '@/components/gw/ui'
import { maySeeSuites, maySwitchSuitesOn, SuiteOffMessage } from '@/lib/suite-is-off'

/**
 * YOUR OWN REQUESTS (#/suite/mine). The person's own leave and requests to spend, where each one
 * stands, the question the person who decides it asked, a place to answer it, and what was said when
 * it was declined. There is no prototype screen for it (the prototype draws the boards for the people
 * who decide), so it is built from the shared parts and every sentence is the server's:
 * GET /suites/leave/mine and GET /suites/spend/mine. Nobody else's request is on it.
 *
 * WORDING THE SERVER DOES NOT SEND: the title and its one line; "Your leave"; "Your requests to spend";
 * "Waiting", "Approved", "Declined"; "Your answer"; "Send your answer"; and the empty and failed states.
 *
 * "YOUR HOURS" (fault 1 of the live walk, 6 October): after confirming hours in chat a person is told
 * "...you will see it under your hours.", but nothing here showed them - GET /suites/time/mine was
 * never read. Added as a third section, quiet in the same way as the other two when the time sheets
 * suite is off or this person keeps none. Every sentence in it is the server's own.
 */
const DID_NOT_GO = 'That did not go through, and nothing has changed. Try again.'
const TAGS = { waiting: 'Waiting', approved: 'Approved', declined: 'Declined' } as const

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
  const leave = useQuery({ queryKey: ['your-leave'], queryFn: yourRequestsApi.leave, enabled: !!user, retry: false })
  const spending = useQuery({ queryKey: ['your-spending'], queryFn: yourRequestsApi.spending, enabled: !!user, retry: false })
  const hours = useQuery({ queryKey: ['your-hours'], queryFn: yourRequestsApi.hours, enabled: !!user, retry: false })

  return (
    <Page>
      <PageTitle
        crumbs={[{ label: 'Suites', to: maySeeSuites(user?.role) ? '/settings/suites' : undefined }, { label: 'Your requests' }]}
        title="Your requests"
        subtitle="Your leave and your requests to spend, and where each one stands."
      />

      {sentMessage && <Callout tone="success" role="status">{sentMessage}</Callout>}

      <SuiteSection heading="Your leave" q={leave} off="Leave is not switched on in your organisation." role={user?.role}
        action={<Button kind="secondary" size="small" to="/suite/leave/new">Request leave</Button>}>
        {data => (
          <>
            <p className="gwui-panel-text">{data.daysLeftSaid}</p>
            <Requests rows={data.requests} none="You have not asked for any leave." answer={yourRequestsApi.answerLeave} queryKey={['your-leave']} />
          </>
        )}
      </SuiteSection>

      <SuiteSection heading="Your requests to spend" q={spending} off="Spending requests are not switched on in your organisation." role={user?.role}
        action={<Button kind="secondary" size="small" to="/suite/spend/new">Ask to spend money</Button>}>
        {data => <Requests rows={data.requests} none="You have not asked to spend anything." answer={yourRequestsApi.answerSpending} queryKey={['your-spending']} />}
      </SuiteSection>

      <SuiteSection heading="Your hours" q={hours} off="Time sheets are not switched on in your organisation." role={user?.role}>
        {data => <YourHoursSection data={data} />}
      </SuiteSection>
    </Page>
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
function SuiteSection<T>({ heading, q, off, role, action, children }: {
  heading: string
  q: { data?: T; isLoading: boolean; isError: boolean; error: unknown; refetch: () => unknown; isFetching: boolean }
  off: string
  role?: string
  /** A button beside the heading, for example "Request leave" - shown only once the suite is
   *  actually on for this person (request 185: a dead end with no button and no word on how to
   *  ask, B-123). Never shown while the suite is off or failed to load. */
  action?: React.ReactNode
  children: (data: T) => React.ReactNode
}) {
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
