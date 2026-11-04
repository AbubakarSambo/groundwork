/**
 * WHAT YOU GAVE US, SAID BACK TO THE PERSON WHO GAVE IT.
 *
 * Hafsah, 23 September 2026: "specificity should be communicated to each user after their checkin."
 *
 * It has been measured on every message for months - the level and its five dimensions are scored
 * and stored on every check-in - and used only to pick the assistant's tone. The prompt carrying it
 * says "behind the curtain - never name these system terms to the person", so the one person who
 * could do anything about it was the only one never told.
 *
 * WHAT IT DOES NOT DO. It does not show a score, a percentage or a grade. Two customers spent this
 * morning telling us what an ungrounded number is worth to them. It shows the count they can verify
 * by looking at their own answers, then what a reader can stand on in their own words, then the one
 * detail that would make the rest usable.
 *
 * AND IT IS NOT A SCOLDING. Somebody has just given five minutes to a check-in they did not ask
 * for. The strength goes first, the gap is a fact about the record rather than a fault in them, and
 * where there is nothing to add this renders nothing at all.
 */
export interface WhatYouGave {
  checkable: number
  general: number
  theStrongest: string[]
  worthAdding: { said: string; needs: string }[]
  saying: string
}

export function WhatYouGaveUs({ it }: { it: WhatYouGave | null | undefined }) {
  if (!it?.saying) return null
  const all = it.checkable + it.general
  return (
    <div style={{
      maxWidth: 460, margin: '12px auto 0', padding: '12px 14px', borderRadius: 10,
      border: '1px solid var(--gw-border)', background: 'var(--gw-blue-bg)',
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gw-navy)', letterSpacing: 0.3, marginBottom: 6 }}>
        WHAT YOU GAVE US
      </div>
      {/* The count first, because it is the part they can check against their own answers. */}
      <div style={{ fontSize: 13, color: 'var(--gw-text)', lineHeight: '21px' }}>
        {all > 0 && (
          <div style={{ marginBottom: it.theStrongest.length || it.worthAdding.length ? 8 : 0 }}>
            <strong>{it.checkable}</strong> of {all} things you said can be checked by somebody who was not here.
          </div>
        )}
        {it.theStrongest.length > 0 && (
          <div style={{ marginBottom: it.worthAdding.length ? 8 : 0 }}>
            <div style={{ fontSize: 12, color: 'var(--gw-sub)', marginBottom: 3 }}>A reader can stand on these:</div>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {it.theStrongest.map((s, i) => <li key={i} style={{ marginBottom: 2 }}>{s}</li>)}
            </ul>
          </div>
        )}
        {it.worthAdding.length > 0 && (
          <div>
            <div style={{ fontSize: 12, color: 'var(--gw-sub)', marginBottom: 3 }}>One detail would make these usable:</div>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {it.worthAdding.map((w, i) => (
                <li key={i} style={{ marginBottom: 2 }}>{w.said}: needs {w.needs}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
