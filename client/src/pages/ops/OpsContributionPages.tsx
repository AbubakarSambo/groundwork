import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { opsApi, type OpsPositioningRecord, type OpsClaim } from '@/api/ops'
import { OpsHeader, PAGE, CARD, LABEL } from './OpsLayout'
import { OpsTable, readDate, readEnum, type Column } from './OpsTable'
import { Adder, Choose } from './OpsForm'

/**
 * Commercial contribution, market access, and the review of who created what.
 *
 * The words on these pages matter as much as the arithmetic. Nothing here is a
 * leaderboard, a ranking, a score or a top performer - the point is relative
 * visibility so that a conversation about what somebody created can be had from
 * evidence, and an ordering of people from best to worst is a different product.
 */

const money = (n: number | string | null | undefined) =>
  n === null || n === undefined ? ' - ' : `$${Number(n).toLocaleString()}`

const WINDOWS = [
  { key: 'all', label: 'All time', from: undefined, to: undefined },
  { key: 'quarter', label: 'This quarter', from: '2026-07-01', to: '2026-09-30' },
  { key: 'six', label: 'Last 6 months', from: '2026-03-01', to: '2026-09-30' },
  { key: 'ytd', label: 'Year to date', from: '2026-01-01', to: '2026-12-31' },
]

export function OpsContributionPage() {
  const [window, setWindow] = useState(WINDOWS[0])
  const me = useQuery({ queryKey: ['ops', 'me'], queryFn: opsApi.me, retry: false })
  const people = useQuery({ queryKey: ['ops', 'people'], queryFn: opsApi.people, retry: false })

  const share = useQuery({
    queryKey: ['ops', 'share', window.key],
    queryFn: () => opsApi.shareOfNewRevenue(window.from, window.to),
    retry: false,
  })

  /* Everybody's, where the caller may; otherwise just their own. */
  const canSeeAll = me.data?.capabilities.includes('commercial:read-all') ?? false
  const keys = canSeeAll ? (people.data ?? []).map((p) => p.key) : me.data ? [me.data.key] : []

  const ledgers = useQuery({
    queryKey: ['ops', 'ledgers', keys.join(','), window.key],
    queryFn: () => Promise.all(keys.map((k) => opsApi.ledger(k, window.from, window.to))),
    enabled: keys.length > 0,
    retry: false,
  })

  return (
    <section className="gw-page" style={PAGE}>
      <OpsHeader
        name="Commercial contribution"
        answers="What has each person actually created, and what share of new revenue came from them?"
      />

      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
        {WINDOWS.map((w) => (
          <button
            key={w.key}
            type="button"
            onClick={() => setWindow(w)}
            aria-pressed={w.key === window.key}
            style={{
              border: '1px solid var(--gw-border)',
              borderRadius: 20,
              padding: '3px 11px',
              fontSize: 12,
              cursor: 'pointer',
              background: w.key === window.key ? 'var(--gw-navy)' : 'white',
              color: w.key === window.key ? 'white' : 'var(--gw-navy)',
            }}
          >
            {w.label}
          </button>
        ))}
      </div>

      {share.data && (
        <section style={{ ...CARD, marginBottom: 14 }}>
          <p style={LABEL}>Share of new revenue created</p>
          <p style={{ fontSize: 12.5, color: 'var(--gw-sub)', margin: '4px 0 10px' }}>{share.data.says}</p>

          {(share.data.rows ?? []).map((r) => (
            <div key={r.personKey} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '4px 0' }}>
              <span style={{ fontSize: 13.5, width: 120, flex: 'none' }}>{r.person}</span>
              <span style={{ fontSize: 13.5, fontWeight: 700, width: 90, flex: 'none', fontVariantNumeric: 'tabular-nums' }}>
                {money(r.revenue)}
              </span>
              <div style={{ flex: 1, background: 'rgba(12,68,124,0.08)', borderRadius: 4, height: 8 }}>
                <div style={{ width: `${r.share ?? 0}%`, height: '100%', background: 'var(--gw-navy)', borderRadius: 4 }} />
              </div>
              <span style={{ fontSize: 13, width: 44, textAlign: 'right', flex: 'none' }}>{r.share}%</span>
            </div>
          ))}

          {share.data.unattributed > 0 && (
            /*
             * Shown rather than dropped. Otherwise the shares add to 100% of a
             * number smaller than the company actually made, and the gap - which
             * is the thing somebody should be closing - is invisible.
             */
            <p style={{ fontSize: 12.5, color: 'var(--gw-red-t)', margin: '10px 0 0' }}>
              {money(share.data.unattributed)} is not attributed to anybody. Until somebody says who
              created it, these shares are of {money(share.data.total)} rather than of everything.
            </p>
          )}

          {(share.data.rows ?? []).length === 0 && (
            <p style={{ fontSize: 13, color: 'var(--gw-sub)', margin: 0 }}>
              Nothing attributed in this window.
            </p>
          )}
        </section>
      )}

      {(ledgers.data ?? []).map((l) => (
        <section key={l.person.key} style={{ ...CARD, marginBottom: 12 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', flexWrap: 'wrap' }}>
            <strong style={{ fontSize: 15, color: 'var(--gw-navy)' }}>{l.person.displayName}</strong>
            {/*
              Said on every ledger, every time. A page of zeroes with no
              explanation reads as a verdict, and for most of this team
              commercial acquisition is simply not their job.
            */}
            <span style={{ fontSize: 12, color: 'var(--gw-sub)' }}>{l.note}</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 10 }}>
            <div>
              <p style={{ ...LABEL, fontSize: 9.5 }}>Originated</p>
              <p style={{ fontSize: 13, margin: '4px 0 0' }}>
                {l.origination.payingClients} paying client
                {l.origination.payingClients === 1 ? '' : 's'} · {money(l.origination.cashCollected)} cash
                <br />
                {l.origination.creditsEarned} of {l.origination.creditsPossible} client value credits
                <br />
                <span style={{ color: 'var(--gw-sub)' }}>
                  {money(l.origination.retained6Month)} retained past six months
                </span>
              </p>
            </div>
            <div>
              <p style={{ ...LABEL, fontSize: 9.5 }}>Market access</p>
              {/*
                The whole funnel, because "ten introductions" and "ten
                introductions that produced two clients" are different facts and
                only the far end tells them apart.
              */}
              <p style={{ fontSize: 13, margin: '4px 0 0' }}>
                {l.positioning.introductions} introduction
                {l.positioning.introductions === 1 ? '' : 's'} → {l.positioning.qualifiedAccess} qualified
                access → {l.positioning.qualifiedOpportunities} opportunit
                {l.positioning.qualifiedOpportunities === 1 ? 'y' : 'ies'} → {l.positioning.payingClients} client
                {l.positioning.payingClients === 1 ? '' : 's'}
                <br />
                <span style={{ color: 'var(--gw-sub)' }}>{money(l.positioning.revenue)} downstream</span>
              </p>
            </div>
          </div>

          {l.origination.clients.length > 0 && (
            <ul style={{ listStyle: 'none', margin: '10px 0 0', padding: 0 }}>
              {l.origination.clients.map((c) => (
                <li key={c.opportunity} style={{ fontSize: 12.5, color: 'var(--gw-sub)', padding: '2px 0' }}>
                  {c.company} - {money(c.cash)} · {c.credit}
                </li>
              ))}
            </ul>
          )}

          {/*
            What they are OWED, in its own block, visually apart from what they
            created. A reader glancing at this must never be able to mistake one
            for the other - that confusion is the whole reason the two are kept
            in different tables.
          */}
          <p
            style={{
              fontSize: 12.5,
              margin: '10px 0 0',
              paddingTop: 8,
              borderTop: '1px solid var(--gw-border)',
              color: l.entitlement.percent === null ? 'var(--gw-sub)' : 'var(--gw-navy)',
            }}
          >
            <strong>Their agreement: </strong>
            {l.entitlement.percent === null
              ? l.entitlement.says
              : `${money(l.entitlement.originatorShare)} - ${l.entitlement.says}`}
          </p>

          {l.notCounting.length > 0 && (
            <p style={{ fontSize: 12.5, color: 'var(--gw-sub)', margin: '8px 0 0' }}>
              {l.notCounting.length} not counting: {l.notCounting[0].why}
            </p>
          )}
        </section>
      ))}
    </section>
  )
}

const POSITIONING_STAGES = [
  'TARGET',
  'INTRODUCTION',
  'MEETING',
  'QUALIFIED_ACCESS',
  'OPPORTUNITY_CREATED',
  'COMMERCIAL_OUTCOME',
  'CLOSED',
] as const

export function OpsPositioningPage() {
  const records = useQuery({
    queryKey: ['ops', 'positioning'],
    queryFn: opsApi.positioningRecords,
    retry: false,
  })

  const columns: Column<OpsPositioningRecord>[] = [
    { head: 'Who', cell: (r) => <strong>{r.personOrNetwork}</strong> },
    { head: 'Where', cell: (r) => r.organization ?? ' - ' },
    { head: 'Kind of access', cell: (r) => r.accessType },
    { head: 'Opened by', cell: (r) => r.contributor ?? ' - ' },
    {
      head: 'How far',
      cell: (r) => (
        <Choose
          label={`Stage for ${r.personOrNetwork}`}
          value={r.stage}
          options={POSITIONING_STAGES}
          onPick={(next) => opsApi.advancePositioning(r.id, next)}
          invalidate={[['ops']]}
        />
      ),
    },
    { head: 'Since', cell: (r) => readDate(r.openedAt) },
  ]

  return (
    <section className="gw-page" style={PAGE}>
      <OpsHeader
        name="Market access"
        answers="Whose relationships and networks are opening doors, and what came of them?"
      />

      {/*
        Said at the top rather than assumed. Recording access is worth doing
        whether or not it produces anything, and the number that matters is what
        came out of the far end.
      */}
      <p style={{ fontSize: 13, color: 'var(--gw-sub)', maxWidth: '62ch', marginBottom: 14 }}>
        An introduction is not a commercial outcome. A meeting is not a commercial outcome. Being
        connected to somebody important is not a commercial outcome. Record the access here; what it
        produced is on each person's contribution.
      </p>

      <Adder
        title="Record access you opened"
        fields={[
          { name: 'personOrNetwork', label: 'Who or what', required: true },
          { name: 'organization', label: 'Where they are' },
          { name: 'accessType', label: 'Kind of access', required: true, placeholder: 'Introduction to their COO' },
          { name: 'evidenceUrl', label: 'Where it can be seen' },
        ]}
        submit={(v) =>
          opsApi.openPositioning({
            personOrNetwork: v.personOrNetwork,
            organization: v.organization || undefined,
            accessType: v.accessType,
            evidenceUrl: v.evidenceUrl || undefined,
          })
        }
        invalidate={[['ops']]}
        submitLabel="Record it"
      />

      <OpsTable rows={records.data} columns={columns} keyOf={(r) => r.id} empty="Nothing recorded." />
    </section>
  )
}

export function OpsAttributionPage() {
  const claims = useQuery({ queryKey: ['ops', 'claims'], queryFn: opsApi.claims, retry: false })
  const people = useQuery({ queryKey: ['ops', 'people'], queryFn: opsApi.people, retry: false })

  const readRole = (r: string) =>
    r === 'OPPORTUNITY_ORIGINATOR' ? 'Opportunity originator' : 'Positioning source'

  return (
    <section className="gw-page" style={PAGE}>
      <OpsHeader
        name="Attribution review"
        answers="Who says they created what, and is that right?"
      />

      {(claims.data ?? []).map((c: OpsClaim) => (
        <section key={c.id} style={{ ...CARD, marginBottom: 12 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', flexWrap: 'wrap' }}>
            <strong style={{ fontSize: 15, color: 'var(--gw-navy)' }}>{c.claimant}</strong>
            <span style={{ fontSize: 13.5 }}> - {c.company}</span>
            <span style={{ ...LABEL, fontSize: 9.5, marginLeft: 'auto' }}>{readRole(c.role)}</span>
          </div>

          <p style={{ fontSize: 13.5, margin: '8px 0 0' }}>{c.opportunity}</p>
          <p style={{ fontSize: 13, color: 'var(--gw-sub)', margin: '4px 0 0' }}>
            <strong>Claim: </strong>
            {c.claimedBasis}
          </p>
          {c.evidenceUrl && (
            <a href={c.evidenceUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12.5 }}>
              evidence
            </a>
          )}
          {/*
            The record's own date next to the claim's, because a claim made long
            after the record was created is exactly the retrospective claim this
            queue exists to catch.
          */}
          <p style={{ fontSize: 12, color: 'var(--gw-sub)', margin: '6px 0 10px' }}>
            Record created {readDate(c.recordCreatedAt)} · claimed {readDate(c.claimedAt)}
          </p>

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <Adder
              title="Approve"
              fields={[{ name: 'note', label: 'Anything worth recording', type: 'textarea' }]}
              submit={(v) => opsApi.decideClaim(c.id, { state: 'APPROVED', note: v.note || undefined })}
              invalidate={[['ops']]}
              submitLabel="Approve it"
            />
            <Adder
              title="It was somebody else"
              fields={[
                {
                  name: 'insteadPersonId',
                  label: 'Who actually created it',
                  required: true,
                  options: (people.data ?? []).map((p) => ({ value: p.id, label: p.displayName })),
                },
                { name: 'note', label: 'Why', type: 'textarea', required: true },
              ]}
              submit={(v) =>
                opsApi.decideClaim(c.id, {
                  state: 'APPROVED',
                  insteadPersonId: v.insteadPersonId,
                  note: v.note,
                })
              }
              invalidate={[['ops']]}
              submitLabel="Credit them instead"
            />
            <Adder
              title="Reject"
              fields={[{ name: 'note', label: 'Why not', type: 'textarea', required: true }]}
              submit={(v) => opsApi.decideClaim(c.id, { state: 'REJECTED', note: v.note })}
              invalidate={[['ops']]}
              submitLabel="Reject it"
            />
          </div>
        </section>
      ))}

      {claims.data?.length === 0 && (
        <p style={{ fontSize: 13, color: 'var(--gw-sub)' }}>Nothing waiting on a decision.</p>
      )}
    </section>
  )
}

const COMMERCIAL_STAGES = [
  'LEAD',
  'QUALIFIED',
  'DEMO_DISCOVERY',
  'PROPOSAL',
  'VERBAL_YES',
  'PAYING',
  'RETAINED_3_MONTH',
  'RETAINED_6_MONTH',
  'RETAINED_12_MONTH',
  'LOST',
] as const

/**
 * The commercial pipeline.
 *
 * Attribution is shown on every row and claimed from it, because who created a
 * deal is a fact about the deal rather than something recorded elsewhere and
 * kept in step. A row with nobody recorded says so plainly - "nobody has said"
 * is the honest state, and it is not the same as the sales owner's name.
 */
/** Every attribution decision ever made about one opportunity, on request. */
function HowAttributionGotHere({ opportunityId }: { opportunityId: string }) {
  const [open, setOpen] = useState(false)
  const history = useQuery({
    queryKey: ['ops', 'attribution-history', opportunityId],
    queryFn: () => opsApi.attributionHistory(opportunityId),
    enabled: open,
    retry: false,
  })

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        style={{ all: 'unset', cursor: 'pointer', ...LABEL, fontSize: 10 }}
      >
        {open ? 'Hide' : 'How'}
      </button>
      {open && (
        <ul style={{ margin: '5px 0 0', paddingLeft: 16, fontSize: 12, color: 'var(--gw-sub)' }}>
          {(history.data ?? []).map((h) => (
            <li key={h.id} style={{ marginBottom: 3 }}>
              {readEnum(h.kind)} · {readDate(h.occurredAt)}
              {h.actor ? ` · ${h.actor}` : ''}
              {h.note ? ` - ${h.note}` : ''}
            </li>
          ))}
          {history.data?.length === 0 && <li>Nothing recorded. Nobody has claimed it.</li>}
          {history.isLoading && <li>Looking…</li>}
        </ul>
      )}
    </>
  )
}

export function OpsCommercialPipelinePage() {
  const pipeline = useQuery({
    queryKey: ['ops', 'commercial-pipeline'],
    queryFn: opsApi.commercialPipeline,
    retry: false,
  })
  const people = useQuery({ queryKey: ['ops', 'people'], queryFn: opsApi.people, retry: false })
  const nameOf = (id: string | null) =>
    id ? people.data?.find((p) => p.id === id)?.displayName ?? ' - ' : null

  const cashOf = (o: { payments: Array<{ amount: string }> }) =>
    o.payments.reduce((sum, p) => sum + Number(p.amount), 0)

  const columns: Column<(typeof pipeline.data extends (infer T)[] | undefined ? T : never)>[] = [
    { head: 'Company', cell: (o) => <strong>{o.company.name}</strong> },
    { head: 'Opportunity', cell: (o) => o.name },
    {
      head: 'Stage',
      cell: (o) => (
        <Choose
          label={`Stage for ${o.name}`}
          value={o.stage}
          options={COMMERCIAL_STAGES}
          onPick={(next) => opsApi.advanceCommercial(o.id, next)}
          invalidate={[['ops']]}
        />
      ),
    },
    {
      head: 'Originated by',
      cell: (o) =>
        o.opportunityOriginatorId && o.originatorState === 'APPROVED' ? (
          nameOf(o.opportunityOriginatorId)
        ) : (
          <>
            <span style={{ color: 'var(--gw-sub)' }}>
              {o.originatorState === 'CLAIMED' ? 'claimed, undecided' : 'nobody has said'}
            </span>
            <Adder
              title="I created this"
              fields={[
                { name: 'claimedBasis', label: 'What it was based on', type: 'textarea', required: true },
                { name: 'evidenceUrl', label: 'Where it can be seen' },
              ]}
              submit={(v) =>
                opsApi.claimContribution(o.id, {
                  role: 'OPPORTUNITY_ORIGINATOR',
                  claimedBasis: v.claimedBasis,
                  evidenceUrl: v.evidenceUrl || undefined,
                })
              }
              invalidate={[['ops']]}
              submitLabel="Claim it"
            />
          </>
        ),
    },
    {
      head: 'Access from',
      cell: (o) =>
        o.positioningSourceId && o.positioningState === 'APPROVED' ? (
          nameOf(o.positioningSourceId)
        ) : (
          <Adder
            title="I opened this door"
            fields={[
              { name: 'claimedBasis', label: 'What access you created', type: 'textarea', required: true },
              { name: 'evidenceUrl', label: 'Where it can be seen' },
            ]}
            submit={(v) =>
              opsApi.claimContribution(o.id, {
                role: 'POSITIONING_SOURCE',
                claimedBasis: v.claimedBasis,
                evidenceUrl: v.evidenceUrl || undefined,
              })
            }
            invalidate={[['ops']]}
            submitLabel="Claim it"
          />
        ),
    },
    {
      head: 'Next',
      /* THE ONE PIPELINE COLUMN THAT COULD NOT BE FILLED. Every other board in
         this system asks what happens next; `PATCH /ops/commercial/pipeline/:id/next-action`
         was built and called by nothing, so an opportunity could sit at a stage
         with nobody able to record what would move it. */
      cell: (o) => (
        <>
          {o.nextAction ?? ' - '}
          <Adder
            title={o.nextAction ? 'change it' : 'say what is next'}
            fields={[
              { name: 'nextAction', label: 'What happens next', required: true },
              { name: 'nextActionDueAt', label: 'By when', type: 'date' },
            ]}
            submit={(v) =>
              opsApi.setCommercialNextAction(o.id, {
                nextAction: v.nextAction,
                nextActionDueAt: v.nextActionDueAt || undefined,
              })
            }
            invalidate={[['ops']]}
            submitLabel="Set it"
          />
        </>
      ),
    },
    {
      head: 'How it was decided',
      /* Attribution is the most contested thing on this page and its history was
         written and unreadable — `GET /:id/attribution-history` had no caller.
         A claim approved and later reversed looked identical to one nobody had
         ever questioned. */
      cell: (o) => <HowAttributionGotHere opportunityId={o.id} />,
    },
    /* Projected and actual side by side, and never added together. */
    { head: 'Projected', cell: (o) => money(o.estimatedContractValue), numeric: true },
    { head: 'Cash in', cell: (o) => money(cashOf(o)), numeric: true },
    {
      head: 'Payment',
      cell: (o) => (
        <Adder
          title="money arrived"
          fields={[
            { name: 'amount', label: 'How much', type: 'number', required: true },
            { name: 'paidAt', label: 'When', type: 'date', required: true },
            { name: 'reference', label: 'Reference', placeholder: 'invoice or bank reference' },
          ]}
          submit={(v) =>
            opsApi.recordCommercialPayment(o.id, {
              amount: Number(v.amount),
              paidAt: v.paidAt,
              reference: v.reference || undefined,
            })
          }
          invalidate={[['ops']]}
          submitLabel="Record it"
        />
      ),
    },
  ]

  return (
    <section className="gw-page" style={PAGE}>
      <OpsHeader
        name="Commercial pipeline"
        answers="What are we selling, who created each one, and what has actually been paid?"
      />

      <Adder
        title="Open an opportunity"
        fields={[
          { name: 'companyKey', label: 'Company key', required: true, placeholder: 'acme-health' },
          { name: 'name', label: 'What it is', required: true },
          { name: 'estimatedMrr', label: 'Projected monthly', type: 'number' },
          { name: 'estimatedContractValue', label: 'Projected contract value', type: 'number' },
        ]}
        submit={(v) =>
          opsApi.openCommercial({
            companyKey: v.companyKey,
            name: v.name,
            estimatedMrr: v.estimatedMrr ? Number(v.estimatedMrr) : undefined,
            estimatedContractValue: v.estimatedContractValue ? Number(v.estimatedContractValue) : undefined,
          })
        }
        invalidate={[['ops']]}
        submitLabel="Open it"
      />

      {/* Said once, on the page where somebody would otherwise assume otherwise. */}
      <p style={{ fontSize: 12.5, color: 'var(--gw-sub)', maxWidth: '64ch', marginBottom: 12 }}>
        Opening a record here does not make it yours. Whoever created the opportunity claims it, and
        somebody else approves - running the process afterwards is not origination.
      </p>

      <OpsTable
        rows={pipeline.data}
        columns={columns}
        keyOf={(o) => o.id}
        empty="Nothing in the commercial pipeline yet."
      />
    </section>
  )
}
