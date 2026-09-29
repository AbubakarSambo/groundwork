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
      <div style={{ minWidth: 0 }}>
        <div className="gwui-switch-row-title">{title}</div>
        {detail && <div className="gwui-switch-row-detail">{detail}</div>}
      </div>
      <Toggle on={on} onChange={onChange} label={title} disabled={disabled} />
    </div>
  )
}
