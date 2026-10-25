import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { opsApi } from '@/api/ops'
import { PAGE, CARD, LABEL } from './OpsLayout'
import { readEnum, readDate, DueDate } from './OpsTable'
import { Adder, Choose } from './OpsForm'

/**
 * One company, every angle.
 *
 * The page that exists because the other seven make you assemble an answer.
 * "What is going on with Meridian" is a question about a company, and every
 * other page is organised by function — so answering it meant reading four
 * tables and holding the join in your head.
 */

const money = (v: string | null) => (v === null ? ' - ' : `$${Number(v).toLocaleString()}`)

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ ...CARD, marginBottom: 12 }}>
      <p style={LABEL}>{title}</p>
      <div style={{ marginTop: 8 }}>{children}</div>
    </section>
  )
}

const NOTHING: React.CSSProperties = { fontSize: 13, color: 'var(--gw-sub)', margin: 0 }

export default function OpsCompanyPage() {
  const { key = '' } = useParams()
  const detail = useQuery({
    queryKey: ['ops', 'company', key],
    queryFn: () => opsApi.company(key),
    retry: false,
  })
  const me = useQuery({ queryKey: ['ops', 'me'], queryFn: opsApi.me, retry: false })
  const sources = useQuery({
    queryKey: ['ops', 'attribution-sources'],
    queryFn: opsApi.attributionSources,
    retry: false,
  })
  /* Only fetched by somebody who may name another person; for everybody else the
     picker is not shown and the list would be a refused request on every load. */
  const people = useQuery({
    queryKey: ['ops', 'people'],
    queryFn: opsApi.people,
    retry: false,
    enabled: me.data?.capabilities?.includes('contributor:read-all') ?? false,
  })

  if (detail.isError) {
    return (
      <section style={PAGE}>
        <h1 style={{ fontSize: 20, marginBottom: 8 }}>No company called {key}</h1>
        <Link to="/ops/target-companies" style={{ fontSize: 14 }}>
          Back to the target list
        </Link>
      </section>
    )
  }

  const d = detail.data
  if (!d) return <section style={PAGE}><p style={NOTHING}>Working it out…</p></section>

  return (
    <section style={PAGE}>
      <header style={{ marginBottom: 18 }}>
        <Link to="/ops/target-companies" style={{ ...LABEL, textDecoration: 'none', display: 'inline-block' }}>
          ← Target companies
        </Link>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--gw-navy)', margin: '6px 0 2px' }}>
          {d.company.name}
        </h1>
        <p style={{ fontSize: 14, color: 'var(--gw-sub)', margin: 0 }}>
          {readEnum(d.company.stage)}
          {d.company.owner ? ` · ${d.company.owner} owns it` : ' · nobody owns it'}
          {d.company.source ? ` · came from ${d.company.source}` : ''}
        </p>
      </header>

      {/*
        * What is next and what is in the way come first, above everything
        * historical. Somebody opening a company page is nearly always about to
        * do something about it.
        */}
      <Section title="Where it stands">
        {d.company.nextAction ? (
          <p style={{ fontSize: 14, margin: 0 }}>
            <strong>Next:</strong> {d.company.nextAction}{' '}
            {d.company.nextActionDueAt && (
              <span style={{ fontSize: 12 }}>
                (<DueDate value={d.company.nextActionDueAt} />)
              </span>
            )}
          </p>
        ) : (
          <p style={NOTHING}>Nothing planned next.</p>
        )}
        {d.company.blockerSummary && (
          <p style={{ fontSize: 14, margin: '8px 0 0', color: 'var(--gw-red-t)' }}>
            <strong>In the way:</strong> {d.company.blockerSummary}
          </p>
        )}
        {/* Both writes live where the fact does. Setting a next action from a
            list means picking a row first; setting it here means you were
            already looking at the company you meant. */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
          <Adder
            title={d.company.nextAction ? 'Change what is next' : 'Say what is next'}
            fields={[
              { name: 'nextAction', label: 'What happens next', required: true },
              { name: 'dueAt', label: 'By', type: 'date' },
            ]}
            submit={(v) => opsApi.setCompanyNextAction(key, v.nextAction, v.dueAt || undefined)}
            invalidate={[['ops']]}
            submitLabel="Set it"
          />
          <Adder
            title={d.company.blockerSummary ? 'Change what is in the way' : 'Say what is in the way'}
            fields={[{ name: 'summary', label: 'What is holding them up', type: 'textarea', required: true }]}
            submit={(v) => opsApi.setCompanyBlocker(key, v.summary)}
            invalidate={[['ops']]}
            submitLabel="Record it"
          />
          {/*
            Setting the stage by hand is still allowed even though the board
            derives it, because a company can legitimately be moved ahead before
            any deal or deployment exists — and the derived value never goes
            backwards, so this can only ever help.
          */}
          <Adder
            title="Move the stage by hand"
            fields={[
              {
                name: 'stage',
                label: 'Where they are',
                required: true,
                options: ['LINED_UP', 'USE_CASE_CONFIRMED', 'PRODUCT_READY', 'ONBOARDED', 'LIVE'].map((v) => ({
                  value: v,
                  label: v.replace(/_/g, ' ').toLowerCase(),
                })),
              },
            ]}
            submit={(v) => opsApi.setCompanyStage(key, v.stage)}
            invalidate={[['ops']]}
            submitLabel="Move it"
          />
        </div>

        {d.company.primaryContactName && (
          <p style={{ fontSize: 13, margin: '8px 0 0', color: 'var(--gw-sub)' }}>
            {d.company.primaryContactName}
            {d.company.primaryContactEmail ? ` · ${d.company.primaryContactEmail}` : ''}
          </p>
        )}
      </Section>

      <Section title="Who brought them">
        <Adder
          title="Record who brought them"
          fields={[
            {
              name: 'sourceType',
              label: 'How they reached us',
              required: true,
              /* From the API, one list, so "this network produced four" is a
                 count rather than three spellings of a text box. */
              options: (sources.data ?? []).map((o) => ({ value: o.key, label: o.label })),
            },
            /* NAMING SOMEBODY ELSE, WHICH THE API ALWAYS ALLOWED AND NO SCREEN
               OFFERED. Only shown to somebody who may see everybody's record —
               the same permission as counting for them. Without it every
               introduction was recorded as whoever was signed in, which is the
               one thing the whole attribution design refuses. */
            ...(me.data?.capabilities?.includes('contributor:read-all')
              ? [
                  {
                    name: 'contributorKey',
                    label: 'Who brought them',
                    required: true,
                    options: (people.data ?? []).map((p) => ({ value: p.key, label: p.displayName })),
                  },
                ]
              : []),
            { name: 'sourceDetail', label: 'Which one, or anything worth knowing', type: 'textarea' },
          ]}
          submit={(v) =>
            opsApi.attribute({
              companyKey: key,
              sourceType: v.sourceType,
              contributorKey: v.contributorKey || undefined,
              sourceDetail: v.sourceDetail || undefined,
            })
          }
          invalidate={[['ops']]}
          submitLabel="Record it"
        />
        {d.broughtBy.length === 0 ? (
          <p style={NOTHING}>Nobody. They came to us.</p>
        ) : (
          d.broughtBy.map((b) => (
            <div key={b.contributor} style={{ fontSize: 14, margin: '0 0 8px' }}>
              <strong>{b.contributor}</strong> · {b.sourceType} · {readEnum(b.qualifyingStatus)}
              {/*
                AN INTRODUCTION COULD NEVER MOVE. `PATCH /ops/attributions/:company/:contributor`
                was built and called by nothing, so every introduction stayed at
                INTRODUCED for ever — and the qualifying line, the setting that
                decides what counts toward a contributor's target, was measuring
                a status no screen could change.
              */}
              <Choose
                label={`Where ${b.contributor}'s introduction stands`}
                value={b.qualifyingStatus}
                options={['INTRODUCED', 'READY', 'QUALIFIED', 'DISQUALIFIED']}
                onPick={(next) => opsApi.moveIntroductionAlong(key, b.contributorKey, next)}
                invalidate={[['ops']]}
              />
              {b.sourceDetail && (
                <span style={{ display: 'block', fontSize: 12, color: 'var(--gw-sub)' }}>
                  {b.sourceDetail}
                </span>
              )}
            </div>
          ))
        )}
      </Section>

      <Section title="What they want to do">
        {d.useCases.length === 0 ? (
          <p style={NOTHING}>
            Nobody has asked. Until somebody does, we do not know whether we support them.
          </p>
        ) : (
          d.useCases.map((u) => {
            const gaps = [
              u.productGap && `Product: ${u.productGap}`,
              u.uxGap && `UX: ${u.uxGap}`,
              u.technicalGap && `Tech: ${u.technicalGap}`,
            ].filter(Boolean) as string[]
            return (
              <div key={u.id} style={{ marginBottom: 10 }}>
                <p style={{ fontSize: 14, margin: 0 }}>
                  <strong>{u.title}</strong> - {readEnum(u.productReadiness)}
                </p>
                {u.expectedWorkflow && (
                  <p style={{ fontSize: 13, color: 'var(--gw-sub)', margin: '3px 0 0' }}>
                    {u.expectedWorkflow}
                  </p>
                )}
                {gaps.map((g) => (
                  <p key={g} style={{ fontSize: 13, margin: '3px 0 0', color: 'var(--gw-red-t)' }}>
                    {g}
                  </p>
                ))}
              </div>
            )
          })
        )}
      </Section>

      <Section title="The deal">
        {d.opportunities.length === 0 ? (
          <p style={NOTHING}>No opportunity open.</p>
        ) : (
          d.opportunities.map((o) => (
            <p key={o.id} style={{ fontSize: 14, margin: '0 0 6px' }}>
              {readEnum(o.stage)} · {money(o.estimatedValue)}
              {o.campaign ? ` · from ${o.campaign.title}` : ''}
              {o.lostReason && (
                <span style={{ display: 'block', fontSize: 12, color: 'var(--gw-sub)' }}>
                  Lost: {o.lostReason}
                </span>
              )}
            </p>
          ))
        )}
      </Section>

      <Section title="Getting them live">
        {d.deployments.length === 0 ? (
          <p style={NOTHING}>Not being deployed.</p>
        ) : (
          d.deployments.map((dep) => (
            <div key={dep.id}>
              <p style={{ fontSize: 14, margin: 0 }}>
                {readEnum(dep.stage)}
                {dep.targetLiveDate && <> · target <DueDate value={dep.targetLiveDate} /></>}
              </p>
              {/* First use and first result, which mean "they used it" and "they got
                  something out of it" - neither of which the stage alone tells you. */}
              <p style={{ fontSize: 13, color: 'var(--gw-sub)', margin: '3px 0 0' }}>
                First used {readDate(dep.firstUseAt)} · first result {readDate(dep.firstResultAt)}
              </p>
              {dep.blockerType && (
                <p style={{ fontSize: 13, margin: '4px 0 0', color: 'var(--gw-red-t)' }}>
                  Waiting on {dep.blockerType}: {dep.blockerSummary}
                </p>
              )}
            </div>
          ))
        )}
      </Section>

      {/*
        * The timeline is the thing this page has that no other does. A stage
        * says where something is; only this says whether it got there last week
        * or in July.
        */}
      <Section title="What has happened">
        {d.activity.length === 0 ? (
          <p style={NOTHING}>Nothing recorded yet.</p>
        ) : (
          <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {d.activity.map((a) => (
              <li
                key={a.id}
                style={{
                  display: 'flex',
                  gap: 12,
                  padding: '6px 0',
                  borderTop: '1px solid var(--gw-border)',
                  fontSize: 13,
                }}
              >
                <span style={{ color: 'var(--gw-sub)', flex: 'none', width: 78 }}>
                  {readDate(a.happenedAt)}
                </span>
                <span style={{ flex: 1 }}>
                  {readEnum(a.kind)}
                  {a.note && <span style={{ color: 'var(--gw-sub)' }}> - {a.note}</span>}
                </span>
                <span style={{ color: 'var(--gw-sub)', flex: 'none' }}>{a.by ?? 'the system'}</span>
              </li>
            ))}
          </ol>
        )}
      </Section>
    </section>
  )
}
