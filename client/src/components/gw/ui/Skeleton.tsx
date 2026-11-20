import './gw-ui.css'

/**
 * SKELETON (design playbook rule 1, "the page arrives finished"): grey shapes the size of the real content, never the word "Loading".
 *
 * One part for every wait a person can see. `what` is for a screen reader only ("Getting your check-ins"), so the wait is still
 * announced; nothing on screen is a word. `shape` is the size of what is coming: `rows` for a list, `cards` for a row of panels,
 * `lines` for a paragraph or a short section. The pulse stops for anybody who has asked their device for less motion.
 */
export function Skeleton({ what, shape = 'rows', count }: {
  /** What is on its way, in a few plain words, for a screen reader: "Getting your check-ins". */
  what: string
  shape?: 'rows' | 'cards' | 'lines'
  /** How many rows, cards or lines; three by default. */
  count?: number
}) {
  const n = count ?? 3
  return (
    <div role="status" aria-busy="true" className={`gwui-skeleton gwui-skeleton-${shape}`}>
      <span className="gwui-sr-only">{what}</span>
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="gwui-skeleton-item" aria-hidden>
          <span className="gwui-skeleton-line gwui-skeleton-line-title" />
          <span className="gwui-skeleton-line gwui-skeleton-line-text" />
        </div>
      ))}
    </div>
  )
}
