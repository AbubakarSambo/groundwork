import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { opsApi } from '@/api/ops'

/**
 * The sprint: every company, how far it has got, and what is in the way.
 *
 * The counts at the top are the ones the whole month is judged on, so each is
 * shown with what it is made of rather than on its own. "Seven of ten are
 * ready" without the other three named is the sentence this page exists to
 * prevent.
 */

const CARD: React.CSSProperties = {
  background: 'white',
  border: '0.5px solid var(--gw-border)',
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

export default function OpsSprintPage() {
  const [periodKey, setPeriodKey] = useState('sept-2026-sprint')
  const periods = useQuery({ queryKey: ['ops', 'periods'], queryFn: opsApi.periods, retry: false })
  const sprint = useQuery({
    queryKey: ['ops', 'sprint', periodKey],
    queryFn: () => opsApi.sprint(periodKey),
    retry: false,
  })

  if (sprint.isError) {
    return (
      <main id="main" style={{ padding: 40, maxWidth: 640 }}>
        <h1 style={{ fontSize: 20, marginBottom: 8 }}>We could not load the sprint</h1>
        <button type="button" onClick={() => sprint.refetch()} style={{ ...CARD, cursor: 'pointer' }}>
          Try again
        </button>
      </main>
    )
  }

  const data = sprint.data

  return (
    <main id="main" style={{ padding: '28px 32px', maxWidth: 1100, margin: '0 auto' }}>
      <header style={{ marginBottom: 18 }}>
        {/* The back-link went with the board switcher: the navigation is on
            every page now, and a second way home is clutter rather than help. */}
        <p style={LABEL}>The sprint</p>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--gw-navy)', margin: '4px 0 2px' }}>
          {data?.period.name ?? 'Loading'}
        </h1>
        {data?.period.goal && (
          <p style={{ fontSize: 13.5, color: 'var(--gw-sub)', margin: 0 }}>{data.period.goal}</p>
        )}
        <select
          value={periodKey}
          onChange={(e) => setPeriodKey(e.target.value)}
          style={{ marginTop: 8, fontSize: 12.5, padding: '4px 6px', borderRadius: 6, border: '0.5px solid var(--gw-border)' }}
        >
          {(periods.data ?? []).filter((p) => p.kind === 'SPRINT' || p.kind === 'QUARTER').map((p) => (
            <option key={p.key} value={p.key}>
              {p.name}
            </option>
          ))}
        </select>
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
                    <strong>{c.name}</strong> — {c.why.join('; ')}
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
                {data.companies.map((c) => (
                  <tr key={c.id} style={{ borderTop: '0.5px solid var(--gw-border)' }}>
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
                          from the work — the summary still says {readStage(c.storedStage)}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--gw-sub)' }}>
                      {c.broughtBy.map((b) => b.contributor).join(', ') || '—'}
                    </td>
                    <td style={{ padding: '10px 12px' }}>{c.nextAction ?? '—'}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--gw-sub)' }}>
                      {c.blockerSummary ?? c.deploymentBlocker ?? '—'}
                    </td>
                  </tr>
                ))}
                {data.companies.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ padding: '14px 12px', color: 'var(--gw-sub)' }}>
                      No companies in this sprint yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </main>
  )
}
