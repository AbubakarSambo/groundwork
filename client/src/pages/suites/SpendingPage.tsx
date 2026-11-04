import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { spendApi, type SpendBoard, type SpendWaiting } from '@/api/suites'
import { useAuthStore } from '@/stores/auth'
import { Page, PageTitle, Section, Panel, Button, Note, Empty, RowList, Row, FieldLabel, Select, TextField, TextArea, Tag, ExampleExchange } from '@/components/gw/ui'
import { AskAQuestion } from './AskAQuestion'
import { ApprovalStepsByAmount } from './ApprovalStepsByAmount'
import { maySeeSuites, SuiteOffMessage } from '@/lib/suite-is-off'

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
 * UNDER EACH REQUEST: what the team has left (from the numbers), then the server's own sentences, where it
 * stands (`where`), what the rules need (`needs`) and each question with its answer (`questions`), and
 * the category as a tag. Whoever decides it can also ask a question. "How people use it" says where
 * requests are made (request 26 is done), without the prototype's example chat, which is sample data.
 *
 * LEFT OUT (item 28): "Once your accounting tool is connected under Connections, the real figures are
 * shown instead.", because no accounting tool can be connected (decision 86, item 4).
 *
 * WORDING NO SCREEN SHOWS (item 28): "An admin can approve this.", "... so an admin must approve it.",
 * "... is ... over its budget this month.", "... over" in the table, "Nothing is waiting for a yes or
 * no.", "No budget is set for this month.", "Set a team’s budget for this month", "Choose a team",
 * "Save" and "The board did not load."
 */
const DID_NOT_GO = 'That did not go through, and nothing has changed. Try again.'

export const money = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 2 })
const withCurrency = (currency: string | null, n: number) => (currency ? `${currency} ${money(n)}` : money(n))

/**
 * What the screen knows from the numbers: whether the request is over the most a lead may approve on
 * their own, and what the team has left. WHO APPROVES IT, AND WHERE IT STANDS, IS THE SERVER'S SENTENCE
 * (`where`), never the screen's own: a request that already has its first approval and now waits for
 * finance must not read that the lead can approve it (4 October review, S3).
 */
export function whatToKnow(w: SpendWaiting, currency: string | null, limit: number | null): string {
  const budget = w.team && w.left != null
    ? (w.left >= 0
      ? `${w.team} has ${withCurrency(currency, w.left)} left this month.`
      : `${w.team} is ${withCurrency(currency, -w.left)} over its budget this month.`)
    : ''
  const over = w.over && limit != null ? `This is over ${withCurrency(currency, limit)}.` : ''
  return [over, budget].filter(Boolean).join(' ')
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
        crumbs={[{ label: 'Suites', to: maySeeSuites(user?.role) ? '/settings/suites' : undefined }, { label: 'Spending and budgets' }]}
        title="Spending and budgets"
        subtitle="People ask to spend by telling Groundwork. It checks the budget and the rules, then sends the request to the right person."
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
          {data.reader === 'admin' && (
            <p className="gwui-panel-text"><Link className="gwui-plain-link" to="/suite/spend/finance">Open the requests for finance</Link></p>
          )}
          <Section heading="Waiting for a yes or no">
            {(data.waiting ?? []).length === 0
              ? <Empty>Nothing is waiting for a yes or no.</Empty>
              : (
                <RowList label="Waiting for a yes or no">
                  {(data.waiting ?? []).map(w => <ARequest key={w.id} w={w} board={data} />)}
                </RowList>
              )}
          </Section>

          <Section heading="Each team’s budget this month">
            {(data.budgets ?? []).length === 0
              ? <Empty>No budget is set for this month.</Empty>
              : (
                <Panel>
                  <table className="gwui-record-table">
                    <thead>
                      <tr><th scope="col">Team</th><th scope="col">Budget</th><th scope="col">Spent so far</th><th scope="col">Left</th></tr>
                    </thead>
                    <tbody>
                      {(data.budgets ?? []).map(b => (
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

          <Section heading="How people use it">
            <ExampleExchange
              label="An example: someone asks Groundwork if they can spend, and is told whether it fits the budget, before it is sent to the right person to approve."
              lines={[
                { mine: true, text: 'Can I spend KES 18,000 on fuel for the Kisumu deliveries?' },
                { mine: false, text: 'Operations has KES 38,000 left this month, so yes, that fits. I have sent it to your lead to approve.' },
              ]}
            />
            <p className="gwui-panel-text">In their check-in, in chat, or on WhatsApp. Nobody fills in a form.</p>
          </Section>

          {(data.teams ?? []).length > 0 && <SetABudget teams={data.teams} />}

          {/* Who approves, by amount, in order: shown to whoever the server serves the rules to (an admin, or whoever looks after finance). */}
          <ApprovalStepsByAmount currency={data.currency} />
        </>
      )}
    </Page>
  )
}

function ARequest({ w, board }: { w: SpendWaiting; board: SpendBoard }) {
  const qc = useQueryClient()
  const [problem, setProblem] = useState<string | null>(null)
  const [declining, setDeclining] = useState(false)
  const [reason, setReason] = useState('')
  const decide = useMutation({
    mutationFn: (outcome: 'approve' | 'decline') =>
      outcome === 'decline' ? spendApi.decide(w.id, outcome, reason.trim() || undefined) : spendApi.decide(w.id, outcome),
    onSuccess: (b) => { setProblem(null); qc.setQueryData(['suite-spend'], b) },
    onError: (e: any) => setProblem(e?.response?.data?.message || DID_NOT_GO),
  })
  /* THE LINE IS THE SERVER'S (request 162, item 3): `says` already reads "Kamau: KES 18,000 for fuel
     for Kisumu deliveries", built once (a-request-in-words.ts) rather than here a second time - this
     used to build its own title from the raw fields, which is exactly the kind of drift that put the
     wrong capitalisation on "The Mwangi agency" (fault 1) in the first place. */
  const known = whatToKnow(w, board.currency, board.limit)
  return (
    <Row columns="minmax(0, 1fr) auto">
      <div>
        <b>{w.says}</b>
        {/* B-155: the tag ran straight into the sentence on both sides with no space
            ("...the Mombasa depotLabels", then the tag ran into the next line too), because
            nothing separated the three inline pieces. */}
        {w.category && <> <Tag>{w.category}</Tag>{' '}</>}
        {known && <p className="gwui-panel-text">{known}</p>}
        <p className="gwui-panel-text">{w.where}</p>
        {w.attached && <p className="gwui-panel-text">{w.attached}</p>}
        {w.needs.map((n, i) => <p key={`n${i}`} className="gwui-panel-text">{n}</p>)}
        {w.questions.map((q, i) => <p key={`q${i}`} className="gwui-panel-text">{q}</p>)}
        {w.mayDecide && (
          <AskAQuestion id={w.id} who={w.firstName} send={async q => qc.setQueryData(['suite-spend'], await spendApi.ask(w.id, q))} />
        )}
        {/*
         * FAULT 6 OF THE LIVE WALK: Decline used to go straight through with no reason asked, so the
         * person who asked would read a decline with no "why" (the server already carries one,
         * `declineReason`, told to the person word for word - `the-spending.service.ts`'s
         * `declinedBecause`). "Say why" is optional, same as the leave rules' own reason text, and
         * is sent in the decline endpoint's own `reason` field.
         */}
        {declining && (
          <form className="gwui-suite-ask" onSubmit={e => { e.preventDefault(); decide.mutate('decline') }}>
            <div className="gwui-suite-q">
              <FieldLabel htmlFor={`spend-decline-${w.id}`}>Say why (optional)</FieldLabel>
              <TextArea id={`spend-decline-${w.id}`} rows={2} value={reason} onChange={e => setReason(e.target.value)} maxLength={1000} />
            </div>
            <div className="gwui-edge-acts">
              <Button kind="secondary" size="small" type="submit" disabled={decide.isPending}>Decline</Button>
              <Button kind="quiet" size="small" onClick={() => { setDeclining(false); setReason(''); setProblem(null) }}>Cancel</Button>
            </div>
          </form>
        )}
        {problem && <Note tone="error">{problem}</Note>}
      </div>
      {w.mayDecide && !declining && (
        <div className="gwui-edge-acts">
          <Button kind="secondary" size="small" onClick={() => decide.mutate('approve')} disabled={decide.isPending}
            aria-label={`Approve ${w.firstName}’s request`}>Approve</Button>
          <Button kind="quiet" size="small" onClick={() => setDeclining(true)} disabled={decide.isPending}
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
