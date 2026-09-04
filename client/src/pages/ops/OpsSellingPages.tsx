import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { opsApi, type OpsOpportunity, type OpsDeployment, type OpsCampaign } from '@/api/ops'
import { OpsHeader, PAGE } from './OpsLayout'
import { OpsTable, readEnum, readDate, DueDate, type Column } from './OpsTable'

/** Selling and getting people live: the pipeline, the campaigns, the deployments. */

const money = (v: string | null) => (v === null ? '—' : `$${Number(v).toLocaleString()}`)

export function OpsSalesPage() {
  const pipeline = useQuery({ queryKey: ['ops', 'pipeline'], queryFn: opsApi.pipeline, retry: false })

  const columns: Column<OpsOpportunity>[] = [
    {
      head: 'Company',
      // Through to the company rather than to the deal: somebody clicking a
      // name wants everything about them, not a bigger version of this row.
      cell: (o) => (
        <Link to={`/ops/companies/${o.company.key}`} style={{ color: 'var(--gw-navy)', fontWeight: 600 }}>
          {o.company.name}
        </Link>
      ),
    },
    { head: 'Stage', cell: (o) => readEnum(o.stage) },
    { head: 'Worth', cell: (o) => money(o.estimatedValue), numeric: true },
    { head: 'Came from', cell: (o) => o.campaign?.title ?? '—' },
    { head: 'Next', cell: (o) => o.nextAction ?? '—' },
    { head: 'Due', cell: (o) => <DueDate value={o.nextActionDueAt} /> },
    {
      head: 'Last touched',
      // The number that says whether a deal is being worked or is simply sitting.
      cell: (o) => readDate(o.lastActivityAt),
    },
  ]

  return (
    <main id="main" style={PAGE}>
      <OpsHeader
        name="Pipeline"
        answers="Who am I talking to, and what have I not followed up?"
      />
      <OpsTable
        rows={pipeline.data}
        columns={columns}
        keyOf={(o) => o.id}
        empty="No opportunities open. Add a company, then open one against it."
      />
    </main>
  )
}

export function OpsDeploymentPage() {
  const deployments = useQuery({
    queryKey: ['ops', 'deployments'],
    queryFn: opsApi.deployments,
    retry: false,
  })

  const columns: Column<OpsDeployment>[] = [
    {
      head: 'Client',
      cell: (d) => (
        <Link to={`/ops/companies/${d.company.key}`} style={{ color: 'var(--gw-navy)', fontWeight: 600 }}>
          {d.company.name}
        </Link>
      ),
    },
    { head: 'Stage', cell: (d) => readEnum(d.stage) },
    {
      head: 'Days in it',
      // Reading the start date and doing the arithmetic in your head is the
      // thing a table is supposed to save you.
      cell: (d) => Math.floor((Date.now() - new Date(d.startDate).getTime()) / 86400000),
      numeric: true,
    },
    { head: 'First used', cell: (d) => readDate(d.firstUseAt) },
    { head: 'Waiting on', cell: (d) => d.blockerType ?? '—' },
    { head: 'Why', cell: (d) => d.blockerSummary ?? '—' },
    { head: 'Target live', cell: (d) => <DueDate value={d.targetLiveDate} /> },
  ]

  return (
    <main id="main" style={PAGE}>
      <OpsHeader name="Deployment" answers="Who is stuck getting live, and on what?" />
      <OpsTable
        rows={deployments.data}
        columns={columns}
        keyOf={(d) => d.id}
        empty="Nobody is being deployed. Start one once a company converts."
      />
    </main>
  )
}

export function OpsMarketingPage() {
  const campaigns = useQuery({ queryKey: ['ops', 'campaigns'], queryFn: opsApi.campaigns, retry: false })

  const columns: Column<OpsCampaign>[] = [
    { head: 'Campaign', cell: (c) => <strong>{c.title}</strong> },
    { head: 'Kind', cell: (c) => c.activityType },
    { head: 'Channel', cell: (c) => c.channel ?? '—' },
    { head: 'Status', cell: (c) => readEnum(c.status) },
    { head: 'Started', cell: (c) => readDate(c.startDate) },
    {
      head: 'Led to',
      /*
       * Named, not counted. "2 leads" is a claim; the two companies are the
       * evidence, and they are what makes the campaign worth repeating or not.
       */
      cell: (c) =>
        c.opportunities.length === 0
          ? 'nothing yet'
          : c.opportunities.map((o) => o.company.name).join(', '),
    },
  ]

  return (
    <main id="main" style={PAGE}>
      <OpsHeader name="Marketing" answers="What did we put out, and what did it bring in?" />
      <OpsTable
        rows={campaigns.data}
        columns={columns}
        keyOf={(c) => c.id}
        empty="No campaigns yet."
      />
    </main>
  )
}
