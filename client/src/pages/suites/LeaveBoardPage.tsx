import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { leaveBoardApi, type LeaveWaiting } from '@/api/suites'
import { useAuthStore } from '@/stores/auth'
import { Button } from '@/components/gw/kit'
import { theDaysInFull, theDaysShort, whatToKnow } from './the-days-someone-is-off'

/**
 * THE LEAVE BOARD (E2, #/suite/leave, U.17). The wording is copied from
 * docs/prototype/screens/E-suites/suite-leave.txt.
 *
 * WHAT EACH READER IS GIVEN IS THE SERVER'S (GET /suites/leave/board): an admin reads everything, a
 * lead only their own team's, and only while the suite is on. Approve and Decline are offered only
 * on a request the server says this reader approves, and the server checks again.
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
    <div className="gw-you gw-suites">
      <nav className="gw-people-crumb" aria-label="Breadcrumb"><Link to="/settings/suites">Suites</Link> / Leave requests</nav>
      <h1 className="gw-t-title gw-suites-h1">Leave requests</h1>
      <p className="gw-you-sub">People ask for time off in their check-in or chat. Groundwork checks their balance and who else is off, and sends it to the right approver.</p>

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

      {data && (
        <>
          <section className="gw-suites-group" aria-labelledby="leave-waiting">
            <h2 id="leave-waiting" className="gw-t-h2">Waiting for approval</h2>
            {data.waiting.length === 0
              ? <p className="gw-t-body gw-you-quiet">Nothing is waiting for approval.</p>
              : <ul className="gw-leave-list">{data.waiting.map(w => <ARequest key={w.id} w={w} />)}</ul>}
          </section>

          <section className="gw-suites-group" aria-labelledby="leave-off">
            <div className="gw-suite-head">
              <h2 id="leave-off" className="gw-t-h2">Who’s off</h2>
              <span className="gw-you-quiet">The next two weeks</span>
            </div>
            {data.off.length === 0
              ? <p className="gw-t-body gw-you-quiet">Nobody is off in the next two weeks.</p>
              : (
                <ul className="gw-leave-off">
                  {data.off.map(o => (
                    <li key={o.id}>
                      <b>{o.name}</b>
                      <span>{theDaysShort(o.startsOn, o.endsOn)}</span>
                      <span>Annual leave</span>
                    </li>
                  ))}
                </ul>
              )}
          </section>
        </>
      )}
    </div>
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
    <li className="gw-leave-row">
      <div>
        <b>{`${w.name}: ${theDaysInFull(w.startsOn, w.endsOn)}`}</b>
        {line && <p>{line}</p>}
        {problem && <p className="gw-auth-error" role="alert">{problem}</p>}
      </div>
      {w.mayDecide && (
        <div className="gw-leave-acts">
          <Button kind="secondary" size="small" onClick={() => decide.mutate('approve')} disabled={decide.isPending}
            aria-label={`Approve ${w.name}’s request`}>Approve</Button>
          <Button kind="quiet" size="small" onClick={() => decide.mutate('decline')} disabled={decide.isPending}
            aria-label={`Decline ${w.name}’s request`}>Decline</Button>
        </div>
      )}
    </li>
  )
}
