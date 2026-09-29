import { Sec } from '@/components/gw/kit'

/**
 * ONE SOLO REPORT, RENDERED ONE WAY. Stage 5, second pass.
 *
 * The participant's own private report is shown in two places: to the person whose it is, on their
 * record tab, and to the lead once that person chooses to share it. Both did the same work - walk the
 * report object, turn each camelCase key into a heading, render an array as a list and a string as a
 * line - written out twice, in two files, with two sets of numbers:
 *
 *   participant page   label 10px/.1em/rgba(255,255,255,.45), body 13px, list indent 16
 *   lead page          label 10px/.08em/rgba(255,255,255,.35), body 12px, list indent 14
 *
 * So the same report read differently depending on who was looking at it, which is the one thing a
 * shared record should never do. Not a visible bug; the kind of drift that becomes one the next time
 * either copy is edited and the other is not.
 *
 * The labels come from `Sec on="dark"` now rather than a third set of numbers.
 */
/**
 * REVIEW ROUND 3, ITEM 5: AN ENGINE COLON-OPENING, STRIPPED THE SAME WAY THE SESSION REPORT
 * ALREADY DOES. `whatYouSaid` (rendered here as the "What you said" section) arrives from the
 * engine as "What you shared: You have finished…" - the same prompt-written "What you shared:"
 * prefix `withoutTheColonOpening` (SessionReportPage.tsx) already turns into a sentence, engine
 * request 60. Reused here rather than duplicated, since it is the same fix for the same prefix.
 */
function withoutTheColonOpening(s: string): string {
  return s.replace(/^What you shared:\s*/, 'Here is what you shared. ')
}

export function SoloReportBody({ report, dense, on = 'dark' }: {
  report: Record<string, unknown>
  /** The lead's view sits nested inside a participant row, so it runs a size down. */
  dense?: boolean
  /** REVIEW ROUND 3, ITEM 5: light for "What you are carrying forward" on My work, which dropped
      its own dark navy card; dark stays the default for the lead's roster, where this still sits
      on `var(--gw-dark)`. */
  on?: 'light' | 'dark'
}) {
  const body = dense ? 12 : 13
  const indent = dense ? 14 : 16
  return (
    <>
      {Object.entries(report).map(([key, val]) => {
        if (!val || (Array.isArray(val) && val.length === 0)) return null
        /** `whatYouSaid` becomes `What you said`. The keys are the schema's, not written for reading. */
        const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())
        return (
          <div key={key} style={{ marginBottom: dense ? 10 : 12 }}>
            <Sec title={label} on={on} />
            {Array.isArray(val) ? (
              <ul style={{ margin: 0, paddingLeft: indent, color: on === 'light' ? 'var(--gw-text)' : undefined }}>
                {(val as string[]).map((v, i) => (
                  <li key={i} style={{ fontSize: body, lineHeight: 1.6, marginBottom: dense ? 2 : 3 }}>{typeof v === 'string' ? withoutTheColonOpening(v) : v}</li>
                ))}
              </ul>
            ) : (
              <div style={{ fontSize: body, lineHeight: dense ? 1.6 : 1.65, color: on === 'light' ? 'var(--gw-text)' : undefined }}>{withoutTheColonOpening(String(val))}</div>
            )}
          </div>
        )
      })}
    </>
  )
}
