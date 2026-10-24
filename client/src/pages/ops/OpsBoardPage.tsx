import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { opsApi, type OpsNumber } from '@/api/ops'
import { Adder } from './OpsForm'
import { whenItWas } from '@/lib/a-date-reads-the-same-everywhere'

/**
 * The back office board.
 *
 * One rule shapes this whole page: every number opens onto the rows that made
 * it. There is no card here that shows a figure and stops — clicking one shows
 * the records, because a number nobody can check is a claim, and a page full of
 * claims is where a team starts arguing about whether a figure is right instead
 * of about what to do.
 */

const CARD: React.CSSProperties = {
  background: 'white',
  border: '1px solid var(--gw-border)',
  borderRadius: 8,
  padding: '12px 14px',
}
const LABEL: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: 'var(--gw-muted)',
  textTransform: 'uppercase',
  letterSpacing: '.08em',
}

/** Values arrive as numbers; money and percentages want reading differently. */
function readable(number: OpsNumber): string {
  if (number.unit === 'USD') return `$${number.value.toLocaleString()}`
  if (number.unit === '%') return `${number.value}%`
  return String(number.value)
}

function Rows({ rows }: { rows: Array<Record<string, unknown>> }) {
  const columns = [...new Set(rows.flatMap((r) => Object.keys(r)))]
  const show = (value: unknown) => {
    if (value === null || value === undefined) return ' - '
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
      return whenItWas(value, 'day')
    }
    /*
     * A stage arrives as the enum the database stores. Showing LINED_UP and
     * GAP_IDENTIFIED to a person reading their own board is the drill-down
     * version of handing them a UUID: technically the value, practically a
     * thing they have to translate.
     */
    if (typeof value === 'string' && /^[A-Z][A-Z0-9_]{2,}$/.test(value)) {
      return value.replace(/_/g, ' ').toLowerCase()
    }
    return String(value)
  }

  return (
    <div style={{ overflowX: 'auto', marginTop: 10 }}>
      <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 12.5 }}>
        <thead>
          <tr>
            {columns.map((c) => (
              <th
                key={c}
                style={{ ...LABEL, textAlign: 'left', padding: '6px 10px 6px 0', whiteSpace: 'nowrap' }}
              >
                {c.replace(/([A-Z])/g, ' $1').toLowerCase()}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ borderTop: '1px solid var(--gw-border)' }}>
              {columns.map((c) => (
                <td key={c} style={{ padding: '7px 10px 7px 0', verticalAlign: 'top' }}>
                  {show(row[c])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Number({ number }: { number: OpsNumber }) {
  const [open, setOpen] = useState(false)
  /*
   * A number with nothing behind it is not clickable.
   *
   * The first render said "OPEN THE 0 ROWS" on nine cards out of eleven, which
   * is an invitation to open nothing eleven times before you learn to ignore
   * the line. The sentence underneath already says what happened - "nothing
   * overdue", "nobody is blocked" - and that is the whole answer.
   */
  const hasEvidence = number.rows.length > 0

  const face = (
    <>
      <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--gw-navy)' }}>{readable(number)}</div>
      <div style={{ fontSize: 12.5, color: 'var(--gw-navy)', marginTop: 2, fontWeight: 600 }}>
        {number.label}
      </div>
      <div style={{ fontSize: 12, color: 'var(--gw-sub)', marginTop: 4 }}>{number.says}</div>
      {hasEvidence && (
        <div style={{ ...LABEL, marginTop: 8, fontSize: 10 }}>
          {open ? 'Hide the rows' : `Open the ${number.rows.length} row${number.rows.length === 1 ? '' : 's'}`}
        </div>
      )}
    </>
  )

  return (
    <div style={{ ...CARD, gridColumn: open ? '1 / -1' : undefined }}>
      {hasEvidence ? (
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          style={{
            all: 'unset',
            cursor: 'pointer',
            display: 'block',
            width: '100%',
            boxSizing: 'border-box',
          }}
        >
          {face}
        </button>
      ) : (
        face
      )}

      {open && (
        <div style={{ borderTop: '1px solid var(--gw-border)', marginTop: 10, paddingTop: 8 }}>
          <p style={{ fontSize: 12, color: 'var(--gw-sub)', margin: 0 }}>{number.counts}</p>
          <Rows rows={number.rows} />
        </div>
      )}
    </div>
  )
}


/**
 * Where somebody stands against their own target.
 *
 * A contributor's real number is not a metric — a metric is one figure for the
 * whole company, and this one has a different answer for every person. It is
 * also the only reason most of them open this at all, so it is the first thing
 * on their board rather than a link somewhere.
 */
function YourStanding({ personKey }: { personKey: string }) {
  const standing = useQuery({
    queryKey: ['ops', 'standing', personKey],
    queryFn: () => opsApi.standing(personKey),
    retry: false,
  })

  if (!standing.data) return null
  const { targets, counted, notYetCounting, qualifyingLine } = standing.data

  return (
    <section style={{ ...CARD, marginBottom: 12 }}>
      <p style={LABEL}>What you brought</p>
      {targets.map((t) => (
        <div key={t.periodKey + String(t.isTargetListExpectation)} style={{ marginTop: 8 }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--gw-navy)' }}>
            {t.countedSoFar} of {t.targetCount}
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--gw-sub)' }}>
            {t.isTargetListExpectation ? 'this list' : t.period} · by{' '}
            {whenItWas(t.dueDate, 'day')}
          </div>
        </div>
      ))}

      {counted.length > 0 && (
        <p style={{ fontSize: 13, marginTop: 10, marginBottom: 0 }}>
          Counting: {counted.map((c) => c.company).join(', ')}
        </p>
      )}

      {notYetCounting.length > 0 && (
        /*
         * The sentence that explains a zero, so it gets written properly.
         *
         * The first version read "Not counting yet, because the line is ready:
         * Talbot Works (introduced)" - which parses as the LINE being ready and
         * says nothing about what to do. A contributor looking at 0 of 6 needs
         * to know their introduction is fine and what has to happen to it, not
         * be shown the name of a setting.
         */
        <p style={{ fontSize: 13, marginTop: 8, marginBottom: 0, color: 'var(--gw-sub)' }}>
          {notYetCounting.map((c) => c.company).join(', ')}{' '}
          {notYetCounting.length === 1 ? 'is' : 'are'} not counted yet.{' '}
          {notYetCounting.length === 1 ? 'It counts' : 'They count'} once sales moves{' '}
          {notYetCounting.length === 1 ? 'it' : 'them'} to {qualifyingLine.toLowerCase()}.
        </p>
      )}
    </section>
  )
}

function YourTodos({ personKey }: { personKey: string }) {
  const todos = useQuery({
    queryKey: ['ops', 'todos', personKey],
    queryFn: () => opsApi.todos(personKey),
    retry: false,
  })
  const queryClient = useQueryClient()
  const close = useMutation({
    mutationFn: (id: string) => opsApi.closeTodo(id, 'DONE'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ops', 'todos', personKey] }),
  })

  const open = (todos.data ?? []).filter((t) => t.status === 'OPEN')

  /*
   * SHOWN EVEN WHEN EMPTY, NOW THAT THERE IS SOMETHING TO DO HERE.
   *
   * It returned null on an empty list, which was right when the panel could
   * only ever list. `POST /ops/todos` was built and called by nothing, so the
   * one place a person keeps their own next actions could read them and never
   * take one — and hiding the panel hid the only place to add one.
   */
  return (
    <section style={{ ...CARD, marginBottom: 12 }}>
      <p style={LABEL}>Your to-dos</p>
      <div style={{ marginTop: 8 }}>
        <Adder
          title="Add one"
          fields={[
            { name: 'title', label: 'What needs doing', required: true },
            { name: 'dueDate', label: 'By when', type: 'date' },
            { name: 'notes', label: 'Anything worth remembering', type: 'textarea' },
          ]}
          submit={(v) =>
            opsApi.addTodo({
              title: v.title,
              dueDate: v.dueDate || undefined,
              notes: v.notes || undefined,
            })
          }
          invalidate={[['ops', 'todos', personKey]]}
          submitLabel="Add it"
        />
      </div>
      {open.length === 0 && (
        <p style={{ fontSize: 13, color: 'var(--gw-sub)', margin: '8px 0 0' }}>Nothing outstanding.</p>
      )}
      <ul style={{ listStyle: 'none', margin: '8px 0 0', padding: 0 }}>
        {open.map((t) => (
          <li key={t.id} style={{ display: 'flex', gap: 10, alignItems: 'baseline', padding: '4px 0' }}>
            <button className="btn sec sm"
              type="button"
              onClick={() => close.mutate(t.id)}
              aria-label={`Mark "${t.title}" done`}
            >
              Done
            </button>
            <span style={{ fontSize: 13 }}>{t.title}</span>
            {t.dueDate && (
              <span style={{ fontSize: 12, color: 'var(--gw-sub)', marginLeft: 'auto' }}>
                {whenItWas(t.dueDate, 'day')}
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}

function WaitingOnYou() {
  const approvals = useQuery({ queryKey: ['ops', 'approvals'], queryFn: opsApi.approvals, retry: false })
  const queryClient = useQueryClient()
  const decide = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'APPROVED' | 'CHANGES_REQUESTED' | 'REJECTED' }) =>
      opsApi.decide(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ops'] }),
  })

  /*
   * SPEND CLAIMS TOO, because a claim nobody knows about is a claim that sits.
   *
   * "Waiting on you" was build approvals only, so a spend claim at REQUESTED reached nobody: the
   * approver found out by opening the spend page and looking for it. They are a separate list
   * rather than mixed in, because the decisions are different verbs - approve/reject a claim is
   * not the same control as approving a build record, and one list with two behaviours is how a
   * button ends up doing the wrong thing.
   */
  const spend = useQuery({ queryKey: ['ops', 'spend-waiting'], queryFn: opsApi.spendWaitingOnMe, retry: false })
  const claims = spend.data?.claims ?? []

  const waiting = approvals.data ?? []
  if (waiting.length === 0 && claims.length === 0) return null

  return (
    <section style={{ ...CARD, marginBottom: 12 }}>
      <p style={LABEL}>Waiting on you</p>

      {claims.length > 0 && (
        <ul style={{ listStyle: 'none', margin: '8px 0 0', padding: 0 }}>
          {claims.map((c) => (
            <li key={c.id} style={{ padding: '8px 0', borderTop: '1px solid var(--gw-border)', display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'baseline' }}>
              <span style={{ fontSize: 13 }}>
                {c.who} claimed <strong>${c.amount.toLocaleString()}</strong> for {c.description}
                {c.waitingDays > 0 && (
                  <span style={{ color: 'var(--gw-sub)' }}> &middot; waiting {c.waitingDays} {c.waitingDays === 1 ? 'day' : 'days'}</span>
                )}
              </span>
              <a href="/ops/spend" style={{ fontSize: 12, color: 'var(--gw-navy)', whiteSpace: 'nowrap' }}>Decide &rarr;</a>
            </li>
          ))}
        </ul>
      )}

      <ul style={{ listStyle: 'none', margin: '8px 0 0', padding: 0 }}>
        {waiting.map((a) => (
          <li key={a.id} style={{ padding: '8px 0', borderTop: '1px solid var(--gw-border)' }}>
            <div style={{ fontSize: 13 }}>{a.requestSummary}</div>
            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
              {(['APPROVED', 'CHANGES_REQUESTED', 'REJECTED'] as const).map((status) => (
                <button className="btn sec sm"
                  key={status}
                  type="button"
                  onClick={() => decide.mutate({ id: a.id, status })}
                >
                  {status === 'APPROVED' ? 'Approve' : status === 'REJECTED' ? 'No' : 'Changes'}
                </button>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default function OpsBoardPage() {
  const [period, setPeriod] = useState('sept-2026-target-list')
  const [chosen, setChosen] = useState<string | null>(null)

  const me = useQuery({ queryKey: ['ops', 'me'], queryFn: opsApi.me, retry: false })
  const listing = useQuery({ queryKey: ['ops', 'boards'], queryFn: opsApi.boards, retry: false })
  const periods = useQuery({ queryKey: ['ops', 'periods'], queryFn: opsApi.periods, retry: false })

  const boardKey = chosen ?? listing.data?.lands ?? null
  const board = useQuery({
    queryKey: ['ops', 'board', boardKey, period],
    queryFn: () => opsApi.board(boardKey as string, period),
    enabled: Boolean(boardKey),
  })

  if (me.isError) {
    return (
      <section style={{ padding: 40, maxWidth: 640 }}>
        <h1 style={{ fontSize: 20, marginBottom: 8 }}>This is not your system</h1>
        <p style={{ fontSize: 14, color: 'var(--gw-sub)' }}>
          You are signed in, but you are not set up in the Groundwork team's operating system. That is
          a separate list from your Groundwork account.
        </p>
      </section>
    )
  }

  return (
    <section style={{ padding: '28px 32px', maxWidth: 1100, margin: '0 auto' }}>
      <header style={{ marginBottom: 18 }}>
        <p style={LABEL}>The team's operating system</p>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--gw-navy)', margin: '4px 0 2px' }}>
          {board.data?.name ?? 'Loading'}
        </h1>
        <p style={{ fontSize: 13.5, color: 'var(--gw-sub)', margin: 0 }}>{board.data?.answers}</p>
      </header>

      {/*
        * The board switcher that used to live here is gone: the left-hand
        * navigation already lists every board this person may open, and two
        * navigations on one screen means neither is trusted. The period picker
        * stays, because it belongs to this page rather than to the app.
        */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' }}>
        {(listing.data?.boards ?? []).length > 1 &&
          (listing.data?.boards ?? []).map((b) => (
            <button className={`gwui-choice${b.key === boardKey ? ' gwui-choice-on' : ''}`}
              key={b.key}
              type="button"
              onClick={() => setChosen(b.key)}
              aria-current={b.key === boardKey}
            >
              {b.name}
            </button>
          ))}

        <label style={{ marginLeft: 'auto', fontSize: 12.5, color: 'var(--gw-sub)' }}>
          Period{' '}
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            style={{ fontSize: 12.5, padding: '4px 6px', borderRadius: 6, border: '1px solid var(--gw-border)' }}
          >
            {(periods.data ?? []).map((p) => (
              <option key={p.key} value={p.key}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/*
        * The personal panels come first. What the company is doing matters, but
        * what is waiting on YOU is the reason to open a page in the morning.
        */}
      {board.data?.personalPanels?.includes('approvals-waiting-on-you') && <WaitingOnYou />}
      {board.data?.personalPanels?.includes('your-standing') && me.data && (
        <YourStanding personKey={me.data.key} />
      )}
      {board.data?.personalPanels?.includes('your-todos') && me.data && <YourTodos personKey={me.data.key} />}

      {board.isLoading && <p style={{ fontSize: 13, color: 'var(--gw-sub)' }}>Working it out…</p>}

      {board.data && (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: 12,
              alignItems: 'start',
            }}
          >
            {(board.data.numbers ?? []).map((n) => (
              <Number key={n.key} number={n} />
            ))}
          </div>

          {(board.data.hiddenFromYou ?? []).length > 0 && (
            /*
             * Said rather than silently missing. A board that quietly drops what
             * you may not see teaches you the wrong shape of the company.
             */
            <p style={{ fontSize: 12, color: 'var(--gw-sub)', marginTop: 16 }}>
              {(board.data.hiddenFromYou ?? []).length} number
              {(board.data.hiddenFromYou ?? []).length === 1 ? ' on this board is' : 's on this board are'} not
              yours to see.
            </p>
          )}
        </>
      )}
    </section>
  )
}
