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
    /* The prototype's "Coming up": a small heading, then rows with thin rules, the day beside what happens. */
    <aside aria-labelledby="gwui-comingup-h" className="gw-aside">
      <section className="sec">
        <h2 id="gwui-comingup-h" className="t-h3">{heading}</h2>
        <div>
          {items.map(i => (
            <div key={i.when + i.what} className="gw-when-row">
              <b className="t-small">{i.when}</b>
              <Link className="t-small" to={i.to}>{i.what}</Link>
            </div>
          ))}
        </div>
      </section>
    </aside>
  )
}
