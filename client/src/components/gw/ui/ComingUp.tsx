import { Link } from 'react-router-dom'
import './gw-ui.css'
import { ShowAll } from './ShowAll'
import { Section } from './Section'
import { useTheDesignSystem } from './the-design-system'

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

export function ComingUp({ items, heading = 'Coming up', first }: { items: ComingUpItem[]; heading?: string; /** Show this many, then "And N more" (the design pass). */ first?: number }) {
  /* ON A REBUILT PAGE, a section like any other: its title, then the day beside what happens on thin rules (blocks.css, .ds-when). */
  const ds = useTheDesignSystem()
  if (ds) {
    return (
      /* Its own landmark, as before, inside the page's side column. */
      <aside aria-label={heading}>
      <Section heading={heading}>
        <div role="list" aria-label={heading}>
          {items.map((i) => (
            <div key={i.when + i.what} className="ds-when" role="listitem">
              <span className="ds-text-secondary"><b>{i.when}</b></span>
              <Link className="ds-text-secondary" to={i.to}>{i.what}</Link>
            </div>
          ))}
        </div>
      </Section>
      </aside>
    )
  }
  return (
    /* The prototype's "Coming up": a small heading, then rows with thin rules, the day beside what happens. */
    <aside aria-labelledby="gwui-comingup-h" className="gw-aside">
      <section className="sec">
        <h2 id="gwui-comingup-h" className="t-h3">{heading}</h2>
        <div>
          {(() => {
            const row = (i: ComingUpItem) => (
              <div key={i.when + i.what} className="gw-when-row">
                <b className="t-small">{i.when}</b>
                <Link className="t-small" to={i.to}>{i.what}</Link>
              </div>
            )
            return first ? <ShowAll items={items} first={first} render={row} /> : items.map(row)
          })()}
        </div>
      </section>
    </aside>
  )
}
