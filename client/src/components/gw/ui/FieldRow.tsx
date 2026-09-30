import React from 'react'
import './gw-ui.css'

/**
 * FIELD ROWS / FIELD ROW (prototype: a label/value row, e.g. "Level" and "Sales rep", or "How
 * often", app.css). The label at 16px bold ink in a fixed column (200px, 260 on the check-in's
 * setup), the value at 16px, and an optional quiet button on the right ("Change", "Give it more
 * time", "Free this seat"); a 1px line between rows; 14px above and below. On a phone, the label
 * sits above the value.
 *
 * Each row carries its own 22px side padding, meant for sitting inside a `Panel(pad={false})` (see
 * `PeopleTable`'s own doc comment). `flush` drops that side padding for a FieldRows NOT inside a
 * panel - "Who can open a check-in"'s "Opening check-ins"/"New check-ins" facts, which the
 * prototype starts flush at the page's own left edge (a picture check found them sitting indented
 * 22px with nothing around them to explain the indent).
 */
export function FieldRows({ labelWidth, flush, children }: { labelWidth?: number; flush?: boolean; children: React.ReactNode }) {
  const style = labelWidth ? ({ '--gwui-field-label-w': `${labelWidth}px` } as React.CSSProperties) : undefined
  return <div className={`gwui-field-rows${flush ? ' gwui-field-rows-flush' : ''}`} style={style}>{children}</div>
}

export function FieldRow({ label, value, action }: {
  label: string
  value: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <div className="gwui-field-row">
      <div className="gwui-field-row-label">{label}</div>
      <div className="gwui-field-row-value">{value}</div>
      {action}
    </div>
  )
}
