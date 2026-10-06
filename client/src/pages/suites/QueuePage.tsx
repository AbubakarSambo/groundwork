import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queueApi, leaveBoardApi, spendApi, type AQueueItem } from '@/api/suites'
import { useAuthStore } from '@/stores/auth'
import { Page, PageTitle, Section, Button, Note, Empty, RowList, Row, Tabs, FieldLabel, TextArea } from '@/components/gw/ui'
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
  return <p className="gwui-panel-text"><Link className="gwui-plain-link" to="/suite/queue">See everything waiting for you to decide</Link></p>
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
 * beside it and the rest carry on. Declining stays one at a time, with its own optional reason,
 * named for who reads it, the same as the leave and spending boards.
 *
 * PAGING, NEVER A HUNDRED ROWS AT ONCE: the page opens with the first 25, oldest first, and "Show
 * more" asks the server for more of the same filtered list (capped at the server's own limit of 100
 * at a time).
 */
const DID_NOT_GO = 'That did not go through, and nothing has changed. Try again.'
const WAIT_A_MOMENT = 'Waiting a moment before carrying on…'
const SENT_TOO_FAST = 'This one could not be sent just now. Try it again in a minute.'
const ALREADY_DECIDED_SAYS = 'This request has already been decided.'
const PAGE_STEP = 25
const PAGE_MAX = 100

type SuiteFilter = 'all' | 'leave' | 'spend'

type ARequestResult = { id: string; name: string; ok: boolean; message: string | null; alreadyDecided: boolean }

/** "0" through "10" in words, as the queue's own sentences do; past ten, the number itself. */
const NUMBER_WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten']
const inWords = (n: number) => (n >= 0 && n <= 10 ? NUMBER_WORDS[n] : String(n))
const capital = (s: string) => `${s.charAt(0).toUpperCase()}${s.slice(1)}`

/** A refusal that means "somebody else already decided this", whichever way the server said it: a 409, or its own "already decided" sentence. */
function isAlreadyDecided(status: number | undefined, message: string | undefined): boolean {
  return status === 409 || message === ALREADY_DECIDED_SAYS
}

const wait = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms))

/**
 * SENDS ONE DECIDE CALL, WAITING OUT THE RATE LIMIT (fault 2d of the live walk). Approving several
 * sends one request per item, and the API allows 60 a minute - at a hundred people, a long batch can
 * run into it. On a 429, wait (the server's own `Retry-After`, or 10 seconds with none) and try that
 * one request again, up to 3 times in all, before counting it as not sent.
 */
async function sendIt(fn: () => Promise<unknown>, onWaiting: () => void): Promise<{ ok: true } | { ok: false; status?: number; rawMessage?: string; tooFast?: boolean }> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await fn()
      return { ok: true }
    } catch (e: any) {
      const status = e?.response?.status
      if (status === 429) {
        if (attempt < 2) {
          onWaiting()
          const retryAfter = Number(e?.response?.headers?.['retry-after'])
          await wait((Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : 10) * 1000)
          continue
        }
        return { ok: false, status, tooFast: true }
      }
      return { ok: false, status, rawMessage: e?.response?.data?.message }
    }
  }
  return { ok: false, tooFast: true }
}

export function QueuePage() {
  const user = useAuthStore(s => s.user)
  const qc = useQueryClient()
  const [params] = useSearchParams()
  const fromParams = params.get('suite')
  const [suite, setSuite] = useState<SuiteFilter>(fromParams === 'leave' || fromParams === 'spend' ? fromParams : 'all')
  const [pageSize, setPageSize] = useState(PAGE_STEP)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [failures, setFailures] = useState<Record<string, string>>({})
  const [batchProblem, setBatchProblem] = useState<string | null>(null)
  /* What happened to each request in the last "Approve the N selected", kept on screen after the list
     refreshes (Hafsah, 7 October: always show the result for each, and say plainly if any failed). */
  const [results, setResults] = useState<ARequestResult[] | null>(null)

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
  const [waitingOnARetry, setWaitingOnARetry] = useState(false)
  const approveSelected = useMutation({
    mutationFn: async () => {
      const items = (data?.items ?? []).filter(i => selected.has(i.id))
      setProgress({ done: 0, total: items.length })
      const fails: Record<string, string> = {}
      const each: ARequestResult[] = []
      setResults(null)
      for (const item of items) {
        const outcome = await sendIt(
          () => (item.suite === 'leave' ? leaveBoardApi.decide(item.id, 'approve') : spendApi.decide(item.id, 'approve')),
          () => setWaitingOnARetry(true),
        )
        setWaitingOnARetry(false)
        if (outcome.ok) {
          each.push({ id: item.id, name: item.name, ok: true, message: null, alreadyDecided: false })
        } else {
          const alreadyDecided = isAlreadyDecided(outcome.status, outcome.rawMessage)
          const message = outcome.tooFast
            ? SENT_TOO_FAST
            : alreadyDecided
              ? `${item.name}’s request had already been decided by someone else, so nothing changed.`
              : (outcome.rawMessage || DID_NOT_GO)
          fails[item.id] = message
          each.push({ id: item.id, name: item.name, ok: false, message, alreadyDecided })
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
    onSettled: () => { setProgress(null); setWaitingOnARetry(false) },
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

          {/* "All" is already covered by the server's own top sentence above; a filtered tab with
              nothing in it said nothing at all until now (fault 2b of the live walk). */}
          {items.length === 0 && suite !== 'all' && <Empty>{emptyQueueSays(suite)}</Empty>}

          {items.length > 0 && (
              <>
                <div className="gwui-edge-acts">
                  <label>
                    <input type="checkbox" checked={allOnPageSelected} onChange={toggleAllOnPage} /> Select all on this page
                  </label>
                  {/* Fault 2a of the live walk: "Approve the 0 selected" used to show, disabled, before
                      anybody had ticked anything - a button offering nothing to do. It now only
                      appears once something is selected; a quiet line stands in for it until then. */}
                  {selected.size > 0 ? (
                    <Button
                      kind="secondary" size="small"
                      onClick={() => approveSelected.mutate()}
                      disabled={approveSelected.isPending}
                    >
                      {`Approve the ${selected.size} selected`}
                    </Button>
                  ) : (
                    <p className="gwui-panel-text-muted">Tick the requests you want to approve together.</p>
                  )}
                </div>
                {progress && <Note>{waitingOnARetry ? WAIT_A_MOMENT : `Working through ${progress.done} of ${progress.total}…`}</Note>}
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

/** Fault 2b of the live walk: a tab with nothing in it used to show a blank panel under the tabs. */
function emptyQueueSays(suite: SuiteFilter): string {
  if (suite === 'leave') return 'Nothing about leave is waiting for you.'
  if (suite === 'spend') return 'Nothing about spending is waiting for you.'
  return 'Nothing is waiting for you to approve or decline.'
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
              {/* Still optional, as the engine allows; naming who reads it (fault 2e of the live walk). */}
              <FieldLabel htmlFor={`queue-decline-${item.id}`}>{`Say why. ${item.firstName} will read it.`}</FieldLabel>
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

/*
 * THE RESULT OF EACH REQUEST IN THE LAST BATCH, AND ONE PLAIN SENTENCE ON HOW MANY DID NOT GO
 * THROUGH. Fault 2c of the live walk: a request someone else had already decided used to read "X's
 * request was not approved. This request has already been decided.", and was counted the same as any
 * other failure. It now has its own plain sentence, and its own count in the summary, apart from a
 * genuine failure.
 */
function TheResults({ results, onDone }: { results: ARequestResult[]; onDone: () => void }) {
  const already = results.filter(r => !r.ok && r.alreadyDecided)
  const otherFailed = results.filter(r => !r.ok && !r.alreadyDecided)
  const approved = results.length - already.length - otherFailed.length
  const counted = (n: number) => (n === 1 ? '1 request' : `${n} requests`)
  const summary = already.length === 0
    ? (otherFailed.length === 0
      ? `All ${counted(results.length)} were approved.`
      : approved === 0
        ? `None of the ${counted(results.length)} could be approved.`
        : `${counted(approved)} ${approved === 1 ? 'was' : 'were'} approved. ${counted(otherFailed.length)} could not be approved.`)
    : [
      approved ? `${capital(inWords(approved))} ${approved === 1 ? 'was' : 'were'} approved.` : null,
      `${capital(inWords(already.length))} had already been decided by someone else.`,
      otherFailed.length ? `${capital(inWords(otherFailed.length))} could not be approved.` : null,
    ].filter(Boolean).join(' ')
  return (
    <Section heading="What happened">
      <Note tone={already.length || otherFailed.length ? 'error' : undefined}>{summary}</Note>
      <RowList label="What happened">
        {results.map(r => (
          <Row key={r.id} columns="minmax(0, 1fr)">
            <span>{r.ok ? `${r.name}’s request was approved.` : r.alreadyDecided ? r.message : `${r.name}’s request was not approved. ${r.message ?? ''}`.trim()}</span>
          </Row>
        ))}
      </RowList>
      <Button kind="quiet" size="small" onClick={onDone}>Clear this</Button>
    </Section>
  )
}
