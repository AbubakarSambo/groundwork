import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { timeSheetsApi, type TimeAgreement, type TimeWeek } from '@/api/suites'
import { useAuthStore } from '@/stores/auth'
import { whenItWas } from '@/lib/a-date-reads-the-same-everywhere'
import { Page, PageTitle, Section, Panel, Button, Tag, Note, Empty } from '@/components/gw/ui'

/**
 * TIME SHEETS (E3, #/suite/time, group 2 piece 4). The wording is copied from
 * docs/prototype/screens/E-suites/suite-time.txt. HOURS ARE FOR BILLING ONLY (decisions rule 10).
 *
 * WHAT EACH READER IS GIVEN IS THE SERVER'S (GET /suites/time/board): an admin reads everybody's
 * hours and the hours against what each client agreed; a lead only their own team's hours; only while
 * the suite is on. Approve is offered only where the server says this reader approves.
 *
 * REBUILT FROM THE SHARED PARTS: `Page`/`PageTitle` (crumbs, subtitle), `Panel` for "Hours are for
 * billing only", `Section` for each week (its "Week of ..." is `Section`'s own `note`) and "Hours
 * against what each client agreed", `.gwui-record-table` (added to `gw-ui.css` for this piece - see
 * docs/the-parts-against-the-prototype.md) for the hours table, `Tag`/`Button` for Approved/Approve,
 * and `Note`/`Empty` for the loading, error and empty states.
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
  const current = data?.weeks?.find(w => w.weekOf === data.thisWeek)
  const earlier = data?.weeks?.filter(w => w.weekOf !== data.thisWeek) ?? []

  return (
    <Page>
      <PageTitle
        crumbs={[{ label: 'Suites', to: '/settings/suites' }, { label: 'Time sheets' }]}
        title="Time sheets"
        subtitle="Hours spent on each client or project, ready for billing. People tell Groundwork their hours in their check-in or in chat. There is no grid to fill in."
      />

      <Panel>
        <p className="gwui-panel-text"><b>Hours are for billing only.</b></p>
        <p className="gwui-panel-text">They are never used in a report or a review.</p>
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

      {data && (
        <>
          <AWeek heading="This week’s hours, waiting for approval" week={current ?? { weekOf: data.thisWeek, clients: [], people: [] }} empty="No hours have come in this week." />
          {earlier.map(w => <AWeek key={w.weekOf} heading="Hours still waiting for approval" week={w} empty="" />)}
          {!!data.agreements?.length && <Agreements list={data.agreements} />}
        </>
      )}
    </Page>
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
  return (
    <Section heading={heading} note={weekOf(week.weekOf)}>
      {week.people.length === 0 ? (
        empty && <Empty>{empty}</Empty>
      ) : (
        <Panel>
          <table className="gwui-record-table">
            <thead>
              <tr>
                <th scope="col">Person</th>
                {week.clients.map(c => <th key={c} scope="col">{c}</th>)}
                <th scope="col">Total</th>
                <th scope="col"><span className="gwui-sr-only">Approval</span></th>
              </tr>
            </thead>
            <tbody>
              {week.people.map(p => (
                <tr key={p.personId}>
                  <th scope="row">{p.name}</th>
                  {week.clients.map(c => (
                    <td key={c}><span className="gwui-record-table-label" aria-hidden="true">{c}</span>{inHours(p.minutes[c] ?? 0)} h</td>
                  ))}
                  <td><span className="gwui-record-table-label" aria-hidden="true">Total</span><b>{inHours(p.total)} h</b></td>
                  <td>
                    {p.approved
                      ? <Tag>Approved</Tag>
                      : p.mayApprove
                        ? (
                          <Button kind="secondary" size="small" onClick={() => approve.mutate(p.personId)} disabled={approve.isPending}
                            aria-label={`Approve ${p.name}’s hours`}>Approve</Button>
                        )
                        /* FAULT 2 OF THE LIVE WALK (6 October): neither Approved nor mayApprove left this
                           cell blank for a reader who reads the row but does not approve it themselves -
                           the server's own sentence for where it stands ("They are waiting for Daniel.")
                           was never drawn. */
                        : (p.where && <p className="gwui-panel-text">{p.where}</p>)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      )}
      {problem && <Note tone="error">{problem}</Note>}
    </Section>
  )
}

function Agreements({ list }: { list: TimeAgreement[] }) {
  const over = list.filter(a => a.usedMinutes > a.hours * 60)
  return (
    <Section heading="Hours against what each client agreed">
      <Panel>
        <ul className="gwui-rows">
          {list.map(a => {
            const used = Number(inHours(a.usedMinutes))
            const isOver = a.usedMinutes > a.hours * 60
            return (
              <li key={`${a.client}-${a.work}`} className="gwui-row">
                <b>{`${a.client}: ${a.work} (${a.span === 'month' ? 'this month' : 'whole job'})`}</b>
                <span className="gwui-time-bar" aria-hidden><span className={isOver ? 'gwui-time-bar-over' : ''} style={{ width: `${Math.min(100, (a.usedMinutes / (a.hours * 60)) * 100)}%` }} /></span>
                <span>{`${used} of ${a.hours} hours${isOver ? ', over' : ''}`}</span>
              </li>
            )
          })}
        </ul>
        {over.map(a => (
          <p key={`over-${a.client}-${a.work}`} className="gwui-panel-text">{`${a.client} is ${Math.round((a.usedMinutes / 60 - a.hours) * 10) / 10} hours over the ${a.hours} the client agreed. Somebody should talk to them before more work is done.`}</p>
        ))}
      </Panel>
    </Section>
  )
}
