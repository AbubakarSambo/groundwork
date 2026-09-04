import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { opsApi, type OpsRoadmapItem, type OpsUseCase, type OpsWorkItem } from '@/api/ops'
import { OpsHeader, PAGE } from './OpsLayout'
import { OpsTable, readEnum, DueDate, type Column } from './OpsTable'

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
    { head: 'Status', cell: (r) => readEnum(r.status) },
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
    { head: 'Where it is', cell: (u) => readEnum(u.productReadiness) },
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
    { head: 'Status', cell: (i) => readEnum(i.status) },
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
      <OpsTable
        rows={ux.data}
        columns={workItemColumns('ux')}
        keyOf={(i) => i.id}
        empty="Nothing recorded."
      />
    </main>
  )
}
