import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { leaveBoardApi, type LeaveWaiting } from '@/api/suites'
import { useAuthStore } from '@/stores/auth'
import { Page, PageTitle, Section, Button, Note, Empty, RowList, Row, Tag, ExampleExchange } from '@/components/gw/ui'
import { theDaysInFull, theDaysShort } from './the-days-someone-is-off'
import { AskAQuestion } from './AskAQuestion'
import { maySeeSuites, SuiteOffMessage } from '@/lib/suite-is-off'

/**
 * THE LEAVE BOARD (E2, #/suite/leave, group 2 piece 4). The wording is copied from
 * docs/prototype/screens/E-suites/suite-leave.txt.
 *
 * WHAT EACH READER IS GIVEN IS THE SERVER'S (GET /suites/leave/board): an admin reads everything, a
 * lead only their own team's, and only while the suite is on. Approve and Decline are offered only
 * on a request the server says this reader approves, and the server checks again.
 *
 * REBUILT FROM THE SHARED PARTS: `Page`/`PageTitle` (its own `crumbs` and `subtitle`), `Section` for
 * "Waiting for approval" and "Who's off" (the latter's "The next two weeks" is `Section`'s own
 * `note`), `RowList`/`Row` for both lists, `Button` for Approve/Decline, and `Note`/`Empty` for the
 * loading, error and empty states. No new parts were needed.
 *
 * UNDER EACH REQUEST IS THE SERVER'S, NOT THE SCREEN'S (4 October review, L2 and L4): `where` ("Wairimu
 * has approved it, and it is now waiting for you."), the kind of leave, and `said`, the request as this
 * reader reads it, which already holds the days left, who else is off, the stand-in, what the person
 * owns in those days (decision 85.1), the rules that apply, and each question with its answer. Whoever
 * decides it can also ask a question. Whoever holds HR reads "Leave you are told about" (`toldToHr`).
 * "How people ask" says where requests are made (requests 21 and 26 are done), without the prototype's
 * example chat, which is sample data with made-up days and names.
 *
 * WORDING NO SCREEN SHOWS (item 28): "Nothing is waiting for approval.", "Nobody is off in the next
 * two weeks.", "... stands in.", "The board did not load.", and the days left on every request.
 */
const DID_NOT_GO = 'That did not go through, and nothing has changed. Try again.'

export function LeaveBoardPage() {
  const user = useAuthStore(s => s.user)
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['suite-leave'],
    queryFn: leaveBoardApi.get,
    enabled: !!user,
    retry: false,
  })
  const refused = (error as { response?: { status?: number; data?: { message?: string } } } | null)?.response

  return (
    <Page>
      <PageTitle
        crumbs={[{ label: 'Suites', to: maySeeSuites(user?.role) ? '/settings/suites' : undefined }, { label: 'Leave requests' }]}
        title="Leave requests"
        subtitle="People ask for time off in their check-in or chat. Groundwork checks their balance and who else is off, and sends it to the right approver."
      />

      {isLoading && <Note>Loading…</Note>}
      {isError && (
        refused?.status === 403 || refused?.status === 404 ? (
          <Note tone="error"><SuiteOffMessage message={refused.data?.message ?? 'Only an admin or a lead can open this board.'} role={user?.role} /></Note>
        ) : (
          <div>
            <Note tone="error">The board did not load.</Note>
            <Button kind="secondary" size="small" onClick={() => refetch()} disabled={isFetching}>Try again</Button>
          </div>
        )
      )}

      {data && (
        <>
          <Section heading="Waiting for approval">
            {data.waiting.length === 0
              ? <Empty>Nothing is waiting for approval.</Empty>
              : (
                <RowList label="Waiting for approval">
                  {data.waiting.map(w => <ARequest key={w.id} w={w} />)}
                </RowList>
              )}
          </Section>

          <Section heading="Who’s off" note="The next two weeks">
            {data.off.length === 0
              ? <Empty>Nobody is off in the next two weeks.</Empty>
              : (
                <RowList label="Who’s off">
                  {data.off.map(o => (
                    <Row key={o.id} columns="minmax(0, 1fr) auto auto">
                      <b>{o.name}</b>
                      <span>{theDaysShort(o.startsOn, o.endsOn)}</span>
                      <span>{o.kindName ?? 'Annual leave'}</span>
                    </Row>
                  ))}
                </RowList>
              )}
          </Section>

          <Section heading="How people ask">
            <ExampleExchange
              label="An example: someone asks Groundwork for leave in chat, and is told how many days they have left and who else is off, before it is sent to the right approver."
              lines={[
                { mine: true, text: 'I need next Thursday and Friday off.' },
                { mine: false, text: 'You have 16 days left and nobody else in your team is off then. Shall I send it to your manager?' },
              ]}
            />
            <p className="gwui-panel-text">In their check-in, in chat, or on WhatsApp. Nobody fills in a form.</p>
          </Section>

          {(data.toldToHr ?? []).length > 0 && (
            <Section heading="Leave you are told about" note="Because you look after HR.">
              <RowList label="Leave you are told about">
                {data.toldToHr!.map(t => (
                  <Row key={t.id} columns="minmax(0, 1fr)">
                    <div>
                      <b>{`${t.name}: ${theDaysInFull(t.startsOn, t.endsOn)}`}</b>
                      {/* said[0] is the "<name> asked for leave from ... which is N working days."
                          sentence - the same dates the title above already gives, in another shape
                          (fault 5 of the live walk: shown once, not twice). */}
                      {t.said.slice(1).map((line, i) => <p key={i} className="gwui-panel-text">{line}</p>)}
                    </div>
                  </Row>
                ))}
              </RowList>
            </Section>
          )}
        </>
      )}
    </Page>
  )
}

function ARequest({ w }: { w: LeaveWaiting }) {
  const qc = useQueryClient()
  const [problem, setProblem] = useState<string | null>(null)
  const decide = useMutation({
    mutationFn: (outcome: 'approve' | 'decline') => leaveBoardApi.decide(w.id, outcome),
    onSuccess: (board) => { setProblem(null); qc.setQueryData(['suite-leave'], board) },
    onError: (e: any) => setProblem(e?.response?.data?.message || DID_NOT_GO),
  })
  /* Everything under the title is the server's own sentences: where the request stands, then the request as this
     reader reads it (the days left, who else is off, the stand-in, what the person owns, the rules, the questions).
     said[0] is dropped: it is the "<name> asked for leave from ... which is N working days." sentence, the same
     dates the title above already gives, in another shape (fault 5 of the live walk: shown once, not twice). */
  return (
    <Row columns="minmax(0, 1fr) auto">
      <div>
        <b>{`${w.name}: ${theDaysInFull(w.startsOn, w.endsOn)}`}</b>
        {w.leaveKind && <Tag>{w.leaveKind}</Tag>}
        <p className="gwui-panel-text">{w.where}</p>
        {w.said.slice(1).map((line, i) => <p key={i} className="gwui-panel-text">{line}</p>)}
        {w.mayDecide && (
          <AskAQuestion id={w.id} who={w.name} send={async q => qc.setQueryData(['suite-leave'], await leaveBoardApi.ask(w.id, q))} />
        )}
        {problem && <Note tone="error">{problem}</Note>}
      </div>
      {w.mayDecide && (
        <div className="gwui-edge-acts">
          <Button kind="secondary" size="small" onClick={() => decide.mutate('approve')} disabled={decide.isPending}
            aria-label={`Approve ${w.name}’s request`}>Approve</Button>
          <Button kind="quiet" size="small" onClick={() => decide.mutate('decline')} disabled={decide.isPending}
            aria-label={`Decline ${w.name}’s request`}>Decline</Button>
        </div>
      )}
    </Row>
  )
}
