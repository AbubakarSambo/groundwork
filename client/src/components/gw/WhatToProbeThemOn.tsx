/**
 * WHAT TO PROBE EACH PERSON ON. THE LEAD SEES THIS AND NOBODY ELSE DOES.
 *
 * A lead reads the same report as everybody and then has to decide what to say to each person.
 * The product had nothing for that moment, so the decision came from a paragraph of synthesis and
 * whatever the lead already believed.
 *
 * IT RENDERS OBSERVATIONS AND QUESTIONS, NEVER A VERDICT. Not on character, motivation or effort.
 * The server builds every line from a row with a date on it, and reports a silent record as a
 * silent record rather than as somebody not having tried. See what-to-probe.ts.
 *
 * IT AGREES WITH WHAT EACH PERSON WAS TOLD. Both surfaces read the same dependencies and the same
 * surfaced patterns, so a lead raising something will find the person was already asked to move
 * it. The conversation is not an ambush.
 *
 * WHY IT CANNOT LEAK BY ACCIDENT. The server returns null for anybody who is not the lead or an
 * org admin, before it reads a row, so this component has nothing to render rather than something
 * to hide. A `{isLead && ...}` here would be one refactor from being wrong.
 */
export interface ProbeRead {
  who: string
  participantId: string
  probe: string[]
  encourage: string[]
  triedToUnblock: string
}

function Block({ title, lines }: { title: string; lines: string[] }) {
  if (!lines.length) return null
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gw-muted)', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 4 }}>
        {title}
      </div>
      <div style={{ display: 'grid', gap: 6 }}>
        {lines.map((l, i) => (
          <p key={i} style={{ margin: 0, fontSize: 13, color: 'var(--gw-text)', lineHeight: 1.6, maxWidth: '68ch' }}>{l}</p>
        ))}
      </div>
    </div>
  )
}

export function WhatToProbeThemOn({ reads }: { reads?: ProbeRead[] | null }) {
  if (!reads?.length) return null
  return (
    <section
      style={{
        border: '1px solid var(--gw-border)', borderRadius: 14, background: 'var(--gw-paper-2)',
        padding: '18px 20px', marginTop: 34,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <h2 style={{ fontSize: 15, fontWeight: 800, margin: 0 }}>What to ask each person</h2>
        <span style={{ fontSize: 11, color: 'var(--gw-muted)', flexShrink: 0 }}>Yours as the lead</span>
      </div>
      <div style={{ fontSize: 12, color: 'var(--gw-sub)', margin: '2px 0 4px', lineHeight: 1.55, maxWidth: '68ch' }}>
        Built from the record, not from a read on anybody. Each person has already been asked to
        move the same things, so none of this will be news to them.
      </div>

      <div style={{ display: 'grid', gap: 18, marginTop: 14 }}>
        {reads.map((r) => (
          <div key={r.participantId} style={{ borderTop: '1px solid var(--gw-border)', paddingTop: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--gw-text)' }}>{r.who}</div>
            <Block title="Worth asking" lines={r.probe} />
            <Block title="Worth saying" lines={r.encourage} />
            <Block title="What the record shows they did about being stuck" lines={[r.triedToUnblock]} />
          </div>
        ))}
      </div>
    </section>
  )
}
