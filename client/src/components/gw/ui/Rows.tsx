import React from 'react'
import './gw-ui.css'

/**
 * ROW LIST / ROW (the You board's own lists, C2, U.12: "Everything asked of you this week", "What
 * you said you'd do", "Your own reports", "Your work in each" - each a plain list of rows, several
 * columns wide, no `Panel` box around it, a line above the first row and under each).
 *
 * `columns` is the grid track list for one row, the same idea as `PeopleTable`'s `extraColumns` -
 * every row in one list uses the same columns, so the whole list lines up.
 *
 * `inset` (board task, batch 3, part 5) is the row's own left/right padding, for when a `Row`'s
 * content sits flush against a Panel's edge - `Row` itself carries only the 12px top/bottom
 * rhythm, no side padding of its own. Earlier board work had each caller wrap its content in a
 * one-off `gwui-pl-*`/`gwui-pr-*` pair to add that back, which is exactly the drift the one-off
 * list exists to stop; this is that padding, named for where it comes from rather than repeated
 * as a page-only pair of classes:
 *  - `'panel'`, 22px: the plain Panel's own inside (app.css `.pad`), for a row sitting directly
 *    under a Panel with no header strip of its own ("Where people differ").
 *  - `'list'`, 15px: a sub-panel's own list, under a 15px header strip the rows line up with
 *    ("What people are trying to do", "Places named", "What it is about").
 *  - `'record'`, 16px: the board's own work-record lists (WorkRecords.tsx's "Every deadline",
 *    "The parties", "Where next, ranked", "Your own ... day by day").
 *  - `'kicker'`, 14px: a Panel introduced by a kicker-toned `SubHeading` rather than its own
 *    header strip (TheJudgement.tsx's "What the numbers say", "What to do", "What this cannot
 *    tell you").
 * A row that needs a value none of these name should get a new one added here, read from the
 * page's actual value and written up in docs/the-parts-against-the-prototype.md - never a new
 * one-off class, an inline style on the caller, or a margin/padding wrapper div.
 */
export function RowList({ label, children }: { label: string; children: React.ReactNode }) {
  return <ul className="gwui-rows" aria-label={label}>{children}</ul>
}

export function Row({ columns, inset, children }: {
  columns: string
  inset?: 'panel' | 'list' | 'record' | 'kicker'
  children: React.ReactNode
}) {
  const cls = ['gwui-row', inset && `gwui-row-inset-${inset}`].filter(Boolean).join(' ')
  return <li className={cls} style={{ gridTemplateColumns: columns }}>{children}</li>
}
