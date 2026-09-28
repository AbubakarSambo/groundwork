import React from 'react'
import { Link } from 'react-router-dom'
import { Panel } from './Panel'
import { Avatar } from './Avatar'
import './gw-ui.css'

/**
 * PEOPLE TABLE / PERSON ROW / PERSON CELL (prototype: .panel + .row, table headers, app.css).
 *
 * A `Panel` with no inside padding. A column-name row in 13px muted text, 10px top/bottom and 18px
 * sides. Each row 12px top/bottom, 18px sides, a 1px line above, the columns set by `columns`.
 * `PersonCell` is the 34px avatar, the name at 16px bold, then up to two lines: a 13px muted line
 * (level and reporting line) and a 14.5px muted line (email). The whole row can be a link. It
 * scrolls sideways under 900px and becomes a stack on a phone. `help` draws the soft amber or red
 * strip under the row, with one sentence and one secondary button.
 */
export function PeopleTable({ children }: { children: React.ReactNode }) {
  return (
    <Panel pad={false}>
      <div className="gwui-people-table">{children}</div>
    </Panel>
  )
}

/** The column-name row. Pass the same `columns` grid template as the table's rows. */
export function PeopleTableHead({ columns, labels }: { columns: string; labels: string[] }) {
  return (
    <div className="gwui-people-head" style={{ gridTemplateColumns: columns }} role="row">
      {labels.map(l => <span key={l}>{l}</span>)}
    </div>
  )
}

export function PersonRow({ columns, to, help, children }: {
  columns: string
  to?: string
  help?: { tone: 'look' | 'concern'; text: string; action?: React.ReactNode }
  children: React.ReactNode
}) {
  const style = { gridTemplateColumns: columns }
  const inner = (
    <>
      {children}
      {help && (
        <div className={`gwui-person-help gwui-person-help-${help.tone}`}>
          <span>{help.text}</span>
          {help.action}
        </div>
      )}
    </>
  )
  if (to) {
    return <Link to={to} className="gwui-person-row" style={style}>{inner}</Link>
  }
  return <div className="gwui-person-row" style={style} role="row">{inner}</div>
}

export function PersonCell({ initials, name, level, email }: {
  initials: string
  name: string
  level?: string
  email?: string
}) {
  return (
    <div className="gwui-person-cell">
      <Avatar initials={initials} size={34} />
      <div style={{ minWidth: 0 }}>
        <div className="gwui-person-name">{name}</div>
        {level && <div className="gwui-person-level">{level}</div>}
        {email && <div className="gwui-person-email">{email}</div>}
      </div>
    </div>
  )
}
