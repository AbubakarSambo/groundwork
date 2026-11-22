import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queueApi, leaveBoardApi, spendApi, decisionsApi, type AQueueItem, type ADecisionResult } from '@/api/suites'
import { useAuthStore } from '@/stores/auth'
import { Page, PageTitle, Section, Button, Note, Empty, RowList, Row, Tabs, FieldLabel, TextArea, Skeleton } from '@/components/gw/ui'
import { maySeeSuites, SuiteOffMessage, theToneForARefusal } from '@/lib/suite-is-off'
import { useSuitesKnownOffStore } from '@/stores/suites-known-off'
import { useSuitesOnForYou } from '@/hooks/useSuitesOnForYou'
import { TheAttachedFile } from './TheAttachedFile'

/**
 * A LINK TO THE QUEUE, FOR TODAY AND THE SUITES PAGE, ONLY FOR SOMEBODY THE QUEUE SERVES ITEMS TO.
 * Reads the same counts the queue page itself reads (one row, `pageSize: 1`), and draws nothing - no
 * link, no request shown as failed - for a guest, a member nothing waits for, or an organisation with
 * neither suite switched on, since the server refuses or empties those the same way the queue page
 * already handles (a 403/404 here is silently nothing, never an error on a page that is not about
 * the queue).
 */
export function QueueLink({ userId, inline }: { userId?: string; /** Just the link, for a line of links (RequestLinks). */ inline?: boolean }) {
  /* SCREEN FAULT 11: same session-remembered guard as AppShell's sidebar read
     (stores/suites-known-off.ts) - once this session has already been told both suites are off,
     Today and Suites stop asking again. */
  const suitesKnownOff = useSuitesKnownOffStore(s => s.off)
  const setSuitesKnownOff = useSuitesKnownOffStore(s => s.setOff)
  /* The journey of 12 October: an admin with no suite on logged a 404 here on every page. The queue holds
     leave and spending only, so it is asked only once GET /suites/mine (read once) says one is on. */
  const suitesOn = useSuitesOnForYou()
  const { data, isError, error } = useQuery({
    queryKey: ['suite-queue-count'],
    queryFn: () => queueApi.get({ pageSize: 1 }),
    enabled: !!userId && !suitesKnownOff && (suitesOn.leave || suitesOn.spending),
    retry: false,
    staleTime: 30_000,
  })
  useEffect(() => {
    if (isError && (error as any)?.response?.status === 404) setSuitesKnownOff()
  }, [isError, error, setSuitesKnownOff])
  if (!data?.counts?.all) return null
  if (inline) return <Link className="gwui-plain-link" to="/suite/queue">See everything waiting for you to decide</Link>
  return <p className="gwui-panel-text"><Link className="gwui-plain-link" to="/suite/queue">See everything waiting for you to decide</Link></p>
}

/**
 * YOUR OWN REQUESTS, AND EVERYTHING WAITING FOR YOU TO DECIDE, AS ONE LINE (the design pass, 21 November 2026). Today and Suites
 * each drew the two as lone bold links at the foot of the page, far from anything they belong to. This is the one part both use:
 * the two links side by side in the normal link style, put where they mean something (beside "What needs you" on Today, on the
 * title's line on Suites). Each page still decides whether "Your own requests" shows, from the suites that are on for the reader.
 */
export function RequestLinks({ userId, requests }: { userId?: string; requests: { show: boolean; label: string } }) {
  return (
    <span className="dp-links dp-links-quiet">
      {requests.show && <Link className="gwui-plain-link" to="/suite/mine">{requests.label}</Link>}
      <QueueLink userId={userId} inline />
    </span>
  )
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
 * APPROVING SEVERAL AT ONCE now sends the batch route the engine built for it (`POST
 * /suites/decisions`, docs/answers-from-engine.md "For the screens: the batch decision, ready"),
 * one call for up to 50 answers at a time, in order, and one that fails never stops the rest
 * (`DecisionsInABatchService`). More than 50 selected go in chunks of 50, one call after another,
 * with "Working through 50 of 120…" shown while they run. Each result's own served sentence (`says`)
 * is shown word for word, beside the request's name when `says` does not already name them, and a
 * failed one is marked plainly as not done. The summary is the served top `says` for one call, or,
 * across several chunks, one line of our own that adds them up in the same form. A whole-call
 * refusal (none selected, an outsider, no suite on) shows its served sentence and changes nothing.
 * Declining stays one at a time, with its own optional reason, named for who reads it, the same as
 * the leave and spending boards.
 *
 * PAGING, NEVER A HUNDRED ROWS AT ONCE: the page opens with the first 25, oldest first, and "Show
 * more" asks the server for more of the same filtered list (capped at the server's own limit of 100
 * at a time).
 */
const DID_NOT_GO = 'That did not go through, and nothing has changed. Try again.'
const PAGE_STEP = 25
const PAGE_MAX = 100
const MOST_IN_A_CALL = 50

type SuiteFilter = 'all' | 'leave' | 'spend'

/** One result from the batch call, with the selected request's own name beside it for display. */
type ADecisionRow = ADecisionResult & { name: string | null; firstName: string | null }

/** "0" through "10" in words, as the engine's own sentences do; past ten, the number itself. */
const NUMBER_WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten']
const inWords = (n: number) => (n >= 0 && n <= 10 ? NUMBER_WORDS[n] : String(n))
const capital = (s: string) => `${s.charAt(0).toUpperCase()}${s.slice(1)}`

/**
 * OUR OWN ROLL-UP, FOR SEVERAL CHUNKS ONLY, in the exact form the engine's single-call `says` uses
 * (`the-decisions-in-a-batch.service.ts`), so a batch of more than 50 reads no differently from one
 * the engine answered in a single call.
 */
function addedUp(results: ADecisionResult[]): string {
  const total = results.length
  const answered = results.filter(r => r.ok).length
  const left = total - answered
  if (!left) return total === 1 ? 'The answer was kept.' : `All ${inWords(total)} answers were kept.`
  if (!answered) return total === 1 ? 'The answer could not be kept, and it says why.' : `None of the ${inWords(total)} answers could be kept, and each says why.`
  return `${capital(inWords(answered))} of the ${inWords(total)} answers ${answered === 1 ? 'was' : 'were'} kept. ${capital(inWords(left))} could not be kept, and ${left === 1 ? 'it says' : 'each says'} why.`
}

/**
 * SCREEN FAULT 7 (FINAL WALK), ITEM 1: OUR OWN SHORT SENTENCE, FIRST. Approving two used to open
 * straight on the served "All two answers were kept." - true, but the engine's summary line, not a
 * plain line about what the person just did. This says that first, in our own words, only when
 * every one of them actually went through (a partial result's own served sentence already explains
 * itself, and nothing here should claim "all" when some did not go through).
 */
function youApprovedLine(total: number, approved: number): string | null {
  if (approved !== total || total === 0) return null
  return total === 2 ? 'You approved both.' : `You approved all ${inWords(total)}.`
}

/** The served `says`, with the request's name beside it only when `says` does not already name them. */
function lineFor(r: ADecisionRow): string {
  const named = !!r.name && (r.says.includes(r.name) || (!!r.firstName && r.says.includes(r.firstName)))
  /* Full sentences, never a name joined on with a colon (CLAUDE.md's wording rule). */
  /* A kept answer's served sentence always names the person ("You approved Peter's …"). */
  if (r.ok) return r.says
  return r.name && !named ? `${r.name}’s request was not done. ${r.says}` : `This one was not done. ${r.says}`
}

export function QueuePage() {
  const user = useAuthStore(s => s.user)
  const qc = useQueryClient()
  const [params] = useSearchParams()
  const fromParams = params.get('suite')
  const [suite, setSuite] = useState<SuiteFilter>(fromParams === 'leave' || fromParams === 'spend' ? fromParams : 'all')
  const [pageSize, setPageSize] = useState(PAGE_STEP)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [batchProblem, setBatchProblem] = useState<string | null>(null)
  /* What happened to each request in the last "Approve the N selected", kept on screen after the list
     refreshes (Hafsah, 7 October: always show the result for each, and say plainly if any failed;
     6 October's batch route: the rows and the summary are the server's own `says`). */
  const [results, setResults] = useState<{ rows: ADecisionRow[]; summary: string } | null>(null)
  /*
   * SCREEN FAULT 7 (FINAL WALK), ITEM 2: A DECLINE SHOWED NOTHING AT ALL. `leaveBoardApi.decide`/
   * `spendApi.decide` return the whole board, not a sentence confirming what just happened, and
   * the row that was declined disappears the moment the list refreshes - so without state kept
   * here, in the parent, any confirmation built in the row would vanish with it. Kept the same way
   * the batch results are: set on success, cleared by the person or the next decision.
   */
  const [declined, setDeclined] = useState<string | null>(null)

  const suitesOn = useSuitesOnForYou()
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['suite-queue', suite, pageSize],
    queryFn: () => queueApi.get({ page: 1, pageSize, suite: suite === 'all' ? undefined : suite }),
    enabled: !!user && suitesOn.known && user.role !== 'GUEST' && (suitesOn.leave || suitesOn.spending),
    retry: false,
    /* Switching the suite tab or pressing "Show more" changes the query key; keeping the last page
       on screen while the new one loads stops the tabs and the list flashing away mid-switch. */
    placeholderData: keepPreviousData,
  })
  const refusedBeforeAsking = !suitesOn.known ? null
    : user?.role === 'GUEST' ? 'Only people in this organisation can read what waits for them.'
      : !suitesOn.leave && !suitesOn.spending ? 'Neither leave nor spending is switched on. An admin switches it on under Suites.' : null
  const refused = (error as { response?: { status?: number; data?: { message?: string } } } | null)?.response

  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const approveSelected = useMutation({
    mutationFn: async () => {
      const items = (data?.items ?? []).filter(i => selected.has(i.id))
      const total = items.length
      setResults(null)
      setDeclined(null)
      setProgress(total > MOST_IN_A_CALL ? { done: 0, total } : null)
      const named = new Map<string, AQueueItem>(items.map(i => [`${i.suite}|${i.id}`, i]))
      const all: ADecisionResult[] = []
      const sayings: string[] = []
      for (let start = 0; start < items.length; start += MOST_IN_A_CALL) {
        const chunk = items.slice(start, start + MOST_IN_A_CALL)
        const res = await decisionsApi.decide(chunk.map(i => ({ suite: i.suite, id: i.id, answer: 'approve' as const })))
        all.push(...res.results)
        sayings.push(res.says)
        if (total > MOST_IN_A_CALL) setProgress({ done: Math.min(start + chunk.length, total), total })
      }
      const rows: ADecisionRow[] = all.map(r => {
        const item = r.suite ? named.get(`${r.suite}|${r.id}`) : undefined
        return { ...r, name: item?.name ?? null, firstName: item?.firstName ?? null }
      })
      /* One call: the served top `says` stands as the summary. Several chunks: our own line, added
         up in the same form, so a batch of more than 50 reads no differently from one. */
      const summary = sayings.length === 1 ? sayings[0] : addedUp(all)
      return { rows, summary }
    },
    onSuccess: ({ rows, summary }) => {
      setBatchProblem(null)
      setResults({ rows, summary })
      setSelected(new Set())
      qc.invalidateQueries({ queryKey: ['suite-queue'] })
    },
    /* A whole-call refusal (none selected, an outsider, no suite on): shown as served, and nothing
       changes - the selection and the list stand exactly as they were. */
    onError: (e: any) => setBatchProblem(e?.response?.data?.message || DID_NOT_GO),
    onSettled: () => setProgress(null),
  })

  function afterOne() {
    qc.invalidateQueries({ queryKey: ['suite-queue'] })
  }

  function afterDecline(message: string) {
    setResults(null)
    setDeclined(message)
    afterOne()
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

      {(isLoading || (!!user && !suitesOn.known)) && <Skeleton what="Getting this page" shape="rows" />}
      {/* Refused before asking, by the rule the server serves on /suites/mine, in the words the server would say (page loads, 22 November 2026). */}
      {refusedBeforeAsking && <Note tone={theToneForARefusal(refusedBeforeAsking)}><SuiteOffMessage message={refusedBeforeAsking} role={user?.role} /></Note>}
      {isError && (
        refused?.status === 403 || refused?.status === 404 ? (
          <Note tone={theToneForARefusal(refused.data?.message ?? 'Only people in this organisation can read what waits for them.')}><SuiteOffMessage message={refused.data?.message ?? 'Only people in this organisation can read what waits for them.'} role={user?.role} /></Note>
        ) : (
          <div>
            <Note tone="error">The queue did not load.</Note>
            <Button kind="secondary" size="small" onClick={() => refetch()} disabled={isFetching}>Try again</Button>
          </div>
        )
      )}

      {data && (
        /*
         * SCREEN FAULT 7 (FINAL WALK), ITEM 3: ONE HEADING, NOT TWO. "Waiting for you to decide"
         * (the page's own title, above) was followed immediately by a second heading, "Waiting for
         * approval" - the same claim twice, in two different headings, on one screen. `Section`
         * always draws a heading (it is a named landmark by it), so this keeps the same body
         * classes without a second `<h2>`, rather than giving `Section` an optional heading just
         * for this one page.
         */
        <div className="sec">
          <div>
          <p className="gwui-panel-text">{data.says}</p>
          <Tabs
            label="Filter by suite"
            active={suite}
            onChange={(k) => { setSuite(k as SuiteFilter); setPageSize(PAGE_STEP); setSelected(new Set()); setDeclined(null) }}
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
                {progress && <Note>{`Working through ${progress.done} of ${progress.total}…`}</Note>}
                {results && <TheResults results={results} onDone={() => setResults(null)} />}
                {batchProblem && <Note tone="error">{batchProblem}</Note>}
                {/* Screen fault 7, item 2: a decline now says so, rather than the row simply vanishing. */}
                {declined && <Note>{declined}</Note>}

                <RowList label="Waiting for approval">
                  {items.map(item => (
                    <AQueueRow key={item.id} item={item} selected={selected.has(item.id)} onToggle={() => toggleOne(item.id)}
                      onChanged={afterOne} onDeclined={afterDecline} />
                  ))}
                </RowList>

                {mayShowMore && (
                  <Button kind="secondary" size="small" onClick={() => setPageSize(p => Math.min(PAGE_MAX, p + PAGE_STEP))} disabled={isFetching}>
                    Show more
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
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

function AQueueRow({ item, selected, onToggle, onChanged, onDeclined }: {
  item: AQueueItem
  selected: boolean
  onToggle: () => void
  onChanged: () => void
  /** Screen fault 7, item 2: told the confirmation sentence once a decline actually goes through. */
  onDeclined: (message: string) => void
}) {
  const [problem, setProblem] = useState<string | null>(null)
  const [declining, setDeclining] = useState(false)
  const [reason, setReason] = useState('')
  const decide = useMutation({
    mutationFn: async (outcome: 'approve' | 'decline'): Promise<unknown> => {
      if (item.suite === 'leave') return leaveBoardApi.decide(item.id, outcome, outcome === 'decline' ? reason.trim() || undefined : undefined)
      return spendApi.decide(item.id, outcome, outcome === 'decline' ? reason.trim() || undefined : undefined)
    },
    onSuccess: (_data, outcome) => {
      setProblem(null)
      /*
       * SCREEN FAULT 7 (FINAL WALK), ITEM 2: A DECLINE SHOWED NOTHING. Neither `leaveBoardApi`
       * nor `spendApi`'s `decide` returns a confirmation sentence (they answer with the whole
       * board), so there is no served line to show here - this is the plain, true fallback the
       * task calls for, named for who reads it, the same as the reason field already is.
       */
      if (outcome === 'decline') {
        onDeclined(reason.trim()
          ? `You declined ${item.firstName}’s request. ${item.firstName} will read your reason.`
          : `You declined ${item.firstName}’s request.`)
      }
      onChanged()
    },
    onError: (e: any) => setProblem(e?.response?.data?.message || DID_NOT_GO),
  })

  return (
    <Row columns="auto minmax(0, 1fr) auto">
      <input type="checkbox" checked={selected} onChange={onToggle} aria-label={`Select ${item.name}’s request`} />
      <div>
        <b>{item.says}</b>
        {/*
          SCREEN FAULT 7 (FINAL WALK), ITEM 4: "IT IS WAITING FOR YOU." REPEATED ON EVERY ROW. The
          whole page is already "Waiting for you to decide" - every row saying so again added
          nothing. `item.where` can also read "Wairimu has approved it, and it is now waiting for
          you." (an earlier step's own approval, on its way to this reader), which still says
          something this page does not - that form is kept.
        */}
        {item.where !== 'It is waiting for you.' && <p className="gwui-panel-text">{item.where}</p>}
        <p className="gwui-panel-text">{item.waitedSays}</p>
        {item.clash && <p className="gwui-panel-text">{item.clash.says}</p>}
        {item.standingIn && <p className="gwui-panel-text">{item.standingIn.says}</p>}
        {item.attached && <TheAttachedFile a={item.attached} firstName={item.firstName} />}
        {problem && <Note tone="error">{problem}</Note>}
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
 * THROUGH. The batch route (6 October, the engine's "the batch decision, ready") now answers each
 * request itself, in a full sentence (`says`), so every row and the top summary are the server's own
 * words, never ones this screen works out - only the roll-up across several chunks is ours
 * (`addedUp`, in the same form).
 */
function TheResults({ results, onDone }: { results: { rows: ADecisionRow[]; summary: string }; onDone: () => void }) {
  const anyFailed = results.rows.some(r => !r.ok)
  const leadIn = youApprovedLine(results.rows.length, results.rows.filter(r => r.ok).length)
  return (
    <Section heading="What happened">
      {/* Screen fault 7, item 1: our own short sentence first, then the engine's served summary. */}
      {leadIn && <p className="gwui-panel-text">{leadIn}</p>}
      <Note tone={anyFailed ? 'error' : undefined}>{results.summary}</Note>
      <RowList label="What happened">
        {results.rows.map((r, i) => (
          <Row key={`${r.suite ?? 'unknown'}-${r.id}-${i}`} columns="minmax(0, 1fr)">
            <span>{lineFor(r)}</span>
          </Row>
        ))}
      </RowList>
      <Button kind="quiet" size="small" onClick={onDone}>Clear this</Button>
    </Section>
  )
}
