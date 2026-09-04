import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { opsApi, type OpsDeployment, type OpsCampaign } from '@/api/ops'
import { OpsHeader, PAGE } from './OpsLayout'
import { OpsTable, Filters, readEnum, readDate, DueDate, type Column, type Filter } from './OpsTable'
import { Adder, Choose } from './OpsForm'

const DEPLOYMENT_STAGES = ['READY_SIGNED', 'SETUP', 'ONBOARDING', 'FIRST_USE', 'LIVE'] as const

/** Getting people live, and the campaigns that reach them. */

/*
 * OpsSalesPage is gone with the pipeline it rendered. `/ops/pipeline` is the
 * one pipeline now, and it is the one that records who created each
 * opportunity - which was the entire reason for replacing it.
 */

export function OpsDeploymentPage() {
  const deployments = useQuery({
    queryKey: ['ops', 'deployments'],
    queryFn: opsApi.deployments,
    retry: false,
  })
  const [filter, setFilter] = useState<string | null>(null)

  const filters: Filter<OpsDeployment>[] = [
    { label: 'Not live yet', keep: (d) => d.stage !== 'LIVE' },
    { label: 'Blocked', keep: (d) => d.blockerType !== null && d.stage !== 'LIVE' },
    {
      label: 'Past target',
      keep: (d) => d.stage !== 'LIVE' && d.targetLiveDate !== null && new Date(d.targetLiveDate) < new Date(),
    },
  ]

  const all = deployments.data
  const shown = all && (filter ? all.filter(filters.find((f) => f.label === filter)!.keep) : all)

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
      <Filters
        filters={filters}
        active={filter}
        onPick={setFilter}
        showing={shown?.length ?? 0}
        total={all?.length ?? 0}
      />
      <OpsTable
        rows={shown}
        columns={columns}
        keyOf={(d) => d.id}
        filteredOutOf={all?.length}
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
