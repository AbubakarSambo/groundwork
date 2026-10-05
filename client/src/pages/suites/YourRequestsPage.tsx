import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { yourRequestsApi, type YourRequest } from '@/api/suites'
import { useAuthStore } from '@/stores/auth'
import { Page, PageTitle, Section, Button, Note, Empty, RowList, Row, Tag, FieldLabel, TextArea } from '@/components/gw/ui'
import { maySeeSuites, SuiteOffMessage } from '@/lib/suite-is-off'

/**
 * YOUR OWN REQUESTS (#/suite/mine). The person's own leave and requests to spend, where each one
 * stands, the question the person who decides it asked, a place to answer it, and what was said when
 * it was declined. There is no prototype screen for it (the prototype draws the boards for the people
 * who decide), so it is built from the shared parts and every sentence is the server's:
 * GET /suites/leave/mine and GET /suites/spend/mine. Nobody else's request is on it.
 *
 * WORDING THE SERVER DOES NOT SEND: the title and its one line; "Your leave"; "Your requests to spend";
 * "Waiting", "Approved", "Declined"; "Your answer"; "Send your answer"; and the empty and failed states.
 */
const DID_NOT_GO = 'That did not go through, and nothing has changed. Try again.'
const TAGS = { waiting: 'Waiting', approved: 'Approved', declined: 'Declined' } as const

const refusalOf = (error: unknown): { status?: number; message?: string } | undefined =>
  (error as { response?: { status?: number; data?: { message?: string } } } | null)?.response
    ? { status: (error as any).response.status, message: (error as any).response.data?.message }
    : undefined

export function YourRequestsPage() {
  const user = useAuthStore(s => s.user)
  const leave = useQuery({ queryKey: ['your-leave'], queryFn: yourRequestsApi.leave, enabled: !!user, retry: false })
  const spending = useQuery({ queryKey: ['your-spending'], queryFn: yourRequestsApi.spending, enabled: !!user, retry: false })

  return (
    <Page>
      <PageTitle
        crumbs={[{ label: 'Suites', to: maySeeSuites(user?.role) ? '/settings/suites' : undefined }, { label: 'Your requests' }]}
        title="Your requests"
        subtitle="Your leave and your requests to spend, and where each one stands."
      />

      <Section heading="Your leave">
        <Loaded q={leave} off="Leave is not switched on in your organisation." role={user?.role}>
          {data => (
            <>
              <p className="gwui-panel-text">{data.daysLeftSaid}</p>
              <Requests rows={data.requests} none="You have not asked for any leave." answer={yourRequestsApi.answerLeave} queryKey={['your-leave']} />
            </>
          )}
        </Loaded>
      </Section>

      <Section heading="Your requests to spend">
        <Loaded q={spending} off="Spending requests are not switched on in your organisation." role={user?.role}>
          {data => <Requests rows={data.requests} none="You have not asked to spend anything." answer={yourRequestsApi.answerSpending} queryKey={['your-spending']} />}
        </Loaded>
      </Section>
    </Page>
  )
}

function Loaded<T>({ q, off, role, children }: { q: { data?: T; isLoading: boolean; isError: boolean; error: unknown; refetch: () => unknown; isFetching: boolean }; off: string; role?: string; children: (data: T) => React.ReactNode }) {
  if (q.isLoading) return <Note>Loading…</Note>
  if (q.isError) {
    const refused = refusalOf(q.error)
    if (refused?.status === 403 || refused?.status === 404) return <Empty><SuiteOffMessage message={refused.message ?? off} role={role} /></Empty>
    return (
      <div>
        <Note tone="error">Your requests did not load.</Note>
        <Button kind="secondary" size="small" onClick={() => q.refetch()} disabled={q.isFetching}>Try again</Button>
      </div>
    )
  }
  return q.data ? <>{children(q.data)}</> : null
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
