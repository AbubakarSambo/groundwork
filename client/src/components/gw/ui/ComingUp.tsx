import { Link } from 'react-router-dom'
import './gw-ui.css'

/**
 * COMING UP (prototype: Today's own sidebar list, app.css `.side` for the two-column layout and
 * the plain time-then-link rows beside it, C1, U.5 group 2). A 120px time column, bold, beside the
 * thing itself as a link; a line above the first row and under each.
 */
export interface ComingUpItem {
  /** Already said in the reader's own clock, e.g. "Tomorrow, 4pm". */
  when: string
  what: string
  to: string
}

export function ComingUp({ items, heading = 'Coming up' }: { items: ComingUpItem[]; heading?: string }) {
  return (
    <aside aria-labelledby="gwui-comingup-h" className="gwui-comingup-wrap">
      <h2 id="gwui-comingup-h" className="gwui-comingup-h">{heading}</h2>
      <ul className="gwui-comingup-list">
        {items.map(i => (
          <li key={i.when + i.what}>
            <b>{i.when}</b>
            <Link to={i.to}>{i.what}</Link>
          </li>
        ))}
      </ul>
    </aside>
  )
}
