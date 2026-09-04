import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { opsApi, type OpsCommitment, type OpsExpense, type OpsStrategic } from '@/api/ops'
import { OpsHeader, PAGE, CARD, LABEL } from './OpsLayout'
import { OpsTable, readEnum, readDate, DueDate, type Column } from './OpsTable'
import { Adder, Choose } from './OpsForm'

const FUNDING_STAGES = ['TARGET', 'CONTACTED', 'MEETING', 'FOLLOW_UP', 'APPLICATION_DILIGENCE', 'COMMITTED', 'CLOSED', 'DECLINED'] as const
const STRATEGIC_STATUSES = ['IDENTIFIED', 'OUTREACH', 'ENGAGED', 'OPPORTUNITY_CREATED', 'COMPLETED', 'DORMANT', 'CLOSED'] as const

/** Objectives, commitments, approvals, spend, fundraise, strategy, the seam. */

const money = (v: number | string | null | undefined) =>
  v === null || v === undefined ? '—' : `$${Number(v).toLocaleString()}`

export function OpsQuarterPage() {
  const [period, setPeriod] = useState('sept-2026-sprint')
  const periods = useQuery({ queryKey: ['ops', 'periods'], queryFn: opsApi.periods, retry: false })
  const objectives = useQuery({
    queryKey: ['ops', 'objectives', period],
    queryFn: () => opsApi.objectives(period),
    retry: false,
  })

  return (
    <main id="main" style={PAGE}>
      <OpsHeader name="Objectives" answers="What are we trying to achieve, and are we?" />

      <select
        value={period}
        onChange={(e) => setPeriod(e.target.value)}
        style={{ marginBottom: 16, fontSize: 12.5, padding: '4px 6px', borderRadius: 6, border: '0.5px solid var(--gw-border)' }}
      >
        {(periods.data ?? []).map((p) => (
          <option key={p.key} value={p.key}>
            {p.name}
          </option>
        ))}
      </select>

      {(objectives.data ?? []).map((o) => (
        <section key={o.id} style={{ ...CARD, marginBottom: 12 }}>
          <p style={LABEL}>{o.workstream ?? 'No workstream'}</p>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--gw-navy)', margin: '4px 0 10px' }}>
            {o.title}
          </h2>
          {o.keyResults.map((kr) => (
            <div key={kr.id} style={{ borderTop: '0.5px solid var(--gw-border)', padding: '9px 0 0', marginTop: 9 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'baseline', flexWrap: 'wrap' }}>
                <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--gw-navy)', fontVariantNumeric: 'tabular-nums' }}>
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
                  <span style={{ ...LABEL, fontSize: 9.5 }}>entered by hand</span>
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
                <p style={{ fontSize: 12.5, color: 'var(--gw-red-t)', margin: '7px 0 0' }}>
                  {kr.problem}
                </p>
              )}
            </div>
          ))}
        </section>
      ))}

      {objectives.data?.length === 0 && (
        <p style={{ fontSize: 13, color: 'var(--gw-sub)' }}>Nothing set for this period.</p>
      )}
    </main>
  )
}

export function OpsCommitmentsPage() {
  const [period, setPeriod] = useState('sept-2026-sprint')
  const me = useQuery({ queryKey: ['ops', 'me'], queryFn: opsApi.me, retry: false })
  const periods = useQuery({ queryKey: ['ops', 'periods'], queryFn: opsApi.periods, retry: false })
  const metrics = useQuery({ queryKey: ['ops', 'metric-keys'], queryFn: opsApi.metricKeys, retry: false })
  const commitments = useQuery({
    queryKey: ['ops', 'commitments', me.data?.key, period],
    queryFn: () => opsApi.commitments(me.data!.key, period),
    enabled: Boolean(me.data?.key),
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
            <span style={{ ...LABEL, fontSize: 9.5, marginLeft: 8 }}>by hand</span>
          )}
        </>
      ),
    },
    { head: 'Status', cell: (c) => readEnum(c.status) },
    {
      head: 'Blocked',
      // Orthogonal to status on purpose: blocked work is still in progress, and
      // collapsing the two loses the fact that somebody needs help.
      cell: (c) => (c.blocked ? c.blockerReason ?? 'yes' : '—'),
    },
    { head: 'Due', cell: (c) => <DueDate value={c.dueDate} /> },
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
    <main id="main" style={PAGE}>
      <OpsHeader name="Commitments" answers="What did I say I would do this cycle, and what happened?" />
      <select
        value={period}
        onChange={(e) => setPeriod(e.target.value)}
        style={{ marginBottom: 16, fontSize: 12.5, padding: '4px 6px', borderRadius: 6, border: '0.5px solid var(--gw-border)' }}
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
    </main>
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
    <main id="main" style={PAGE}>
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
          <div style={{ display: 'flex', gap: 6 }}>
            {(['APPROVED', 'CHANGES_REQUESTED', 'REJECTED'] as const).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => decide.mutate({ id: a.id, status })}
                style={{ ...CARD, padding: '4px 10px', fontSize: 12, cursor: 'pointer' }}
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
    </main>
  )
}

export function OpsSpendPage() {
  const spend = useQuery({ queryKey: ['ops', 'spend'], queryFn: opsApi.spend, retry: false })
  const balance = useQuery({ queryKey: ['ops', 'balance'], queryFn: opsApi.balance, retry: false })

  const columns: Column<OpsExpense>[] = [
    { head: 'What', cell: (e) => <strong>{e.description}</strong> },
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
            <div style={{ fontSize: 11.5, color: 'var(--gw-sub)' }}>not reviewed by a second person</div>
          )}
          {e.rejectedReason && (
            <div style={{ fontSize: 11.5, color: 'var(--gw-sub)' }}>{e.rejectedReason}</div>
          )}
        </>
      ),
    },
  ]

  return (
    <main id="main" style={PAGE}>
      <OpsHeader name="Spend" answers="What have I claimed, and what is left?" />

      {balance.data && (
        <section style={{ ...CARD, marginBottom: 14 }}>
          <p style={LABEL}>The money</p>
          <p style={{ fontSize: 20, fontWeight: 800, color: 'var(--gw-navy)', margin: '4px 0 0' }}>
            {money(balance.data.remaining)} left
          </p>
          <p style={{ fontSize: 12.5, color: 'var(--gw-sub)', margin: '2px 0 0' }}>
            {money(balance.data.earned)} earned · {money(balance.data.paid)} paid ·{' '}
            {money(balance.data.approvedNotPaid)} owed · {money(balance.data.awaitingDecision)} awaiting
            a decision
          </p>
          {balance.data.nobodyCanApprove.map((e) => (
            <p key={e.id} style={{ fontSize: 12.5, color: 'var(--gw-red-t)', margin: '8px 0 0' }}>
              {e.description} ({money(e.amount)}) — {e.why}
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
    </main>
  )
}

export function OpsFundraisePage() {
  const fundraise = useQuery({ queryKey: ['ops', 'fundraise'], queryFn: opsApi.fundraise, retry: false })
  const t = fundraise.data?.totals

  return (
    <main id="main" style={PAGE}>
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
              <div style={{ fontSize: 19, fontWeight: 800, color: 'var(--gw-navy)' }}>{s.v}</div>
              <div style={{ fontSize: 11.5, color: 'var(--gw-sub)', marginTop: 2 }}>{s.l}</div>
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
          { head: 'Next', cell: (f) => f.nextAction ?? '—' },
          { head: 'Due', cell: (f) => <DueDate value={f.nextActionDueAt} /> },
        ]}
        keyOf={(f) => f.id}
        empty="No funding conversations."
      />
    </main>
  )
}

export function OpsStrategyPage() {
  const strategy = useQuery({ queryKey: ['ops', 'strategy'], queryFn: opsApi.strategy, retry: false })

  const columns: Column<OpsStrategic>[] = [
    { head: 'Who', cell: (s) => <strong>{s.personOrNetwork}</strong> },
    { head: 'Where', cell: (s) => s.organization ?? '—' },
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
      cell: (s) => (s.convertedToType ? readEnum(s.convertedToType) : '—'),
    },
    { head: 'Next', cell: (s) => s.nextStep ?? '—' },
    { head: 'Due', cell: (s) => <DueDate value={s.nextStepDueAt} /> },
  ]

  return (
    <main id="main" style={PAGE}>
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
    </main>
  )
}

export function OpsIntegrationPage() {
  const status = useQuery({ queryKey: ['ops', 'integration'], queryFn: opsApi.integration, retry: false })
  const queryClient = useQueryClient()
  const push = useMutation({
    mutationFn: () => opsApi.pushToGroundwork('sept-2026-sprint'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ops', 'integration'] }),
  })

  const s = status.data

  return (
    <main id="main" style={PAGE}>
      <OpsHeader
        name="Groundwork"
        answers="Are we connected to our own product, and what did we last send?"
      />

      <section style={{ ...CARD, marginBottom: 12 }}>
        <p style={{ fontSize: 14, margin: 0 }}>{s?.says ?? 'Checking…'}</p>
        {s?.configured && (
          <p style={{ fontSize: 12.5, color: 'var(--gw-sub)', margin: '8px 0 0' }}>
            {s.baseUrl} · client {s.clientId} · secret {s.secretSet ? 'set' : 'missing'}
          </p>
        )}
      </section>

      {s?.enabled && (
        <button
          type="button"
          onClick={() => push.mutate()}
          disabled={push.isPending}
          style={{ ...CARD, cursor: 'pointer', fontSize: 13 }}
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
    </main>
  )
}
