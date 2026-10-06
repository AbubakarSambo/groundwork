import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { scrollTo } from '@/lib/scroll-to'
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
 *
 * GROUP 3 REVIEW, BATCH B: AT 375px THE CHOSEN TAB CAN OPEN OFF SCREEN. The row scrolls sideways
 * (`overflow-x: auto` above), and a reader can land on a page with its later tab already chosen -
 * "My work" on the lead's own check-in page, say - with the row still scrolled to its own start, so
 * the one tab that says where they are sits past the right edge, unseen, on a phone. Scrolled into
 * view as soon as the page opens, and again whenever the choice changes under this same row (the
 * report tab redirecting elsewhere does not touch this - a changed `active` prop is what moves it).
 */
export type TabItem = { key: string; label: string; to?: string }

export function Tabs({ items, active, onChange, label }: {
  items: TabItem[]
  active: string
  /** Called when a tab with no `to` is pressed (for tabs that switch state rather than navigate). */
  onChange?: (key: string) => void
  label?: string
}) {
  const activeRef = useRef<HTMLAnchorElement | HTMLButtonElement>(null)

  useEffect(() => {
    /* `scrollTo` (lib/scroll-to.ts), not a bare `scrollIntoView` call: the one already proven not
       to be fatal in an environment with no real scrolling (jsdom's tests included), and the one
       every other "jump to it" control in this app already uses. */
    scrollTo(activeRef.current, { block: 'nearest', inline: 'nearest' })
  }, [active])

  return (
    <div className="gwui-tabs" role="tablist" aria-label={label}>
      {items.map(item => {
        const isOn = item.key === active
        const className = `gwui-tab${isOn ? ' gwui-tab-on' : ''}`
        if (item.to) {
          return (
            <Link
              key={item.key}
              ref={isOn ? (activeRef as React.Ref<HTMLAnchorElement>) : undefined}
              to={item.to}
              className={className}
              role="tab"
              aria-selected={isOn}
            >
              {item.label}
            </Link>
          )
        }
        return (
          <button
            key={item.key}
            ref={isOn ? (activeRef as React.Ref<HTMLButtonElement>) : undefined}
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
