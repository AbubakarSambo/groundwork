import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { opsApi, type OpsCommitment, type OpsExpense, type OpsStrategic } from '@/api/ops'
import { OpsHeader, PAGE, CARD, LABEL } from './OpsLayout'
import { OpsTable, readEnum, readDate, DueDate, type Column } from './OpsTable'
import { Adder, Choose } from './OpsForm'

const FUNDING_STAGES = ['TARGET', 'CONTACTED', 'MEETING', 'FOLLOW_UP', 'APPLICATION_DILIGENCE', 'COMMITTED', 'CLOSED', 'DECLINED'] as const
const STRATEGIC_STATUSES = ['IDENTIFIED', 'OUTREACH', 'ENGAGED', 'OPPORTUNITY_CREATED', 'COMPLETED', 'DORMANT', 'CLOSED'] as const

/** Objectives, commitments, approvals, spend, fundraise, strategy, the seam. */

const money = (v: number | string | null | undefined) =>
  v === null || v === undefined ? ' - ' : `$${Number(v).toLocaleString()}`

/**
 * The rows a figure was made of, on request.
 *
 * Nothing to open when there is nothing behind it: an invitation that opens an
 * empty list teaches somebody to stop pressing it, which is the same lesson
 * the boards learned when nine cards out of eleven offered "open the 0 rows".
 */
function TheRowsBehindIt({ rows }: { rows?: Array<Record<string, unknown>> }) {
  const [open, setOpen] = useState(false)
  if (!rows || rows.length === 0) return null
  return (
    <div style={{ marginTop: 6 }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        style={{ all: 'unset', cursor: 'pointer', ...LABEL, fontSize: 10 }}
      >
        {open ? 'Hide what it is made of' : `What the ${rows.length} are`}
      </button>
      {open && (
        <ul style={{ margin: '6px 0 0', paddingLeft: 18, fontSize: 12, color: 'var(--gw-sub)' }}>
          {rows.map((row, i) => (
            <li key={i} style={{ marginBottom: 3 }}>
              {/* Empty fields left out. "owner: null" is not evidence, it is a
                  column that happened to be empty, and it crowds out the ones
                  that are the answer. */}
              {Object.entries(row)
                .filter(([, v]) => v !== null && v !== undefined && v !== '')
                .map(([k, v]) => `${k.replace(/([A-Z])/g, ' $1').toLowerCase()}: ${String(v)}`)
                .join(' · ')}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function OpsQuarterPage() {
  /* Empty until the periods arrive. A seeded key written into the client opens
     on a period that will not always exist — the same defect as on the target list
     page, in two more places. `periods()` puts the one containing today first. */
  const [period, setPeriod] = useState('')
  const periods = useQuery({ queryKey: ['ops', 'periods'], queryFn: opsApi.periods, retry: false })
  const me = useQuery({ queryKey: ['ops', 'me'], queryFn: opsApi.me, retry: false })
  const workstreams = useQuery({ queryKey: ['ops', 'workstreams'], queryFn: opsApi.workstreams, retry: false })
  const metrics = useQuery({ queryKey: ['ops', 'metric-keys'], queryFn: opsApi.metricKeys, retry: false })
  const people = useQuery({ queryKey: ['ops', 'people'], queryFn: opsApi.people, retry: false })
  const whatItCanServe = useQuery({
    queryKey: ['ops', 'what-work-can-serve'],
    queryFn: opsApi.whatWorkCanServe,
    retry: false,
  })
  const aim = useQuery({
    queryKey: ['ops', 'quarter-aim', period],
    queryFn: () => opsApi.howTheQuarterIsAimed(period),
    retry: false,
    enabled: period !== '',
  })

  useEffect(() => {
    const first = periods.data?.[0]?.key
    if (!period && first) setPeriod(first)
  }, [period, periods.data])

  const objectives = useQuery({
    queryKey: ['ops', 'objectives', period],
    queryFn: () => opsApi.objectives(period),
    retry: false,
    enabled: period !== '',
  })

  const qc = useQueryClient()
  const maySet = me.data?.capabilities?.includes('objectives:write') ?? false
  const mayOpen = me.data?.capabilities?.includes('periods:write') ?? false

  /* THE GATE ON OPENING THE PERIOD, asked as a question rather than discovered
     by pressing the button. Everybody sees it: the answer is a list of names,
     and the people on it are the ones who can shorten it. */
  const canOpen = useQuery({
    queryKey: ['ops', 'can-open', period],
    queryFn: () => opsApi.canOpenPeriod(period),
    retry: false,
    enabled: period !== '',
  })

  const open = useMutation({
    mutationFn: () => opsApi.openPeriod(period),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ops', 'can-open', period] })
      qc.invalidateQueries({ queryKey: ['ops', 'periods'] })
    },
  })

  /* MANUAL is always allowed: somebody's word is a legitimate source, and the
     board says which numbers were typed. Every other option is a metric this
     system can compute, so a key result cannot name a source that does not exist. */
  const sources = [
    { value: 'MANUAL', label: 'Somebody keeps it up to date' },
    ...(metrics.data ?? []).map((m) => ({ value: m.key, label: m.label })),
  ]

  return (
    <section style={PAGE}>
      <OpsHeader name="Objectives" answers="What are we trying to achieve, and are we?" />

      <select
        value={period}
        onChange={(e) => setPeriod(e.target.value)}
        style={{ marginBottom: 16, fontSize: 12, padding: '4px 6px', borderRadius: 6, border: '1px solid var(--gw-border)' }}
      >
        {(periods.data ?? []).map((p) => (
          <option key={p.key} value={p.key}>
            {p.name}
          </option>
        ))}
      </select>

      {/* WHO THE PERIOD IS WAITING ON. Shown before it opens and gone after,
          because a green "everybody is set" banner on every visit for three
          months is furniture. */}
      {canOpen.data && !canOpen.data.ready && (
        <section
          style={{ ...CARD, marginBottom: 14, borderLeft: '3px solid var(--gw-amber-t)' }}
        >
          <p style={LABEL}>Before this period opens</p>
          <p style={{ fontSize: 14, margin: '5px 0 0', lineHeight: '22px' }}>{canOpen.data.says}</p>
        </section>
      )}

      {canOpen.data?.ready && mayOpen && (periods.data ?? []).find((p) => p.key === period)?.status !== 'OPEN' && (
        <section style={{ ...CARD, marginBottom: 14 }}>
          <p style={{ fontSize: 14, margin: 0 }}>{canOpen.data.says}</p>
          <button className="btn sec sm"
            type="button"
            onClick={() => open.mutate()}
            disabled={open.isPending}
            style={{ marginTop: 10 }}
          >
            {open.isPending ? 'Opening…' : 'Open this period'}
          </button>
          {open.isError && (
            <p style={{ fontSize: 12, color: 'var(--gw-red-t)', margin: '8px 0 0' }}>
              {(open.error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
                'It could not be opened.'}
            </p>
          )}
        </section>
      )}

      {/* HOW MUCH OF THE PERIOD IS AIMED AT SCALE. A split, never a score: a
          quarter that is mostly something else may be exactly right, and the
          point is that it was decided rather than that it happened. */}
      {aim.data && aim.data.of > 0 && (
        <section style={{ ...CARD, marginBottom: 14 }}>
          <p style={LABEL}>What this period is aimed at</p>
          <p style={{ fontSize: 14, margin: '5px 0 0' }}>{aim.data.says}</p>
          {(aim.data.disagreements ?? []).map((d) => (
            /* Said, never refused. Eight companies against three in the
               pipeline may be the target rather than a mistake — which it is
               belongs to whoever set it. */
            <p key={d.objective} style={{ fontSize: 12, color: 'var(--gw-amber-t)', margin: '8px 0 0', lineHeight: '19px' }}>
              <strong>{d.objective}</strong> - {d.says}
            </p>
          ))}
        </section>
      )}

      {/* SETTING ONE WAS BUILT AND UNREACHABLE. The endpoints for creating an
          objective and adding a key result had no caller anywhere, so this page
          could show targets and never take one. */}
      {maySet && period && (
        <div style={{ marginBottom: 16 }}>
          <Adder
            title="Set an objective"
            fields={[
              { name: 'title', label: 'What we are trying to achieve', required: true },
              /* CHOSEN, NOT INHERITED. The field existed and was never asked
                 for, so an objective took whoever opened the form — which meant
                 it was owned by nobody. */
              {
                name: 'ownerKey',
                label: 'Who owns it',
                required: true,
                options: (people.data ?? []).map((p) => ({ value: p.key, label: p.displayName })),
              },
              {
                name: 'workstreamKey',
                label: 'Whose area',
                required: true,
                options: (workstreams.data ?? []).map((w) => ({ value: w.key, label: w.name })),
              },
              {
                name: 'serves',
                label: 'What it buys',
                required: true,
                /* The same four values a piece of work can serve, so an
                   objective and the work under it answer one question in one
                   vocabulary. */
                options: (whatItCanServe.data ?? []).map((o) => ({ value: o.serves, label: o.label })),
              },
              { name: 'justification', label: 'Why this', type: 'textarea', required: true },
              /* THE CONVEYOR BELT. "Why is this the best use of time" is
                 unanswerable in the abstract and only answerable against the
                 alternative — and nobody writes it unless the form asks. */
              { name: 'instead', label: 'What it is instead of', required: true, placeholder: 'the partner channel' },
              { name: 'companiesExpected', label: 'How many companies, if it is a revenue objective', type: 'number' },
              { name: 'valuePerCompany', label: 'What each is worth ($)', type: 'number' },
              { name: 'description', label: 'Anything else worth recording', type: 'textarea' },
            ]}
            submit={(v) =>
              opsApi.createObjective({
                periodKey: period,
                workstreamKey: v.workstreamKey,
                ownerKey: v.ownerKey,
                title: v.title,
                serves: v.serves,
                justification: v.justification,
                instead: v.instead,
                companiesExpected: v.companiesExpected ? Number(v.companiesExpected) : undefined,
                valuePerCompanyCents: v.valuePerCompany ? Math.round(Number(v.valuePerCompany) * 100) : undefined,
                description: v.description || undefined,
              })
            }
            invalidate={[['ops']]}
            submitLabel="Set it"
          />
        </div>
      )}

      {(objectives.data ?? []).map((o) => (
        <section key={o.id} style={{ ...CARD, marginBottom: 12 }}>
          <p style={LABEL}>{o.workstream ?? 'No workstream'}</p>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--gw-navy)', margin: '4px 0 10px' }}>
            {o.title}
          </h2>
          {maySet && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
              {/* A KEY RESULT IS THE NUMBER THAT SAYS WHETHER IT HAPPENED. An
                  objective without one is a sentence. */}
              <Adder
                title="Add the number"
                fields={[
                  { name: 'title', label: 'What gets measured', required: true },
                  { name: 'targetValue', label: 'The number to reach', type: 'number', required: true },
                  { name: 'unit', label: 'Of what', required: true, placeholder: 'companies' },
                  { name: 'startValue', label: 'Where it stands now', type: 'number' },
                  {
                    name: 'measurementSource',
                    label: 'Where the number comes from',
                    required: true,
                    options: sources,
                  },
                  /* Owned separately from the objective, which is how somebody
                     owns a piece of something they do not own. */
                  {
                    name: 'ownerKey',
                    label: 'Who owns this number',
                    required: true,
                    options: (people.data ?? []).map((p) => ({ value: p.key, label: p.displayName })),
                  },
                  /* WHY THIS NUMBER, AND HOW IT WILL BE MOVED. A target and a
                     source say what to reach and where the figure comes from,
                     and neither says whether the target is the right one or
                     whether anybody has thought about hitting it. */
                  { name: 'justification', label: 'Why this number', type: 'textarea', required: true },
                  { name: 'approach', label: 'How it will be moved', type: 'textarea', required: true },
                  { name: 'dueDate', label: 'By when', type: 'date', required: true },
                ]}
                submit={(v) =>
                  opsApi.addKeyResult(o.id, {
                    title: v.title,
                    metricType: 'COUNT',
                    targetValue: Number(v.targetValue),
                    startValue: v.startValue ? Number(v.startValue) : undefined,
                    unit: v.unit,
                    measurementSource: v.measurementSource,
                    ownerKey: v.ownerKey,
                    justification: v.justification,
                    approach: v.approach,
                    dueDate: v.dueDate,
                  })
                }
                invalidate={[['ops']]}
                submitLabel="Add it"
              />
              <Choose
                label="Where it stands"
                value={o.status}
                options={['DRAFT', 'ACTIVE', 'ACHIEVED', 'MISSED', 'ARCHIVED']}
                onPick={(status) => opsApi.setObjectiveStatus(o.id, status)}
                invalidate={[['ops']]}
              />
            </div>
          )}

          {o.keyResults.map((kr) => (
            <div key={kr.id} style={{ borderTop: '1px solid var(--gw-border)', padding: '9px 0 0', marginTop: 9 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'baseline', flexWrap: 'wrap' }}>
                <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--gw-navy)', fontVariantNumeric: 'tabular-nums' }}>
                  {/*
                    A target of zero is a HOLD, not a climb, and "1 / 0" reads
                    as a broken fraction. It is the same defect as the blank
                    progress bar this replaced: the arithmetic was right and the
                    presentation made a person work out what it meant.
                  */}
                  {kr.target === 0 ? (
                    kr.current === 0 ? 'none' : `${kr.current}, should be none`
                  ) : (
                    <>
                      {kr.current} / {kr.target}
                    </>
                  )}
                </span>
                <span style={{ fontSize: 13 }}>{kr.title}</span>
                {kr.typedByHand && (
                  /*
                   * Always said. A board showing typed and computed numbers side
                   * by side without saying which is which is one where the typed
                   * ones hide behind the computed.
                   */
                  <span style={{ ...LABEL, fontSize: 10 }}>entered by hand</span>
                )}
                <span style={{ fontSize: 12, color: 'var(--gw-sub)', marginLeft: 'auto' }}>
                  by {readDate(kr.dueDate)}
                </span>
              </div>
              {kr.progress !== null && (
                <div style={{ background: 'rgba(12,68,124,0.08)', borderRadius: 4, height: 6, marginTop: 7 }}>
                  <div
                    style={{
                      width: `${Math.min(kr.progress, 100)}%`,
                      height: '100%',
                      background: 'var(--gw-navy)',
                      borderRadius: 4,
                    }}
                  />
                </div>
              )}
              {kr.problem && (
                <p style={{ fontSize: 12, color: 'var(--gw-red-t)', margin: '7px 0 0' }}>
                  {kr.problem}
                </p>
              )}
              {/* A NUMBER YOU CAN OPEN, WHERE IT MATTERS MOST. The rows were
                  in the payload all along and this page threw them away, so
                  "3 of 10 qualified" could not be checked against the three. */}
              {/* The reasoning behind the number, beside it. Filed on another
                  screen it would be written once and read never. */}
              {(kr.justification || kr.approach) && (
                <div style={{ fontSize: 12, color: 'var(--gw-sub)', marginTop: 5, lineHeight: '19px' }}>
                  {kr.justification && <div>{kr.justification}</div>}
                  {kr.approach && <div style={{ marginTop: 2 }}>How: {kr.approach}</div>}
                </div>
              )}
              <TheRowsBehindIt rows={kr.rows} />
            </div>
          ))}
        </section>
      ))}

      {objectives.data?.length === 0 && (
        <p style={{ fontSize: 13, color: 'var(--gw-sub)' }}>
          Nothing set for this period.{maySet ? ' Set one above.' : ''}
        </p>
      )}
    </section>
  )
}

export function OpsCommitmentsPage() {
  /* Empty until the periods arrive — see the note on the objectives page. */
  const [period, setPeriod] = useState('')
  const me = useQuery({ queryKey: ['ops', 'me'], queryFn: opsApi.me, retry: false })
  const periods = useQuery({ queryKey: ['ops', 'periods'], queryFn: opsApi.periods, retry: false })
  useEffect(() => {
    const first = periods.data?.[0]?.key
    if (!period && first) setPeriod(first)
  }, [period, periods.data])
  const metrics = useQuery({ queryKey: ['ops', 'metric-keys'], queryFn: opsApi.metricKeys, retry: false })
  const commitments = useQuery({
    queryKey: ['ops', 'commitments', me.data?.key, period],
    queryFn: () => opsApi.commitments(me.data!.key, period),
    /* Not before a period is chosen: with an empty key the call was a 404 and the page said something did not load. */
    enabled: Boolean(me.data?.key && period),
    retry: false,
  })

  const columns: Column<OpsCommitment>[] = [
    { head: 'Commitment', cell: (c) => <strong>{c.title}</strong> },
    {
      head: 'Where it is',
      cell: (c) => (
        <>
          {c.says}
          {c.typedByHand && (
            <span style={{ ...LABEL, fontSize: 10, marginLeft: 8 }}>by hand</span>
          )}
        </>
      ),
    },
    { head: 'Status', cell: (c) => readEnum(c.status) },
    {
      head: 'Blocked',
      // Orthogonal to status on purpose: blocked work is still in progress, and
      // collapsing the two loses the fact that somebody needs help.
      //
      // SAYING SO HAD NO CONTROL. `PATCH /ops/commitments/:id/blocked` was built
      // and called by nothing, so the column could report a blocker and no
      // screen could ever record one.
      cell: (c) =>
        c.blocked ? (
          <>
            {c.blockerReason ?? 'yes'}
            <Choose
              label="unblocked now"
              value="blocked"
              options={['unblocked']}
              onPick={() => opsApi.markCommitmentBlocked(c.id, false)}
              invalidate={[['ops']]}
            />
          </>
        ) : (
          <Adder
            title="I am blocked"
            fields={[{ name: 'blockerReason', label: 'What is in the way', type: 'textarea', required: true }]}
            submit={(v) => opsApi.markCommitmentBlocked(c.id, true, v.blockerReason)}
            invalidate={[['ops']]}
            submitLabel="Say so"
          />
        ),
    },
    { head: 'Due', cell: (c) => <DueDate value={c.dueDate} /> },
    {
      head: 'What it serves',
      /* A commitment tied to nothing is a personal to-do. Tied to a key result
         it is a piece of the quarter, and the quarter can show who is carrying
         which part of it. `POST /:id/links` was built and never called. */
      cell: (c) => (
        <Adder
          title="tie it to something"
          fields={[
            {
              name: 'recordType',
              label: 'What kind',
              required: true,
              options: [
                { value: 'OpsKeyResult', label: 'A key result' },
                { value: 'OpsCompany', label: 'A company' },
                { value: 'OpsRoadmapItem', label: 'A roadmap item' },
              ],
            },
            { name: 'recordId', label: 'Its id', required: true },
          ]}
          submit={(v) => opsApi.linkCommitment(c.id, { recordType: v.recordType, recordId: v.recordId })}
          invalidate={[['ops']]}
          submitLabel="Tie it"
        />
      ),
    },
    {
      head: 'Close it',
      /*
       * Closed with what actually happened, in words, rather than by flipping a
       * status. A commitment whose outcome is only a status is one nobody can
       * learn anything from a quarter later.
       */
      cell: (c) =>
        c.status === 'COMPLETED' || c.status === 'MISSED' ? (
          <span style={{ color: 'var(--gw-sub)' }}>{c.actualResult ?? 'closed'}</span>
        ) : (
          <Adder
            title="close"
            fields={[
              {
                name: 'status',
                label: 'How it went',
                required: true,
                options: [
                  { value: 'COMPLETED', label: 'Did it' },
                  { value: 'MISSED', label: 'Did not' },
                ],
              },
              { name: 'actualResult', label: 'What actually happened', type: 'textarea', required: true },
            ]}
            submit={(v) => opsApi.closeCommitment(c.id, { status: v.status, actualResult: v.actualResult })}
            invalidate={[['ops']]}
            submitLabel="Close it"
          />
        ),
    },
  ]

  return (
    <section style={PAGE}>
      <OpsHeader name="Commitments" answers="What did I say I would do this cycle, and what happened?" />
      <select
        value={period}
        onChange={(e) => setPeriod(e.target.value)}
        style={{ marginBottom: 16, fontSize: 12, padding: '4px 6px', borderRadius: 6, border: '1px solid var(--gw-border)' }}
      >
        {(periods.data ?? []).map((p) => (
          <option key={p.key} value={p.key}>
            {p.name}
          </option>
        ))}
      </select>
      <Adder
        title="Say what you will do this cycle"
        fields={[
          { name: 'title', label: 'What', required: true },
          { name: 'measureType', label: 'Measured how', required: true, placeholder: 'count, done' },
          { name: 'targetValue', label: 'Target', type: 'number' },
          { name: 'unit', label: 'Unit', placeholder: 'leads' },
          {
            name: 'measurementSource',
            label: 'Where the number comes from',
            required: true,
            /* MANUAL is offered plainly rather than hidden. Somebody's word is a
               legitimate source; it just has to be declared as one. */
            options: [
              { value: 'MANUAL', label: 'I will keep it up to date myself' },
              ...(metrics.data ?? []).map((m) => ({ value: m.key, label: m.label })),
            ],
          },
          { name: 'dueDate', label: 'By', type: 'date', required: true },
        ]}
        submit={(v) =>
          opsApi.makeCommitment({
            operatingPeriodKey: period,
            title: v.title,
            measureType: v.measureType,
            targetValue: v.targetValue ? Number(v.targetValue) : undefined,
            unit: v.unit || undefined,
            measurementSource: v.measurementSource,
            dueDate: v.dueDate,
          })
        }
        invalidate={[['ops']]}
        submitLabel="Commit to it"
      />
      <OpsTable
        rows={commitments.data}
        columns={columns}
        keyOf={(c) => c.id}
        empty="You have not made a commitment for this cycle."
      />
    </section>
  )
}

/** Every earlier decision about the same record, on request. */
function WhatWasDecidedBefore({
  recordType,
  recordId,
  exceptThisOne,
}: {
  recordType: string
  recordId: string
  exceptThisOne: string
}) {
  const [open, setOpen] = useState(false)
  const history = useQuery({
    queryKey: ['ops', 'decisions-about', recordType, recordId],
    queryFn: () => opsApi.decisionsAbout(recordType, recordId),
    enabled: open,
    retry: false,
  })
  const earlier = (history.data ?? []).filter((d) => d.id !== exceptThisOne)

  return (
    <div style={{ marginBottom: 9 }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        style={{ all: 'unset', cursor: 'pointer', ...LABEL, fontSize: 10 }}
      >
        {open ? 'Hide what came before' : 'What was decided about this before'}
      </button>
      {open &&
        (earlier.length === 0 ? (
          <p style={{ fontSize: 12, color: 'var(--gw-sub)', margin: '6px 0 0' }}>
            {history.isLoading ? 'Looking…' : 'Nothing. This is the first time it has been asked.'}
          </p>
        ) : (
          <ul style={{ margin: '6px 0 0', paddingLeft: 18, fontSize: 12, color: 'var(--gw-sub)' }}>
            {earlier.map((d) => (
              <li key={d.id} style={{ marginBottom: 3 }}>
                {readEnum(d.status)} on {readDate(d.decidedAt ?? d.createdAt)}
                {d.decisionNote ? ` - ${d.decisionNote}` : ''}
              </li>
            ))}
          </ul>
        ))}
    </div>
  )
}

export function OpsApprovalsPage() {
  const approvals = useQuery({ queryKey: ['ops', 'approvals'], queryFn: opsApi.approvals, retry: false })
  const queryClient = useQueryClient()
  const decide = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'APPROVED' | 'CHANGES_REQUESTED' | 'REJECTED' }) =>
      opsApi.decide(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ops'] }),
  })

  const days = (iso: string) => Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)

  return (
    <section style={PAGE}>
      <OpsHeader name="Approvals" answers="What is waiting on me, and how long has it waited?" />
      {(approvals.data ?? []).map((a) => (
        <section key={a.id} style={{ ...CARD, marginBottom: 10 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'baseline', flexWrap: 'wrap' }}>
            <span style={LABEL}>{a.approvalType.toLowerCase()}</span>
            <span style={{ fontSize: 12, color: 'var(--gw-sub)', marginLeft: 'auto' }}>
              {days(a.createdAt) === 0 ? 'asked today' : `waiting ${days(a.createdAt)} days`}
            </span>
          </div>
          <p style={{ fontSize: 14, margin: '7px 0 9px' }}>{a.requestSummary}</p>
          {/* HAS THIS BEEN HERE BEFORE? `GET /ops/approvals/:type/:id` returned
              every decision ever made about a record and was called by nothing,
              so a request sent back for changes and returned unchanged looked
              exactly like a request arriving for the first time. */}
          {a.relatedRecordType && a.relatedRecordId && (
            <WhatWasDecidedBefore
              recordType={a.relatedRecordType}
              recordId={a.relatedRecordId}
              exceptThisOne={a.id}
            />
          )}
          <div style={{ display: 'flex', gap: 6 }}>
            {(['APPROVED', 'CHANGES_REQUESTED', 'REJECTED'] as const).map((status) => (
              <button className="btn sec sm"
                key={status}
                type="button"
                onClick={() => decide.mutate({ id: a.id, status })}
              >
                {status === 'APPROVED' ? 'Approve' : status === 'REJECTED' ? 'No' : 'Ask for changes'}
              </button>
            ))}
          </div>
        </section>
      ))}
      {approvals.data?.length === 0 && (
        <p style={{ fontSize: 13, color: 'var(--gw-sub)' }}>Nothing is waiting on a decision from you.</p>
      )}
    </section>
  )
}

export function OpsSpendPage() {
  const spend = useQuery({ queryKey: ['ops', 'spend'], queryFn: opsApi.spend, retry: false })
  const balance = useQuery({ queryKey: ['ops', 'balance'], queryFn: opsApi.balance, retry: false })

  const columns: Column<OpsExpense>[] = [
    { head: 'What', cell: (e) => <strong>{e.description}</strong> },
    /* Everybody's spend is visible to everybody, the CEO's included, so whose
       claim it is belongs on the row rather than being inferred from context. */
    { head: 'Whose', cell: (e) => e.requesterName },
    { head: 'Category', cell: (e) => e.category },
    { head: 'Amount', cell: (e) => money(e.amount), numeric: true },
    { head: 'When', cell: (e) => readDate(e.date) },
    {
      head: 'Status',
      cell: (e) => (
        <>
          {readEnum(e.status)}
          {/* Only somebody else's claim, and only while it is undecided. The
              server refuses your own regardless; offering the control anyway
              would just be a button that always fails. */}
          {e.status === 'REQUESTED' && (
            <Adder
              title="decide"
              fields={[
                {
                  name: 'status',
                  label: 'What happens to it',
                  required: true,
                  options: [
                    { value: 'APPROVED', label: 'Approve' },
                    { value: 'PAID', label: 'Mark paid' },
                    { value: 'REJECTED', label: 'Refuse' },
                  ],
                },
                { name: 'rejectedReason', label: 'Why, if refusing', type: 'textarea' },
              ]}
              submit={(v) => opsApi.decideExpense(e.id, v.status, v.rejectedReason || undefined)}
              invalidate={[['ops']]}
              submitLabel="Do it"
            />
          )}
          {/* RECORDED is not APPROVED, and the ledger must never imply it was. */}
          {e.status === 'RECORDED' && (
            <div style={{ fontSize: 12, color: 'var(--gw-sub)' }}>not reviewed by a second person</div>
          )}
          {e.rejectedReason && (
            <div style={{ fontSize: 12, color: 'var(--gw-sub)' }}>{e.rejectedReason}</div>
          )}
        </>
      ),
    },
  ]

  return (
    <section style={PAGE}>
      <OpsHeader name="Spend" answers="What has the company claimed, and what is left?" />

      {balance.data && (
        <section style={{ ...CARD, marginBottom: 14 }}>
          <p style={LABEL}>The money</p>
          <p style={{ fontSize: 20, fontWeight: 700, color: 'var(--gw-navy)', margin: '4px 0 0' }}>
            {money(balance.data.remaining)} left
          </p>
          <p style={{ fontSize: 12, color: 'var(--gw-sub)', margin: '2px 0 0' }}>
            {money(balance.data.earned)} earned · {money(balance.data.paid)} paid ·{' '}
            {money(balance.data.approvedNotPaid)} owed · {money(balance.data.awaitingDecision)} awaiting
            a decision
          </p>
          {/* MONEY IN HAD NO WAY IN. `POST /ops/earnings` was built and called by
              nothing, so the balance was made entirely of spend and read
              "$-420 left" — a number that looks like a fact and is an absence. */}
          <div style={{ marginTop: 10 }}>
            <Adder
              title="Record money in"
              fields={[
                { name: 'amount', label: 'How much', type: 'number', required: true },
                { name: 'source', label: 'Where from', required: true, placeholder: 'Northwind activation' },
                { name: 'date', label: 'When', type: 'date', required: true },
                { name: 'note', label: 'Anything worth remembering', type: 'textarea' },
              ]}
              submit={(v) =>
                opsApi.recordEarnings({
                  amount: Number(v.amount),
                  source: v.source,
                  date: v.date,
                  note: v.note || undefined,
                })
              }
              invalidate={[['ops']]}
              submitLabel="Record it"
            />
          </div>

          {(balance.data.nobodyCanApprove ?? []).map((e) => (
            <p key={e.id} style={{ fontSize: 12, color: 'var(--gw-red-t)', margin: '8px 0 0' }}>
              {e.description} ({money(e.amount)}) - {e.why}
            </p>
          ))}
        </section>
      )}

      <Adder
        title="Claim something back"
        fields={[
          { name: 'description', label: 'What', required: true },
          {
            name: 'category',
            label: 'Category',
            required: true,
            options: ['Travel', 'Client', 'Software', 'Equipment', 'Other'].map((c) => ({ value: c, label: c })),
          },
          { name: 'amount', label: 'How much', type: 'number', required: true },
          { name: 'date', label: 'When', type: 'date', required: true },
        ]}
        submit={(v) =>
          opsApi.submitExpense({
            description: v.description,
            category: v.category,
            amount: Number(v.amount),
            date: v.date,
          })
        }
        invalidate={[['ops']]}
        submitLabel="Claim it"
      />
      <OpsTable rows={spend.data} columns={columns} keyOf={(e) => e.id} empty="Nothing claimed." />
    </section>
  )
}

export function OpsFundraisePage() {
  const fundraise = useQuery({ queryKey: ['ops', 'fundraise'], queryFn: opsApi.fundraise, retry: false })
  const t = fundraise.data?.totals

  return (
    <section style={PAGE}>
      <OpsHeader name="Fundraise" answers="Who might fund us, and what have I not chased?" />

      {t && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
          {[
            { v: t.active, l: 'live conversations' },
            { v: money(t.askedFor), l: 'asked for' },
            /* Committed and closed stay apart: a signed term sheet is not money. */
            { v: money(t.committed), l: 'committed' },
            { v: money(t.closed), l: 'actually in' },
            { v: t.overdue, l: 'overdue' },
          ].map((s) => (
            <div key={s.l} style={{ ...CARD, minWidth: 130 }}>
              <div style={{ fontSize: 19, fontWeight: 700, color: 'var(--gw-navy)' }}>{s.v}</div>
              <div style={{ fontSize: 12, color: 'var(--gw-sub)', marginTop: 2 }}>{s.l}</div>
            </div>
          ))}
        </div>
      )}

      <Adder
        title="Add a funder"
        fields={[
          { name: 'funderName', label: 'Who', required: true },
          { name: 'fundingType', label: 'Kind', required: true, placeholder: 'Pre-seed, grant' },
          { name: 'askAmount', label: 'Asking for', type: 'number' },
        ]}
        submit={(v) =>
          opsApi.addFunder({
            funderName: v.funderName,
            fundingType: v.fundingType,
            askAmount: v.askAmount ? Number(v.askAmount) : undefined,
          })
        }
        invalidate={[['ops']]}
        submitLabel="Add them"
      />
      <OpsTable
        rows={fundraise.data?.opportunities}
        columns={[
          { head: 'Funder', cell: (f) => <strong>{f.funderName}</strong> },
          { head: 'Kind', cell: (f) => f.fundingType },
          {
            head: 'Stage',
            cell: (f) => (
              <Choose
                label={`Stage for ${f.funderName}`}
                value={f.stage}
                options={FUNDING_STAGES}
                onPick={(next) => opsApi.advanceFunding(f.id, next)}
                invalidate={[['ops']]}
              />
            ),
          },
          { head: 'Ask', cell: (f) => money(f.askAmount), numeric: true },
          { head: 'Committed', cell: (f) => money(f.committedAmount), numeric: true },
          { head: 'In', cell: (f) => money(f.closedAmount), numeric: true },
          { head: 'Next', cell: (f) => f.nextAction ?? ' - ' },
          {
            head: 'Due',
            /* "Overdue" is one of the five numbers at the top of this page, and
               nothing on it could move a date. `PATCH /:id/follow-up` existed
               with no caller, so a chased funder stayed overdue for ever. */
            cell: (f) => (
              <>
                <DueDate value={f.nextActionDueAt} />
                <Adder
                  title="chased"
                  fields={[{ name: 'nextFollowUpAt', label: 'Come back to them on', type: 'date', required: true }]}
                  submit={(v) => opsApi.recordFundraiseFollowUp(f.id, v.nextFollowUpAt)}
                  invalidate={[['ops']]}
                  submitLabel="Set it"
                />
              </>
            ),
          },
        ]}
        keyOf={(f) => f.id}
        empty="No funding conversations."
      />
    </section>
  )
}

export function OpsStrategyPage() {
  const strategy = useQuery({ queryKey: ['ops', 'strategy'], queryFn: opsApi.strategy, retry: false })

  const columns: Column<OpsStrategic>[] = [
    { head: 'Who', cell: (s) => <strong>{s.personOrNetwork}</strong> },
    { head: 'Where', cell: (s) => s.organization ?? ' - ' },
    { head: 'For', cell: (s) => s.opportunityType },
    {
      head: 'Status',
      cell: (s) => (
        <Choose
          label={`Status for ${s.personOrNetwork}`}
          value={s.status}
          options={STRATEGIC_STATUSES}
          onPick={(next) => opsApi.setStrategicStatus(s.id, next)}
          invalidate={[['ops']]}
        />
      ),
    },
    {
      head: 'Became',
      // A pointer, not a claim. Without it, "this network produced three
      // opportunities" is a sentence with nothing behind it.
      //
      // And it could never be pointed. `PATCH /:id/converted` had no caller, so
      // this column read "—" for every row for ever, which is the same sentence
      // with nothing behind it wearing a table.
      cell: (s) =>
        s.convertedToType ? (
          readEnum(s.convertedToType)
        ) : (
          <Adder
            title="it became something"
            fields={[
              {
                name: 'convertedToType',
                label: 'What it became',
                required: true,
                options: [
                  { value: 'COMPANY', label: 'A company we are selling to' },
                  { value: 'FUNDING', label: 'A funding conversation' },
                  { value: 'PARTNERSHIP', label: 'A partnership' },
                  { value: 'HIRE', label: 'Somebody who joined' },
                ],
              },
              { name: 'convertedToId', label: 'Its key or id, if there is one' },
            ]}
            submit={(v) =>
              opsApi.recordConversion(s.id, {
                convertedToType: v.convertedToType,
                convertedToId: v.convertedToId || undefined,
              })
            }
            invalidate={[['ops']]}
            submitLabel="Record it"
          />
        ),
    },
    { head: 'Next', cell: (s) => s.nextStep ?? ' - ' },
    { head: 'Due', cell: (s) => <DueDate value={s.nextStepDueAt} /> },
  ]

  return (
    <section style={PAGE}>
      <OpsHeader name="Strategy" answers="Which relationships could become something?" />
      <Adder
        title="Record a relationship"
        fields={[
          { name: 'personOrNetwork', label: 'Who', required: true },
          { name: 'organization', label: 'Where' },
          { name: 'opportunityType', label: 'Could become', required: true, placeholder: 'Introduction to a buyer' },
        ]}
        submit={(v) =>
          opsApi.addStrategic({
            personOrNetwork: v.personOrNetwork,
            opportunityType: v.opportunityType,
            organization: v.organization || undefined,
          })
        }
        invalidate={[['ops']]}
        submitLabel="Record it"
      />
      <OpsTable rows={strategy.data} columns={columns} keyOf={(s) => s.id} empty="Nothing tracked." />
    </section>
  )
}

export function OpsIntegrationPage() {
  const status = useQuery({ queryKey: ['ops', 'integration'], queryFn: opsApi.integration, retry: false })
  const queryClient = useQueryClient()
  const push = useMutation({
    mutationFn: () => opsApi.pushToGroundwork('sept-2026-target-list'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ops', 'integration'] }),
  })

  const s = status.data

  return (
    <section style={PAGE}>
      <OpsHeader
        name="Groundwork"
        answers="Are we connected to our own product, and what did we last send?"
      />

      <section style={{ ...CARD, marginBottom: 12 }}>
        <p style={{ fontSize: 14, margin: 0 }}>{s?.says ?? 'Checking…'}</p>
        {s?.configured && (
          <p style={{ fontSize: 12, color: 'var(--gw-sub)', margin: '8px 0 0' }}>
            {s.baseUrl} · client {s.clientId} · secret {s.secretSet ? 'set' : 'missing'}
          </p>
        )}
      </section>

      {s?.enabled && (
        <button className="btn sec sm"
          type="button"
          onClick={() => push.mutate()}
          disabled={push.isPending}
        >
          {push.isPending ? 'Sending…' : 'Send this period across'}
        </button>
      )}

      {/*
        * Said in full, including the advice when nothing matched. A push that
        * returns 200 and writes nothing is the failure this screen exists for.
        */}
      {push.data !== undefined && (
        <pre
          style={{
            ...CARD,
            marginTop: 12,
            fontSize: 12,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {JSON.stringify(push.data, null, 1)}
        </pre>
      )}
    </section>
  )
}

/**
 * WHAT PEOPLE SAY THEY CANNOT DELIVER WITHOUT.
 *
 * `POST /ops/resourcing`, `GET /ops/resourcing` and `PATCH /:id/closed` were all
 * built and reachable from nothing — so the one place a person could say "I am
 * blocked and this is what would unblock me" existed only in the API docs.
 *
 * Anybody may ask. Only somebody holding `resourcing:approve` sees the list,
 * which is why the asking form is above the list rather than inside it: a
 * contributor opens this page to ask, and sees no list at all.
 */
export function OpsRequestsPage() {
  const me = useQuery({ queryKey: ['ops', 'me'], queryFn: opsApi.me, retry: false })
  const requests = useQuery({ queryKey: ['ops', 'requests'], queryFn: opsApi.requests, retry: false })
  const people = useQuery({ queryKey: ['ops', 'people'], queryFn: opsApi.people, retry: false })

  const mayDecide = me.data?.capabilities?.includes('resourcing:approve') ?? false
  const nameFor = (id: string) =>
    (people.data ?? []).find((p) => p.id === id)?.displayName ?? 'somebody no longer here'

  const columns: Column<{
    id: string
    requesterId: string
    supportNeeded: string
    reason: string
    urgency: string
    status: string
    requestedByDate: string | null
  }>[] = [
    { head: 'What they need', cell: (r) => <strong>{r.supportNeeded}</strong> },
    /* Named. A queue of anonymous asks is one nobody can act on. */
    { head: 'Who', cell: (r) => nameFor(r.requesterId) },
    { head: 'Why', cell: (r) => <span style={{ color: 'var(--gw-sub)' }}>{r.reason}</span> },
    { head: 'How urgent', cell: (r) => readEnum(r.urgency) },
    { head: 'By', cell: (r) => (r.requestedByDate ? readDate(r.requestedByDate) : ' - ') },
    {
      head: 'Where it stands',
      cell: (r) => (
        <>
          {readEnum(r.status)}
          {r.status === 'OPEN' && (
            <Choose
              label="close it"
              value={r.status}
              options={['CLOSED']}
              onPick={() => opsApi.closeRequest(r.id)}
              invalidate={[['ops']]}
            />
          )}
        </>
      ),
    },
  ]

  return (
    <section style={PAGE}>
      <OpsHeader name="Requests" answers="What is somebody blocked on, and what would unblock them?" />

      <div style={{ marginBottom: 16 }}>
        <Adder
          title="Ask for something"
          fields={[
            { name: 'supportNeeded', label: 'What you need', required: true },
            { name: 'reason', label: 'What it unblocks', type: 'textarea', required: true },
            {
              name: 'urgency',
              label: 'How urgent',
              required: true,
              options: [
                { value: 'BLOCKING', label: 'Blocking me now' },
                { value: 'SOON', label: 'Soon' },
                { value: 'WHENEVER', label: 'Whenever' },
              ],
            },
            { name: 'requestedByDate', label: 'Needed by', type: 'date' },
          ]}
          submit={(v) =>
            opsApi.askForSomething({
              supportNeeded: v.supportNeeded,
              reason: v.reason,
              urgency: v.urgency,
              requestedByDate: v.requestedByDate || undefined,
            })
          }
          invalidate={[['ops']]}
          submitLabel="Ask"
        />
      </div>

      {mayDecide ? (
        <OpsTable rows={requests.data ?? []} columns={columns} keyOf={(r) => r.id} empty="Nobody is asking for anything." />
      ) : (
        /* Not a refusal — a description. Everybody may ask; only one person
           reads the queue, and saying so is better than an empty table. */
        <p style={{ fontSize: 13, color: 'var(--gw-sub)' }}>
          What you ask for goes to whoever decides resourcing. You will hear back from them, not
          from this page.
        </p>
      )}
    </section>
  )
}

/**
 * THE DECISIONS THIS SYSTEM RUNS ON.
 *
 * `GET /ops/settings` and `PATCH /ops/settings/:key` had no caller, so every one
 * of these was editable by API and by nothing else. One of them — where a
 * contributor's introduction starts counting — moves every contributor's number,
 * and its own note says it is awaiting a decision. A decision nobody can make
 * from the product is not awaiting anything.
 */
export function OpsDecisionsPage() {
  const settings = useQuery({ queryKey: ['ops', 'settings'], queryFn: opsApi.settings, retry: false })

  return (
    <section style={PAGE}>
      <OpsHeader name="Decisions" answers="What has this system been told to assume?" />

      <p style={{ fontSize: 13, color: 'var(--gw-sub)', marginBottom: 16, maxWidth: 620, lineHeight: '21px' }}>
        Each of these is something a person chose and could choose differently. Nothing here is
        stored twice - changing one recomputes every number that depends on it, which is why the
        note says what choosing differently would change.
      </p>

      {(settings.data ?? []).map((setting) => (
        <section key={setting.key} style={{ ...CARD, marginBottom: 12 }}>
          <p style={LABEL}>{setting.key}</p>
          <p
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: 'var(--gw-navy)',
              margin: '4px 0 6px',
              wordBreak: 'break-word',
            }}
          >
            {setting.value}
          </p>
          {setting.note && (
            <p style={{ fontSize: 12, color: 'var(--gw-sub)', margin: '0 0 10px', lineHeight: '19px' }}>
              {setting.note}
            </p>
          )}
          <Adder
            title="Change it"
            fields={[{ name: 'value', label: 'The new value', required: true, placeholder: setting.value }]}
            submit={(v) => opsApi.changeSetting(setting.key, v.value)}
            invalidate={[['ops']]}
            submitLabel="Change it"
          />
          <p style={{ fontSize: 12, color: 'var(--gw-sub)', marginTop: 8 }}>
            Last changed {readDate(setting.updatedAt)}
            {setting.updatedBy ? ` by ${setting.updatedBy}` : ''}
          </p>
        </section>
      ))}

      {settings.data?.length === 0 && (
        <p style={{ fontSize: 13, color: 'var(--gw-sub)' }}>Nothing has been decided yet.</p>
      )}
    </section>
  )
}
