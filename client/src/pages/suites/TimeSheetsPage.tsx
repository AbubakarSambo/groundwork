import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { timeSheetsApi, type TimeAgreement, type TimeWeek } from '@/api/suites'
import { useAuthStore } from '@/stores/auth'
import { whenItWas } from '@/lib/a-date-reads-the-same-everywhere'
import { Button, Tag } from '@/components/gw/kit'

/**
 * TIME SHEETS (E3, #/suite/time, U.17). The wording is copied from
 * docs/prototype/screens/E-suites/suite-time.txt. HOURS ARE FOR BILLING ONLY (decisions rule 10).
 *
 * WHAT EACH READER IS GIVEN IS THE SERVER'S (GET /suites/time/board): an admin reads everybody's
 * hours and the hours against what each client agreed; a lead only their own team's hours; only while
 * the suite is on. Approve is offered only where the server says this reader approves.
 *
 * NOT DRAWN HERE, ON PURPOSE (docs/morning-report-ui.md, item 28):
 *   - "How people use it", with its example chat: nobody can give hours by talking to Groundwork until
 *     the engine takes them (request 22), and the example is sample data.
 *   - A way to say what each client agreed: no screen shows one. An admin can set them on the server
 *     (PUT /suites/time/agreements); the part shows once there are some.
 *
 * WORDING NO SCREEN SHOWS (item 28): "Hours still waiting for approval" for an earlier week, "No hours
 * have come in this week.", and "The board did not load."
 */
const DID_NOT_GO = 'That did not go through, and nothing has changed. Try again.'
const inHours = (minutes: number) => `${Math.round((minutes / 60) * 10) / 10}`
const weekOf = (day: string) => `Week of ${whenItWas(new Date(`${day}T00:00:00.000Z`), 'dayAndMonthLong', 'UTC')}`

export function TimeSheetsPage() {
  const user = useAuthStore(s => s.user)
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['suite-time'],
    queryFn: timeSheetsApi.get,
    enabled: !!user,
    retry: false,
  })
  const refused = (error as { response?: { status?: number; data?: { message?: string } } } | null)?.response
  const current = data?.weeks.find(w => w.weekOf === data.thisWeek)
  const earlier = data?.weeks.filter(w => w.weekOf !== data.thisWeek) ?? []

  return (
    <div className="gw-you gw-suites">
      <nav className="gw-people-crumb" aria-label="Breadcrumb"><Link to="/settings/suites">Suites</Link> / Time sheets</nav>
      <h1 className="gw-t-title gw-suites-h1">Time sheets</h1>
      <p className="gw-you-sub">Hours spent on each client or project, ready for billing. People tell Groundwork their hours in their check-in or in chat. There is no grid to fill in.</p>

      <div className="gw-you-card gw-time-rule">
        <b>Hours are for billing only.</b>
        <p>They never appear in anyone’s check-in report, their signals or a review. Being busy is not the same as making progress.</p>
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

      {data && (
        <>
          <AWeek heading="This week’s hours, waiting for approval" week={current ?? { weekOf: data.thisWeek, clients: [], people: [] }} empty="No hours have come in this week." />
          {earlier.map(w => <AWeek key={w.weekOf} heading="Hours still waiting for approval" week={w} empty="" />)}
          {!!data.agreements?.length && <Agreements list={data.agreements} />}
        </>
      )}
    </div>
  )
}

function AWeek({ heading, week, empty }: { heading: string; week: TimeWeek; empty: string }) {
  const qc = useQueryClient()
  const [problem, setProblem] = useState<string | null>(null)
  const approve = useMutation({
    mutationFn: (personId: string) => timeSheetsApi.approve(week.weekOf, personId),
    onSuccess: (board) => { setProblem(null); qc.setQueryData(['suite-time'], board) },
    onError: (e: any) => setProblem(e?.response?.data?.message || DID_NOT_GO),
  })
  const id = `time-${week.weekOf}`
  return (
    <section className="gw-suites-group" aria-labelledby={id}>
      <div className="gw-suite-head">
        <h2 id={id} className="gw-t-h2">{heading}</h2>
        <span className="gw-you-quiet">{weekOf(week.weekOf)}</span>
      </div>
      {week.people.length === 0 ? (
        empty && <p className="gw-t-body gw-you-quiet">{empty}</p>
      ) : (
        <div className="gw-you-card gw-time-table-wrap">
          <table className="gw-time-table">
            <thead>
              <tr>
                <th scope="col">Person</th>
                {week.clients.map(c => <th key={c} scope="col">{c}</th>)}
                <th scope="col">Total</th>
                <th scope="col"><span className="gw-sr-only">Approval</span></th>
              </tr>
            </thead>
            <tbody>
              {week.people.map(p => (
                <tr key={p.personId}>
                  <th scope="row">{p.name}</th>
                  {week.clients.map(c => <td key={c}>{inHours(p.minutes[c] ?? 0)} h</td>)}
                  <td><b>{inHours(p.total)} h</b></td>
                  <td>
                    {p.approved
                      ? <Tag tone="plain">Approved</Tag>
                      : p.mayApprove && (
                        <Button kind="secondary" size="small" onClick={() => approve.mutate(p.personId)} disabled={approve.isPending}
                          aria-label={`Approve ${p.name}’s hours`}>Approve</Button>
                      )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {problem && <p className="gw-auth-error" role="alert">{problem}</p>}
    </section>
  )
}

function Agreements({ list }: { list: TimeAgreement[] }) {
  const over = list.filter(a => a.usedMinutes > a.hours * 60)
  return (
    <section className="gw-suites-group gw-you-card" aria-labelledby="time-agreed">
      <h2 id="time-agreed" className="gw-t-h3">Hours against what each client agreed</h2>
      <ul className="gw-time-agreed">
        {list.map(a => {
          const used = Number(inHours(a.usedMinutes))
          const isOver = a.usedMinutes > a.hours * 60
          return (
            <li key={`${a.client}-${a.work}`}>
              <b>{`${a.client}: ${a.work} (${a.span === 'month' ? 'this month' : 'whole job'})`}</b>
              <span className="gw-time-bar" aria-hidden><span className={isOver ? 'over' : ''} style={{ width: `${Math.min(100, (a.usedMinutes / (a.hours * 60)) * 100)}%` }} /></span>
              <span>{`${used} of ${a.hours} hours${isOver ? ', over' : ''}`}</span>
            </li>
          )
        })}
      </ul>
      {over.map(a => (
        <p key={`over-${a.client}-${a.work}`}>{`${a.client} is ${Math.round((a.usedMinutes / 60 - a.hours) * 10) / 10} hours over the ${a.hours} the client agreed. Somebody should talk to them before more work is done.`}</p>
      ))}
    </section>
  )
}
