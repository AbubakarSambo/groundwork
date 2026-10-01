import React from 'react'

/**
 * WHERE TWO ACCOUNTS DIFFER, SHOWN AS TWO ACCOUNTS.
 *
 * `ReportPage` rendered a difference as `d.positions.map(p => p.view).join(' ')` - the two
 * conflicting accounts flattened into one run-on paragraph, with the label saying WHOSE each one was
 * thrown away, and `d.evidence` rendered nowhere at all while the legend above it promised "Every
 * gap names each side's position, the evidence behind it".
 *
 * The server ranks these and shapes them well. The loss was entirely at the render. Nothing here
 * filters, truncates or reorders: same rows, same order, one column each and the evidence under
 * them.
 */
const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace'

/*
 * GROUP 3, PIECE 2: `CITE` (fontSize/color/marginBottom, spread by reference into four spots)
 * moved to this class - a listed page (ReportPage.tsx) now imports this component through
 * `@/components/gw/two-accounts-side-by-side`, and the guard refuses a banned prop passed through
 * a style constant one import deep, same as a literal. Same values, now shared.
 */
const CITE_CLASS = 'gwui-fs-13 gwui-ink-subd gwui-mb-6'

export interface APosition { participantLabel?: string | null; who?: string | null; view?: string | null }
export interface ADifference {
  topic?: string | null
  positions?: APosition[] | null
  perspectives?: APosition[] | null
  /* The synthesis emits this as an ARRAY of lines on some paths and a single string on others, and
     a page that assumes either one crashes on the other. Read live: a participant's report died on
     "(difference.evidence ?? '').trim is not a function". */
  evidence?: string | string[] | null
  atStake?: string | null
  note?: string | null
}

/** Whatever the server sent, as a printable line. A page must not assume which shape arrived. */
function asText(v: unknown): string {
  if (typeof v === 'string') return v.trim()
  if (Array.isArray(v)) return v.filter((x) => typeof x === 'string').join(' ').trim()
  return ''
}

export function TwoAccountsSideBySide({ difference }: { difference: ADifference }) {
  const sides = (difference.positions ?? difference.perspectives ?? []).filter((p) => (p?.view ?? '').trim())
  /* One shape out of two. See the type: this arrives as a list on some paths and a sentence on others. */
  const evidenceLines = (Array.isArray(difference.evidence) ? difference.evidence : [difference.evidence ?? ''])
    .map((e) => (typeof e === 'string' ? e.trim() : ''))
    .filter(Boolean)
  return (
    <div className="gwui-rule-top gwui-pt-16 gwui-pb-16">
      <div className="gwui-fs-13-5 gwui-ink-text gwui-mb-10" style={{ fontWeight: 700, maxWidth: '68ch' }}>
        {difference.topic}
      </div>
      <div
        className="gwui-gap-16"
        style={{
          display: 'grid',
          gridTemplateColumns: sides.length > 1 ? 'repeat(auto-fit, minmax(220px, 1fr))' : '1fr',
        }}
      >
        {sides.map((p, i) => (
          <div key={i}>
            <div className={CITE_CLASS} style={{ fontFamily: MONO, letterSpacing: '.08em', textTransform: 'uppercase' }}>{(p.who ?? p.participantLabel ?? 'One account').toString()}</div>
            <div className="gwui-fs-13 gwui-ink-text" style={{ lineHeight: 1.6, maxWidth: '68ch' }}>{p.view}</div>
          </div>
        ))}
      </div>
      {/* On the wire since the synthesis schema was written, rendered nowhere until now. */}
      {evidenceLines.length > 0 && (
        <div className="gwui-mt-12">
          <div className={CITE_CLASS} style={{ fontFamily: MONO, letterSpacing: '.08em', textTransform: 'uppercase' }}>What this rests on</div>
          {evidenceLines.map((line, i) => (
            <div key={i} className={`gwui-fs-13 gwui-ink-sub ${i ? 'gwui-mt-4' : 'gwui-mt-0'}`} style={{ lineHeight: 1.6, maxWidth: '68ch' }}>{line}</div>
          ))}
        </div>
      )}
      {asText(difference.atStake) && (
        <div className="gwui-mt-12">
          <div className={CITE_CLASS} style={{ fontFamily: MONO, letterSpacing: '.08em', textTransform: 'uppercase' }}>Why it matters</div>
          <div className="gwui-fs-13 gwui-ink-sub" style={{ lineHeight: 1.6, maxWidth: '68ch' }}>{asText(difference.atStake)}</div>
        </div>
      )}
      {asText(difference.note) && (
        <div className="gwui-fs-13 gwui-ink-sub gwui-mt-10" style={{ lineHeight: 1.6, maxWidth: '68ch' }}>
          {asText(difference.note)}
        </div>
      )}
    </div>
  )
}

/**
 * A FOLD THAT IS A REAL `<details>`.
 *
 * Not `useState` and a conditional render: that removes the content from the page, from print and
 * from a screen reader, which is the one thing this whole pass exists not to do. `<details>` keeps
 * every word in the document and only closes it.
 */
export function Folded({ summary, children, open }: { summary: string; children: React.ReactNode; open?: boolean }) {
  return (
    <details open={open} className="gwui-rule-top gwui-pt-12 gwui-pb-12">
      <summary className="gwui-fs-13 gwui-ink-navy" style={{ cursor: 'pointer', fontWeight: 700, listStyle: 'revert' }}>
        {summary}
      </summary>
      <div className="gwui-pt-12">{children}</div>
    </details>
  )
}
