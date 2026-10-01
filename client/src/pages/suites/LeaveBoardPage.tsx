import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { leaveBoardApi, type LeaveWaiting } from '@/api/suites'
import { useAuthStore } from '@/stores/auth'
import { Page, PageTitle, Section, Button, Note, Empty, RowList, Row } from '@/components/gw/ui'
import { theDaysInFull, theDaysShort, whatToKnow } from './the-days-someone-is-off'

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
 * NOT DRAWN HERE, ON PURPOSE (docs/morning-report-ui.md, item 28):
 *   - "How people ask", with its example chat and "In their check-in, in chat, or on WhatsApp. Nobody
 *     fills in a form.": nobody can ask by talking to Groundwork until the engine takes requests
 *     (request 21), and the example is sample data.
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
        crumbs={[{ label: 'Suites', to: '/settings/suites' }, { label: 'Leave requests' }]}
        title="Leave requests"
        subtitle="People ask for time off in their check-in or chat. Groundwork checks their balance and who else is off, and sends it to the right approver."
      />

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
                      <span>Annual leave</span>
                    </Row>
                  ))}
                </RowList>
              )}
          </Section>
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
  const line = whatToKnow(w)
  return (
    <Row columns="minmax(0, 1fr) auto">
      <div>
        <b>{`${w.name}: ${theDaysInFull(w.startsOn, w.endsOn)}`}</b>
        {line && <p className="gwui-panel-text">{line}</p>}
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
