import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { financeApi, type ATotal, type FinanceRequest, type FinanceView, type TheMonthsTotals } from '@/api/suites'
import { useAuthStore } from '@/stores/auth'
import { Page, PageTitle, Section, Panel, Button, Note, Empty, RowList, Row, FieldLabel, TextField, Select, Skeleton } from '@/components/gw/ui'
import { maySeeSuites, SuiteOffMessage, theToneForARefusal } from '@/lib/suite-is-off'
import { midSentence } from '@/lib/a-colleague'
import { whenItWas } from '@/lib/a-date-reads-the-same-everywhere'
import { TheAttachedFile } from './TheAttachedFile'

/**
 * THE REQUESTS FOR FINANCE (#/suite/spend/finance). Decision 85, item 2: "Finance verifies, codes,
 * exports approved payments (CSV or Excel) and marks them paid, and sees only the financial
 * information it is allowed." The prototype does not picture this screen, so every sentence here
 * is either the server's own (the request, said in full sentences with "you" for the reader) or one
 * of the few plain words listed below.
 *
 * WHAT EACH READER IS GIVEN IS THE SERVER'S (GET /suites/spend/finance): whoever holds the finance
 * duty, and an admin, read the approved requests; everybody else is refused with the server's own
 * sentence, drawn as it comes. Nobody checks or pays their own request, and the server says so.
 *
 * WORDING THE SERVER DOES NOT SEND: "Requests for finance"; "Waiting to be paid"; "Paid in the last
 * 60 days"; "Nothing is waiting to be paid."; "Nothing has been paid in the last 60 days."; "Check
 * it"; "Save the budget line"; "Budget line"; "Finance has the receipt"; "Finance has the quote";
 * "The day it was paid"; "Mark it paid"; "Download as CSV"; "Download as Excel"; "The file only holds
 * the requests that are waiting to be paid."; "The requests did not load."
 */
const DID_NOT_GO = 'That did not go through, and nothing has changed. Try again.'
const EVIDENCE: Record<string, string> = { receipt: 'a receipt', quote: 'a quote' }
const todayIs = () => new Date().toISOString().slice(0, 10)
const withCurrency = (currency: string | null, n: number) => {
  const money = n.toLocaleString('en-US', { maximumFractionDigits: 2 })
  return currency ? `${currency} ${money}` : money
}

/** "2026-10", this month. */
const thisMonth = () => new Date().toISOString().slice(0, 7)
/**
 * This month and the eleven before it, oldest last, as the month choice for the totals (item 5:
 * "a month choice (this month and the previous ones)"). Only navigation, never a served number.
 */
function monthChoices(): { value: string; label: string }[] {
  const now = new Date()
  const out: { value: string; label: string }[] = []
  for (let i = 0; i < 12; i += 1) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1))
    out.push({ value: d.toISOString().slice(0, 7), label: `${whenItWas(d, 'month', 'UTC')} ${d.getUTCFullYear()}` })
  }
  return out
}

export function FinancePage() {
  const user = useAuthStore(s => s.user)
  const qc = useQueryClient()
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['suite-finance'],
    queryFn: financeApi.get,
    enabled: !!user,
    retry: false,
  })
  const refused = (error as { response?: { status?: number; data?: { message?: string } } } | null)?.response
  const [problem, setProblem] = useState<string | null>(null)
  const [month, setMonth] = useState(thisMonth())
  /* Only read once the main view above has already let this reader in (finance or an admin): no
     separate guard is needed, since this query is never reached by anybody the page itself refused. */
  const totals = useQuery({
    queryKey: ['suite-finance-totals', month],
    queryFn: () => financeApi.totals(month),
    enabled: !!data,
    retry: false,
  })
  /* The month the heading follows: the server's own words for it once they arrive (`monthSays`,
     "October 2026"), the month choice's own label while they are still loading, so the heading never
     lags a tick behind the month this reader just picked. */
  const headingMonth = (totals.data?.month === month ? totals.data?.monthSays : null) ?? monthChoices().find(m => m.value === month)?.label ?? null
  const download = useMutation({
    mutationFn: async (format: 'csv' | 'xlsx') => {
      const { blob, fileName } = await financeApi.file(format)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      a.click()
      URL.revokeObjectURL(url)
    },
    onSuccess: () => { setProblem(null); qc.invalidateQueries({ queryKey: ['suite-finance'] }) },
    onError: (e: any) => setProblem(e?.response?.data?.message || DID_NOT_GO),
  })

  return (
    <Page>
      <PageTitle
        crumbs={[{ label: 'Suites', to: maySeeSuites(user?.role) ? '/settings/suites' : undefined }, { label: 'Spending and budgets', to: '/suite/spend' }, { label: 'Requests for finance' }]}
        title="Requests for finance"
        subtitle="These requests to spend have been approved. Check each one, write the budget line it is paid from, note the receipt or quote, and mark it paid."
      />

      {isLoading && <Skeleton what="Getting this page" shape="rows" />}
      {isError && (
        refused?.status === 403 || refused?.status === 404 ? (
          <Note tone={theToneForARefusal(refused.data?.message ?? 'Only whoever looks after finance, or an admin, can open this.')}><SuiteOffMessage message={refused.data?.message ?? 'Only whoever looks after finance, or an admin, can open this.'} role={user?.role} /></Note>
        ) : (
          <div>
            <Note tone="error">The requests did not load.</Note>
            <Button kind="secondary" size="small" onClick={() => refetch()} disabled={isFetching}>Try again</Button>
          </div>
        )
      )}

      {data && (
        <>
          {/*
           * THE SUMMARY FIRST (live walk at a hundred people, fault 3): the totals used to sit under
           * the whole list of payment cards, so finance scrolled past every one of them to find the
           * month's own numbers. The heading now follows the month that is actually chosen, instead
           * of reading "This month's spending" after a different month had been picked.
           */}
          <Section
            heading={headingMonth ? `Spending in ${headingMonth}` : 'Spending'}
            action={<Select aria-label="Month" value={month} onChange={e => setMonth(e.target.value)}>
              {monthChoices().map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </Select>}
          >
            {totals.isLoading && <Skeleton what="Getting this page" shape="rows" />}
            {totals.data && <TheTotals t={totals.data} />}
          </Section>

          <Section
            heading="Waiting to be paid"
            action={(data.toPay ?? []).length > 0 ? (
              <>
                <Button kind="secondary" size="small" onClick={() => download.mutate('csv')} disabled={download.isPending}>Download as CSV</Button>
                <Button kind="secondary" size="small" onClick={() => download.mutate('xlsx')} disabled={download.isPending}>Download as Excel</Button>
              </>
            ) : undefined}
          >
            {problem && <Note tone="error">{problem}</Note>}
            {(data.toPay ?? []).length === 0
              ? <Empty>Nothing is waiting to be paid.</Empty>
              : (
                <RowList label="Waiting to be paid">
                  {(data.toPay ?? []).map(r => <ARequest key={r.id} r={r} view={data} />)}
                </RowList>
              )}
            {(data.toPay ?? []).length > 0 && <p className="gwui-panel-text-muted">The file only holds the requests that are waiting to be paid.</p>}
          </Section>

          <Section heading="Paid in the last 60 days">
            {(data.paid ?? []).length === 0
              ? <Empty>Nothing has been paid in the last 60 days.</Empty>
              : (
                <RowList label="Paid in the last 60 days">
                  {(data.paid ?? []).map(r => (
                    <Row key={r.id} columns="minmax(0, 1fr)">
                      <div>
                        <b>{title(r, data.currency)}</b>
                        <Said r={r} />
                      </div>
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

/**
 * THE MONTH'S SPENDING, ADDED UP FOR FINANCE (item 5, GET /suites/spend/finance/totals). Every
 * number and word is the server's own `says` (the-spending-for-finance.service.ts), by team and by
 * category, in the organisation's own currency - never a price, a limit or a count built here.
 */
function TheTotals({ t }: { t: TheMonthsTotals }) {
  return (
    <>
      <p className="gwui-panel-text">{t.says}</p>
      <Panel as="section" heading="By team" aria-label="By team">
        <RowList label="By team">
          {t.byTeam.map((x: ATotal) => <Row key={x.name} columns="minmax(0, 1fr)"><span>{x.says}</span></Row>)}
        </RowList>
      </Panel>
      <Panel as="section" heading="By category" aria-label="By category">
        <RowList label="By category">
          {t.byCategory.map((x: ATotal) => <Row key={x.name} columns="minmax(0, 1fr)"><span>{x.says}</span></Row>)}
        </RowList>
      </Panel>
    </>
  )
}

/* `r.what` can open with a capitalised article ("The Mwangi agency") where the same string also
   stands as a title elsewhere; mid-sentence here, only that leading word is wrong (fault 1). */
const title = (r: FinanceRequest, currency: string | null) => `${r.name}: ${withCurrency(currency, r.amount)} for ${midSentence(r.what)}`

function Said({ r }: { r: FinanceRequest }) {
  return (
    <>
      {r.said.map((line, i) => <p key={i} className="gwui-panel-text">{line}</p>)}
      {r.attached && <TheAttachedFile a={r.attached} firstName={r.name.split(' ')[0] || r.name} />}
    </>
  )
}

function ARequest({ r, view }: { r: FinanceRequest; view: FinanceView }) {
  const qc = useQueryClient()
  const [code, setCode] = useState(r.code ?? '')
  const [day, setDay] = useState(todayIs())
  const [problem, setProblem] = useState<string | null>(null)
  const done = (v: FinanceView) => { setProblem(null); qc.setQueryData(['suite-finance'], v) }
  const failed = (e: any) => setProblem(e?.response?.data?.message || DID_NOT_GO)
  const check = useMutation({ mutationFn: () => financeApi.check(r.id), onSuccess: done, onError: failed })
  const saveCode = useMutation({ mutationFn: () => financeApi.code(r.id, code.trim()), onSuccess: done, onError: failed })
  const evidence = useMutation({ mutationFn: (what: string) => financeApi.evidence(r.id, what), onSuccess: done, onError: failed })
  const paid = useMutation({ mutationFn: () => financeApi.paid(r.id, day), onSuccess: done, onError: failed })
  const busy = check.isPending || saveCode.isPending || evidence.isPending || paid.isPending
  const missing = r.evidenceNeeded.filter(e => !r.evidenceGiven.includes(e))
  const listId = `finance-lines-${r.id}`

  return (
    <Row columns="minmax(0, 1fr)">
      <div>
        <b>{title(r, view.currency)}</b>
        <Said r={r} />

        <div className="gwui-edge-acts">
          {!r.checked && <Button kind="secondary" size="small" onClick={() => check.mutate()} disabled={busy} aria-label={`Check ${r.name}’s request`}>Check it</Button>}
          {missing.map(e => (
            <Button key={e} kind="secondary" size="small" onClick={() => evidence.mutate(e)} disabled={busy}
              aria-label={`Finance has ${EVIDENCE[e] ?? e} for ${r.name}’s request`}>{`Finance has the ${e}`}</Button>
          ))}
        </div>

        <form className="gwui-suite-ask" onSubmit={e => { e.preventDefault(); if (code.trim()) saveCode.mutate() }}>
          <div className="gwui-suite-q">
            <FieldLabel htmlFor={`code-${r.id}`}>Budget line</FieldLabel>
            <TextField id={`code-${r.id}`} list={listId} value={code} maxLength={80} onChange={e => setCode(e.target.value)} />
            <datalist id={listId}>{view.lines.map(l => <option key={l} value={l} />)}</datalist>
          </div>
          <div><Button kind="secondary" size="small" type="submit" disabled={!code.trim() || busy} aria-label={`Save the budget line for ${r.name}’s request`}>Save the budget line</Button></div>
        </form>

        {r.checked && (
          <form className="gwui-suite-ask" onSubmit={e => { e.preventDefault(); if (day) paid.mutate() }}>
            <div className="gwui-suite-q">
              <FieldLabel htmlFor={`paid-${r.id}`}>The day it was paid</FieldLabel>
              <TextField id={`paid-${r.id}`} type="date" value={day} max={todayIs()} min={r.askedOn} onChange={e => setDay(e.target.value)} />
            </div>
            <div><Button kind="secondary" size="small" type="submit" disabled={!day || busy} aria-label={`Mark ${r.name}’s request paid`}>Mark it paid</Button></div>
          </form>
        )}
        {problem && <Note tone="error">{problem}</Note>}
      </div>
    </Row>
  )
}
