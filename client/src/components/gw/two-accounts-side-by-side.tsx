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

const CITE: React.CSSProperties = {
  fontFamily: MONO, fontSize: 10.5, letterSpacing: '.08em', textTransform: 'uppercase',
  color: 'var(--gw-sub-d)', marginBottom: 6,
}

export interface APosition { participantLabel?: string | null; view?: string | null }
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
    <div style={{ padding: '16px 0', borderTop: '1px solid var(--gw-border)' }}>
      <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--gw-text)', marginBottom: 10, maxWidth: '68ch' }}>
        {difference.topic}
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: sides.length > 1 ? 'repeat(auto-fit, minmax(220px, 1fr))' : '1fr',
          gap: 16,
        }}
      >
        {sides.map((p, i) => (
          <div key={i}>
            <div style={CITE}>{(p.participantLabel ?? 'One account').toString()}</div>
            <div style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--gw-text)', maxWidth: '68ch' }}>{p.view}</div>
          </div>
        ))}
      </div>
      {/* On the wire since the synthesis schema was written, rendered nowhere until now. */}
      {evidenceLines.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={CITE}>What this rests on</div>
          {evidenceLines.map((line, i) => (
            <div key={i} style={{ fontSize: 12.5, lineHeight: 1.6, color: 'var(--gw-sub)', maxWidth: '68ch', marginTop: i ? 4 : 0 }}>{line}</div>
          ))}
        </div>
      )}
      {asText(difference.atStake) && (
        <div style={{ marginTop: 12 }}>
          <div style={CITE}>Why it matters</div>
          <div style={{ fontSize: 12.5, lineHeight: 1.6, color: 'var(--gw-sub)', maxWidth: '68ch' }}>{asText(difference.atStake)}</div>
        </div>
      )}
      {asText(difference.note) && (
        <div style={{ marginTop: 10, fontSize: 12, lineHeight: 1.6, color: 'var(--gw-sub)', maxWidth: '68ch' }}>
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
    <details open={open} style={{ borderTop: '1px solid var(--gw-border)', padding: '12px 0' }}>
      <summary style={{ cursor: 'pointer', fontSize: 12.5, fontWeight: 700, color: 'var(--gw-navy)', listStyle: 'revert' }}>
        {summary}
      </summary>
      <div style={{ paddingTop: 12 }}>{children}</div>
    </details>
  )
}
