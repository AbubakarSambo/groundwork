import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { spendApi, type SpendBoard, type SpendWaiting } from '@/api/suites'
import { useAuthStore } from '@/stores/auth'
import { Page, PageTitle, Section, Panel, Button, Note, Empty, RowList, Row, FieldLabel, Select, TextField } from '@/components/gw/ui'

/**
 * SPENDING AND BUDGETS (E7, #/suite/spend, group 2 piece 4). What each reader is given is the server's
 * (GET /suites/spend/board): an admin every request and budget, a lead only their own team's, and
 * nobody else. The wording is copied from docs/prototype/screens/E-suites/suite-spend.txt: "People ask
 * to spend by telling Groundwork. It checks the budget and the rules, then sends the request to the
 * right person.", "Waiting for a yes or no", "Kamau: KES 18,000 for fuel for Kisumu deliveries",
 * "Operations has KES 38,000 left this month. Kamau’s lead can approve this.", "This is over KES
 * 20,000, so Grace must approve it.", "Approve", "Decline", "Each team’s budget this month", "Team",
 * "Budget", "Spent so far", "Left" and "Spending comes from the requests people make here."
 *
 * REBUILT FROM THE SHARED PARTS: `Page`/`PageTitle` (crumbs, subtitle), `Section` for "Waiting for a
 * yes or no", "Each team's budget this month" and "Set a team's budget for this month",
 * `RowList`/`Row` for the requests, `.gwui-record-table` for the budgets table,
 * `FieldLabel`/`Select`/`TextField` for setting a budget, `Button` for Approve/Decline/Save, and
 * `Note`/`Empty` for loading, error and empty states.
 *
 * LEFT OUT (item 28): "Once your accounting tool is connected under Connections, the real figures are
 * shown instead.", because no accounting tool can be connected yet; and "How people use it", because
 * asking in chat is the engine's and does not work yet (request 26).
 *
 * WORDING NO SCREEN SHOWS (item 28): "An admin can approve this.", "... so an admin must approve it.",
 * "... is ... over its budget this month.", "... over" in the table, "Nothing is waiting for a yes or
 * no.", "No budget is set for this month.", "Set a team’s budget for this month", "Choose a team",
 * "Save" and "The board did not load."
 */
const DID_NOT_GO = 'That did not go through, and nothing has changed. Try again.'

export const money = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 2 })
const withCurrency = (currency: string | null, n: number) => (currency ? `${currency} ${money(n)}` : money(n))

/** The one or two sentences under a request, in the prototype's order. */
export function whatToKnow(w: SpendWaiting, currency: string | null, limit: number | null): string {
  const budget = w.team && w.left != null
    ? (w.left >= 0
      ? `${w.team} has ${withCurrency(currency, w.left)} left this month.`
      : `${w.team} is ${withCurrency(currency, -w.left)} over its budget this month.`)
    : ''
  if (w.over && limit != null) {
    const who = w.approver.kind === 'person' && w.approver.firstName ? w.approver.firstName : 'an admin'
    return [`This is over ${withCurrency(currency, limit)}, so ${who} must approve it.`, budget].filter(Boolean).join(' ')
  }
  const who = w.approver.kind === 'manager' ? `${w.firstName}’s lead can approve this.` : 'An admin can approve this.'
  return [budget, who].filter(Boolean).join(' ')
}

export function SpendingPage() {
  const user = useAuthStore(s => s.user)
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['suite-spend'],
    queryFn: spendApi.get,
    enabled: !!user,
    retry: false,
  })
  const refused = (error as { response?: { status?: number; data?: { message?: string } } } | null)?.response

  return (
    <Page>
      <PageTitle
        crumbs={[{ label: 'Suites', to: '/settings/suites' }, { label: 'Spending and budgets' }]}
        title="Spending and budgets"
        subtitle="People ask to spend by telling Groundwork. It checks the budget and the rules, then sends the request to the right person."
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
          {data.reader === 'admin' && (
            <p className="gwui-panel-text"><Link className="gwui-plain-link" to="/suite/spend/finance">Open the requests for finance</Link></p>
          )}
          <Section heading="Waiting for a yes or no">
            {data.waiting.length === 0
              ? <Empty>Nothing is waiting for a yes or no.</Empty>
              : (
                <RowList label="Waiting for a yes or no">
                  {data.waiting.map(w => <ARequest key={w.id} w={w} board={data} />)}
                </RowList>
              )}
          </Section>

          <Section heading="Each team’s budget this month">
            {data.budgets.length === 0
              ? <Empty>No budget is set for this month.</Empty>
              : (
                <Panel>
                  <table className="gwui-record-table">
                    <thead>
                      <tr><th scope="col">Team</th><th scope="col">Budget</th><th scope="col">Spent so far</th><th scope="col">Left</th></tr>
                    </thead>
                    <tbody>
                      {data.budgets.map(b => (
                        <tr key={b.team}>
                          <th scope="row">{b.team}</th>
                          <td>{money(b.budget)}</td>
                          <td>{money(b.spent)}</td>
                          <td>{b.left >= 0 ? money(b.left) : `${money(-b.left)} over`}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Panel>
              )}
            <p className="gwui-panel-text-muted">Spending comes from the requests people make here.</p>
          </Section>

          {data.teams.length > 0 && <SetABudget teams={data.teams} />}
        </>
      )}
    </Page>
  )
}

function ARequest({ w, board }: { w: SpendWaiting; board: SpendBoard }) {
  const qc = useQueryClient()
  const [problem, setProblem] = useState<string | null>(null)
  const decide = useMutation({
    mutationFn: (outcome: 'approve' | 'decline') => spendApi.decide(w.id, outcome),
    onSuccess: (b) => { setProblem(null); qc.setQueryData(['suite-spend'], b) },
    onError: (e: any) => setProblem(e?.response?.data?.message || DID_NOT_GO),
  })
  const title = `${w.firstName}: ${withCurrency(board.currency, w.amount)} for ${w.what}`
  return (
    <Row columns="minmax(0, 1fr) auto">
      <div>
        <b>{title}</b>
        <p className="gwui-panel-text">{whatToKnow(w, board.currency, board.limit)}</p>
        {problem && <Note tone="error">{problem}</Note>}
      </div>
      {w.mayDecide && (
        <div className="gwui-edge-acts">
          <Button kind="secondary" size="small" onClick={() => decide.mutate('approve')} disabled={decide.isPending}
            aria-label={`Approve ${w.firstName}’s request`}>Approve</Button>
          <Button kind="quiet" size="small" onClick={() => decide.mutate('decline')} disabled={decide.isPending}
            aria-label={`Decline ${w.firstName}’s request`}>Decline</Button>
        </div>
      )}
    </Row>
  )
}

function SetABudget({ teams }: { teams: string[] }) {
  const qc = useQueryClient()
  const [team, setTeam] = useState('')
  const [amount, setAmount] = useState('')
  const [problem, setProblem] = useState<string | null>(null)
  const save = useMutation({
    mutationFn: () => spendApi.setBudget(team, Number(amount)),
    onSuccess: (b) => { setProblem(null); setAmount(''); qc.setQueryData(['suite-spend'], b) },
    onError: (e: any) => setProblem(e?.response?.data?.message || DID_NOT_GO),
  })
  const ok = !!team && amount.trim() !== '' && Number.isFinite(Number(amount)) && Number(amount) >= 0
  return (
    <Section heading="Set a team’s budget for this month">
      <Panel>
        <form className="gwui-suite-ask" onSubmit={e => { e.preventDefault(); if (ok) save.mutate() }}>
          <div className="gwui-suite-q">
            <FieldLabel htmlFor="spend-team">Team</FieldLabel>
            <Select id="spend-team" value={team} onChange={e => setTeam(e.target.value)}>
              <option value="">Choose a team</option>
              {teams.map(t => <option key={t} value={t}>{t}</option>)}
            </Select>
          </div>
          <div className="gwui-suite-q">
            <FieldLabel htmlFor="spend-amount">Budget</FieldLabel>
            <TextField id="spend-amount" type="number" min={0} inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} />
          </div>
          <div><Button type="submit" size="small" disabled={!ok || save.isPending}>Save</Button></div>
          {problem && <Note tone="error">{problem}</Note>}
        </form>
      </Panel>
    </Section>
  )
}
