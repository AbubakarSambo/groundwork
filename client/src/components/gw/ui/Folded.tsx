import type { ReactNode } from 'react'
import './gw-ui.css'

/**
 * FOLDED PANEL (design-audit.md section 3, People item 6: "Who reports to whom").
 *
 * A native `<details>`, styled as a closed `Panel` - 66px tall shut, the same 20 by 22 pixels
 * inside and 12-pixel corners as `Panel`, opening with no script. The summary row carries a bold
 * label (16px, ink) and an optional muted note beside it (14.5px), the way "Who reports to whom"
 * sits next to "Level and reporting lines describe the organisation...".
 */
export function Folded({ summary, note, children }: {
  summary: string
  note?: string
  children: ReactNode
}) {
  return (
    <details className="gwui-folded">
      <summary className="gwui-folded-summary">
        <b>{summary}</b>
        {note && <span className="gwui-folded-note">{note}</span>}
      </summary>
      <div className="gwui-folded-body">{children}</div>
    </details>
  )
}
