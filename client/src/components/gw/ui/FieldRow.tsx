import React from 'react'
import './gw-ui.css'

/**
 * FIELD ROWS / FIELD ROW (prototype: `srow`, in s5.js/s20.js/s21.js/s38.js - a label/value row,
 * e.g. "Level" and "Sales rep", or "How often" - built on `.row` in app.css). The label at 16px
 * bold ink in a fixed column (220px; 260 on the check-in's setup), the value at 16px, and an
 * optional quiet button on the right ("Change", "Give it more time", "Free this seat"); a 1px line
 * on TOP of each row (so the first row's line reads as the line under the section heading); 14px
 * padding above and below, and NO side padding - `srow` sits flat on the page at the row's own
 * left edge, never inside a white `Panel` box. On a phone, the label sits above the value.
 *
 * FIXED (Hafsah, 30 September, the setting row): this used to carry its own 22px side padding and
 * a 200px label column, built to sit inside a `Panel(pad={false})`, because nothing had read
 * `srow` itself before. Every caller that used to wrap a `FieldRows` in a `Panel` now renders it
 * flat on the page instead (Settings, Plan and billing, People and setup, One person). The `flush`
 * prop is kept, as a no-op, only so old call sites keep compiling.
 *
 * A value's own explanation (e.g. "This is what your team sees.") sits on its own line under the
 * value, in the prototype's muted "t-small" size - pass it as a `<span className="gwui-field-help">`
 * after the value's own text (the class is `display: block`, so it always starts a new line).
 */
export function FieldRows({ labelWidth, flush, children }: { labelWidth?: number; flush?: boolean; children: React.ReactNode }) {
  const style = labelWidth ? ({ '--gwui-field-label-w': `${labelWidth}px` } as React.CSSProperties) : undefined
  return <div className={`gwui-field-rows${flush ? ' gwui-field-rows-flush' : ''}`} style={style}>{children}</div>
}

export function FieldRow({ label, value, action }: {
  /**
   * Usually a plain string. `React.ReactNode` too (walkthrough pass 2, item 6, Plan and billing's
   * "In progress" list): a label that is itself a link to the thing the row is about, e.g. a
   * check-in's own name linking to that check-in.
   */
  label: React.ReactNode
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
