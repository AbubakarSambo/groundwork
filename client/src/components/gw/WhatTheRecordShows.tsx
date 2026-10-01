import { SubHeading, RowList, Row, Note } from './ui'

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
  /**
   * REQUEST 87: THE HEADING, ALREADY A SENTENCE. "in 1 session", "in 3 sessions", or null before any
   * session - used in place of building ", over N sessions" here, so "1 sessions" never reads wrong
   * and the word "in" always sits inside the sentence rather than before a bare number.
   */
  inSessions?: string | null
  toSettleFirst?: string[]
  commitments?: { who: string; what: string; say: string; status?: string; restatedIn?: number[] }[]
  dependencies?: { say: string; escalated?: boolean }[]
  patterns?: { who: string; code: string; name: string; observation: string; say: string; status?: string }[]
  gaps?: { who: string; expected: string; recordHolds: string; say: string }[]
  stillOpen?: string[]
  cannotTellYou?: string[]
}

/**
 * U.10 (e/f); BOARD TASK, BATCH 3, PART 2: FROM THE SHARED PARTS, AT THE PROTOTYPE'S OWN SIZES.
 * `Head` is now `SubHeading` `tone="kicker"` - a small muted kicker over one block inside a wider
 * read (not a whole page section, so not `Section`'s 21px, and not `SubHeading`'s own default
 * 14.5px ink fact-label either) - the prototype's own `.note`, 13.5px, named as the heading part's
 * own option rather than left as a local one-off. `Line` is the record's own sentence, the main
 * thing a reader is here for, now a `RowList`/`Row` the same shape as this product's other plain
 * lists - a line above the first row and under each - rather than a bare `gwui-inner-row` div.
 */
const Head = ({ children }: { children: React.ReactNode }) => (
  <SubHeading tone="kicker">{children}</SubHeading>
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
    // U.10: the prototype runs this block full width, not capped at 760px.
    <div>
      {/* The only part somebody can act on, so it goes first and it is not styled as a warning. */}
      {!!it.toSettleFirst?.length && (
        <>
          <Head>Settle these before deciding anything</Head>
          <div className="gwui-rule-blue gwui-pt-12 gwui-pr-14 gwui-pb-12 gwui-pl-14" style={{ background: 'var(--gw-blue-bg)', borderRadius: 10 }}>
            {it.toSettleFirst.map((q, i) => (
              <div key={i} className="gwui-fs-15 gwui-ink-text gwui-pt-5 gwui-pb-5" style={{ lineHeight: 1.55 }}>{q}</div>
            ))}
          </div>
        </>
      )}

      {!!open.length && (
        <>
          <Head>What people said they would do{it.inSessions ? `, ${it.inSessions}` : (it.sessions ? `, over ${it.sessions} sessions` : '')}</Head>
          <RowList label="What people said they would do">
            {open.map((c, i) => <Row key={i} columns="1fr">{c.say}</Row>)}
          </RowList>
        </>
      )}

      {!!it.dependencies?.length && (
        <>
          <Head>Who is waiting on whom</Head>
          <RowList label="Who is waiting on whom">
            {it.dependencies.map((d, i) => <Row key={i} columns="1fr">{d.say}</Row>)}
          </RowList>
        </>
      )}

      {!!surfaced.length && (
        <>
          <Head>Seen often enough to be a pattern</Head>
          <RowList label="Seen often enough to be a pattern">
            {surfaced.map((p, i) => (
              <Row key={i} columns="1fr">
                <div>
                  <div>{p.observation}</div>
                  <div className="gwui-mt-3"><Note>{p.who} · {p.name} · {p.say}</Note></div>
                </div>
              </Row>
            ))}
          </RowList>
        </>
      )}

      {/* Shown, and labelled as what it is: one or two sessions of something is not a finding. */}
      {!!candidates.length && (
        <>
          <Head>Seen once or twice, not yet a pattern</Head>
          <RowList label="Seen once or twice, not yet a pattern">
            {candidates.map((p, i) => (
              <Row key={i} columns="1fr">
                <div>
                  <div>{p.observation}</div>
                  <div className="gwui-mt-3"><Note>{p.who} · {p.name} · {p.say}</Note></div>
                </div>
              </Row>
            ))}
          </RowList>
        </>
      )}

      {!!it.gaps?.length && (
        <>
          <Head>The role, beside what the record holds</Head>
          <RowList label="The role, beside what the record holds">
            {it.gaps.map((g, i) => <Row key={i} columns="1fr">{g.say}</Row>)}
          </RowList>
        </>
      )}

      {!!it.cannotTellYou?.length && (
        <>
          <Head>What this cannot tell you</Head>
          <div className="gwui-rule gwui-pt-12 gwui-pr-14 gwui-pb-12 gwui-pl-14" style={{ background: 'var(--gw-paper-2)', borderRadius: 10 }}>
            {it.cannotTellYou.map((c, i) => (
              <div key={i} className="gwui-fs-13-5 gwui-ink-sub gwui-pt-4 gwui-pb-4" style={{ lineHeight: 1.55 }}>{c}</div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
