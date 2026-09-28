import { Link } from 'react-router-dom'
import './gw-ui.css'

/**
 * TABS (prototype: .tabs / .tab / .tab.on, app.css).
 *
 * Each tab is 46px tall, 14px at the sides, 16px, muted; the chosen tab is ink, bold, with a 3px
 * navy underline; a 1px line runs under the whole row; the row scrolls sideways on a phone.
 *
 * BUG FIX (design-audit.md section 2, "Lines": "The check-in header's tabs use 2 pixels, not 3" and
 * "every tab is underlined"): only the chosen tab gets a visible underline. The others get a 3px
 * TRANSPARENT border of the same weight, so nothing shifts when the choice changes, but nothing is
 * drawn under a tab that is not chosen.
 */
export type TabItem = { key: string; label: string; to?: string }

export function Tabs({ items, active, onChange, label }: {
  items: TabItem[]
  active: string
  /** Called when a tab with no `to` is pressed (for tabs that switch state rather than navigate). */
  onChange?: (key: string) => void
  label?: string
}) {
  return (
    <div className="gwui-tabs" role="tablist" aria-label={label}>
      {items.map(item => {
        const isOn = item.key === active
        const className = `gwui-tab${isOn ? ' gwui-tab-on' : ''}`
        if (item.to) {
          return (
            <Link key={item.key} to={item.to} className={className} role="tab" aria-selected={isOn}>
              {item.label}
            </Link>
          )
        }
        return (
          <button
            key={item.key}
            type="button"
            className={className}
            role="tab"
            aria-selected={isOn}
            onClick={() => onChange?.(item.key)}
          >
            {item.label}
          </button>
        )
      })}
    </div>
  )
}
