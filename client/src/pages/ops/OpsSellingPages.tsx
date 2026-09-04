import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { opsApi, type OpsOpportunity, type OpsDeployment, type OpsCampaign } from '@/api/ops'
import { OpsHeader, PAGE } from './OpsLayout'
import { OpsTable, readEnum, readDate, DueDate, type Column } from './OpsTable'
import { Adder, Choose } from './OpsForm'

const SALES_STAGES = ['LEAD', 'CONTACTED', 'MEETING', 'PROPOSAL_TRIAL', 'CONVERTED', 'LOST'] as const
const DEPLOYMENT_STAGES = ['READY_SIGNED', 'SETUP', 'ONBOARDING', 'FIRST_USE', 'LIVE'] as const

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
    {
      head: 'Stage',
      cell: (o) => (
        <Choose
          label={`Stage for ${o.company.name}`}
          value={o.stage}
          options={SALES_STAGES}
          onPick={(next) => opsApi.advanceOpportunity(o.id, next)}
          invalidate={[['ops']]}
        />
      ),
    },
    { head: 'Worth', cell: (o) => money(o.estimatedValue), numeric: true },
    { head: 'Came from', cell: (o) => o.campaign?.title ?? '—' },
    {
      head: 'Next',
      cell: (o) => (
        <>
          {o.nextAction ?? <span style={{ color: 'var(--gw-sub)' }}>nothing planned</span>}
          <Adder
            title={o.nextAction ? 'change' : 'set one'}
            fields={[
              { name: 'nextAction', label: 'What happens next', required: true },
              { name: 'dueAt', label: 'By', type: 'date' },
            ]}
            submit={(v) => opsApi.setFollowUp(o.id, v.nextAction, v.dueAt || undefined)}
            invalidate={[['ops']]}
            submitLabel="Set it"
          />
        </>
      ),
    },
    { head: 'Due', cell: (o) => <DueDate value={o.nextActionDueAt} /> },
    {
      head: 'Log',
      /* A call or a demo, recorded where the deal is. Every stage metric counts
         these, so a conversation nobody logs is a cycle that looks quiet. */
      cell: (o) => (
        <Adder
          title="what happened"
          fields={[
            { name: 'kind', label: 'What', required: true, placeholder: 'call, demo, proposal_sent' },
            { name: 'note', label: 'Anything worth keeping', type: 'textarea' },
          ]}
          submit={(v) => opsApi.logActivity(o.id, { kind: v.kind, note: v.note || undefined })}
          invalidate={[['ops']]}
          submitLabel="Log it"
        />
      ),
    },
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
      <Adder
        title="Open an opportunity"
        fields={[
          { name: 'companyKey', label: 'Company key', required: true, placeholder: 'meridian-care' },
          { name: 'estimatedValue', label: 'Worth', type: 'number' },
          { name: 'useCaseSummary', label: 'What they want', type: 'textarea' },
        ]}
        submit={(v) =>
          opsApi.openOpportunity({
            companyKey: v.companyKey,
            estimatedValue: v.estimatedValue ? Number(v.estimatedValue) : undefined,
            useCaseSummary: v.useCaseSummary || undefined,
          })
        }
        invalidate={[['ops']]}
        submitLabel="Open it"
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
    {
      head: 'Stage',
      cell: (d) => (
        <Choose
          label={`Stage for ${d.company.name}`}
          value={d.stage}
          options={DEPLOYMENT_STAGES}
          onPick={(next) => opsApi.advanceDeployment(d.id, next)}
          invalidate={[['ops']]}
        />
      ),
    },
    {
      head: 'Days in it',
      // Reading the start date and doing the arithmetic in your head is the
      // thing a table is supposed to save you.
      cell: (d) => Math.floor((Date.now() - new Date(d.startDate).getTime()) / 86400000),
      numeric: true,
    },
    { head: 'First used', cell: (d) => readDate(d.firstUseAt) },
    {
      head: 'Waiting on',
      cell: (d) => (
        <>
          {d.blockerType ?? <span style={{ color: 'var(--gw-sub)' }}>nothing</span>}
          <Adder
            title={d.blockerType ? 'change' : 'record one'}
            fields={[
              {
                name: 'type',
                label: 'Who it is waiting on',
                required: true,
                options: ['Product', 'Tech', 'UX', 'Them', 'Us'].map((t) => ({ value: t, label: t })),
              },
              { name: 'summary', label: 'What exactly', type: 'textarea', required: true },
            ]}
            submit={(v) => opsApi.setDeploymentBlocker(d.id, v.type, v.summary)}
            invalidate={[['ops']]}
            submitLabel="Record it"
          />
        </>
      ),
    },
    { head: 'Why', cell: (d) => d.blockerSummary ?? '—' },
    { head: 'Target live', cell: (d) => <DueDate value={d.targetLiveDate} /> },
  ]

  return (
    <main id="main" style={PAGE}>
      <OpsHeader name="Deployment" answers="Who is stuck getting live, and on what?" />
      <Adder
        title="Start a deployment"
        fields={[
          { name: 'companyKey', label: 'Company key', required: true, placeholder: 'meridian-care' },
          { name: 'targetLiveDate', label: 'Target live', type: 'date' },
        ]}
        submit={(v) =>
          opsApi.startDeployment({ companyKey: v.companyKey, targetLiveDate: v.targetLiveDate || undefined })
        }
        invalidate={[['ops']]}
        submitLabel="Start it"
      />
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
      <Adder
        title="Plan a campaign"
        fields={[
          { name: 'title', label: 'What is it', required: true },
          { name: 'activityType', label: 'Kind', required: true, placeholder: 'Outbound sequence' },
          { name: 'channel', label: 'Channel', placeholder: 'Email' },
          { name: 'startDate', label: 'Starts', type: 'date', required: true },
        ]}
        submit={(v) =>
          opsApi.addCampaign({
            title: v.title,
            activityType: v.activityType,
            channel: v.channel || undefined,
            startDate: v.startDate,
          })
        }
        invalidate={[['ops']]}
        submitLabel="Plan it"
      />
      <OpsTable
        rows={campaigns.data}
        columns={columns}
        keyOf={(c) => c.id}
        empty="No campaigns yet."
      />
    </main>
  )
}
