import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { opsApi, type OpsRoadmapItem, type OpsUseCase, type OpsWorkItem } from '@/api/ops'
import { OpsHeader, PAGE } from './OpsLayout'
import { OpsTable, DueDate, type Column } from './OpsTable'
import { Adder, Choose } from './OpsForm'

const ROADMAP_STATUSES = ['PROPOSED', 'READY', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED'] as const
const WORK_STATUSES = ['OPEN', 'IN_PROGRESS', 'BLOCKED', 'RESOLVED'] as const
const READINESS = ['UNKNOWN', 'REVIEWING', 'GAP_IDENTIFIED', 'IN_PROGRESS', 'PRODUCT_READY'] as const

/** What we build: the roadmap, whether a client is supported, tech and UX. */

export function OpsRoadmapPage() {
  const roadmap = useQuery({ queryKey: ['ops', 'roadmap'], queryFn: opsApi.roadmap, retry: false })

  const columns: Column<OpsRoadmapItem>[] = [
    { head: '#', cell: (r) => r.priority, numeric: true },
    {
      head: 'Item',
      cell: (r) => (
        <>
          <strong>{r.title}</strong>
          {/*
            The note on an item is where somebody wrote down what is unresolved
            about it. Hiding it behind a click is how it stops being read.
          */}
          {r.rationale && (
            <div style={{ fontSize: 12, color: 'var(--gw-sub)', marginTop: 3, maxWidth: 480 }}>
              {r.rationale}
            </div>
          )}
        </>
      ),
    },
    { head: 'Kind', cell: (r) => r.itemType },
    {
      head: 'Status',
      /* The refusal lands here when a decision is outstanding, which is where
         somebody who just tried to start it is looking. */
      cell: (r) => (
        <Choose
          label={`Status of ${r.title}`}
          value={r.status}
          options={ROADMAP_STATUSES}
          onPick={(next) => opsApi.setRoadmapStatus(r.id, next)}
          invalidate={[['ops']]}
        />
      ),
    },
    {
      head: 'Decision',
      cell: (r) =>
        r.approvalRequired
          ? r.status === 'PROPOSED'
            ? 'waiting'
            : 'given'
          : 'not needed',
    },
    { head: 'Target', cell: (r) => <DueDate value={r.targetDate} /> },
  ]

  return (
    <main id="main" style={PAGE}>
      <OpsHeader name="Roadmap" answers="What are we building, and in what order?" />
      <Adder
        title="Propose something"
        fields={[
          { name: 'title', label: 'What', required: true },
          { name: 'description', label: 'What it covers', type: 'textarea' },
          { name: 'itemType', label: 'Kind', required: true, placeholder: 'feature, stability, infrastructure' },
          { name: 'priority', label: 'Priority', type: 'number', placeholder: '3' },
          {
            name: 'approvalRequired',
            label: 'Needs a decision before it starts',
            options: [
              { value: 'yes', label: 'Yes' },
              { value: 'no', label: 'No' },
            ],
          },
        ]}
        submit={(v) =>
          opsApi.propose({
            title: v.title,
            description: v.description || undefined,
            itemType: v.itemType,
            priority: v.priority ? Number(v.priority) : undefined,
            approvalRequired: v.approvalRequired === 'yes',
          })
        }
        invalidate={[['ops']]}
        submitLabel="Propose it"
      />
      <OpsTable
        rows={roadmap.data}
        columns={columns}
        keyOf={(r) => r.id}
        empty="Nothing proposed yet."
      />
    </main>
  )
}

export function OpsReadinessPage() {
  const useCases = useQuery({ queryKey: ['ops', 'use-cases'], queryFn: opsApi.useCases, retry: false })

  const columns: Column<OpsUseCase>[] = [
    {
      head: 'Company',
      cell: (u) => (
        <Link to={`/ops/companies/${u.company.key}`} style={{ color: 'var(--gw-navy)', fontWeight: 600 }}>
          {u.company.name}
        </Link>
      ),
    },
    { head: 'Use case', cell: (u) => u.title },
    {
      head: 'Where it is',
      /* Refuses PRODUCT_READY while a gap is written down, and says which gap.
         The refusal appearing next to the gaps is the whole point. */
      cell: (u) => (
        <Choose
          label={`Readiness of ${u.title}`}
          value={u.productReadiness}
          options={READINESS}
          onPick={(next) => opsApi.setReadiness(u.id, { readiness: next })}
          invalidate={[['ops']]}
        />
      ),
    },
    {
      head: 'What is missing',
      /*
       * Three gaps in one column, each labelled by whose it is. Three columns
       * would be mostly empty and would hide the one thing worth reading.
       */
      cell: (u) => {
        const gaps = [
          u.productGap && `Product: ${u.productGap}`,
          u.uxGap && `UX: ${u.uxGap}`,
          u.technicalGap && `Tech: ${u.technicalGap}`,
        ].filter(Boolean) as string[]
        if (gaps.length === 0) return <span style={{ color: 'var(--gw-sub)' }}>nothing</span>
        return (
          <div style={{ maxWidth: 420 }}>
            {gaps.map((g) => (
              <div key={g} style={{ marginBottom: 2 }}>
                {g}
              </div>
            ))}
          </div>
        )
      },
    },
    { head: 'Next', cell: (u) => u.nextAction ?? '—' },
  ]

  return (
    <main id="main" style={PAGE}>
      <OpsHeader
        name="Readiness"
        answers="Whose use case are we not supporting, and what would it take?"
      />
      <Adder
        title="Record what a company wants to do"
        fields={[
          { name: 'companyKey', label: 'Company key', required: true, placeholder: 'meridian-care' },
          { name: 'title', label: 'The use case', required: true },
          { name: 'expectedWorkflow', label: 'What they expect to happen', type: 'textarea' },
        ]}
        submit={(v) =>
          opsApi.addUseCase({
            companyKey: v.companyKey,
            title: v.title,
            expectedWorkflow: v.expectedWorkflow || undefined,
          })
        }
        invalidate={[['ops']]}
        submitLabel="Record it"
      />
      <OpsTable
        rows={useCases.data}
        columns={columns}
        keyOf={(u) => u.id}
        empty="No use case has been recorded. Until one is, nobody has asked whether we support anybody."
      />
    </main>
  )
}

function workItemColumns(kind: 'tech' | 'ux'): Column<OpsWorkItem>[] {
  return [
    { head: kind === 'tech' ? 'Item' : 'Issue', cell: (i) => <strong>{i.title}</strong> },
    {
      head: kind === 'tech' ? 'Kind' : 'Flow',
      cell: (i) => (kind === 'tech' ? i.itemType ?? '—' : i.affectedFlow ?? '—'),
    },
    { head: 'Severity', cell: (i) => i.severity },
    {
      head: 'Status',
      cell: (i) => (
        <Choose
          label={`Status of ${i.title}`}
          value={i.status}
          options={WORK_STATUSES}
          onPick={(next) =>
            kind === 'tech' ? opsApi.setTechStatus(i.id, next) : opsApi.setUXStatus(i.id, next)
          }
          invalidate={[['ops']]}
        />
      ),
    },
    ...(kind === 'tech'
      ? [{ head: 'Blocked on', cell: (i: OpsWorkItem) => i.blockerReason ?? '—' }]
      : []),
    { head: 'Due', cell: (i) => <DueDate value={i.targetDate} /> },
  ]
}

export function OpsTechPage() {
  const tech = useQuery({ queryKey: ['ops', 'tech'], queryFn: opsApi.tech, retry: false })
  return (
    <main id="main" style={PAGE}>
      <OpsHeader name="Tech" answers="What is in my way, and what is holding a client up?" />
      <Adder
        title="Raise something"
        fields={[
          { name: 'title', label: 'What is wrong', required: true },
          { name: 'itemType', label: 'Kind', required: true, placeholder: 'bug, infrastructure' },
          {
            name: 'severity',
            label: 'How bad',
            required: true,
            options: ['critical', 'high', 'medium', 'low'].map((s) => ({ value: s, label: s })),
          },
          { name: 'targetDate', label: 'Due', type: 'date' },
        ]}
        submit={(v) =>
          opsApi.addTech({
            title: v.title,
            itemType: v.itemType,
            severity: v.severity,
            targetDate: v.targetDate || undefined,
          })
        }
        invalidate={[['ops']]}
        submitLabel="Raise it"
      />
      <OpsTable
        rows={tech.data}
        columns={workItemColumns('tech')}
        keyOf={(i) => i.id}
        empty="Nothing raised."
      />
    </main>
  )
}

export function OpsUXPage() {
  const ux = useQuery({ queryKey: ['ops', 'ux'], queryFn: opsApi.ux, retry: false })
  return (
    <main id="main" style={PAGE}>
      <OpsHeader name="UX" answers="What is hard to use, and where did we notice?" />
      <Adder
        title="Record an interface problem"
        fields={[
          { name: 'title', label: 'What is hard', required: true },
          { name: 'affectedFlow', label: 'Where', placeholder: 'Check-in list' },
          {
            name: 'severity',
            label: 'How bad',
            required: true,
            options: ['critical', 'high', 'medium', 'low'].map((s) => ({ value: s, label: s })),
          },
          /* Whose words this came from. A problem somebody reported is worth
             more than one somebody thought of, and the board should be able to tell. */
          { name: 'sourceNote', label: 'Where we noticed it', type: 'textarea' },
        ]}
        submit={(v) =>
          opsApi.addUX({
            title: v.title,
            affectedFlow: v.affectedFlow || undefined,
            severity: v.severity,
            sourceNote: v.sourceNote || undefined,
          })
        }
        invalidate={[['ops']]}
        submitLabel="Record it"
      />
      <OpsTable
        rows={ux.data}
        columns={workItemColumns('ux')}
        keyOf={(i) => i.id}
        empty="Nothing recorded."
      />
    </main>
  )
}
