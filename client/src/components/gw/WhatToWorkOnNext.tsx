/**
 * THE COACHING NOTE. THE ONE PLACE ON THIS PAGE SPEAKING DIRECTLY TO THE PERSON READING IT.
 *
 * `postReportGuide` was generated at every release, per person, and rendered nowhere on the page
 * somebody lands on when they finish. That is the regression this restores, and it arrives with
 * more behind it than one session's text: what keeps showing up for this person across sessions,
 * what that means for somebody in their role at this point in the run, and the one thing to do
 * before the next one. See what-to-work-on-next.ts on the server for how it is built.
 *
 * THREE SHORT BLOCKS, NOT A WALL. Somebody reads this at the end of ten minutes of writing.
 *
 * IT IS PRIVATE AND IT IS ABOUT THEM. It never appears on the shared report, never characterises
 * anybody else, and never says what another participant should do. With no pattern confirmed yet
 * it gives the role and stage guidance instead of hiding: an empty coaching surface on session 2
 * teaches somebody the product has nothing to say to them.
 */
export interface CoachingNote {
  showingUp: string | null
  whyItMatters: string
  beforeNextTime: string
  general: boolean
}

export function WhatToWorkOnNext({ note, guide }: {
  note?: CoachingNote | null
  /** The three lines about the conversation to have next, when a release has produced them. */
  guide?: { openingLine?: string; questionToCarry?: string; toAcknowledge?: string } | null
}) {
  if (!note && !guide) return null
  const conversation = [
    { h: 'A way to open', text: guide?.openingLine },
    { h: 'A question worth carrying in', text: guide?.questionToCarry },
    { h: 'Something they said worth taking seriously', text: guide?.toAcknowledge },
  ].filter(r => r.text?.trim())

  return (
    <section
      style={{
        border: '1px solid var(--gw-navy)', borderRadius: 12, background: 'var(--gw-card)',
        padding: '16px 18px', marginTop: 18,
      }}
    >
      <h3 style={{ fontSize: 13.5, fontWeight: 800, margin: '0 0 3px', color: 'var(--gw-navy)' }}>
        What to work on next
      </h3>
      <div style={{ fontSize: 11.5, color: 'var(--gw-muted)', marginBottom: 13 }}>
        Written for you. It is not part of the shared report.
      </div>

      {note && (
        <div style={{ display: 'grid', gap: 12 }}>
          {note.showingUp && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 3 }}>What keeps showing up</div>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--gw-text)', lineHeight: 1.65, maxWidth: '68ch' }}>
                {note.showingUp}
              </p>
            </div>
          )}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 3 }}>
              {note.general ? 'Where you are' : 'Why it matters here'}
            </div>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--gw-text)', lineHeight: 1.65, maxWidth: '68ch' }}>
              {note.whyItMatters}
            </p>
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 3 }}>Before the next session</div>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--gw-text)', lineHeight: 1.65, maxWidth: '68ch' }}>
              {note.beforeNextTime}
            </p>
          </div>
        </div>
      )}

      {conversation.length > 0 && (
        <div style={{ marginTop: note ? 14 : 0, paddingTop: note ? 12 : 0, borderTop: note ? '1px solid var(--gw-border)' : undefined, display: 'grid', gap: 11 }}>
          {conversation.map((r, i) => (
            <div key={i}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 3 }}>{r.h}</div>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--gw-text)', lineHeight: 1.65, maxWidth: '68ch' }}>{r.text}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
