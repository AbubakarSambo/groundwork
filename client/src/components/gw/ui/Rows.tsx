import React from 'react'
import './gw-ui.css'

/**
 * ROW LIST / ROW (the You board's own lists, C2, U.12: "Everything asked of you this week", "What
 * you said you'd do", "Your own reports", "Your work in each" - each a plain list of rows, several
 * columns wide, no `Panel` box around it, a line above the first row and under each).
 *
 * `columns` is the grid track list for one row, the same idea as `PeopleTable`'s `extraColumns` -
 * every row in one list uses the same columns, so the whole list lines up.
 */
export function RowList({ label, children }: { label: string; children: React.ReactNode }) {
  return <ul className="gwui-rows" aria-label={label}>{children}</ul>
}

export function Row({ columns, children }: { columns: string; children: React.ReactNode }) {
  return <li className="gwui-row" style={{ gridTemplateColumns: columns }}>{children}</li>
}
