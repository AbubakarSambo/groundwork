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

/**
 * WHAT GROUNDWORK HAS CALLED BACK TO THIS BACK OFFICE.
 *
 * It used to live under the assistant panel's chat, where it read as something the assistant had
 * said and its empty state read as a failure. Her words: confusing as fuck on the chat. It belongs
 * on the page somebody opens to find out whether an integration is actually wired, which is this
 * one.
 *
 * IT IS KEPT RATHER THAN DROPPED because the empty case is the only signal anywhere that our own
 * callbacks are not arriving - and its sentence separates the two reasons, which is the whole
 * value: nothing has happened is a different problem from nobody has registered where to send it.
 */
function WhatGroundworkHasSentUs() {
  const arrived = useQuery({
    queryKey: ['ops', 'groundwork-events'],
    queryFn: opsApi.groundworkEvents,
    retry: false,
  })
  if (!arrived.data) return null
  return (
    <div style={{ border: '1px solid var(--gw-border)', borderRadius: 10, padding: '12px 14px', marginBottom: 16, background: 'var(--gw-card)' }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gw-navy)', marginBottom: 2 }}>
        Callbacks from Groundwork to this back office
      </div>
      <div style={{ fontSize: 12, color: 'var(--gw-muted)', marginBottom: 8, lineHeight: 1.5 }}>
        We are a Groundwork customer too. This is what it has sent us, with each signature checked.
      </div>
      {(arrived.data.events ?? []).length === 0 ? (
        <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: '19px' }}>{arrived.data.says}</div>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {(arrived.data.events ?? []).slice(0, 8).map((e, i) => (
            <li key={i} style={{ fontSize: 12, color: 'var(--gw-sub)' }}>
              {/* A delivery that did not verify is the one worth seeing, so it is said first and in
                  the product's own words rather than shown as a red dot. */}
              {e.verified ? (e.says ?? e.kind) : `${e.kind} - the signature did not check out`}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

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
        <Link to={`/ops/companies/${d.company.key}`} style={{ color: 'var(--gw-navy)', fontWeight: 700 }}>
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
    { head: 'Why', cell: (d) => d.blockerSummary ?? ' - ' },
    { head: 'Target live', cell: (d) => <DueDate value={d.targetLiveDate} /> },
  ]

  return (
    <section style={PAGE}>
      <OpsHeader name="Deployment" answers="Who is stuck getting live, and on what?" />
      <WhatGroundworkHasSentUs />
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
    </section>
  )
}

export function OpsMarketingPage() {
  const campaigns = useQuery({ queryKey: ['ops', 'campaigns'], queryFn: opsApi.campaigns, retry: false })

  /* The objectives a campaign may be run for. Read from the period containing
     today: a campaign planned now belongs to the quarter running now, and
     offering every objective we have ever had would make the picker a list. */
  const periods = useQuery({ queryKey: ['ops', 'periods'], queryFn: opsApi.periods, retry: false })
  const objectives = useQuery({
    queryKey: ['ops', 'objectives', periods.data?.[0]?.key],
    queryFn: () => opsApi.objectives(periods.data![0].key),
    enabled: (periods.data?.length ?? 0) > 0,
    retry: false,
  })

  const columns: Column<OpsCampaign>[] = [
    { head: 'Campaign', cell: (c) => <strong>{c.title}</strong> },
    { head: 'Kind', cell: (c) => c.activityType },
    { head: 'Channel', cell: (c) => c.channel ?? ' - ' },
    { head: 'Status', cell: (c) => readEnum(c.status) },
    { head: 'Started', cell: (c) => readDate(c.startDate) },
    {
      head: 'Run for',
      /* THE OBJECTIVE, NOT THE SENTENCE. A campaign that predates the rule
         says so, which is the finding rather than a blank cell. */
      cell: (c) => (
        <>
          {c.linkedObjective ? c.linkedObjective.title : <em>no objective named</em>}
          {c.alignment && (
            <div style={{ fontSize: 12, color: 'var(--gw-sub)', marginTop: 3, lineHeight: 1.5 }}>
              {c.alignment}
            </div>
          )}
        </>
      ),
    },
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
    <section style={PAGE}>
      <OpsHeader name="Marketing" answers="What did we put out, and what did it bring in?" />
      <Adder
        title="Plan a campaign"
        fields={[
          { name: 'title', label: 'What is it', required: true },
          { name: 'activityType', label: 'Kind', required: true, placeholder: 'Outbound sequence' },
          { name: 'channel', label: 'Channel', placeholder: 'Email' },
          { name: 'startDate', label: 'Starts', type: 'date', required: true },
          /* THE OBJECTIVE IS PART OF PLANNING IT, not something added after.
             Marketing is the easiest work in the company to start on
             enthusiasm and the hardest to argue with once it has produced
             something, so the link belongs at the point where stopping is
             still cheap. */
          {
            name: 'objectiveId',
            label: 'Run for which objective',
            required: true,
            options: (objectives.data ?? []).map((o) => ({ value: o.id, label: o.title })),
          },
          {
            name: 'objective',
            label: 'Why this moves that objective',
            required: true,
            placeholder: 'The objective needs ten qualified companies and this is where they come from.',
          },
        ]}
        submit={(v) =>
          opsApi.addCampaign({
            title: v.title,
            activityType: v.activityType,
            channel: v.channel || undefined,
            startDate: v.startDate,
            objectiveId: v.objectiveId,
            objective: v.objective,
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
    </section>
  )
}
