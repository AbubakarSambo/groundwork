import type { ReactNode } from 'react'
import { Toggle } from './Toggle'
import './gw-ui.css'

/**
 * SWITCH ROW (design-audit.md section 3, People item 15: "Mixed sizes in one row").
 *
 * A bold 16px ink title, a 14.5px muted sentence under it, and a `Toggle` on the right - "Anyone
 * with an @domain email", "Baridi's invite link", "Check-ins wait for an admin". The bug this
 * replaces had the title SMALLER than its own sentence (13px over 16px); here the title is always
 * the bigger of the two, as an ordinary heading and its body text would be.
 *
 * THE TOGGLE STAYS ON THE RIGHT EVEN WHEN THE SENTENCE IS LONG (picture check, 29 Sept). "Who can
 * corroborate whom" and "When someone is blocked" carry a two-sentence detail, long enough that its
 * own natural (unwrapped) width is wider than the row - and `flex-wrap: wrap` on the row let the
 * browser solve that by moving the whole Toggle to a second line, under the text, rather than
 * shrinking the text column to wrap internally. `flex: 1, minWidth: 0` on the text column is what
 * makes it shrink and wrap its OWN text instead; the row itself no longer needs to wrap at all.
 */
export function SwitchRow({ title, detail, on, onChange, disabled }: {
  title: string
  detail?: ReactNode
  on: boolean
  onChange: (on: boolean) => void
  disabled?: boolean
}) {
  return (
    <div className="gwui-switch-row">
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="gwui-switch-row-title">{title}</div>
        {detail && <div className="gwui-switch-row-detail">{detail}</div>}
      </div>
      <Toggle on={on} onChange={onChange} label={title} disabled={disabled} />
    </div>
  )
}
