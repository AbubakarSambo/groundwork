import './gw-ui.css'

/**
 * PHASE STEPS (group 3, piece 4d-1, the entry chat's own progress bar - what phase of setting up a
 * check-in you are in: "What is going on" -> "Your check-in" -> "Save & invite"). No prototype
 * screen draws this exact track, so the values are the house style's own (13px floor, the same
 * green/navy/muted scale every other shared part uses), not a copy of the page's old pixel values.
 *
 * A done phase shows a tick, the current one its number in navy, a phase still ahead its number in
 * a plain circle. `hint` is the current phase's own sentence, read below the row.
 */
export function PhaseSteps({ labels, hints, current }: {
  labels: string[]
  /** One sentence per label, read for whichever one is current. */
  hints: string[]
  /** 1-based: which label is the current phase. */
  current: number
}) {
  return (
    <div>
      <ol className="gwui-phase-steps" aria-label="Setting up this check-in">
        {labels.map((label, i) => {
          const n = i + 1
          const done = n < current
          const isCurrent = n === current
          return (
            <li key={label} className="gwui-phase-step">
              <span className={`gwui-phase-step-mark${done ? ' gwui-phase-step-done' : ''}${isCurrent ? ' gwui-phase-step-current' : ''}`} aria-hidden>
                {done ? '✓' : n}
              </span>
              <span className={`gwui-phase-step-label${isCurrent ? ' gwui-phase-step-label-current' : ''}`}>{label}</span>
              {n < labels.length && <span className="gwui-phase-step-arrow" aria-hidden>→</span>}
            </li>
          )
        })}
      </ol>
      <p className="gwui-phase-steps-hint">{hints[current - 1]}</p>
    </div>
  )
}
