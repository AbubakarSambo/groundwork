import './pictured-board.css'

/**
 * THE ONE BAR (docs/prototype/screens/G1-example-check-ins: the headline's progress bar on salesorg.jpg and loans.jpg, the stage bars
 * on salesorg.jpg). Every board that draws a figure as a bar draws it with this part, so a bar means the same thing everywhere: filled
 * is what a document or a system shows, ringed is what somebody said, and the dark segment is what is likely. Nothing is drawn for a
 * figure the record does not hold: the caller leaves the bar out, and the number beside it says "Not said yet".
 *
 *  track  one bar across the whole of `of`, with the filled part first, then the ringed part, then the likely part (the headline).
 *  stage  a ring as long as what was said, with what is shown filled inside it, on a scale shared by every stage (reported against criteria met).
 */
/** The one key for the ringed and filled marks, said the same way on every board. */
/** The one line under a board's "Not right? Tell the check-in" link, said once a board. */
export const CORRECT_IT_HERE = 'Something here wrong? Anyone can correct what’s about their own work in their check-in; the change and the original both show here.'

export const THE_LEGEND = 'Ringed is someone’s word. Filled is shown by a document.'

export function TheBar({ of, shown = 0, said = 0, likely = 0, label, form = 'track' }: {
  of: number
  shown?: number | null
  said?: number | null
  likely?: number | null
  label: string
  form?: 'track' | 'stage'
}) {
  const pct = (n: number | null | undefined) => (of > 0 && n ? Math.max(0, Math.min(100, (100 * n) / of)) : 0)
  if (form === 'stage') {
    return (
      <span className="pb-hbar" role="img" aria-label={label}>
        {!!said && <span className="pb-out" style={{ width: `${pct(said)}%` }} />}
        {!!shown && <span className="pb-in" style={{ width: `calc(${pct(shown)}% - 8px)` }} />}
      </span>
    )
  }
  return (
    <div className="pb-bar" role="img" aria-label={label}>
      <span className="pb-bar-done" style={{ width: `${pct(shown)}%` }} />
      <span className="pb-bar-said" style={{ width: `${pct(said)}%` }} />
      <span className="pb-bar-likely" style={{ width: `${pct(likely)}%` }} />
    </div>
  )
}
