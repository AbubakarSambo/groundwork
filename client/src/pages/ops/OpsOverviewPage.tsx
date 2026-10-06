import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { opsApi } from '@/api/ops'
import { OpsHeader, PAGE, CARD, LABEL } from './OpsLayout'

/**
 * The whole commercial picture, in the order somebody asks.
 *
 * The test is thirty seconds: how much are we selling, who originated it, how
 * valuable are those clients, do they stay, who is opening doors, and where does
 * the person who owns the function stand separately from the function itself.
 *
 * Every figure comes from the same services the separate pages use. An overview
 * that does its own arithmetic eventually disagrees with the page it summarises,
 * and the disagreement is always discovered in a meeting.
 */

const money = (n: number | null | undefined) =>
  n === null || n === undefined ? ' - ' : `$${Number(n).toLocaleString()}`

const WINDOWS = [
  { key: 'all', label: 'All time', from: undefined, to: undefined },
  { key: 'quarter', label: 'This quarter', from: '2026-07-01', to: '2026-09-30' },
  { key: 'ytd', label: 'Year to date', from: '2026-01-01', to: '2026-12-31' },
]

function Figure({ value, label, quiet }: { value: string | number; label: string; quiet?: boolean }) {
  return (
    <div style={{ ...CARD, minWidth: 128, flex: '1 1 128px' }}>
      <div style={{ fontSize: 20, fontWeight: 800, color: quiet ? 'var(--gw-sub)' : 'var(--gw-navy)' }}>
        {value}
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--gw-sub)', marginTop: 2 }}>{label}</div>
    </div>
  )
}

/**
 * THE NUMBER WAS THE QUESTION'S ID, NOT ITS PLACE ON THE PAGE. This page shows a subset of the
 * canonical questions, so it counted "1, 2, 4, 6, 12, 14, 15, 13" down the screen and read as
 * though four sections had failed to load. The question is its own heading; the number stays where
 * it belongs, at the call site that looks the question up.
 */
function Band({ question, children }: { question: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 18 }}>
      <p style={{ ...LABEL, fontSize: 10, marginBottom: 7 }}>
        {question}
      </p>
      {children}
    </section>
  )
}

export default function OpsOverviewPage() {
  const [window, setWindow] = useState(WINDOWS[0])
  const overview = useQuery({
    queryKey: ['ops', 'commercial-overview', window.key],
    queryFn: () => opsApi.commercialOverview(window.from, window.to),
    retry: false,
  })
  /*
   * TWO READS THAT WERE BUILT AND SHOWN NOWHERE.
   *
   * `function-health` and `performance` had no caller in the client at all. They
   * answer the two questions this page's own comment says it exists for and did
   * not carry: how the function itself is doing, and how much of what it sold
   * actually stayed. Retention is the one that matters most — a customer who
   * paid once and left is not the same as one who has paid for a year, and every
   * figure above treats them identically.
   */
  const health = useQuery({
    queryKey: ['ops', 'function-health'],
    queryFn: opsApi.functionHealth,
    retry: false,
  })
  const performance = useQuery({
    queryKey: ['ops', 'commercial-performance', window.key],
    queryFn: () => opsApi.commercialPerformance(window.from, window.to),
    retry: false,
  })

  const d = overview.data
  const ask = (n: number) => d?.questions.find((q) => q.n === n)?.question ?? ''

  return (
    <section className="gw-page" style={PAGE}>
      <OpsHeader name="Commercial overview" answers="Everything, in the order somebody asks." />

      {/*
        The sentence leads, because every number below is either about the
        company or about one person, and a reader who has lost track of which is
        reading the wrong thing.
      */}
      {d && (
        <p style={{ fontSize: 13, color: 'var(--gw-sub)', maxWidth: '66ch', marginBottom: 16 }}>
          {d.separates}
        </p>
      )}

      <div style={{ display: 'flex', gap: 6, marginBottom: 18 }}>
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

      {d && (
        <>
          <Band question={ask(1)}>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <Figure value={money(d.performance.cashCollected)} label="cash collected" />
              <Figure value={d.performance.newCustomers} label="new customers" />
              <Figure value={money(d.performance.newMrr)} label="new monthly" />
              <Figure value={money(d.performance.newArr)} label="new annual" />
              <Figure
                value={d.performance.conversion === null ? ' - ' : `${d.performance.conversion}%`}
                label="conversion"
              />
            </div>
          </Band>

          <Band question={ask(2)}>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <Figure value={d.functionHealth.livePipeline} label="live" />
              <Figure value={money(d.functionHealth.pipelineValue)} label="projected" />
              <Figure value={d.functionHealth.overdueFollowUps} label="overdue" />
              <Figure value={d.functionHealth.withNothingPlanned} label="nothing planned" />
              {/*
                On the overview rather than hidden, because it decides whether
                every share figure below means anything.
              */}
              <Figure
                value={d.functionHealth.attributionUnresolved}
                label="nobody has said who created"
                quiet={d.functionHealth.attributionUnresolved === 0}
              />
            </div>
          </Band>

          {d.share && (
            <Band question={ask(4)}>
              <section style={CARD}>
                <p style={{ fontSize: 12.5, color: 'var(--gw-sub)', margin: '0 0 10px' }}>{d.share.says}</p>
                {(d.share.rows ?? []).map((r) => (
                  <div key={r.personKey} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '3px 0' }}>
                    <span style={{ fontSize: 13, width: 120, flex: 'none' }}>{r.person}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, width: 84, flex: 'none', fontVariantNumeric: 'tabular-nums' }}>
                      {money(r.revenue)}
                    </span>
                    <div style={{ flex: 1, background: 'rgba(12,68,124,0.08)', borderRadius: 4, height: 7 }}>
                      <div style={{ width: `${r.share ?? 0}%`, height: '100%', background: 'var(--gw-navy)', borderRadius: 4 }} />
                    </div>
                    <span style={{ fontSize: 12.5, width: 40, textAlign: 'right', flex: 'none' }}>{r.share}%</span>
                  </div>
                ))}
                {(d.share.rows ?? []).length === 0 && (
                  <p style={{ fontSize: 13, color: 'var(--gw-sub)', margin: 0 }}>Nothing attributed yet.</p>
                )}
              </section>
            </Band>
          )}

          <Band question={ask(6)}>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <Figure value={money(d.performance.retained3Month)} label="past three months" />
              <Figure value={money(d.performance.retained6Month)} label="past six months" />
              <Figure value={money(d.performance.retained12Month)} label="past twelve months" />
              <Figure value={money(d.performance.throughPositioning)} label="through somebody's access" />
            </div>
          </Band>

          <Band question={ask(12)}>
            <section style={CARD}>
              {d.ledgers.map((l) => (
                <div
                  key={l.personKey}
                  style={{
                    display: 'flex',
                    gap: 12,
                    alignItems: 'baseline',
                    padding: '6px 0',
                    borderTop: '1px solid var(--gw-border)',
                    flexWrap: 'wrap',
                  }}
                >
                  <strong style={{ fontSize: 13.5, width: 120, flex: 'none' }}>{l.person}</strong>
                  <span style={{ fontSize: 12.5, color: 'var(--gw-sub)', width: 96, flex: 'none' }}>
                    {l.itIsTheirJob ? 'their job' : 'not their job'}
                  </span>
                  <span style={{ fontSize: 13, flex: 1 }}>
                    {money(l.origination.cashCollected)} originated · {l.origination.creditsEarned} credits ·{' '}
                    {money(l.positioning.revenue)} through access
                  </span>
                </div>
              ))}
              {d.ledgers.length === 0 && (
                <p style={{ fontSize: 13, color: 'var(--gw-sub)', margin: 0 }}>
                  Contribution records are personal. Yours is on your own page.
                </p>
              )}
            </section>
          </Band>

          {performance.data && (
            <Band question="How much of what we sold stayed sold?">
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {/* Three windows, never summed. Money retained at twelve months
                    is a subset of money retained at three, and adding them
                    would count the same customer three times. */}
                <Figure value={money(performance.data.retained3Month)} label="still paying at 3 months" />
                <Figure value={money(performance.data.retained6Month)} label="at 6 months" />
                <Figure value={money(performance.data.retained12Month)} label="at 12 months" />
                <Figure value={money(performance.data.qualifiedPipeline)} label="qualified pipeline" quiet />
              </div>
            </Band>
          )}

          {health.data && (
            <Band question="And how is the function itself doing?">
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {/* Separate from what it produced, on purpose: a good quarter
                    can sit on top of a pipeline nobody is working. */}
                <Figure value={health.data.livePipeline} label="live opportunities" />
                <Figure value={health.data.withNothingPlanned} label="with nothing planned next" />
                <Figure value={health.data.overdueFollowUps} label="follow-ups overdue" />
                <Figure value={health.data.attributionUnresolved} label="nobody credited yet" />
              </div>
              <p style={{ fontSize: 12.5, color: 'var(--gw-sub)', margin: '8px 0 0' }}>{health.data.says}</p>
            </Band>
          )}

          {d.claimsWaiting !== null && d.claimsWaiting > 0 && (
            <Band question={ask(13)}>
              <p style={{ fontSize: 13.5, color: 'var(--gw-red-t)', margin: 0 }}>
                {d.claimsWaiting} claim{d.claimsWaiting === 1 ? '' : 's'} of contribution waiting on a
                decision. Until they are decided, they are not evidence.
              </p>
            </Band>
          )}
        </>
      )}
    </section>
  )
}
