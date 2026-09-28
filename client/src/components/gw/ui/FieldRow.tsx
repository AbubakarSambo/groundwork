import React from 'react'
import './gw-ui.css'

/**
 * FIELD ROWS / FIELD ROW (prototype: a label/value row, e.g. "Level" and "Sales rep", or "How
 * often", app.css). The label at 16px bold ink in a fixed column (200px, 260 on the check-in's
 * setup), the value at 16px, and an optional quiet button on the right ("Change", "Give it more
 * time", "Free this seat"); a 1px line between rows; 14px above and below. On a phone, the label
 * sits above the value.
 */
export function FieldRows({ labelWidth, children }: { labelWidth?: number; children: React.ReactNode }) {
  const style = labelWidth ? ({ '--gwui-field-label-w': `${labelWidth}px` } as React.CSSProperties) : undefined
  return <div className="gwui-field-rows" style={style}>{children}</div>
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
