import React from 'react'
import { Link } from 'react-router-dom'
import { Panel } from './Panel'
import './gw-ui.css'

/**
 * CHECK-INS TABLE (prototype: check-ins.txt, C1, U.5 group 2) - "You run", "You're in", "Other
 * check-ins" and "Finished" on the check-ins list. A `Panel` with no inside padding, holding a
 * plain table: "Check-in" (the name, a link, with what it's about underneath), "What it's for",
 * "Needs you" (a `Tag`) and "Where it stands" (a link where the prototype gives one, with a second
 * quieter line underneath). The whole row opens the check-in; a phone stacks it into a card.
 */
export function CheckInsTable({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Panel pad={false}>
      <table className="gwui-ci-table" aria-label={label}>
        <thead>
          <tr>
            <th scope="col">Check-in</th>
            <th scope="col">What it’s for</th>
            <th scope="col">Needs you</th>
            <th scope="col">Where it stands</th>
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </Panel>
  )
}

export function CheckInRow({ to, name, about, forWhat, needs, stands, standsTo, also, onClick }: {
  to: string
  name: string
  about?: React.ReactNode
  forWhat: React.ReactNode
  needs?: React.ReactNode
  stands: React.ReactNode
  standsTo?: string
  also?: React.ReactNode
  onClick?: () => void
}) {
  return (
    <tr onClick={onClick}>
      <td>
        {/* SCREEN FAULT 10: 25px TALL ON A PHONE, BELOW THE 40px TAP FLOOR - `.gwui-tap-40` (gw-ui.css)
            gives it one there without touching the 17px bold look at any other width. */}
        <Link to={to} className="gwui-ci-table-name gwui-tap-40" onClick={e => e.stopPropagation()}>{name}</Link>
        {about && <div className="gwui-ci-table-about">{about}</div>}
      </td>
      <td>{forWhat}</td>
      <td>{needs}</td>
      <td>
        {standsTo ? <Link to={standsTo} onClick={e => e.stopPropagation()}>{stands}</Link> : stands}
        {also && <div className="gwui-ci-table-also">{also}</div>}
      </td>
    </tr>
  )
}
