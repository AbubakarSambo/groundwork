/**
 * WHAT THE RECORD SHOWS ACROSS EVERY SESSION, ON THE LEAD'S BOARD.
 *
 * A founder asked what she needed in front of her before deciding about a consultant she had hired:
 * goal, commitments, actions, evidence, progress, dependencies, patterns, gaps, contradictions,
 * unresolved issues, and the questions to settle first. Measured on a live three-month engagement,
 * three of those were empty in the report - dependencies, patterns and gaps - while the facts for
 * all three sat in tables nothing read.
 *
 * They are computed from rows now, and this is where they are read. The order is the order she
 * listed them in, which is also the order a person reads them in: what to settle first, because
 * that is the only actionable part; then the promises, the waiting, the patterns, the roles; then
 * what none of it can tell you, which is the part that stops a reader over-reading the rest.
 *
 * NOT ONE LINE HERE IS A VERDICT. Every sentence comes from the server with its sessions attached,
 * and the strongest thing any of them says is "nobody has said whether it happened".
 */

export interface TheRecordOverTime {
  sessions?: number
  toSettleFirst?: string[]
  commitments?: { who: string; what: string; say: string; status?: string; restatedIn?: number[] }[]
  dependencies?: { say: string; escalated?: boolean }[]
  patterns?: { who: string; code: string; name: string; observation: string; say: string; status?: string }[]
  gaps?: { who: string; expected: string; recordHolds: string; say: string }[]
  stillOpen?: string[]
  cannotTellYou?: string[]
}

const Head = ({ children }: { children: React.ReactNode }) => (
  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.4px', textTransform: 'uppercase', color: 'var(--gw-sub)', margin: '18px 0 7px' }}>
    {children}
  </div>
)

const Line = ({ children }: { children: React.ReactNode }) => (
  <div style={{ fontSize: 14, lineHeight: 1.55, color: 'var(--gw-text)', padding: '6px 0', borderTop: '1px solid var(--gw-line)' }}>
    {children}
  </div>
)

export function WhatTheRecordShows({ it }: { it: TheRecordOverTime | null | undefined }) {
  if (!it) return null
  const open = (it.commitments ?? []).filter((c) => (c.status ?? 'UNKNOWN').toUpperCase() === 'UNKNOWN')
  const surfaced = (it.patterns ?? []).filter((p) => (p.status ?? '').toUpperCase() === 'SURFACED')
  const candidates = (it.patterns ?? []).filter((p) => (p.status ?? '').toUpperCase() !== 'SURFACED')
  const anything = (it.toSettleFirst?.length ?? 0) + open.length + (it.dependencies?.length ?? 0)
    + (it.patterns?.length ?? 0) + (it.gaps?.length ?? 0)
  if (!anything) return null

  return (
    <div style={{ maxWidth: 760 }}>
      {/* The only part somebody can act on, so it goes first and it is not styled as a warning. */}
      {!!it.toSettleFirst?.length && (
        <>
          <Head>Settle these before deciding anything</Head>
          <div style={{
            background: 'var(--gw-blue-bg)', border: '1px solid var(--gw-blue-b)', borderRadius: 10, padding: '12px 14px',
          }}>
            {it.toSettleFirst.map((q, i) => (
              <div key={i} style={{ fontSize: 14, lineHeight: 1.55, color: 'var(--gw-text)', padding: '5px 0' }}>{q}</div>
            ))}
          </div>
        </>
      )}

      {!!open.length && (
        <>
          <Head>What people said they would do{it.sessions ? `, over ${it.sessions} sessions` : ''}</Head>
          {open.map((c, i) => <Line key={i}>{c.say}</Line>)}
        </>
      )}

      {!!it.dependencies?.length && (
        <>
          <Head>Who is waiting on whom</Head>
          {it.dependencies.map((d, i) => <Line key={i}>{d.say}</Line>)}
        </>
      )}

      {!!surfaced.length && (
        <>
          <Head>Seen often enough to be a pattern</Head>
          {surfaced.map((p, i) => (
            <Line key={i}>
              <div>{p.observation}</div>
              <div style={{ fontSize: 13, color: 'var(--gw-sub)', marginTop: 3 }}>{p.who} · {p.name} · {p.say}</div>
            </Line>
          ))}
        </>
      )}

      {/* Shown, and labelled as what it is: one or two sessions of something is not a finding. */}
      {!!candidates.length && (
        <>
          <Head>Seen once or twice, not yet a pattern</Head>
          {candidates.map((p, i) => (
            <Line key={i}>
              <div>{p.observation}</div>
              <div style={{ fontSize: 13, color: 'var(--gw-sub)', marginTop: 3 }}>{p.who} · {p.name} · {p.say}</div>
            </Line>
          ))}
        </>
      )}

      {!!it.gaps?.length && (
        <>
          <Head>The role, beside what the record holds</Head>
          {it.gaps.map((g, i) => <Line key={i}>{g.say}</Line>)}
        </>
      )}

      {!!it.cannotTellYou?.length && (
        <>
          <Head>What this cannot tell you</Head>
          <div style={{
            background: 'var(--gw-paper-2)', border: '1px solid var(--gw-line)', borderRadius: 10, padding: '12px 14px',
          }}>
            {it.cannotTellYou.map((c, i) => (
              <div key={i} style={{ fontSize: 13.5, lineHeight: 1.55, color: 'var(--gw-sub)', padding: '4px 0' }}>{c}</div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
