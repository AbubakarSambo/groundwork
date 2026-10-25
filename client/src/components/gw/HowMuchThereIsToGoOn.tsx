/**
 * CONFIDENCE IN THIS REPORT. THE OTHER METER, AND DELIBERATELY NOT THE SAME COMPONENT.
 *
 * Specificity asks how much one person gave. It is feedback to them, it lives on their private
 * half, and it is a three-step meter about a person.
 *
 * This asks how much basis there is to build a good shared report at all. It is scoped to
 * everybody plus what the record rests on, it lives at the top of the shared half, and it is a
 * reading on the document. Nobody is being marked.
 *
 * So it is drawn as a bar with a band and a list of reasons, not as steps. If the two ever start
 * looking like the same widget, a reader will take the document's score personally, which is the
 * one thing this must never do.
 *
 * THE REASONS ARE THE POINT. "Every account this session was from memory. Nobody attached
 * anything." used to be its own section eight positions down the page. It is a reason a report
 * cannot be trusted, so it belongs here, phrased as the thing somebody can go and do.
 */
export interface ConfidenceRead {
  score: number
  band: 'thin' | 'partial' | 'solid'
  saying: string
  reasons: string[]
  note?: string | null
}

/*
 * U.9 THIRD REVIEW, ITEM 4: ONE SENTENCE, NOT A HEADING AND A ONE-WORD LABEL SITTING NEXT TO IT.
 * "How much there is to go on" over "Solid" read as two pieces of one fact rather than one thing
 * to read. Each band now says the same thing as its own sentence.
 */
const BAND_SENTENCE: Record<ConfidenceRead['band'], string> = {
  thin: 'There is a thin amount to go on.',
  partial: 'There is a partial amount to go on.',
  solid: 'There is a solid amount to go on.',
}

export function HowMuchThereIsToGoOn({ read }: { read: ConfidenceRead }) {
  const pct = Math.max(4, Math.min(100, read.score))
  return (
    <section
      style={{
        border: '1px solid var(--gw-border)', borderRadius: 12, background: 'var(--gw-card)',
        padding: '16px 18px', marginBottom: 30,
      }}
    >
      <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: 'var(--gw-text)' }}>
        {BAND_SENTENCE[read.band]}
      </h3>

      <div
        role="img"
        aria-label={`${BAND_SENTENCE[read.band]} ${read.saying}`}
        style={{ height: 6, borderRadius: 3, background: 'var(--gw-bg)', margin: '10px 0 9px', overflow: 'hidden' }}
      >
        <div style={{ width: `${pct}%`, height: '100%', background: 'var(--gw-navy)' }} />
      </div>

      <p style={{ margin: 0, fontSize: 13, color: 'var(--gw-text)', lineHeight: '21px', maxWidth: '68ch' }}>
        {read.saying}
      </p>

      {read.reasons.length > 0 && (
        <ul style={{ margin: '10px 0 0', paddingLeft: 17, fontSize: 12, color: 'var(--gw-sub)', lineHeight: '20px', maxWidth: '68ch' }}>
          {read.reasons.map((r, i) => <li key={i}>{r}</li>)}
        </ul>
      )}
      {read.note && (
        <p style={{ margin: '10px 0 0', fontSize: 12, color: 'var(--gw-muted)', lineHeight: '19px', maxWidth: '68ch' }}>{read.note}</p>
      )}
    </section>
  )
}
