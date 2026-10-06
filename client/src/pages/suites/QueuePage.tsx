import { useState } from 'react'
import { Link } from 'react-router-dom'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queueApi, leaveBoardApi, spendApi, type AQueueItem } from '@/api/suites'
import { useAuthStore } from '@/stores/auth'
import { Page, PageTitle, Section, Button, Note, RowList, Row, Tabs, FieldLabel, TextArea } from '@/components/gw/ui'
import { maySeeSuites, SuiteOffMessage } from '@/lib/suite-is-off'

/**
 * A LINK TO THE QUEUE, FOR TODAY AND THE SUITES PAGE, ONLY FOR SOMEBODY THE QUEUE SERVES ITEMS TO.
 * Reads the same counts the queue page itself reads (one row, `pageSize: 1`), and draws nothing - no
 * link, no request shown as failed - for a guest, a member nothing waits for, or an organisation with
 * neither suite switched on, since the server refuses or empties those the same way the queue page
 * already handles (a 403/404 here is silently nothing, never an error on a page that is not about
 * the queue).
 */
export function QueueLink({ userId }: { userId?: string }) {
  const { data } = useQuery({
    queryKey: ['suite-queue-count'],
    queryFn: () => queueApi.get({ pageSize: 1 }),
    enabled: !!userId,
    retry: false,
    staleTime: 30_000,
  })
  if (!data?.counts?.all) return null
  return <p className="gwui-panel-text"><Link className="gwui-plain-link" to="/suite/queue">{data.says}</Link></p>
}

/**
 * THE APPROVER'S QUEUE (new for the screens, 6 October: "the suites at a hundred people", request
 * 160/162). GET /suites/queue (the-approvals-queue.service.ts) answers everything that waits for
 * this one person to approve or decline, leave and spending together, oldest first, a page at a
 * time, with the counts of the whole of it. The prototype has no picture of this screen - a hundred
 * people can wait on one person's queue, where suite-leave.txt and suite-spend.txt each picture a
 * handful - so every sentence here is the server's own (`says`, `where`, `waitedSays`, `clash`,
 * `standingIn`), never one the screen invents.
 *
 * WHO READS WHAT, AND WHAT IS OFFERED, IS THE SERVER'S: a request is in the reader's queue only
 * because the one approval resolver already lets them decide it (the same rule the leave and
 * spending boards use), so every item here may be approved or declined exactly as those boards
 * already do (`leaveBoardApi.decide`/`spendApi.decide`, by `item.suite`).
 *
 * APPROVING SEVERAL AT ONCE sends the same decide call for each selected item, one after another,
 * never together: the engine keeps each answer once and tells each person once either way. If one
 * is refused - another approver answered first, say - that item's own served sentence is shown
 * beside it and the rest carry on. Declining stays one at a time, with its own "Say why (optional)",
 * the same as the leave and spending boards.
 *
 * PAGING, NEVER A HUNDRED ROWS AT ONCE: the page opens with the first 25, oldest first, and "Show
 * more" asks the server for more of the same filtered list (capped at the server's own limit of 100
 * at a time).
 */
const DID_NOT_GO = 'That did not go through, and nothing has changed. Try again.'
const PAGE_STEP = 25
const PAGE_MAX = 100

type SuiteFilter = 'all' | 'leave' | 'spend'

export function QueuePage() {
  const user = useAuthStore(s => s.user)
  const qc = useQueryClient()
  const [suite, setSuite] = useState<SuiteFilter>('all')
  const [pageSize, setPageSize] = useState(PAGE_STEP)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [failures, setFailures] = useState<Record<string, string>>({})
  const [batchProblem, setBatchProblem] = useState<string | null>(null)
  /* What happened to each request in the last "Approve the N selected", kept on screen after the list
     refreshes (Hafsah, 7 October: always show the result for each, and say plainly if any failed). */
  const [results, setResults] = useState<{ id: string; name: string; ok: boolean; message: string | null }[] | null>(null)

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['suite-queue', suite, pageSize],
    queryFn: () => queueApi.get({ page: 1, pageSize, suite: suite === 'all' ? undefined : suite }),
    enabled: !!user,
    retry: false,
    /* Switching the suite tab or pressing "Show more" changes the query key; keeping the last page
       on screen while the new one loads stops the tabs and the list flashing away mid-switch. */
    placeholderData: keepPreviousData,
  })
  const refused = (error as { response?: { status?: number; data?: { message?: string } } } | null)?.response

  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const approveSelected = useMutation({
    mutationFn: async () => {
      const items = (data?.items ?? []).filter(i => selected.has(i.id))
      setProgress({ done: 0, total: items.length })
      const fails: Record<string, string> = {}
      const each: { id: string; name: string; ok: boolean; message: string | null }[] = []
      setResults(null)
      for (const item of items) {
        try {
          await (item.suite === 'leave' ? leaveBoardApi.decide(item.id, 'approve') : spendApi.decide(item.id, 'approve'))
          each.push({ id: item.id, name: item.name, ok: true, message: null })
        } catch (e: any) {
          fails[item.id] = e?.response?.data?.message || DID_NOT_GO
          each.push({ id: item.id, name: item.name, ok: false, message: fails[item.id] })
        }
        setProgress(p => (p ? { ...p, done: p.done + 1 } : p))
      }
      return { fails, each }
    },
    onSuccess: ({ fails, each }) => {
      setBatchProblem(null)
      setFailures(fails)
      setResults(each)
      setSelected(new Set())
      qc.invalidateQueries({ queryKey: ['suite-queue'] })
    },
    /* Each item's own failure is already caught and shown beside it (`fails`, above); this is only
       for something unexpected breaking the batch itself, e.g. the browser losing its connection
       mid-run - never left silent, as every mutation here must say what happened when it failed. */
    onError: () => setBatchProblem(DID_NOT_GO),
    onSettled: () => setProgress(null),
  })

  function afterOne() {
    setFailures({})
    qc.invalidateQueries({ queryKey: ['suite-queue'] })
  }

  function toggleOne(id: string) {
    setSelected(s => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const items = data?.items ?? []
  const allOnPageSelected = items.length > 0 && items.every(i => selected.has(i.id))
  function toggleAllOnPage() {
    setSelected(allOnPageSelected ? new Set() : new Set(items.map(i => i.id)))
  }

  const totalForFilter = data ? (suite === 'all' ? data.counts.all : suite === 'leave' ? data.counts.leave : data.counts.spend) : 0
  const mayShowMore = pageSize < PAGE_MAX && items.length < totalForFilter

  return (
    <Page>
      <PageTitle
        crumbs={[{ label: 'Suites', to: maySeeSuites(user?.role) ? '/settings/suites' : undefined }, { label: 'Waiting for you to decide' }]}
        title="Waiting for you to decide"
      />

      {isLoading && <Note>Loading…</Note>}
      {isError && (
        refused?.status === 403 || refused?.status === 404 ? (
          <Note tone="error"><SuiteOffMessage message={refused.data?.message ?? 'Only people in this organisation can read what waits for them.'} role={user?.role} /></Note>
        ) : (
          <div>
            <Note tone="error">The queue did not load.</Note>
            <Button kind="secondary" size="small" onClick={() => refetch()} disabled={isFetching}>Try again</Button>
          </div>
        )
      )}

      {data && (
        <Section heading="Waiting for approval">
          <p className="gwui-panel-text">{data.says}</p>
          <Tabs
            label="Filter by suite"
            active={suite}
            onChange={(k) => { setSuite(k as SuiteFilter); setPageSize(PAGE_STEP); setSelected(new Set()) }}
            items={[
              { key: 'all', label: 'All' },
              { key: 'leave', label: 'Leave' },
              { key: 'spend', label: 'Spending' },
            ]}
          />

          {items.length > 0 && (
              <>
                <div className="gwui-edge-acts">
                  <label>
                    <input type="checkbox" checked={allOnPageSelected} onChange={toggleAllOnPage} /> Select all on this page
                  </label>
                  <Button
                    kind="secondary" size="small"
                    onClick={() => approveSelected.mutate()}
                    disabled={selected.size === 0 || approveSelected.isPending}
                  >
                    {`Approve the ${selected.size} selected`}
                  </Button>
                </div>
                {progress && <Note>{`Working through ${progress.done} of ${progress.total}…`}</Note>}
                {results && <TheResults results={results} onDone={() => setResults(null)} />}
                {batchProblem && <Note tone="error">{batchProblem}</Note>}

                <RowList label="Waiting for approval">
                  {items.map(item => (
                    <AQueueRow key={item.id} item={item} selected={selected.has(item.id)} onToggle={() => toggleOne(item.id)}
                      failure={failures[item.id] ?? null} onChanged={afterOne} />
                  ))}
                </RowList>

                {mayShowMore && (
                  <Button kind="secondary" size="small" onClick={() => setPageSize(p => Math.min(PAGE_MAX, p + PAGE_STEP))} disabled={isFetching}>
                    Show more
                  </Button>
                )}
              </>
            )}
        </Section>
      )}
    </Page>
  )
}

function AQueueRow({ item, selected, onToggle, failure, onChanged }: {
  item: AQueueItem
  selected: boolean
  onToggle: () => void
  failure: string | null
  onChanged: () => void
}) {
  const [problem, setProblem] = useState<string | null>(null)
  const [declining, setDeclining] = useState(false)
  const [reason, setReason] = useState('')
  const decide = useMutation({
    mutationFn: async (outcome: 'approve' | 'decline'): Promise<unknown> => {
      if (item.suite === 'leave') return leaveBoardApi.decide(item.id, outcome, outcome === 'decline' ? reason.trim() || undefined : undefined)
      return spendApi.decide(item.id, outcome, outcome === 'decline' ? reason.trim() || undefined : undefined)
    },
    onSuccess: () => { setProblem(null); onChanged() },
    onError: (e: any) => setProblem(e?.response?.data?.message || DID_NOT_GO),
  })

  return (
    <Row columns="auto minmax(0, 1fr) auto">
      <input type="checkbox" checked={selected} onChange={onToggle} aria-label={`Select ${item.name}’s request`} />
      <div>
        <b>{item.says}</b>
        <p className="gwui-panel-text">{item.where}</p>
        <p className="gwui-panel-text">{item.waitedSays}</p>
        {item.clash && <p className="gwui-panel-text">{item.clash.says}</p>}
        {item.standingIn && <p className="gwui-panel-text">{item.standingIn.says}</p>}
        {(failure || problem) && <Note tone="error">{failure ?? problem}</Note>}
        {declining && (
          <form className="gwui-suite-ask" onSubmit={e => { e.preventDefault(); decide.mutate('decline') }}>
            <div className="gwui-suite-q">
              <FieldLabel htmlFor={`queue-decline-${item.id}`}>Say why (optional)</FieldLabel>
              <TextArea id={`queue-decline-${item.id}`} rows={2} value={reason} onChange={e => setReason(e.target.value)} maxLength={1000} />
            </div>
            <div className="gwui-edge-acts">
              <Button kind="secondary" size="small" type="submit" disabled={decide.isPending}>Decline</Button>
              <Button kind="quiet" size="small" onClick={() => { setDeclining(false); setReason(''); setProblem(null) }}>Cancel</Button>
            </div>
          </form>
        )}
      </div>
      {!declining && (
        <div className="gwui-edge-acts">
          <Button kind="secondary" size="small" onClick={() => decide.mutate('approve')} disabled={decide.isPending}
            aria-label={`Approve ${item.name}’s request`}>Approve</Button>
          <Button kind="quiet" size="small" onClick={() => setDeclining(true)} disabled={decide.isPending}
            aria-label={`Decline ${item.name}’s request`}>Decline</Button>
        </div>
      )}
    </Row>
  )
}

/* The result of each request in the last batch, and one plain sentence on how many did not go through. */
function TheResults({ results, onDone }: { results: { id: string; name: string; ok: boolean; message: string | null }[]; onDone: () => void }) {
  const failed = results.filter(r => !r.ok)
  const approved = results.length - failed.length
  const counted = (n: number) => (n === 1 ? '1 request' : `${n} requests`)
  const summary = failed.length === 0
    ? `All ${counted(results.length)} were approved.`
    : approved === 0
      ? `None of the ${counted(results.length)} could be approved.`
      : `${counted(approved)} ${approved === 1 ? 'was' : 'were'} approved. ${counted(failed.length)} could not be approved.`
  return (
    <Section heading="What happened">
      <Note tone={failed.length ? 'error' : undefined}>{summary}</Note>
      <RowList label="What happened">
        {results.map(r => (
          <Row key={r.id} columns="minmax(0, 1fr)">
            <span>{r.ok ? `${r.name}’s request was approved.` : `${r.name}’s request was not approved. ${r.message ?? ''}`.trim()}</span>
          </Row>
        ))}
      </RowList>
      <Button kind="quiet" size="small" onClick={onDone}>Clear this</Button>
    </Section>
  )
}
