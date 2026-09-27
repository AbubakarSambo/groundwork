import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { spendApi, type SpendBoard, type SpendWaiting } from '@/api/suites'
import { useAuthStore } from '@/stores/auth'
import { Button } from '@/components/gw/kit'

/**
 * SPENDING AND BUDGETS (E7, #/suite/spend, U.17). What each reader is given is the server's (GET
 * /suites/spend/board): an admin every request and budget, a lead only their own team's, and nobody
 * else. The wording is copied from docs/prototype/screens/E-suites/suite-spend.txt: "People ask to
 * spend by telling Groundwork. It checks the budget and the rules, then sends the request to the right
 * person.", "Waiting for a yes or no", "Kamau: KES 18,000 for fuel for Kisumu deliveries", "Operations
 * has KES 38,000 left this month. Kamau’s lead can approve this.", "This is over KES 20,000, so Grace
 * must approve it.", "Approve", "Decline", "Each team’s budget this month", "Team", "Budget", "Spent so
 * far", "Left" and "Spending comes from the requests people make here."
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
    <div className="gw-you gw-suites">
      <nav className="gw-people-crumb" aria-label="Breadcrumb"><Link to="/settings/suites">Suites</Link> / Spending and budgets</nav>
      <h1 className="gw-t-title gw-suites-h1">Spending and budgets</h1>
      <p className="gw-you-sub">People ask to spend by telling Groundwork. It checks the budget and the rules, then sends the request to the right person.</p>

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
          <section className="gw-suites-group" aria-labelledby="spend-waiting">
            <h2 id="spend-waiting" className="gw-t-h2">Waiting for a yes or no</h2>
            {data.waiting.length === 0
              ? <p className="gw-t-body gw-you-quiet">Nothing is waiting for a yes or no.</p>
              : <ul className="gw-leave-list">{data.waiting.map(w => <ARequest key={w.id} w={w} board={data} />)}</ul>}
          </section>

          <section className="gw-suites-group" aria-labelledby="spend-budgets">
            <h2 id="spend-budgets" className="gw-t-h2">Each team’s budget this month</h2>
            {data.budgets.length === 0
              ? <p className="gw-t-body gw-you-quiet">No budget is set for this month.</p>
              : (
                <div className="gw-you-card gw-time-table-wrap">
                  <table className="gw-suite-table">
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
                </div>
              )}
            <p className="gw-you-quiet">Spending comes from the requests people make here.</p>
          </section>

          {data.teams.length > 0 && <SetABudget teams={data.teams} />}
        </>
      )}
    </div>
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
    <li className="gw-leave-row">
      <div>
        <b>{title}</b>
        <p>{whatToKnow(w, board.currency, board.limit)}</p>
        {problem && <p className="gw-auth-error" role="alert">{problem}</p>}
      </div>
      {w.mayDecide && (
        <div className="gw-leave-acts">
          <Button kind="secondary" size="small" onClick={() => decide.mutate('approve')} disabled={decide.isPending}
            aria-label={`Approve ${w.firstName}’s request`}>Approve</Button>
          <Button kind="quiet" size="small" onClick={() => decide.mutate('decline')} disabled={decide.isPending}
            aria-label={`Decline ${w.firstName}’s request`}>Decline</Button>
        </div>
      )}
    </li>
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
    <section className="gw-suites-group gw-you-card" aria-labelledby="spend-set">
      <h2 id="spend-set" className="gw-t-h3">Set a team’s budget for this month</h2>
      <form className="gw-suite-ask" onSubmit={e => { e.preventDefault(); if (ok) save.mutate() }}>
        <div className="gw-suite-q">
          <label htmlFor="spend-team">Team</label>
          <select id="spend-team" value={team} onChange={e => setTeam(e.target.value)}>
            <option value="">Choose a team</option>
            {teams.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="gw-suite-q">
          <label htmlFor="spend-amount">Budget</label>
          <input id="spend-amount" type="number" min={0} inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} />
        </div>
        <div><Button type="submit" size="small" disabled={!ok || save.isPending}>Save</Button></div>
        {problem && <p className="gw-auth-error" role="alert">{problem}</p>}
      </form>
    </section>
  )
}
