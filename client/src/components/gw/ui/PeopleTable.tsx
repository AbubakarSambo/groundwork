import React from 'react'
import { Link } from 'react-router-dom'
import { Panel } from './Panel'
import { Avatar } from './Avatar'
import './gw-ui.css'

/**
 * PEOPLE TABLE / PERSON ROW / PERSON CELL (prototype: .panel + .row, table headers, app.css and
 * the people screen in docs/prototype/source/s11.js, s27.js, s38.js - the real column widths, for
 * example `44px minmax(200px,1.2fr) 190px 210px minmax(160px,1fr) 60px`).
 *
 * A `Panel` with no inside padding. A column-name row in 13px muted text, 10px top/bottom and 18px
 * sides. Each row 12px top/bottom, 18px sides, a 1px line above.
 *
 * THE NAME COLUMN IS NOT SOMETHING A CALLER SPECIFIES. `PersonCell` bundles the 34px avatar and up
 * to three lines of text (name, level, email) as one unit, so it needs a column wide enough for all
 * three - `PEOPLE_NAME_COLUMN` (`minmax(240px, 1.2fr)`, the prototype's own `minmax(200px,1.2fr)`
 * plus the 34px avatar and its gap) is built into `PersonRow` and `PeopleTableHead` themselves.
 * `extraColumns` is only the track list for whatever comes AFTER the name - role, status, and so
 * on - so a caller cannot put `PersonCell` in the wrong, narrow column by mistake, which is exactly
 * how the name column was squashed to about 60px the first time this was built.
 *
 * `justify-items: start` on the row keeps every other cell (a `Tag`, a short line) at its own
 * natural width, instead of a grid stretching it across its whole column.
 *
 * The whole row can be a link. It scrolls sideways under 900px and becomes a stack on a phone.
 * `help` draws the soft amber or red strip under the row, with one sentence and one secondary
 * button.
 */
export const PEOPLE_NAME_COLUMN = 'minmax(240px, 1.2fr)'

export function PeopleTable({ children }: { children: React.ReactNode }) {
  return (
    <Panel pad={false}>
      <div className="gwui-people-table">{children}</div>
    </Panel>
  )
}

/** The column-name row. `labels[0]` is the name column's own heading (usually "Person" or ""). */
export function PeopleTableHead({ extraColumns, labels }: { extraColumns: string; labels: string[] }) {
  return (
    <div className="gwui-people-head" style={{ gridTemplateColumns: `${PEOPLE_NAME_COLUMN} ${extraColumns}` }} role="row">
      {labels.map(l => <span key={l}>{l}</span>)}
    </div>
  )
}

export function PersonRow({ extraColumns, to, help, person, children }: {
  /** The grid track list for every column after the name, e.g. `"190px 210px 60px"`. */
  extraColumns: string
  to?: string
  help?: { tone: 'look' | 'concern'; text: string; action?: React.ReactNode }
  person: { initials: string; name: string; level?: React.ReactNode; email?: string }
  /** The cells after the name column, in order (a role Tag, a status, and so on). */
  children?: React.ReactNode
}) {
  const style = { gridTemplateColumns: `${PEOPLE_NAME_COLUMN} ${extraColumns}` }
  const inner = (
    <>
      <PersonCell {...person} />
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
  /** Usually a plain sentence; a caller that must mark this text specially (e.g. `data-leads-note`,
      so a privacy test can tell a lead's own labelled note from a name shown to everyone) passes a
      wrapped node instead of a bare string. */
  level?: React.ReactNode
  email?: string
}) {
  /*
   * NEVER THE SAME EMAIL TWICE (U.4 re-review, item 4). With no real name on record, several
   * callers now put the person's own address in the name slot itself (rather than a name guessed
   * out of it); this used to still be handed here as `email` too, and Zawadi's row read her address
   * once as the name and once again underneath it.
   */
  const showEmail = email && email !== name
  return (
    <div className="gwui-person-cell">
      <Avatar initials={initials} size={34} />
      <div style={{ minWidth: 0 }}>
        <div className="gwui-person-name">{name}</div>
        {level && <div className="gwui-person-level">{level}</div>}
        {showEmail && <div className="gwui-person-email">{email}</div>}
      </div>
    </div>
  )
}
