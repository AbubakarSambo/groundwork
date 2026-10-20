import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { opsApi } from '@/api/ops'
import { Adder } from './OpsForm'
import { whenItWas } from '@/lib/a-date-reads-the-same-everywhere'

/**
 * Target companies: every company, how far it has got, and what is in the way.
 *
 * The counts at the top are the ones the whole month is judged on, so each is
 * shown with what it is made of rather than on its own. "Seven of ten are
 * ready" without the other three named is the sentence this page exists to
 * prevent.
 */

const CARD: React.CSSProperties = {
  background: 'white',
  border: '1px solid var(--gw-border)',
  borderRadius: 8,
  padding: '12px 14px',
}
const LABEL: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: 'var(--gw-muted)',
  textTransform: 'uppercase',
  letterSpacing: '.08em',
}

const STAGES = ['LINED_UP', 'USE_CASE_CONFIRMED', 'PRODUCT_READY', 'ONBOARDED', 'LIVE']
const readStage = (s: string) => s.replace(/_/g, ' ').toLowerCase()
/* Dates come back as plain days. Read as UTC so a target list starting on the 1st
   does not render as the 31st for anybody west of the clock the boards use. */
const readDay = (iso: string) =>
  whenItWas(iso, 'day', 'UTC')

export default function OpsTargetCompaniesPage() {
  /*
   * Empty until the periods arrive, rather than a hard-coded 'sept-2026-target-list'.
   * That default was a seeded key written into the client, so the page opened on
   * a target list that will not always exist and could never open on one somebody
   * started themselves. `periods()` already returns the period containing today
   * first, so the first target list is the right one to land on.
   */
  const [periodKey, setPeriodKey] = useState('')
  const periods = useQuery({ queryKey: ['ops', 'periods'], queryFn: opsApi.periods, retry: false })
  const targetLists = (periods.data ?? []).filter((p) => p.kind === 'TARGET_LIST')
  const selected = targetLists.find((p) => p.key === periodKey)

  useEffect(() => {
    if (!periodKey && targetLists.length > 0) setPeriodKey(targetLists[0].key)
  }, [periodKey, targetLists])

  /* Everything we know, so the picker can offer what is not on the target list yet
     rather than the whole pipeline with the current list mixed into it. */
  const everyCompany = useQuery({
    queryKey: ['ops', 'companies', 'all'],
    queryFn: () => opsApi.allCompanies(),
    retry: false,
  })
  const targetCompanies = useQuery({
    queryKey: ['ops', 'target-companies', periodKey],
    queryFn: () => opsApi.targetCompanies(periodKey),
    retry: false,
    enabled: periodKey !== '',
  })

  if (targetCompanies.isError) {
    return (
      <section className="gw-page" style={{ padding: 40, maxWidth: 640 }}>
        <h1 style={{ fontSize: 20, marginBottom: 8 }}>We could not load the list</h1>
        <button className="gwui-btn gwui-btn-secondary gwui-btn-small" type="button" onClick={() => targetCompanies.refetch()} >
          Try again
        </button>
      </section>
    )
  }

  const data = targetCompanies.data

  return (
    <section className="gw-page" style={{ padding: '28px 32px', maxWidth: 1100, margin: '0 auto' }}>
      <header style={{ marginBottom: 18 }}>
        {/* The back-link went with the board switcher: the navigation is on
            every page now, and a second way home is clutter rather than help. */}
        <p style={LABEL}>Target companies</p>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--gw-navy)', margin: '4px 0 2px' }}>
          {data?.period?.name ?? 'Loading'}
        </h1>
        {data?.period?.goal && (
          <p style={{ fontSize: 13.5, color: 'var(--gw-sub)', margin: 0 }}>{data.period.goal}</p>
        )}
        <select
          value={periodKey}
          onChange={(e) => setPeriodKey(e.target.value)}
          style={{ marginTop: 8, fontSize: 12.5, padding: '4px 6px', borderRadius: 6, border: '1px solid var(--gw-border)' }}
        >
          {targetLists.map((p) => (
            <option key={p.key} value={p.key}>
              {p.name}
            </option>
          ))}
        </select>

        {/* WHEN IT RUNS, ON THE PAGE. A target list is a stretch of time somebody
            chose, and a board headed by a name alone leaves "is this the one we
            are in?" to be worked out from the companies on it. */}
        {selected && (
          <p style={{ fontSize: 12.5, color: 'var(--gw-sub)', margin: '6px 0 0' }}>
            {readDay(selected.startsOn)} to {readDay(selected.endsOn)} · {selected.status.toLowerCase()}
          </p>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
          <Adder
            title="Start a list"
            fields={[
              { name: 'name', label: 'What to call it', required: true, placeholder: 'September onboarding' },
              { name: 'startsOn', label: 'First day', type: 'date', required: true },
              { name: 'endsOn', label: 'Last day', type: 'date', required: true },
              { name: 'goal', label: 'What it is for', type: 'textarea' },
            ]}
            submit={(v) =>
              opsApi.startATargetList({
                name: v.name,
                startsOn: v.startsOn,
                endsOn: v.endsOn,
                goal: v.goal || undefined,
              })
            }
            invalidate={[['ops']]}
            submitLabel="Start it"
          />

          {selected && (
            <Adder
              title="Change these dates"
              fields={[
                { name: 'name', label: 'What to call it', placeholder: selected.name },
                { name: 'startsOn', label: 'First day', type: 'date' },
                { name: 'endsOn', label: 'Last day', type: 'date' },
                { name: 'goal', label: 'What it is for', type: 'textarea' },
                {
                  name: 'status',
                  label: 'Where it stands',
                  options: [
                    { value: 'PLANNED', label: 'Planned' },
                    { value: 'OPEN', label: 'Running' },
                    { value: 'CLOSED', label: 'Closed' },
                  ],
                },
              ]}
              submit={(v) =>
                opsApi.resetATargetList(selected.key, {
                  name: v.name || undefined,
                  startsOn: v.startsOn || undefined,
                  endsOn: v.endsOn || undefined,
                  goal: v.goal || undefined,
                  status: v.status || undefined,
                })
              }
              invalidate={[['ops']]}
              submitLabel="Change it"
            />
          )}
        </div>

        {targetLists.length === 0 && !periods.isLoading && (
          <p style={{ fontSize: 13, color: 'var(--gw-sub)', margin: '10px 0 0' }}>
            No targetLists yet. Start one above, then add the companies it is about.
          </p>
        )}
      </header>

      {data && (
        <>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
            {STAGES.map((stage) => (
              <div key={stage} style={{ ...CARD, minWidth: 110 }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--gw-navy)' }}>
                  {data.counts.byStage[stage] ?? 0}
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--gw-sub)', marginTop: 2 }}>{readStage(stage)}</div>
              </div>
            ))}
          </div>

          {data.counts.notProductReady.length > 0 && (
            /*
             * The three that are not ready, named with the reason. A count of
             * seven with nothing behind it is the number that lets the other
             * three go unlooked-at for a month.
             */
            <section style={{ ...CARD, marginBottom: 16 }}>
              <p style={LABEL}>
                {data.counts.productReady} of {data.counts.total} product ready · what the rest need
              </p>
              <ul style={{ margin: '8px 0 0', paddingLeft: 18, fontSize: 13 }}>
                {data.counts.notProductReady.map((c) => (
                  <li key={c.name} style={{ marginBottom: 4 }}>
                    <strong>{c.name}</strong> - {c.why.join('; ')}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {data.counts.withoutANextAction.length > 0 && (
            <section style={{ ...CARD, marginBottom: 16 }}>
              <p style={LABEL}>Nothing planned next</p>
              <p style={{ fontSize: 13, margin: '6px 0 0' }}>
                {data.counts.withoutANextAction.join(', ')}
              </p>
            </section>
          )}

          {/* THE LIST IS SOMETHING YOU CURATE. A target list is the short list of
              companies getting attention between two dates — not everything in
              the pipeline. Both directions are here, because a list you can only
              add to is one that grows until it means nothing. */}
          <section style={{ ...CARD, marginBottom: 16 }}>
            <p style={LABEL}>Who is on this list</p>
            <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
              <Adder
                title="Add one we already know"
                fields={[
                  {
                    name: 'key',
                    label: 'Which company',
                    required: true,
                    options: (everyCompany.data ?? [])
                      .filter((c) => !(data.companies ?? []).some((onTheList) => onTheList.key === c.key))
                      .map((c) => ({ value: c.key, label: c.name })),
                  },
                ]}
                submit={(v) => opsApi.setCompanyTargetList(v.key, periodKey)}
                invalidate={[['ops']]}
                submitLabel="Put them on it"
              />
              {(data.companies ?? []).length > 0 && (
                <Adder
                  title="Take one off"
                  fields={[
                    {
                      name: 'key',
                      label: 'Which company',
                      required: true,
                      options: (data.companies ?? []).map((c) => ({ value: c.key, label: c.name })),
                    },
                  ]}
                  /* Off the target list, not deleted. They are still a company. */
                  submit={(v) => opsApi.setCompanyTargetList(v.key, null)}
                  invalidate={[['ops']]}
                  submitLabel="Take them off"
                />
              )}
            </div>
          </section>

          <Adder
            title="Add a company"
            fields={[
              { name: 'name', label: 'Their name', required: true },
              { name: 'source', label: 'How they reached us', placeholder: 'Inbound from the site' },
              { name: 'primaryContactName', label: 'Who we talk to' },
              { name: 'primaryContactEmail', label: 'Their email' },
            ]}
            submit={(v) =>
              opsApi.addCompany({
                name: v.name,
                targetListKey: periodKey,
                source: v.source || undefined,
                primaryContactName: v.primaryContactName || undefined,
                primaryContactEmail: v.primaryContactEmail || undefined,
              })
            }
            invalidate={[['ops']]}
            submitLabel="Add them"
          />

          <div style={{ overflowX: 'auto', ...CARD, padding: 0 }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13, minWidth: 720 }}>
              <thead>
                <tr>
                  {['Company', 'Stage', 'Brought by', 'Next', 'In the way'].map((h) => (
                    <th key={h} style={{ ...LABEL, textAlign: 'left', padding: '10px 12px' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(data.companies ?? []).map((c) => (
                  <tr key={c.id} style={{ borderTop: '1px solid var(--gw-border)' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 600 }}>
                      <Link
                        to={`/ops/companies/${c.key}`}
                        style={{ color: 'var(--gw-navy)', textDecoration: 'none' }}
                      >
                        {c.name}
                      </Link>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      {readStage(c.stage)}
                      {/*
                        Said, not silently corrected. The stage shown is the
                        furthest the deal and the deployment prove; the typed
                        summary being behind is worth seeing, because otherwise a
                        number moves on its own and people stop trusting the board.
                      */}
                      {c.summaryIsStale && (
                        <div style={{ fontSize: 11.5, color: 'var(--gw-sub)' }}>
                          from the work - the summary still says {readStage(c.storedStage)}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--gw-sub)' }}>
                      {c.broughtBy.map((b) => b.contributor).join(', ') || ' - '}
                    </td>
                    <td style={{ padding: '10px 12px' }}>{c.nextAction ?? ' - '}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--gw-sub)' }}>
                      {c.blockerSummary ?? c.deploymentBlocker ?? ' - '}
                    </td>
                  </tr>
                ))}
                {(data.companies ?? []).length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ padding: '14px 12px', color: 'var(--gw-sub)' }}>
                      No companies on this list yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  )
}
